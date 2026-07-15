package service

import (
	"context"
	"fmt"
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

// ChatServiceResponse extends the model ChatResponse with thread info.
type ChatServiceResponse struct {
	Text             string                  `json:"text"`
	ThinkingText     string                  `json:"thinking,omitempty"`
	GroundingSources []model.GroundingSource `json:"groundingSources,omitempty"`
	ModelUsed        string                  `json:"modelUsed"`
	ThreadID         string                  `json:"threadId"`
}

// ChatService provides business logic for chat interactions.
type ChatService struct {
	geminiClient *gemini.Client
	chatRepo     repository.ChatRepository
}

// NewChatService creates a new ChatService.
func NewChatService(geminiClient *gemini.Client, chatRepo repository.ChatRepository) *ChatService {
	return &ChatService{
		geminiClient: geminiClient,
		chatRepo:     chatRepo,
	}
}

// SendMessage processes a chat message: manages threads, calls Gemini, persists history.
func (s *ChatService) SendMessage(ctx context.Context, userID string, req ChatRequest) (*ChatServiceResponse, error) {
	now := time.Now().UTC()

	// Resolve or create thread.
	var threadID string
	if req.ThreadID != nil && *req.ThreadID != "" {
		threadID = *req.ThreadID
		// Verify thread exists and belongs to user.
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
