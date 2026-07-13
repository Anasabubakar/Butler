import express from "express";
import path from "path";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, ThinkingLevel, Modality, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const server = createServer(app);

// Configure body parser with high limits for base64 uploads (images, audio, videos)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize GoogleGenAI server-side with telemetry agent header
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Endpoint: Multi-turn Chat with Butler
app.post("/api/butler/chat", async (req, res) => {
  try {
    const { messages, mode, userLocation } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages payload" });
    }

    // Map roles to GoogleGenAI expected format
    const contents = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    // Personality system instruction
    const systemInstruction = 
      "You are Butler, the ultimate Digital Chief of Staff. You ALWAYS address the user as 'Boss' (e.g., 'Good morning, Boss', 'Done, Boss', 'Already handled, Boss'). " +
      "Your personality is highly intelligent, calm, confident, respectful, warm, professional, and proactive. " +
      "You are never robotic or overly casual. You observe, anticipate conflicts, recommend precise actions, and protect the user's time. " +
      "If Nigeria locations are mentioned, understand transit terms: Danfo (minibus), BRT (bus rapid transit), Korope (shuttle bus), Maruwa/Keke (tricycle), Okada (motorcycle), and suggest travel options accordingly with practical local context. " +
      "Please write structured, elegant markdown responses with bullet points, dividers, or bold highlights to make reading quick and effortless for Boss.";

    let modelName = "gemini-3.5-flash";
    const config: any = {
      systemInstruction,
    };

    if (mode === "low-latency") {
      modelName = "gemini-3.1-flash-lite";
    } else if (mode === "thinking") {
      modelName = "gemini-3.1-pro-preview";
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (mode === "search") {
      modelName = "gemini-3.5-flash";
      config.tools = [{ googleSearch: {} }];
    } else if (mode === "maps") {
      modelName = "gemini-3.5-flash";
      config.tools = [{ googleMaps: {} }];
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            }
          }
        };
      }
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => {
      if (chunk.web) {
        return { title: chunk.web.title || "Web Source", uri: chunk.web.uri };
      } else if (chunk.maps) {
        return { title: chunk.maps.title || "Maps Location", uri: chunk.maps.uri };
      }
      return null;
    }).filter(Boolean) || [];

    res.json({
      text: response.text || "I was unable to formulate a response, Boss.",
      groundingSources
    });
  } catch (error: any) {
    console.error("Butler chat error:", error);
    res.status(500).json({ error: error.message || "An internal error occurred, Boss." });
  }
});

// Endpoint: Audio Transcription
app.post("/api/butler/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audio base64 data" });
    }

    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType: mimeType || "audio/webm"
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        audioPart,
        { text: "Transcribe the audio accurately. Return only the plain transcription, without any preamble or conversational additions." }
      ]
    });

    res.json({ transcription: response.text?.trim() || "" });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "Unable to transcribe audio, Boss." });
  }
});

// Endpoint: Image and Video Analysis
app.post("/api/butler/analyze", async (req, res) => {
  try {
    const { fileBase64, mimeType, prompt } = req.body;
    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing file content or mimeType" });
    }

    const mediaPart = {
      inlineData: {
        data: fileBase64,
        mimeType
      }
    };

    const isVideo = mimeType.startsWith("video/");
    const instruction = isVideo 
      ? "You are analyzing a video for Boss. Provide a detailed summary of key events, timelines, and important visual cues."
      : "You are analyzing an image for Boss. Inspect the contents carefully, point out interesting elements, transcribe any text visible, and answer the prompt directly.";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        mediaPart,
        { text: `${instruction}\n\nBoss's Query: ${prompt || "What is shown here?"}` }
      ]
    });

    res.json({ analysis: response.text || "I completed the analysis, Boss, but found no notable content." });
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: error.message || "Unable to analyze the uploaded media, Boss." });
  }
});

// WebSocket Server for Live API Bridge
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", async (clientWs) => {
  console.log("Live API connection established with client");
  let liveSession: any = null;

  try {
    liveSession = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: "You are Butler, the elite Digital Chief of Staff. You address the user as 'Boss'. Respond in character with a helpful, calm, professional voice.",
      },
      callbacks: {
        onmessage: (message) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
      },
    });

    clientWs.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && liveSession) {
          liveSession.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" }
          });
        }
      } catch (err) {
        console.error("Live API WS parse error:", err);
      }
    });

    clientWs.on("close", () => {
      console.log("Client closed Live connection");
      if (liveSession) {
        liveSession.close();
      }
    });
  } catch (error) {
    console.error("Failed to connect to Gemini Live:", error);
    clientWs.send(JSON.stringify({ error: "Could not initialize Live Session, Boss." }));
    clientWs.close();
  }
});

// Route WebSocket upgrades
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/ws/live") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    // Let other upgrades pass through (or destroy if unrelated)
  }
});

// Vite Dev Server / Static Asset setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Butler server is active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
