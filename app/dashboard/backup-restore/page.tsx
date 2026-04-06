"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Backup = {
  id: string;
  fileName: string;
  fileSize?: number;
  backupType: string;
  status: string;
  createdAt: string;
};

type AuthUser = {
  id?: string;
  role?: string;
  permissions?: (string | { permission?: string })[];
  rolePermissions?: (string | { permission?: string })[];
};

function userHasPerm(user: AuthUser | null, perm: string): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const p = perm.toUpperCase();
  return !!(
    user.permissions?.some(x => (typeof x === "string" ? x : x.permission || "").toUpperCase() === p) ||
    user.rolePermissions?.some(x => (typeof x === "string" ? x : x.permission || "").toUpperCase() === p)
  );
}

export default function BackupRestorePage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const user = getCurrentUser();
  const canAccess = userHasPerm(user, "BACKUP_RESTORE");

  useEffect(() => { loadBackups(); }, []);

  function flash(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  }

  async function loadBackups() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup", {
        headers: { "x-user-role": user?.role || "", "x-user-id": user?.id || "" },
      });
      const data = await res.json();
      if (Array.isArray(data)) setBackups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    if (!await confirmToast("Create a full backup of all company data?")) return;
    setCreating(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "", "x-user-id": user?.id || "" },
        body: JSON.stringify({ backupType: "FULL" }),
      });
      const j = await res.json();
      if (res.ok) {
        flash("Backup created successfully!");
        await loadBackups();
      } else {
        flash(j.error || "Backup failed", false);
      }
    } catch {
      flash("Backup failed", false);
    } finally {
      setCreating(false);
    }
  }

  function downloadBackup(id: string, fileName: string) {
    const url = `/api/backup/download?id=${id}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    // Pass auth headers via a fetch + blob approach
    fetch(url, { headers: { "x-user-role": user?.role || "", "x-user-id": user?.id || "" } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => flash("Download failed", false));
  }

  async function restoreBackup(id: string, fileName: string) {
    if (!await confirmToast(`Restore from "${fileName}"?\n\nThis will REPLACE all current data. Are you sure?`)) return;
    setRestoringId(id);
    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "", "x-user-id": user?.id || "" },
        body: JSON.stringify({ backupId: id }),
      });
      const j = await res.json();
      if (res.ok) {
        flash("Data restored successfully! Reloading...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        flash(j.error || "Restore failed", false);
      }
    } catch {
      flash("Restore failed", false);
    } finally {
      setRestoringId(null);
    }
  }

  function fmtSize(bytes?: number) {
    if (!bytes) return "Ã¢â‚¬â€";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ styles Ã¢â€â‚¬Ã¢â€â‚¬ */
  const card: React.CSSProperties = {
    borderRadius: 14, background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px",
  };
  const btn = (color: string, disabled?: boolean): React.CSSProperties => ({
    padding: "9px 18px", borderRadius: 9, border: "none",
    background: disabled ? "rgba(255,255,255,0.06)" : color,
    color: disabled ? "rgba(255,255,255,0.3)" : "white",
    fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "opacity .15s",
  });

  if (!canAccess) return (
    <div style={{ padding: 32, color: "#f87171", textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>Ã°Å¸â€â€™</div>
      <div style={{ fontWeight: 700 }}>Access Denied</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>You do not have permission to access Backup & Restore.</div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto", fontFamily: "inherit" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 4px" }}>Data Backup & Restore</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            Backups are stored securely in the database. Download as JSON or restore anytime.
          </p>
        </div>
        <button onClick={createBackup} disabled={creating} style={btn("linear-gradient(135deg,#4f46e5,#6366f1)", creating)}>
          {creating ? "CreatingÃ¢â‚¬Â¦" : "+ Create Backup"}
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div style={{ ...card, background: msg.ok ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${msg.ok ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`, color: msg.ok ? "#34d399" : "#f87171", marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      {/* Info banner */}
      <div style={{ ...card, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 20 }}>Ã¢â€žÂ¹Ã¯Â¸Â</span>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
          <strong style={{ color: "white" }}>How it works:</strong> Backups include all your accounts, invoices, vouchers, inventory, HR records and more.
          Stored in the database Ã¢â‚¬â€ no external storage needed. Download the JSON file to keep an offline copy.
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {["File Name", "Type", "Size", "Status", "Created", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: ".08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>LoadingÃ¢â‚¬Â¦</td></tr>
            ) : backups.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No backups yet. Click "+ Create Backup" to get started.</td></tr>
            ) : backups.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "12px", color: "rgba(255,255,255,0.75)", fontFamily: "monospace", fontSize: 12 }}>{b.fileName}</td>
                <td style={{ padding: "12px", color: "rgba(255,255,255,0.5)" }}>{b.backupType}</td>
                <td style={{ padding: "12px", color: "rgba(255,255,255,0.5)" }}>{fmtSize(b.fileSize)}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: b.status === "COMPLETED" ? "rgba(52,211,153,0.12)" : b.status === "FAILED" ? "rgba(248,113,113,0.12)" : "rgba(251,191,36,0.12)",
                    color: b.status === "COMPLETED" ? "#34d399" : b.status === "FAILED" ? "#f87171" : "#fbbf24",
                  }}>{b.status}</span>
                </td>
                <td style={{ padding: "12px", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  {new Date(b.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: "12px" }}>
                  {b.status === "COMPLETED" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => downloadBackup(b.id, b.fileName)}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#a5b4fc", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                      >
                        Ã¢Â¬â€¡ Download
                      </button>
                      <button
                        onClick={() => restoreBackup(b.id, b.fileName)}
                        disabled={restoringId === b.id}
                        style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: restoringId === b.id ? "rgba(255,255,255,0.3)" : "#f87171", fontSize: 12, cursor: restoringId === b.id ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: 600 }}
                      >
                        {restoringId === b.id ? "RestoringÃ¢â‚¬Â¦" : "Ã¢â€ Âº Restore"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
