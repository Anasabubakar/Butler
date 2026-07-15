package router

import (
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/gamp/butler/internal/handler"
	"github.com/gamp/butler/internal/middleware"
)

type Handlers struct {
	Butler        *handler.ButlerHandler
	Notes         *handler.NotesHandler
	Delegations   *handler.DelegationsHandler
	Notifications *handler.NotificationsHandler
	Settings      *handler.SettingsHandler
	WS            *handler.WSHandler
}

func New(h Handlers, auth *middleware.FirebaseAuth, corsOrigins []string) chi.Router {
	r := chi.NewRouter()

	r.Use(chimiddleware.RealIP)
	r.Use(middleware.PanicRecovery)
	r.Use(middleware.RequestLogger)
	r.Use(middleware.SecurityHeaders)
	r.Use(chimiddleware.Compress(5))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", handler.HealthCheck)

	// WebSocket endpoint (no auth — token sent in-band).
	r.Get("/ws/live", h.WS.Live)
