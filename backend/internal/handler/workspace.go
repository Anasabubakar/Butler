package handler

import (
	"net/http"

	"github.com/gamp/butler/internal/middleware"
	"github.com/gamp/butler/internal/service"
)

// WorkspaceHandler serves vaulted Google Workspace data.
type WorkspaceHandler struct {
	svc *service.WorkspaceService
}

func NewWorkspaceHandler(svc *service.WorkspaceService) *WorkspaceHandler {
	return &WorkspaceHandler{svc: svc}
}

// Brief handles GET /api/workspace/brief.
func (h *WorkspaceHandler) Brief(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	brief, err := h.svc.GetBrief(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load brief")
		return
	}
	writeJSON(w, http.StatusOK, brief)
}

// Sync handles POST /api/workspace/sync.
func (h *WorkspaceHandler) Sync(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	res, err := h.svc.Sync(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "sync failed")
		return
	}
	writeJSON(w, http.StatusOK, res)
}
