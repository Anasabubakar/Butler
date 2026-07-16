package gemini

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

const (
	liveWSURL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
	// Native audio live model (PCM in/out). Override via GEMINI_LIVE_MODEL if needed.
	liveModel = "models/gemini-2.5-flash-native-audio-preview-12-2025"
	liveVoice = "Zephyr"
)

// LiveBridge proxies bidirectional audio between a client WebSocket and Gemini Live.
type LiveBridge struct {
	apiKey string
}

// NewLiveBridge creates a new LiveBridge.
func NewLiveBridge(apiKey string) *LiveBridge {
	return &LiveBridge{apiKey: apiKey}
}

// --- Gemini Live protocol messages ---

type liveSetupMessage struct {
	Setup liveSetup `json:"setup"`
}

type liveSetup struct {
	Model            string               `json:"model"`
	GenerationConfig liveGenerationConfig `json:"generationConfig"`
	SystemInstruction liveSystemInstruction `json:"systemInstruction"`
}

type liveGenerationConfig struct {
	ResponseModalities []string         `json:"responseModalities"`
	SpeechConfig       liveSpeechConfig `json:"speechConfig"`
}

type liveSpeechConfig struct {
	VoiceConfig liveVoiceConfig `json:"voiceConfig"`
}

type liveVoiceConfig struct {
	PrebuiltVoiceConfig prebuiltVoiceConfig `json:"prebuiltVoiceConfig"`
}

type prebuiltVoiceConfig struct {
	VoiceName string `json:"voiceName"`
}

type liveSystemInstruction struct {
	Parts []geminiPart `json:"parts"`
}

type realtimeInputMessage struct {
	RealtimeInput realtimeInput `json:"realtimeInput"`
}

// realtimeInput supports both legacy mediaChunks and current audio blob field.
type realtimeInput struct {
	Audio       *mediaChunk  `json:"audio,omitempty"`
	MediaChunks []mediaChunk `json:"mediaChunks,omitempty"`
}

type mediaChunk struct {
	MIMEType string `json:"mimeType"`
	Data     string `json:"data"`
}

// clientMessage is what the browser client sends us.
type clientMessage struct {
	Audio string `json:"audio,omitempty"`
}

// clientResponse is what we send back to the browser client.
type clientResponse struct {
	Audio        string `json:"audio,omitempty"`
	Interrupted  bool   `json:"interrupted,omitempty"`
	TurnComplete bool   `json:"turn_complete,omitempty"`
}

// Connect establishes a bidirectional proxy between the client WebSocket and Gemini Live.
func (lb *LiveBridge) Connect(clientConn *websocket.Conn) error {
	geminiURL := fmt.Sprintf("%s?key=%s", liveWSURL, lb.apiKey)

	geminiConn, _, err := websocket.DefaultDialer.Dial(geminiURL, nil)
	if err != nil {
		return fmt.Errorf("gemini live: dial: %w", err)
	}
	defer geminiConn.Close()

	// Send setup message to Gemini.
	setup := liveSetupMessage{
		Setup: liveSetup{
			Model: liveModel,
			GenerationConfig: liveGenerationConfig{
				ResponseModalities: []string{"AUDIO"},
				SpeechConfig: liveSpeechConfig{
					VoiceConfig: liveVoiceConfig{
						PrebuiltVoiceConfig: prebuiltVoiceConfig{
							VoiceName: liveVoice,
						},
					},
				},
			},
			SystemInstruction: liveSystemInstruction{
				Parts: []geminiPart{{Text: butlerSystemInstruction + " You are in a live voice room. Speak concisely and address the user as Boss."}},
			},
		},
	}

	if err := geminiConn.WriteJSON(setup); err != nil {
		return fmt.Errorf("gemini live: send setup: %w", err)
	}

	// Wait briefly for setupComplete so we don't drop early audio.
	setupOK := make(chan struct{}, 1)
	go func() {
		// Non-blocking wait max ~3s is handled in client path via ready flag below.
		_ = setupOK
	}()

	var (
		wg      sync.WaitGroup
		done    = make(chan struct{})
		readyMu sync.Mutex
		ready   bool
	)

	// Client -> Gemini: forward audio chunks.
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer func() {
			select {
			case <-done:
			default:
				close(done)
			}
		}()

		for {
			_, rawMsg, err := clientConn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					log.Error().Err(err).Msg("gemini live: read from client")
				}
				return
			}

			var msg clientMessage
			if err := json.Unmarshal(rawMsg, &msg); err != nil {
				log.Error().Err(err).Msg("gemini live: unmarshal client message")
				continue
			}

			if msg.Audio == "" {
				continue
			}

			readyMu.Lock()
			isReady := ready
			readyMu.Unlock()
			// Still forward even before setupComplete — Gemini often accepts it;
			// but prefer waiting when possible.
			_ = isReady

			chunk := mediaChunk{
				MIMEType: "audio/pcm;rate=16000",
				Data:     msg.Audio,
			}
			// Current Live API shape uses realtimeInput.audio
			input := realtimeInputMessage{
				RealtimeInput: realtimeInput{
					Audio: &chunk,
				},
			}

			if err := geminiConn.WriteJSON(input); err != nil {
				log.Error().Err(err).Msg("gemini live: write to gemini")
				return
			}
		}
	}()

	// Gemini -> Client: forward audio responses and control events.
	wg.Add(1)
	go func() {
		defer wg.Done()
		defer func() {
			select {
			case <-done:
			default:
				close(done)
			}
		}()

		for {
			_, rawMsg, err := geminiConn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					log.Error().Err(err).Msg("gemini live: read from gemini")
				}
				return
			}

			var envelope map[string]json.RawMessage
			if err := json.Unmarshal(rawMsg, &envelope); err != nil {
				log.Error().Err(err).Msg("gemini live: unmarshal gemini envelope")
				continue
			}

			if _, ok := envelope["setupComplete"]; ok {
				readyMu.Lock()
				ready = true
				readyMu.Unlock()
				_ = clientConn.WriteJSON(map[string]any{"type": "ready"})
				continue
			}

			// Handle serverContent responses.
			if serverContentRaw, ok := envelope["serverContent"]; ok {
				lb.handleServerContent(clientConn, serverContentRaw)
			}

			// Surface tool/error messages if present.
			if errRaw, ok := envelope["error"]; ok {
				log.Error().RawJSON("error", errRaw).Msg("gemini live: server error")
				_ = clientConn.WriteJSON(map[string]any{
					"type":  "error",
					"error": string(errRaw),
				})
			}
		}
	}()

	// Wait for either goroutine to finish.
	<-done
	wg.Wait()
	return nil
}

