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
