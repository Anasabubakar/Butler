package gemini

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

const (
	liveWSURL   = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
	liveModel   = "models/gemini-3.1-flash-live-preview"
	liveVoice   = "Zephyr"
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

type realtimeInput struct {
	MediaChunks []mediaChunk `json:"mediaChunks"`
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
				Parts: []geminiPart{{Text: butlerSystemInstruction}},
			},
		},
	}

	if err := geminiConn.WriteJSON(setup); err != nil {
		return fmt.Errorf("gemini live: send setup: %w", err)
	}

	var wg sync.WaitGroup
	done := make(chan struct{})

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

			input := realtimeInputMessage{
				RealtimeInput: realtimeInput{
					MediaChunks: []mediaChunk{
						{
							MIMEType: "audio/pcm;rate=16000",
							Data:     msg.Audio,
						},
					},
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

			// Handle serverContent responses.
			if serverContentRaw, ok := envelope["serverContent"]; ok {
				lb.handleServerContent(clientConn, serverContentRaw)
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
					Data string `json:"data"`
				} `json:"inlineData,omitempty"`
			} `json:"parts"`
		} `json:"modelTurn,omitempty"`
		TurnComplete bool `json:"turnComplete,omitempty"`
		Interrupted  bool `json:"interrupted,omitempty"`
	}

	if err := json.Unmarshal(raw, &sc); err != nil {
		log.Error().Err(err).Msg("gemini live: unmarshal serverContent")
		return
	}

	// Forward audio data from model turn.
	if sc.ModelTurn != nil {
		for _, part := range sc.ModelTurn.Parts {
			if part.InlineData != nil && part.InlineData.Data != "" {
				resp := clientResponse{Audio: part.InlineData.Data}
				if err := clientConn.WriteJSON(resp); err != nil {
					log.Error().Err(err).Msg("gemini live: write audio to client")
					return
				}
			}
		}
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
