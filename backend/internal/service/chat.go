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
