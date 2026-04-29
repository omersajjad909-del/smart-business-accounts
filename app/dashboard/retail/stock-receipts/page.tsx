"use client";
import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import Link from "next/link";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

export default function StockReceiptsPage() {
  const { records, loading } = useBusinessRecords("stock_receipt");
  const [search, setSearch] = useState("");

  const receipts = records
    .map(r => ({
      id: r.id,
      title: r.title,
      productName: (r.data?.productName as string) || r.title,
      sku: (r.data?.sku as string) || "",
      qtyReceived: Number(r.data?.qtyReceived) || 0,
      costPrice: Number(r.data?.costPrice) || 0,
      totalCost: r.amount || 0,
      supplierName: (r.data?.supplierName as string) || "—",
      stockBefore: Number(r.data?.stockBefore) || 0,
      stockAfter: Number(r.data?.stockAfter) || 0,
      notes: (r.data?.notes as string) || "",
      date: r.date || r.createdAt.slice(0, 10),
      createdAt: r.createdAt,
    }))
    .filter(r =>
      !search ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(search.toLowerCase())
    );

  const totalReceived = receipts.reduce((s, r) => s + r.qtyReceived, 0);
  const totalCost = receipts.reduce((s, r) => s + r.totalCost, 0);
  const uniqueSuppliers = new Set(receipts.map(r => r.supplierName).filter(s => s !== "—")).size;

  const inp: React.CSSProperties = {
    width: "100%", background: bg, border: `1px solid ${border}`,
    borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13,
    boxSizing: "border-box", fontFamily: ff, outline: "none",
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>📦 Stock Receipts</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
            History of all stock received — maal aane ka record
          </p>
        </div>
        <Link
          prefetch={false}
          href="/dashboard/retail/catalog"
          style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${border}`, background: "transparent", color: "rgba(255,255,255,.7)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}
        >
          ← Product Catalog
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Receipts", value: receipts.length, color: "#34d399" },
          { label: "Total Units Received", value: totalReceived.toLocaleString(), color: "#6366f1" },
          { label: "Total Purchase Cost", value: `Rs. ${totalCost.toLocaleString()}`, color: "#f59e0b" },
          { label: "Unique Suppliers", value: uniqueSuppliers, color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "18px 22px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by product, SKU, or supplier..."
          style={inp}
        />
      </div>

      {/* Table */}
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Date", "Product", "SKU", "Supplier", "Qty In", "Cost/Unit", "Total Cost", "Stock Before → After", "Notes"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: "rgba(255,255,255,.45)", borderBottom: `1px solid ${border}`, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.3)" }}>Loading...</td></tr>
            )}
            {!loading && receipts.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                No stock receipts yet. Use "📦 Receive" button in Product Catalog to add stock.
              </td></tr>
            )}
            {receipts.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{r.date}</td>
                <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.productName}</td>
                <td style={{ padding: "12px 16px", fontSize: 11, color: "rgba(255,255,255,.4)" }}>{r.sku || "—"}</td>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>{r.supplierName}</td>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#34d399" }}>+{r.qtyReceived}</td>
                <td style={{ padding: "12px 16px", fontSize: 13 }}>Rs. {r.costPrice.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f59e0b" }}>Rs. {r.totalCost.toLocaleString()}</td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.55)" }}>
                  {r.stockBefore} → <span style={{ color: "#34d399", fontWeight: 700 }}>{r.stockAfter}</span>
                </td>
                <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.4)" }}>{r.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
