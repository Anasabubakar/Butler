package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gamp/butler/internal/gemini"
	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
	"github.com/google/uuid"
)

// ChatRequest is the incoming payload for a chat message.
type ChatRequest struct {
	ThreadID *string        `json:"threadId,omitempty"`
	Text     string         `json:"text"`
	Mode     model.ChatMode `json:"mode"`
	Lat      *float64       `json:"lat,omitempty"`
	Lng      *float64       `json:"lng,omitempty"`
}

// ChatServiceResponse is returned to the client.
type ChatServiceResponse struct {
	Text             string                  `json:"text"`
	ThinkingText     string                  `json:"thinking,omitempty"`
	GroundingSources []model.GroundingSource `json:"groundingSources,omitempty"`
	ModelUsed        string                  `json:"modelUsed"`
	ThreadID         string                  `json:"threadId"`
	ActionsQueued    int                     `json:"actionsQueued,omitempty"`
}

// ChatService provides business logic for chat interactions.
type ChatService struct {
	geminiClient *gemini.Client
	chatRepo     repository.ChatRepository
	workspace    *WorkspaceService
	notes        *NotesService
	delegations  *DelegationsService
}

// NewChatService creates a new ChatService.
func NewChatService(
	geminiClient *gemini.Client,
	chatRepo repository.ChatRepository,
	workspace *WorkspaceService,
	notes *NotesService,
	delegations *DelegationsService,
) *ChatService {
	return &ChatService{
		geminiClient: geminiClient,
		chatRepo:     chatRepo,
		workspace:    workspace,
		notes:        notes,
		delegations:  delegations,
	}
}

// SendMessage processes a chat message.
func (s *ChatService) SendMessage(ctx context.Context, userID string, req ChatRequest) (*ChatServiceResponse, error) {
	now := time.Now().UTC()

	var threadID string
	if req.ThreadID != nil && *req.ThreadID != "" {
		threadID = *req.ThreadID
		thread, err := s.chatRepo.GetThread(ctx, threadID)
		if err != nil {
			return nil, fmt.Errorf("chat: thread not found: %w", err)
		}
		if thread.UserID != userID {
			return nil, fmt.Errorf("chat: permission denied")
		}
	} else {
		threadID = uuid.New().String()
		title := req.Text
		if len(title) > 100 {
			title = title[:100]
		}
		thread := &model.ChatThread{
			ID: threadID, UserID: userID, Title: title,
			CreatedAt: now, UpdatedAt: now,
		}
		if err := s.chatRepo.CreateThread(ctx, thread); err != nil {
			return nil, fmt.Errorf("chat: create thread: %w", err)
		}
	}

	userMsg := &model.ChatMessage{
		ID: uuid.New().String(), ThreadID: threadID, Role: "user",
		Text: req.Text, Mode: req.Mode, CreatedAt: now,
	}
	if err := s.chatRepo.CreateMessage(ctx, userMsg); err != nil {
		return nil, fmt.Errorf("chat: save user message: %w", err)
	}

	history, err := s.chatRepo.GetMessagesByThread(ctx, threadID)
	if err != nil {
		return nil, fmt.Errorf("chat: load history: %w", err)
	}

	mode := req.Mode
	if mode == "" {
		mode = model.ChatModeGeneral
	}

	// Specialized modes without agent tools.
	if mode == model.ChatModeSearch || mode == model.ChatModeMaps || mode == model.ChatModeThinking {
		messages := make([]model.Message, 0, len(history))
		for _, m := range history {
			messages = append(messages, model.Message{Role: m.Role, Text: m.Text})
		}
		geminiResp, err := s.geminiClient.Chat(ctx, messages, mode, req.Lat, req.Lng)
		if err != nil {
			return nil, fmt.Errorf("chat: gemini call: %w", err)
		}
		return s.persistModelReply(ctx, threadID, mode, geminiResp.Text, geminiResp.ThinkingText, geminiResp.GroundingSources, geminiResp.ModelUsed, 0)
	}

	text, thinking, actions, modelUsed, err := s.runAgent(ctx, userID, history)
	if err != nil {
		messages := make([]model.Message, 0, len(history))
		for _, m := range history {
			messages = append(messages, model.Message{Role: m.Role, Text: m.Text})
		}
		geminiResp, err2 := s.geminiClient.Chat(ctx, messages, mode, req.Lat, req.Lng)
		if err2 != nil {
			return nil, fmt.Errorf("chat: gemini call: %w", err2)
		}
		return s.persistModelReply(ctx, threadID, mode, geminiResp.Text, geminiResp.ThinkingText, geminiResp.GroundingSources, geminiResp.ModelUsed, 0)
	}

	return s.persistModelReply(ctx, threadID, mode, text, thinking, nil, modelUsed, actions)
}

