"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { confirmToast } from "@/lib/toast-feedback";
import toast from "react-hot-toast";

type BackupEntry = {
  id: string;
  name: string;
  fileName: string;
  companyId: string;
  companyName: string | null;
  size: string;
  type: "full" | "incremental" | "safety";
  status: "complete" | "running" | "failed";
  createdAt: string;
};

/** PRE_RESTORE snapshots are the automatic undo point taken before a restore. */
function backupKind(backupType: string): BackupEntry["type"] {
  const t = String(backupType).toUpperCase();
  if (t === "PRE_RESTORE") return "safety";
  if (t === "PARTIAL") return "incremental";
  return "full";
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function BackupRestorePage() {
  const [restoring, setRestoring] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    try {
      const u = getCurrentUser();
      const headers: Record<string, string> = {};
      if (u?.role) headers["x-user-role"] = u.role;
      if (u?.id) headers["x-user-id"] = u.id;

      const r = await fetch("/api/admin/system/backup", { headers, cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        const rows: BackupEntry[] = (d.backups || []).map((b: any) => ({
          id: b.id,
          name: b.companyName || "Unknown company",
          fileName: b.fileName,
          companyId: b.companyId,
          companyName: b.companyName ?? null,
          size: formatBytes(b.fileSize),
          type: backupKind(b.backupType),
          status:
            String(b.status).toUpperCase() === "FAILED"
              ? "failed"
              : String(b.status).toUpperCase() === "PENDING"
              ? "running"
              : "complete",
          createdAt: b.createdAt,
        }));
        setBackups(rows);
        setTotalBytes(d.totalBytes || 0);
        setBackupStatus(d.backups?.[0]?.status ?? null);
        setLastBackupAt(d.backups?.[0]?.createdAt ?? null);
      }
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleRestore(backup: BackupEntry) {
    if (restoring) return;

    const label = backup.companyName || "this company";
    const ok = await confirmToast(
      `Restore "${backup.fileName}" into ${label}?\n\n` +
        `Company ID: ${backup.companyId}\n\n` +
        `Everything that company currently holds will be replaced by this snapshot. ` +
        `A safety snapshot of the current data is taken first, and if anything goes ` +
        `wrong the whole restore is rolled back.`,
      "Restore tenant data"
    );
    if (!ok) return;

    setRestoring(backup.id);
    const t = toast.loading(`Restoring ${label}…`);
    try {
      const u = getCurrentUser();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (u?.role) headers["x-user-role"] = u.role;
      if (u?.id) headers["x-user-id"] = u.id;

      const r = await fetch("/api/admin/system/backup/restore", {
        method: "POST",
        headers,
        // Echo the company id back so a stale row cannot restore into the wrong tenant.
        body: JSON.stringify({ backupId: backup.id, confirmCompanyId: backup.companyId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Restore failed");

      toast.success(d.message || `${label} restored.`, { id: t, duration: 6000 });
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Restore failed", { id: t, duration: 8000 });
    } finally {
      setRestoring(null);
    }
  }

  async function handleRunBackup() {
    if (running) return;
    setRunning(true);
    const t = toast.loading("Running backup…");
    try {
      const u = getCurrentUser();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (u?.role) headers["x-user-role"] = u.role;
      if (u?.id) headers["x-user-id"] = u.id;

      const r = await fetch("/api/admin/system/backup", { method: "POST", headers });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Backup failed");

      if (d.failed > 0) {
        toast.error(`Backup finished with ${d.failed} failure${d.failed > 1 ? "s" : ""} (${d.ran} succeeded).`, { id: t });
      } else if (d.ran === 0) {
        toast.success(d.message || "No active companies to back up.", { id: t });
      } else if (d.created === 0) {
        // Every company matched its existing snapshot — nothing was stored twice.
        toast.success(`All ${d.unchanged} compan${d.unchanged > 1 ? "ies" : "y"} already up to date — no new snapshots needed.`, { id: t });
      } else {
        const tail = d.unchanged ? `, ${d.unchanged} unchanged` : "";
        toast.success(`Backup complete — ${d.created} new snapshot${d.created > 1 ? "s" : ""}${tail}.`, { id: t });
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Backup failed", { id: t });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 40 }}>
      <style>{pageStyles}</style>

      <div className="bk-header">
        <div>
          <h1 className="bk-title">Backup &amp; Restore</h1>
          <p className="bk-subtitle">Manage system backups, schedule automatic snapshots, and restore from a previous checkpoint.</p>
        </div>
        <button type="button" className="bk-primary-btn" onClick={handleRunBackup} disabled={running}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {running ? "Running…" : "Run Backup Now"}
        </button>
      </div>

      {/* Stats */}
      <div className="bk-stats">
        <div className="bk-stat-card">
          <div className="bk-stat-label">Backup Status</div>
          <div className={`bk-stat-value${backupStatus?.toLowerCase() === "failed" ? "" : " bk-stat-value--green"}`}>
            {loading ? "—" : backupStatus ?? "No backups yet"}
          </div>
          <div className="bk-stat-sub">Latest snapshot</div>
        </div>
        <div className="bk-stat-card">
          <div className="bk-stat-label">Last Backup</div>
          <div className="bk-stat-value" style={{ fontSize: 18 }}>
            {loading ? "—" : lastBackupAt ? new Date(lastBackupAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
          </div>
          <div className="bk-stat-sub">{lastBackupAt ? new Date(lastBackupAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</div>
        </div>
        <div className="bk-stat-card">
          <div className="bk-stat-label">Storage Used</div>
          <div className="bk-stat-value" style={{ fontSize: 22 }}>{loading ? "—" : formatBytes(totalBytes)}</div>
          <div className="bk-stat-sub">Across all snapshots</div>
        </div>
        <div className="bk-stat-card">
          <div className="bk-stat-label">Total Backups</div>
          <div className="bk-stat-value">{loading ? "—" : backups.length}</div>
          <div className="bk-stat-sub">{backups.filter(b => b.status === "complete").length} successful</div>
        </div>
      </div>

      {/* Storage bar */}
      <div className="bk-card bk-storage-card">
        <div className="bk-storage-head">
          <span className="bk-section-title">Storage Overview</span>
          <span className="bk-storage-pct">{loading ? "—" : formatBytes(totalBytes)} Used</span>
        </div>
        <div className="bk-storage-track">
          <div className="bk-storage-fill" style={{ width: "0%" }} />
        </div>
        <div className="bk-storage-legend">
          <span><i style={{ background: "#8b5cf6" }} />Used ({loading ? "—" : formatBytes(totalBytes)})</span>
          <span><i style={{ background: "rgba(148,163,184,.25)" }} />{backups.length} snapshot{backups.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Backup list */}
      <div className="bk-card">
        <div className="bk-list-head">
          <span className="bk-section-title">Backup History</span>
          <span className="bk-count">{loading ? "—" : `${backups.length} snapshot${backups.length !== 1 ? "s" : ""}`}</span>
        </div>
        <div className="bk-table-wrap">
          <table className="bk-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Company ID</th>
                <th>Backup File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading…</td></tr>
              )}
              {!loading && backups.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.3)", fontSize: 13 }}>No backup records available.</td></tr>
              )}
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td className="bk-name">{backup.name}</td>
                  <td>
                    {/* Full id, click to copy — so a bad restore can be traced back
                        to an exact company without guessing from the name. */}
                    <button
                      type="button"
                      className="bk-cid"
                      title={`Copy company ID ${backup.companyId}`}
                      onClick={() => {
                        navigator.clipboard?.writeText(backup.companyId);
                        toast.success("Company ID copied");
                      }}
                    >
                      {backup.companyId}
                    </button>
                  </td>
                  <td className="bk-file">{backup.fileName}</td>
                  <td>
                    <span className={`bk-type-badge bk-type-badge--${backup.type}`}>
                      {backup.type === "full" ? "Full" : backup.type === "safety" ? "Pre-restore" : "Incremental"}
                    </span>
                  </td>
                  <td className="bk-size">{backup.size}</td>
                  <td>
                    <span className={`bk-status-badge bk-status-badge--${backup.status}`}>
                      {backup.status === "complete" ? "✓ Complete" : backup.status === "running" ? "⟳ Running" : "✗ Failed"}
                    </span>
                  </td>
                  <td className="bk-date">{new Date(backup.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td>
                    {backup.status === "complete" ? (
                      <button
                        type="button"
                        className="bk-restore-btn"
                        disabled={restoring !== null}
                        onClick={() => handleRestore(backup)}
                      >
                        {restoring === backup.id ? "Restoring…" : "Restore"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const pageStyles = `
.bk-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
.bk-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.bk-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.bk-primary-btn{
  display:inline-flex;align-items:center;gap:8px;
  padding:11px 18px;border-radius:14px;border:none;cursor:pointer;
  background:linear-gradient(135deg,#6d28d9,#8b5cf6);
  color:#fff;font-size:13px;font-weight:700;
  box-shadow:0 8px 24px rgba(109,40,217,.3);
  transition:opacity .15s;white-space:nowrap;
}
.bk-primary-btn:hover{opacity:.88;}
.bk-primary-btn:disabled{opacity:.55;cursor:not-allowed;}
.bk-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px;}
.bk-stat-card{
  background:var(--panel);border:1px solid var(--border);
  border-radius:18px;padding:18px 20px;
}
.bk-stat-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text-muted);}
.bk-stat-value{margin-top:8px;font-size:30px;font-weight:800;color:var(--text);}
.bk-stat-value--purple{color:#a78bfa;}
.bk-stat-value--green{color:#4ade80;}
.bk-stat-sub{margin-top:4px;font-size:12px;color:var(--text-muted);}
.bk-card{background:var(--panel);border:1px solid var(--border);border-radius:20px;padding:20px;margin-bottom:16px;}
.bk-storage-card{margin-bottom:16px;}
.bk-storage-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;}
.bk-section-title{font-size:15px;font-weight:700;color:var(--text);}
.bk-storage-pct{font-size:13px;font-weight:700;color:#a78bfa;}
.bk-storage-track{height:10px;border-radius:999px;background:var(--border);overflow:hidden;margin-bottom:10px;}
.bk-storage-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#6d28d9,#8b5cf6);}
.bk-storage-legend{display:flex;gap:16px;font-size:12px;color:var(--text-muted);}
.bk-storage-legend span{display:inline-flex;align-items:center;gap:6px;}
.bk-storage-legend i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.bk-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;}
.bk-count{font-size:12px;color:var(--text-muted);}
.bk-table-wrap{overflow-x:auto;}
.bk-table{width:100%;border-collapse:collapse;min-width:940px;}
.bk-table th{
  padding:12px 14px;text-align:left;font-size:11px;font-weight:800;
  letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);
  border-bottom:1px solid var(--border);
}
.bk-table td{
  padding:14px 14px;font-size:13px;color:var(--text-soft);
  border-bottom:1px solid var(--border);
}
.bk-table tbody tr:last-child td{border-bottom:none;}
.bk-table tbody tr:hover{background:var(--bg-soft);}
.bk-name{font-weight:600;color:var(--text);white-space:nowrap;}
.bk-file{color:var(--text-muted);font-size:12px;}
.bk-cid{
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:11px;letter-spacing:.02em;
  padding:3px 8px;border-radius:8px;
  border:1px solid var(--border);background:var(--bg-soft);
  color:var(--text-soft);cursor:pointer;white-space:nowrap;
  transition:border-color .12s,color .12s;
}
.bk-cid:hover{border-color:#8b5cf6;color:#a78bfa;}
.bk-size{color:var(--text-muted);}
.bk-date{color:var(--text-muted);}
.bk-type-badge{
  display:inline-flex;padding:3px 9px;border-radius:999px;
  font-size:11px;font-weight:700;
}
.bk-type-badge--full{background:rgba(99,102,241,.16);color:#818cf8;}
.bk-type-badge--incremental{background:rgba(20,184,166,.14);color:#2dd4bf;}
.bk-type-badge--safety{background:rgba(251,191,36,.14);color:#fbbf24;}
.bk-status-badge{
  display:inline-flex;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;
}
.bk-status-badge--complete{background:rgba(34,197,94,.14);color:#4ade80;}
.bk-status-badge--running{background:rgba(251,191,36,.14);color:#fbbf24;}
.bk-status-badge--failed{background:rgba(248,113,113,.14);color:#f87171;}
.bk-restore-btn{
  padding:6px 12px;border-radius:10px;border:1px solid var(--border);
  background:transparent;color:var(--text-soft);font-size:12px;font-weight:700;
  cursor:pointer;transition:background .12s;
}
.bk-restore-btn:hover:not(:disabled){background:var(--bg-soft);}
.bk-restore-btn:disabled{opacity:.5;cursor:not-allowed;}
@media(max-width:768px){.bk-stats{grid-template-columns:repeat(2,1fr);}}
@media(max-width:480px){.bk-stats{grid-template-columns:1fr;}}
`;
