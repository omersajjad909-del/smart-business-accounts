"use client";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
type LoyaltySettings = {
  enabled: boolean; pointsPerHundred: number; redeemValue: number;
  minRedeemPoints: number; cardPrefix: string; expiryDays: number;
};
const DEFAULT_LOYALTY_SETTINGS: LoyaltySettings = {
  enabled: true, pointsPerHundred: 1, redeemValue: 1,
  minRedeemPoints: 50, cardPrefix: "LC", expiryDays: 0,
};

const ff = "'Outfit','Inter',sans-serif";

type Customer = {
  id: string; name: string; cardNo: string; phone: string;
  points: number; totalSpent: number; lastPurchase: string;
  history: { date: string; saleRef: string; earned: number; redeemed: number; amount: number }[];
  status: string;
};

export default function LoyaltyPage() {
  const userRef = useRef(getCurrentUser());
  const user = userRef.current;

  const { records, loading, create, update } = useBusinessRecords("loyalty_customer");

  const [config, setConfig] = useState<LoyaltySettings>({ ...DEFAULT_LOYALTY_SETTINGS });
  const [configDraft, setConfigDraft] = useState<LoyaltySettings>({ ...DEFAULT_LOYALTY_SETTINGS });
  const [showConfig, setShowConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [regForm, setRegForm] = useState({ name: "", phone: "" });
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");

  function authHeaders(): HeadersInit {
    const h = user as { id?: string; role?: string; companyId?: string } | null;
    return { "x-user-id": h?.id || "", "x-user-role": h?.role || "ADMIN", "x-company-id": h?.companyId || "" };
  }

  useEffect(() => {
    fetch("/api/company/admin-control", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d?.loyaltySettings) {
          const merged = { ...DEFAULT_LOYALTY_SETTINGS, ...d.loyaltySettings };
          setConfig(merged);
          setConfigDraft(merged);
        }
      })
      .catch(() => {});
  }, []);

  const customers: Customer[] = records.map(r => ({
    id: r.id,
    name: r.title,
    cardNo: String(r.data?.cardNo || ""),
    phone: String(r.data?.phone || ""),
    points: r.amount || 0,
    totalSpent: Number(r.data?.totalSpent) || 0,
    lastPurchase: String(r.data?.lastPurchase || ""),
    history: Array.isArray(r.data?.history) ? (r.data.history as Customer["history"]) : [],
    status: r.status || "active",
  }));

  const activeCustomers = customers.filter(c => c.status !== "inactive");
  const filtered = activeCustomers.filter(c => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    const digits = searchQ.replace(/\D/g, "");
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(searchQ) ||
      c.cardNo.toLowerCase().includes(q) ||
      (digits.length >= 4 && c.cardNo.replace(/\D/g, "").endsWith(digits))
    );
  });

  const totalPoints = activeCustomers.reduce((a, c) => a + c.points, 0);
  const totalSpent = activeCustomers.reduce((a, c) => a + c.totalSpent, 0);
  const totalRedeemed = activeCustomers.reduce((a, c) =>
    a + c.history.reduce((s, h) => s + (h.redeemed || 0), 0), 0
  );

  function generateCardNo(): string {
    const prefix = config.cardPrefix || "LC";
    const nums = customers.map(c => {
      const n = parseInt(c.cardNo.replace(/\D/g, ""), 10);
      return isNaN(n) ? 0 : n;
    });
    const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return `${prefix}-${String(next).padStart(10, "0")}`;
  }

  async function registerCustomer() {
    const name = regForm.name.trim();
    const phone = regForm.phone.trim();
    if (!name) { setRegError("Name is required."); return; }
    if (!phone) { setRegError("Phone number is required."); return; }
    if (activeCustomers.find(c => c.phone === phone)) {
      setRegError("A customer with this phone is already registered."); return;
    }
    setRegistering(true);
    try {
      const cardNo = generateCardNo();
      await create({ title: name, status: "active", amount: 0, data: { phone, cardNo, totalSpent: 0, lastPurchase: null, history: [] } });
      setShowRegister(false);
      setRegForm({ name: "", phone: "" });
      setRegError("");
    } catch { setRegError("Registration failed. Please try again."); }
    setRegistering(false);
  }

  async function saveConfig() {
    setSavingConfig(true);
    try {
      await fetch("/api/company/admin-control", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ loyaltySettings: configDraft }),
      });
      setConfig({ ...configDraft });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch {}
    setSavingConfig(false);
  }

  async function toggleCustomer(id: string, active: boolean) {
    await update(id, { status: active ? "active" : "inactive" });
  }

  const detailCustomer = detailId ? customers.find(c => c.id === detailId) : null;

  const dateStr = (iso: string) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return "—"; }
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <style>{`
        .lc-row:hover { background: rgba(255,255,255,.03) !important; }
        .lc-btn:hover { opacity: .8; }
        .lc-input { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: 8px 12px; color: #fff; font-size: 13px; font-family: ${ff}; outline: none; width: 100%; box-sizing: border-box; }
        .lc-input:focus { border-color: rgba(99,102,241,.45); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🎁 Loyalty Program</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Register customers, track points &amp; manage redemptions</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { setShowConfig(v => !v); setConfigDraft({ ...config }); }} className="lc-btn"
            style={{ padding: "9px 18px", borderRadius: 9, border: `1px solid ${showConfig ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.12)"}`, background: showConfig ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.05)", color: showConfig ? "#818cf8" : "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
            ⚙ Settings
          </button>
          <button onClick={() => { setShowRegister(true); setRegForm({ name: "", phone: "" }); setRegError(""); }} className="lc-btn"
            style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#0f1117", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
            + Register Customer
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Customers", value: activeCustomers.length, color: "#818cf8", icon: "👥" },
          { label: "Points in Circulation", value: totalPoints.toLocaleString(), color: "#f59e0b", icon: "⭐" },
          { label: "Total Redeemed", value: `${totalRedeemed.toLocaleString()} pts`, color: "#34d399", icon: "🔄" },
          { label: "Total Customer Spend", value: `Rs. ${totalSpent.toLocaleString()}`, color: "#a5b4fc", icon: "💰" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Settings Panel */}
      {showConfig && (
        <div style={{ background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.18)", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#818cf8" }}>⚙ Loyalty Settings</div>
            {configSaved && <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>✓ Saved</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 18 }}>
            {[
              { label: "Points per Rs.100", key: "pointsPerHundred", type: "number", hint: "Points earned per Rs.100 spent" },
              { label: "Redeem Value (Rs./pt)", key: "redeemValue", type: "number", hint: "Rs. discount per 1 point redeemed" },
              { label: "Min Redeem Points", key: "minRedeemPoints", type: "number", hint: "Minimum points needed to redeem" },
              { label: "Card Prefix", key: "cardPrefix", type: "text", hint: 'Prefix for card numbers (e.g. "LC")' },
              { label: "Points Expiry (days)", key: "expiryDays", type: "number", hint: "0 = never expire" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} className="lc-input"
                  value={String((configDraft as Record<string, unknown>)[f.key] ?? "")}
                  onChange={e => setConfigDraft(d => ({ ...d, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))} />
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 3 }}>{f.hint}</div>
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 5 }}>Program Status</label>
              <button onClick={() => setConfigDraft(d => ({ ...d, enabled: !d.enabled }))}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${configDraft.enabled ? "rgba(52,211,153,.4)" : "rgba(255,255,255,.15)"}`, background: configDraft.enabled ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.04)", color: configDraft.enabled ? "#34d399" : "rgba(255,255,255,.45)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                {configDraft.enabled ? "✓ Enabled" : "○ Disabled"}
              </button>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 3 }}>Toggle loyalty program on/off</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={saveConfig} disabled={savingConfig} className="lc-btn"
              style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: savingConfig ? "rgba(99,102,241,.4)" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingConfig ? "not-allowed" : "pointer", fontFamily: ff }}>
              {savingConfig ? "Saving..." : "Save Settings"}
            </button>
            <button onClick={() => { setShowConfig(false); setConfigDraft({ ...config }); }} className="lc-btn"
              style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 13, cursor: "pointer", fontFamily: ff }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", maxWidth: 380 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search by name, phone, or card no..."
            style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, color: "#fff", fontSize: 13, fontFamily: ff, outline: "none" }} />
        </div>
      </div>

      {/* Customer Table */}
      <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,.03)" }}>
              {["Customer", "Card No.", "Phone", "Points", "Total Spent", "Last Purchase", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "11px 16px", fontSize: 11, color: "rgba(255,255,255,.4)", borderBottom: "1px solid rgba(255,255,255,.07)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎁</div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{searchQ ? "No customers match your search." : "No loyalty customers registered yet."}</div>
                {!searchQ && <div style={{ fontSize: 12, color: "rgba(255,255,255,.2)" }}>Click "Register Customer" to get started.</div>}
              </td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="lc-row" style={{ borderBottom: "1px solid rgba(255,255,255,.04)", cursor: "pointer" }} onClick={() => setDetailId(c.id)}>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#818cf8", flexShrink: 0 }}>{c.name.charAt(0).toUpperCase()}</div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "#f59e0b", fontWeight: 700 }}>{c.cardNo || "—"}</td>
                <td style={{ padding: "13px 16px", fontSize: 13, color: "rgba(255,255,255,.6)" }}>{c.phone}</td>
                <td style={{ padding: "13px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{c.points.toLocaleString()}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>pts</span>
                  </div>
                </td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>Rs. {c.totalSpent.toLocaleString()}</td>
                <td style={{ padding: "13px 16px", fontSize: 12, color: "rgba(255,255,255,.4)" }}>{dateStr(c.lastPurchase)}</td>
                <td style={{ padding: "13px 16px" }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setDetailId(c.id)} className="lc-btn"
                      style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                      History
                    </button>
                    <button onClick={() => toggleCustomer(c.id, false)} className="lc-btn"
                      style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: ff }}>
                      Deactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Register Customer Modal */}
      {showRegister && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowRegister(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#111c30", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, padding: "28px 32px", width: "min(96vw,440px)", fontFamily: ff }}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Register New Customer</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 22 }}>A loyalty card number will be auto-generated.</div>
            {regError && (
              <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#fca5a5", fontSize: 12 }}>{regError}</div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Full Name *</label>
              <input className="lc-input" placeholder="e.g. Ahmed Ali" value={regForm.name}
                onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && registerCustomer()} autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Phone Number *</label>
              <input className="lc-input" placeholder="e.g. 03001234567" value={regForm.phone}
                onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && registerCustomer()} />
            </div>
            <div style={{ padding: "12px 14px", background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.18)", borderRadius: 9, marginBottom: 20, fontSize: 12, color: "rgba(255,255,255,.55)" }}>
              Card will be generated: <span style={{ fontWeight: 700, color: "#f59e0b" }}>{generateCardNo()}</span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={registerCustomer} disabled={registering} className="lc-btn"
                style={{ flex: 1, padding: "11px 0", background: registering ? "rgba(245,158,11,.4)" : "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 9, color: "#0f1117", fontSize: 14, fontWeight: 700, cursor: registering ? "not-allowed" : "pointer", fontFamily: ff }}>
                {registering ? "Registering..." : "Register Customer"}
              </button>
              <button onClick={() => setShowRegister(false)} className="lc-btn"
                style={{ padding: "11px 22px", background: "transparent", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, color: "rgba(255,255,255,.5)", fontSize: 13, cursor: "pointer", fontFamily: ff }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {detailCustomer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)", zIndex: 55, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setDetailId(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#111c30", border: "1px solid rgba(255,255,255,.1)", borderRadius: 18, width: "min(96vw,580px)", maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", fontFamily: ff }}>
            {/* Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#818cf8" }}>
                  {detailCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{detailCustomer.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 1 }}>{detailCustomer.phone} · Card: <span style={{ color: "#f59e0b" }}>{detailCustomer.cardNo}</span></div>
                </div>
              </div>
              <button onClick={() => setDetailId(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderBottom: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
              {[
                { label: "Points Balance", value: `${detailCustomer.points.toLocaleString()} pts`, color: "#f59e0b" },
                { label: "Total Spent", value: `Rs. ${detailCustomer.totalSpent.toLocaleString()}`, color: "#a5b4fc" },
                { label: "Last Purchase", value: dateStr(detailCustomer.lastPurchase), color: "#34d399" },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: "14px 18px", borderRight: i < 2 ? "1px solid rgba(255,255,255,.06)" : "none" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".07em" }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* History */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 10, fontWeight: 600 }}>Transaction History ({detailCustomer.history.length})</div>
              {detailCustomer.history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: "rgba(255,255,255,.25)", fontSize: 13 }}>No transactions yet</div>
              ) : [...detailCustomer.history].reverse().map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 9 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{h.saleRef}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 1 }}>{dateStr(h.date)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Rs. {(h.amount || 0).toLocaleString()}</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
                      {h.earned > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>+{h.earned} pts</span>}
                      {h.redeemed > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}>−{h.redeemed} pts</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
