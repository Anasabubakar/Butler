package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gamp/butler/internal/middleware"
	"github.com/gamp/butler/internal/model"
	"github.com/gamp/butler/internal/service"
)

// NotesHandler handles REST endpoints for notes.
type NotesHandler struct {
	svc *service.NotesService
}

// NewNotesHandler creates a new NotesHandler.
func NewNotesHandler(svc *service.NotesService) *NotesHandler {
	return &NotesHandler{svc: svc}
}

// List handles GET /api/notes.
func (h *NotesHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	notes, err := h.svc.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, emptyJSONArray(notes))
}

// Create handles POST /api/notes.
func (h *NotesHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req model.CreateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	note, err := h.svc.Create(r.Context(), userID, req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, note)
}

// Update handles PUT /api/notes/{id}.
func (h *NotesHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	noteID := chi.URLParam(r, "id")

	var req model.UpdateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	note, err := h.svc.Update(r.Context(), userID, noteID, req)
	if err != nil {
		if err.Error() == "notes: permission denied" {
			writeError(w, http.StatusForbidden, "permission denied")
			return
		}
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, note)
}

// Delete handles DELETE /api/notes/{id}.
func (h *NotesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	noteID := chi.URLParam(r, "id")

	err := h.svc.Delete(r.Context(), userID, noteID)
	if err != nil {
		if err.Error() == "notes: permission denied" {
			writeError(w, http.StatusForbidden, "permission denied")
			return
		}
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
