package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gamp/butler/internal/model"
)

const butlerSystemInstruction = "You are Butler, the ultimate Digital Chief of Staff. You ALWAYS address the user as 'Boss'. You are warm, competent, dry-witted, and anticipatory. You speak like a trusted advisor who knows the user's world inside out. Keep answers concise but thoughtful. When you take action, you describe what you did and why with quiet confidence."

const (
	geminiBaseURL     = "https://generativelanguage.googleapis.com/v1beta/models"
	modelFlash        = "gemini-3.5-flash"
	modelFlashLite    = "gemini-3.1-flash-lite"
	modelProPreview   = "gemini-3.1-pro-preview"
)

// Client is an HTTP client for the Gemini generative AI API.
type Client struct {
	apiKey     string
	httpClient *http.Client
}

// NewClient creates a new Gemini API client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:     apiKey,
		httpClient: &http.Client{},
	}
}

// --- Request/Response types for the Gemini REST API ---

type geminiPart struct {
	Text             string                   `json:"text,omitempty"`
	InlineData       *geminiBlob              `json:"inlineData,omitempty"`
	Thought          *bool                    `json:"thought,omitempty"`
	FunctionCall     *geminiFunctionCall      `json:"functionCall,omitempty"`
	FunctionResponse *geminiFunctionResponse  `json:"functionResponse,omitempty"`
}

type geminiFunctionCall struct {
	Name string         `json:"name"`
	Args map[string]any `json:"args,omitempty"`
}

type geminiFunctionResponse struct {
	Name     string         `json:"name"`
	Response map[string]any `json:"response"`
}

type functionDeclaration struct {
	Name        string         `json:"name"`
	Description string         `json:"description,omitempty"`
	Parameters  map[string]any `json:"parameters,omitempty"`
}

type geminiBlob struct {
	MIMEType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiSystemInstruction struct {
	Parts []geminiPart `json:"parts"`
}

type thinkingConfig struct {
	ThinkingBudget int `json:"thinkingBudget"`
}

type generationConfig struct {
	ThinkingConfig *thinkingConfig `json:"thinkingConfig,omitempty"`
}

type googleSearchTool struct{}
type googleMapsTool struct{}

type geminiTool struct {
	GoogleSearch         *googleSearchTool      `json:"googleSearch,omitempty"`
	GoogleMaps           *googleMapsTool        `json:"googleMaps,omitempty"`
	FunctionDeclarations []functionDeclaration  `json:"functionDeclarations,omitempty"`
}

type dynamicRetrievalConfig struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type geminiRequest struct {
	Contents                []geminiContent          `json:"contents"`
	SystemInstruction       *geminiSystemInstruction `json:"systemInstruction,omitempty"`
	GenerationConfig        *generationConfig        `json:"generationConfig,omitempty"`
	Tools                   []geminiTool             `json:"tools,omitempty"`
	DynamicRetrievalConfig  *dynamicRetrievalConfig  `json:"dynamicRetrievalConfig,omitempty"`
}

type groundingChunk struct {
	Web  *groundingWeb  `json:"web,omitempty"`
	Maps *groundingMaps `json:"maps,omitempty"`
}

type groundingWeb struct {
	Title string `json:"title"`
	URI   string `json:"uri"`
}

type groundingMaps struct {
	Title string `json:"title"`
}

type groundingMetadata struct {
	GroundingChunks []groundingChunk `json:"groundingChunks,omitempty"`
}

type geminiCandidate struct {
	Content           geminiContent      `json:"content"`
	GroundingMetadata *groundingMetadata `json:"groundingMetadata,omitempty"`
}

type geminiResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
}

// modelForMode returns the Gemini model name for a given ChatMode.
func modelForMode(mode model.ChatMode) string {
	switch mode {
	case model.ChatModeLowLatency:
		return modelFlashLite
	case model.ChatModeThinking:
		return modelProPreview
	default:
		return modelFlash
	}
}

