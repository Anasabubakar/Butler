package config

import (
	"os"
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
}

func Load() *Config {
	return &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://localhost:5432/butler?sslmode=disable"),
		GeminiAPIKey:       getEnv("GEMINI_API_KEY", ""),
		FirebaseProject:    getEnv("FIREBASE_PROJECT_ID", ""),
		CORSOrigins:        strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		MigrationsPath:     getEnv("MIGRATIONS_PATH", "migrations"),
		PublicAPIBase:      getEnv("PUBLIC_API_BASE", getEnv("NEXT_PUBLIC_API_URL", "http://localhost:8080")),
		AppBaseURL:         getEnv("APP_BASE_URL", "http://localhost:3000"),
		TokenEncryptionKey: getEnv("TOKEN_ENCRYPTION_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
