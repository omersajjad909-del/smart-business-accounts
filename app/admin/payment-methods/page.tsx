"use client";
import { useEffect, useRef, useState } from "react";

/* ─── Types ─────────────────────────────────────────── */
type Gateway = {
  id: string; key: string; name: string;
  description: string | null; category: string;
  isEnabled: boolean; configJson: string | null; sortOrder: number;
};
type GwStats = { total: number; enabled: number; byCategory: Record<string, number> };

type VariantEntry = { set: boolean; masked: string | null };
type LsConfig = {
  configured: boolean;
  testMode: boolean;
  webhookConfigured: boolean;
  storeId: string | null;
  apiKeyMasked: string | null;
  variantStatus: Record<string, VariantEntry>;
  variantsConfigured: number;
  variantsTotal: number;
  launchDiscount: string | null;
};

/* ─── Constants ──────────────────────────────────────── */
const CAT_META: Record<string, { label: string; color: string; bg: string }> = {
  OFFLINE: { label: "Offline",  color: "#94a3b8", bg: "rgba(148,163,184,.12)" },
  CARD:    { label: "Card",     color: "#93c5fd", bg: "rgba(79,124,255,.14)"  },
  MOBILE:  { label: "Mobile",  color: "#4ade80", bg: "rgba(34,197,94,.14)"   },
  CRYPTO:  { label: "Crypto",  color: "#fbbf24", bg: "rgba(245,158,11,.14)"  },
  OTHER:   { label: "Other",   color: "#c4b5fd", bg: "rgba(139,92,246,.14)"  },
};

const GW_ICONS: Record<string, string> = {
  CASH: "💵", BANK: "🏦", CHEQUE: "📝",
  STRIPE: "💳", PAYPAL: "🅿️", LEMONSQUEEZY: "🍋",
  JAZZCASH: "📱", EASYPAISA: "📱", SADAD: "🔵",
  RAZORPAY: "⚡", CRYPTO: "🔗",
};

const PLAN_VARIANTS = [
  { key: "STARTER_MONTHLY",    plan: "Starter",    cycle: "Monthly",  color: "#64748b" },
  { key: "STARTER_YEARLY",     plan: "Starter",    cycle: "Yearly",   color: "#64748b" },
  { key: "PRO_MONTHLY",        plan: "Pro",        cycle: "Monthly",  color: "#6366f1" },
  { key: "PRO_YEARLY",         plan: "Pro",        cycle: "Yearly",   color: "#6366f1" },
  { key: "ENTERPRISE_MONTHLY", plan: "Enterprise", cycle: "Monthly",  color: "#38bdf8" },
  { key: "ENTERPRISE_YEARLY",  plan: "Enterprise", cycle: "Yearly",   color: "#38bdf8" },
];

