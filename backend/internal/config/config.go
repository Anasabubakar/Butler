package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port            string
	DatabaseURL     string
	GeminiAPIKey    string
	FirebaseProject string
	CORSOrigins     []string
	MigrationsPath  string
	// PublicAPIBase is the externally reachable backend origin (for OAuth callbacks).
	PublicAPIBase string
	// AppBaseURL is the frontend origin (post-OAuth redirect).
	AppBaseURL string
	// TokenEncryptionKey seals OAuth tokens at rest.
	TokenEncryptionKey string
	// EnableProactiveSync creates notifications/delegations from workspace data.
	EnableProactiveSync bool
	// ProactiveSyncIntervalMinutes runs a background ticker (0 = off).
	ProactiveSyncIntervalMinutes int
}

func Load() *Config {
	return &Config{
		Port:                         getEnv("PORT", "8080"),
		DatabaseURL:                  getEnv("DATABASE_URL", "postgres://localhost:5432/butler?sslmode=disable"),
		GeminiAPIKey:                 getEnv("GEMINI_API_KEY", ""),
		FirebaseProject:              getEnv("FIREBASE_PROJECT_ID", ""),
		CORSOrigins:                  strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		MigrationsPath:               getEnv("MIGRATIONS_PATH", "migrations"),
		PublicAPIBase:                getEnv("PUBLIC_API_BASE", getEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080")),
		AppBaseURL:                   getEnv("APP_BASE_URL", "http://localhost:3000"),
		TokenEncryptionKey:           getEnv("TOKEN_ENCRYPTION_KEY", ""),
		EnableProactiveSync:          getEnvBool("ENABLE_PROACTIVE_SYNC", true),
		ProactiveSyncIntervalMinutes: getEnvInt("PROACTIVE_SYNC_INTERVAL_MINUTES", 0),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return b
}

func getEnvInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
