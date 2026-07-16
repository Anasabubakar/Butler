package handler

import (
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/rs/zerolog/log"
)

// WebhooksHandler receives provider webhooks (Linear, Slack, Discord, etc.).
type WebhooksHandler struct{}

func NewWebhooksHandler() *WebhooksHandler {
	return &WebhooksHandler{}
}

// Linear handles POST /api/webhooks/linear
// Configure Linear webhook URL to: {PUBLIC_API_BASE}/api/webhooks/linear
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
			sig = r.Header.Get("X-Linear-Signature")
		}
		if !validLinearSignature(secret, body, sig) {
			log.Warn().Msg("linear webhook: invalid signature")
			writeError(w, http.StatusUnauthorized, "invalid signature")
			return
		}
	}

	log.Info().Int("bytes", len(body)).Msg("linear webhook received")
	w.Header().Set("Content-Type", "application/json")
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

// Slack handles POST /api/webhooks/slack (Events API URL verification).
func (h *WebhooksHandler) Slack(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if strings.Contains(string(body), `"type":"url_verification"`) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(body)
		return
	}
	log.Info().Int("bytes", len(body)).Msg("slack webhook received")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"ok":true}`))
}

// Discord handles POST /api/webhooks/discord
// Use this as Discord "Interactions Endpoint URL" so Discord can verify the endpoint.
// Requires DISCORD_PUBLIC_KEY (hex) from the Discord Developer Portal.
// Docs: https://discord.com/developers/docs/interactions/receiving-and-responding
func (h *WebhooksHandler) Discord(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 2<<20))
	if err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	pubHex := strings.TrimSpace(os.Getenv("DISCORD_PUBLIC_KEY"))
	if pubHex == "" {
		log.Error().Msg("discord webhook: DISCORD_PUBLIC_KEY not set")
		http.Error(w, "discord public key not configured", http.StatusInternalServerError)
		return
	}

	sig := r.Header.Get("X-Signature-Ed25519")
	ts := r.Header.Get("X-Signature-Timestamp")
	if !verifyDiscordSignature(pubHex, ts, body, sig) {
		log.Warn().Msg("discord webhook: invalid signature")
		// Discord requires 401 on bad signature during verification.
		http.Error(w, "invalid request signature", http.StatusUnauthorized)
		return
	}

	var payload struct {
		Type int `json:"type"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Type 1 = PING (endpoint verification)
	if payload.Type == 1 {
		log.Info().Msg("discord interactions: PING verified")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"type":1}`))
		return
	}

	// Other interaction types — acknowledge with an ephemeral message for now.
	log.Info().Int("type", payload.Type).Msg("discord interaction received")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"type":4,"data":{"content":"Butler received this, Boss.","flags":64}}`))
}

func verifyDiscordSignature(publicKeyHex, timestamp string, body []byte, signatureHex string) bool {
	if publicKeyHex == "" || timestamp == "" || signatureHex == "" {
		return false
	}
	pub, err := hex.DecodeString(publicKeyHex)
	if err != nil || len(pub) != ed25519.PublicKeySize {
		return false
	}
	sig, err := hex.DecodeString(signatureHex)
	if err != nil || len(sig) != ed25519.SignatureSize {
		return false
	}
	msg := append([]byte(timestamp), body...)
	return ed25519.Verify(ed25519.PublicKey(pub), msg, sig)
}
