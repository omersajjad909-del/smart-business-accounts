"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ThermalReceipt, generateFBRInvoice, type ReceiptData, type CompanyInfo } from "@/app/dashboard/retail/_components/ThermalReceipt";

const ff = "'Outfit','Inter',sans-serif";

type CartItem = { id: string; name: string; price: number; qty: number; category: string; sku: string; itemNewId?: string };

export default function POSPage() {
  const user = getCurrentUser();
  const { records: productRecords, loading: loadingProducts, update: updateProduct } = useBusinessRecords("catalog_product");
  const { records: saleRecords, create: createSale } = useBusinessRecords("pos_sale");
  const { records: sessionRecords, update: updateSession } = useBusinessRecords("pos_session");
  const activeSession = sessionRecords.find(s => s.status?.toLowerCase() === "open") || null;

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

      const rounded = Math.round(total);
      const rounding = rounded - total;
      const loyaltyEarned = Math.floor(rounded / 10) * 0.1;
      const prevSalesTotal = saleRecords.reduce((a, r) => a + (r.amount || 0), 0);
      const loyaltyTotal = Math.floor(prevSalesTotal / 10) * 0.1 + loyaltyEarned;
      setReceipt({
        receiptNo: saved.title || nextReceiptNo,
        fbrInvoice: generateFBRInvoice(saved.title || nextReceiptNo, now),
        soldAt: now.toISOString(),
        items: snapshot,
        subtotal, discount: discAmt, taxRate: taxPct, taxAmt,
        rounding, total: rounded,
        totalQty: snapshot.reduce((s, i) => s + i.qty, 0),
        payMethod, tendered: tenderedAmt, change,
        cashierName,
        loyaltyEarned, loyaltyTotal,
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
          body * { visibility: hidden !important; }
          #pos-receipt { display: block !important; visibility: visible !important; position: fixed; top:0; left:0; width:100%; z-index:99999; }
          #pos-receipt * { visibility: visible !important; }
          #pos-receipt-paper { margin: 0 auto; }
        }
        #pos-receipt { display: none; }
        .prod-card { transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
        .prod-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(99,102,241,.2) !important; border-color: rgba(99,102,241,.5) !important; }
        .prod-card:active { transform: scale(.97); }
        .pay-btn { transition: all .12s; }
        .pay-btn:hover { opacity: .85; }
        .checkout-btn { transition: box-shadow .15s, opacity .15s; }
        .checkout-btn:hover:not(:disabled) { box-shadow: 0 6px 24px rgba(16,185,129,.4) !important; }
      `}</style>

      {/* Session Banner */}
      {!activeSession ? (
        <div style={{ background: "rgba(245,158,11,.08)", borderBottom: "1px solid rgba(245,158,11,.18)", padding: "7px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>⚠️ No active session — sales will not be linked to a cashier shift.</span>
          <a href="/dashboard/retail/pos-sessions" style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>Open Session →</a>
        </div>
      ) : (
        <div style={{ background: "rgba(16,185,129,.06)", borderBottom: "1px solid rgba(16,185,129,.12)", padding: "6px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>{activeSession.title}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Cashier: {String(activeSession.data?.cashier || "—")}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Branch: {String(activeSession.data?.branch || "—")}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Txns: {Number(activeSession.data?.transactions || 0)}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>Session Sales: Rs. {(activeSession.amount || 0).toLocaleString()}</span>
            <a href="/dashboard/retail/pos-sessions" style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textDecoration: "none", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, padding: "2px 8px" }}>Close</a>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div style={{ display: "flex", background: "#0c1322", borderBottom: "2px solid rgba(255,255,255,.05)" }}>
        {[
          { label: "TODAY SALES", value: `Rs. ${todayTotal.toLocaleString()}`, color: "#34d399", href: null },
          { label: "TRANSACTIONS", value: String(todaySales.length), color: "#fff", href: "/dashboard/retail/sales-history" },
          { label: "CASH", value: `Rs. ${cashTotal.toLocaleString()}`, color: "#10b981", href: null },
          { label: "CARD / DIGITAL", value: `Rs. ${cardTotal.toLocaleString()}`, color: "#818cf8", href: null },
          { label: "NEXT RECEIPT", value: nextReceiptNo, color: "#f59e0b", href: null },
        ].map((s, i) => (
          <div key={s.label} onClick={() => s.href && (window.location.href = s.href)}
            style={{ flex: 1, padding: "10px 16px", borderRight: "1px solid rgba(255,255,255,.04)", cursor: s.href ? "pointer" : "default", borderLeft: i === 0 ? "none" : undefined }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".09em", marginBottom: 3, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: s.color, letterSpacing: "-.01em" }}>{s.value}</div>
            {s.href && <div style={{ fontSize: 9, color: "rgba(255,255,255,.18)", marginTop: 1 }}>view →</div>}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* ── LEFT: Products ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "10px 14px 8px", background: "#0c1322", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {/* Barcode */}
              <div style={{ position: "relative", flex: 1 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none" }}>📷</span>
                <input ref={barcodeRef} value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={handleBarcodeEnter} autoFocus
                  placeholder="Scan barcode / SKU → Enter"
                  style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, background: "rgba(99,102,241,.07)", border: `1px solid ${barcodeMsg ? (barcodeMsg.ok ? "rgba(52,211,153,.5)" : "rgba(248,113,113,.5)") : "rgba(99,102,241,.2)"}`, borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: ff, outline: "none" }} />
              </div>
              {/* Search */}
              <div style={{ position: "relative", flex: 1.8 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, pointerEvents: "none", color: "rgba(255,255,255,.25)" }}>🔍</span>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                  style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: ff, outline: "none" }} />
              </div>
              {barcodeMsg && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 10px", borderRadius: 8, background: barcodeMsg.ok ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", border: `1px solid ${barcodeMsg.ok ? "rgba(52,211,153,.25)" : "rgba(248,113,113,.25)"}`, fontSize: 11, fontWeight: 700, color: barcodeMsg.ok ? "#34d399" : "#f87171", whiteSpace: "nowrap" }}>
                  {barcodeMsg.text}
                </div>
              )}
            </div>
            {/* Categories */}
            <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 1 }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  style={{ padding: "4px 13px", borderRadius: 6, whiteSpace: "nowrap", flexShrink: 0, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: ff, transition: "all .1s",
                    background: cat === c ? "#6366f1" : "rgba(255,255,255,.06)",
                    color: cat === c ? "#fff" : "rgba(255,255,255,.45)" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {loadingProducts && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.25)", fontSize: 13 }}>Loading products...</div>}
            {!loadingProducts && products.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.25)" }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>No products yet</div>
                <a href="/dashboard/retail/catalog" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Add products →</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 9 }}>
              {filtered.map(p => {
                const stockQty = p.itemNewId ? (stockMap[p.itemNewId] ?? 0) : null;
                const outOfStock = stockQty !== null && stockQty <= 0;
                const lowStock = stockQty !== null && stockQty > 0 && stockQty <= 5;
                return (
                  <div key={p.id} className="prod-card" onClick={() => !outOfStock && addToCart(p)}
                    style={{ background: "#111827", border: `1px solid ${outOfStock ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.07)"}`, borderRadius: 12, padding: "11px 11px 9px", userSelect: "none" as const, opacity: outOfStock ? 0.45 : 1, cursor: outOfStock ? "not-allowed" : "pointer", position: "relative" as const }}>
                    {outOfStock && <div style={{ position: "absolute" as const, top: 7, right: 7, background: "rgba(239,68,68,.18)", color: "#f87171", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 4, letterSpacing: ".05em" }}>OUT</div>}
                    {lowStock && <div style={{ position: "absolute" as const, top: 7, right: 7, background: "rgba(245,158,11,.15)", color: "#f59e0b", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 4 }}>LOW</div>}
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.28)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 5 }}>{p.category}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 7, color: "#dde1f0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.name}</div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#818cf8", letterSpacing: "-.01em" }}>Rs. {p.price.toLocaleString()}</div>
                    {stockQty !== null && !outOfStock && (
                      <div style={{ fontSize: 9, color: lowStock ? "#f59e0b" : "#34d399", marginTop: 5, fontWeight: 600 }}>{stockQty} in stock</div>
                    )}
                  </div>
                );
              })}
              {!loadingProducts && filtered.length === 0 && products.length > 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "rgba(255,255,255,.22)", fontSize: 12 }}>No products match "{search || cat}"</div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Cart ── */}
        <div style={{ width: 390, background: "#0c1322", borderLeft: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column" }}>

          {/* Cart Header */}
          <div style={{ padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 1 }}>Current Order</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{nextReceiptNo} <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400, fontSize: 12 }}>· {cart.reduce((s, i) => s + i.qty, 0)} items</span></div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {receipt && (
                <button onClick={printReceipt} style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.22)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🖨 Receipt</button>
              )}
              <button onClick={clearCart} style={{ background: "rgba(239,68,68,.08)", color: "#f87171", border: "1px solid rgba(239,68,68,.18)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>
            </div>
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
            {cart.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,.18)", gap: 8 }}>
                <div style={{ fontSize: 42 }}>🛒</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Cart is empty</div>
                <div style={{ fontSize: 11 }}>Tap a product to add</div>
              </div>
            ) : cart.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", marginBottom: 4, background: "rgba(255,255,255,.025)", borderRadius: 10, border: "1px solid rgba(255,255,255,.05)" }}>
                <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.18)", fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#dde1f0" }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 1 }}>Rs. {item.price.toLocaleString()} / unit</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,.07)", borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  <button onClick={() => changeQty(item.id, -1)} style={{ width: 28, height: 28, background: "none", border: "none", color: "rgba(255,255,255,.6)", fontSize: 17, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>−</button>
                  <span style={{ width: 26, textAlign: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)} style={{ width: 28, height: 28, background: "#6366f1", border: "none", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>+</button>
                </div>
                <div style={{ minWidth: 68, textAlign: "right", fontSize: 13, fontWeight: 700, color: "#a5b4fc", flexShrink: 0 }}>Rs. {(item.price * item.qty).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Checkout Panel */}
          <div style={{ padding: "11px 14px 13px", borderTop: "1px solid rgba(255,255,255,.07)" }}>

            {/* Discount + Tax */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[
                { label: "Discount (Rs.)", val: discount, set: setDiscount },
                { label: "Tax (%)", val: taxRate, set: setTaxRate },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", marginBottom: 4, textTransform: "uppercase" as const, letterSpacing: ".07em" }}>{f.label}</div>
                  <input value={f.val} onChange={e => f.set(e.target.value)} placeholder="0" type="number" min="0"
                    style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 7, padding: "7px 9px", color: "#fff", fontSize: 12, fontFamily: ff, outline: "none" }} />
                </div>
              ))}
            </div>

            {/* Summary box */}
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "9px 12px", marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.4)", marginBottom: 5 }}>
                <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {discAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#f87171", marginBottom: 5 }}><span>Discount</span><span>− Rs. {discAmt.toLocaleString()}</span></div>}
              {taxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#fbbf24", marginBottom: 5 }}><span>Tax ({taxPct}%)</span><span>+ Rs. {taxAmt.toLocaleString()}</span></div>}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 7, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 600, letterSpacing: ".04em" }}>TOTAL</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: cart.length > 0 ? "#a5b4fc" : "rgba(255,255,255,.2)", letterSpacing: "-.02em" }}>Rs. {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 9 }}>
              {PAY_METHODS.map(m => (
                <button key={m.id} className="pay-btn" onClick={() => setPayMethod(m.id)}
                  style={{ padding: "7px 0", borderRadius: 7, border: `1.5px solid ${payMethod === m.id ? m.color : "rgba(255,255,255,.07)"}`,
                    background: payMethod === m.id ? `${m.color}20` : "rgba(255,255,255,.03)",
                    color: payMethod === m.id ? m.color : "rgba(255,255,255,.35)",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Cash tendered */}
            {payMethod === "cash" && (
              <div style={{ marginBottom: 9 }}>
                <input value={tendered} onChange={e => setTendered(e.target.value)} placeholder="Cash received (Rs.)" type="number" min="0"
                  style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,.04)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 7, padding: "8px 10px", color: "#fff", fontSize: 12, fontFamily: ff, outline: "none", marginBottom: 4 }} />
                {tenderedAmt >= total && total > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#34d399", fontWeight: 700, padding: "6px 10px", background: "rgba(52,211,153,.07)", borderRadius: 7, border: "1px solid rgba(52,211,153,.14)" }}>
                    <span>Change Due</span><span>Rs. {change.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {checkoutError && (
              <div style={{ marginBottom: 8, padding: "7px 10px", borderRadius: 7, background: "rgba(248,113,113,.09)", border: "1px solid rgba(248,113,113,.2)", color: "#fca5a5", fontSize: 11 }}>
                {checkoutError}
              </div>
            )}

            {/* Checkout */}
            <button className="checkout-btn" onClick={checkout} disabled={cart.length === 0 || processingCheckout}
              style={{ width: "100%", border: "none", borderRadius: 10, padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontFamily: ff, letterSpacing: ".01em",
                background: cart.length > 0 ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,.06)",
                color: cart.length > 0 ? "#fff" : "rgba(255,255,255,.2)",
                boxShadow: cart.length > 0 ? "0 4px 18px rgba(16,185,129,.28)" : "none" }}>
              {processingCheckout ? "Processing..." : cart.length > 0 ? `Charge  Rs. ${total.toLocaleString()}  →` : "Add items to cart"}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99, padding: 20 }}>
          <div style={{ background: "#111827", borderRadius: 18, border: "1px solid rgba(255,255,255,.08)", padding: 20, width: "min(96vw,560px)", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#34d399" }}>✅ Sale Completed</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Receipt #{receipt.receiptNo}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={printReceipt} style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨 Print</button>
                <button onClick={() => setReceipt(null)} style={{ background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.6)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, padding: "9px 16px", fontSize: 12, cursor: "pointer" }}>Close</button>
              </div>
            </div>
            <div id="pos-print-area" style={{ display: "flex", justifyContent: "center" }}>
              <ThermalReceipt receipt={receipt} company={company} />
            </div>
          </div>
        </div>
      )}

      {/* Hidden print area */}
      {receipt && (
        <div id="pos-receipt">
          <div id="pos-receipt-paper" style={{ margin: "0 auto", width: "fit-content" }}>
            <ThermalReceipt receipt={receipt} company={company} />
          </div>
        </div>
      )}
    </div>
  );
}
