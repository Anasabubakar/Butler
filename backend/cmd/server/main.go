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

