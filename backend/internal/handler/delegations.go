package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/gamp/butler/internal/middleware"
	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/service"
)

// DelegationsHandler handles REST endpoints for delegations.
type DelegationsHandler struct {
	svc *service.DelegationsService
}

// NewDelegationsHandler creates a new DelegationsHandler.
func NewDelegationsHandler(svc *service.DelegationsService) *DelegationsHandler {
	return &DelegationsHandler{svc: svc}
}

// Create handles POST /api/delegations.
func (h *DelegationsHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
