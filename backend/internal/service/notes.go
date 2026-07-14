package service

import (
	"context"
	"fmt"
	"time"

	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
	"github.com/google/uuid"
)

// NotesService provides business logic for notes management.
type NotesService struct {
	repo repository.NotesRepository
}

// NewNotesService creates a new NotesService.
func NewNotesService(repo repository.NotesRepository) *NotesService {
	return &NotesService{repo: repo}
}

// Create creates a new note for the given user.
func (s *NotesService) Create(ctx context.Context, userID string, req model.CreateNoteRequest) (*model.Note, error) {
	now := time.Now().UTC()
	note := &model.Note{
		ID:        uuid.New().String(),
		UserID:    userID,
		Title:     req.Title,
		Content:   req.Content,
		Color:     req.Color,
		Tag:       req.Tag,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, note); err != nil {
		return nil, fmt.Errorf("notes: create: %w", err)
	}
	return note, nil
}

// GetAll returns all notes belonging to the given user.
func (s *NotesService) GetAll(ctx context.Context, userID string) ([]*model.Note, error) {
	notes, err := s.repo.GetAllByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("notes: get all: %w", err)
	}
	return notes, nil
}

// Update modifies an existing note after verifying ownership.
func (s *NotesService) Update(ctx context.Context, userID string, id string, req model.UpdateNoteRequest) (*model.Note, error) {
	note, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("notes: not found: %w", err)
	}

	if note.UserID != userID {
		return nil, fmt.Errorf("notes: permission denied")
	}

	if req.Title != nil {
		note.Title = *req.Title
	}
	if req.Content != nil {
		note.Content = *req.Content
	}
	if req.Color != nil {
		note.Color = *req.Color
	}
	if req.Tag != nil {
		note.Tag = *req.Tag
	}
	note.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, note); err != nil {
		return nil, fmt.Errorf("notes: update: %w", err)
	}
	return note, nil
}

// Delete removes a note after verifying ownership.
func (s *NotesService) Delete(ctx context.Context, userID string, id string) error {
	note, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("notes: not found: %w", err)
	}

	if note.UserID != userID {
		return fmt.Errorf("notes: permission denied")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("notes: delete: %w", err)
	}
	return nil
}
