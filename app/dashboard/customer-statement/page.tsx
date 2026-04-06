"use client";

import { useEffect, useState, useCallback } from "react";

const ACCENT = "#6366f1";
const ACCENT_LIGHT = "rgba(99,102,241,0.12)";
const FONT = "'Outfit','Inter',sans-serif";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type Contact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
};

type TxRow = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

type Statement = {
  openingBalance: number;
  transactions: TxRow[];
  closingBalance: number;
};

const EMPTY_STATEMENT: Statement = {
  openingBalance: 0,
  transactions: [],
  closingBalance: 0,
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomerStatementPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [dateFrom, setDateFrom] = useState(firstOfMonthStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [statement, setStatement] = useState<Statement | null>(null);
  const [stmtLoading, setStmtLoading] = useState(false);

  useEffect(() => {
    setContactsLoading(true);
    const user = typeof window !== "undefined" ? (() => { try { const s = localStorage.getItem("user"); return s ? JSON.parse(s) : null; } catch { return null; } })() : null;
    fetch("/api/crm/contacts", {
      credentials: "include",
      headers: {
        ...(user?.id ? { "x-user-id": user.id } : {}),
        ...(user?.role ? { "x-user-role": user.role } : {}),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setContacts(data);
        else if (Array.isArray(data?.contacts)) setContacts(data.contacts);
      })
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, []);

  const fetchStatement = useCallback(
    (customer: Contact, from: string, to: string) => {
      setStmtLoading(true);
      const user = typeof window !== "undefined" ? (() => { try { const s = localStorage.getItem("user"); return s ? JSON.parse(s) : null; } catch { return null; } })() : null;
      fetch(
        `/api/reports/customer-statement?customerId=${customer.id}&from=${from}&to=${to}`,
        {
          credentials: "include",
          headers: {
            ...(user?.id ? { "x-user-id": user.id } : {}),
            ...(user?.role ? { "x-user-role": user.role } : {}),
          },
        }
      )
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.rows)) {
            setStatement({
              openingBalance: data.openingBalance ?? 0,
              transactions: data.rows.map((r: any) => ({
                date: r.date,
                description: r.description + (r.ref ? ` #${r.ref}` : ""),
                debit: r.debit ?? 0,
                credit: r.credit ?? 0,
                balance: r.balance ?? 0,
              })),
              closingBalance: data.closingBalance ?? 0,
            });
          } else {
            setStatement(EMPTY_STATEMENT);
          }
        })
        .catch(() => {
          setStatement(EMPTY_STATEMENT);
        })
        .finally(() => setStmtLoading(false));
    },
    []
  );

  const handleSelectCustomer = (c: Contact) => {
    setSelectedCustomer(c);
    fetchStatement(c, dateFrom, dateTo);
  };

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    if (selectedCustomer) fetchStatement(selectedCustomer, from, to);
  };

  const handlePrint = () => window.print();

  const filtered = contacts.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--app-bg)",
        fontFamily: FONT,
        padding: "28px 24px",
        color: "var(--text-primary)",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
          }}
        >
          Customer Statement
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
          View detailed transaction history per customer
        </p>
      </div>

      {/* Date range row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange(e.target.value, dateTo)}
            style={dateInputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            style={dateInputStyle}
          />
        </label>
        {selectedCustomer && !stmtLoading && statement && (
          <button
            onClick={handlePrint}
            style={{
              marginTop: 16,
              padding: "8px 20px",
              borderRadius: 8,
              border: `1px solid ${ACCENT}`,
              background: ACCENT_LIGHT,
              color: ACCENT,
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>&#128438;</span> Export / Print PDF
          </button>
        )}
      </div>

      {/* Two-panel layout */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left: customer list */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--app-bg)",
                color: "var(--text-primary)",
                fontFamily: FONT,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {contactsLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Loading customers...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No customers found
              </div>
            ) : (
              filtered.map((c) => {
                const isActive = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    style={{
                      padding: "12px 16px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                      background: isActive ? ACCENT_LIGHT : "transparent",
                      borderLeft: isActive ? `3px solid ${ACCENT}` : "3px solid transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: isActive ? ACCENT : "var(--text-primary)" }}>
                      {c.name}
                    </div>
                    {c.email && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.email}</div>
                    )}
                    {c.phone && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.phone}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: statement panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedCustomer ? (
            <EmptyState
              icon="&#128100;"
              title="Select a Customer"
              subtitle="Choose a customer from the list to view their statement"
            />
          ) : stmtLoading ? (
            <LoadingCard />
          ) : !statement ? (
            <EmptyState icon="&#128203;" title="No Data" subtitle="No transactions found for this period" />
          ) : (
            <StatementPanel
              customer={selectedCustomer}
              dateFrom={dateFrom}
              dateTo={dateTo}
              statement={statement}
              accent={ACCENT}
              accentLight={ACCENT_LIGHT}
              debitLabel="Invoice Amount"
              creditLabel="Payment Received"
            />
          )}
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #stmt-printable, #stmt-printable * { visibility: visible !important; }
          #stmt-printable { position: fixed; inset: 0; padding: 32px; background: #fff; color: #111; }
        }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function StatementPanel({
  customer,
  dateFrom,
  dateTo,
  statement,
  accent,
  accentLight,
  debitLabel,
  creditLabel,
}: {
  customer: Contact;
  dateFrom: string;
  dateTo: string;
  statement: Statement;
  accent: string;
  accentLight: string;
  debitLabel: string;
  creditLabel: string;
}) {
  return (
    <div
      id="stmt-printable"
      style={{
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Statement header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
            Statement of Account
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{customer.name}</div>
          {customer.email && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{customer.email}</div>
          )}
        </div>
        <div style={{ textAlign: "right", fontSize: 13, color: "var(--text-muted)" }}>
          <div>Period: {dateFrom} &rarr; {dateTo}</div>
        </div>
      </div>

      {/* Opening balance */}
      <div
        style={{
          padding: "12px 24px",
          background: accentLight,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 600,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>Opening Balance</span>
        <span style={{ color: accent }}>{fmt(statement.openingBalance)}</span>
      </div>

      {/* Transactions table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--app-bg)" }}>
              {["Date", "Description", debitLabel, creditLabel, "Balance"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: h === "Date" || h === "Description" ? "left" : "right",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statement.transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)" }}
                >
                  No transactions in this period
                </td>
              </tr>
            ) : (
              statement.transactions.map((tx, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <td style={{ padding: "11px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {tx.date}
                  </td>
                  <td style={{ padding: "11px 16px", color: "var(--text-primary)" }}>{tx.description}</td>
                  <td style={{ padding: "11px 16px", textAlign: "right", color: tx.debit > 0 ? "#f87171" : "var(--text-muted)" }}>
                    {tx.debit > 0 ? fmt(tx.debit) : "—"}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", color: tx.credit > 0 ? "#34d399" : "var(--text-muted)" }}>
                    {tx.credit > 0 ? fmt(tx.credit) : "—"}
                  </td>
                  <td
                    style={{
                      padding: "11px 16px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: tx.balance >= 0 ? accent : "#f87171",
                    }}
                  >
                    {fmt(tx.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Closing balance */}
      <div
        style={{
          padding: "14px 24px",
          background: accentLight,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 15,
          fontWeight: 700,
          borderTop: "1px solid var(--border)",
        }}
      >
        <span>Closing Balance</span>
        <span style={{ color: accent }}>{fmt(statement.closingBalance)}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        textAlign: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 48 }}>{icon}</span>
      <div style={{ fontWeight: 700, fontSize: 17 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{subtitle}</div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 40px",
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        gap: 12,
        color: "var(--text-muted)",
        fontSize: 14,
      }}
    >
      <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>&#9696;</span>
      Loading statement...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const dateInputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--panel-bg)",
  color: "var(--text-primary)",
  fontFamily: FONT,
  fontSize: 13,
  outline: "none",
};
