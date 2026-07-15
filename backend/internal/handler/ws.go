package handler

import (
	"net/http"
	"strings"

	"github.com/gamp/butler/internal/gemini"
	"github.com/gamp/butler/internal/middleware"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

type WSHandler struct {
	liveBridge *gemini.LiveBridge
	auth       *middleware.FirebaseAuth
	origins    []string
}

func NewWSHandler(liveBridge *gemini.LiveBridge, auth *middleware.FirebaseAuth, corsOrigins []string) *WSHandler {
	return &WSHandler{
		liveBridge: liveBridge,
		auth:       auth,
		origins:    corsOrigins,
	}
}

func (h *WSHandler) Live(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		token = strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			token = ""
		}
	}
	if token == "" {
		http.Error(w, `{"error":"missing token"}`, http.StatusUnauthorized)
		return
