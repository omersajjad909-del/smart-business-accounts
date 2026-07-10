"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Incident = {
  id: string;
  severity: "P1" | "P2" | "P3" | "P4";
  category: "DATA_BREACH" | "UNAUTHORIZED_ACCESS" | "SYSTEM_OUTAGE" | "OTHER";
  title: string;
  summary: string;
  affectedScope: string | null;
  status: "DETECTED" | "NOTIFYING" | "NOTIFIED" | "RESOLVED";
  detectedAt: string;
  deadlineAt: string;
  notifiedAt: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  notificationCount: number;
  lastNotifyError: string | null;
  createdAt: string;
};

type Summary = { DETECTED: number; NOTIFYING: number; NOTIFIED: number; RESOLVED: number };

const F = "'Outfit','Inter',sans-serif";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

const SEVERITY_COLOR: Record<Incident["severity"], string> = {
  P1: "#f87171",
  P2: "#fb923c",
  P3: "#fbbf24",
  P4: "#94a3b8",
};

const STATUS_COLOR: Record<Incident["status"], string> = {
  DETECTED: "#fbbf24",
  NOTIFYING: "#818cf8",
  NOTIFIED: "#34d399",
  RESOLVED: "#64748b",
};

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function hoursUntil(d: string): number {
  return (new Date(d).getTime() - Date.now()) / 3600000;
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

export default function AdminSecurityIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<Summary>({ DETECTED: 0, NOTIFYING: 0, NOTIFIED: 0, RESOLVED: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filterStatus ? `?status=${filterStatus}` : "";
      const r = await fetch(`/api/admin/security-incidents${q}`, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setIncidents(data.incidents || []);
        setSummary(data.summary || { DETECTED: 0, NOTIFYING: 0, NOTIFIED: 0, RESOLVED: 0 });
      } else {
        toast.error("Failed to load incidents");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const dueSoon = useMemo(
    () => incidents.filter((i) => (i.status === "DETECTED" || i.status === "NOTIFYING") && hoursUntil(i.deadlineAt) < 24),
    [incidents],
  );

  return (
    <div style={{ fontFamily: F, paddingBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Security Incidents</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: "6px 0 0", maxWidth: 620 }}>
            Log and track data-breach or security incidents. The <code style={{ color: "#818cf8", background: "rgba(129,140,248,.1)", padding: "1px 6px", borderRadius: 4 }}>breach-notify</code> cron enforces our 72-hour notification commitment automatically.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: showForm ? "rgba(255,255,255,.06)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
            color: "white", border: showForm ? `1px solid ${BORDER}` : "none",
            cursor: "pointer", boxShadow: showForm ? "none" : "0 4px 14px rgba(99,102,241,.3)",
          }}
        >
          {showForm ? "Cancel" : "＋ Log New Incident"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <StatBadge label="Detected" value={summary.DETECTED} color={STATUS_COLOR.DETECTED} />
        <StatBadge label="Notifying" value={summary.NOTIFYING} color={STATUS_COLOR.NOTIFYING} />
        <StatBadge label="Notified" value={summary.NOTIFIED} color={STATUS_COLOR.NOTIFIED} />
        <StatBadge label="Resolved" value={summary.RESOLVED} color={STATUS_COLOR.RESOLVED} />
      </div>

      {dueSoon.length > 0 && (
        <div style={{ background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.3)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>⚠ {dueSoon.length} incident(s) approaching 72-hour deadline</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)" }}>The breach-notify cron will fire notifications within the next hour.</div>
        </div>
      )}

      {showForm && <IncidentForm onDone={() => { setShowForm(false); load(); }} />}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase" }}>Filter:</span>
        {["", "DETECTED", "NOTIFYING", "NOTIFIED", "RESOLVED"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilterStatus(s)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: filterStatus === s ? "rgba(129,140,248,.15)" : "transparent",
              border: `1px solid ${filterStatus === s ? "rgba(129,140,248,.35)" : BORDER}`,
              color: filterStatus === s ? "#a5b4fc" : "rgba(255,255,255,.55)",
              cursor: "pointer",
            }}
          >
            {s || "ALL"}
          </button>
        ))}
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 13 }}>Loading incidents…</div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.4)", fontSize: 13 }}>No incidents recorded. That&apos;s a good thing.</div>
        ) : (
          incidents.map((i) => <IncidentRow key={i.id} incident={i} onChange={load} />)
        )}
      </div>
    </div>
  );
}

