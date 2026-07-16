package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gamp/butler/internal/connector"
	"github.com/gamp/butler/internal/crypto"
	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
	"github.com/gamp/butler/internal/workspace"
	"github.com/google/uuid"
)

// WorkspaceService serves command-center data from vaulted Google tokens
// and runs proactive sync into notifications + draft delegations.
type WorkspaceService struct {
	connections   repository.ConnectionsRepository
	notifications repository.NotificationsRepository
	delegations   repository.DelegationsRepository
	vault         *crypto.TokenVault
	google        *workspace.GoogleClient
	proactive     bool
}

func NewWorkspaceService(
	connections repository.ConnectionsRepository,
	notifications repository.NotificationsRepository,
	delegations repository.DelegationsRepository,
	vault *crypto.TokenVault,
	proactive bool,
) *WorkspaceService {
	return &WorkspaceService{
		connections:   connections,
		notifications: notifications,
		delegations:   delegations,
		vault:         vault,
		google:        workspace.NewGoogleClient(),
		proactive:     proactive,
	}
}

// GetGoogleToken decrypts the vaulted Workspace access token.
func (s *WorkspaceService) GetGoogleToken(ctx context.Context, userID string) (string, error) {
	c, err := s.connections.GetByUserAndProvider(ctx, userID, string(connector.ProviderGoogle))
	if err != nil {
		return "", fmt.Errorf("google not connected")
	}
	if c.Status != "connected" {
		return "", fmt.Errorf("google not connected")
	}
	tok, err := s.vault.Open(c.AccessTokenEnc)
	if err != nil {
		return "", fmt.Errorf("decrypt token: %w", err)
	}
	if tok == "" {
		return "", fmt.Errorf("google token empty")
	}
	return tok, nil
}

// GetBrief returns calendar/tasks/mail for the command center.
func (s *WorkspaceService) GetBrief(ctx context.Context, userID string) (*workspace.Brief, error) {
	token, err := s.GetGoogleToken(ctx, userID)
	if err != nil {
		return &workspace.Brief{
			Connected:  false,
			Events:     []workspace.CalendarEvent{},
			WeekEvents: []workspace.CalendarEvent{},
			Tasks:      []workspace.Task{},
			Emails:     []workspace.Email{},
			Conflicts:  []workspace.Conflict{},
			FetchedAt:  time.Now().UTC().Format(time.RFC3339),
		}, nil
	}
	brief, err := s.google.FetchBrief(ctx, token)
	if err != nil {
		if _, ok := err.(*workspace.AuthError); ok {
			return &workspace.Brief{
				Connected:    false,
				TokenExpired: true,
				Events:       []workspace.CalendarEvent{},
				WeekEvents:   []workspace.CalendarEvent{},
				Tasks:        []workspace.Task{},
				Emails:       []workspace.Email{},
				Conflicts:    []workspace.Conflict{},
				FetchedAt:    time.Now().UTC().Format(time.RFC3339),
			}, nil
		}
		return nil, err
	}
	return brief, nil
}

// CreateTask creates a Google Task for the user.
func (s *WorkspaceService) CreateTask(ctx context.Context, userID, title, notes, due string) (*workspace.Task, error) {
	token, err := s.GetGoogleToken(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("google not connected")
	}
	return s.google.CreateTask(ctx, token, title, notes, due)
}

// CompleteTask marks a Google Task complete.
func (s *WorkspaceService) CompleteTask(ctx context.Context, userID, taskID string) error {
	token, err := s.GetGoogleToken(ctx, userID)
	if err != nil {
		return fmt.Errorf("google not connected")
	}
	return s.google.CompleteTask(ctx, token, taskID)
}

// SendGmail sends email with the vaulted Google token.
func (s *WorkspaceService) SendGmail(ctx context.Context, userID, to, subject, body string) error {
	token, err := s.GetGoogleToken(ctx, userID)
	if err != nil {
		return fmt.Errorf("google not connected")
	}
	return s.google.SendGmail(ctx, token, to, subject, body)
}

