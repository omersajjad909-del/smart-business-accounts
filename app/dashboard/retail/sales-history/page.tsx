"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { confirmToast } from "@/lib/toast-feedback";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

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
  status: string;
};

const PAY_COLOR: Record<string, string> = {
  cash: "#10b981", card: "#6366f1", easypaisa: "#10b981", jazzcash: "#dc2626",
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
      status: r.status || "completed",
    };
  });

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.receiptNo.toLowerCase().includes(q) || s.itemsSummary.toLowerCase().includes(q) || s.cashierName.toLowerCase().includes(q);
    const sDate = new Date(s.date.split("/").reverse().join("-"));
    const matchFrom = !dateFrom || sDate >= new Date(dateFrom);
    const matchTo = !dateTo || sDate <= new Date(dateTo);
    const matchPay = payFilter === "all" || s.payMethod === payFilter;
    return matchSearch && matchFrom && matchTo && matchPay;
  });

  const totalRevenue = filtered.reduce((s, r) => s + r.total, 0);
  const totalTax = filtered.reduce((s, r) => s + r.taxAmt, 0);
  const totalDiscount = filtered.reduce((s, r) => s + r.discount, 0);

  async function deleteSale(id: string, receiptNo: string) {
    if (!await confirmToast(`Delete bill ${receiptNo}? This cannot be undone.`)) return;
    await remove(id);
    if (expandedId === id) setExpandedId(null);
  }

  const inp: React.CSSProperties = {
    background: bg, border: `1px solid ${border}`, borderRadius: 8,
    padding: "9px 12px", color: "#fff", fontSize: 13, fontFamily: ff, outline: "none",
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #sh-print { display: block !important; position: fixed; inset: 0; }
        }
        #sh-print { display: none; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>🧾 Sales History</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Sab POS bills — dekho, print karo, ya delete karo</p>
        </div>
        <a href="/dashboard/retail/pos" style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${border}`, color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          ← POS Terminal
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Bills Shown", value: filtered.length, color: "#fff" },
          { label: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, color: "#34d399" },
          { label: "Total Tax", value: `Rs. ${totalTax.toLocaleString()}`, color: "#fbbf24" },
          { label: "Total Discount", value: `Rs. ${totalDiscount.toLocaleString()}`, color: "#f87171" },
        ].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Receipt #, item, cashier..."
          style={{ ...inp, flex: 1, minWidth: 200 }}
        />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 150 }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 150 }} />
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} style={{ ...inp, width: 140, cursor: "pointer" }}>
          <option value="all">All Payments</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="easypaisa">EasyPaisa</option>
          <option value="jazzcash">JazzCash</option>
        </select>
        {(search || dateFrom || dateTo || payFilter !== "all") && (
          <button onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setPayFilter("all"); }} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${border}`, background: "rgba(239,68,68,.1)", color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        {loading && <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
            {sales.length === 0 ? "Abhi koi sale nahi hui. POS Terminal se pehli sale karo." : "No bills match your filters."}
          </div>
        )}

        {filtered.map(sale => (
          <div key={sale.id} style={{ borderBottom: `1px solid ${border}` }}>
            {/* Row */}
            <div
              onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
              style={{ display: "flex", alignItems: "center", padding: "14px 20px", cursor: "pointer", gap: 16 }}
            >
              {/* Receipt # */}
              <div style={{ minWidth: 100, fontWeight: 800, color: "#818cf8", fontSize: 14 }}>{sale.receiptNo}</div>

              {/* Date/Time */}
              <div style={{ minWidth: 120 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{sale.date}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{sale.time}</div>
              </div>

              {/* Items summary */}
              <div style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sale.items.length > 0
                  ? sale.items.map(i => `${i.name} ×${i.qty}`).join(", ")
                  : sale.itemsSummary || "—"}
              </div>

              {/* Payment */}
              <div style={{ minWidth: 80 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: PAY_COLOR[sale.payMethod] || "#94a3b8", background: `${PAY_COLOR[sale.payMethod] || "#94a3b8"}18`, border: `1px solid ${PAY_COLOR[sale.payMethod] || "#94a3b8"}33`, borderRadius: 6, padding: "2px 8px", textTransform: "capitalize" }}>
                  {sale.payMethod}
                </span>
              </div>

              {/* Cashier */}
              <div style={{ minWidth: 100, fontSize: 12, color: "rgba(255,255,255,.45)" }}>{sale.cashierName}</div>

              {/* Total */}
              <div style={{ minWidth: 100, textAlign: "right", fontWeight: 800, fontSize: 15, color: "#34d399" }}>
                Rs. {sale.total.toLocaleString()}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { setPrintSale(sale); setTimeout(() => window.print(), 100); }}
                  style={{ padding: "5px 10px", background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                >
                  🖨 Print
                </button>
                <button
                  onClick={() => deleteSale(sale.id, sale.receiptNo)}
                  style={{ padding: "5px 10px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                >
                  Delete
                </button>
              </div>

              <div style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>{expandedId === sale.id ? "▲" : "▼"}</div>
            </div>

            {/* Expanded detail */}
            {expandedId === sale.id && (
              <div style={{ padding: "0 20px 20px 20px", borderTop: `1px solid rgba(255,255,255,.04)` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 16 }}>

                  {/* Items */}
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Items Sold</div>
                    {sale.items.length > 0 ? sale.items.map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid rgba(255,255,255,.04)`, fontSize: 13 }}>
                        <span>{item.name}</span>
                        <span style={{ color: "rgba(255,255,255,.5)" }}>{item.qty} × Rs. {item.price.toLocaleString()} = <strong style={{ color: "#fff" }}>Rs. {(item.qty * item.price).toLocaleString()}</strong></span>
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{sale.itemsSummary}</div>
                    )}
                  </div>

                  {/* Totals */}
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Bill Summary</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "rgba(255,255,255,.5)" }}>Subtotal</span>
                        <span>Rs. {sale.subtotal.toLocaleString()}</span>
                      </div>
                      {sale.discount > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#f87171" }}>Discount</span>
                          <span style={{ color: "#f87171" }}>− Rs. {sale.discount.toLocaleString()}</span>
                        </div>
                      )}
                      {sale.taxAmt > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#fbbf24" }}>Tax ({sale.taxRate}%)</span>
                          <span style={{ color: "#fbbf24" }}>+ Rs. {sale.taxAmt.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, borderTop: `1px solid rgba(255,255,255,.1)`, paddingTop: 8, marginTop: 4 }}>
                        <span>Total</span>
                        <span style={{ color: "#34d399" }}>Rs. {sale.total.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: "rgba(255,255,255,.4)" }}>Payment</span>
                        <span style={{ textTransform: "capitalize", fontWeight: 700, color: PAY_COLOR[sale.payMethod] || "#fff" }}>{sale.payMethod}</span>
                      </div>
                      {sale.payMethod === "cash" && sale.tendered > 0 && (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "rgba(255,255,255,.4)" }}>Cash Received</span>
                            <span>Rs. {sale.tendered.toLocaleString()}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "rgba(255,255,255,.4)" }}>Change Given</span>
                            <span>Rs. {sale.change.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hidden thermal receipt for print */}
      {printSale && (
        <div id="sh-print">
          <div style={{ width: 320, margin: "0 auto", fontFamily: "'Courier New',Courier,monospace", fontSize: 13, color: "#000", background: "#fff", padding: "20px 18px" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #999", paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>SALES RECEIPT</div>
            </div>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Receipt #</span><strong>{printSale.receiptNo}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Date</span><span>{printSale.date} {printSale.time}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Cashier</span><span>{printSale.cashierName}</span></div>
            </div>
            <div style={{ borderTop: "1px dashed #999", borderBottom: "1px dashed #999", padding: "10px 0", marginBottom: 10 }}>
              {printSale.items.map(item => (
                <div key={item.id} style={{ marginBottom: 6 }}>
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
              {printSale.payMethod === "cash" && printSale.tendered > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Cash Received</span><span>Rs. {printSale.tendered.toLocaleString()}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontWeight: 700 }}><span>Change</span><span>Rs. {printSale.change.toLocaleString()}</span></div>
                </>
              )}
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
