package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gamp/butler/internal/middleware"
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

// List handles GET /api/delegations.
func (h *DelegationsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var statusFilter *string
	if s := r.URL.Query().Get("status"); s != "" {
		statusFilter = &s
	}

	delegations, err := h.svc.GetAll(r.Context(), userID, statusFilter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, emptyJSONArray(delegations))
}

// Approve handles POST /api/delegations/{id}/approve.
func (h *DelegationsHandler) Approve(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	d, err := h.svc.Approve(r.Context(), userID, id)
	if err != nil {
		if err.Error() == "delegations: permission denied" {
			writeError(w, http.StatusForbidden, "permission denied")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, d)
}

// Reject handles POST /api/delegations/{id}/reject.
func (h *DelegationsHandler) Reject(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	d, err := h.svc.Reject(r.Context(), userID, id)
	if err != nil {
		if err.Error() == "delegations: permission denied" {
			writeError(w, http.StatusForbidden, "permission denied")
			return
		}
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, d)
}
