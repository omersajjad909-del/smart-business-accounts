"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const S = {
  page: { minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: "'Outfit','Inter',sans-serif", display: "flex", flexDirection: "column" as const },
  statsBar: { display: "flex", gap: "0", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.02)" },
  statItem: { flex: 1, padding: "14px 20px", borderRight: "1px solid rgba(255,255,255,.07)" },
  statLabel: { fontSize: "11px", color: "rgba(255,255,255,.4)", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
  statValue: { fontSize: "20px", fontWeight: 700, marginTop: "4px" },
  main: { display: "flex", flex: 1, overflow: "hidden" },
  leftPanel: { flex: 1, padding: "24px", overflowY: "auto" as const, borderRight: "1px solid rgba(255,255,255,.07)" },
  rightPanel: { width: "360px", display: "flex", flexDirection: "column" as const, background: "rgba(255,255,255,.02)" },
  catBar: { display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" as const },
  catBtn: (active: boolean) => ({ background: active ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,.05)", color: active ? "#fff" : "rgba(255,255,255,.6)", border: "1px solid", borderColor: active ? "transparent" : "rgba(255,255,255,.1)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }),
  prodGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "12px" },
  prodCard: { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: "12px", padding: "16px", cursor: "pointer" },
  cartItems: { flex: 1, overflowY: "auto" as const, padding: "12px 20px" },
  cartItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)" },
  qtyBtn: { background: "rgba(255,255,255,.1)", border: "none", color: "#fff", width: "26px", height: "26px", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: 700, display: "flex" as const, alignItems: "center", justifyContent: "center" },
  cartFooter: { padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,.07)" },
  checkoutBtn: { width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: "10px", padding: "14px", fontSize: "15px", fontWeight: 700, cursor: "pointer" },
};

type CartItem = { id: string; name: string; price: number; qty: number; category: string };

type PrintPreferences = {
  paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM";
  receiptTemplate: "standard" | "mart" | "restaurant";
  showLogo: boolean;
  logoUrl: string;
  headerNote: string;
  footerNote: string;
  thermalFontSize: "sm" | "md" | "lg";
};

type LastSaleReceipt = {
  id: string;
  soldAt: string;
  receiptNo: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  payMethod: string;
};

const DEFAULT_PRINT: PrintPreferences = {
  paperSize: "THERMAL_80MM",
  receiptTemplate: "mart",
  showLogo: true,
  logoUrl: "",
  headerNote: "",
  footerNote: "Thank you for shopping with us.",
  thermalFontSize: "md",
};