func (s *ChatService) runAgent(ctx context.Context, userID string, history []*model.ChatMessage) (string, string, int, string, error) {
	roles := make([]gemini.RoleText, 0, len(history))
	for _, m := range history {
		roles = append(roles, gemini.RoleText{Role: m.Role, Text: m.Text})
	}
	contents := gemini.ContentsFromHistory(roles)

	text, thinking, calls, modelUsed, err := s.geminiClient.ChatWithTools(ctx, contents, "")
	if err != nil {
		return "", "", 0, "", err
	}
	if len(calls) == 0 {
		return text, thinking, 0, modelUsed, nil
	}

	var results []gemini.FunctionResponse
	var modelParts []gemini.PartExport
	actions := 0
	for _, call := range calls {
		res, queued := s.executeTool(ctx, userID, call)
		if queued {
			actions++
		}
		results = append(results, gemini.FunctionResponse{Name: call.Name, Response: res})
		modelParts = append(modelParts, gemini.PartExport{
			FunctionCallName: call.Name,
			FunctionCallArgs: call.Args,
		})
	}

	final, modelUsed2, err := s.geminiClient.ContinueWithToolResults(ctx, contents, modelParts, results)
	if err != nil {
		if text == "" && actions > 0 {
			text = fmt.Sprintf("Boss, I prepared %d action(s) for your approval in Delegated Work.", actions)
		}
		return text, thinking, actions, modelUsed, nil
	}
	if final != "" {
		text = final
	}
	if modelUsed2 != "" {
		modelUsed = modelUsed2
	}
	return text, thinking, actions, modelUsed, nil
}

func (s *ChatService) executeTool(ctx context.Context, userID string, call gemini.FunctionCall) (map[string]any, bool) {
	args := call.Args
	str := func(k string) string {
		if args == nil {
			return ""
		}
		v, _ := args[k].(string)
		return v
	}

	switch call.Name {
	case "get_today_schedule":
		if s.workspace == nil {
			return map[string]any{"error": "workspace unavailable"}, false
		}
		brief, err := s.workspace.GetBrief(ctx, userID)
		if err != nil || brief == nil || !brief.Connected {
			return map[string]any{"connected": false, "events": []any{}}, false
		}
		return map[string]any{"connected": true, "events": brief.Events, "conflicts": brief.Conflicts}, false

	case "get_inbox_summary":
		if s.workspace == nil {
			return map[string]any{"error": "workspace unavailable"}, false
		}
		brief, err := s.workspace.GetBrief(ctx, userID)
		if err != nil || brief == nil || !brief.Connected {
			return map[string]any{"connected": false, "emails": []any{}}, false
		}
		return map[string]any{"connected": true, "emails": brief.Emails}, false

	case "get_open_tasks":
		if s.workspace == nil {
			return map[string]any{"error": "workspace unavailable"}, false
		}
		brief, err := s.workspace.GetBrief(ctx, userID)
		if err != nil || brief == nil || !brief.Connected {
			return map[string]any{"connected": false, "tasks": []any{}}, false
		}
		return map[string]any{"connected": true, "tasks": brief.Tasks}, false

	case "draft_email_reply":
		if s.delegations == nil {
			return map[string]any{"error": "delegations unavailable"}, false
		}
		to, subject, body := str("to"), str("subject"), str("body")
		title := "Reply to " + to
		if subject != "" {
			title += " · " + subject
		}
		d, err := s.delegations.Create(ctx, userID, model.CreateDelegationRequest{
			Title: title, Service: "Gmail", Context: to, Draft: body,
			Tone: "accent", ToneLabel: "draft · awaiting send",
		})
		if err != nil {
			return map[string]any{"error": err.Error()}, false
		}
		return map[string]any{"queued": true, "delegationId": d.ID, "status": "awaiting_approval"}, true

	case "propose_calendar_change":
		if s.delegations == nil {
			return map[string]any{"error": "delegations unavailable"}, false
		}
		title, details := str("title"), str("details")
		d, err := s.delegations.Create(ctx, userID, model.CreateDelegationRequest{
			Title: title, Service: "Google Calendar", Context: "calendar", Draft: details,
			Tone: "warning", ToneLabel: "calendar · awaiting approval",
		})
		if err != nil {
			return map[string]any{"error": err.Error()}, false
		}
		return map[string]any{"queued": true, "delegationId": d.ID}, true

	case "remember_note":
		if s.notes == nil {
			return map[string]any{"error": "notes unavailable"}, false
		}
		title, content, tag := str("title"), str("content"), str("tag")
		if tag == "" {
			tag = "memory"
		}
		n, err := s.notes.Create(ctx, userID, model.CreateNoteRequest{
			Title: title, Content: content, Tag: tag, Color: "#F5EFE6",
		})
		if err != nil {
			return map[string]any{"error": err.Error()}, false
		}
		return map[string]any{"saved": true, "noteId": n.ID}, false

	case "propose_delegation":
		if s.delegations == nil {
			return map[string]any{"error": "delegations unavailable"}, false
		}
		title, service, contextStr, draft := str("title"), str("service"), str("context"), str("draft")
		if service == "" {
			service = "Butler"
		}
		d, err := s.delegations.Create(ctx, userID, model.CreateDelegationRequest{
			Title: title, Service: service, Context: contextStr, Draft: draft,
			Tone: "accent", ToneLabel: "awaiting approval",
		})
		if err != nil {
			return map[string]any{"error": err.Error()}, false
		}
		return map[string]any{"queued": true, "delegationId": d.ID}, true

	default:
		return map[string]any{"error": "unknown tool " + call.Name}, false
	}
}

