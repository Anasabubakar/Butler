import React, { useState, useEffect } from "react";
import { ClipboardList, Plus, RefreshCw, Eye, PieChart, Users } from "lucide-react";
import { DriveFile } from "../types";

interface FormsIntegrationProps {
  token: string | null;
}

export default function FormsIntegration({ token }: FormsIntegrationProps) {
  const [forms, setForms] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFormTitle, setSelectedFormTitle] = useState<string>("");
  const [newFormTitle, setNewFormTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState<any | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const mockFormsList: DriveFile[] = [
    { id: "mock-form-1", name: "Nigeria Logistics Feedback Form", mimeType: "application/vnd.google-apps.form", modifiedTime: new Date().toISOString(), webViewLink: "https://docs.google.com/forms" },
    { id: "mock-form-2", name: "Employee Engagement Survey", mimeType: "application/vnd.google-apps.form", modifiedTime: new Date(Date.now() - 259200000).toISOString(), webViewLink: "https://docs.google.com/forms" }
  ];

  const mockFormDataMap: Record<string, any> = {
    "mock-form-1": {
      items: [
        { itemId: "q1", title: "How was the BRT transit times sync?", questionItem: { question: { required: true, choiceQuestion: { type: "TEXT" } } } },
        { itemId: "q2", title: "Is the Danfo shuttle detour near Ikeja acceptable?", questionItem: { question: { required: true, choiceQuestion: { type: "RADIO" } } } }
      ]
    },
    "mock-form-2": {
      items: [
        { itemId: "q_eng1", title: "Are you satisfied with Digital Chief of Staff support?", questionItem: { question: { required: true, choiceQuestion: { type: "CHECKBOX" } } } },
        { itemId: "q_eng2", title: "Suggestions for general workflow enhancements", questionItem: { question: { required: false, choiceQuestion: { type: "TEXT" } } } }
      ]
    }
  };

  const mockResponsesMap: Record<string, any[]> = {
    "mock-form-1": [
      { responseId: "resp-log-1", lastSubmittedTime: new Date().toISOString() },
      { responseId: "resp-log-2", lastSubmittedTime: new Date(Date.now() - 3600000).toISOString() }
    ],
    "mock-form-2": [
      { responseId: "resp-eng-1", lastSubmittedTime: new Date(Date.now() - 86400000).toISOString() }
    ]
  };

  const fetchForms = async () => {
    if (!token) return;
    setIsLoading(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const savedForms = localStorage.getItem("demo_forms_list");
      if (savedForms) {
        setForms(JSON.parse(savedForms));
      } else {
        setForms(mockFormsList);
        localStorage.setItem("demo_forms_list", JSON.stringify(mockFormsList));
      }
      setIsLoading(false);
      return;
    }

    try {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.form'");
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to fetch forms from Google Drive");
      const data = await res.json();
      setForms(data.files || []);
    } catch (err) {
      console.error("Error loading forms:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [token]);

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFormTitle.trim()) return;

    const confirmed = window.confirm(`Confirm with Boss: Create feedback Form '${newFormTitle}'?`);
    if (!confirmed) return;

    setIsCreating(true);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const newId = "mock-form-" + Date.now();
      const newForm: DriveFile = {
        id: newId,
        name: newFormTitle,
        mimeType: "application/vnd.google-apps.form",
        modifiedTime: new Date().toISOString(),
        webViewLink: "https://docs.google.com/forms"
      };
      
      const currentForms = [...forms];
      currentForms.unshift(newForm);
      setForms(currentForms);
      localStorage.setItem("demo_forms_list", JSON.stringify(currentForms));
      
      alert(`Google Form '${newFormTitle}' created successfully, Boss!`);
      setNewFormTitle("");
      setIsCreating(false);
      handleSelectForm(newId, newFormTitle);
      return;
    }

    try {
      const res = await fetch("https://forms.googleapis.com/v1/forms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          info: { title: newFormTitle },
        }),
      });
      if (!res.ok) throw new Error("Failed to create Google Form");
      const data = await res.json();
      alert(`Google Form '${newFormTitle}' created successfully, Boss!`);
      setNewFormTitle("");
      fetchForms();
      handleSelectForm(data.formId, newFormTitle);
    } catch (err: any) {
      console.error(err);
      alert("Error creating form: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectForm = async (id: string, title: string) => {
    setSelectedFormId(id);
    setSelectedFormTitle(title);
    setIsFetchingDetails(true);
    setFormData(null);
    setResponses([]);
    
    if (token === "demo-access-token") {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setFormData(mockFormDataMap[id] || { items: [] });
      setResponses(mockResponsesMap[id] || []);
      setIsFetchingDetails(false);
      return;
    }

    try {
      // 1. Fetch Form Details
      const detailsRes = await fetch(`https://forms.googleapis.com/v1/forms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setFormData(detailsData);
      }

      // 2. Fetch Responses
      const respRes = await fetch(`https://forms.googleapis.com/v1/forms/${id}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (respRes.ok) {
        const respData = await respRes.json();
        setResponses(respData.responses || []);
      }
    } catch (err) {
      console.error("Error fetching form details/responses:", err);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  return (
    <div id="forms-integration-container" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-purple-500" />
            Google Forms Desk
          </h3>
          <p className="text-[11px] text-elegant-muted">Audit questionnaires, monitor employee feedback, and review metrics</p>
        </div>
        <button
          onClick={fetchForms}
          disabled={isLoading}
          className="p-2 bg-elegant-card border border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white rounded-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-elegant-gold" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form List & Creator */}
        <div className="space-y-4">
          <form onSubmit={handleCreateForm} className="bg-elegant-card border border-elegant-border p-4 rounded-xl space-y-3">
            <h4 className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest">Create New Form</h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder="Form / Survey Title..."
                className="flex-1 bg-elegant-bg border border-elegant-border px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-elegant-border-light"
                required
              />
              <button
                type="submit"
                disabled={isCreating}
                className="px-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-400 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create
              </button>
            </div>
          </form>

          <div className="bg-elegant-card border border-elegant-border rounded-xl p-4 space-y-2 max-h-[350px] overflow-y-auto">
            <h4 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest mb-2">Available Surveys</h4>
            {forms.map((form) => (
              <div
                key={form.id}
                onClick={() => handleSelectForm(form.id, form.name)}
                className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                  selectedFormId === form.id
                    ? "bg-purple-500/5 border-purple-500/40 text-purple-400"
                    : "bg-elegant-bg/40 border-elegant-border hover:border-elegant-border-light text-elegant-muted hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate text-left">
                  <ClipboardList className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-medium truncate">{form.name}</p>
                    <p className="text-[9px] font-mono opacity-60">Modified: {new Date(form.modifiedTime).toLocaleDateString()}</p>
                  </div>
                </div>
                <Eye className="w-3.5 h-3.5 opacity-60" />
              </div>
            ))}
            {forms.length === 0 && !isLoading && (
              <p className="text-[10px] font-mono text-center text-elegant-muted py-6">No surveys or forms found, Boss.</p>
            )}
          </div>
        </div>

        {/* Live Survey Results & Details Panel */}
        <div className="lg:col-span-2 bg-elegant-card border border-elegant-border rounded-xl p-5 flex flex-col justify-between min-h-[450px]">
          {selectedFormId ? (
            <div className="space-y-4 flex flex-col justify-between h-full text-left">
              <div>
                <div className="flex items-center justify-between border-b border-elegant-border/60 pb-3 mb-4">
                  <div>
                    <span className="text-[8px] font-mono text-purple-400 uppercase tracking-widest bg-purple-500/5 border border-purple-500/20 px-2 py-0.5 rounded">
                      Active Analytics Bridge
                    </span>
                    <h4 className="text-sm font-semibold text-white mt-1">{selectedFormTitle}</h4>
                  </div>
                </div>

                {isFetchingDetails ? (
                  <div className="py-20 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-purple-400 mx-auto mb-2" />
                    <p className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest">Gathering Form Submissions...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Header stats card */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-elegant-bg/40 border border-elegant-border p-4 rounded-xl flex items-center gap-3">
                        <Users className="w-8 h-8 text-purple-400 opacity-80" />
                        <div>
                          <p className="text-[9px] font-mono text-elegant-muted uppercase">Total Submissions</p>
                          <p className="text-xl font-semibold text-white">{responses.length}</p>
                        </div>
                      </div>
                      <div className="bg-elegant-bg/40 border border-elegant-border p-4 rounded-xl flex items-center gap-3">
                        <PieChart className="w-8 h-8 text-emerald-400 opacity-80" />
                        <div>
                          <p className="text-[9px] font-mono text-elegant-muted uppercase">Form Status</p>
                          <p className="text-sm font-semibold text-emerald-400">Accepting Responses</p>
                        </div>
                      </div>
                    </div>

                    {/* Form Questions Layout */}
                    <div>
                      <h5 className="text-[10px] font-mono text-elegant-gold uppercase tracking-widest mb-3">Form Questions Structure</h5>
                      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                        {formData?.items?.map((item: any, i: number) => (
                          <div key={item.itemId || i} className="bg-elegant-bg/30 border border-elegant-border/60 p-3 rounded-lg text-xs">
                            <p className="font-semibold text-white mb-1">
                              {i + 1}. {item.title || "Untitled Question"}
                            </p>
                            <p className="text-[10px] text-elegant-muted italic">
                              Type: {item.questionItem?.question?.required ? "Required" : "Optional"}{" "}
                              {item.questionItem?.question?.choiceQuestion?.type || "Text Answer"}
                            </p>
                          </div>
                        ))}
                        {(!formData?.items || formData.items.length === 0) && (
                          <p className="text-xs text-elegant-muted italic">No items/questions created yet in this form.</p>
                        )}
                      </div>
                    </div>

                    {/* Latest responses */}
                    <div>
                      <h5 className="text-[10px] font-mono text-elegant-muted uppercase tracking-widest mb-3">Latest Response Feeds</h5>
                      <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                        {responses.map((resp: any, rIdx: number) => (
                          <div key={resp.responseId || rIdx} className="bg-elegant-bg/20 border border-elegant-border/60 p-3 rounded-lg text-[11px] text-elegant-text">
                            <div className="flex justify-between font-mono text-[9px] text-elegant-muted mb-1">
                              <span>Response #{rIdx + 1}</span>
                              <span>{new Date(resp.lastSubmittedTime).toLocaleDateString()}</span>
                            </div>
                            <p className="truncate text-white">ID: {resp.responseId}</p>
                          </div>
                        ))}
                        {responses.length === 0 && (
                          <p className="text-xs text-elegant-muted italic">No responses recorded yet, Boss.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center my-auto py-12">
              <ClipboardList className="w-8 h-8 text-elegant-dark mx-auto mb-3" />
              <p className="text-xs font-mono uppercase tracking-wider text-elegant-muted">
                Select a questionnaire form to display live metrics and submissions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
