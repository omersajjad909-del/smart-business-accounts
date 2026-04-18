"use client";

import { useEffect, useState, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

const FONT = "'Outfit','Inter',sans-serif";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function firstOfYearStr() { return `${new Date().getFullYear()}-01-01`; }

type Contact = { id: string; name: string; phone?: string; email?: string };
type TxRow   = { date: string; description: string; debit: number; credit: number; balance: number };
type Statement = { openingBalance: number; transactions: TxRow[]; closingBalance: number };

const fmt = (n: number) => Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CustomerStatementPage() {
  const [contacts,  setContacts]  = useState<Contact[]>([]);
  const [search,    setSearch]    = useState("");
  const [dropOpen,  setDropOpen]  = useState(false);
  const [selected,  setSelected]  = useState<Contact | null>(null);
  const [dateFrom,  setDateFrom]  = useState(firstOfYearStr());
  const [dateTo,    setDateTo]    = useState(todayStr());
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    fetch("/api/crm/contacts", {
      credentials: "include",
      headers: { "x-user-id": user?.id || "", "x-user-role": user?.role || "", "x-company-id": user?.companyId || "" },
    }).then(r => r.json()).then(d => setContacts(Array.isArray(d) ? d : Array.isArray(d?.contacts) ? d.contacts : [])).catch(() => {});
  }, []);

  const fetchStatement = useCallback((c: Contact, from: string, to: string) => {
    setLoading(true);
    const user = getCurrentUser();
    fetch(`/api/reports/customer-statement?customerId=${c.id}&from=${from}&to=${to}`, {
      credentials: "include",
      headers: { "x-user-id": user?.id || "", "x-user-role": user?.role || "", "x-company-id": user?.companyId || "" },
    }).then(r => r.json()).then(d => {
      if (d && Array.isArray(d.rows)) {
        setStatement({
          openingBalance: d.openingBalance ?? 0,
          transactions: d.rows.map((r: any) => ({
            date: r.date, description: r.description + (r.ref ? ` #${r.ref}` : ""),
            debit: r.debit ?? 0, credit: r.credit ?? 0, balance: r.balance ?? 0,
          })),
          closingBalance: d.closingBalance ?? 0,
        });
      } else { setStatement({ openingBalance: 0, transactions: [], closingBalance: 0 }); }
    }).catch(() => setStatement({ openingBalance: 0, transactions: [], closingBalance: 0 }))
      .finally(() => setLoading(false));
  }, []);

  function generate() {
    if (!selected) return;
    setShowModal(false);
    fetchStatement(selected, dateFrom, dateTo);
  }

  const filtered = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 8, color: "rgba(255,255,255,.85)", padding: "10px 14px",
    fontSize: 13, fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.35)",
    letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  return (
    <div style={{ fontFamily: FONT, color: "rgba(255,255,255,.85)" }}>

      {/* ── MODAL ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "linear-gradient(145deg,#0f1a35,#0b1225)",
            border: "1px solid rgba(99,102,241,.25)",
            borderRadius: 18, padding: "36px 40px", width: "100%", maxWidth: 480,
            boxShadow: "0 32px 80px rgba(0,0,0,.6)",
          }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 4, height: 24, borderRadius: 2, background: "linear-gradient(180deg,#818cf8,#6366f1)" }}/>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Customer Statement</h2>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.3)", paddingLeft: 14 }}>
                Select customer and date range to generate statement
              </p>
            </div>

            {/* Autocomplete */}
            <div style={{ marginBottom: 20, position: "relative" }}>
              <label style={labelStyle}>Customer</label>
              <input
                type="text"
                placeholder="Type to search customer..."
                style={{ ...inputStyle, paddingRight: selected ? 36 : 14 }}
                value={selected ? selected.name : search}
                onChange={e => { setSearch(e.target.value); setSelected(null); setDropOpen(true); }}
                onFocus={() => setDropOpen(true)}
                onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                autoFocus
              />
              {selected && (
                <button onClick={() => { setSelected(null); setSearch(""); }} style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 16,
                }}>×</button>
              )}
              {dropOpen && !selected && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                  background: "#0f1a35", border: "1px solid rgba(99,102,241,.3)",
                  borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: "auto",
                  boxShadow: "0 16px 40px rgba(0,0,0,.5)",
                }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: 14, textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 12 }}>No customers found</div>
                  ) : filtered.map(c => (
                    <div key={c.id} onMouseDown={() => { setSelected(c); setSearch(""); setDropOpen(false); }} style={{
                      padding: "10px 14px", cursor: "pointer", fontSize: 13,
                      color: "rgba(255,255,255,.75)", borderBottom: "1px solid rgba(255,255,255,.04)",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.15)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div>{c.name}</div>
                      {c.email && <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{c.email}</div>}
                    </div>
                  ))}
                </div>
              )}
              {selected && <div style={{ marginTop: 5, fontSize: 11, color: "#818cf8" }}>✓ {selected.name}</div>}
            </div>

            {/* Dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
              <div>
                <label style={labelStyle}>From Date</label>
                <input type="date" style={inputStyle} value={dateFrom} onChange={e => setDateFrom(e.target.value)}/>
              </div>
              <div>
                <label style={labelStyle}>To Date</label>
                <input type="date" style={inputStyle} value={dateTo} onChange={e => setDateTo(e.target.value)}/>
              </div>
            </div>

            <button onClick={generate} disabled={!selected} style={{
              width: "100%", padding: 12, borderRadius: 10, border: "none",
              cursor: selected ? "pointer" : "not-allowed",
              background: selected ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.08)",
              color: selected ? "white" : "rgba(255,255,255,.3)",
              fontSize: 14, fontWeight: 700, fontFamily: FONT,
            }}>Generate Statement →</button>
          </div>
        </div>
      )}

      {/* ── Statement ── */}
      {!showModal && (
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: "linear-gradient(180deg,#818cf8,#6366f1)" }}/>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.4px", margin: 0 }}>Customer Statement</h1>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setShowModal(true); setStatement(null); }} style={{
                padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)",
                cursor: "pointer", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.6)",
                fontSize: 12, fontWeight: 600, fontFamily: FONT,
              }}>⟵ Change Customer</button>
              <button onClick={() => window.print()} style={{
                padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(99,102,241,.3)",
                cursor: "pointer", background: "rgba(99,102,241,.08)", color: "#818cf8",
                fontSize: 12, fontWeight: 600, fontFamily: FONT,
              }}>🖨 Print</button>
            </div>
          </div>

          <div id="stmt-printable" style={{
            background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
            borderRadius: 16, overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "32px 36px 28px",
              background: "linear-gradient(135deg,rgba(99,102,241,.12) 0%,rgba(79,70,229,.06) 100%)",
              borderBottom: "1px solid rgba(255,255,255,.08)",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>Customer Statement</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "white", letterSpacing: "-.4px" }}>{selected?.name}</div>
                {selected?.email && <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 4 }}>{selected.email}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>Reporting Period</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>
                  {dateFrom} <span style={{ color: "rgba(255,255,255,.25)" }}>—</span> {dateTo}
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "60px 0", textAlign: "center", color: "rgba(255,255,255,.25)", fontSize: 13 }}>Loading statement…</div>
            ) : !statement ? null : (
              <>
                {/* Opening balance */}
                <div style={{ padding: "12px 24px", background: "rgba(99,102,241,.06)", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                  <span style={{ color: "rgba(255,255,255,.4)" }}>Opening Balance</span>
                  <span style={{ color: "#818cf8" }}>{fmt(statement.openingBalance)}</span>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                        {["Date","Description","Invoice Amount","Payment Received","Balance"].map((h, i) => (
                          <th key={h} style={{
                            padding: "10px 16px", fontSize: 10, fontWeight: 700,
                            color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase",
                            textAlign: i >= 2 ? "right" : "left", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {statement.transactions.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: "50px 0", textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 13 }}>No transactions in this period</td></tr>
                      ) : statement.transactions.map((tx, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.012)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,.05)"}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,.012)"}
                        >
                          <td style={{ padding: "10px 16px", color: "rgba(255,255,255,.4)", whiteSpace: "nowrap", fontSize: 12 }}>{tx.date}</td>
                          <td style={{ padding: "10px 16px", color: "rgba(255,255,255,.7)" }}>{tx.description}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: tx.debit > 0 ? "#f87171" : "rgba(255,255,255,.18)" }}>{tx.debit > 0 ? fmt(tx.debit) : "—"}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: tx.credit > 0 ? "#34d399" : "rgba(255,255,255,.18)" }}>{tx.credit > 0 ? fmt(tx.credit) : "—"}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 800, color: tx.balance >= 0 ? "#818cf8" : "#f87171" }}>{fmt(tx.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Closing balance */}
                <div style={{ padding: "16px 24px", background: "rgba(99,102,241,.08)", borderTop: "1px solid rgba(99,102,241,.2)", display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800 }}>
                  <span style={{ color: "rgba(255,255,255,.5)" }}>Closing Balance</span>
                  <span style={{ color: statement.closingBalance >= 0 ? "#818cf8" : "#f87171" }}>
                    {fmt(statement.closingBalance)} <span style={{ fontSize: 11 }}>{statement.closingBalance >= 0 ? "Dr" : "Cr"}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@media print { body * { visibility: hidden !important; } #stmt-printable, #stmt-printable * { visibility: visible !important; } #stmt-printable { position: fixed; inset: 0; padding: 32px; background: #fff; color: #111; } }`}</style>
    </div>
  );
}
