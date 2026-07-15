package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	"github.com/gamp/butler/internal/config"
	"github.com/gamp/butler/internal/gemini"
	"github.com/gamp/butler/internal/handler"
	"github.com/gamp/butler/internal/middleware"
	"github.com/gamp/butler/internal/repository"
	"github.com/gamp/butler/internal/router"
	"github.com/gamp/butler/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	cfg := config.Load()

	if cfg.GeminiAPIKey == "" {
		log.Fatal().Msg("GEMINI_API_KEY is required")
	}
	if cfg.FirebaseProject == "" {
		log.Fatal().Msg("FIREBASE_PROJECT_ID is required")
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("failed to ping database")
	}
	log.Info().Msg("connected to PostgreSQL")

	if err := runMigrations(ctx, pool, cfg.MigrationsPath); err != nil {
		log.Fatal().Err(err).Msg("failed to run migrations")
	}

	firebaseAuth, err := middleware.NewFirebaseAuth(cfg.FirebaseProject)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to initialize Firebase Auth")
	}

	chatRepo := repository.NewPgChatRepository(pool)
	notesRepo := repository.NewPgNotesRepository(pool)
	delegationsRepo := repository.NewPgDelegationsRepository(pool)
	notificationsRepo := repository.NewPgNotificationsRepository(pool)
	settingsRepo := repository.NewPgSettingsRepository(pool)

	geminiClient := gemini.NewClient(cfg.GeminiAPIKey)
	liveBridge := gemini.NewLiveBridge(cfg.GeminiAPIKey)

	chatSvc := service.NewChatService(geminiClient, chatRepo)
	notesSvc := service.NewNotesService(notesRepo)
	delegationsSvc := service.NewDelegationsService(delegationsRepo)
	notificationsSvc := service.NewNotificationsService(notificationsRepo)
	settingsSvc := service.NewSettingsService(settingsRepo)

	handlers := router.Handlers{
		Butler:        handler.NewButlerHandler(chatSvc),
		Notes:         handler.NewNotesHandler(notesSvc),
		Delegations:   handler.NewDelegationsHandler(delegationsSvc),
		Notifications: handler.NewNotificationsHandler(notificationsSvc),
		Settings:      handler.NewSettingsHandler(settingsSvc),
		WS:            handler.NewWSHandler(liveBridge, firebaseAuth, cfg.CORSOrigins),
	}

	r := router.New(handlers, firebaseAuth, cfg.CORSOrigins)

	srv := &http.Server{
