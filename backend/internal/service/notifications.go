package service

import (
	"context"
	"fmt"

	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
)

// NotificationsService provides business logic for notifications.
type NotificationsService struct {
	repo repository.NotificationsRepository
}

// NewNotificationsService creates a new NotificationsService.
func NewNotificationsService(repo repository.NotificationsRepository) *NotificationsService {
	return &NotificationsService{repo: repo}
}

// GetAll returns notifications for the user with an optional source filter.
func (s *NotificationsService) GetAll(ctx context.Context, userID string, source *string) ([]*model.Notification, error) {
	notifications, err := s.repo.GetAllByUser(ctx, userID, source)
	if err != nil {
		return nil, fmt.Errorf("notifications: get all: %w", err)
	}
	return notifications, nil
}

// MarkRead marks a single notification as read.
func (s *NotificationsService) MarkRead(ctx context.Context, userID string, id string) error {
	n, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("notifications: not found: %w", err)
	}

	if n.UserID != userID {
		return fmt.Errorf("notifications: permission denied")
	}

	if err := s.repo.MarkRead(ctx, id); err != nil {
		return fmt.Errorf("notifications: mark read: %w", err)
	}
	return nil
}

// MarkAllRead marks all notifications for the user as read.
func (s *NotificationsService) MarkAllRead(ctx context.Context, userID string) error {
	if err := s.repo.MarkAllRead(ctx, userID); err != nil {
		return fmt.Errorf("notifications: mark all read: %w", err)
	}
	return nil
}
