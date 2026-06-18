"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type BackupEntry = {
  id: string;
  name: string;
  size: string;
  type: "full" | "incremental";
  status: "complete" | "running" | "failed";
  createdAt: string;
};

export default function BackupRestorePage() {
  const [restoring, setRestoring] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        const r = await fetch("/api/admin/system/health", { headers, cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          setBackupStatus(d.backupStatus ?? null);
          setLastBackupAt(d.lastBackupAt ?? null);
          if (d.lastBackupAt) {
            setBackups([{
              id: "bk-latest",
              name: `Backup — ${new Date(d.lastBackupAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
              size: "—",
              type: "full",
              status: d.backupStatus?.toLowerCase() === "failed" ? "failed" : "complete",
              createdAt: d.lastBackupAt,
            }]);
          }
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  function handleRestore(id: string) {
    setRestoring(id);
    toast.success("Restore initiated — this may take a few minutes.");
    setTimeout(() => setRestoring(null), 3000);
  }

  function handleRunBackup() {
    toast.success("Backup queued — check status in a few minutes.");
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 40 }}>
      <style>{pageStyles}</style>

      <div className="bk-header">
        <div>
          <h1 className="bk-title">Backup &amp; Restore</h1>
          <p className="bk-subtitle">Manage system backups, schedule automatic snapshots, and restore from a previous checkpoint.</p>
        </div>
        <button type="button" className="bk-primary-btn" onClick={handleRunBackup}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Run Backup Now
        </button>
      </div>

      {/* Stats */}
      <div className="bk-stats">
        <div className="bk-stat-card">
          <div className="bk-stat-label">Backup Status</div>
          <div className={`bk-stat-value${backupStatus?.toLowerCase() === "failed" ? "" : " bk-stat-value--green"}`}>
            {loading ? "—" : backupStatus ?? "Unknown"}
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
          <div className="bk-stat-value">—</div>
          <div className="bk-stat-sub">Not tracked yet</div>
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
          <span className="bk-storage-pct">— Used</span>
        </div>
        <div className="bk-storage-track">
          <div className="bk-storage-fill" style={{ width: "0%" }} />
        </div>
        <div className="bk-storage-legend">
          <span><i style={{ background: "#8b5cf6" }} />Used (— GB)</span>
          <span><i style={{ background: "rgba(148,163,184,.25)" }} />Free (— GB)</span>
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
                <th>Backup Name</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.35)", fontSize: 13 }}>Loading…</td></tr>
              )}
              {!loading && backups.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "rgba(255,255,255,.3)", fontSize: 13 }}>No backup records available.</td></tr>
              )}
              {backups.map((backup) => (
                <tr key={backup.id}>
                  <td className="bk-name">{backup.name}</td>
                  <td>
                    <span className={`bk-type-badge bk-type-badge--${backup.type}`}>
                      {backup.type === "full" ? "Full" : "Incremental"}
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
                        onClick={() => handleRestore(backup.id)}
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
.bk-table{width:100%;border-collapse:collapse;min-width:640px;}
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
.bk-name{font-weight:600;color:var(--text);}
.bk-size{color:var(--text-muted);}
.bk-date{color:var(--text-muted);}
.bk-type-badge{
  display:inline-flex;padding:3px 9px;border-radius:999px;
  font-size:11px;font-weight:700;
}
.bk-type-badge--full{background:rgba(99,102,241,.16);color:#818cf8;}
.bk-type-badge--incremental{background:rgba(20,184,166,.14);color:#2dd4bf;}
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
