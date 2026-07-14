package handler

import (
	"net/http"

	"github.com/gamp/butler/internal/gemini"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSHandler struct {
	liveBridge *gemini.LiveBridge
}

func NewWSHandler(liveBridge *gemini.LiveBridge) *WSHandler {
	return &WSHandler{liveBridge: liveBridge}
}

func (h *WSHandler) Live(w http.ResponseWriter, r *http.Request) {
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
