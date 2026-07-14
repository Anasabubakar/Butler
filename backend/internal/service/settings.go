package service

import (
	"context"
	"fmt"

	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/repository"
)

// SettingsService provides business logic for user settings.
type SettingsService struct {
	repo repository.SettingsRepository
}

// NewSettingsService creates a new SettingsService.
func NewSettingsService(repo repository.SettingsRepository) *SettingsService {
	return &SettingsService{repo: repo}
}

// Get retrieves settings for a user, returning defaults if none exist.
func (s *SettingsService) Get(ctx context.Context, userID string) (*model.UserSettings, error) {
	settings, err := s.repo.Get(ctx, userID)
	if err != nil {
		return &model.UserSettings{
			UserID:             userID,
			Theme:              "system",
			ChatMode:           "general",
			Timezone:           "UTC",
			Warmth:             72,
			Formality:          55,
			Brevity:            80,
			LocationAutoDetect: true,
		}, nil
	}
	return settings, nil
}

// Update applies partial updates to the user's settings.
func (s *SettingsService) Update(ctx context.Context, userID string, req model.UpdateSettingsRequest) (*model.UserSettings, error) {
	settings, _ := s.repo.Get(ctx, userID)
	if settings == nil {
		settings = &model.UserSettings{
			UserID:             userID,
			Theme:              "system",
			ChatMode:           "general",
			Timezone:           "UTC",
			Warmth:             72,
			Formality:          55,
			Brevity:            80,
			LocationAutoDetect: true,
		}
	}

	if req.Theme != nil {
		settings.Theme = *req.Theme
	}
	if req.ChatMode != nil {
		settings.ChatMode = *req.ChatMode
	}
	if req.Timezone != nil {
		settings.Timezone = *req.Timezone
	}
	if req.Warmth != nil {
		settings.Warmth = *req.Warmth
	}
	if req.Formality != nil {
		settings.Formality = *req.Formality
	}
	if req.Brevity != nil {
		settings.Brevity = *req.Brevity
	}
	if req.LocationAutoDetect != nil {
		settings.LocationAutoDetect = *req.LocationAutoDetect
	}
	if req.LocationText != nil {
		settings.LocationText = *req.LocationText
	}
	if req.Integrations != nil {
		settings.Integrations = req.Integrations
	}

	if err := s.repo.Upsert(ctx, settings); err != nil {
		return nil, fmt.Errorf("settings: update: %w", err)
	}
	return settings, nil
}
