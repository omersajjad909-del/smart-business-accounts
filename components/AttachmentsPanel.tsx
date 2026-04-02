"use client";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

function fileIcon(type: string): string {
  if (type.startsWith("image/"))  return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("word"))      return "📝";
  if (type.includes("excel") || type.includes("sheet") || type === "text/csv") return "📊";
  return "📎";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  entityType: string;
  entityId: string;
  compact?: boolean;
}

export default function AttachmentsPanel({ entityType, entityId, compact = false }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const getHeaders = (): Record<string, string> => {
    const user = getCurrentUser();
    return user ? { "x-company-id": user.companyId || "", "x-user-id": user.id } : {};
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attachments?entityType=${entityType}&entityId=${entityId}`, { headers: getHeaders() });
      if (res.ok) setAttachments(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (entityId) load(); }, [entityType, entityId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("entityType", entityType);
        fd.append("entityId", entityId);
        const res = await fetch("/api/attachments", { method: "POST", headers: getHeaders(), body: fd });
        if (!res.ok) { const d = await res.json(); setError(d.error || "Upload failed"); }
      }
      await load();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this attachment?")) return;
    await fetch(`/api/attachments?id=${id}`, { method: "DELETE", headers: getHeaders() });
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {!compact && (
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span>📎</span> Attachments
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", background: "var(--panel-bg)", padding: "2px 8px", borderRadius: 20, border: "1px solid var(--border)" }}>
            {attachments.length}
          </span>
        </div>
      )}

      {/* Drop zone / Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        style={{
          border: "1.5px dashed var(--border)", borderRadius: 10, padding: compact ? "10px" : "16px",
          textAlign: "center", cursor: "pointer", marginBottom: 12,
          background: "rgba(99,102,241,0.03)", transition: "border-color .2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={e => handleUpload(e.target.files)}
          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
        {uploading ? (
          <div style={{ color: "#6366f1", fontSize: 12, fontWeight: 600 }}>Uploading…</div>
        ) : (
          <>
            <div style={{ fontSize: 18, marginBottom: 4 }}>📎</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {compact ? "Click or drop to attach" : "Click to browse or drag & drop files here"}
            </div>
            {!compact && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, opacity: 0.6 }}>PDF, Word, Excel, Images — max 10 MB each</div>}
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#f87171", marginBottom: 10, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>Loading…</div>
      ) : attachments.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "8px 0", opacity: 0.6 }}>No attachments yet</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {attachments.map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 9 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{fileIcon(a.fileType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                  {a.fileName}
                </a>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                  {formatBytes(a.fileSize)} · {new Date(a.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <a href={a.fileUrl} target="_blank" rel="noreferrer" download title="Download"
                style={{ color: "var(--text-muted)", fontSize: 14, textDecoration: "none", flexShrink: 0 }}>⬇</a>
              <button onClick={() => handleDelete(a.id)} title="Delete"
                style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 15, padding: "0 2px", flexShrink: 0, lineHeight: 1, fontFamily: FONT }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
