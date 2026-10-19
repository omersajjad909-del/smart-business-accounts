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
      } catch { toast.error("Settings load nahi ho saki (sirf Admin dekh sakta hai)."); }
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
      toast.success("Daily report settings save ho gayin.");
      return true;
    } catch { toast.error("Save nahi ho saka."); return false; }
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
      if (!res.ok) return toast.error(d.error || "Test fail hua.");
      const ok = (d.results || []).filter((r: any) => r.ok).length;
      const bad = (d.results || []).filter((r: any) => !r.ok);
      if (ok) toast.success(`${ok} message bhej diye gaye.`);
      if (bad.length) toast.error(`${bad.length} fail: ${bad.map((b: any) => `${b.channel} (${b.error || "error"})`).join(", ")}`, { duration: 7000 });
    } catch { toast.error("Test fail hua."); }
    finally { setTesting(false); }
  }

  async function loadPreview() {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/company/daily-report?preview=1", { headers: h(), cache: "no-store" });
      if (!res.ok) throw new Error();
      setPreview((await res.json()).text);
    } catch { toast.error("Preview load nahi hua."); }
    finally { setLoadingPreview(false); }
  }

  if (!s) return <div style={{ padding: 32, color: MUTED, fontFamily: ff }}>Loading…</div>;

  const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0" };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", fontFamily: ff, color: "var(--ink-solid, #fff)" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>📊 Daily Business Report</h1>
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 20px" }}>
        Roz raat ko aap ke business ka poora summary — sales, received, expenses, profit, cash, receivable/payable aur stock — WhatsApp, SMS ya email par.
      </p>

      <div style={card}>
        <div style={row}>
          <div>
            <div style={{ fontWeight: 700 }}>Daily report on karein</div>
            <div style={{ fontSize: 12, color: MUTED }}>
              {s.lastSentDate ? `Aakhri report: ${s.lastSentDate} (${s.lastStatus || "—"})` : "Abhi tak koi report nahi bheji gayi."}
            </div>
          </div>
          <Toggle on={s.enabled} onChange={() => patch({ enabled: !s.enabled })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 8 }}>
          <div>
            <label style={lbl}>Bhejne ka waqt</label>
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
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Kahan bhejna hai</div>
        {([
          ["whatsapp", "WhatsApp", "Poori formatted report. Company ki WhatsApp setup (Meta) zaroori hai."],
          ["sms", "SMS", "Chhota summary. SMS provider (Twilio/SMS API) configured hona chahiye."],
          ["email", "Email", "Poori report, table ke saath."],
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
        <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Ek se zyada numbers/emails comma se alag karein (max 10).</div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={save} disabled={saving}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontFamily: ff, color: "#fff", background: `linear-gradient(135deg,#f59e0b,${ACCENT})`, opacity: saving ? .6 : 1 }}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={sendTest} disabled={testing || saving}
          style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: ff, background: "transparent", color: "inherit", border: `1px solid ${BORDER}`, opacity: testing ? .6 : 1 }}>
          {testing ? "Bhej raha hoon…" : "Abhi test report bhejein"}
        </button>
        <button onClick={loadPreview} disabled={loadingPreview}
          style={{ padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontFamily: ff, background: "transparent", color: "inherit", border: `1px solid ${BORDER}` }}>
          {loadingPreview ? "Loading…" : "Aaj ki report dekhein"}
        </button>
      </div>

      {preview && (
        <div style={card}>
          <div style={lbl}>Preview (aaj tak ka data)</div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.6, fontFamily: ff }}>{preview.replace(/\*/g, "")}</pre>
        </div>
      )}
    </div>
  );
}
