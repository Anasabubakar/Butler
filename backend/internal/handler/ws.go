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
	}

	if _, err := h.auth.VerifyToken(r.Context(), token); err != nil {
		log.Warn().Err(err).Msg("ws: invalid token")
		http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
		return
	}

	upgrader := websocket.Upgrader{
		ReadBufferSize:  4096,
		WriteBufferSize: 4096,
		CheckOrigin: func(req *http.Request) bool {
			origin := req.Header.Get("Origin")
			if origin == "" {
				return true
			}
			for _, o := range h.origins {
				if strings.TrimSpace(o) == origin || strings.TrimSpace(o) == "*" {
					return true
				}
			}
			// Allow same-host local dev defaults.
			return strings.Contains(origin, "localhost") || strings.Contains(origin, "127.0.0.1")
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("ws: upgrade failed")
		return
	}
	defer conn.Close()

	if err := h.liveBridge.Connect(conn); err != nil {
		log.Error().Err(err).Msg("ws: live bridge error")
	}
}
