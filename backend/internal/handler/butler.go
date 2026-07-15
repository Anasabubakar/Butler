package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/gamp/butler/internal/middleware"
	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/service"
)

// ButlerHandler handles Butler AI chat endpoints.
type ButlerHandler struct {
	chatService *service.ChatService
}

// NewButlerHandler creates a new ButlerHandler.
func NewButlerHandler(chatService *service.ChatService) *ButlerHandler {
	return &ButlerHandler{chatService: chatService}
}

type chatRequest struct {
	Text     string         `json:"text"`
	Mode     model.ChatMode `json:"mode"`
	ThreadID *string        `json:"threadId,omitempty"`
	Lat      *float64       `json:"lat,omitempty"`
	Lng      *float64       `json:"lng,omitempty"`
}

type chatResponse struct {
	Text             string                  `json:"text"`
	Thinking         string                  `json:"thinking,omitempty"`
	GroundingSources []model.GroundingSource `json:"groundingSources,omitempty"`
	ThreadID         string                  `json:"threadId"`
	ModelUsed        string                  `json:"modelUsed"`
}

// Chat handles POST /api/butler/chat.
func (h *ButlerHandler) Chat(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req chatRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 50<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Text == "" {
		writeError(w, http.StatusBadRequest, "text is required")
		return
	}

	if req.Mode == "" {
		req.Mode = model.ChatModeGeneral
	}

	svcReq := service.ChatRequest{
		ThreadID: req.ThreadID,
		Text:     req.Text,
		Mode:     req.Mode,
		Lat:      req.Lat,
		Lng:      req.Lng,
	}

	result, err := h.chatService.SendMessage(r.Context(), userID, svcReq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, chatResponse{
		Text:             result.Text,
		Thinking:         result.ThinkingText,
		GroundingSources: result.GroundingSources,
		ThreadID:         result.ThreadID,
		ModelUsed:        result.ModelUsed,
	})
}

type transcribeRequest struct {
	AudioBase64 string `json:"audioBase64"`
	MIMEType    string `json:"mimeType"`
}

type transcribeResponse struct {
	Text string `json:"text"`
