"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const card: React.CSSProperties = { background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 20, fontFamily: ff };

const statusColors: Record<string, string> = { requested: "#f59e0b", sample_collected: "#a78bfa", processing: "#3b82f6", completed: "#22c55e" };
const statusLabels: Record<string, string> = { requested: "Requested", sample_collected: "Sample Collected", processing: "Processing", completed: "Completed" };
const NEXT_STATUS: Record<string, string> = { requested: "sample_collected", sample_collected: "processing", processing: "completed" };
const NEXT_LABEL: Record<string, string> = { requested: "Collect Sample", sample_collected: "Start Processing", processing: "Mark Complete" };

const EMPTY_FORM = { patient: "", doctor: "", requestDate: new Date().toISOString().split("T")[0], urgent: false, tests: [] as string[] };

export default function LabPage() {
  const { records, loading, create, update } = useBusinessRecords("lab_test");
  const patientStore = useBusinessRecords("patient");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newTest, setNewTest] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resultsDraft, setResultsDraft] = useState("");

  const tests = records.map(r => ({
    id: r.id,
    labNo: (r.data?.labNo as string) || r.title,
    patient: r.title,
    doctor: (r.data?.doctor as string) || "",
    tests: (r.data?.tests as string[]) || [],
    requestDate: r.date || (r.data?.requestDate as string) || "",
    status: r.status || "requested",
    urgent: Boolean(r.data?.urgent),
    results: (r.data?.results as string) || "",
  }));

  const today = tests.filter(t => t.requestDate === new Date().toISOString().split("T")[0]).length;
  const processing = tests.filter(t => t.status === "processing").length;
  const completed = tests.filter(t => t.status === "completed").length;
  const urgent = tests.filter(t => t.urgent && t.status !== "completed").length;

  const filtered = filterStatus === "all" ? tests : tests.filter(t => t.status === filterStatus);

  async function advanceStatus(id: string, currentStatus: string) {
    if (currentStatus === "completed") return;
    const lab = tests.find(test => test.id === id);
    if (!lab) return;
    const next = NEXT_STATUS[currentStatus];
    if (next === "completed" && !lab.results.trim()) {
      toast("Add lab results before marking this request complete.");
      return;
    }
    await update(id, { status: next });
  }

  async function saveResults(id: string, results: string) {
    if (!results.trim()) {
      toast.error("Results text is required.");
      return;
    }
    await update(id, { data: { results: results.trim() } });
    setEditingId(null);
    setResultsDraft("");
  }

  function addTestItem() {
    if (!newTest.trim()) return;
    setForm(f => ({ ...f, tests: [...f.tests, newTest.trim()] }));
    setNewTest("");
  }

  async function save() {
    if (!form.patient.trim()) return setFormError("Patient name is required.");
    if (!form.doctor.trim()) return setFormError("Doctor name is required.");
    if (!form.requestDate) return setFormError("Request date is required.");
    const patientExists = patientStore.records.some(record => record.title.toLowerCase() === form.patient.trim().toLowerCase());
    if (!patientExists) return setFormError("Create the patient record first.");
    const cleanedTests = form.tests.map(test => test.trim()).filter(Boolean);
    if (cleanedTests.length === 0) return setFormError("Add at least one test.");
    const duplicateTests = new Set(cleanedTests.map(test => test.toLowerCase()));
    if (duplicateTests.size !== cleanedTests.length) return setFormError("Duplicate tests are not allowed in one request.");
    setFormError("");
    await create({ title: form.patient.trim(), status: "requested", date: form.requestDate, data: { labNo: `LAB-${500 + records.length + 1}`, doctor: form.doctor.trim(), tests: cleanedTests, requestDate: form.requestDate, urgent: form.urgent, results: "" } });
    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: ff, padding: "28px 32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Lab Tests</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Laboratory requests and results management</p>
        </div>
        <button onClick={() => { setFormError(""); setShowModal(true); }}
          style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: ff }}>
          + New Lab Request
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Today's Tests", value: today, color: "#a78bfa" },
          { label: "Processing", value: processing, color: "#3b82f6" },
          { label: "Completed", value: completed, color: "#22c55e" },
          { label: "Urgent Pending", value: urgent, color: "#ef4444" },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["all", "requested", "sample_collected", "processing", "completed"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${filterStatus === s ? statusColors[s] || "#3b82f6" : border}`, background: filterStatus === s ? `${statusColors[s] || "#3b82f6"}18` : bg, color: filterStatus === s ? statusColors[s] || "#3b82f6" : "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: ff, fontSize: 12 }}>
            {s === "all" ? "All" : statusLabels[s]}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.4)" }}>Loading...</div>}

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && !loading && (
          <div style={{ ...card, textAlign: "center", padding: 40, color: "rgba(255,255,255,0.25)" }}>No lab tests found.</div>
        )}
        {filtered.map(t => (
          <div key={t.id} style={{ ...card, border: t.urgent && t.status !== "completed" ? "1px solid rgba(239,68,68,0.35)" : `1px solid ${border}`, background: t.urgent && t.status !== "completed" ? "rgba(239,68,68,0.04)" : bg }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700 }}>{t.labNo}</span>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.patient}</span>
                  {t.urgent && <span style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>URGENT</span>}
                  <span style={{ background: `${statusColors[t.status]}22`, color: statusColors[t.status], padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{statusLabels[t.status]}</span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{t.doctor} &nbsp;·&nbsp; Requested: {t.requestDate}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {t.tests.map((test, i) => (
                    <span key={i} style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>{test}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                {t.status !== "completed" && (
                  <button onClick={() => advanceStatus(t.id, t.status)}
                    style={{ padding: "7px 14px", background: `${statusColors[NEXT_STATUS[t.status]]}22`, border: `1px solid ${statusColors[NEXT_STATUS[t.status]]}44`, color: statusColors[NEXT_STATUS[t.status]], borderRadius: 7, cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}>
                    {NEXT_LABEL[t.status]}
                  </button>
                )}
                <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  style={{ padding: "7px 14px", background: bg, border: `1px solid ${border}`, color: "rgba(255,255,255,0.5)", borderRadius: 7, cursor: "pointer", fontFamily: ff, fontSize: 12 }}>
                  {expandedId === t.id ? "Hide" : "View Results"}
                </button>
              </div>
            </div>
            {expandedId === t.id && t.results && (
              <div style={{ marginTop: 14, padding: 14, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 600, marginBottom: 4 }}>Results:</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{t.results}</div>
              </div>
            )}
            {expandedId === t.id && !t.results && (
              <div style={{ marginTop: 14, padding: 14, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Results not yet available.
              </div>
            )}
            {expandedId === t.id && t.status !== "completed" && (
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                {editingId === t.id ? (
                  <div style={{ width: "100%", display: "grid", gap: 8 }}>
                    <textarea
                      value={resultsDraft}
                      onChange={(e) => setResultsDraft(e.target.value)}
                      placeholder="Enter lab results"
                      style={{ width: "100%", minHeight: 88, resize: "vertical", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontFamily: ff, fontSize: 13, boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => void saveResults(t.id, resultsDraft)}
                        style={{ padding: "7px 14px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", borderRadius: 7, cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}
                      >
                        Save Results
                      </button>
                      <button
                        onClick={() => { setEditingId(null); setResultsDraft(""); }}
                        style={{ padding: "7px 14px", background: bg, border: `1px solid ${border}`, color: "rgba(255,255,255,0.6)", borderRadius: 7, cursor: "pointer", fontFamily: ff, fontSize: 12 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingId(t.id); setResultsDraft(t.results || ""); }}
                    style={{ padding: "7px 14px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", borderRadius: 7, cursor: "pointer", fontFamily: ff, fontSize: 12, fontWeight: 600 }}
                  >
                    {t.results ? "Update Results" : "Add Results"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 32, width: 520, maxHeight: "85vh", overflowY: "auto", fontFamily: ff }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>New Lab Request</h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.26)", borderRadius: 8, color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
              {([["Patient Name", "patient"], ["Doctor", "doctor"], ["Request Date", "requestDate"]] as [string, string][]).map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{label}</label>
                  <input type={key === "requestDate" ? "date" : "text"} value={String((form as Record<string,unknown>)[key] ?? "")} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={form.urgent} onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))} id="urgent" />
                <label htmlFor="urgent" style={{ fontSize: 14, color: "#ef4444", fontWeight: 600, cursor: "pointer" }}>Mark as Urgent</label>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Add Test</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={newTest} onChange={e => setNewTest(e.target.value)} onKeyDown={e => e.key === "Enter" && addTestItem()} placeholder="e.g. CBC, Lipid Profile..."
                    style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", fontFamily: ff, fontSize: 14 }} />
                  <button onClick={addTestItem} style={{ padding: "9px 16px", background: "rgba(59,130,246,0.15)", border: `1px solid rgba(59,130,246,0.3)`, color: "#3b82f6", borderRadius: 8, cursor: "pointer", fontFamily: ff, fontSize: 14 }}>Add</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {form.tests.map((t, i) => (
                    <span key={i} style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", padding: "4px 10px", borderRadius: 6, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      {t}
                      <span onClick={() => setForm(f => ({ ...f, tests: f.tests.filter((_, idx) => idx !== i) }))} style={{ cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>✕</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontFamily: ff, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Submit Request</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,0.6)", fontFamily: ff, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