// Chat sends a multi-turn chat request to the Gemini API.
func (c *Client) Chat(ctx context.Context, messages []model.Message, mode model.ChatMode, lat *float64, lng *float64) (*model.ChatResponse, error) {
	modelName := modelForMode(mode)

	contents := make([]geminiContent, 0, len(messages))
	for _, m := range messages {
		contents = append(contents, geminiContent{
			Role:  m.Role,
			Parts: []geminiPart{{Text: m.Text}},
		})
	}

	req := geminiRequest{
		Contents: contents,
		SystemInstruction: &geminiSystemInstruction{
			Parts: []geminiPart{{Text: butlerSystemInstruction}},
		},
	}

	// Configure generation and tools based on mode.
	switch mode {
	case model.ChatModeThinking:
		req.GenerationConfig = &generationConfig{
			ThinkingConfig: &thinkingConfig{ThinkingBudget: 24576},
		}
	case model.ChatModeSearch:
		req.Tools = []geminiTool{{GoogleSearch: &googleSearchTool{}}}
	case model.ChatModeMaps:
		req.Tools = []geminiTool{{GoogleMaps: &googleMapsTool{}}}
		if lat != nil && lng != nil {
			req.DynamicRetrievalConfig = &dynamicRetrievalConfig{Lat: *lat, Lng: *lng}
		}
	}

	resp, err := c.callGenerateContent(ctx, modelName, &req)
	if err != nil {
		return nil, err
	}

	return c.parseChatResponse(resp, modelName)
}

// Transcribe converts audio to text using Gemini.
func (c *Client) Transcribe(ctx context.Context, audioBase64 string, mimeType string) (string, error) {
	req := geminiRequest{
		Contents: []geminiContent{
			{
				Role: "user",
				Parts: []geminiPart{
					{InlineData: &geminiBlob{MIMEType: mimeType, Data: audioBase64}},
				},
			},
		},
		SystemInstruction: &geminiSystemInstruction{
			Parts: []geminiPart{{Text: "Transcribe the following audio. Return only the transcription text."}},
		},
	}

	resp, err := c.callGenerateContent(ctx, modelFlash, &req)
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini: empty transcription response")
	}
	return resp.Candidates[0].Content.Parts[0].Text, nil
}

// Analyze processes a file (image, PDF, etc.) with an optional prompt.
func (c *Client) Analyze(ctx context.Context, fileBase64 string, mimeType string, prompt string) (string, error) {
	if prompt == "" {
		prompt = "Describe what you see in this file."
	}

	req := geminiRequest{
		Contents: []geminiContent{
			{
				Role: "user",
				Parts: []geminiPart{
					{InlineData: &geminiBlob{MIMEType: mimeType, Data: fileBase64}},
					{Text: prompt},
				},
			},
		},
	}

	resp, err := c.callGenerateContent(ctx, modelProPreview, &req)
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini: empty analysis response")
	}
	return resp.Candidates[0].Content.Parts[0].Text, nil
}

// callGenerateContent makes the HTTP POST to the Gemini generateContent endpoint.
func (c *Client) callGenerateContent(ctx context.Context, modelName string, body *geminiRequest) (*geminiResponse, error) {
	url := fmt.Sprintf("%s/%s:generateContent?key=%s", geminiBaseURL, modelName, c.apiKey)

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("gemini: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("gemini: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini: send request: %w", err)
	}
	defer httpResp.Body.Close()

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("gemini: read response: %w", err)
	}

	if httpResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini: API returned %d: %s", httpResp.StatusCode, string(respBody))
	}

	var result geminiResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("gemini: unmarshal response: %w", err)
	}

	return &result, nil
}

// parseChatResponse extracts text, thinking, and grounding sources from the API response.
func (c *Client) parseChatResponse(resp *geminiResponse, modelName string) (*model.ChatResponse, error) {
	if len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("gemini: no candidates in response")
	}

	candidate := resp.Candidates[0]
	result := &model.ChatResponse{
		ModelUsed: modelName,
	}

	for _, part := range candidate.Content.Parts {
		if part.Thought != nil && *part.Thought {
			result.ThinkingText += part.Text
		} else if part.Text != "" {
			result.Text += part.Text
		}
	}

	if candidate.GroundingMetadata != nil {
		for _, chunk := range candidate.GroundingMetadata.GroundingChunks {
			if chunk.Web != nil {
				result.GroundingSources = append(result.GroundingSources, model.GroundingSource{
					Title: chunk.Web.Title,
					URI:   chunk.Web.URI,
					Type:  "web",
				})
			}
			if chunk.Maps != nil {
				result.GroundingSources = append(result.GroundingSources, model.GroundingSource{
					Title: chunk.Maps.Title,
					Type:  "maps",
				})
			}
		}
	}

	return result, nil
}
