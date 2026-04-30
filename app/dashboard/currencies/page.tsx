"use client";
import { confirmToast } from "@/lib/toast-feedback";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

const ACCENT = "#6366f1";
const ACCENT_LIGHT = "rgba(99,102,241,0.12)";
const FONT = "'Outfit','Inter',sans-serif";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
}

interface FXEntry {
  id: string;
  currencyCode: string;
  type: "unrealized" | "realized";
  originalRate: number;
  currentRate: number;
  fcyAmount: number;
  gainLoss: number;
  description: string;
  date: string;
}

function authHeaders() {
  const user = getCurrentUser();
  const h: Record<string, string> = {};
  if (user?.id) h["x-user-id"] = user.id;
  if (user?.role) h["x-user-role"] = user.role;
  if ((user as any)?.companyId) h["x-company-id"] = (user as any).companyId;
  return h;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: 1,
  });

  // FX Gain/Loss state
  const [fxEntries, setFxEntries] = useState<FXEntry[]>([]);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxSaving, setFxSaving] = useState(false);
  const [showFxForm, setShowFxForm] = useState(false);
  const [fxForm, setFxForm] = useState({
    currencyCode: "",
    type: "unrealized" as "unrealized" | "realized",
    fcyAmount: "",
    originalRate: "",
    currentRate: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const fxGainLoss = (() => {
    const orig = parseFloat(fxForm.originalRate) || 0;
    const curr = parseFloat(fxForm.currentRate) || 0;
    const amt = parseFloat(fxForm.fcyAmount) || 0;
    return parseFloat(((curr - orig) * amt).toFixed(2));
  })();

  useEffect(() => { fetchCurrencies(); loadFxEntries(); }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/currencies", {
        credentials: "include",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCurrencies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching currencies:", error);
      setCurrencies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editing ? `/api/currencies?id=${editing}` : "/api/currencies";
      const method = editing ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          ...formData,
          exchangeRate: parseFloat(formData.exchangeRate.toString()),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        showToast(editing ? "Currency updated." : "Currency added.");
        fetchCurrencies();
        setFormData({ code: "", name: "", symbol: "", exchangeRate: 1 });
        setEditing(null);
      } else {
        showToast("Error: " + (data.error || "Failed to save"));
      }
    } catch {
      showToast("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirmToast("Delete this currency?")) return;
    try {
      const response = await fetch(`/api/currencies?id=${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        showToast("Currency deleted.");
        fetchCurrencies();
      } else {
        showToast("Error: " + (data.error || "Failed to delete"));
      }
    } catch {
      showToast("Network error — please try again");
    }
  };

  const handleEdit = (currency: Currency) => {
    setEditing(currency.id);
    setFormData({ code: currency.code, name: currency.name, symbol: currency.symbol, exchangeRate: currency.exchangeRate });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormData({ code: "", name: "", symbol: "", exchangeRate: 1 });
  };

  const loadFxEntries = async () => {
    setFxLoading(true);
    try {
      const res = await fetch("/api/fx-gain-loss", { headers: authHeaders() });
      if (res.ok) setFxEntries(await res.json());
    } catch {}
    setFxLoading(false);
  };

  const saveFxEntry = async () => {
    if (!fxForm.currencyCode || !fxForm.fcyAmount || !fxForm.originalRate || !fxForm.currentRate) {
      toast.error("Fill all required fields"); return;
    }
    setFxSaving(true);
    const body = {
      currencyCode: fxForm.currencyCode,
      type: fxForm.type,
      fcyAmount: parseFloat(fxForm.fcyAmount),
      originalRate: parseFloat(fxForm.originalRate),
      currentRate: parseFloat(fxForm.currentRate),
      gainLoss: fxGainLoss,
      description: fxForm.description,
      date: fxForm.date,
    };
    const res = await fetch("/api/fx-gain-loss", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      toast.success("FX entry recorded");
      setShowFxForm(false);
      setFxForm({ currencyCode: "", type: "unrealized", fcyAmount: "", originalRate: "", currentRate: "", description: "", date: new Date().toISOString().slice(0, 10) });
      loadFxEntries();
    } else {
      const e = await res.json();
      toast.error(e.error || "Failed to save");
    }
    setFxSaving(false);
  };

  const deleteFxEntry = async (id: string) => {
    if (!await confirmToast("Delete this FX entry?")) return;
    const res = await fetch(`/api/fx-gain-loss?id=${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) { toast.success("Deleted"); loadFxEntries(); }
    else toast.error("Delete failed");
  };

  const fmtNum = (n: number) => n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", fontFamily: FONT, padding: "28px 24px", color: "var(--text-primary)" }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: ACCENT, color: "#fff",
          fontFamily: FONT, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
          Currency Management
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          Configure currencies and exchange rates for multi-currency transactions
        </p>
      </div>

      {/* Form */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
          {editing ? "Edit Currency" : "Add New Currency"}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
            {[
              { key: "code",         placeholder: "Code (e.g. USD)",     type: "text"   },
              { key: "name",         placeholder: "Name (e.g. US Dollar)", type: "text" },
              { key: "symbol",       placeholder: "Symbol ($)",            type: "text" },
              { key: "exchangeRate", placeholder: "Exchange Rate",         type: "number" },
            ].map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                placeholder={placeholder}
                step={key === "exchangeRate" ? "0.000001" : undefined}
                value={(formData as any)[key]}
                onChange={(e) => setFormData({ ...formData, [key]: key === "code" ? e.target.value.toUpperCase() : e.target.value })}
                required
                style={{
                  padding: "9px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--app-bg)",
                  color: "var(--text-primary)",
                  fontFamily: FONT,
                  fontSize: 13,
                  outline: "none",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "9px 24px",
                borderRadius: 8,
                border: "none",
                background: loading ? "rgba(99,102,241,0.4)" : ACCENT,
                color: "#fff",
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Saving..." : editing ? "Update" : "Add Currency"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={cancelEdit}
                style={{
                  padding: "9px 24px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-muted)",
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700 }}>
          Configured Currencies ({currencies.length})
        </div>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            Loading currencies...
          </div>
        ) : currencies.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No currencies configured yet
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--app-bg)" }}>
                  {["Code", "Name", "Symbol", "Exchange Rate", "Status", "Actions"].map((h) => (
                    <th key={h} style={{
                      padding: "10px 16px",
                      textAlign: h === "Exchange Rate" ? "right" : "left",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      borderBottom: "1px solid var(--border)",
                      whiteSpace: "nowrap",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currencies.map((currency, i) => (
                  <tr key={currency.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "11px 16px", fontWeight: 700, fontFamily: "monospace", color: ACCENT }}>
                      {currency.code}
                    </td>
                    <td style={{ padding: "11px 16px" }}>{currency.name}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{currency.symbol}</td>
                    <td style={{ padding: "11px 16px", textAlign: "right", fontFamily: "monospace" }}>
                      {Number(currency.exchangeRate).toFixed(6)}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        padding: "2px 10px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: currency.isActive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                        color: currency.isActive ? "#34d399" : "#f87171",
                      }}>
                        {currency.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleEdit(currency)}
                          style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${ACCENT}`, background: ACCENT_LIGHT, color: ACCENT, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(currency.id)}
                          style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.1)", color: "#f87171", fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FX Gain / Loss Section */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>FX Gain / Loss</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Record unrealized and realized foreign exchange differences</div>
          </div>
          <button
            onClick={() => {
              setShowFxForm(v => !v);
              if (!showFxForm && currencies.length > 0) setFxForm(f => ({ ...f, currencyCode: currencies[0].code, originalRate: String(currencies[0].exchangeRate), currentRate: String(currencies[0].exchangeRate) }));
            }}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {showFxForm ? "Cancel" : "+ New FX Entry"}
          </button>
        </div>

        {showFxForm && (
          <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>New FX Gain / Loss Entry</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>CURRENCY *</label>
                <select
                  value={fxForm.currencyCode}
                  onChange={e => {
                    const cur = currencies.find(c => c.code === e.target.value);
                    setFxForm(f => ({ ...f, currencyCode: e.target.value, originalRate: cur ? String(cur.exchangeRate) : f.originalRate, currentRate: cur ? String(cur.exchangeRate) : f.currentRate }));
                  }}
                  style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%" }}
                >
                  <option value="">Select currency</option>
                  {currencies.map(c => <option key={c.id} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>TYPE *</label>
                <select
                  value={fxForm.type}
                  onChange={e => setFxForm(f => ({ ...f, type: e.target.value as "unrealized" | "realized" }))}
                  style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%" }}
                >
                  <option value="unrealized">Unrealized (Open Position)</option>
                  <option value="realized">Realized (Settled)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>FCY AMOUNT *</label>
                <input type="number" step="0.01" placeholder="e.g. 10000" value={fxForm.fcyAmount} onChange={e => setFxForm(f => ({ ...f, fcyAmount: e.target.value }))} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>ORIGINAL RATE *</label>
                <input type="number" step="0.000001" placeholder="Rate when booked" value={fxForm.originalRate} onChange={e => setFxForm(f => ({ ...f, originalRate: e.target.value }))} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>CURRENT RATE *</label>
                <input type="number" step="0.000001" placeholder="Rate today" value={fxForm.currentRate} onChange={e => setFxForm(f => ({ ...f, currentRate: e.target.value }))} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>DATE</label>
                <input type="date" value={fxForm.date} onChange={e => setFxForm(f => ({ ...f, date: e.target.value }))} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: 5 }}>DESCRIPTION</label>
                <input placeholder="e.g. USD receivable from Ali Traders shipment" value={fxForm.description} onChange={e => setFxForm(f => ({ ...f, description: e.target.value }))} style={{ background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", color: "var(--text-primary)", fontFamily: FONT, fontSize: 13, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Live preview */}
            {fxForm.fcyAmount && fxForm.originalRate && fxForm.currentRate && (
              <div style={{ background: fxGainLoss >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${fxGainLoss >= 0 ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Calculated FX {fxGainLoss >= 0 ? "Gain" : "Loss"}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: fxGainLoss >= 0 ? "#34d399" : "#f87171", fontFamily: "monospace" }}>
                  {fxGainLoss >= 0 ? "+" : ""}{fmtNum(fxGainLoss)}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  ({parseFloat(fxForm.currentRate || "0") - parseFloat(fxForm.originalRate || "0") >= 0 ? "+" : ""}{(parseFloat(fxForm.currentRate || "0") - parseFloat(fxForm.originalRate || "0")).toFixed(4)} rate diff × {fmtNum(parseFloat(fxForm.fcyAmount || "0"))} {fxForm.currencyCode})
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveFxEntry} disabled={fxSaving} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: ACCENT, color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {fxSaving ? "Saving..." : "Record Entry"}
              </button>
              <button onClick={() => setShowFxForm(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* FX Entries Table */}
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: 14, fontWeight: 700 }}>
            FX Gain / Loss Ledger ({fxEntries.length})
          </div>
          {fxLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading...</div>
          ) : fxEntries.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>No FX entries recorded yet. Click "+ New FX Entry" to record exchange differences.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--app-bg)" }}>
                    {["Date", "Currency", "Type", "FCY Amount", "Orig. Rate", "Curr. Rate", "Gain / Loss", "Description", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fxEntries.map((entry, i) => (
                    <tr key={entry.id} style={{ borderBottom: i < fxEntries.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, fontFamily: "monospace", color: ACCENT }}>{entry.currencyCode}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: entry.type === "realized" ? "rgba(99,102,241,0.12)" : "rgba(245,158,11,0.12)", color: entry.type === "realized" ? ACCENT : "#f59e0b" }}>
                          {entry.type === "realized" ? "Realized" : "Unrealized"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", textAlign: "right" }}>{fmtNum(entry.fcyAmount)}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", textAlign: "right" }}>{entry.originalRate.toFixed(4)}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", textAlign: "right" }}>{entry.currentRate.toFixed(4)}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700, color: entry.gainLoss >= 0 ? "#34d399" : "#f87171", textAlign: "right" }}>
                        {entry.gainLoss >= 0 ? "+" : ""}{fmtNum(entry.gainLoss)}
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.description || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => deleteFxEntry(entry.id)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.1)", color: "#f87171", fontFamily: FONT, fontSize: 12, cursor: "pointer" }}>Del</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Summary row */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 32, background: "var(--app-bg)" }}>
                {(() => {
                  const totalGain = fxEntries.filter(e => e.gainLoss >= 0).reduce((s, e) => s + e.gainLoss, 0);
                  const totalLoss = fxEntries.filter(e => e.gainLoss < 0).reduce((s, e) => s + e.gainLoss, 0);
                  const net = totalGain + totalLoss;
                  return (
                    <>
                      <div><span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>TOTAL GAIN </span><span style={{ fontFamily: "monospace", fontWeight: 700, color: "#34d399" }}>+{fmtNum(totalGain)}</span></div>
                      <div><span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>TOTAL LOSS </span><span style={{ fontFamily: "monospace", fontWeight: 700, color: "#f87171" }}>{fmtNum(totalLoss)}</span></div>
                      <div><span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>NET </span><span style={{ fontFamily: "monospace", fontWeight: 700, color: net >= 0 ? "#34d399" : "#f87171" }}>{net >= 0 ? "+" : ""}{fmtNum(net)}</span></div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
