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
	tokencrypto "github.com/gamp/butler/internal/crypto"
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
	connectionsRepo := repository.NewPgConnectionsRepository(pool)

	tokenKey := cfg.TokenEncryptionKey
	if tokenKey == "" {
		// Dev fallback — still encrypts, but not a secret. Set TOKEN_ENCRYPTION_KEY in production.
		tokenKey = "butler-dev-token-key:" + cfg.FirebaseProject
		log.Warn().Msg("TOKEN_ENCRYPTION_KEY unset; using derived development key")
	}
	vault, err := tokencrypto.NewTokenVault(tokenKey)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to initialize token vault")
	}

	geminiClient := gemini.NewClient(cfg.GeminiAPIKey)
	liveBridge := gemini.NewLiveBridge(cfg.GeminiAPIKey)

	notesSvc := service.NewNotesService(notesRepo)
	delegationsSvc := service.NewDelegationsService(delegationsRepo)
	notificationsSvc := service.NewNotificationsService(notificationsRepo)
	settingsSvc := service.NewSettingsService(settingsRepo)
	integrationsSvc := service.NewIntegrationsService(connectionsRepo, vault, cfg.PublicAPIBase, cfg.AppBaseURL)
	workspaceSvc := service.NewWorkspaceService(
		connectionsRepo, notificationsRepo, delegationsRepo, vault, cfg.EnableProactiveSync,
	)
	chatSvc := service.NewChatService(geminiClient, chatRepo, workspaceSvc, notesSvc, delegationsSvc)

	handlers := router.Handlers{
		Butler:        handler.NewButlerHandler(chatSvc),
		Notes:         handler.NewNotesHandler(notesSvc),
		Delegations:   handler.NewDelegationsHandler(delegationsSvc),
		Notifications: handler.NewNotificationsHandler(notificationsSvc),
		Settings:      handler.NewSettingsHandler(settingsSvc),
		Integrations:  handler.NewIntegrationsHandler(integrationsSvc),
		Workspace:     handler.NewWorkspaceHandler(workspaceSvc),
		Webhooks:      handler.NewWebhooksHandler(),
		WS:            handler.NewWSHandler(liveBridge, firebaseAuth, cfg.CORSOrigins),
	}

	r := router.New(handlers, firebaseAuth, cfg.CORSOrigins)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Info().Str("port", cfg.Port).Msg("server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down server")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal().Err(err).Msg("server forced shutdown")
	}

	log.Info().Msg("server stopped")
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	if dir == "" {
		dir = "migrations"
	}

	// Support both a directory of *.sql and a single file path for backwards compatibility.
	info, err := os.Stat(dir)
	if err != nil {
		// Try relative to executable working directory fallbacks.
		candidates := []string{dir, filepath.Join("backend", dir), "migrations"}
		found := false
		for _, c := range candidates {
			if _, e := os.Stat(c); e == nil {
				dir = c
				info, err = os.Stat(dir)
				found = err == nil
				if found {
					break
				}
			}
		}
		if !found {
			return fmt.Errorf("migrations path %q not found", dir)
		}
	}

	// Track applied files so restarts never re-run (and never fail on existing objects).
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	var files []string
	if info.IsDir() {
		entries, err := os.ReadDir(dir)
		if err != nil {
			return err
		}
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
				files = append(files, filepath.Join(dir, e.Name()))
			}
		}
		sort.Strings(files)
	} else {
		files = []string{dir}
	}

	if len(files) == 0 {
		log.Warn().Str("dir", dir).Msg("no migration files found")
		return nil
	}

	for _, f := range files {
		name := filepath.Base(f)
		var exists bool
		if err := pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`, name,
		).Scan(&exists); err != nil {
			return fmt.Errorf("check migration %s: %w", name, err)
		}
		if exists {
			log.Info().Str("file", name).Msg("migration already applied")
			continue
		}

		sqlBytes, err := os.ReadFile(f)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", f, err)
		}
		if _, err := pool.Exec(ctx, string(sqlBytes)); err != nil {
			// Idempotent SQL should not fail; if it does on a first run, surface it.
			// If objects already exist from a pre-tracking deploy, mark applied and continue.
			msg := err.Error()
			if strings.Contains(msg, "already exists") {
				log.Warn().Str("file", name).Err(err).Msg("migration objects already exist; recording as applied")
			} else {
				return fmt.Errorf("apply migration %s: %w", f, err)
			}
		}
		if _, err := pool.Exec(ctx,
			`INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`, name,
		); err != nil {
			return fmt.Errorf("record migration %s: %w", name, err)
		}
		log.Info().Str("file", name).Msg("migration applied")
	}
	return nil
}