// SyncResult summarizes proactive actions.
type SyncResult struct {
	Brief                *workspace.Brief `json:"brief"`
	NotificationsCreated int              `json:"notificationsCreated"`
	DelegationsCreated   int              `json:"delegationsCreated"`
	ProactiveEnabled     bool             `json:"proactiveEnabled"`
}

// Sync fetches Workspace data and optionally creates notifications + draft delegations.
func (s *WorkspaceService) Sync(ctx context.Context, userID string) (*SyncResult, error) {
	brief, err := s.GetBrief(ctx, userID)
	if err != nil {
		return nil, err
	}
	res := &SyncResult{Brief: brief, ProactiveEnabled: s.proactive}
	if !s.proactive || !brief.Connected {
		return res, nil
	}

	since := time.Now().UTC().Add(-24 * time.Hour)

	for _, c := range brief.Conflicts {
		title := "Calendar conflict · " + c.Title
		exists, _ := s.notifications.ExistsRecent(ctx, userID, title, since)
		if exists {
			continue
		}
		n := &model.Notification{
			ID:        uuid.New().String(),
			UserID:    userID,
			Title:     title,
			Body:      c.Resolution + " · " + c.Time,
			Source:    "calendar",
			Tone:      "warning",
			Read:      false,
			CreatedAt: time.Now().UTC(),
		}
		if err := s.notifications.Create(ctx, n); err == nil {
			res.NotificationsCreated++
		}
	}

	for i, e := range brief.Emails {
		if i >= 5 {
			break
		}
		title := "Inbox · " + truncate(e.Subject, 60)
		exists, _ := s.notifications.ExistsRecent(ctx, userID, title, since)
		if exists {
			continue
		}
		n := &model.Notification{
			ID:        uuid.New().String(),
			UserID:    userID,
			Title:     title,
			Body:      e.From + " — " + truncate(e.Snippet, 120),
			Source:    "gmail",
			Tone:      "accent",
			Read:      false,
			CreatedAt: time.Now().UTC(),
		}
		if err := s.notifications.Create(ctx, n); err == nil {
			res.NotificationsCreated++
		}
	}

	for i, t := range brief.Tasks {
		if i >= 3 {
			break
		}
		title := "Open task · " + truncate(t.Title, 60)
		exists, _ := s.notifications.ExistsRecent(ctx, userID, title, since)
		if exists {
			continue
		}
		n := &model.Notification{
			ID:        uuid.New().String(),
			UserID:    userID,
			Title:     title,
			Body:      "Still open on your Google Tasks list.",
			Source:    "tasks",
			Tone:      "info",
			Read:      false,
			CreatedAt: time.Now().UTC(),
		}
		if err := s.notifications.Create(ctx, n); err == nil {
			res.NotificationsCreated++
		}
	}

	// Draft reply delegations for top emails if none awaiting for that context.
	awaiting, _ := s.delegations.GetAllByUser(ctx, userID, strPtr("awaiting"))
	awaitingKeys := map[string]bool{}
	for _, d := range awaiting {
		awaitingKeys[strings.ToLower(d.Title)] = true
	}

	for i, e := range brief.Emails {
		if i >= 2 {
			break
		}
		title := "Reply to " + truncate(e.From, 40) + " · " + truncate(e.Subject, 40)
		if awaitingKeys[strings.ToLower(title)] {
			continue
		}
		draft := fmt.Sprintf(
			"Boss — draft reply to %s re: %s\n\nThanks for your note. I'll follow up properly once I've reviewed the details.\n\n— sent via Butler (awaiting your approval)",
			e.From, e.Subject,
		)
		d := &model.Delegation{
			ID:        uuid.New().String(),
			UserID:    userID,
			Title:     title,
			Service:   "Gmail",
			Context:   e.From,
			Draft:     draft,
			Tone:      "accent",
			ToneLabel: "draft · warm",
			Status:    "awaiting",
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		if err := s.delegations.Create(ctx, d); err == nil {
			res.DelegationsCreated++
		}
	}

	return res, nil
}

func strPtr(s string) *string { return &s }

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n-1] + "…"
}
