"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ThermalReceipt, generateFBRInvoice, type ReceiptData, type CompanyInfo } from "@/app/dashboard/retail/_components/ThermalReceipt";

const ff = "'Outfit','Inter',sans-serif";
const PAGE_SIZE = 12;

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  category: string;
  sku: string;
  itemNewId?: string;
  itemDiscount: number;
};

export default function POSPage() {
  const userRef = useRef(getCurrentUser());
  const user = userRef.current;
  const cashierName = (user as { name?: string } | null)?.name || "Cashier";

  const { records: productRecords, loading: loadingProducts } = useBusinessRecords("catalog_product");
  const { records: saleRecords, create: createSale } = useBusinessRecords("pos_sale");
  const { records: sessionRecords, update: updateSession } = useBusinessRecords("pos_session");
  const activeSession = sessionRecords.find(s => s.status?.toLowerCase() === "open") || null;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [searchMsg, setSearchMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [discount, setDiscount] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [tendered, setTendered] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "easypaisa" | "jazzcash">("cash");
  const [company, setCompany] = useState<CompanyInfo>({ name: "My Store" });
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [showStats, setShowStats] = useState(false);
  const [page, setPage] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [clockStr, setClockStr] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);
  const checkoutFnRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClockStr(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

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
    const h = user as { id?: string; role?: string; companyId?: string } | null;
    const headers: HeadersInit = { "x-user-id": h?.id || "", "x-user-role": h?.role || "ADMIN", "x-company-id": h?.companyId || "" };
    fetch("/api/me/company", { headers })
      .then(r => r.json())
      .then(d => { if (d?.name) setCompany({ name: d.name, address: d.address, phone: d.phone, ntn: d.ntn }); })
      .catch(() => {});
    loadStock();
  }, []);

  const products = productRecords
    .filter(r => r.status !== "inactive")
    .map(r => ({
      id: r.id,
      name: r.title,
      category: (r.data?.category as string) || "General",
      price: r.amount || 0,
      sku: (r.data?.sku as string) || "",
      itemNewId: (r.data?.itemNewId as string) || "",
      catalogStock: typeof r.data?.stock === "number" ? r.data.stock as number : null,
    }));

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const matchCat = cat === "All" || p.category === cat;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeP = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [cat, search]);

  const todaySales = saleRecords.filter(r => r.createdAt?.split("T")[0] === new Date().toISOString().split("T")[0]);
  const todayTotal = todaySales.reduce((a, r) => a + (r.amount || 0), 0);
  const cashTotal = todaySales.filter(r => r.data?.payMethod === "cash").reduce((a, r) => a + (r.amount || 0), 0);
  const cardTotal = todaySales.filter(r => r.data?.payMethod !== "cash").reduce((a, r) => a + (r.amount || 0), 0);
  const nextReceiptNo = `POS-${String(saleRecords.length + 1).padStart(4, "0")}`;

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemDiscAmt = cart.reduce((s, i) => s + (i.itemDiscount || 0) * i.qty, 0);
  const globalDiscAmt = Math.min(Math.max(0, subtotal - itemDiscAmt), Math.max(0, Number(discount) || 0));
  const discAmt = itemDiscAmt + globalDiscAmt;
  const taxPct = Math.max(0, Math.min(100, Number(taxRate) || 0));
  const taxAmt = Math.round((subtotal - discAmt) * taxPct / 100);
  const total = subtotal - discAmt + taxAmt;
  const tenderedAmt = Number(tendered) || 0;
  const change = payMethod === "cash" && tenderedAmt >= total ? tenderedAmt - total : 0;
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  function availableStock(prod: typeof products[0]): number {
    if (!prod.itemNewId) return 9999;
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
      return [...prev, { ...prod, qty: 1, itemDiscount: 0 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCheckoutError("");
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));
  }

  function setQty(id: string, val: string) {
    setCheckoutError("");
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1) setCart(prev => prev.map(i => i.id === id ? { ...i, qty: n } : i));
    else if (val === "") setCart(prev => prev.map(i => i.id === id ? { ...i, qty: 0 } : i));
  }

  function commitQty(id: string, val: string) {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) setCart(prev => prev.map(i => i.id === id ? { ...i, qty: 1 } : i));
  }

  function setItemDisc(id: string, val: string) {
    const n = parseFloat(val) || 0;
    setCart(prev => prev.map(i => i.id === id ? { ...i, itemDiscount: Math.max(0, n) } : i));
  }

  function removeItem(id: string) {
    setCart(prev => prev.filter(i => i.id !== id));
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = search.trim();
    if (!q) return;
    const match = products.find(p => p.sku && p.sku.toLowerCase() === q.toLowerCase())
      || (filtered.length === 1 ? filtered[0] : null);
    if (match) {
      addToCart(match);
      setSearch("");
      setSearchMsg({ text: `✓ ${match.name} added`, ok: true });
    } else {
      setSearchMsg({ text: filtered.length === 0 ? `No product found for "${q}"` : `${filtered.length} results — select from grid`, ok: filtered.length > 0 });
    }
    setTimeout(() => setSearchMsg(null), 2500);
  }

  async function checkout() {
    if (cart.length === 0) { setCheckoutError("Cart is empty."); return; }
    if (total <= 0) { setCheckoutError("Total must be greater than zero."); return; }
    if (payMethod === "cash" && tendered && tenderedAmt < total) {
      setCheckoutError(`Cash tendered (Rs. ${tenderedAmt}) is less than total (Rs. ${total}).`); return;
    }

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
      const nowDate = new Date();

      const syncedItems = snapshot.filter(i => i.itemNewId);
      if (syncedItems.length > 0) {
        const stockRes = await fetch("/api/pos-checkout", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            date: nowDate.toISOString(),
            items: syncedItems.map(i => ({ itemNewId: i.itemNewId, name: i.name, qty: i.qty, rate: i.price })),
          }),
        });
        if (!stockRes.ok) {
          const err = await stockRes.json();
          setCheckoutError(err.error || "Stock deduction failed");
          setProcessingCheckout(false);
          return;
        }
        loadStock();
      }

      const saved = await createSale({
        title: nextReceiptNo,
        status: "completed",
        amount: total,
        data: {
          payMethod,
          items: snapshot.map(i => `${i.name} x${i.qty}`).join(", "),
          discount: discAmt, taxRate: taxPct, taxAmt, subtotal,
          cart: snapshot, tendered: tenderedAmt, change,
          cashierName,
          sessionId: activeSession?.id || null,
          sessionRef: activeSession?.title || null,
          customerName: customerName || null,
        },
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
        fbrInvoice: generateFBRInvoice(saved.title || nextReceiptNo, nowDate),
        soldAt: nowDate.toISOString(),
        items: snapshot,
        subtotal, discount: discAmt, taxRate: taxPct, taxAmt,
        rounding, total: rounded,
        totalQty: snapshot.reduce((s, i) => s + i.qty, 0),
        payMethod, tendered: tenderedAmt, change,
        cashierName,
        loyaltyEarned, loyaltyRedeemed: 0, loyaltyTotal,
      });
      setCart([]);
      setDiscount("");
      setTendered("");
      setCustomerName("");
    } catch {
      setCheckoutError("Checkout failed. Please try again.");
    }
    setProcessingCheckout(false);
  }

  checkoutFnRef.current = checkout;

  async function clearCart() {
    if (cart.length === 0) return;
    if (!await confirmToast("Clear the current cart?")) return;
    setCart([]); setDiscount(""); setTendered(""); setCheckoutError("");
  }

  function printReceipt() { window.print(); }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "F2") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "F10") { e.preventDefault(); checkoutFnRef.current(); }
      if (isInput && e.key !== "F2" && e.key !== "F10") return;
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const PAY_METHODS = [
    { id: "cash",      label: "Cash",      color: "#10b981" },
    { id: "card",      label: "Card",      color: "#6366f1" },
    { id: "easypaisa", label: "EasyPaisa", color: "#10b981" },
    { id: "jazzcash",  label: "JazzCash",  color: "#dc2626" },
  ] as const;

  const QUICK_AMTS = [500, 1000, 2000, 5000];
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  function PaginationBar() {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      if (i === 0 || i === totalPages - 1 || Math.abs(i - safeP) <= 1) pages.push(i);
    }
    const withEllipsis: (number | -1)[] = [];
    let prev = -2;
    for (const p of pages) {
      if (prev !== -2 && p > prev + 1) withEllipsis.push(-1);
      withEllipsis.push(p);
      prev = p;
    }
    return (
      <div style={{ padding: "7px 14px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, background: "#0c1322" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginRight: 6 }}>{filtered.length} products</span>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safeP === 0}
          style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: safeP === 0 ? "rgba(255,255,255,.18)" : "#fff", fontSize: 13, cursor: safeP === 0 ? "default" : "pointer", fontFamily: ff }}>‹</button>
        {withEllipsis.map((p, i) =>
          p === -1
            ? <span key={`e${i}`} style={{ color: "rgba(255,255,255,.25)", fontSize: 11, padding: "0 2px" }}>…</span>
            : <button key={p} onClick={() => setPage(p)}
                style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: p === safeP ? "#6366f1" : "rgba(255,255,255,.04)", color: p === safeP ? "#fff" : "rgba(255,255,255,.4)", fontSize: 11, fontWeight: p === safeP ? 700 : 400, cursor: "pointer", fontFamily: ff, minWidth: 28 }}>
                {p + 1}
              </button>
        )}
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safeP === totalPages - 1}
          style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: safeP === totalPages - 1 ? "rgba(255,255,255,.18)" : "#fff", fontSize: 13, cursor: safeP === totalPages - 1 ? "default" : "pointer", fontFamily: ff }}>›</button>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,.2)", marginLeft: 4 }}>pg {safeP + 1}/{totalPages}</span>
      </div>
    );
  }

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
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .prod-card { transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
        .prod-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,.22) !important; border-color: rgba(99,102,241,.5) !important; }
        .prod-card:active { transform: scale(.96); }
        .pos-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .pos-scroll::-webkit-scrollbar-track { background: transparent; }
        .pos-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
        .fkey:hover { background: rgba(99,102,241,.18) !important; color: #a5b4fc !important; }
        .pay-opt { transition: all .12s; }
        .pay-opt:hover { opacity: .85; }
        .qty-btn:hover { opacity: .8; }
      `}</style>

      {/* ── Session Banner ── */}
      {!activeSession ? (
        <div style={{ background: "rgba(245,158,11,.08)", borderBottom: "1px solid rgba(245,158,11,.18)", padding: "6px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>⚠️ No active session — sales will not be linked to a cashier shift.</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowStats(v => !v)} style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${showStats ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.1)"}`, background: showStats ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)", color: showStats ? "#818cf8" : "rgba(255,255,255,.35)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>{showStats ? "Hide Stats" : "Stats"}</button>
            <a href="/dashboard/retail/pos-sessions" style={{ fontSize: 12, color: "#fbbf24", fontWeight: 700, textDecoration: "underline" }}>Open Session →</a>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(16,185,129,.06)", borderBottom: "1px solid rgba(16,185,129,.12)", padding: "5px 18px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 6px #10b981", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>{activeSession.title}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Cashier: {String(activeSession.data?.cashier || "—")}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Branch: {String(activeSession.data?.branch || "—")}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>Txns: {Number(activeSession.data?.transactions || 0)}</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#34d399", fontWeight: 700 }}>Session: Rs. {(activeSession.amount || 0).toLocaleString()}</span>
            <button onClick={() => setShowStats(v => !v)} style={{ padding: "3px 10px", borderRadius: 6, border: `1px solid ${showStats ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.1)"}`, background: showStats ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)", color: showStats ? "#818cf8" : "rgba(255,255,255,.35)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>{showStats ? "Hide Stats" : "Stats"}</button>
            <a href="/dashboard/retail/pos-sessions" style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textDecoration: "none", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, padding: "2px 8px" }}>Close</a>
          </div>
        </div>
      )}

      {/* ── Stats Bar ── */}
      {showStats && (
        <div style={{ display: "flex", background: "#0c1322", borderBottom: "1px solid rgba(255,255,255,.05)", flexShrink: 0 }}>
          {[
            { label: "TODAY SALES",    value: `Rs. ${todayTotal.toLocaleString()}`, color: "#34d399", href: null },
            { label: "TRANSACTIONS",   value: String(todaySales.length),             color: "#fff",    href: "/dashboard/retail/sales-history" },
            { label: "CASH",           value: `Rs. ${cashTotal.toLocaleString()}`,   color: "#10b981", href: null },
            { label: "CARD / DIGITAL", value: `Rs. ${cardTotal.toLocaleString()}`,   color: "#818cf8", href: null },
            { label: "NEXT RECEIPT",   value: nextReceiptNo,                          color: "#f59e0b", href: null },
          ].map(s => (
            <div key={s.label} onClick={() => s.href && (window.location.href = s.href)}
              style={{ flex: 1, padding: "8px 16px", borderRight: "1px solid rgba(255,255,255,.04)", cursor: s.href ? "pointer" : "default" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".09em", marginBottom: 2, textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
              {s.href && <div style={{ fontSize: 9, color: "rgba(255,255,255,.18)", marginTop: 1 }}>view →</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── Header Info Bar ── */}
      <div style={{ background: "#0d1425", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "7px 18px", display: "flex", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 130 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", textTransform: "uppercase" }}>Invoice No.</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#818cf8", letterSpacing: ".02em" }}>{nextReceiptNo}</span>
        </div>
        <div style={{ width: 1, height: 30, background: "rgba(255,255,255,.07)", margin: "0 16px" }} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 140 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", textTransform: "uppercase" }}>Date &amp; Time</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#dde1f0" }}>{dateStr} · {clockStr}</span>
        </div>
        <div style={{ width: 1, height: 30, background: "rgba(255,255,255,.07)", margin: "0 16px" }} />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 120 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", textTransform: "uppercase" }}>Cashier</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>{cashierName}</span>
        </div>
        <div style={{ width: 1, height: 30, background: "rgba(255,255,255,.07)", margin: "0 16px" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 2 }}>Customer</span>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in / Optional"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 6, padding: "3px 9px", color: "#fff", fontSize: 12, fontFamily: ff, outline: "none", maxWidth: 220 }} />
        </div>
      </div>

      {/* ── Shortcut Keys Bar ── */}
      <div style={{ background: "#080d18", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "4px 14px", display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
        {([
          ["F2",  "Search",       () => searchRef.current?.focus()],
          ["F3",  "Hold Sale",    () => {}],
          ["F4",  "Price Check",  () => {}],
          ["F5",  "Discount",     () => {}],
          ["F6",  "Note",         () => {}],
          ["F7",  "Hold Invoice", () => {}],
          ["F8",  "Preview",      () => { if (receipt) printReceipt(); }],
          ["F10", "Pay Now",      () => checkoutFnRef.current()],
        ] as [string, string, () => void][]).map(([key, label, action]) => (
          <button key={key} className="fkey" onClick={action}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 5, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", cursor: "pointer", fontFamily: ff, transition: "all .12s" }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#6366f1", background: "rgba(99,102,241,.15)", padding: "1px 5px", borderRadius: 3, letterSpacing: ".04em" }}>{key}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.38)", fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Main Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* ════ LEFT: Products ════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid rgba(255,255,255,.06)" }}>

          {/* Search + Categories */}
          <div style={{ padding: "10px 14px 8px", background: "#0c1322", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey} autoFocus
                placeholder="Search by name or SKU — scan barcode then press Enter to add"
                style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                  background: "rgba(99,102,241,.07)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: ff, outline: "none",
                  border: `1.5px solid ${searchMsg ? (searchMsg.ok ? "rgba(52,211,153,.45)" : "rgba(248,113,113,.45)") : "rgba(99,102,241,.22)"}` }} />
              {searchMsg && (
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: searchMsg.ok ? "#34d399" : "#f87171", whiteSpace: "nowrap" }}>
                  {searchMsg.text}
                </span>
              )}
            </div>
            <div className="pos-scroll" style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  style={{ padding: "4px 13px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: ff, transition: "all .1s",
                    background: cat === c ? "#6366f1" : "rgba(255,255,255,.06)",
                    color: cat === c ? "#fff" : "rgba(255,255,255,.45)" }}>
                  {c}
                  {cat === c && filtered.length > 0 && (
                    <span style={{ marginLeft: 5, background: "rgba(255,255,255,.2)", borderRadius: 10, padding: "0 5px", fontSize: 9 }}>{filtered.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {loadingProducts && (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.25)", fontSize: 13 }}>Loading products...</div>
            )}
            {!loadingProducts && products.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.25)" }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>No products yet</div>
                <a href="/dashboard/retail/catalog" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Add products →</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))", gap: 8 }}>
              {paginated.map(p => {
                const stockQty = p.itemNewId ? (stockMap[p.itemNewId] ?? 0) : (p.catalogStock !== null ? p.catalogStock : null);
                const outOfStock = stockQty !== null && stockQty <= 0;
                const lowStock   = stockQty !== null && stockQty > 0 && stockQty <= 5;
                return (
                  <div key={p.id} className="prod-card" onClick={() => !outOfStock && addToCart(p)}
                    style={{ background: "#111827", border: `1px solid ${outOfStock ? "rgba(239,68,68,.2)" : "rgba(255,255,255,.07)"}`, borderRadius: 12, padding: "11px 12px 10px", userSelect: "none", opacity: outOfStock ? 0.45 : 1, cursor: outOfStock ? "not-allowed" : "pointer", position: "relative", boxSizing: "border-box" }}>
                    {outOfStock && <div style={{ position: "absolute", top: 7, right: 7, background: "rgba(239,68,68,.18)", color: "#f87171", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 4 }}>OUT</div>}
                    {lowStock   && <div style={{ position: "absolute", top: 7, right: 7, background: "rgba(245,158,11,.15)", color: "#f59e0b", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 4 }}>LOW</div>}
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.28)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>{p.category}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginBottom: 5, color: "#dde1f0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.name}</div>
                    {p.sku && <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", marginBottom: 5 }}>{p.sku}</div>}
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#818cf8" }}>Rs. {p.price.toLocaleString()}</div>
                    {stockQty !== null && (
                      <div style={{ fontSize: 9, marginTop: 5, fontWeight: 600, color: outOfStock ? "#f87171" : lowStock ? "#f59e0b" : "#34d399" }}>
                        {outOfStock ? "Out of stock" : `${stockQty} in stock`}
                      </div>
                    )}
                  </div>
                );
              })}
              {!loadingProducts && filtered.length === 0 && products.length > 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "rgba(255,255,255,.22)", fontSize: 12 }}>
                  No products match "{search || cat}"
                </div>
              )}
            </div>
          </div>

          <PaginationBar />
        </div>

        {/* ════ RIGHT: Cart ════ */}
        <div style={{ width: 450, background: "#0c1322", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Cart Header */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.28)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 1 }}>Current Order</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{nextReceiptNo}
                <span style={{ color: "rgba(255,255,255,.3)", fontWeight: 400, fontSize: 11 }}> · {cart.length} lines · {totalQty} qty</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {receipt && (
                <button onClick={printReceipt} style={{ background: "rgba(99,102,241,.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.22)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>🖨 Receipt</button>
              )}
              <button onClick={clearCart} style={{ background: "rgba(239,68,68,.08)", color: "#f87171", border: "1px solid rgba(239,68,68,.18)", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>
            </div>
          </div>

          {/* Column Headers */}
          {cart.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "20px 1fr 60px 84px 54px 62px 20px", gap: 3, padding: "4px 12px", borderBottom: "1px solid rgba(255,255,255,.05)", flexShrink: 0 }}>
              {(["#", "Product", "Price", "Qty", "Disc", "Total", ""] as string[]).map((h, i) => (
                <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,.22)", letterSpacing: ".06em", textTransform: "uppercase", textAlign: i >= 2 && i <= 5 ? "right" : "left" }}>{h}</div>
              ))}
            </div>
          )}

          {/* Cart Items */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: "auto", padding: cart.length === 0 ? 0 : "4px 8px" }}>
            {cart.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,.18)", gap: 8 }}>
                <div style={{ fontSize: 40 }}>🛒</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Cart is empty</div>
                <div style={{ fontSize: 11 }}>Tap a product · press F2 to search</div>
              </div>
            ) : cart.map((item, idx) => {
              const lineTotal = item.price * item.qty - (item.itemDiscount || 0) * item.qty;
              return (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr 60px 84px 54px 62px 20px", gap: 3, alignItems: "center", padding: "6px 4px", marginBottom: 2, background: "rgba(255,255,255,.025)", borderRadius: 8, border: "1px solid rgba(255,255,255,.05)" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.2)", textAlign: "center" }}>{idx + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#dde1f0" }}>{item.name}</div>
                    {item.sku && <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)" }}>{item.sku}</div>}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.38)", textAlign: "right" }}>{item.price.toLocaleString()}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}
                      style={{ width: 21, height: 21, background: "rgba(255,255,255,.07)", border: "none", color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>−</button>
                    <input type="number" min={1} value={item.qty === 0 ? "" : item.qty}
                      onChange={e => setQty(item.id, e.target.value)}
                      onBlur={e => commitQty(item.id, e.target.value)}
                      onFocus={e => e.target.select()}
                      style={{ width: 30, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 4, padding: "1px 0", outline: "none", fontFamily: ff }} />
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}
                      style={{ width: 21, height: 21, background: "#6366f1", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>+</button>
                  </div>
                  <div>
                    <input type="number" min={0} value={item.itemDiscount || ""}
                      onChange={e => setItemDisc(item.id, e.target.value)}
                      placeholder="0"
                      style={{ width: "100%", textAlign: "right", fontSize: 10, color: item.itemDiscount ? "#fbbf24" : "rgba(255,255,255,.25)", background: "rgba(255,255,255,.04)", border: `1px solid ${item.itemDiscount ? "rgba(245,158,11,.3)" : "rgba(255,255,255,.07)"}`, borderRadius: 4, padding: "2px 4px", outline: "none", fontFamily: ff, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textAlign: "right" }}>{lineTotal.toLocaleString()}</div>
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.2)", fontSize: 12, cursor: "pointer", padding: 0, textAlign: "center" }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* Checkout Panel */}
          <div style={{ padding: "10px 13px 13px", borderTop: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>

            {/* Summary */}
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "8px 12px", marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.38)", marginBottom: 5 }}>
                <span>Subtotal ({cart.length} items)</span><span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.32)", flex: 1 }}>Discount (Rs.)</span>
                <input value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" type="number" min="0"
                  style={{ width: 75, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 6, padding: "3px 7px", color: "#fff", fontSize: 11, fontFamily: ff, outline: "none", textAlign: "right" }} />
              </div>
              {itemDiscAmt > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#fbbf24", marginBottom: 3 }}>
                  <span>Item discounts</span><span>− Rs. {itemDiscAmt.toLocaleString()}</span>
                </div>
              )}
              {discAmt > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#f87171", marginBottom: 4 }}>
                  <span>Total Discount</span><span>− Rs. {discAmt.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: taxAmt > 0 ? 4 : 0 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.32)", flex: 1 }}>Tax (%)</span>
                <input value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0" type="number" min="0" max="100"
                  style={{ width: 75, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 6, padding: "3px 7px", color: "#fff", fontSize: 11, fontFamily: ff, outline: "none", textAlign: "right" }} />
              </div>
              {taxAmt > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#fbbf24", marginBottom: 4 }}>
                  <span>Tax ({taxPct}%)</span><span>+ Rs. {taxAmt.toLocaleString()}</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 600, letterSpacing: ".04em" }}>GRAND TOTAL</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: cart.length > 0 ? "#a5b4fc" : "rgba(255,255,255,.18)" }}>Rs. {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 8 }}>
              {PAY_METHODS.map(m => (
                <button key={m.id} className="pay-opt" onClick={() => setPayMethod(m.id)}
                  style={{ padding: "7px 0", borderRadius: 7, border: `1.5px solid ${payMethod === m.id ? m.color : "rgba(255,255,255,.07)"}`,
                    background: payMethod === m.id ? `${m.color}22` : "rgba(255,255,255,.03)",
                    color: payMethod === m.id ? m.color : "rgba(255,255,255,.35)",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Cash tendered + Quick Amounts */}
            {payMethod === "cash" && (
              <div style={{ marginBottom: 8 }}>
                <input value={tendered} onChange={e => setTendered(e.target.value)} placeholder="Amount received (Rs.)" type="number" min="0"
                  style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(255,255,255,.04)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 7, padding: "8px 10px", color: "#fff", fontSize: 12, fontFamily: ff, outline: "none", marginBottom: 5 }} />
                <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                  {QUICK_AMTS.map(amt => (
                    <button key={amt} onClick={() => setTendered(String(amt))}
                      style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: Number(tendered) === amt ? "rgba(16,185,129,.15)" : "rgba(255,255,255,.04)", color: Number(tendered) === amt ? "#34d399" : "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .1s" }}>
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                  <button onClick={() => setTendered(String(Math.ceil(total)))}
                    style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid rgba(52,211,153,.2)", background: "rgba(52,211,153,.06)", color: "#34d399", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                    Exact
                  </button>
                </div>
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

            <button onClick={checkout} disabled={cart.length === 0 || processingCheckout}
              style={{ width: "100%", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 14, fontWeight: 800, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontFamily: ff, letterSpacing: ".01em",
                background: cart.length > 0 ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,.06)",
                color: cart.length > 0 ? "#fff" : "rgba(255,255,255,.2)",
                boxShadow: cart.length > 0 ? "0 4px 18px rgba(16,185,129,.28)" : "none", transition: "box-shadow .15s, opacity .15s" }}>
              {processingCheckout ? "Processing..." : cart.length > 0 ? `F10  ·  Pay  Rs. ${total.toLocaleString()}` : "Add items to cart"}
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
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ThermalReceipt receipt={receipt} company={company} />
            </div>
          </div>
        </div>
      )}

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