function IncidentForm({ onDone }: { onDone: () => void }) {
  const [severity, setSeverity] = useState<Incident["severity"]>("P2");
  const [category, setCategory] = useState<Incident["category"]>("DATA_BREACH");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [affectedScope, setAffectedScope] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch("/api/admin/security-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity, category, title, summary, affectedScope }),
      });
      if (r.ok) {
        toast.success("Incident logged. Countdown started.");
        onDone();
      } else {
        const data = await r.json().catch(() => ({}));
        toast.error(data.error || "Failed to log incident");
      }
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER}`,
    color: "#e2e8f0", fontSize: 13, fontFamily: F, outline: "none",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "rgba(255,255,255,.5)", textTransform: "uppercase", marginBottom: 6, display: "block" };

  return (
    <form onSubmit={submit} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 22, marginBottom: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>Severity</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as Incident["severity"])} style={inputStyle}>
            <option value="P1">P1 — Critical</option>
            <option value="P2">P2 — High</option>
            <option value="P3">P3 — Medium</option>
            <option value="P4">P4 — Low</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as Incident["category"])} style={inputStyle}>
            <option value="DATA_BREACH">Data Breach</option>
            <option value="UNAUTHORIZED_ACCESS">Unauthorized Access</option>
            <option value="SYSTEM_OUTAGE">System Outage</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unauthorized access to invoice PDFs" style={inputStyle} required />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>Affected Scope</label>
        <input value={affectedScope} onChange={(e) => setAffectedScope(e.target.value)} placeholder="e.g. 43 companies in EU region" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Summary</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What happened, what data was involved, mitigations already taken." rows={4} style={{ ...inputStyle, resize: "vertical" }} required />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={busy} style={{ padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "white", fontWeight: 700, fontSize: 13, border: "none", cursor: busy ? "wait" : "pointer" }}>
          {busy ? "Logging…" : "Log Incident (starts 72h timer)"}
        </button>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Notification will fire automatically before deadline.</span>
      </div>
    </form>
  );
}

function IncidentRow({ incident, onChange }: { incident: Incident; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState(incident.resolution || "");
  const [busy, setBusy] = useState(false);

  const hours = hoursUntil(incident.deadlineAt);
  const deadlineText = hours < 0
    ? `${Math.round(-hours)}h overdue`
    : hours < 24 ? `${Math.round(hours)}h left` : `${Math.round(hours / 24)}d left`;
  const deadlineColor = hours < 0 ? "#f87171" : hours < 24 ? "#fbbf24" : "rgba(255,255,255,.4)";

  async function updateStatus(status: Incident["status"], extra?: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/security-incidents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: incident.id, status, ...extra }),
      });
      if (r.ok) {
        toast.success(`Marked ${status}`);
        onChange();
      } else {
        toast.error("Update failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: F,
        }}
      >
        <span style={{
          padding: "3px 10px", borderRadius: 6, fontSize: 10.5, fontWeight: 800,
          background: `${SEVERITY_COLOR[incident.severity]}18`, border: `1px solid ${SEVERITY_COLOR[incident.severity]}45`,
          color: SEVERITY_COLOR[incident.severity], letterSpacing: ".04em", flexShrink: 0,
        }}>{incident.severity}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#e2e8f0" }}>{incident.title}</div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 3 }}>
            {incident.category.replace(/_/g, " ")} · Detected {fmt(incident.detectedAt)}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: deadlineColor, flexShrink: 0 }}>{incident.status === "RESOLVED" ? "—" : deadlineText}</span>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: 10.5, fontWeight: 700,
          background: `${STATUS_COLOR[incident.status]}18`, border: `1px solid ${STATUS_COLOR[incident.status]}40`,
          color: STATUS_COLOR[incident.status], letterSpacing: ".06em", flexShrink: 0,
        }}>{incident.status}</span>
      </button>

      {open && (
        <div style={{ padding: "0 20px 20px 20px", borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px 20px", padding: "16px 0", fontSize: 12.5 }}>
            <div style={{ color: "rgba(255,255,255,.4)" }}>Summary</div>
            <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>{incident.summary}</div>
            <div style={{ color: "rgba(255,255,255,.4)" }}>Affected scope</div>
            <div style={{ color: "#e2e8f0" }}>{incident.affectedScope || "—"}</div>
            <div style={{ color: "rgba(255,255,255,.4)" }}>72h deadline</div>
            <div style={{ color: "#e2e8f0" }}>{fmt(incident.deadlineAt)}</div>
            <div style={{ color: "rgba(255,255,255,.4)" }}>Notified at</div>
            <div style={{ color: "#e2e8f0" }}>
              {fmt(incident.notifiedAt)}
              {incident.notifiedAt && ` · ${incident.notificationCount} recipient(s)`}
              {incident.lastNotifyError && <span style={{ color: "#f87171", marginLeft: 8 }}>· last error: {incident.lastNotifyError}</span>}
            </div>
            {incident.resolvedAt && (
              <>
                <div style={{ color: "rgba(255,255,255,.4)" }}>Resolved at</div>
                <div style={{ color: "#e2e8f0" }}>{fmt(incident.resolvedAt)}</div>
              </>
            )}
            <div style={{ color: "rgba(255,255,255,.4)" }}>Reference ID</div>
            <div style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: 11 }}>{incident.id}</div>
          </div>

          {incident.status !== "RESOLVED" && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
              <input
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Resolution notes (optional)"
                style={{
                  flex: 1, minWidth: 260, padding: "8px 12px", borderRadius: 8,
                  background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER}`,
                  color: "#e2e8f0", fontSize: 12.5, fontFamily: F, outline: "none",
                }}
              />
              <button
                disabled={busy}
                onClick={() => updateStatus("RESOLVED", { resolution })}
                style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.35)", color: "#34d399", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
              >
                Mark Resolved
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
