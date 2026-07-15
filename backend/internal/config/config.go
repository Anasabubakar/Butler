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
}

func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://localhost:5432/butler?sslmode=disable"),
		GeminiAPIKey:    getEnv("GEMINI_API_KEY", ""),
		FirebaseProject: getEnv("FIREBASE_PROJECT_ID", ""),
		CORSOrigins:     strings.Split(getEnv("CORS_ORIGINS", "http://localhost:3000"), ","),
		MigrationsPath:  getEnv("MIGRATIONS_PATH", "migrations"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
