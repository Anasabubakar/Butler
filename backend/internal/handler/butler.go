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
