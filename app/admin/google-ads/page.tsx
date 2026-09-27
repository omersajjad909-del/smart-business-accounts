"use client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

/**
 * Google Ads performance, recorded by hand.
 *
 * There is no live Google Ads API connection yet — that needs a developer
 * token and an OAuth app set up in Google Cloud, which is a separate task.
 * Until then, an admin reads the numbers off ads.google.com and logs a
 * snapshot here below, so this page has real history instead of nothing.
 */

type Snapshot = {
  id: string;
  campaignName: string;
  dateRangeFrom: string;
  dateRangeTo: string;
  impressions: number;
  clicks: number;
  costPkr: number;
  conversions: number;
  ctr: number;
  note: string | null;
  recordedAt: string;
};

type Data = { latest: Snapshot | null; snapshots: Snapshot[] };

const F = "'Outfit','Inter',sans-serif";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d: string): string {
  return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "rgba(255,255,255,.4)", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "9px 11px", color: "white", fontFamily: F, fontSize: 13,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.45)", marginBottom: 5, display: "block",
};

export default function AdminGoogleAdsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    campaignName: "FinovaOS – Accounting & ERP",
    dateRangeFrom: "",
    dateRangeTo: "",
    impressions: "",
    clicks: "",
    costPkr: "",
    conversions: "",
    ctr: "",
    note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/google-ads", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch {
      toast.error("Could not load Google Ads data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit() {
    const payload = {
      campaignName: form.campaignName.trim(),
      dateRangeFrom: form.dateRangeFrom,
      dateRangeTo: form.dateRangeTo,
      impressions: Number(form.impressions),
      clicks: Number(form.clicks),
      costPkr: Number(form.costPkr),
      conversions: Number(form.conversions),
      ctr: Number(form.ctr),
      note: form.note.trim() || undefined,
    };
    if (!payload.campaignName || !payload.dateRangeFrom || !payload.dateRangeTo ||
        Number.isNaN(payload.impressions) || Number.isNaN(payload.clicks) ||
        Number.isNaN(payload.costPkr) || Number.isNaN(payload.conversions) || Number.isNaN(payload.ctr)) {
      toast.error("Fill in every field with valid numbers");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      toast.success("Snapshot recorded");
      setShowForm(false);
      setForm((f) => ({ ...f, impressions: "", clicks: "", costPkr: "", conversions: "", ctr: "", note: "" }));
      load();
    } catch {
      toast.error("Could not save snapshot");
    } finally {
      setSaving(false);
    }
  }

  const latest = data?.latest ?? null;

  return (
    <div style={{ fontFamily: F, color: "white", padding: "28px 24px", maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Google Ads</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.45)", margin: "6px 0 0", maxWidth: 560 }}>
            No live API connection yet — numbers are logged by hand from ads.google.com after each check.
            Real-time auto-sync is a separate setup (Google developer token + OAuth).
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          style={{
            padding: "9px 16px", borderRadius: 9, cursor: "pointer", fontFamily: F,
            fontSize: 13, fontWeight: 700, background: "rgba(99,102,241,.18)",
            border: "1px solid rgba(99,102,241,.45)", color: "#a5b4fc", whiteSpace: "nowrap",
          }}
        >
          {showForm ? "Cancel" : "+ Log a snapshot"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px", marginBottom: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>New snapshot</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Campaign name</label>
              <input style={inputStyle} value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Date range from</label>
              <input type="date" style={inputStyle} value={form.dateRangeFrom} onChange={(e) => setForm({ ...form, dateRangeFrom: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Date range to</label>
              <input type="date" style={inputStyle} value={form.dateRangeTo} onChange={(e) => setForm({ ...form, dateRangeTo: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Impressions</label>
              <input type="number" style={inputStyle} value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Clicks</label>
              <input type="number" style={inputStyle} value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Cost (PKR)</label>
              <input type="number" style={inputStyle} value={form.costPkr} onChange={(e) => setForm({ ...form, costPkr: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Conversions</label>
              <input type="number" style={inputStyle} value={form.conversions} onChange={(e) => setForm({ ...form, conversions: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>CTR (%)</label>
              <input type="number" step="0.01" style={inputStyle} value={form.ctr} onChange={(e) => setForm({ ...form, ctr: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Note (optional)</label>
            <input style={inputStyle} placeholder="e.g. week 1 test, budget PKR 200/day" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              padding: "10px 18px", borderRadius: 9, cursor: saving ? "default" : "pointer", fontFamily: F,
              fontSize: 13, fontWeight: 700, background: "#6366f1", border: "none", color: "white",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save snapshot"}
          </button>
        </div>
      )}

      {loading && !data ? (
        <div style={{ color: "rgba(255,255,255,.4)", fontSize: 14, padding: "40px 0" }}>Loading…</div>
      ) : !data || !latest ? (
        <div style={{ padding: "40px 22px", textAlign: "center", border: `1px dashed ${BORDER}`, borderRadius: 14, color: "rgba(255,255,255,.4)", fontSize: 13 }}>
          No snapshots recorded yet. Click "+ Log a snapshot" and copy the numbers from ads.google.com.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
            <Stat label="Impressions" value={latest.impressions.toLocaleString()} />
            <Stat label="Clicks" value={latest.clicks.toLocaleString()} />
            <Stat label="CTR" value={`${latest.ctr}%`} />
            <Stat label="Cost" value={`PKR ${latest.costPkr.toLocaleString()}`} />
            <Stat label="Conversions" value={String(latest.conversions)} />
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.35)", marginBottom: 22 }}>
            {latest.campaignName} · {fmtDate(latest.dateRangeFrom)} – {fmtDate(latest.dateRangeTo)} · recorded {fmtDateTime(latest.recordedAt)}
            {latest.note ? ` · ${latest.note}` : ""}
          </div>

          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", fontSize: 14, fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>
              History
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                    {["Campaign", "Range", "Impressions", "Clicks", "CTR", "Cost", "Conversions", "Recorded"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "rgba(255,255,255,.35)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.snapshots.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i < data.snapshots.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                      <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 600 }}>{s.campaignName}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                        {fmtDate(s.dateRangeFrom)} – {fmtDate(s.dateRangeTo)}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12.5 }}>{s.impressions.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12.5 }}>{s.clicks.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12.5 }}>{s.ctr}%</td>
                      <td style={{ padding: "12px 16px", fontSize: 12.5 }}>PKR {s.costPkr.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12.5, fontWeight: 700, color: s.conversions > 0 ? "#34d399" : "rgba(255,255,255,.5)" }}>
                        {s.conversions}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 11.5, color: "rgba(255,255,255,.35)" }}>{fmtDateTime(s.recordedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
