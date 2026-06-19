"use client";

import { useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

interface Props {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = "Product Image" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const user = getCurrentUser();
  const headers: Record<string, string> = {
    "x-user-id":    user?.id        || "",
    "x-user-role":  user?.role      || "ADMIN",
    "x-company-id": user?.companyId || "",
  };

  async function handleFile(file: File) {
    setError("");
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2 MB"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { setError("Only JPEG, PNG, WebP, or GIF"); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", headers, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!value) return;
    onChange(null);
    try {
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ url: value }),
      });
    } catch { /* best-effort delete */ }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </label>

      {value ? (
        /* ── Preview ── */
        <div style={{ position: "relative", display: "inline-block", width: 120, height: 120 }}>
          <img
            src={value}
            alt="product"
            style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)" }}
          />
          <button
            type="button"
            onClick={handleRemove}
            title="Remove image"
            style={{
              position: "absolute", top: -8, right: -8,
              width: 22, height: 22, borderRadius: "50%",
              background: "#ef4444", border: "2px solid #0f172a",
              color: "#fff", fontSize: 11, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              position: "absolute", bottom: -8, right: -8,
              padding: "3px 8px", borderRadius: 6,
              background: "rgba(99,102,241,.9)", border: "none",
              color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer",
            }}
          >
            Change
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          style={{
            width: 120, height: 120, borderRadius: 10,
            border: "2px dashed rgba(99,102,241,.4)",
            background: "rgba(99,102,241,.04)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 6,
            cursor: uploading ? "wait" : "pointer",
            transition: "border-color .15s",
          }}
        >
          {uploading ? (
            <>
              <div style={{ fontSize: 22 }}>⏳</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>Uploading…</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 24, opacity: .5 }}>🖼</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", textAlign: "center", lineHeight: 1.4 }}>
                Click or drag<br />to upload
              </div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)" }}>Max 2 MB</div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {error && (
        <div style={{ fontSize: 11, color: "#f87171", padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
