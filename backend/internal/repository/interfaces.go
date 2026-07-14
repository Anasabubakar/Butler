package repository

import (
	"context"

	"github.com/gamp/butler/internal/model"
)

// ChatRepository persists chat threads and messages.
type ChatRepository interface {
	CreateThread(ctx context.Context, thread *model.ChatThread) error
	GetThreadsByUser(ctx context.Context, userID string) ([]*model.ChatThread, error)
	GetThread(ctx context.Context, threadID string) (*model.ChatThread, error)
	UpdateThread(ctx context.Context, thread *model.ChatThread) error
	CreateMessage(ctx context.Context, msg *model.ChatMessage) error
	GetMessagesByThread(ctx context.Context, threadID string) ([]*model.ChatMessage, error)
}

// NotesRepository persists user notes.
type NotesRepository interface {
	Create(ctx context.Context, note *model.Note) error
	GetAllByUser(ctx context.Context, userID string) ([]*model.Note, error)
	GetByID(ctx context.Context, id string) (*model.Note, error)
	Update(ctx context.Context, note *model.Note) error
	Delete(ctx context.Context, id string) error
}

// DelegationsRepository persists delegations.
type DelegationsRepository interface {
	Create(ctx context.Context, d *model.Delegation) error
	GetAllByUser(ctx context.Context, userID string, status *string) ([]*model.Delegation, error)
	GetByID(ctx context.Context, id string) (*model.Delegation, error)
	Update(ctx context.Context, d *model.Delegation) error
}

// NotificationsRepository persists notifications.
type NotificationsRepository interface {
	GetAllByUser(ctx context.Context, userID string, source *string) ([]*model.Notification, error)
	GetByID(ctx context.Context, id string) (*model.Notification, error)
	MarkRead(ctx context.Context, id string) error
	MarkAllRead(ctx context.Context, userID string) error
}

// SettingsRepository persists user settings.
type SettingsRepository interface {
	Get(ctx context.Context, userID string) (*model.UserSettings, error)
	Upsert(ctx context.Context, s *model.UserSettings) error
}
