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

// OAuthConnection is a persisted third-party integration connection.
type OAuthConnection struct {
	ID              string     `json:"id"`
	UserID          string     `json:"userId"`
	Provider        string     `json:"provider"`
	AccountLabel    string     `json:"accountLabel"`
	AccountID       string     `json:"accountId,omitempty"`
	Scopes          string     `json:"scopes"`
	AccessTokenEnc  string     `json:"-"`
	RefreshTokenEnc string     `json:"-"`
	TokenType       string     `json:"tokenType,omitempty"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	Metadata        []byte     `json:"metadata,omitempty"`
	Status          string     `json:"status"`
	LastSyncedAt    *time.Time `json:"lastSyncedAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// OAuthState is a short-lived CSRF state for OAuth connect flows.
type OAuthState struct {
	State     string    `json:"state"`
	UserID    string    `json:"userId"`
	Provider  string    `json:"provider"`
	RedirectTo string   `json:"redirectTo"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// IntegrationCatalogItem is the public view of a connector.
type IntegrationCatalogItem struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Role         string  `json:"role"`
	Scopes       string  `json:"scopes"`
	Group        string  `json:"group"`
	Status       string  `json:"status"` // connected | available | not_configured | coming_soon
	AccountLabel string  `json:"accountLabel,omitempty"`
	ConnectedAt  *string `json:"connectedAt,omitempty"`
	LastSyncedAt *string `json:"lastSyncedAt,omitempty"`
	AuthType     string  `json:"authType"` // oauth | client | none
	Configured   bool    `json:"configured"`
	DocsURL      string  `json:"docsUrl,omitempty"`
	SetupHint    string  `json:"setupHint,omitempty"`
	// CallbackURL is the redirect URI operators must register with the OAuth app.
	CallbackURL string `json:"callbackUrl,omitempty"`
}

// ConnectResponse is returned when starting an OAuth or client connect flow.
type ConnectResponse struct {
	Provider  string `json:"provider"`
	AuthURL   string `json:"authUrl,omitempty"`
	Mode      string `json:"mode"` // redirect | client | disabled
	Message   string `json:"message,omitempty"`
}

// RegisterGoogleRequest stores a Google Workspace token obtained via Firebase popup.
type RegisterGoogleRequest struct {
	AccessToken string `json:"accessToken"`
	Email       string `json:"email,omitempty"`
	Scopes      string `json:"scopes,omitempty"`
}
