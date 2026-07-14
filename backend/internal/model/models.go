package model

import "time"

// ChatMode determines which Gemini model and configuration to use.
type ChatMode string

const (
	ChatModeGeneral    ChatMode = "general"
	ChatModeLowLatency ChatMode = "low-latency"
	ChatModeThinking   ChatMode = "thinking"
	ChatModeSearch     ChatMode = "search"
	ChatModeMaps       ChatMode = "maps"
)

// Message represents a single chat message for the Gemini API.
type Message struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

// GroundingSource is a citation returned by Gemini grounding.
type GroundingSource struct {
	Title string `json:"title"`
	URI   string `json:"uri,omitempty"`
	Type  string `json:"type"`
}

// ChatResponse is the structured result from a Gemini chat call.
type ChatResponse struct {
	Text             string            `json:"text"`
	ThinkingText     string            `json:"thinking,omitempty"`
	GroundingSources []GroundingSource `json:"groundingSources,omitempty"`
	ModelUsed        string            `json:"modelUsed"`
}

// ChatThread represents a conversation thread.
type ChatThread struct {
	ID            string    `json:"id"`
	UserID        string    `json:"userId"`
	Title         string    `json:"title"`
	Subtitle      string    `json:"subtitle,omitempty"`
	Tag           string    `json:"tag,omitempty"`
	Tone          string    `json:"tone,omitempty"`
	LastMessageAt time.Time `json:"lastMessageAt,omitempty"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// ChatMessage represents a persisted chat message.
type ChatMessage struct {
	ID        string    `json:"id"`
	ThreadID  string    `json:"threadId"`
	Role      string    `json:"role"`
	Text      string    `json:"text"`
	Mode      ChatMode  `json:"mode,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// Note represents a user note.
type Note struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Color     string    `json:"color,omitempty"`
	Tag       string    `json:"tag,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CreateNoteRequest is the payload for creating a note.
type CreateNoteRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Color   string `json:"color,omitempty"`
	Tag     string `json:"tag,omitempty"`
}

// UpdateNoteRequest is the payload for updating a note.
type UpdateNoteRequest struct {
	Title   *string `json:"title,omitempty"`
	Content *string `json:"content,omitempty"`
	Color   *string `json:"color,omitempty"`
	Tag     *string `json:"tag,omitempty"`
}

// Delegation represents a delegated task awaiting approval.
type Delegation struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Service   string    `json:"service"`
	Context   string    `json:"context"`
	Draft     string    `json:"draft,omitempty"`
	Tone      string    `json:"tone,omitempty"`
	ToneLabel string    `json:"toneLabel,omitempty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// CreateDelegationRequest is the payload for creating a delegation.
type CreateDelegationRequest struct {
	Title     string `json:"title"`
	Service   string `json:"service"`
	Context   string `json:"context"`
	Draft     string `json:"draft,omitempty"`
	Tone      string `json:"tone,omitempty"`
	ToneLabel string `json:"toneLabel,omitempty"`
}

// Notification represents a user notification.
type Notification struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Source    string    `json:"source"`
	Tone      string    `json:"tone,omitempty"`
	Read      bool      `json:"read"`
	CreatedAt time.Time `json:"createdAt"`
}

// UserSettings holds user preferences.
type UserSettings struct {
	UserID              string `json:"userId"`
	Theme               string `json:"theme"`
	ChatMode            string `json:"chatMode"`
	Timezone            string `json:"timezone"`
	Warmth              int    `json:"warmth"`
	Formality           int    `json:"formality"`
	Brevity             int    `json:"brevity"`
	LocationAutoDetect  bool   `json:"locationAutoDetect"`
	LocationText        string `json:"locationText,omitempty"`
	Integrations        []byte `json:"integrations,omitempty"`
}

// UpdateSettingsRequest is the payload for updating settings.
type UpdateSettingsRequest struct {
	Theme              *string `json:"theme,omitempty"`
	ChatMode           *string `json:"chatMode,omitempty"`
	Timezone           *string `json:"timezone,omitempty"`
	Warmth             *int    `json:"warmth,omitempty"`
	Formality          *int    `json:"formality,omitempty"`
	Brevity            *int    `json:"brevity,omitempty"`
	LocationAutoDetect *bool   `json:"locationAutoDetect,omitempty"`
	LocationText       *string `json:"locationText,omitempty"`
	Integrations       []byte  `json:"integrations,omitempty"`
}

// UserInfo carries authenticated user details through context.
type UserInfo struct {
	UID   string
	Email string
	Name  string
}
