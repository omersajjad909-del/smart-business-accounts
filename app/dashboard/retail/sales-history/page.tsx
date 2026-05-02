"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { confirmToast } from "@/lib/toast-feedback";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";

const ff = "'Outfit','Inter',sans-serif";

type CartItem = { id: string; name: string; price: number; qty: number };
type Sale = {
  id: string;
  receiptNo: string;
  date: string;
  time: string;
  items: CartItem[];
  itemsSummary: string;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmt: number;
  total: number;
  payMethod: string;
  tendered: number;
  change: number;
  cashierName: string;
};

const PAY_COLOR: Record<string, string> = {
  cash: "#10b981", card: "#6366f1", easypaisa: "#10b981", jazzcash: "#ef4444",
};
const PAY_BG: Record<string, string> = {
  cash: "rgba(16,185,129,.12)", card: "rgba(99,102,241,.12)", easypaisa: "rgba(16,185,129,.12)", jazzcash: "rgba(239,68,68,.12)",
};

export default function SalesHistoryPage() {
  const { records, loading, remove } = useBusinessRecords("pos_sale");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [payFilter, setPayFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);

  const sales: Sale[] = records.map(r => {
    const d = r.data || {};
    const cart = (d.cart as CartItem[]) || [];
    const dt = new Date(r.createdAt);
    return {
      id: r.id,
      receiptNo: r.title,
      date: dt.toLocaleDateString("en-GB"),
      time: dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      items: cart,
      itemsSummary: String(d.items || ""),
      subtotal: Number(d.subtotal || r.amount || 0),
      discount: Number(d.discount || 0),
      taxRate: Number(d.taxRate || 0),
      taxAmt: Number(d.taxAmt || 0),
      total: r.amount || 0,
      payMethod: String(d.payMethod || "cash"),
      tendered: Number(d.tendered || 0),
      change: Number(d.change || 0),
      cashierName: String(d.cashierName || "—"),
    };
  });

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || s.receiptNo.toLowerCase().includes(q)
      || s.itemsSummary.toLowerCase().includes(q)
      || s.cashierName.toLowerCase().includes(q)
      || s.items.some(i => i.name.toLowerCase().includes(q));
    const sDateMs = new Date(s.date.split("/").reverse().join("-")).getTime();
    const matchFrom = !dateFrom || sDateMs >= new Date(dateFrom).getTime();
    const matchTo = !dateTo || sDateMs <= new Date(dateTo).getTime();
    const matchPay = payFilter === "all" || s.payMethod === payFilter;
    return matchSearch && matchFrom && matchTo && matchPay;
  });

  const totalRevenue = filtered.reduce((s, r) => s + r.total, 0);
  const totalTax = filtered.reduce((s, r) => s + r.taxAmt, 0);
  const totalDiscount = filtered.reduce((s, r) => s + r.discount, 0);

  async function deleteSale(id: string, receiptNo: string) {
    if (!await confirmToast(`Delete ${receiptNo}? This cannot be undone.`)) return;
    await remove(id);
    if (expandedId === id) setExpandedId(null);
  }

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 13, fontFamily: ff,
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh", background: "#0a0f1a" }}>
      <style>{`
        @media print { body > * { display:none!important; } #sh-print { display:block!important; position:fixed; inset:0; } }
        #sh-print { display: none; }
        .sale-row:hover { background: rgba(255,255,255,.025) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>🧾 Sales History</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", margin: 0 }}>Sab POS bills — dekho, print karo, ya delete karo</p>
        </div>
        <a href="/dashboard/retail/pos" style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          ← POS Terminal
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Bills", value: filtered.length, color: "#818cf8", icon: "🧾" },
          { label: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, color: "#34d399", icon: "💰" },
          { label: "Total Tax", value: `Rs. ${totalTax.toLocaleString()}`, color: "#fbbf24", icon: "📊" },
          { label: "Total Discount", value: `Rs. ${totalDiscount.toLocaleString()}`, color: "#f87171", icon: "🏷️" },
        ].map(s => (
          <div key={s.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "18px 22px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search receipt #, item, cashier..."
          style={{ ...inp, flex: 1, minWidth: 220 }}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)", whiteSpace: "nowrap" }}>From</span>
          <DateInput value={dateFrom} onChange={setDateFrom} style={{ ...inp, width: 145 }} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)", whiteSpace: "nowrap" }}>To</span>
          <DateInput value={dateTo} onChange={setDateTo} style={{ ...inp, width: 145 }} />
        </div>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} style={{ ...inp, width: 130, cursor: "pointer" }}>
          <option value="all">All Payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="easypaisa">EasyPaisa</option>
          <option value="jazzcash">JazzCash</option>
        </select>
        {(search || dateFrom || dateTo || payFilter !== "all") && (
          <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setPayFilter("all"); }}
            style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Bills List */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)", fontSize: 14 }}>Loading...</div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.2)", fontSize: 14 }}>
          {sales.length === 0 ? "Abhi koi sale nahi hui. POS Terminal se pehli sale karo." : "Koi bill match nahi karta."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(sale => {
          const isOpen = expandedId === sale.id;
          const payColor = PAY_COLOR[sale.payMethod] || "#94a3b8";
          const payBg = PAY_BG[sale.payMethod] || "rgba(148,163,184,.1)";
          const itemCount = sale.items.length || sale.itemsSummary.split(",").length;

          return (
            <div key={sale.id} style={{ background: "rgba(255,255,255,.03)", border: `1px solid ${isOpen ? "rgba(99,102,241,.3)" : "rgba(255,255,255,.07)"}`, borderRadius: 14, overflow: "hidden", transition: "border-color .15s" }}>

              {/* Main Row */}
              <div
                className="sale-row"
                onClick={() => setExpandedId(isOpen ? null : sale.id)}
                style={{ display: "grid", gridTemplateColumns: "140px 100px 1fr 110px 130px 120px auto", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer" }}
              >
                {/* Receipt # */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#818cf8" }}>{sale.receiptNo}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{itemCount} item{itemCount !== 1 ? "s" : ""}</div>
                </div>

                {/* Date */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{sale.date}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>{sale.time}</div>
                </div>

                {/* Items preview */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {sale.items.length > 0
                    ? sale.items.map(i => `${i.name} ×${i.qty}`).join("  ·  ")
                    : sale.itemsSummary}
                </div>

                {/* Payment badge */}
                <div>
                  <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 20, background: payBg, color: payColor, fontSize: 12, fontWeight: 700, textTransform: "capitalize", border: `1px solid ${payColor}30` }}>
                    {sale.payMethod}
                  </span>
                </div>

                {/* Cashier */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textAlign: "center" }}>
                  {sale.cashierName !== "—" ? sale.cashierName : ""}
                </div>

                {/* Total */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#34d399" }}>Rs. {sale.total.toLocaleString()}</div>
                  {sale.discount > 0 && <div style={{ fontSize: 10, color: "#f87171", marginTop: 1 }}>−Rs. {sale.discount.toLocaleString()} disc</div>}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button
                    title="Print Receipt"
                    onClick={() => { setPrintSale(sale); setTimeout(() => window.print(), 80); }}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.25)", color: "#a5b4fc", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >🖨</button>
                  <button
                    title="Delete Bill"
                    onClick={() => deleteSale(sale.id, sale.receiptNo)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >🗑</button>
                  <div style={{ width: 24, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.2)", fontSize: 11 }}>
                    {isOpen ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {isOpen && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", display: "grid", gridTemplateColumns: "1fr 300px", gap: 0 }}>

                  {/* Items */}
                  <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,.06)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>Items Sold</div>
                    {sale.items.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {sale.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#818cf8" }}>
                              {item.qty}
                            </div>
                            <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{item.name}</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Rs. {item.price.toLocaleString()} each</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", minWidth: 80, textAlign: "right" }}>Rs. {(item.qty * item.price).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}>{sale.itemsSummary}</div>
                    )}
                  </div>

                  {/* Summary */}
                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>Bill Summary</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "rgba(255,255,255,.45)" }}>Subtotal</span>
                        <span>Rs. {sale.subtotal.toLocaleString()}</span>
                      </div>
                      {sale.discount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "#f87171" }}>Discount</span>
                          <span style={{ color: "#f87171" }}>− Rs. {sale.discount.toLocaleString()}</span>
                        </div>
                      )}
                      {sale.taxAmt > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "#fbbf24" }}>Tax ({sale.taxRate}%)</span>
                          <span style={{ color: "#fbbf24" }}>+ Rs. {sale.taxAmt.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10, marginTop: 2, display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800 }}>
                        <span>Total</span>
                        <span style={{ color: "#34d399" }}>Rs. {sale.total.toLocaleString()}</span>
                      </div>
                      <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 10, background: `${payBg}`, border: `1px solid ${payColor}25` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: "rgba(255,255,255,.45)" }}>Payment</span>
                          <span style={{ color: payColor, fontWeight: 700, textTransform: "capitalize" }}>{sale.payMethod}</span>
                        </div>
                        {sale.payMethod === "cash" && sale.tendered > 0 && (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6 }}>
                              <span style={{ color: "rgba(255,255,255,.35)" }}>Cash Received</span>
                              <span>Rs. {sale.tendered.toLocaleString()}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                              <span style={{ color: "rgba(255,255,255,.35)" }}>Change Given</span>
                              <span style={{ fontWeight: 700 }}>Rs. {sale.change.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden print receipt */}
      {printSale && (
        <div id="sh-print">
          <div style={{ width: 320, margin: "0 auto", fontFamily: "'Courier New',Courier,monospace", fontSize: 13, color: "#000", background: "#fff", padding: "20px 18px" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #999", paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: ".02em" }}>SALES RECEIPT</div>
            </div>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Receipt #</span><strong>{printSale.receiptNo}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Date</span><span>{printSale.date} {printSale.time}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Cashier</span><span>{printSale.cashierName}</span></div>
            </div>
            <div style={{ borderTop: "1px dashed #999", borderBottom: "1px dashed #999", padding: "10px 0", marginBottom: 10 }}>
              {printSale.items.map((item, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>  {item.qty} × Rs. {item.price.toLocaleString()}</span>
                    <span style={{ fontWeight: 700 }}>Rs. {(item.qty * item.price).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span>Subtotal</span><span>Rs. {printSale.subtotal.toLocaleString()}</span></div>
              {printSale.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span>Discount</span><span>− Rs. {printSale.discount.toLocaleString()}</span></div>}
              {printSale.taxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span>Tax ({printSale.taxRate}%)</span><span>+ Rs. {printSale.taxAmt.toLocaleString()}</span></div>}
              <div style={{ borderTop: "1px solid #999", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}><span>TOTAL</span><span>Rs. {printSale.total.toLocaleString()}</span></div>
            </div>
            <div style={{ borderTop: "1px dashed #999", paddingTop: 10, fontSize: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment</span><span style={{ textTransform: "capitalize", fontWeight: 700 }}>{printSale.payMethod}</span></div>
              {printSale.payMethod === "cash" && printSale.tendered > 0 && <>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Cash Received</span><span>Rs. {printSale.tendered.toLocaleString()}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontWeight: 700 }}><span>Change</span><span>Rs. {printSale.change.toLocaleString()}</span></div>
              </>}
            </div>
            <div style={{ borderTop: "1px dashed #999", paddingTop: 10, textAlign: "center", fontSize: 11 }}>
              <div>Thank you for your business!</div>
              <div style={{ marginTop: 3 }}>Please come again</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
