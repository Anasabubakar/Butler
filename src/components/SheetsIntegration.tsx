import React, { useState, useEffect } from "react";
import { Table, Plus, RefreshCw, FileSpreadsheet, Eye, Save, AlertCircle } from "lucide-react";
import { DriveFile } from "../types";

interface SheetsIntegrationProps {
  token: string | null;
}

export default function SheetsIntegration({ token }: SheetsIntegrationProps) {
  const [sheets, setSheets] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [newSheetName, setNewSheetName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [gridData, setGridData] = useState<string[][]>([
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
  ]);
  const [isFetchingGrid, setIsFetchingGrid] = useState(false);
  const [isSavingGrid, setIsSavingGrid] = useState(false);

  const mockSheetsList: DriveFile[] = [
    { id: "mock-sheet-1", name: "Q3 Fiscal Projections.xlsx", mimeType: "application/vnd.google-apps.spreadsheet", modifiedTime: new Date().toISOString(), webViewLink: "https://docs.google.com/spreadsheets" },
    { id: "mock-sheet-2", name: "Sales & Pipeline Forecast.xlsx", mimeType: "application/vnd.google-apps.spreadsheet", modifiedTime: new Date(Date.now() - 3600000).toISOString(), webViewLink: "https://docs.google.com/spreadsheets" },
    { id: "mock-sheet-3", name: "Nigeria Operations Fleet Budget.xlsx", mimeType: "application/vnd.google-apps.spreadsheet", modifiedTime: new Date(Date.now() - 7200000).toISOString(), webViewLink: "https://docs.google.com/spreadsheets" }
  ];

  const mockGridDataMap: Record<string, string[][]> = {
    "mock-sheet-1": [
      ["Q3 Operational Cost", "Budget Cap", "Spent", "Remaining"],
      ["ML Pipeline Containers", "$15,000", "$11,200", "$3,800"],
      ["Direct Line Integrations", "$5,000", "$2,400", "$2,600"],
      ["Nigeria Logistics Hub", "$30,000", "$28,500", "$1,500"],
      ["Total Fiscal Summary", "$50,000", "$42,100", "$7,900"]
    ],
    "mock-sheet-2": [
      ["Sales Territory", "Deals Closed", "Q3 Target", "Completion %"],
      ["North America", "12", "15", "80%"],
      ["EMEA", "8", "10", "80%"],
      ["West Africa Hub", "18", "15", "120%"],
      ["Global Pipelines", "38", "40", "95%"]
    ],
    "mock-sheet-3": [
      ["Fleet Log", "Vehicle Count", "Fuel Cap", "Est Cost"],
      ["Danfo Vans", "15", "5,000L", "$8,200"],
      ["Container Shuttles", "4", "3,500L", "$6,400"],
      ["BRT Transit Passes", "120", "Passes", "$3,000"],
      ["Total Fleet Cost", "139", "N/A", "$17,600"]
    ]
  };

  const fetchSpreadsheets = async () => {
    if (!token) return;
    setIsLoading(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const savedDemoSheets = localStorage.getItem("demo_sheets_list");
      if (savedDemoSheets) {
        setSheets(JSON.parse(savedDemoSheets));
      } else {
        setSheets(mockSheetsList);
        localStorage.setItem("demo_sheets_list", JSON.stringify(mockSheetsList));
      }
      setIsLoading(false);
      return;
    }

    try {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet'");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch spreadsheets from Google Drive");
      const data = await res.json();
      setSheets(data.files || []);
    } catch (err) {
      console.error("Error loading spreadsheets:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpreadsheets();
  }, [token]);

  const handleCreateSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newSheetName.trim()) return;

    const confirmed = window.confirm(`Confirm with Boss: Create spreadsheet '${newSheetName}'?`);
    if (!confirmed) return;

    setIsCreating(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newId = "mock-sheet-" + Date.now();
      const newSheet: DriveFile = {
        id: newId,
        name: newSheetName,
        mimeType: "application/vnd.google-apps.spreadsheet",
        modifiedTime: new Date().toISOString(),
        webViewLink: "https://docs.google.com/spreadsheets"
      };
      
      const currentSheets = [...sheets];
      currentSheets.unshift(newSheet);
      setSheets(currentSheets);
      localStorage.setItem("demo_sheets_list", JSON.stringify(currentSheets));
      
      alert(`Spreadsheet '${newSheetName}' created, Boss!`);
      setNewSheetName("");
      setIsCreating(false);
      handleSelectSheet(newId, newSheetName);
      return;
    }

    try {
      const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: { title: newSheetName },
        }),
      });
      if (!res.ok) throw new Error("Failed to create spreadsheet");
      const data = await res.json();
      alert(`Spreadsheet '${newSheetName}' created, Boss!`);
      setNewSheetName("");
      fetchSpreadsheets();
      handleSelectSheet(data.spreadsheetId, newSheetName);
    } catch (err: any) {
      console.error(err);
      alert("Error creating spreadsheet: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectSheet = async (id: string, name: string) => {
    setSelectedSheetId(id);
    setSelectedSheetName(name);
    setIsFetchingGrid(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const cachedGrid = localStorage.getItem(`demo_grid_${id}`);
      if (cachedGrid) {
        setGridData(JSON.parse(cachedGrid));
      } else {
        const defaultGrid = mockGridDataMap[id] || [
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
          ["", "", "", ""],
        ];
        setGridData(defaultGrid);
        localStorage.setItem(`demo_grid_${id}`, JSON.stringify(defaultGrid));
      }
      setIsFetchingGrid(false);
      return;
    }

    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Sheet1!A1:D5`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const values: string[][] = data.values || [];
        // Fill or pad grid to 5x4
        const padded: string[][] = Array(5)
          .fill(null)
          .map((_, r) =>
            Array(4)
              .fill("")
              .map((_, c) => (values[r] && values[r][c] !== undefined ? values[r][c] : ""))
          );
        setGridData(padded);
      } else {
        // If Sheet1!A1:D5 fails, default to empty padded grid
        setGridData(
          Array(5)
            .fill(null)
            .map(() => Array(4).fill(""))
        );
      }
    } catch (err) {
      console.error("Error reading spreadsheet cells:", err);
    } finally {
      setIsFetchingGrid(false);
    }
  };

  const handleSaveGrid = async () => {
    if (!token || !selectedSheetId) return;

    const confirmed = window.confirm(`Confirm with Boss: Update cell values in Sheet1!A1:D5?`);
    if (!confirmed) return;

    setIsSavingGrid(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 450));
      localStorage.setItem(`demo_grid_${selectedSheetId}`, JSON.stringify(gridData));
      alert("Spreadsheet cells updated successfully, Boss.");
      setIsSavingGrid(false);
      return;
    }

    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${selectedSheetId}/values/Sheet1!A1:D5?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: gridData,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to write cell values");
      alert("Spreadsheet cells updated successfully, Boss.");
    } catch (err: any) {
      console.error(err);
      alert("Error saving cells: " + err.message);
    } finally {
      setIsSavingGrid(false);
    }
  };

  const handleCellChange = (r: number, c: number, value: string) => {
    const updated = [...gridData];
    updated[r][c] = value;
    setGridData(updated);
  };

  return (
    <div id="sheets-integration-container" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Google Sheets Manager
          </h3>
          <p className="text-[11px] text-elegant-muted">Create, inspect, and update spreadsheet cell grids</p>
        </div>
        <button
          onClick={fetchSpreadsheets}
          disabled={isLoading}
          className="p-2 bg-elegant-card border border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-elegant-gold" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spreadsheets List & Creator */}
        <div className="space-y-4">
          <form onSubmit={handleCreateSpreadsheet} className="bg-elegant-card border border-elegant-border p-4 rounded-xl space-y-3">
            <h4 className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest">New Spreadsheet</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSheetName}
                onChange={(e) => setNewSheetName(e.target.value)}
                placeholder="Spreadsheet Title..."
                className="flex-1 bg-elegant-bg border border-elegant-border px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light"
                required
              />
              <button
                type="submit"
                disabled={isCreating}
                className="px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Create
              </button>
            </div>
          </form>

          <div className="bg-elegant-card border border-elegant-border rounded-xl p-4 space-y-2 max-h-[350px] overflow-y-auto">
            <h4 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest mb-2">Available Spreadsheets</h4>
            {sheets.map((sheet) => (
              <div
                key={sheet.id}
                onClick={() => handleSelectSheet(sheet.id, sheet.name)}
                className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                  selectedSheetId === sheet.id
                    ? "bg-emerald-500/5 border-emerald-500/40 text-emerald-400"
                    : "bg-elegant-bg/40 border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="truncate text-left">
                    <p className="text-xs font-medium truncate">{sheet.name}</p>
                    <p className="text-[9px] font-mono opacity-60">Modified: {new Date(sheet.modifiedTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 opacity-60" />
              </div>
            ))}
            {sheets.length === 0 && !isLoading && (
              <p className="text-[10px] font-mono text-center text-elegant-muted py-6">No spreadsheets found, Boss.</p>
            )}
          </div>
        </div>

        {/* Live Grid Cell View & Editor */}
        <div className="lg:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-5 flex flex-col justify-between min-h-[400px]">
          {selectedSheetId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-elegant-border/60 pb-3">
                <div>
                  <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded">
                    Active Sheets Bridge
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-1">{selectedSheetName}</h4>
                </div>
                <button
                  onClick={handleSaveGrid}
                  disabled={isSavingGrid}
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>

              {isFetchingGrid ? (
                <div className="py-20 text-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mx-auto mb-2" />
                  <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Streaming Sheet Cells...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border border-elegant-border text-center bg-elegant-bg/80 text-[10px] font-mono text-elegant-gold w-10"></th>
                        <th className="p-2 border border-elegant-border text-center bg-elegant-bg/80 text-[10px] font-mono text-elegant-muted">A</th>
                        <th className="p-2 border border-elegant-border text-center bg-elegant-bg/80 text-[10px] font-mono text-elegant-muted">B</th>
                        <th className="p-2 border border-elegant-border text-center bg-elegant-bg/80 text-[10px] font-mono text-elegant-muted">C</th>
                        <th className="p-2 border border-elegant-border text-center bg-elegant-bg/80 text-[10px] font-mono text-elegant-muted">D</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridData.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="p-2 border border-elegant-border text-center bg-elegant-bg/80 text-[10px] font-mono text-elegant-muted">
                            {rIdx + 1}
                          </td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-1 border border-elegant-border">
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                className="w-full bg-transparent border-0 px-2 py-1 text-xs text-white focus:outline-none focus:bg-elegant-bg/60 rounded"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center my-auto py-12">
              <Table className="w-8 h-8 text-elegant-dark mx-auto mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider text-elegant-muted">
                Select a spreadsheet to access and edit cells in live time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
