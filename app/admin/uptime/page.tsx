"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

/**
 * Uptime the operator can actually see.
 *
 * The probe cron has been recording UptimeCheck rows for a while and /status
 * shows them to the public. Until this page there was no admin view, so a
 * visitor knew about an outage before we did.
 */

type Service = {
  serviceId: string;
  uptimePct: number | null;
  checks: number;
  failures: number;
  avgLatencyMs: number | null;
  maxLatencyMs: number | null;
  currentlyOk: boolean | null;
  lastCheckedAt: string | null;
  lastError: string | null;
};

type Failure = {
  id: string;
  serviceId: string;
  error: string | null;
  latencyMs: number | null;
  checkedAt: string;
};

type Data = {
  window: string;
  overallUptimePct: number | null;
  totalChecks: number;
  totalFailures: number;
  lastRunAt: string | null;
  services: Service[];
  recentFailures: Failure[];
};

const F = "'Outfit','Inter',sans-serif";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

const SERVICE_LABEL: Record<string, string> = {
  web: "Website",
  api: "API",
  db: "Database",
  reports: "Reports",
  email: "Email",
  backups: "Backups",
  cdn: "CDN",
  search: "Search",
};

const WINDOWS = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

function fmt(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function agoText(d: string | null): string {
  if (!d) return "never";
  const mins = (Date.now() - new Date(d).getTime()) / 60000;
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

/** Green only above 99.9%, amber where an SLA conversation starts, red below 99%. */
function uptimeColor(pct: number | null): string {
  if (pct === null) return "rgba(255,255,255,.35)";
  if (pct >= 99.9) return "#34d399";
  if (pct >= 99) return "#fbbf24";
  return "#f87171";
}

function Stat({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

export default function AdminUptimePage() {
  const [data, setData] = useState<Data | null>(null);
  const [windowKey, setWindowKey] = useState("24h");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (w: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/uptime?window=${w}`, { cache: "no-store" });
      if (!r.ok) throw new Error("Failed to load uptime");
      setData(await r.json());
    } catch {
      toast.error("Could not load uptime data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(windowKey); }, [load, windowKey]);

  // A probe that stopped running is itself an incident, and it looks identical
  // to "everything is fine" unless we say so.
  const proveStale = data?.lastRunAt
    ? (Date.now() - new Date(data.lastRunAt).getTime()) / 3600000 > 2
    : true;

  return (
    <div style={{ fontFamily: F, color: "white", padding: "28px 24px", maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Uptime</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: "6px 0 0" }}>
            What the probe has recorded — the same data the public status page shows
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              onClick={() => setWindowKey(w.key)}
              style={{
                padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontFamily: F,
                fontSize: 12, fontWeight: 700,
                background: windowKey === w.key ? "rgba(99,102,241,.18)" : CARD,
                border: `1px solid ${windowKey === w.key ? "rgba(99,102,241,.45)" : BORDER}`,
                color: windowKey === w.key ? "#a5b4fc" : "rgba(255,255,255,.5)",
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14, padding: "40px 0" }}>Loading…</div>
      ) : !data ? null : (
        <>
          {proveStale && (
            <div style={{
              background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.28)",
              borderRadius: 12, padding: "13px 16px", marginBottom: 18, fontSize: 13, lineHeight: 1.6,
            }}>
              <strong style={{ color: "#f87171" }}>Probe is not running.</strong>{" "}
              <span style={{ color: "rgba(255,255,255,.6)" }}>
                Last check {data.lastRunAt ? fmt(data.lastRunAt) : "never recorded"}. Until the
                cron at <code>/api/cron/uptime-probe</code> runs again, everything below is stale —
                a green row here does not mean the service is up.
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
            <Stat
              label={`Overall (${data.window})`}
              value={data.overallUptimePct === null ? "—" : `${data.overallUptimePct}%`}
              color={uptimeColor(data.overallUptimePct)}
            />
            <Stat label="Checks" value={String(data.totalChecks)} color="white" />
            <Stat
              label="Failures"
              value={String(data.totalFailures)}
              color={data.totalFailures > 0 ? "#f87171" : "#34d399"}
            />
            <Stat
              label="Last probe"
              value={agoText(data.lastRunAt)}
              color={proveStale ? "#f87171" : "#34d399"}
              sub={fmt(data.lastRunAt)}
            />
          </div>

          {/* Per service */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 22 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Service", "Now", `Uptime (${data.window})`, "Checks", "Failures", "Avg latency", "Peak", "Last checked"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.services.map((s, i) => (
                    <tr key={s.serviceId} style={{ borderBottom: i < data.services.length - 1 ? `1px solid rgba(255,255,255,.04)` : "none" }}>
                      <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600 }}>
                        {SERVICE_LABEL[s.serviceId] || s.serviceId}
                        {s.lastError ? (
                          <div style={{ fontSize: 11, color: "#f87171", marginTop: 3, maxWidth: 260 }}>{s.lastError}</div>
                        ) : null}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap",
                          background: s.currentlyOk === null ? "rgba(148,163,184,.12)" : s.currentlyOk ? "rgba(52,211,153,.13)" : "rgba(248,113,113,.13)",
                          color: s.currentlyOk === null ? "#94a3b8" : s.currentlyOk ? "#34d399" : "#f87171",
                        }}>
                          {s.currentlyOk === null ? "NO DATA" : s.currentlyOk ? "UP" : "DOWN"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 700, color: uptimeColor(s.uptimePct) }}>
                        {s.uptimePct === null ? "—" : `${s.uptimePct}%`}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12.5, color: "rgba(255,255,255,.55)" }}>{s.checks}</td>
                      <td style={{ padding: "13px 16px", fontSize: 12.5, color: s.failures > 0 ? "#f87171" : "rgba(255,255,255,.35)" }}>{s.failures}</td>
                      <td style={{ padding: "13px 16px", fontSize: 12.5, color: "rgba(255,255,255,.55)" }}>
                        {s.avgLatencyMs === null ? "—" : `${s.avgLatencyMs} ms`}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12.5, color: "rgba(255,255,255,.35)" }}>
                        {s.maxLatencyMs === null ? "—" : `${s.maxLatencyMs} ms`}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "rgba(255,255,255,.4)" }}>{agoText(s.lastCheckedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent failures — deliberately not limited to the selected window. */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Recent failures</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginBottom: 14 }}>
              Last 50 failed checks, regardless of the window above
            </div>

            {data.recentFailures.length === 0 ? (
              <div style={{ padding: "22px", textAlign: "center", border: `1px dashed ${BORDER}`, borderRadius: 10, color: "rgba(255,255,255,.35)", fontSize: 13 }}>
                No failed checks recorded.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.recentFailures.map((f) => (
                  <div key={f.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap",
                    padding: "11px 14px", borderRadius: 10,
                    background: "rgba(248,113,113,.05)", border: "1px solid rgba(248,113,113,.16)",
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171", minWidth: 78 }}>
                      {SERVICE_LABEL[f.serviceId] || f.serviceId}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", flex: 1, minWidth: 200 }}>
                      {f.error || "Check failed without an error message"}
                    </span>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", whiteSpace: "nowrap" }}>
                      {fmt(f.checkedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
