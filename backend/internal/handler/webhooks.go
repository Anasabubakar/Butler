package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/rs/zerolog/log"
)

// WebhooksHandler receives provider webhooks (Linear, Slack, etc.).
type WebhooksHandler struct{}

func NewWebhooksHandler() *WebhooksHandler {
	return &WebhooksHandler{}
}

// Linear handles POST /api/webhooks/linear
// Configure Linear webhook URL to: {PUBLIC_API_BASE}/api/webhooks/linear
// (not the frontend host).
func (h *WebhooksHandler) Linear(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	secret := strings.TrimSpace(os.Getenv("LINEAR_WEBHOOK_SECRET"))
	if secret != "" {
		sig := r.Header.Get("Linear-Signature")
		if sig == "" {
			// Some Linear deliveries use a different header name.
			sig = r.Header.Get("X-Linear-Signature")
		}
		if !validLinearSignature(secret, body, sig) {
			log.Warn().Msg("linear webhook: invalid signature")
			writeError(w, http.StatusUnauthorized, "invalid signature")
			return
		}
	}

	log.Info().Int("bytes", len(body)).Msg("linear webhook received")
	// Ack immediately — processing can expand later into notifications/delegations.
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

func validLinearSignature(secret string, body []byte, signature string) bool {
	if signature == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(strings.ToLower(expected)), []byte(strings.ToLower(signature)))
}

// Slack handles POST /api/webhooks/slack (events / slash — optional signing secret).
func (h *WebhooksHandler) Slack(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	// URL verification challenge for Slack Events API
	if strings.Contains(string(body), `"type":"url_verification"`) {
		// Pass through challenge field if present
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(body)
		return
	}
	log.Info().Int("bytes", len(body)).Msg("slack webhook received")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}
