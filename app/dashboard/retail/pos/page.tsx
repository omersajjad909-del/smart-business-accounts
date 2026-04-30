"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

const ff = "'Outfit','Inter',sans-serif";

type CartItem = { id: string; name: string; price: number; qty: number; category: string; sku: string; itemNewId?: string };

type ReceiptData = {
  receiptNo: string;
  soldAt: string;
  items: CartItem[];
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

type CompanyInfo = {
  name: string;
  address?: string;
  phone?: string;
  ntn?: string;
};

export default function POSPage() {
  const user = getCurrentUser();
  const { records: productRecords, loading: loadingProducts, update: updateProduct } = useBusinessRecords("catalog_product");
  const { records: saleRecords, create: createSale } = useBusinessRecords("pos_sale");
  const { records: sessionRecords, update: updateSession } = useBusinessRecords("pos_session");
  const activeSession = sessionRecords.find(s => s.status === "OPEN") || null;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [barcodeMsg, setBarcodeMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [discount, setDiscount] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [tendered, setTendered] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "easypaisa" | "jazzcash">("cash");
  const [company, setCompany] = useState<CompanyInfo>({ name: "My Store" });
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const authHeaders = (): HeadersInit => {
    const h = user as { id?: string; role?: string; companyId?: string } | null;
    return { "x-user-id": h?.id || "", "x-user-role": h?.role || "ADMIN", "x-company-id": h?.companyId || "" };
  };

  function loadStock() {
    fetch("/api/inventory", { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then((data: { itemId: string; qty: number }[]) => {
        const map: Record<string, number> = {};
        data.forEach(d => { map[d.itemId] = d.qty; });
        setStockMap(map);
      })
      .catch(() => {});
  }

  useEffect(() => {
    const h = user as { id?: string; role?: string; companyId?: string; name?: string } | null;
    const headers: HeadersInit = { "x-user-id": h?.id || "", "x-user-role": h?.role || "ADMIN", "x-company-id": h?.companyId || "" };
    fetch("/api/me/company", { headers })
      .then(r => r.json())
      .then(d => { if (d?.name) setCompany({ name: d.name, address: d.address, phone: d.phone, ntn: d.ntn }); })
      .catch(() => {});
    loadStock();
  }, [user]);

  const products = productRecords
    .filter(r => r.status !== "inactive")
    .map(r => ({
      id: r.id,
      name: r.title,
      category: (r.data?.category as string) || "General",
      price: r.amount || 0,
      sku: (r.data?.sku as string) || "",
      itemNewId: (r.data?.itemNewId as string) || "",
    }));

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const matchCat = cat === "All" || p.category === cat;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const todaySales = saleRecords.filter(r => r.createdAt?.split("T")[0] === new Date().toISOString().split("T")[0]);
  const todayTotal = todaySales.reduce((a, r) => a + (r.amount || 0), 0);
  const cashTotal = todaySales.filter(r => r.data?.payMethod === "cash").reduce((a, r) => a + (r.amount || 0), 0);
  const cardTotal = todaySales.filter(r => r.data?.payMethod !== "cash").reduce((a, r) => a + (r.amount || 0), 0);
  const nextReceiptNo = `POS-${String(saleRecords.length + 1).padStart(4, "0")}`;

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discAmt = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const taxPct = Math.max(0, Math.min(100, Number(taxRate) || 0));
  const taxAmt = Math.round((subtotal - discAmt) * taxPct / 100);
  const total = subtotal - discAmt + taxAmt;
  const tenderedAmt = Number(tendered) || 0;
  const change = payMethod === "cash" && tenderedAmt >= total ? tenderedAmt - total : 0;

  function availableStock(prod: typeof products[0]): number {
    if (!prod.itemNewId) return 9999; // not synced to item master — no restriction
    return stockMap[prod.itemNewId] ?? 0;
  }

  function addToCart(prod: typeof products[0]) {
    setCheckoutError("");
    const inCart = cart.find(i => i.id === prod.id)?.qty || 0;
    const avail = availableStock(prod);
    if (inCart + 1 > avail) {
      setCheckoutError(`"${prod.name}" — stock nahi hai. Available: ${avail}`);
      return;
    }
    setCart(prev => {
      const ex = prev.find(i => i.id === prod.id);
      if (ex) return prev.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...prod, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCheckoutError("");
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  }

  function removeItem(id: string) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  function handleBarcodeEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = barcode.trim();
    if (!q) return;
    const match = products.find(p => p.sku && p.sku.toLowerCase() === q.toLowerCase())
      || products.find(p => p.name.toLowerCase().includes(q.toLowerCase()));
    if (match) {
      addToCart(match);
      setBarcode("");
      setBarcodeMsg({ text: `✓ ${match.name} added`, ok: true });
    } else {
      setBarcodeMsg({ text: `No product found for "${q}"`, ok: false });
    }
    setTimeout(() => setBarcodeMsg(null), 2000);
    if (barcodeRef.current) barcodeRef.current.select();
  }

  async function checkout() {
    if (cart.length === 0) { setCheckoutError("Cart is empty."); return; }
    if (total <= 0) { setCheckoutError("Total must be greater than zero."); return; }
    if (payMethod === "cash" && tendered && tenderedAmt < total) { setCheckoutError(`Cash tendered (Rs. ${tenderedAmt}) is less than total (Rs. ${total}).`); return; }

    // Final stock re-check before checkout
    for (const item of cart) {
      const avail = availableStock(item as any);
      if (item.qty > avail) {
        setCheckoutError(`"${item.name}" — insufficient stock. Available: ${avail}, In cart: ${item.qty}`);
        return;
      }
    }

    setProcessingCheckout(true);
    setCheckoutError("");
    try {
      const snapshot = cart.map(i => ({ ...i }));
      const now = new Date();
      const cashierName = (user as { name?: string } | null)?.name || "Cashier";

      // Deduct stock from InventoryTxn via API
      const syncedItems = snapshot.filter(i => i.itemNewId);
      if (syncedItems.length > 0) {
        const stockRes = await fetch("/api/pos-checkout", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            date: now.toISOString(),
            items: syncedItems.map(i => ({ itemNewId: i.itemNewId, name: i.name, qty: i.qty, rate: i.price })),
          }),
        });
        if (!stockRes.ok) {
          const err = await stockRes.json();
          setCheckoutError(err.error || "Stock deduction failed");
          setProcessingCheckout(false);
          return;
        }
        loadStock(); // refresh stock display
      }

      const saved = await createSale({
        title: nextReceiptNo,
        status: "completed",
        amount: total,
        data: { payMethod, items: snapshot.map(i => `${i.name} x${i.qty}`).join(", "), discount: discAmt, taxRate: taxPct, taxAmt, subtotal, cart: snapshot, tendered: tenderedAmt, change, cashierName, sessionId: activeSession?.id || null, sessionRef: activeSession?.title || null },
      });

      if (activeSession) {
        const isCash = payMethod === "cash";
        await updateSession(activeSession.id, {
          amount: (activeSession.amount || 0) + total,
          data: {
            cashSales: Number(activeSession.data?.cashSales || 0) + (isCash ? total : 0),
            cardSales: Number(activeSession.data?.cardSales || 0) + (!isCash ? total : 0),
            transactions: Number(activeSession.data?.transactions || 0) + 1,
          },
        });
      }

      setReceipt({
        receiptNo: saved.title || nextReceiptNo,
        soldAt: now.toISOString(),
        items: snapshot,
        subtotal, discount: discAmt, taxRate: taxPct, taxAmt, total,
        payMethod, tendered: tenderedAmt, change,
        cashierName,
      });
      setCart([]);
      setDiscount("");
      setTendered("");
    } catch {
      setCheckoutError("Checkout failed. Please try again.");
    }
    setProcessingCheckout(false);
  }

  async function clearCart() {
    if (cart.length === 0) return;
    if (!await confirmToast("Clear the current cart?")) return;
    setCart([]); setDiscount(""); setTendered(""); setCheckoutError("");
  }

  function printReceipt() { window.print(); }

  const PAY_METHODS = [
    { id: "cash", label: "Cash", color: "#10b981" },
    { id: "card", label: "Card", color: "#6366f1" },
    { id: "easypaisa", label: "EasyPaisa", color: "#10b981" },
    { id: "jazzcash", label: "JazzCash", color: "#dc2626" },
  ] as const;

  const inp: React.CSSProperties = { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: ff };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", color: "#fff", fontFamily: ff, display: "flex", flexDirection: "column" }}>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #pos-receipt { display: block !important; position: fixed; inset: 0; }
          #pos-receipt-paper { margin: 0 auto; }
        }
        #pos-receipt { display: none; }
        .prod-card:hover { background: rgba(99,102,241,.18) !important; border-color: rgba(99,102,241,.4) !important; transform: translateY(-1px); }
        .prod-card { transition: all .15s; }
      `}</style>

      {/* Session Banner */}
      {!activeSession && (
        <div style={{ background: "rgba(245,158,11,.1)", borderBottom: "1px solid rgba(245,158,11,.2)", padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>⚠️ No active session — sales will not be linked to any cashier shift.</span>
          <a href="/dashboard/retail/pos-sessions" style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>Open Session →</a>
        </div>
      )}
      {activeSession && (
        <div style={{ background: "rgba(16,185,129,.08)", borderBottom: "1px solid rgba(16,185,129,.15)", padding: "7px 24px", display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>🟢 Active Session: {activeSession.title}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Cashier: {String(activeSession.data?.cashier || "—")}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Branch: {String(activeSession.data?.branch || "—")}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Txns: {Number(activeSession.data?.transactions || 0)}</span>
          <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700, marginLeft: "auto" }}>Session Sales: Rs. {(activeSession.amount || 0).toLocaleString()}</span>
          <a href="/dashboard/retail/pos-sessions" style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textDecoration: "none", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, padding: "3px 10px" }}>Close Session</a>
        </div>
      )}

      {/* Top Stats Bar */}
      <div style={{ display: "flex", background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        {[
          { label: "TODAY SALES", value: `Rs. ${todayTotal.toLocaleString()}`, color: "#34d399", href: null },
          { label: "TRANSACTIONS", value: todaySales.length, color: "#fff", href: "/dashboard/retail/sales-history" },
          { label: "CASH", value: `Rs. ${cashTotal.toLocaleString()}`, color: "#10b981", href: null },
          { label: "CARD / DIGITAL", value: `Rs. ${cardTotal.toLocaleString()}`, color: "#6366f1", href: null },
          { label: "NEXT RECEIPT #", value: nextReceiptNo, color: "#f59e0b", href: "/dashboard/retail/sales-history" },
        ].map(s => (
          <div
            key={s.label}
            onClick={() => s.href && (window.location.href = s.href)}
            style={{ flex: 1, padding: "12px 20px", borderRight: "1px solid rgba(255,255,255,.05)", cursor: s.href ? "pointer" : "default" }}
          >
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: ".06em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            {s.href && <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", marginTop: 2 }}>click to view →</div>}
          </div>
        ))}
      </div>

      {/* Main: Products | Cart */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* LEFT — Products */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Barcode Scanner Bar */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", background: "#0a1020" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>📷</span>
                <input
                  ref={barcodeRef}
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  onKeyDown={handleBarcodeEnter}
                  placeholder="Scan barcode or type SKU → Enter to add"
                  style={{ ...inp, paddingLeft: 38, background: "rgba(99,102,241,.08)", border: `1px solid ${barcodeMsg ? (barcodeMsg.ok ? "rgba(52,211,153,.4)" : "rgba(248,113,113,.4)") : "rgba(99,102,241,.25)"}`, fontSize: 13, fontWeight: 600 }}
                  autoFocus
                />
              </div>
              {barcodeMsg && (
                <div style={{ fontSize: 12, fontWeight: 700, color: barcodeMsg.ok ? "#34d399" : "#f87171", whiteSpace: "nowrap", padding: "8px 12px", background: barcodeMsg.ok ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", borderRadius: 8, border: `1px solid ${barcodeMsg.ok ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}` }}>
                  {barcodeMsg.text}
                </div>
              )}
            </div>
          </div>

          {/* Search + Category */}
          <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,.05)", background: "#0d1424" }}>
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Browse / search products..."
              style={{ ...inp, marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${cat === c ? "#6366f1" : "rgba(255,255,255,.1)"}`, background: cat === c ? "rgba(99,102,241,.25)" : "transparent", color: cat === c ? "#a5b4fc" : "rgba(255,255,255,.55)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            {loadingProducts && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>Loading products...</div>}
            {!loadingProducts && products.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.3)" }}>
                No products found. <a href="/dashboard/retail/catalog" style={{ color: "#6366f1" }}>Add products →</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
              {filtered.map(p => (
                <div
                  key={p.id}
                  className="prod-card"
                  onClick={() => addToCart(p)}
                  style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${p.itemNewId && (stockMap[p.itemNewId] ?? 0) <= 0 ? "rgba(239,68,68,.4)" : "rgba(255,255,255,.08)"}`, borderRadius: 14, padding: "16px 14px", cursor: p.itemNewId && (stockMap[p.itemNewId] ?? 0) <= 0 ? "not-allowed" : "pointer", userSelect: "none", opacity: p.itemNewId && (stockMap[p.itemNewId] ?? 0) <= 0 ? 0.5 : 1 }}
                >
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{p.category}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{p.name}</div>
                  {p.sku && <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginBottom: 6, letterSpacing: ".04em" }}>SKU: {p.sku}</div>}
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#6366f1" }}>Rs. {p.price.toLocaleString()}</div>
                  {p.itemNewId && (
                    <div style={{ fontSize: 10, marginTop: 6, fontWeight: 700, color: (stockMap[p.itemNewId] ?? 0) <= 0 ? "#ef4444" : (stockMap[p.itemNewId] ?? 0) <= 5 ? "#f59e0b" : "#10b981" }}>
                      Stock: {stockMap[p.itemNewId] ?? 0}
                    </div>
                  )}
                </div>
              ))}
              {!loadingProducts && filtered.length === 0 && products.length > 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "rgba(255,255,255,.3)" }}>No products match "{search || cat}"</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Cart */}
        <div style={{ width: 380, background: "#0d1424", borderLeft: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column" }}>

          {/* Cart Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              🛒 Cart <span style={{ color: "rgba(255,255,255,.4)", fontWeight: 400 }}>({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
            </div>
            {receipt && (
              <button onClick={printReceipt} style={{ background: "rgba(99,102,241,.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.3)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                🖨 Last Receipt
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
            {cart.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,.2)" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🛒</div>
                <div style={{ fontSize: 14 }}>Cart is empty</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Tap products to add</div>
              </div>
            )}
            {cart.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.25)", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Rs. {item.price.toLocaleString()} each</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => changeQty(item.id, -1)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,.08)", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ width: 24, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)} style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(99,102,241,.3)", border: "none", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                <div style={{ minWidth: 70, textAlign: "right", fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>Rs. {(item.price * item.qty).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Cart Footer */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,.06)" }}>

            {/* Subtotal */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,.55)", marginBottom: 8 }}>
              <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>

            {/* Discount */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap" }}>Discount (Rs.)</span>
              <input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" type="number" min="0" style={{ ...inp, padding: "7px 10px", flex: 1 }} />
            </div>
            {discAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#f87171", marginBottom: 8 }}>
                <span>Discount</span><span>− Rs. {discAmt.toLocaleString()}</span>
              </div>
            )}

            {/* Tax */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", whiteSpace: "nowrap" }}>Tax (%)</span>
              <input value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0" type="number" min="0" max="100" style={{ ...inp, padding: "7px 10px", flex: 1 }} />
            </div>
            {taxAmt > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#fbbf24", marginBottom: 8 }}>
                <span>Tax ({taxPct}%)</span><span>+ Rs. {taxAmt.toLocaleString()}</span>
              </div>
            )}

            {/* Total */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 800, borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 10, marginBottom: 14 }}>
              <span>Total</span>
              <span style={{ color: "#6366f1" }}>Rs. {total.toLocaleString()}</span>
            </div>

            {/* Payment Method */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              {PAY_METHODS.map(m => (
                <button key={m.id} onClick={() => setPayMethod(m.id)} style={{ padding: "9px 0", borderRadius: 8, border: `1px solid ${payMethod === m.id ? m.color : "rgba(255,255,255,.1)"}`, background: payMethod === m.id ? `${m.color}22` : "transparent", color: payMethod === m.id ? m.color : "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Cash Tendered */}
            {payMethod === "cash" && (
              <div style={{ marginBottom: 10 }}>
                <input value={tendered} onChange={e => setTendered(e.target.value)} placeholder="Cash received (Rs.)" type="number" min="0" style={{ ...inp, marginBottom: 4 }} />
                {tenderedAmt >= total && total > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#34d399", fontWeight: 700, padding: "6px 10px", background: "rgba(52,211,153,.08)", borderRadius: 6 }}>
                    <span>Change Due</span><span>Rs. {change.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {checkoutError && (
              <div style={{ marginBottom: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.25)", color: "#fca5a5", fontSize: 12 }}>
                {checkoutError}
              </div>
            )}

            {/* Checkout Button */}
            <button
              onClick={checkout}
              disabled={cart.length === 0 || processingCheckout}
              style={{ width: "100%", background: cart.length > 0 ? "linear-gradient(135deg,#6366f1,#4f46e5)" : "rgba(255,255,255,.08)", color: cart.length > 0 ? "#fff" : "rgba(255,255,255,.3)", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 800, cursor: cart.length > 0 ? "pointer" : "not-allowed", marginBottom: 8, letterSpacing: ".02em" }}
            >
              {processingCheckout ? "Processing..." : `Checkout  ·  Rs. ${total.toLocaleString()}`}
            </button>

            <button onClick={clearCart} style={{ width: "100%", background: "rgba(239,68,68,.1)", color: "#f87171", border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {receipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99, padding: 20 }}>
          <div style={{ background: "#111827", borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", padding: 20, width: "min(96vw,560px)", maxHeight: "90vh", overflow: "auto" }}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#34d399" }}>✅ Sale Completed</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 2 }}>Receipt #{receipt.receiptNo}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={printReceipt} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  🖨 Print
                </button>
                <button onClick={() => setReceipt(null)} style={{ background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "10px 18px", fontSize: 13, cursor: "pointer" }}>
                  Close
                </button>
              </div>
            </div>

            {/* Thermal Receipt Preview */}
            <div id="pos-print-area" style={{ maxWidth: 320, margin: "0 auto", background: "#fff", color: "#111", borderRadius: 8, padding: "20px 18px", fontFamily: "'Courier New',Courier,monospace", fontSize: 13 }}>
              {/* Store Header */}
              <div style={{ textAlign: "center", borderBottom: "1px dashed #999", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: ".03em" }}>{company.name.toUpperCase()}</div>
                {company.address && <div style={{ fontSize: 11, color: "#444", marginTop: 3 }}>{company.address}</div>}
                {company.phone && <div style={{ fontSize: 11, color: "#444" }}>Tel: {company.phone}</div>}
                {company.ntn && <div style={{ fontSize: 11, color: "#444" }}>NTN: {company.ntn}</div>}
                <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>SALES RECEIPT</div>
              </div>

              {/* Receipt Info */}
              <div style={{ marginBottom: 10, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Receipt #</span>
                  <strong>{receipt.receiptNo}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span>Date</span>
                  <span>{new Date(receipt.soldAt).toLocaleDateString("en-GB")} {new Date(receipt.soldAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span>Cashier</span>
                  <span>{receipt.cashierName}</span>
                </div>
              </div>

              {/* Items */}
              <div style={{ borderTop: "1px dashed #999", borderBottom: "1px dashed #999", padding: "10px 0", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>
                  <span style={{ flex: 1 }}>Item</span>
                  <span style={{ width: 28, textAlign: "center" }}>Qty</span>
                  <span style={{ width: 32, textAlign: "center" }}>Rate</span>
                  <span style={{ width: 60, textAlign: "right" }}>Amount</span>
                </div>
                {receipt.items.map(item => (
                  <div key={item.id} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#333", marginTop: 2 }}>
                      <span style={{ flex: 1 }}>  {item.qty} × Rs. {item.price.toLocaleString()}</span>
                      <span style={{ fontWeight: 700 }}>Rs. {(item.qty * item.price).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ fontSize: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Subtotal</span><span>Rs. {receipt.subtotal.toLocaleString()}</span>
                </div>
                {receipt.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#dc2626" }}>
                    <span>Discount</span><span>− Rs. {receipt.discount.toLocaleString()}</span>
                  </div>
                )}
                {receipt.taxAmt > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#d97706" }}>
                    <span>Tax ({receipt.taxRate}%)</span><span>+ Rs. {receipt.taxAmt.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ borderTop: "1px solid #999", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}>
                  <span>TOTAL</span><span>Rs. {receipt.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment */}
              <div style={{ borderTop: "1px dashed #999", paddingTop: 10, fontSize: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Payment</span><span style={{ textTransform: "capitalize", fontWeight: 700 }}>{receipt.payMethod}</span>
                </div>
                {receipt.payMethod === "cash" && receipt.tendered > 0 && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>Cash Received</span><span>Rs. {receipt.tendered.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                      <span>Change</span><span>Rs. {receipt.change.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{ borderTop: "1px dashed #999", paddingTop: 10, textAlign: "center", fontSize: 11, color: "#555" }}>
                <div>Thank you for your business!</div>
                <div style={{ marginTop: 3 }}>Please come again</div>
                <div style={{ marginTop: 6, fontSize: 10, color: "#999" }}>Powered by FinovaOS</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print area — renders only during print */}
      {receipt && (
        <div id="pos-receipt">
          <div id="pos-receipt-paper" style={{ width: 320, margin: "0 auto", fontFamily: "'Courier New',Courier,monospace", fontSize: 13, color: "#000", background: "#fff", padding: "20px 18px" }}>
            <div style={{ textAlign: "center", borderBottom: "1px dashed #999", paddingBottom: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{company.name.toUpperCase()}</div>
              {company.address && <div style={{ fontSize: 11 }}>{company.address}</div>}
              {company.phone && <div style={{ fontSize: 11 }}>Tel: {company.phone}</div>}
              {company.ntn && <div style={{ fontSize: 11 }}>NTN: {company.ntn}</div>}
              <div style={{ fontSize: 11 }}>SALES RECEIPT</div>
            </div>
            <div style={{ marginBottom: 10, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Receipt #</span><strong>{receipt.receiptNo}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Date</span><span>{new Date(receipt.soldAt).toLocaleDateString("en-GB")} {new Date(receipt.soldAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>Cashier</span><span>{receipt.cashierName}</span></div>
            </div>
            <div style={{ borderTop: "1px dashed #999", borderBottom: "1px dashed #999", padding: "10px 0", marginBottom: 10 }}>
              {receipt.items.map(item => (
                <div key={item.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>  {item.qty} × Rs. {item.price.toLocaleString()}</span>
                    <span style={{ fontWeight: 700 }}>Rs. {(item.qty * item.price).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Subtotal</span><span>Rs. {receipt.subtotal.toLocaleString()}</span></div>
              {receipt.discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Discount</span><span>− Rs. {receipt.discount.toLocaleString()}</span></div>}
              {receipt.taxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Tax ({receipt.taxRate}%)</span><span>+ Rs. {receipt.taxAmt.toLocaleString()}</span></div>}
              <div style={{ borderTop: "1px solid #999", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}><span>TOTAL</span><span>Rs. {receipt.total.toLocaleString()}</span></div>
            </div>
            <div style={{ borderTop: "1px dashed #999", paddingTop: 10, fontSize: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Payment</span><span style={{ textTransform: "capitalize", fontWeight: 700 }}>{receipt.payMethod}</span></div>
              {receipt.payMethod === "cash" && receipt.tendered > 0 && <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Cash Received</span><span>Rs. {receipt.tendered.toLocaleString()}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Change</span><span>Rs. {receipt.change.toLocaleString()}</span></div>
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
