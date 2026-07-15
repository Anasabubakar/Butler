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
