"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast, alertToast } from "@/lib/toast-feedback";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  entityType: string;
  entityId: string;
  uploadedAt: string;
}

function fileIcon(type: string): string {
  if (type.startsWith("image/"))  return "Ã°Å¸â€“Â¼Ã¯Â¸Â";
  if (type === "application/pdf") return "Ã°Å¸â€œâ€ž";
  if (type.includes("word"))      return "Ã°Å¸â€œÂ";
  if (type.includes("excel") || type.includes("sheet") || type === "text/csv") return "Ã°Å¸â€œÅ ";
  return "Ã°Å¸â€œÅ½";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsPage() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("ALL");
  const [uploadModal, setUploadModal] = useState(false);
  const [entityType, setEntityType]   = useState("SalesInvoice");
  const [entityRef, setEntityRef]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const getHeaders = (): Record<string, string> => {
    const user = getCurrentUser();
    return user ? { "x-company-id": user.companyId || "", "x-user-id": user.id } : {};
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attachments", { headers: getHeaders() });
      if (res.ok) setAttachments(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("entityType", entityType);
        fd.append("entityId", entityRef || "general");
        const res = await fetch("/api/attachments", { method: "POST", headers: getHeaders(), body: fd });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Upload failed"); return; }
      }
      setUploadModal(false);
      setEntityRef("");
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirmToast("Delete this attachment?")) return;
    await fetch(`/api/attachments?id=${id}`, { method: "DELETE", headers: getHeaders() });
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const filtered = attachments.filter(a => {
    const matchSearch = !search.trim() || a.fileName.toLowerCase().includes(search.toLowerCase()) || a.entityType.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || (typeFilter === "PDF" && a.fileType === "application/pdf") || (typeFilter === "IMAGES" && a.fileType.startsWith("image/")) || (typeFilter === "SPREADSHEETS" && (a.fileType.includes("excel") || a.fileType.includes("sheet") || a.fileType === "text/csv")) || (typeFilter === "DOCUMENTS" && (a.fileType.includes("word") || a.fileType === "text/plain"));
    return matchSearch && matchType;
  });

  const kpis = {
    total: attachments.length,
    totalSize: attachments.reduce((s, a) => s + a.fileSize, 0),
    pdfs: attachments.filter(a => a.fileType === "application/pdf").length,
    images: attachments.filter(a => a.fileType.startsWith("image/")).length,
  };

  const ENTITY_TYPES = ["SalesInvoice", "PurchaseInvoice", "SalesOrder", "PurchaseOrder", "Quotation", "Expense", "Contract", "General"];
  const TYPE_TABS = ["ALL", "PDF", "IMAGES", "SPREADSHEETS", "DOCUMENTS"];

  const th: React.CSSProperties = { padding: "11px 14px", textAlign: "left", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.7, borderBottom: "1px solid var(--border)", fontWeight: 600 };
  const td: React.CSSProperties = { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid var(--border)", color: "var(--text-primary)", verticalAlign: "middle" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", padding: "32px 28px", fontFamily: FONT, color: "var(--text-primary)" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>Document Attachments</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Upload and manage files linked to your transactions</p>
        </div>
        <button
          onClick={() => setUploadModal(true)}
          style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Upload File
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Total Files", value: kpis.total, color: "#6366f1" },
          { label: "Total Size", value: formatBytes(kpis.totalSize), color: "#a5b4fc" },
          { label: "PDFs", value: kpis.pdfs, color: "#f87171" },
          { label: "Images", value: kpis.images, color: "#34d399" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 3, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 3 }}>
          {TYPE_TABS.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              background: typeFilter === t ? "#6366f1" : "transparent",
              color: typeFilter === t ? "#fff" : "var(--text-muted)",
              border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
            }}>{t}</button>
          ))}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search filesÃ¢â‚¬Â¦"
          style={{ flex: 1, minWidth: 200, background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 14px", color: "var(--text-primary)", fontSize: 13, fontFamily: FONT, outline: "none" }}
        />
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>Loading filesÃ¢â‚¬Â¦</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--text-muted)", fontSize: 15 }}>
            {search ? "No files match your search." : "No attachments yet Ã¢â‚¬â€ upload your first file."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["File", "Type", "Size", "Linked To", "Uploaded", "Actions"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 1 ? "rgba(255,255,255,0.013)" : "transparent" }}>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{fileIcon(a.fileType)}</span>
                      <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#a5b4fc", textDecoration: "none", fontSize: 13 }}>
                        {a.fileName}
                      </a>
                    </div>
                  </td>
                  <td style={{ ...td, fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {a.fileType.split("/")[1]?.toUpperCase() || a.fileType}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>{formatBytes(a.fileSize)}</td>
                  <td style={td}>
                    {a.entityType && a.entityType !== "General" ? (
                      <span style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: "#a5b4fc" }}>
                        {a.entityType}
                      </span>
                    ) : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>General</span>}
                  </td>
                  <td style={{ ...td, fontSize: 12, color: "var(--text-muted)" }}>{fmtDate(a.uploadedAt)}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={a.fileUrl} target="_blank" rel="noreferrer" download
                        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 7, padding: "4px 11px", fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>
                        Ã¢Â¬â€¡ Download
                      </a>
                      <button onClick={() => handleDelete(a.id)}
                        style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1, fontFamily: FONT }}>
                        Ãƒâ€”
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setUploadModal(false); setError(null); } }}
        >
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 18, width: "100%", maxWidth: 480, padding: "28px 32px", fontFamily: FONT }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 20px" }}>Upload File</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 6 }}>Link to Document Type</label>
              <select value={entityType} onChange={e => setEntityType(e.target.value)}
                style={{ width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 13px", color: "var(--text-primary)", fontSize: 14, fontFamily: FONT, outline: "none" }}>
                {ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {entityType !== "General" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 6 }}>Reference / ID (optional)</label>
                <input value={entityRef} onChange={e => setEntityRef(e.target.value)} placeholder="e.g. INV-1042 or record ID"
                  style={{ width: "100%", background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 13px", color: "var(--text-primary)", fontSize: 14, fontFamily: FONT, outline: "none", boxSizing: "border-box" }} />
              </div>
            )}

            {/* Drop zone */}
            <div
              onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{ border: "2px dashed var(--border)", borderRadius: 12, padding: "32px 20px", textAlign: "center", cursor: "pointer", marginBottom: 16, background: "rgba(99,102,241,0.03)" }}
            >
              <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={e => handleUpload(e.target.files)}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" />
              {uploading ? (
                <div style={{ color: "#6366f1", fontWeight: 600 }}>UploadingÃ¢â‚¬Â¦</div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>Ã°Å¸â€œÅ½</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Click or drag files here</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>PDF, Word, Excel, Images Ã¢â‚¬â€ max 10 MB each</div>
                </>
              )}
            </div>

            {error && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setUploadModal(false); setError(null); }}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 18px", fontSize: 13, cursor: "pointer", color: "var(--text-muted)", fontFamily: FONT }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
