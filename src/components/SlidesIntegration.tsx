import React, { useState, useEffect } from "react";
import { Presentation, Plus, RefreshCw, Eye, Sparkles } from "lucide-react";
import { DriveFile } from "../types";

interface SlidesIntegrationProps {
  token: string | null;
}

export default function SlidesIntegration({ token }: SlidesIntegrationProps) {
  const [presentations, setPresentations] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPresId, setSelectedPresId] = useState<string | null>(null);
  const [selectedPresTitle, setSelectedPresTitle] = useState<string>("");
  const [newPresTitle, setNewPresTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [slides, setSlides] = useState<any[]>([]);
  const [isFetchingSlides, setIsFetchingSlides] = useState(false);
  const [isAddingSlide, setIsAddingSlide] = useState(false);

  const mockDecksList: DriveFile[] = [
    { id: "mock-pres-1", name: "Executive Roadmap Board.pptx", mimeType: "application/vnd.google-apps.presentation", modifiedTime: new Date().toISOString(), webViewLink: "https://docs.google.com/presentation" },
    { id: "mock-pres-2", name: "Fleet Modernization Proposal.pptx", mimeType: "application/vnd.google-apps.presentation", modifiedTime: new Date(Date.now() - 172800000).toISOString(), webViewLink: "https://docs.google.com/presentation" }
  ];

  const mockSlidesMap: Record<string, any[]> = {
    "mock-pres-1": [
      { objectId: "slide-1", slideProperties: { layoutType: "TITLE" } },
      { objectId: "slide-2", slideProperties: { layoutType: "TITLE_AND_BODY" } },
      { objectId: "slide-3", slideProperties: { layoutType: "BIG_NUMBER" } }
    ],
    "mock-pres-2": [
      { objectId: "slide-a", slideProperties: { layoutType: "TITLE" } },
      { objectId: "slide-b", slideProperties: { layoutType: "TITLE_AND_BODY" } }
    ]
  };

  const fetchPresentations = async () => {
    if (!token) return;
    setIsLoading(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const savedDecks = localStorage.getItem("demo_decks_list");
      if (savedDecks) {
        setPresentations(JSON.parse(savedDecks));
      } else {
        setPresentations(mockDecksList);
        localStorage.setItem("demo_decks_list", JSON.stringify(mockDecksList));
      }
      setIsLoading(false);
      return;
    }

    try {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.presentation'");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch presentations from Google Drive");
      const data = await res.json();
      setPresentations(data.files || []);
    } catch (err) {
      console.error("Error loading presentations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPresentations();
  }, [token]);

  const handleCreatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPresTitle.trim()) return;

    const confirmed = window.confirm(`Confirm with Boss: Create presentation deck '${newPresTitle}'?`);
    if (!confirmed) return;

    setIsCreating(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newId = "mock-pres-" + Date.now();
      const newDeck: DriveFile = {
        id: newId,
        name: newPresTitle,
        mimeType: "application/vnd.google-apps.presentation",
        modifiedTime: new Date().toISOString(),
        webViewLink: "https://docs.google.com/presentation"
      };
      
      const currentDecks = [...presentations];
      currentDecks.unshift(newDeck);
      setPresentations(currentDecks);
      localStorage.setItem("demo_decks_list", JSON.stringify(currentDecks));
      
      alert(`Presentation Deck '${newPresTitle}' created, Boss!`);
      setNewPresTitle("");
      setIsCreating(false);
      handleSelectPres(newId, newPresTitle);
      return;
    }

    try {
      const res = await fetch("https://slides.googleapis.com/v1/presentations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newPresTitle,
        }),
      });
      if (!res.ok) throw new Error("Failed to create presentation");
      const data = await res.json();
      alert(`Presentation Deck '${newPresTitle}' created, Boss!`);
      setNewPresTitle("");
      fetchPresentations();
      handleSelectPres(data.presentationId, newPresTitle);
    } catch (err: any) {
      console.error(err);
      alert("Error creating deck: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectPres = async (id: string, title: string) => {
    setSelectedPresId(id);
    setSelectedPresTitle(title);
    setIsFetchingSlides(true);
    setSlides([]);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const cachedSlides = localStorage.getItem(`demo_slides_${id}`);
      if (cachedSlides) {
        setSlides(JSON.parse(cachedSlides));
      } else {
        const defaultSlides = mockSlidesMap[id] || [{ objectId: "slide-default", slideProperties: { layoutType: "TITLE" } }];
        setSlides(defaultSlides);
        localStorage.setItem(`demo_slides_${id}`, JSON.stringify(defaultSlides));
      }
      setIsFetchingSlides(false);
      return;
    }

    try {
      const res = await fetch(`https://slides.googleapis.com/v1/presentations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSlides(data.slides || []);
      } else {
        alert("Failed to retrieve slides. Double check API authorization.");
      }
    } catch (err) {
      console.error("Error reading slides:", err);
    } finally {
      setIsFetchingSlides(false);
    }
  };

  const handleAddSlide = async () => {
    if (!token || !selectedPresId) return;

    const confirmed = window.confirm(`Confirm with Boss: Create a new blank slide in this presentation?`);
    if (!confirmed) return;

    setIsAddingSlide(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const currentSlides = [...slides];
      const newSlide = {
        objectId: "slide-" + Date.now(),
        slideProperties: { layoutType: "TITLE_AND_BODY" }
      };
      currentSlides.push(newSlide);
      setSlides(currentSlides);
      localStorage.setItem(`demo_slides_${selectedPresId}`, JSON.stringify(currentSlides));
      alert("New slide added successfully, Boss.");
      setIsAddingSlide(false);
      return;
    }

    try {
      const res = await fetch(`https://slides.googleapis.com/v1/presentations/${selectedPresId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              createSlide: {
                insertionIndex: slides.length,
                slideLayoutReference: {
                  predefinedLayout: "TITLE_AND_BODY",
                },
              },
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("Failed to insert slide");
      alert("New slide added successfully, Boss.");
      handleSelectPres(selectedPresId, selectedPresTitle);
    } catch (err: any) {
      console.error(err);
      alert("Error adding slide: " + err.message);
    } finally {
      setIsAddingSlide(false);
    }
  };

  return (
    <div id="slides-integration-container" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Presentation className="w-4 h-4 text-orange-500" />
            Google Slides Deck Builder
          </h3>
          <p className="text-[11px] text-elegant-muted">Design presentation decks, list active slides, and append templates</p>
        </div>
        <button
          onClick={fetchPresentations}
          disabled={isLoading}
          className="p-2 bg-elegant-card border border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-elegant-gold" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presentation List & Creator */}
        <div className="space-y-4">
          <form onSubmit={handleCreatePresentation} className="bg-elegant-card border border-elegant-border p-4 rounded-xl space-y-3">
            <h4 className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest">New Presentation</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPresTitle}
                onChange={(e) => setNewPresTitle(e.target.value)}
                placeholder="Presentation Title..."
                className="flex-1 bg-elegant-bg border border-elegant-border px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light"
                required
              />
              <button
                type="submit"
                disabled={isCreating}
                className="px-3 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create
              </button>
            </div>
          </form>

          <div className="bg-elegant-card border border-elegant-border rounded-xl p-4 space-y-2 max-h-[350px] overflow-y-auto">
            <h4 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest mb-2">Available Slide Decks</h4>
            {presentations.map((deck) => (
              <div
                key={deck.id}
                onClick={() => handleSelectPres(deck.id, deck.name)}
                className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                  selectedPresId === deck.id
                    ? "bg-orange-500/5 border-orange-500/40 text-orange-400"
                    : "bg-elegant-bg/40 border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate text-left">
                  <Presentation className="w-4 h-4 text-orange-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-medium truncate">{deck.name}</p>
                    <p className="text-[9px] font-mono opacity-60">Modified: {new Date(deck.modifiedTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 opacity-60" />
              </div>
            ))}
            {presentations.length === 0 && !isLoading && (
              <p className="text-[10px] font-mono text-center text-elegant-muted py-6">No slide decks found, Boss.</p>
            )}
          </div>
        </div>

        {/* Live Slide List Viewer */}
        <div className="lg:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-5 flex flex-col justify-between min-h-[450px]">
          {selectedPresId ? (
            <div className="space-y-4 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-elegant-border/60 pb-3">
                  <div>
                    <span className="text-[8px] font-mono text-orange-400 uppercase tracking-widest bg-orange-500/5 border border-orange-500/20 px-2 py-0.5 rounded">
                      Active Slides Navigator
                    </span>
                    <h4 className="text-sm font-semibold text-white mt-1">{selectedPresTitle}</h4>
                  </div>
                  <button
                    onClick={handleAddSlide}
                    disabled={isAddingSlide}
                    className="flex items-center gap-1.5 px-4.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add New Slide
                  </button>
                </div>

                {isFetchingSlides ? (
                  <div className="py-20 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-orange-400 mx-auto mb-2" />
                    <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Parsing Presentation layouts...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {slides.map((slide, index) => (
                      <div
                        key={slide.objectId}
                        className="bg-elegant-bg/40 border border-elegant-border p-4 rounded-xl flex flex-col justify-between items-center min-h-[110px] text-center"
                      >
                        <span className="text-[9px] font-mono text-elegant-gold bg-elegant-gold/5 border border-elegant-gold/15 px-2 py-0.5 rounded-full mb-2">
                          SLIDE {index + 1}
                        </span>
                        <div className="text-[10px] text-elegant-muted italic line-clamp-2 leading-relaxed">
                          Layout: {slide.slideProperties?.layoutType || "Title & Body"}
                        </div>
                        <span className="text-[8px] font-mono text-elegant-dark mt-2 truncate max-w-full">
                          ID: {slide.objectId}
                        </span>
                      </div>
                    ))}
                    {slides.length === 0 && (
                      <div className="col-span-full py-12 text-center text-elegant-muted text-xs font-mono uppercase tracking-wide">
                        No slides detected in this deck.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-elegant-border/60 pt-4 mt-6 flex items-center justify-between text-elegant-muted">
                <p className="text-[10px] leading-relaxed max-w-md text-left">
                  Add more slides with standard pre-formatted layout boxes (title-and-body formats) directly on behalf of your presentation.
                </p>
                <Sparkles className="w-4 h-4 text-elegant-gold" />
              </div>
            </div>
          ) : (
            <div className="text-center my-auto py-12">
              <Presentation className="w-8 h-8 text-elegant-dark mx-auto mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider text-elegant-muted">
                Select a presentation slide deck to navigate layouts and append slides.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
