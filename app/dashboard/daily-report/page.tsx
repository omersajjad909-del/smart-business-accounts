"use client";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

const ff = "'Outfit','Inter',sans-serif";
const ACCENT = "#d97706";
const BORDER = "rgba(var(--ink),.08)";
const MUTED = "rgba(var(--ink),.5)";

const card: React.CSSProperties = {
  background: "rgba(var(--ink),.03)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, marginBottom: 16,
};
const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "rgba(var(--ink),.05)", border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--ink-solid, #fff)", fontFamily: ff, outline: "none",
};
const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5,
};

type Settings = {
  enabled: boolean; sendTime: string; timezone: string;
  whatsapp: boolean; sms: boolean; email: boolean;
  phones: string[]; emails: string[];
  lastSentDate: string | null; lastStatus: string | null;
};

const TIMEZONES = [
  "Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Asia/Kolkata", "Asia/Dhaka", "Europe/London",
  "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney",
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} aria-pressed={on}
      style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", flexShrink: 0, position: "relative",
        background: on ? `linear-gradient(135deg,#f59e0b,${ACCENT})` : "rgba(148,163,184,.25)", transition: "background .2s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
    </button>
  );
}

export default function DailyReportPage() {
  const user = getCurrentUser() as { id?: string; role?: string; companyId?: string } | null;
  const [s, setS] = useState<Settings | null>(null);
  const [phones, setPhones] = useState("");
  const [emails, setEmails] = useState("");
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const h = (): Record<string, string> => ({
    "x-user-role": user?.role || "", "x-user-id": user?.id || "", "x-company-id": user?.companyId || "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/company/daily-report", { headers: h(), cache: "no-store" });
        if (!res.ok) throw new Error();
        const d = await res.json();
        setS(d.settings);
        setPhones(d.settings.phones.join(", "));
        setEmails(d.settings.emails.join(", "));
      } catch { toast.error("Could not load settings (Admin access only)."); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const split = (v: string) => v.split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean);
  const patch = (p: Partial<Settings>) => setS((c) => (c ? { ...c, ...p } : c));

  async function save(): Promise<boolean> {
    if (!s) return false;
    setSaving(true);
    try {
      const res = await fetch("/api/company/daily-report", {
        method: "POST", headers: { ...h(), "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { ...s, phones: split(phones), emails: split(emails) } }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setS((c) => ({ ...d.settings, lastSentDate: c?.lastSentDate ?? null, lastStatus: c?.lastStatus ?? null }));
      setPhones(d.settings.phones.join(", "));
      setEmails(d.settings.emails.join(", "));
      toast.success("Daily report settings saved.");
      return true;
    } catch { toast.error("Could not save settings."); return false; }
    finally { setSaving(false); }
  }

  async function sendTest() {
    if (!(await save())) return;
    setTesting(true);
    try {
      const res = await fetch("/api/company/daily-report", {
        method: "POST", headers: { ...h(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const d = await res.json();
      if (!res.ok) return toast.error(d.error || "Test failed.");
      const ok = (d.results || []).filter((r: any) => r.ok).length;
      const bad = (d.results || []).filter((r: any) => !r.ok);
      if (ok) toast.success(`${ok} message(s) sent.`);
      if (bad.length) toast.error(`${bad.length} fail: ${bad.map((b: any) => `${b.channel} (${b.error || "error"})`).join(", ")}`, { duration: 7000 });
    } catch { toast.error("Test failed."); }
    finally { setTesting(false); }
  }

  async function loadPreview() {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/company/daily-report?preview=1", { headers: h(), cache: "no-store" });
      if (!res.ok) throw new Error();
      setPreview((await res.json()).text);
    } catch { toast.error("Could not load preview."); }
    finally { setLoadingPreview(false); }
  }

  if (!s) return <div style={{ padding: 32, color: MUTED, fontFamily: ff }}>Loading…</div>;

  const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0" };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", fontFamily: ff, color: "var(--ink-solid, #fff)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>📊 Daily Business Report</h1>
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 20px" }}>
        A full end-of-day summary of your business — sales, received, expenses, profit, cash, receivables/payables and stock — delivered every night by WhatsApp, SMS or email.
      </p>

      <div style={card}>
        <div style={row}>
          <div>
            <div style={{ fontWeight: 700 }}>Send the daily report</div>
            <div style={{ fontSize: 12, color: MUTED }}>
              {s.lastSentDate ? `Last report: ${s.lastSentDate} (${s.lastStatus || "—"})` : "No report has been sent yet."}
            </div>
          </div>
          <Toggle on={s.enabled} onChange={() => patch({ enabled: !s.enabled })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 8 }}>
          <div>
            <label style={lbl}>Send time</label>
            <input type="time" style={inp} value={s.sendTime} onChange={(e) => patch({ sendTime: e.target.value })} />
          </div>
          <div>
            <label style={lbl}>Timezone</label>
            <select style={inp} value={s.timezone} onChange={(e) => patch({ timezone: e.target.value })}>
              {(TIMEZONES.includes(s.timezone) ? TIMEZONES : [s.timezone, ...TIMEZONES]).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Delivery channels</div>
        {([
          ["whatsapp", "WhatsApp", "Full formatted report. Requires the company's WhatsApp (Meta) setup."],
          ["sms", "SMS", "Short summary. Requires an SMS provider (Twilio / SMS API) to be configured."],
          ["email", "Email", "Full report with tables."],
        ] as const).map(([k, name, desc]) => (
          <div key={k} style={row}>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div><div style={{ fontSize: 12, color: MUTED }}>{desc}</div></div>
            <Toggle on={s[k]} onChange={() => patch({ [k]: !s[k] } as Partial<Settings>)} />
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginTop: 8 }}>
          <div>
            <label style={lbl}>Phone numbers (WhatsApp / SMS)</label>
            <input style={inp} placeholder="03001234567, 923331234567" value={phones} onChange={(e) => setPhones(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Email addresses</label>
            <input style={inp} placeholder="owner@business.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Separate multiple numbers or emails with commas (max 10).</div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={save} disabled={saving}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontFamily: ff, color: "#fff", background: `linear-gradient(135deg,#f59e0b,${ACCENT})`, opacity: saving ? .6 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={sendTest} disabled={testing || saving}
          style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: ff, background: "transparent", color: "inherit", border: `1px solid ${BORDER}`, opacity: testing ? .6 : 1 }}>
          {testing ? "Sending…" : "Send test report now"}
        </button>
        <button onClick={loadPreview} disabled={loadingPreview}
          style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: ff, background: "transparent", color: "inherit", border: `1px solid ${BORDER}` }}>
          {loadingPreview ? "Loading…" : "Preview today's report"}
        </button>
      </div>

      {preview && (
        <div style={card}>
          <div style={lbl}>Preview (data up to now)</div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.6, fontFamily: ff }}>{preview.replace(/\*/g, "")}</pre>
        </div>
      )}
    </div>
  );
}