export default function POSPage() {
  const user = getCurrentUser();
  const { records: productRecords, loading: loadingProducts } = useBusinessRecords("catalog_product");
  const { records: saleRecords, create: createSale } = useBusinessRecords("pos_sale");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cat, setCat] = useState("All");
  const [discount, setDiscount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [companyName, setCompanyName] = useState("Your Store");
  const [printPrefs, setPrintPrefs] = useState<PrintPreferences>(DEFAULT_PRINT);
  const [lastReceipt, setLastReceipt] = useState<LastSaleReceipt | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    async function loadCompanyContext() {
      try {
        const headers: HeadersInit = {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "ADMIN",
          "x-company-id": user?.companyId || "",
        };
        const [companyRes, printRes] = await Promise.all([
          fetch("/api/me/company", { headers }),
          fetch("/api/company/admin-control", { headers }),
        ]);

        if (companyRes.ok) {
          const company = await companyRes.json();
          if (company?.name) setCompanyName(company.name);
        }

        if (printRes.ok) {
          const settings = await printRes.json();
          if (settings?.printPreferences) {
            setPrintPrefs((prev) => ({ ...prev, ...settings.printPreferences }));
          }
        }
      } catch {}
    }

    loadCompanyContext();
  }, [user?.companyId, user?.id, user?.role]);

  const products = productRecords
    .filter((r) => r.status !== "inactive")
    .map((r) => ({
      id: r.id,
      name: r.title,
      category: (r.data?.category as string) || "General",
      price: r.amount || 0,
    }));

  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const filtered = cat === "All" ? products : products.filter((p) => p.category === cat);

  const todaySales = saleRecords.filter((r) => r.createdAt?.split("T")[0] === new Date().toISOString().split("T")[0]);
  const todayTotal = todaySales.reduce((a, r) => a + (r.amount || 0), 0);
  const cashTotal = todaySales.filter((r) => r.data?.payMethod === "cash").reduce((a, r) => a + (r.amount || 0), 0);
  const cardTotal = todaySales.filter((r) => r.data?.payMethod === "card").reduce((a, r) => a + (r.amount || 0), 0);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discAmt = Math.min(subtotal, Number(discount) || 0);
  const total = subtotal - discAmt;
  const isThermalPrint = printPrefs.paperSize !== "A4";
  const thermalWidth = printPrefs.paperSize === "THERMAL_58MM" ? "58mm" : "80mm";
  const receiptFontSize = printPrefs.thermalFontSize === "sm" ? 11 : printPrefs.thermalFontSize === "lg" ? 14 : 12;

  function addToCart(prod: { id: string; name: string; price: number; category: string }) {
    setCheckoutError("");
    setCart((prev) => {
      const ex = prev.find((i) => i.id === prod.id);
      if (ex) return prev.map((i) => (i.id === prod.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...prod, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCheckoutError("");
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  }

  async function checkout() {
    if (cart.length === 0) {
      setCheckoutError("Add at least one item before checkout.");
      return;
    }
    if (cart.some((item) => item.price <= 0)) {
      setCheckoutError("Cart contains an item with zero or invalid price.");
      return;
    }
    if (discAmt < 0 || total <= 0) {
      setCheckoutError("Review the discount before checkout. Total must stay above zero.");
      return;
    }
    if (!payMethod) {
      setCheckoutError("Select a payment method before checkout.");
      return;
    }
    setCheckoutError("");
    const snapshot = cart.map((item) => ({ ...item }));
    const now = new Date();
    const items = snapshot.map((i) => `${i.name} x${i.qty}`).join(", ");
    const saved = await createSale({
      title: `Sale - ${now.toLocaleTimeString()}`,
      status: "completed",
      amount: total,
      data: { payMethod, items, discount: discAmt, subtotal, cart: snapshot },
    });

    setLastReceipt({
      id: saved.id,
      soldAt: now.toISOString(),
      receiptNo: `POS-${saved.id.slice(0, 8).toUpperCase()}`,
      items: snapshot,
      subtotal,
      discount: discAmt,
      total,
      payMethod,
    });
    setCart([]);
    setDiscount("");
  }

  async function clearCart() {
    if (cart.length === 0) return;
    if (!await confirmToast("Clear the current cart?")) return;
    setCart([]);
    setDiscount("");
    setCheckoutError("");
  }

  function printReceipt() {
    window.print();
  }

  return (
    <div style={S.page}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pos-print-area, #pos-print-area * { visibility: visible; }
          #pos-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: ${isThermalPrint ? thermalWidth : "210mm"};
            max-width: ${isThermalPrint ? thermalWidth : "210mm"};
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div style={S.statsBar}>
        {[
          { label: "Today Sales", value: `Rs. ${todayTotal.toLocaleString()}` },
          { label: "Transactions", value: todaySales.length },
          { label: "Cash", value: `Rs. ${cashTotal.toLocaleString()}` },
          { label: "Card", value: `Rs. ${cardTotal.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} style={S.statItem}>
            <div style={S.statLabel}>{s.label}</div>
            <div style={S.statValue}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={S.main}>
        <div style={S.leftPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Products</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)" }}>
                Active receipt format: {isThermalPrint ? `Thermal ${thermalWidth}` : "A4"} / {printPrefs.receiptTemplate}
              </div>
            </div>
            {lastReceipt && (
              <button onClick={printReceipt} style={{ ...S.checkoutBtn, width: "auto", padding: "10px 16px" }}>
                Print Last Receipt
              </button>
            )}
          </div>

          <div style={S.catBar}>
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} style={S.catBtn(cat === c)}>{c}</button>
            ))}
          </div>
          {loadingProducts && <div style={{ color: "rgba(255,255,255,.4)", textAlign: "center", padding: 40 }}>Loading products...</div>}
          {!loadingProducts && products.length === 0 && (
            <div style={{ color: "rgba(255,255,255,.3)", textAlign: "center", padding: 40 }}>
              No products in catalog. Add products in <a href="/dashboard/retail/catalog" style={{ color: "#6366f1" }}>Product Catalog</a> first.
            </div>
          )}
          <div style={S.prodGrid}>
            {filtered.map((p) => (
              <div key={p.id} style={S.prodCard} onClick={() => addToCart(p)}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 4 }}>{p.category}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#6366f1" }}>Rs. {p.price.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.rightPanel}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Cart ({cart.length} items)</div>
          </div>

          <div style={S.cartItems}>
            {cart.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,.2)", paddingTop: 60 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>Cart</div>
                <div>Tap products to add</div>
              </div>
            )}
            {cart.map((item) => (
              <div key={item.id} style={S.cartItem}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                <button style={S.qtyBtn} onClick={() => changeQty(item.id, -1)}>-</button>
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                <button style={S.qtyBtn} onClick={() => changeQty(item.id, 1)}>+</button>
                <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 700, minWidth: 64, textAlign: "right" }}>
                  Rs. {(item.price * item.qty).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div style={S.cartFooter}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>
              <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            <input
              placeholder="Discount (Rs.)"
              value={discount}
              onChange={(e) => {
                const nextValue = e.target.value;
                if (nextValue && Number(nextValue) < 0) {
                  setCheckoutError("Discount cannot be negative.");
                  return;
                }
                setCheckoutError("");
                setDiscount(nextValue);
              }}
              style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
            />
            {checkoutError && (
              <div style={{ marginBottom: 8, borderRadius: 8, border: "1px solid rgba(248,113,113,.28)", background: "rgba(248,113,113,.12)", color: "#fca5a5", padding: "8px 10px", fontSize: 12 }}>
                {checkoutError}
              </div>
            )}
            {discAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#ef4444", marginBottom: 8 }}>
                <span>Discount</span><span>- Rs. {discAmt.toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700, margin: "12px 0", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.1)" }}>
              <span>Total</span><span style={{ color: "#6366f1" }}>Rs. {total.toLocaleString()}</span>
            </div>
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="jazzcash">JazzCash</option>
            </select>
            <button onClick={checkout} disabled={cart.length === 0} style={{ ...S.checkoutBtn, opacity: cart.length === 0 ? 0.5 : 1 }}>
              Checkout - Rs. {total.toLocaleString()}
            </button>
            <button
              onClick={clearCart}
              style={{ width: "100%", background: "rgba(239,68,68,.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,.3)", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 }}
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {lastReceipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(3,7,18,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 40 }}>
          <div style={{ width: "min(96vw, 560px)", maxHeight: "90vh", overflow: "auto", background: "#111827", borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Sale completed</div>
                <div style={{ color: "rgba(255,255,255,.45)", fontSize: 12 }}>Receipt ready in {isThermalPrint ? `thermal ${thermalWidth}` : "A4"} format</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={printReceipt} style={{ ...S.checkoutBtn, width: "auto", padding: "10px 16px" }}>Print</button>
                <button onClick={() => setLastReceipt(null)} style={{ background: "rgba(255,255,255,.05)", color: "white", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "10px 16px", cursor: "pointer" }}>Close</button>
              </div>
            </div>

            <div
              id="pos-print-area"
              style={{
                width: isThermalPrint ? thermalWidth : "100%",
                maxWidth: isThermalPrint ? thermalWidth : 520,
                margin: "0 auto",
                background: "white",
                color: "#111827",
                borderRadius: isThermalPrint ? 0 : 14,
                padding: isThermalPrint ? 14 : 28,
                fontSize: receiptFontSize,
              }}
            >
              <div style={{ textAlign: "center", borderBottom: "1px dashed #9ca3af", paddingBottom: 10, marginBottom: 10 }}>
                {printPrefs.showLogo && printPrefs.logoUrl && (
                  <div style={{ margin: "0 auto 8px", width: isThermalPrint ? 48 : 72 }}>
                    <Image src={printPrefs.logoUrl} alt="Company logo" width={isThermalPrint ? 48 : 72} height={isThermalPrint ? 48 : 72} style={{ width: "100%", height: "auto" }} unoptimized />
                  </div>
                )}
                <div style={{ fontSize: isThermalPrint ? 16 : 20, fontWeight: 800 }}>{companyName}</div>
                <div style={{ fontSize: receiptFontSize - 1, color: "#4b5563" }}>{printPrefs.receiptTemplate === "restaurant" ? "Kitchen / Counter Receipt" : "Sales Receipt"}</div>
                {printPrefs.headerNote && (
                  <div style={{ fontSize: receiptFontSize - 1, color: "#4b5563", marginTop: 6 }}>{printPrefs.headerNote}</div>
                )}
              </div>

              <div style={{ display: "grid", gap: 4, marginBottom: 10, fontSize: receiptFontSize - 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Receipt</span><strong>{lastReceipt.receiptNo}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Date</span><span>{new Date(lastReceipt.soldAt).toLocaleString()}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Payment</span><span style={{ textTransform: "capitalize" }}>{lastReceipt.payMethod}</span></div>
              </div>

              <div style={{ borderTop: "1px dashed #9ca3af", borderBottom: "1px dashed #9ca3af", padding: "8px 0" }}>
                {lastReceipt.items.map((item) => (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: isThermalPrint ? "1fr auto" : "1.6fr auto auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: "#6b7280", fontSize: receiptFontSize - 1 }}>{item.qty} x Rs. {item.price.toLocaleString()}</div>
                    </div>
                    {!isThermalPrint && <div style={{ color: "#6b7280" }}>{item.qty}</div>}
                    <div style={{ textAlign: "right", fontWeight: 700 }}>Rs. {(item.qty * item.price).toLocaleString()}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>Rs. {lastReceipt.subtotal.toLocaleString()}</span></div>
                {lastReceipt.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#b91c1c" }}><span>Discount</span><span>- Rs. {lastReceipt.discount.toLocaleString()}</span></div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: receiptFontSize + 1 }}>
                  <span>Total</span><span>Rs. {lastReceipt.total.toLocaleString()}</span>
                </div>
              </div>

              {printPrefs.footerNote && (
                <div style={{ borderTop: "1px dashed #9ca3af", marginTop: 12, paddingTop: 10, textAlign: "center", color: "#4b5563", fontSize: receiptFontSize - 1 }}>
                  {printPrefs.footerNote}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