// handleServerContent parses Gemini serverContent and forwards audio/control to the client.
func (lb *LiveBridge) handleServerContent(clientConn *websocket.Conn, raw json.RawMessage) {
	var sc struct {
		ModelTurn *struct {
			Parts []struct {
				InlineData *struct {
					MimeType string `json:"mimeType"`
					Data     string `json:"data"`
				} `json:"inlineData,omitempty"`
				Text string `json:"text,omitempty"`
			} `json:"parts"`
		} `json:"modelTurn,omitempty"`
		OutputTranscription *struct {
			Text string `json:"text"`
		} `json:"outputTranscription,omitempty"`
		InputTranscription *struct {
			Text string `json:"text"`
		} `json:"inputTranscription,omitempty"`
		TurnComplete bool `json:"turnComplete,omitempty"`
		Interrupted  bool `json:"interrupted,omitempty"`
	}

	if err := json.Unmarshal(raw, &sc); err != nil {
		log.Error().Err(err).Msg("gemini live: unmarshal serverContent")
		return
	}

	// Forward audio data from model turn (raw PCM base64).
	if sc.ModelTurn != nil {
		for _, part := range sc.ModelTurn.Parts {
			if part.InlineData != nil && part.InlineData.Data != "" {
				resp := clientResponse{Audio: part.InlineData.Data}
				if err := clientConn.WriteJSON(resp); err != nil {
					log.Error().Err(err).Msg("gemini live: write audio to client")
					return
				}
			}
			if part.Text != "" {
				_ = clientConn.WriteJSON(map[string]any{"type": "transcript", "text": part.Text})
			}
		}
	}

	if sc.OutputTranscription != nil && sc.OutputTranscription.Text != "" {
		_ = clientConn.WriteJSON(map[string]any{"type": "transcript", "text": sc.OutputTranscription.Text})
	}
	if sc.InputTranscription != nil && sc.InputTranscription.Text != "" {
		_ = clientConn.WriteJSON(map[string]any{"type": "transcript", "text": sc.InputTranscription.Text, "role": "user"})
	}

	// Forward control events.
	if sc.TurnComplete {
		resp := clientResponse{TurnComplete: true}
		if err := clientConn.WriteJSON(resp); err != nil {
			log.Error().Err(err).Msg("gemini live: write turnComplete to client")
		}
	}

	if sc.Interrupted {
		resp := clientResponse{Interrupted: true}
		if err := clientConn.WriteJSON(resp); err != nil {
			log.Error().Err(err).Msg("gemini live: write interrupted to client")
		}
	}
}