/* ─── Page ───────────────────────────────────────────── */
export default function PaymentMethodsPage() {
  const [ls,       setLs]       = useState<LsConfig | null>(null);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [gwStats,  setGwStats]  = useState<GwStats>({ total: 0, enabled: 0, byCategory: {} });
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<Gateway | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", configJson: "", qrPreview: "" });
  const [saving,   setSaving]   = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [formErr,  setFormErr]  = useState("");
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, ok = true) {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, ok });
    timer.current = setTimeout(() => setToast(null), 3000);
  }

  async function loadAll() {
    setLoading(true);
    const [lsRes, gwRes] = await Promise.all([
      fetch("/api/admin/lemonsqueezy/config", { credentials: "include", cache: "no-store" }),
      fetch("/api/admin/payment-gateways",    { credentials: "include", cache: "no-store" }),
    ]);
    if (lsRes.ok) setLs(await lsRes.json());
    if (gwRes.ok) {
      const d = await gwRes.json();
      setGateways(d.gateways || []);
      setGwStats(d.stats || { total: 0, enabled: 0, byCategory: {} });
    }
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, []);

  async function toggleGw(g: Gateway) {
    setToggling(g.id);
    try {
      const res = await fetch(`/api/admin/payment-gateways?id=${g.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !g.isEnabled }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      showToast(`${g.name} ${g.isEnabled ? "disabled" : "enabled"}.`);
      await loadAll();
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed", false); }
    finally { setToggling(null); }
  }

  function openEdit(g: Gateway) {
    let cfg = ""; let qr = "";
    if (g.configJson) {
      try {
        const p = JSON.parse(g.configJson);
        qr = p.qrCode || "";
        const { qrCode: _, ...rest } = p;
        cfg = JSON.stringify(rest, null, 2);
      } catch { cfg = g.configJson; }
    }
    setEditForm({ name: g.name, description: g.description || "", configJson: cfg, qrPreview: qr });
    setEditing(g); setFormErr("");
  }

  function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditForm(p => ({ ...p, qrPreview: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editForm.name.trim()) { setFormErr("Name is required."); return; }
    let parsed: Record<string, unknown> = {};
    if (editForm.configJson.trim()) {
      try { parsed = JSON.parse(editForm.configJson.trim()); }
      catch { setFormErr("Config JSON is invalid."); return; }
    }
    if (editForm.qrPreview) parsed.qrCode = editForm.qrPreview;
    setSaving(true); setFormErr("");
    try {
      const res = await fetch(`/api/admin/payment-gateways?id=${editing.id}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), description: editForm.description.trim() || null, configJson: Object.keys(parsed).length ? parsed : null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setEditing(null); showToast("Gateway updated."); await loadAll();
    } catch (e: unknown) { setFormErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const cats = ["OFFLINE", "CARD", "MOBILE", "CRYPTO", "OTHER"].filter(c => gateways.some(g => g.category === c));
  const cm   = (c: string) => CAT_META[c] || CAT_META.OTHER;

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", paddingBottom: 80 }}>
      <style>{css}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 999,
          padding: "12px 18px", borderRadius: 14, fontSize: 13, fontWeight: 700,
          background: toast.ok ? "#22c55e" : "#f43f5e", color: "#fff",
          boxShadow: "0 8px 24px rgba(0,0,0,.22)", animation: "pmToastIn .2s ease",
        }}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: "-.02em" }}>Payment Methods</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
          Configure FinovaOS subscription billing and platform payment gateways.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 80, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════
              SECTION 1 — LEMON SQUEEZY BILLING
          ══════════════════════════════════════════════════ */}
          <div style={sLabel}>🍋 Lemon Squeezy — Subscription Billing</div>
          <div style={card}>

            {/* Status row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 24 }}>
              {[
                {
                  label: "Connection",
                  val:   ls?.configured ? "Connected" : "Not configured",
                  color: ls?.configured ? "#34d399" : "#f87171",
                  icon:  ls?.configured ? "✅" : "❌",
                },
                {
                  label: "Mode",
                  val:   ls?.testMode ? "Test Mode" : "Live Mode",
                  color: ls?.testMode ? "#fbbf24" : "#34d399",
                  icon:  ls?.testMode ? "🧪" : "🚀",
                },
                {
                  label: "Webhook",
                  val:   ls?.webhookConfigured ? "Configured" : "Not set",
                  color: ls?.webhookConfigured ? "#34d399" : "#f87171",
                  icon:  ls?.webhookConfigured ? "🔗" : "⚠️",
                },
                {
                  label: "Variants",
                  val:   `${ls?.variantsConfigured ?? 0} / ${ls?.variantsTotal ?? 6}`,
                  color: (ls?.variantsConfigured ?? 0) === (ls?.variantsTotal ?? 6) ? "#34d399" : "#fbbf24",
                  icon:  "⚡",
                },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 6 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 600, marginTop: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* API credentials row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={credBox}>
                <div style={credLabel}>API Key</div>
                <div style={credVal}>{ls?.apiKeyMasked ?? <span style={{ color: "#f87171" }}>Not set</span>}</div>
              </div>
              <div style={credBox}>
                <div style={credLabel}>Store ID</div>
                <div style={credVal}>{ls?.storeId ?? <span style={{ color: "#f87171" }}>Not set</span>}</div>
              </div>
              {ls?.launchDiscount && (
                <div style={{ ...credBox, gridColumn: "1 / -1" }}>
                  <div style={credLabel}>Launch Discount Code</div>
                  <div style={{ ...credVal, color: "#fbbf24" }}>{ls.launchDiscount}</div>
                </div>
              )}
            </div>

            {/* Variants grid */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 14 }}>Variant IDs</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                {PLAN_VARIANTS.map(v => {
                  const entry = ls?.variantStatus?.[v.key];
                  return (
                    <div key={v.key} style={{
                      background: "rgba(255,255,255,.03)", border: `1px solid ${entry?.set ? v.color + "33" : "rgba(255,255,255,.06)"}`,
                      borderRadius: 12, padding: "12px 14px",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: entry?.set ? "#34d399" : "rgba(255,255,255,.15)",
                        boxShadow: entry?.set ? "0 0 6px #34d399" : "none",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: v.color }}>{v.plan}</span>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)", background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 4 }}>{v.cycle}</span>
                        </div>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,.4)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry?.set ? (entry.masked ?? "****") : <span style={{ color: "#f87171" }}>Not set</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Setup instructions if not configured */}
            {!ls?.configured && (
              <div style={{ marginTop: 20, padding: "16px 18px", borderRadius: 14, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>⚠️ Setup Required</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", lineHeight: 1.7 }}>
                  Add the following to your <code style={{ background: "rgba(255,255,255,.08)", padding: "1px 5px", borderRadius: 4 }}>.env.local</code> file:
                </div>
                <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 11, color: "#a5f3fc", background: "rgba(0,0,0,.3)", borderRadius: 10, padding: "12px 14px", lineHeight: 1.9 }}>
                  {[
                    "LEMONSQUEEZY_API_KEY=your_api_key_here",
                    "LEMONSQUEEZY_STORE_ID=your_store_id",
                    "LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret",
                    "LEMONSQUEEZY_TEST_MODE=true",
                    "LEMONSQUEEZY_VARIANT_STARTER_MONTHLY=your_variant_id",
                    "LEMONSQUEEZY_VARIANT_STARTER_YEARLY=your_variant_id",
                    "LEMONSQUEEZY_VARIANT_PRO_MONTHLY=your_variant_id",
                    "LEMONSQUEEZY_VARIANT_PRO_YEARLY=your_variant_id",
                    "LEMONSQUEEZY_VARIANT_ENTERPRISE_MONTHLY=your_variant_id",
                    "LEMONSQUEEZY_VARIANT_ENTERPRISE_YEARLY=your_variant_id",
                  ].map(line => <div key={line}>{line}</div>)}
                </div>
              </div>
            )}

            {ls?.configured && ls.testMode && (
              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>
                🧪 Test mode is ON — real payments will NOT be processed. Set <code style={{ background: "rgba(255,255,255,.08)", padding: "1px 5px", borderRadius: 4 }}>LEMONSQUEEZY_TEST_MODE=false</code> to go live.
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════
              SECTION 2 — PLATFORM PAYMENT GATEWAYS
          ══════════════════════════════════════════════════ */}
          <div style={{ ...sLabel, marginTop: 36 }}>🏦 Platform Payment Gateways</div>
          <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[
                { label: "Total",    val: gwStats.total,           color: "#818cf8" },
                { label: "Enabled",  val: gwStats.enabled,         color: "#34d399" },
                { label: "Disabled", val: gwStats.total - gwStats.enabled, color: "#f87171" },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {Object.entries(gwStats.byCategory).map(([cat, count]) => (
                  <span key={cat} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: cm(cat).bg, color: cm(cat).color }}>
                    {cm(cat).label} {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {cats.map(cat => {
            const group = gateways.filter(g => g.category === cat);
            if (!group.length) return null;
            const meta = cm(cat);
            return (
              <div key={cat} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ padding: "5px 13px", borderRadius: 99, fontSize: 12, fontWeight: 800, background: meta.bg, color: meta.color, letterSpacing: ".04em" }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{group.length} gateway{group.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                  {group.map(g => (
                    <div key={g.id} className="pm-gw-card" style={{
                      background: "rgba(255,255,255,.03)",
                      border: `1px solid ${g.isEnabled ? "rgba(34,197,94,.2)" : "rgba(255,255,255,.07)"}`,
                      borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 0,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center",
                          fontSize: 22, background: g.isEnabled ? meta.bg : "rgba(148,163,184,.08)",
                        }}>{GW_ICONS[g.key] || "💳"}</div>
                        <button type="button" className="pm-edit-btn" onClick={() => openEdit(g)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{g.name}</div>
                      {g.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", lineHeight: 1.45, marginBottom: 12, flex: 1 }}>{g.description}</div>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)", marginTop: "auto" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.04)", padding: "3px 8px", borderRadius: 7 }}>{g.key}</span>
                        <button type="button" className={`pm-toggle${g.isEnabled ? " pm-toggle--on" : ""}`}
                          disabled={toggling === g.id} onClick={() => void toggleGw(g)}>
                          <span className="pm-toggle-track"><span className="pm-toggle-thumb" /></span>
                          <span className="pm-toggle-label">{toggling === g.id ? "…" : g.isEnabled ? "ON" : "OFF"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Edit Modal ── */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(6,10,20,.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setEditing(null)}>
          <div style={{ width: "100%", maxWidth: 500, maxHeight: "92vh", overflowY: "auto", borderRadius: 22, border: "1px solid rgba(255,255,255,.12)", background: "linear-gradient(160deg,rgba(19,27,50,.99),rgba(15,22,42,.99))", boxShadow: "0 24px 60px rgba(0,0,0,.4)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "20px 22px 0", gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{editing.name}</div>
                <code style={{ fontSize: 11, color: "rgba(255,255,255,.4)", background: "rgba(255,255,255,.06)", padding: "2px 8px", borderRadius: 6 }}>{editing.key}</code>
              </div>
              <button type="button" onClick={() => setEditing(null)} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", cursor: "pointer", fontSize: 16, display: "grid", placeItems: "center" }}>✕</button>
            </div>
            <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              {formErr && <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(244,63,94,.1)", color: "#f87171", fontSize: 13 }}>{formErr}</div>}
              <Field label="Display Name">
                <input className="pm-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Description">
                <input className="pm-input" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional" />
              </Field>
              {(editing.category === "MOBILE" || editing.key === "JAZZCASH" || editing.key === "EASYPAISA") && (
                <Field label="QR Code" note="customers scan to pay">
                  {editForm.qrPreview ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <img src={editForm.qrPreview} alt="QR" style={{ width: 180, height: 180, borderRadius: 14, border: "1.5px solid rgba(255,255,255,.1)", objectFit: "contain", background: "#fff", padding: 8 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <label style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Replace<input type="file" accept="image/*" onChange={handleQrUpload} style={{ display: "none" }} />
                        </label>
                        <button type="button" onClick={() => setEditForm(p => ({ ...p, qrPreview: "" }))} style={{ padding: "7px 14px", borderRadius: 10, border: "1px solid rgba(244,63,94,.3)", background: "transparent", color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "28px 20px", borderRadius: 14, border: "2px dashed rgba(255,255,255,.1)", background: "rgba(255,255,255,.02)", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: 28 }}>📱</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>Upload QR Code</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>PNG or JPG from your app</div>
                      <input type="file" accept="image/*" onChange={handleQrUpload} style={{ display: "none" }} />
                    </label>
                  )}
                </Field>
              )}
              <Field label="Config JSON" note="API keys, webhook URLs, etc.">
                <textarea className="pm-input" style={{ minHeight: 100, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
                  value={editForm.configJson} onChange={e => setEditForm(p => ({ ...p, configJson: e.target.value }))}
                  placeholder={'{\n  "apiKey": "sk_live_..."\n}'} rows={6} />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px 20px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
              <button type="button" onClick={() => setEditing(null)} style={{ padding: "9px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.5)", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#6d28d9,#8b5cf6)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.55)", letterSpacing: ".03em" }}>
        {label}{note && <span style={{ fontWeight: 400, color: "rgba(255,255,255,.3)", marginLeft: 5 }}>({note})</span>}
      </label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "linear-gradient(160deg,rgba(19,27,50,.98),rgba(15,22,42,.98))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 20, padding: "22px 24px", marginBottom: 0,
};

const sLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: ".1em",
  color: "rgba(255,255,255,.35)", marginBottom: 12, textTransform: "uppercase",
};

const credBox: React.CSSProperties = {
  background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 12, padding: "12px 14px",
};
const credLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 };
const credVal:   React.CSSProperties = { fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "rgba(255,255,255,.7)" };

const css = `
  @keyframes pmToastIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
  .pm-gw-card { transition: border-color .18s; }
  .pm-edit-btn { width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.4);cursor:pointer;display:grid;place-items:center;transition:all .12s; }
  .pm-edit-btn:hover { background:rgba(255,255,255,.06);color:white; }
  .pm-toggle { display:inline-flex;align-items:center;gap:8px;background:transparent;border:none;cursor:pointer;padding:0; }
  .pm-toggle:disabled { opacity:.6;cursor:not-allowed; }
  .pm-toggle-track { width:38px;height:22px;border-radius:999px;background:rgba(148,163,184,.2);position:relative;transition:background .18s;flex-shrink:0; }
  .pm-toggle--on .pm-toggle-track { background:#22c55e; }
  .pm-toggle-thumb { position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .18s;box-shadow:0 1px 3px rgba(0,0,0,.3); }
  .pm-toggle--on .pm-toggle-thumb { left:19px; }
  .pm-toggle-label { font-size:12px;font-weight:800;color:rgba(255,255,255,.35); }
  .pm-toggle--on .pm-toggle-label { color:#4ade80; }
  .pm-input { padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:white;font-family:inherit;font-size:13px;outline:none;transition:border-color .14s;width:100%;box-sizing:border-box; }
  .pm-input:focus { border-color:#8b5cf6; }
`;
