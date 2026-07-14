package service

import (
	"context"
	"fmt"
	"time"

	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
	"github.com/google/uuid"
)

// DelegationsService provides business logic for delegations.
type DelegationsService struct {
	repo repository.DelegationsRepository
}

// NewDelegationsService creates a new DelegationsService.
func NewDelegationsService(repo repository.DelegationsRepository) *DelegationsService {
	return &DelegationsService{repo: repo}
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

// Approve marks a delegation as approved.
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

	d.Status = "approved"
	if err := s.repo.Update(ctx, d); err != nil {
		return nil, fmt.Errorf("delegations: approve: %w", err)
	}
	return d, nil
}

// Reject marks a delegation as rejected.
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
	if err := s.repo.Update(ctx, d); err != nil {
		return nil, fmt.Errorf("delegations: reject: %w", err)
	}
	return d, nil
}
