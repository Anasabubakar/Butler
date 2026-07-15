package handler

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/gamp/butler/internal/middleware"
	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/service"
)

// IntegrationsHandler exposes the connector catalog and OAuth flows.
type IntegrationsHandler struct {
	svc *service.IntegrationsService
}

// NewIntegrationsHandler constructs the handler.
func NewIntegrationsHandler(svc *service.IntegrationsService) *IntegrationsHandler {
	return &IntegrationsHandler{svc: svc}
}

// List handles GET /api/integrations.
func (h *IntegrationsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	items, err := h.svc.ListCatalog(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load integrations")
		return
	}
	writeJSON(w, http.StatusOK, emptyJSONArray(items))
}

// Connect handles POST /api/integrations/{provider}/connect.
func (h *IntegrationsHandler) Connect(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	provider := strings.ToLower(chi.URLParam(r, "provider"))

	var body struct {
		RedirectTo string `json:"redirectTo"`
	}
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&body)

	res, err := h.svc.StartConnect(r.Context(), userID, provider, body.RedirectTo)
	if err != nil {
		if strings.Contains(err.Error(), "unknown") {
			writeError(w, http.StatusNotFound, "unknown provider")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to start connect")
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// Callback handles GET /api/integrations/callback/{provider} (unauthenticated; state is the auth).
func (h *IntegrationsHandler) Callback(w http.ResponseWriter, r *http.Request) {
	provider := strings.ToLower(chi.URLParam(r, "provider"))
	q := r.URL.Query()
	if errParam := q.Get("error"); errParam != "" {
		http.Redirect(w, r, h.svc.FrontendIntegrationsURL()+"?error="+url.QueryEscape(errParam), http.StatusFound)
		return
	}
	code := q.Get("code")
	state := q.Get("state")
	if code == "" || state == "" {
		writeError(w, http.StatusBadRequest, "missing code or state")
		return
	}

	redirectTo, err := h.svc.CompleteOAuth(r.Context(), provider, code, state)
	if err != nil {
		// Still redirect when possible so the SPA can show the error query.
		if redirectTo != "" {
			http.Redirect(w, r, redirectTo, http.StatusFound)
			return
		}
		writeError(w, http.StatusBadRequest, "oauth failed")
		return
	}
	http.Redirect(w, r, redirectTo, http.StatusFound)
}

// RegisterGoogle handles POST /api/integrations/google.
func (h *IntegrationsHandler) RegisterGoogle(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req model.RegisterGoogleRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	conn, err := h.svc.RegisterGoogle(r.Context(), userID, req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, conn)
}

// Disconnect handles DELETE /api/integrations/{provider}.
func (h *IntegrationsHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	provider := strings.ToLower(chi.URLParam(r, "provider"))
	if err := h.svc.Disconnect(r.Context(), userID, provider); err != nil {
		if strings.Contains(err.Error(), "unknown") {
			writeError(w, http.StatusNotFound, "unknown provider")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to disconnect")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
