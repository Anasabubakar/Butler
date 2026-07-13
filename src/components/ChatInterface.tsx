import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Sparkles, 
  Mic, 
  MicOff,
  Image as ImageIcon, 
  Video as VideoIcon,
  Search, 
  MapPin, 
  Brain,
  Zap,
  Paperclip,
  Trash2,
  FileText,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import Markdown from "react-markdown";
import { Message } from "../types";

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("butler_chat_history");
    return saved ? JSON.parse(saved) : [
      {
        id: "welcome",
        role: "model",
        text: "Good day, Boss. I am Butler, your Digital Chief of Staff. I have initialized all secure pipelines and synchronized your active workspace.\n\nHow can I help you manage your day, compose communications, or execute tasks today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"general" | "thinking" | "search" | "maps" | "low-latency">("general");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // File Attachment State
  const [attachedFile, setAttachedFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("butler_chat_history", JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle Text Send
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    const userText = input.trim();
    const tempFile = attachedFile;
    
    // Clear inputs immediately
    setInput("");
    setAttachedFile(null);

    const userMessageId = Math.random().toString();
    const userMsg: Message = {
      id: userMessageId,
      role: "user",
      text: tempFile ? `[Attached: ${tempFile.name}] ${userText || "Analyze this upload."}` : userText,
      mode: mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    // Append model placeholder
    const modelPlaceholderId = "placeholder-" + Math.random();
    setMessages(prev => [...prev, {
      id: modelPlaceholderId,
      role: "model",
      text: "",
      timestamp: "",
      isThinking: true
    }]);

    try {
      let responseText = "";
      let groundingSources: any[] = [];

      // Determine user current location if using maps grounding
      let userLocation: any = null;
      if (mode === "maps") {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          userLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
        } catch (err) {
          console.warn("Could not retrieve user geolocation for maps grounding:", err);
          // Fallback to Lagos, Nigeria
          userLocation = { latitude: 6.5244, longitude: 3.3792 };
        }
      }

      if (tempFile) {
        // Use media analysis endpoint
        const response = await fetch("/api/butler/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: tempFile.base64,
            mimeType: tempFile.mimeType,
            prompt: userText || "What is shown here, Boss?"
          })
        });
        const data = await response.json();
        responseText = data.analysis;
      } else {
        // Standard chat pipeline
        // Map messages history to a clean text list for multi-turn model
        const history = messages
          .filter(m => m.id !== "welcome" && !m.isThinking)
          .concat(userMsg)
          .map(m => ({
            role: m.role,
            text: m.text
          }));

        const response = await fetch("/api/butler/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            mode,
            userLocation
          })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        responseText = data.text;
        groundingSources = data.groundingSources || [];
      }

      setMessages(prev => prev.map(m => {
        if (m.id === modelPlaceholderId) {
          return {
            id: Math.random().toString(),
            role: "model",
            text: responseText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            groundingSources
          };
        }
        return m;
      }));

    } catch (error: any) {
      console.error("Chat sending failed:", error);
      setMessages(prev => prev.map(m => {
        if (m.id === modelPlaceholderId) {
          return {
            id: Math.random().toString(),
            role: "model",
            text: `I apologize, Boss. I encountered a pipeline blockage: ${error.message || "Unknown error"}. Please verify your server API connectivity or Secret keys.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return m;
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear Chat History
  const handleClearHistory = () => {
    const confirmed = window.confirm("Are you sure you want to clear your conversation history with Butler, Boss?");
    if (!confirmed) return;
    
    setMessages([
      {
        id: "welcome",
        role: "model",
        text: "Good day, Boss. History cleared. I am ready to handle your next digital objective.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // File Upload Helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(",")[1];
      setAttachedFile({
        base64: base64Data,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  // Audio Recording (Voice Dictation)
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const resultStr = reader.result as string;
            const base64Data = resultStr.split(",")[1];

            const response = await fetch("/api/butler/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: "audio/webm"
              })
            });

            const data = await response.json();
            if (data.transcription) {
              setInput(prev => (prev ? prev + " " + data.transcription : data.transcription));
            }
          } catch (err) {
            console.error("Transcribing failed:", err);
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to access microphone:", err);
      alert("Boss, I was unable to activate your microphone. Please grant browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div id="chat-interface-wrapper" className="flex flex-col h-screen bg-elegant-bg text-elegant-text font-sans">
      
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-elegant-border bg-elegant-bg flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-elegant-gold/10 p-2 rounded-xl border border-elegant-gold/20 shadow-[0_0_10px_rgba(212,175,55,0.15)]">
            <Sparkles className="w-4 h-4 text-elegant-gold" />
          </div>
          <div>
            <h2 className="text-sm font-light tracking-wide text-white flex items-center gap-2 italic">
              AI Chief of Staff Console
            </h2>
            <p className="text-[9px] text-elegant-muted font-mono uppercase tracking-wider">Status: Secure Direct Connection</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Clear History */}
          <button 
            onClick={handleClearHistory}
            className="p-2 text-elegant-muted hover:text-red-400 hover:bg-elegant-card rounded-lg transition-all duration-300 cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Model Selection Rail */}
      <div className="px-6 py-2.5 border-b border-elegant-border bg-elegant-bg flex flex-wrap gap-2 shrink-0">
        <span className="text-[10px] text-elegant-muted font-mono uppercase tracking-wider flex items-center mr-2">Routing Core:</span>
        <button
          onClick={() => setMode("general")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            mode === "general"
              ? "bg-elegant-gold/15 text-elegant-gold border border-elegant-gold/30"
              : "bg-elegant-card text-elegant-muted hover:text-white border border-transparent"
          }`}
        >
          <Sparkles className="w-3 h-3" />
          Standard
        </button>
        <button
          onClick={() => setMode("thinking")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            mode === "thinking"
              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30"
              : "bg-elegant-card text-elegant-muted hover:text-white border border-transparent"
          }`}
        >
          <Brain className="w-3 h-3" />
          Thinking
        </button>
        <button
          onClick={() => setMode("search")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            mode === "search"
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
              : "bg-elegant-card text-elegant-muted hover:text-white border border-transparent"
          }`}
        >
          <Search className="w-3 h-3" />
          Web Grounded
        </button>
        <button
          onClick={() => setMode("maps")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            mode === "maps"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "bg-elegant-card text-elegant-muted hover:text-white border border-transparent"
          }`}
        >
          <MapPin className="w-3 h-3" />
          Maps Grounded
        </button>
        <button
          onClick={() => setMode("low-latency")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer ${
            mode === "low-latency"
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              : "bg-elegant-card text-elegant-muted hover:text-white border border-transparent"
          }`}
        >
          <Zap className="w-3 h-3" />
          Instant
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-elegant-bg">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-4xl mx-auto`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[9px] font-mono uppercase tracking-widest ${isUser ? "text-elegant-gold" : "text-white font-light italic"}`}>
                  {isUser ? "Boss" : "Butler"}
                </span>
                {msg.mode && !isUser && (
                  <span className="text-[8px] font-mono uppercase bg-elegant-card text-elegant-gold px-1.5 py-0.5 rounded border border-elegant-border">
                    {msg.mode}
                  </span>
                )}
                <span className="text-[9px] font-mono text-elegant-dark">{msg.timestamp}</span>
              </div>

              {msg.isThinking ? (
                <div className="p-4 bg-elegant-card border border-elegant-border rounded-xl flex items-center gap-3">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-elegant-gold rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-elegant-gold rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-1.5 h-1.5 bg-elegant-gold rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                  <span className="text-[10px] font-mono text-elegant-muted">Butler is preparing response...</span>
                </div>
              ) : (
                <div 
                  className={`px-5 py-4 rounded-xl max-w-full text-xs leading-relaxed border ${
                    isUser 
                      ? "bg-elegant-card border-elegant-border-light text-white" 
                      : "bg-elegant-card/50 border-elegant-border/80 text-elegant-text"
                  }`}
                >
                  <div className="markdown-body">
                    <Markdown>{msg.text}</Markdown>
                  </div>

                  {/* Grounding Sources Badges */}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-elegant-border/40 flex flex-wrap gap-2">
                      <span className="text-[9px] font-mono text-elegant-muted w-full uppercase tracking-wider mb-1">Grounding References:</span>
                      {msg.groundingSources.map((src, idx) => (
                        <a 
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-elegant-bg hover:bg-elegant-card border border-elegant-border hover:border-elegant-border-light text-[10px] text-elegant-gold font-medium rounded-lg transition-all"
                        >
                          <FileText className="w-3 h-3 text-elegant-muted" />
                          <span className="font-mono">{src.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-elegant-dark" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Tray */}
      <div className="p-4 border-t border-elegant-border bg-elegant-bg shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          
          {/* File Attachment Preview */}
          {attachedFile && (
            <div className="flex items-center justify-between p-2.5 bg-elegant-card rounded-xl border border-elegant-border max-w-md animate-fade-in">
              <div className="flex items-center gap-3">
                {attachedFile.mimeType.startsWith("image/") ? (
                  <ImageIcon className="w-4.5 h-4.5 text-elegant-gold" />
                ) : (
                  <VideoIcon className="w-4.5 h-4.5 text-violet-400" />
                )}
                <div>
                  <p className="text-xs font-semibold text-white truncate max-w-xs">{attachedFile.name}</p>
                  <p className="text-[9px] text-elegant-gold font-mono uppercase tracking-widest">READY TO ANALYZE</p>
                </div>
              </div>
              <button 
                onClick={() => setAttachedFile(null)}
                className="p-1 text-elegant-muted hover:text-red-400 hover:bg-elegant-bg rounded-md"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Composer Form */}
          <form onSubmit={handleSend} className="flex gap-2.5 items-end">
            <div className="flex-1 bg-elegant-card border border-elegant-border rounded-xl p-2 flex items-center gap-2">
              
              {/* Media Attachment trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-elegant-muted hover:text-white rounded-lg hover:bg-elegant-bg transition-colors shrink-0 cursor-pointer"
                title="Attach photo/video"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden" 
              />

              <textarea 
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isTranscribing 
                    ? "Transcribing your voice..." 
                    : attachedFile 
                    ? "Enter prompt for file analysis (e.g., 'Extract details')..." 
                    : "Address your Chief of Staff here, Boss..."
                }
                disabled={isTranscribing}
                className="flex-1 bg-transparent text-xs text-white border-0 py-2 px-1 placeholder-elegant-dark focus:ring-0 focus:outline-none resize-none max-h-36 min-h-[36px] font-sans"
              />

              {/* Dictation (Speech to Text) */}
              <div className="flex items-center gap-1.5 shrink-0 px-2">
                {isTranscribing && (
                  <RefreshCw className="w-3.5 h-3.5 text-elegant-gold animate-spin" />
                )}
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2 bg-red-600 text-white rounded-lg animate-pulse shrink-0 cursor-pointer"
                    title="Stop dictating"
                  >
                    <MicOff className="w-4.5 h-4.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isTranscribing || isGenerating}
                    className="p-2 text-elegant-muted hover:text-white hover:bg-elegant-bg rounded-lg transition-colors shrink-0 disabled:opacity-40 cursor-pointer"
                    title="Dictate with voice"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isGenerating || isTranscribing || (!input.trim() && !attachedFile)}
              className="p-3 bg-elegant-gold text-neutral-950 hover:bg-elegant-gold/90 font-semibold rounded-xl transition-all shadow-[0_0_12px_rgba(212,175,55,0.2)] shrink-0 disabled:opacity-40 disabled:hover:bg-elegant-gold disabled:shadow-none cursor-pointer"
            >
              <Send className="w-4 h-4 stroke-[2]" />
            </button>
          </form>
          
          <div className="flex justify-between items-center text-[9px] text-elegant-muted px-1 font-mono uppercase tracking-widest">
            <span>Butler OS • Dynamic Synced Session</span>
            {isRecording && <span className="text-red-500 animate-pulse font-bold flex items-center gap-1">● Dictating Live</span>}
          </div>

        </div>
      </div>

    </div>
  );
}
