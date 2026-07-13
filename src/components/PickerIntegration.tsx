import React, { useState, useEffect } from "react";
import { FolderOpen, Search, Filter, RefreshCw, Eye, ExternalLink, Calendar, HardDrive } from "lucide-react";
import { DriveFile } from "../types";

interface PickerIntegrationProps {
  token: string | null;
}

export default function PickerIntegration({ token }: PickerIntegrationProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mimeTypeFilter, setMimeTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  const mockPickerFiles: DriveFile[] = [
    {
      id: "mock-sheets-1",
      name: "Q3 Fiscal Projections.xlsx",
      mimeType: "application/vnd.google-apps.spreadsheet",
      modifiedTime: new Date().toISOString(),
      webViewLink: "https://docs.google.com/spreadsheets"
    },
    {
      id: "mock-sheets-2",
      name: "Sales & Pipeline Forecast.xlsx",
      mimeType: "application/vnd.google-apps.spreadsheet",
      modifiedTime: new Date(Date.now() - 3600000).toISOString(),
      webViewLink: "https://docs.google.com/spreadsheets"
    },
    {
      id: "mock-docs-1",
      name: "Standard Operating Procedures.docx",
      mimeType: "application/vnd.google-apps.document",
      modifiedTime: new Date(Date.now() - 86400000).toISOString(),
      webViewLink: "https://docs.google.com/document"
    },
    {
      id: "mock-docs-2",
      name: "Nigeria Transit Corridor Study.docx",
      mimeType: "application/vnd.google-apps.document",
      modifiedTime: new Date(Date.now() - 172800000).toISOString(),
      webViewLink: "https://docs.google.com/document"
    },
    {
      id: "mock-slides-1",
      name: "Executive Roadmap Board.pptx",
      mimeType: "application/vnd.google-apps.presentation",
      modifiedTime: new Date(Date.now() - 259200000).toISOString(),
      webViewLink: "https://docs.google.com/presentation"
    },
    {
      id: "mock-forms-1",
      name: "Nigeria Logistics Feedback Form",
      mimeType: "application/vnd.google-apps.form",
      modifiedTime: new Date(Date.now() - 345600000).toISOString(),
      webViewLink: "https://docs.google.com/forms"
    }
  ];

  const fetchFiles = async () => {
    if (!token) return;
    setIsLoading(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 450));
      let filtered = mockPickerFiles.filter((file) => {
        if (mimeTypeFilter === "sheets") return file.mimeType.includes("spreadsheet");
        if (mimeTypeFilter === "docs") return file.mimeType.includes("document");
        if (mimeTypeFilter === "slides") return file.mimeType.includes("presentation");
        if (mimeTypeFilter === "forms") return file.mimeType.includes("form");
        return true;
      });
      if (searchQuery.trim()) {
        filtered = filtered.filter((file) =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        );
      }
      setFiles(filtered);
      setIsLoading(false);
      return;
    }

    try {
      let q = "";
      if (mimeTypeFilter === "sheets") {
        q = "mimeType='application/vnd.google-apps.spreadsheet'";
      } else if (mimeTypeFilter === "docs") {
        q = "mimeType='application/vnd.google-apps.document'";
      } else if (mimeTypeFilter === "slides") {
        q = "mimeType='application/vnd.google-apps.presentation'";
      } else if (mimeTypeFilter === "forms") {
        q = "mimeType='application/vnd.google-apps.form'";
      } else {
        q = "mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.presentation' or mimeType='application/vnd.google-apps.form'";
      }

      if (searchQuery.trim()) {
        q = `(${q}) and name contains '${searchQuery.trim().replace(/'/g, "\\'")}'`;
      }

      const encodedQ = encodeURIComponent(q);
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodedQ}&fields=files(id,name,mimeType,modifiedTime,webViewLink,size,owners)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) throw new Error("Failed to fetch files from Drive");
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error("Error picking files:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [token, mimeTypeFilter]);

  const getFriendlyMimeType = (mime: string) => {
    if (mime.includes("spreadsheet")) return "Google Sheets Spreadsheet";
    if (mime.includes("document")) return "Google Docs Document";
    if (mime.includes("presentation")) return "Google Slides Deck";
    if (mime.includes("form")) return "Google Forms Questionnaire";
    return "Drive Document";
  };

  return (
    <div id="picker-integration-container" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            Google Picker & File Browser
          </h3>
          <p className="text-[11px] text-elegant-muted">Select, inspect metadata, and launch Workspace applications directly</p>
        </div>
        <button
          onClick={fetchFiles}
          disabled={isLoading}
          className="p-2 bg-elegant-card border border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-elegant-gold" : ""}`} />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between bg-elegant-card border border-elegant-border p-4 rounded-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchFiles();
          }}
          className="flex-1 relative max-w-md min-w-[240px]"
        >
          <Search className="w-3.5 h-3.5 text-elegant-muted absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Drive files by name..."
            className="w-full bg-elegant-bg border border-elegant-border pl-10 pr-4 py-2 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-elegant-muted" />
          <select
            value={mimeTypeFilter}
            onChange={(e) => setMimeTypeFilter(e.target.value)}
            className="bg-elegant-bg border border-elegant-border text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="all">All File Types</option>
            <option value="sheets">Google Sheets</option>
            <option value="docs">Google Docs</option>
            <option value="slides">Google Slides</option>
            <option value="forms">Google Forms</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Browser Grid */}
        <div className="lg:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-4 space-y-2 max-h-[450px] overflow-y-auto text-left">
          <h4 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest mb-2">Drive Directory</h4>
          
          {isLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500 mx-auto mb-2" />
              <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Browsing Workspace Storage...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`p-3.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    selectedFile?.id === file.id
                      ? "bg-amber-500/5 border-amber-500/40 text-amber-400"
                      : "bg-elegant-bg/40 border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold truncate leading-normal">{file.name}</p>
                      <p className="text-[9px] font-mono opacity-60 truncate mt-0.5">{getFriendlyMimeType(file.mimeType)}</p>
                    </div>
                  </div>
                  <Eye className="w-3.5 h-3.5 opacity-60" />
                </div>
              ))}
              {files.length === 0 && (
                <div className="col-span-full py-16 text-center border border-dashed border-elegant-border rounded-xl text-xs font-mono uppercase tracking-wider text-elegant-muted">
                  No matching workspace files found, Boss.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected File Details Preview */}
        <div className="bg-elegant-card border border-elegant-border rounded-xl p-5 flex flex-col justify-between min-h-[450px] text-left">
          {selectedFile ? (
            <div className="space-y-5 flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="border-b border-elegant-border/60 pb-3">
                  <span className="text-[8px] font-mono text-amber-400 uppercase tracking-widest bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded">
                    Metadata Inspector
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-1 leading-snug">{selectedFile.name}</h4>
                </div>

                <div className="space-y-2.5 text-xs text-elegant-text leading-relaxed font-sans">
                  <p>
                    <strong className="text-white font-medium">Document ID:</strong>{" "}
                    <span className="font-mono text-[10px] text-elegant-muted select-all block mt-0.5">{selectedFile.id}</span>
                  </p>
                  <p>
                    <strong className="text-white font-medium">Type:</strong>{" "}
                    <span className="text-elegant-muted">{getFriendlyMimeType(selectedFile.mimeType)}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <strong className="text-white font-medium">Last Modified:</strong>{" "}
                    <span className="text-elegant-muted">{new Date(selectedFile.modifiedTime).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              {selectedFile.webViewLink && (
                <div className="border-t border-elegant-border/60 pt-4 mt-4">
                  <a
                    href={selectedFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Open Workspace App
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center my-auto py-12">
              <FolderOpen className="w-8 h-8 text-elegant-dark mx-auto mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider text-elegant-muted">
                Select any file from your directory to inspect permissions and web link configurations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
