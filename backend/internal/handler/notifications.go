package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/gamp/butler/internal/middleware"
	"github.com/gamp/butler/internal/service"
)

type NotificationsHandler struct {
	svc *service.NotificationsService
}

func NewNotificationsHandler(svc *service.NotificationsService) *NotificationsHandler {
	return &NotificationsHandler{svc: svc}
}

func (h *NotificationsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var sourceFilter *string
	if s := r.URL.Query().Get("source"); s != "" {
		sourceFilter = &s
	}

	notifications, err := h.svc.GetAll(r.Context(), userID, sourceFilter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, emptyJSONArray(notifications))
}

func (h *NotificationsHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id := chi.URLParam(r, "id")

	if err := h.svc.MarkRead(r.Context(), userID, id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *NotificationsHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if err := h.svc.MarkAllRead(r.Context(), userID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
