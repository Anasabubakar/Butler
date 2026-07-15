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
