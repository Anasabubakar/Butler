package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// DelegationsService provides business logic for delegations.
type DelegationsService struct {
	repo      repository.DelegationsRepository
	workspace *WorkspaceService
}

// NewDelegationsService creates a new DelegationsService.
func NewDelegationsService(repo repository.DelegationsRepository, workspace *WorkspaceService) *DelegationsService {
	return &DelegationsService{repo: repo, workspace: workspace}
}

// Create creates a new delegation.
func (s *DelegationsService) Create(ctx context.Context, userID string, req model.CreateDelegationRequest) (*model.Delegation, error) {
	now := time.Now().UTC()
	d := &model.Delegation{
		ID:        uuid.New().String(),
		UserID:    userID,
		Title:     req.Title,
		Service:   req.Service,
		Context:   req.Context,
		Draft:     req.Draft,
		Tone:      req.Tone,
		ToneLabel: req.ToneLabel,
		Status:    "awaiting",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, d); err != nil {
		return nil, fmt.Errorf("delegations: create: %w", err)
	}
	return d, nil
}

// GetAll returns delegations for the user with an optional status filter.
func (s *DelegationsService) GetAll(ctx context.Context, userID string, status *string) ([]*model.Delegation, error) {
	delegations, err := s.repo.GetAllByUser(ctx, userID, status)
	if err != nil {
		return nil, fmt.Errorf("delegations: get all: %w", err)
	}
	return delegations, nil
}

// Approve marks a delegation as approved and executes the real side-effect when possible.
func (s *DelegationsService) Approve(ctx context.Context, userID string, id string) (*model.Delegation, error) {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("delegations: not found: %w", err)
	}

	if d.UserID != userID {
		return nil, fmt.Errorf("delegations: permission denied")
	}

	if d.Status != "awaiting" {
		return nil, fmt.Errorf("delegations: cannot approve delegation with status %q", d.Status)
	}

	// Execute first so we don't mark approved if the action fails hard.
	if err := s.execute(ctx, userID, d); err != nil {
		log.Warn().Err(err).Str("id", id).Str("service", d.Service).Msg("delegations: execute on approve failed")
		d.Status = "awaiting"
		d.ToneLabel = "execution failed · retry"
		// Keep awaiting so Boss can retry after reconnecting Google etc.
		_ = s.repo.Update(ctx, d)
		return nil, fmt.Errorf("delegations: execute failed: %w", err)
	}

	d.Status = "approved"
	if d.ToneLabel == "" || strings.Contains(d.ToneLabel, "await") {
		d.ToneLabel = "approved · executed"
	} else {
		d.ToneLabel = d.ToneLabel + " · done"
	}
	d.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, d); err != nil {
		return nil, fmt.Errorf("delegations: approve: %w", err)
	}
	return d, nil
}

// Reject marks a delegation as rejected (no side-effect).
func (s *DelegationsService) Reject(ctx context.Context, userID string, id string) (*model.Delegation, error) {
	d, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("delegations: not found: %w", err)
	}

	if d.UserID != userID {
		return nil, fmt.Errorf("delegations: permission denied")
	}

	if d.Status != "awaiting" {
		return nil, fmt.Errorf("delegations: cannot reject delegation with status %q", d.Status)
	}

	d.Status = "rejected"
	d.ToneLabel = "rejected"
	d.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, d); err != nil {
		return nil, fmt.Errorf("delegations: reject: %w", err)
	}
	return d, nil
}

func (s *DelegationsService) execute(ctx context.Context, userID string, d *model.Delegation) error {
	if s.workspace == nil {
		// Nothing to execute against — treat as soft approve (status-only).
		return nil
	}

	svc := strings.ToLower(strings.TrimSpace(d.Service))
	switch {
	case strings.Contains(svc, "gmail") || strings.Contains(svc, "mail"):
		to := d.Context
		subject := extractSubject(d.Title)
		body := d.Draft
		if body == "" {
			body = d.Title
		}
		if to == "" {
			// Soft success: nothing to send
			return nil
		}
		return s.workspace.SendGmail(ctx, userID, to, subject, body)

	case strings.Contains(svc, "task"):
		// Create a Google Task from the draft/title
		title := d.Title
		if title == "" {
			title = strings.TrimSpace(d.Draft)
		}
		if title == "" {
			return nil
		}
		_, err := s.workspace.CreateTask(ctx, userID, title, d.Draft, "")
		return err

	case strings.Contains(svc, "calendar"):
		// Calendar create from freeform draft is best-effort: create a task reminder instead
		title := d.Title
		if title == "" {
			title = "Calendar action"
		}
		notes := d.Draft
		if notes == "" {
			notes = d.Context
		}
		_, err := s.workspace.CreateTask(ctx, userID, "📅 "+title, notes, "")
		return err

	default:
		// Generic approvals (Butler/other): record only, or create a follow-up task
		if strings.TrimSpace(d.Draft) != "" || strings.TrimSpace(d.Title) != "" {
			title := d.Title
			if title == "" {
				title = "Approved action"
			}
			_, err := s.workspace.CreateTask(ctx, userID, title, d.Draft, "")
			// Non-fatal if Google offline for generic services
			if err != nil {
				log.Info().Err(err).Msg("delegations: generic task create skipped")
			}
		}
		return nil
	}
}

func extractSubject(title string) string {
	// "Reply to X · Subject" or plain title
	if i := strings.LastIndex(title, " · "); i >= 0 {
		return strings.TrimSpace(title[i+3:])
	}
	if strings.HasPrefix(strings.ToLower(title), "reply to ") {
		return "Re: your message"
	}
	return title
}
