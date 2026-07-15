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

	var req model.CreateDelegationRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Service) == "" {
		writeError(w, http.StatusBadRequest, "title and service are required")
		return
	}
	if req.Tone == "" {
		req.Tone = "accent"
	}
	if req.ToneLabel == "" {
		req.ToneLabel = "draft"
	}

	d, err := h.svc.Create(r.Context(), userID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create delegation")
		return
	}
	writeJSON(w, http.StatusCreated, d)
}

// List handles GET /api/delegations.
