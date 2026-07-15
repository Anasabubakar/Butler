package gemini

import (
	"context"
	"encoding/json"
	"fmt"
)

// FunctionCall is a tool invocation from the model.
type FunctionCall struct {
	Name string
	Args map[string]any
}

// FunctionResponse is returned to the model after tool execution.
type FunctionResponse struct {
	Name     string
	Response map[string]any
}

// ChatWithTools runs one generateContent call with Butler agent tools enabled.
// Returns assistant text plus any function calls the model requested.
func (c *Client) ChatWithTools(
	ctx context.Context,
	messages []geminiContent,
	systemExtra string,
) (text string, thinking string, calls []FunctionCall, modelUsed string, err error) {
	modelName := modelFlash
	sys := butlerSystemInstruction + `

You have tools to read the Boss's Google Workspace and to queue actions for approval.
CRITICAL RULES:
- Never send email, change calendar, or take irreversible action yourself.
- For any write action, call draft_* / propose_* tools so Butler queues a delegation for Boss approval.
- Address the user as Boss.
- Be proactive: surface conflicts, open loops, and suggested next moves.
` + systemExtra

	req := geminiRequest{
		Contents: messages,
		SystemInstruction: &geminiSystemInstruction{
			Parts: []geminiPart{{Text: sys}},
		},
		Tools: butlerAgentTools(),
	}

	resp, err := c.callGenerateContent(ctx, modelName, &req)
	if err != nil {
		return "", "", nil, modelName, err
	}
	if len(resp.Candidates) == 0 {
		return "", "", nil, modelName, fmt.Errorf("gemini: no candidates")
	}

	var outText, outThink string
	var outCalls []FunctionCall
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.FunctionCall != nil {
			args := map[string]any{}
			if part.FunctionCall.Args != nil {
				args = part.FunctionCall.Args
			}
			outCalls = append(outCalls, FunctionCall{Name: part.FunctionCall.Name, Args: args})
			continue
		}
		if part.Thought != nil && *part.Thought {
			outThink += part.Text
		} else if part.Text != "" {
			outText += part.Text
		}
	}
	return outText, outThink, outCalls, modelName, nil
}

// ContinueWithFunctionResults sends tool results and gets a final natural-language reply.
func (c *Client) ContinueWithFunctionResults(
	ctx context.Context,
	prior []geminiContent,
	modelParts []geminiPart,
	results []FunctionResponse,
	systemExtra string,
) (text string, modelUsed string, err error) {
	modelName := modelFlash
	sys := butlerSystemInstruction + "\nSummarize tool results for Boss. Be clear about anything awaiting approval.\n" + systemExtra

	// Model turn with function calls
	contents := append([]geminiContent{}, prior...)
	contents = append(contents, geminiContent{Role: "model", Parts: modelParts})

	// User turn with function responses
	var frParts []geminiPart
	for _, r := range results {
		frParts = append(frParts, geminiPart{
			FunctionResponse: &geminiFunctionResponse{
				Name:     r.Name,
				Response: r.Response,
			},
		})
	}
	contents = append(contents, geminiContent{Role: "user", Parts: frParts})

	req := geminiRequest{
		Contents: contents,
		SystemInstruction: &geminiSystemInstruction{
			Parts: []geminiPart{{Text: sys}},
		},
		Tools: butlerAgentTools(),
	}

	resp, err := c.callGenerateContent(ctx, modelName, &req)
	if err != nil {
		return "", modelName, err
	}
	if len(resp.Candidates) == 0 {
		return "", modelName, fmt.Errorf("gemini: no candidates")
	}
	var out string
	for _, p := range resp.Candidates[0].Content.Parts {
		if p.Text != "" {
			out += p.Text
		}
	}
	return out, modelName, nil
}

// RoleText is a simple chat turn.
type RoleText struct {
	Role string
	Text string
}

// ContentsFromHistory converts RoleText turns into Gemini contents.
func ContentsFromHistory(messages []RoleText) []geminiContent {
	out := make([]geminiContent, 0, len(messages))
	for _, m := range messages {
		role := m.Role
		if role == "model" || role == "assistant" {
			role = "model"
		} else {
			role = "user"
		}
		out = append(out, geminiContent{
			Role:  role,
			Parts: []geminiPart{{Text: m.Text}},
		})
	}
	return out
}

// PartExport is a package-external description of a model part (function call).
type PartExport struct {
	FunctionCallName string
	FunctionCallArgs map[string]any
}

// ContinueWithToolResults continues a tool-calling turn after tools ran.
func (c *Client) ContinueWithToolResults(
	ctx context.Context,
	prior []geminiContent,
	modelParts []PartExport,
	results []FunctionResponse,
) (text string, modelUsed string, err error) {
	parts := make([]geminiPart, 0, len(modelParts))
	for _, p := range modelParts {
		parts = append(parts, geminiPart{
			FunctionCall: &geminiFunctionCall{Name: p.FunctionCallName, Args: p.FunctionCallArgs},
		})
	}
	return c.ContinueWithFunctionResults(ctx, prior, parts, results, "")
}

func butlerAgentTools() []geminiTool {
	return []geminiTool{{
		FunctionDeclarations: []functionDeclaration{
			{
				Name:        "get_today_schedule",
				Description: "Read Boss's Google Calendar for the next 24 hours.",
				Parameters:  schemaObject(map[string]any{}),
			},
			{
				Name:        "get_inbox_summary",
				Description: "Read recent Gmail inbox messages.",
				Parameters: schemaObject(map[string]any{
					"limit": map[string]any{"type": "integer", "description": "Max messages (default 5)"},
				}),
			},
			{
				Name:        "get_open_tasks",
				Description: "Read open Google Tasks.",
				Parameters:  schemaObject(map[string]any{}),
			},
			{
				Name:        "draft_email_reply",
				Description: "Queue a Gmail reply draft for Boss approval (does not send).",
				Parameters: schemaObject(map[string]any{
					"to":      map[string]any{"type": "string", "description": "Recipient name or email"},
					"subject": map[string]any{"type": "string"},
					"body":    map[string]any{"type": "string", "description": "Draft body in Boss's voice"},
				}, "to", "subject", "body"),
			},
			{
				Name:        "propose_calendar_change",
				Description: "Queue a calendar change for Boss approval (does not write to Calendar).",
				Parameters: schemaObject(map[string]any{
					"title":   map[string]any{"type": "string"},
					"details": map[string]any{"type": "string"},
				}, "title", "details"),
			},
			{
				Name:        "remember_note",
				Description: "Save a memory/note for Butler.",
				Parameters: schemaObject(map[string]any{
					"title":   map[string]any{"type": "string"},
					"content": map[string]any{"type": "string"},
					"tag":     map[string]any{"type": "string"},
				}, "title"),
			},
			{
				Name:        "propose_delegation",
				Description: "Queue a generic delegated action for Boss approval.",
				Parameters: schemaObject(map[string]any{
					"title":   map[string]any{"type": "string"},
					"service": map[string]any{"type": "string"},
					"context": map[string]any{"type": "string"},
					"draft":   map[string]any{"type": "string"},
				}, "title", "service"),
			},
		},
	}}
}

func schemaObject(props map[string]any, required ...string) map[string]any {
	s := map[string]any{
		"type":       "object",
		"properties": props,
	}
	if len(required) > 0 {
		s["required"] = required
	}
	return s
}

// Ensure function args decode from json.RawMessage style maps.
func argsString(args map[string]any, key string) string {
	if args == nil {
		return ""
	}
	v, ok := args[key]
	if !ok || v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		b, _ := json.Marshal(t)
		return string(b)
	}
}