func (s *ChatService) persistModelReply(
	ctx context.Context,
	threadID string,
	mode model.ChatMode,
	text, thinking string,
	sources []model.GroundingSource,
	modelUsed string,
	actions int,
) (*ChatServiceResponse, error) {
	if text == "" && actions > 0 {
		text = fmt.Sprintf("Done Boss — I queued %d action(s) for your approval in Delegated Work.", actions)
	}
	if text == "" {
		text = "Boss, I heard you. Could you rephrase that so I can act?"
	}

	modelMsg := &model.ChatMessage{
		ID: uuid.New().String(), ThreadID: threadID, Role: "model",
		Text: text, Mode: mode, CreatedAt: time.Now().UTC(),
	}
	if err := s.chatRepo.CreateMessage(ctx, modelMsg); err != nil {
		return nil, fmt.Errorf("chat: save model message: %w", err)
	}

	thread, _ := s.chatRepo.GetThread(ctx, threadID)
	if thread != nil {
		now := time.Now().UTC()
		thread.LastMessageAt = now
		thread.UpdatedAt = now
		if thread.Subtitle == "" {
			sub := text
			if len(sub) > 80 {
				sub = sub[:80] + "…"
			}
			thread.Subtitle = sub
		}
		_ = s.chatRepo.UpdateThread(ctx, thread)
	}

	if actions > 0 {
		lower := strings.ToLower(text)
		if !strings.Contains(lower, "approval") && !strings.Contains(lower, "delegat") {
			text = text + fmt.Sprintf("\n\n· %d item(s) await your nod in Delegated Work.", actions)
		}
	}

	return &ChatServiceResponse{
		Text: text, ThinkingText: thinking, GroundingSources: sources,
		ModelUsed: modelUsed, ThreadID: threadID, ActionsQueued: actions,
	}, nil
}

// Transcribe converts audio to text.
func (s *ChatService) Transcribe(ctx context.Context, audioBase64 string, mimeType string) (string, error) {
	text, err := s.geminiClient.Transcribe(ctx, audioBase64, mimeType)
	if err != nil {
		return "", fmt.Errorf("chat: transcribe: %w", err)
	}
	return text, nil
}

// Analyze processes a file with an optional prompt.
func (s *ChatService) Analyze(ctx context.Context, fileBase64 string, mimeType string, prompt string) (string, error) {
	text, err := s.geminiClient.Analyze(ctx, fileBase64, mimeType, prompt)
	if err != nil {
		return "", fmt.Errorf("chat: analyze: %w", err)
	}
	return text, nil
}

// GetThreads returns all chat threads for a user.
func (s *ChatService) GetThreads(ctx context.Context, userID string) ([]*model.ChatThread, error) {
	threads, err := s.chatRepo.GetThreadsByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("chat: get threads: %w", err)
	}
	return threads, nil
}

// GetMessages returns all messages in a thread after verifying ownership.
func (s *ChatService) GetMessages(ctx context.Context, userID, threadID string) ([]*model.ChatMessage, error) {
	thread, err := s.chatRepo.GetThread(ctx, threadID)
	if err != nil {
		return nil, fmt.Errorf("chat: thread not found: %w", err)
	}
	if thread.UserID != userID {
		return nil, fmt.Errorf("chat: permission denied")
	}
	msgs, err := s.chatRepo.GetMessagesByThread(ctx, threadID)
	if err != nil {
		return nil, fmt.Errorf("chat: get messages: %w", err)
	}
	return msgs, nil
}
