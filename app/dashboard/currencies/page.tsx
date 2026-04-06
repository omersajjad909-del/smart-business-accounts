"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

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

function authHeaders() {
  const user = getCurrentUser();
  return {
    ...(user?.id   ? { "x-user-id":   user.id }   : {}),
    ...(user?.role ? { "x-user-role": user.role } : {}),
  };
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: 1,
  });

  useEffect(() => { fetchCurrencies(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
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
      showToast("Network error Ã¢â‚¬â€ please try again");
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
      showToast("Network error Ã¢â‚¬â€ please try again");
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--app-bg)", fontFamily: FONT, padding: "28px 24px", color: "var(--text-primary)" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: ACCENT, color: "#fff",
          fontFamily: FONT, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 24px rgba(99,102,241,0.4)",
        }}>
          {toast}
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
    </div>
  );
}
