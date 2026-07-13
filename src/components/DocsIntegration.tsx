import React, { useState, useEffect } from "react";
import { FileText, Plus, RefreshCw, Eye, Edit3, Save } from "lucide-react";
import { DriveFile } from "../types";

interface DocsIntegrationProps {
  token: string | null;
}

export default function DocsIntegration({ token }: DocsIntegrationProps) {
  const [docs, setDocs] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocTitle, setSelectedDocTitle] = useState<string>("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [docContent, setDocContent] = useState("");
  const [textToAppend, setTextToAppend] = useState("");
  const [isFetchingDoc, setIsFetchingDoc] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  const mockDocsList: DriveFile[] = [
    { id: "mock-doc-1", name: "Standard Operating Procedures.docx", mimeType: "application/vnd.google-apps.document", modifiedTime: new Date().toISOString(), webViewLink: "https://docs.google.com/document" },
    { id: "mock-doc-2", name: "Nigeria Transit Corridor Study.docx", mimeType: "application/vnd.google-apps.document", modifiedTime: new Date(Date.now() - 86400000).toISOString(), webViewLink: "https://docs.google.com/document" }
  ];

  const mockDocContentMap: Record<string, string> = {
    "mock-doc-1": "Boss, this document defines standard operating procedures for Butler CoS operations:\n\n1. Ensure command logs are updated daily.\n2. Keep cloud container memory usage capped under 512MB.\n3. Escalate logistics delay alerts instantly to Command Center.",
    "mock-doc-2": "Study of transit corridors in Lagos, Nigeria:\n\nKey finding: BRT dedicated corridors exhibit 45% lower latency during rush hours compared to general Danfo van transit routes. Recommend transitioning high priority shipments to dedicated BRT shuttles."
  };

  const fetchDocuments = async () => {
    if (!token) return;
    setIsLoading(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const savedDocs = localStorage.getItem("demo_docs_list");
      if (savedDocs) {
        setDocs(JSON.parse(savedDocs));
      } else {
        setDocs(mockDocsList);
        localStorage.setItem("demo_docs_list", JSON.stringify(mockDocsList));
      }
      setIsLoading(false);
      return;
    }

    try {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.document'");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch documents from Google Drive");
      const data = await res.json();
      setDocs(data.files || []);
    } catch (err) {
      console.error("Error loading docs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newDocTitle.trim()) return;

    const confirmed = window.confirm(`Confirm with Boss: Create document '${newDocTitle}'?`);
    if (!confirmed) return;

    setIsCreating(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newId = "mock-doc-" + Date.now();
      const newDoc: DriveFile = {
        id: newId,
        name: newDocTitle,
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: new Date().toISOString(),
        webViewLink: "https://docs.google.com/document"
      };
      
      const currentDocs = [...docs];
      currentDocs.unshift(newDoc);
      setDocs(currentDocs);
      localStorage.setItem("demo_docs_list", JSON.stringify(currentDocs));
      
      alert(`Document '${newDocTitle}' created, Boss!`);
      setNewDocTitle("");
      setIsCreating(false);
      handleSelectDoc(newId, newDocTitle);
      return;
    }

    try {
      const res = await fetch("https://docs.googleapis.com/v1/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newDocTitle,
        }),
      });
      if (!res.ok) throw new Error("Failed to create document");
      const data = await res.json();
      alert(`Document '${newDocTitle}' created, Boss!`);
      setNewDocTitle("");
      fetchDocuments();
      handleSelectDoc(data.documentId, newDocTitle);
    } catch (err: any) {
      console.error(err);
      alert("Error creating document: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectDoc = async (id: string, title: string) => {
    setSelectedDocId(id);
    setSelectedDocTitle(title);
    setIsFetchingDoc(true);
    setDocContent("");
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const cachedContent = localStorage.getItem(`demo_doc_${id}`);
      if (cachedContent !== null) {
        setDocContent(cachedContent);
      } else {
        const defaultContent = mockDocContentMap[id] || "Empty Google Document (Demo Mode)";
        setDocContent(defaultContent);
        localStorage.setItem(`demo_doc_${id}`, defaultContent);
      }
      setIsFetchingDoc(false);
      return;
    }

    try {
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Extract basic text from body content structure
        let extractedText = "";
        if (data.body?.content) {
          data.body.content.forEach((element: any) => {
            if (element.paragraph?.elements) {
              element.paragraph.elements.forEach((el: any) => {
                if (el.textRun?.content) {
                  extractedText += el.textRun.content;
                }
              });
            }
          });
        }
        setDocContent(extractedText || "Empty Google Document");
      } else {
        setDocContent("Unable to load document body content. Verify permission.");
      }
    } catch (err) {
      console.error("Error reading document content:", err);
      setDocContent("Error reading document content from Google API.");
    } finally {
      setIsFetchingDoc(false);
    }
  };

  const handleAppendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedDocId || !textToAppend.trim()) return;

    const confirmed = window.confirm(`Confirm with Boss: Append your text to the end of the document?`);
    if (!confirmed) return;

    setIsSavingDoc(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const currentContent = docContent;
      const updatedContent = currentContent + "\n" + textToAppend;
      setDocContent(updatedContent);
      localStorage.setItem(`demo_doc_${selectedDocId}`, updatedContent);
      alert("Document text appended successfully, Boss.");
      setTextToAppend("");
      setIsSavingDoc(false);
      return;
    }

    try {
      // Find end index (approximate, or let Google Docs API batchUpdate do it)
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${selectedDocId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                text: "\n" + textToAppend,
                endOfSegmentLocation: {}, // Appends to the end of the main document body
              },
            },
          ],
        }),
      });

      if (!res.ok) throw new Error("Failed to append text");
      alert("Document text appended successfully, Boss.");
      setTextToAppend("");
      handleSelectDoc(selectedDocId, selectedDocTitle); // Refresh content
    } catch (err: any) {
      console.error(err);
      alert("Error saving document: " + err.message);
    } finally {
      setIsSavingDoc(false);
    }
  };

  return (
    <div id="docs-integration-container" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            Google Docs Editor
          </h3>
          <p className="text-[11px] text-elegant-muted">Write, inspect, and append text to Google documents</p>
        </div>
        <button
          onClick={fetchDocuments}
          disabled={isLoading}
          className="p-2 bg-elegant-card border border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-elegant-gold" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List & Creator */}
        <div className="space-y-4">
          <form onSubmit={handleCreateDoc} className="bg-elegant-card border border-elegant-border p-4 rounded-xl space-y-3">
            <h4 className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest">New Document</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document Title..."
                className="flex-1 bg-elegant-bg border border-elegant-border px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light"
                required
              />
              <button
                type="submit"
                disabled={isCreating}
                className="px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create
              </button>
            </div>
          </form>

          <div className="bg-elegant-card border border-elegant-border rounded-xl p-4 space-y-2 max-h-[350px] overflow-y-auto">
            <h4 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest mb-2">Available Documents</h4>
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelectDoc(doc.id, doc.name)}
                className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                  selectedDocId === doc.id
                    ? "bg-blue-500/5 border-blue-500/40 text-blue-400"
                    : "bg-elegant-bg/40 border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate text-left">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-medium truncate">{doc.name}</p>
                    <p className="text-[9px] font-mono opacity-60">Modified: {new Date(doc.modifiedTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 opacity-60" />
              </div>
            ))}
            {docs.length === 0 && !isLoading && (
              <p className="text-[10px] font-mono text-center text-elegant-muted py-6">No documents found, Boss.</p>
            )}
          </div>
        </div>

        {/* Live Document Viewer & Append tool */}
        <div className="lg:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-5 flex flex-col justify-between min-h-[450px]">
          {selectedDocId ? (
            <div className="space-y-4 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between border-b border-elegant-border/60 pb-3">
                  <div>
                    <span className="text-[8px] font-mono text-blue-400 uppercase tracking-widest bg-blue-500/5 border border-blue-500/20 px-2 py-0.5 rounded">
                      Active Document Readout
                    </span>
                    <h4 className="text-sm font-semibold text-white mt-1">{selectedDocTitle}</h4>
                  </div>
                </div>

                {isFetchingDoc ? (
                  <div className="py-20 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mx-auto mb-2" />
                    <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Decrypting Document Body...</p>
                  </div>
                ) : (
                  <div className="bg-elegant-bg/30 border border-elegant-border/60 rounded-xl p-4 max-h-[250px] overflow-y-auto mt-3">
                    <p className="text-xs text-elegant-text leading-relaxed whitespace-pre-wrap font-sans text-left">
                      {docContent}
                    </p>
                  </div>
                )}
              </div>

              {/* Append Form */}
              <form onSubmit={handleAppendText} className="border-t border-elegant-border/60 pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    Append Content
                  </label>
                  <button
                    type="submit"
                    disabled={isSavingDoc || !textToAppend.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[9px] uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Insert At End
                  </button>
                </div>
                <textarea
                  value={textToAppend}
                  onChange={(e) => setTextToAppend(e.target.value)}
                  placeholder="Type notes or report fragments to write directly into this Google Doc..."
                  className="w-full bg-elegant-bg border border-elegant-border p-3 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light h-20 resize-none font-sans"
                  required
                />
              </form>
            </div>
          ) : (
            <div className="text-center my-auto py-12">
              <FileText className="w-8 h-8 text-elegant-dark mx-auto mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider text-elegant-muted">
                Select a document to inspect and update text content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
