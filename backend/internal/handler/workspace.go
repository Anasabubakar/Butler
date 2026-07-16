package handler

import (
	"encoding/json"
	"net/http"
	"strings"

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

type createTaskBody struct {
	Title string `json:"title"`
	Notes string `json:"notes,omitempty"`
	Due   string `json:"due,omitempty"`
}

// CreateTask handles POST /api/workspace/tasks.
func (h *WorkspaceHandler) CreateTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var body createTaskBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if strings.TrimSpace(body.Title) == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	t, err := h.svc.CreateTask(r.Context(), userID, strings.TrimSpace(body.Title), body.Notes, body.Due)
	if err != nil {
		if strings.Contains(err.Error(), "not connected") {
			writeError(w, http.StatusBadRequest, "Google Workspace not connected")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

// CompleteTask handles POST /api/workspace/tasks/complete with body { "id": "list:task" }.
func (h *WorkspaceHandler) CompleteTask(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var body struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&body); err != nil || strings.TrimSpace(body.ID) == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}
	if err := h.svc.CompleteTask(r.Context(), userID, body.ID); err != nil {
		if strings.Contains(err.Error(), "not connected") {
			writeError(w, http.StatusBadRequest, "Google Workspace not connected")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": body.ID})
}
