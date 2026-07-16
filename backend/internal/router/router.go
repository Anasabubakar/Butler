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
	Integrations  *handler.IntegrationsHandler
	Workspace     *handler.WorkspaceHandler
	Webhooks      *handler.WebhooksHandler
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

	// WebSocket endpoint (token query param / header verified inside handler).
	r.Get("/ws/live", h.WS.Live)

	// OAuth provider callbacks (authenticated via short-lived state, not Firebase).
	r.Get("/api/integrations/callback/{provider}", h.Integrations.Callback)

	// Provider webhooks / interactions (no Firebase auth — verified via signing secrets).
	if h.Webhooks != nil {
		r.Post("/api/webhooks/linear", h.Webhooks.Linear)
		r.Post("/api/webhooks/slack", h.Webhooks.Slack)
		// Discord Interactions Endpoint URL (verification PING + interactions)
		r.Post("/api/webhooks/discord", h.Webhooks.Discord)
		r.Post("/api/integrations/discord/interactions", h.Webhooks.Discord)
	}

	r.Route("/api", func(api chi.Router) {
		api.Use(auth.Middleware)

		api.Route("/butler", func(butler chi.Router) {
			butler.Post("/chat", h.Butler.Chat)
			butler.Post("/transcribe", h.Butler.Transcribe)
			butler.Post("/analyze", h.Butler.Analyze)
			butler.Get("/threads", h.Butler.ListThreads)
			butler.Get("/threads/{id}/messages", h.Butler.ListMessages)
		})

		api.Route("/notes", func(notes chi.Router) {
			notes.Get("/", h.Notes.List)
			notes.Post("/", h.Notes.Create)
			notes.Put("/{id}", h.Notes.Update)
			notes.Delete("/{id}", h.Notes.Delete)
		})

		api.Route("/delegations", func(del chi.Router) {
			del.Get("/", h.Delegations.List)
			del.Post("/", h.Delegations.Create)
			del.Post("/{id}/approve", h.Delegations.Approve)
			del.Post("/{id}/reject", h.Delegations.Reject)
		})

		api.Route("/notifications", func(notif chi.Router) {
			notif.Get("/", h.Notifications.List)
			notif.Post("/{id}/read", h.Notifications.MarkRead)
			notif.Post("/read-all", h.Notifications.MarkAllRead)
		})

		api.Route("/settings", func(s chi.Router) {
			s.Get("/", h.Settings.Get)
			s.Put("/", h.Settings.Update)
		})

		api.Route("/integrations", func(intg chi.Router) {
			intg.Get("/", h.Integrations.List)
			intg.Post("/google", h.Integrations.RegisterGoogle)
			intg.Post("/{provider}/connect", h.Integrations.Connect)
			intg.Delete("/{provider}", h.Integrations.Disconnect)
		})

		api.Route("/workspace", func(ws chi.Router) {
			ws.Get("/brief", h.Workspace.Brief)
			ws.Post("/sync", h.Workspace.Sync)
			ws.Post("/tasks", h.Workspace.CreateTask)
			ws.Post("/tasks/complete", h.Workspace.CompleteTask)
		})
	})

	return r
}
