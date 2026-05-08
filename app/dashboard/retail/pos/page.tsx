"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { ThermalReceipt, generateFBRInvoice, type ReceiptData, type CompanyInfo } from "@/app/dashboard/retail/_components/ThermalReceipt";

const ff = "'Outfit','Inter',sans-serif";
const PAGE_SIZE = 12;

type CartItem = {
  id: string; name: string; price: number; qty: number;
  category: string; sku: string; itemNewId?: string; itemDiscount: number;
};

export default function POSPage() {
  const userRef = useRef(getCurrentUser());
  const user = userRef.current;
  const cashierName = (user as { name?: string } | null)?.name || "Cashier";

  const { records: productRecords, loading: loadingProducts } = useBusinessRecords("catalog_product");
  const { records: saleRecords, create: createSale } = useBusinessRecords("pos_sale");
  const { records: sessionRecords, update: updateSession } = useBusinessRecords("pos_session");
  const { records: loyaltyRecords, create: createLoyaltyRec, update: updateLoyaltyRec } = useBusinessRecords("loyalty_customer");
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
  const [itemNote, setItemNote] = useState("");
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [fKeyMsg, setFKeyMsg] = useState<string | null>(null);

  // Hold Sales
  type HeldSale = { id: string; cart: CartItem[]; discount: string; taxRate: string; itemNote: string; customer: string; savedAt: string; total: number; };
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [showHeld, setShowHeld] = useState(false);

  // Price Check
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const [priceCheckQ, setPriceCheckQ] = useState("");
  const priceCheckRef = useRef<HTMLInputElement>(null);

  // Loyalty
  type LoyaltyCustomer = { id: string; name: string; cardNo: string; phone: string; points: number; totalSpent: number; };
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<LoyaltyCustomer | null>(null);
  const [loyaltyQ, setLoyaltyQ] = useState("");
  const [showLoyaltySearch, setShowLoyaltySearch] = useState(false);
  const [redeemPts, setRedeemPts] = useState(0);
  const [loyaltyConfig, setLoyaltyConfig] = useState({ enabled: true, pointsPerHundred: 1, redeemValue: 1, minRedeemPoints: 50, cardPrefix: "LC" });

  const searchRef    = useRef<HTMLInputElement>(null);
  const discountRef  = useRef<HTMLInputElement>(null);
  const tenderedRef  = useRef<HTMLInputElement>(null);
  const noteRef      = useRef<HTMLInputElement>(null);
  const checkoutFnRef = useRef<() => Promise<void>>(async () => {});
  const fKeyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => setClockStr(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  function showFKeyMsg(key: string, msg: string, color: "amber" | "green") {
    if (fKeyTimerRef.current) clearTimeout(fKeyTimerRef.current);
    setFlashKey(key); setFKeyMsg(`${msg}__${color}`);
    fKeyTimerRef.current = setTimeout(() => { setFlashKey(null); setFKeyMsg(null); }, 2000);
  }
  function fKeyComingSoon(key: string, label: string) { showFKeyMsg(key, `${key} — ${label} komming soon`, "amber"); }

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
      }).catch(() => {});
  }

  useEffect(() => {
    const h = user as { id?: string; role?: string; companyId?: string } | null;
    const headers: HeadersInit = { "x-user-id": h?.id || "", "x-user-role": h?.role || "ADMIN", "x-company-id": h?.companyId || "" };
    fetch("/api/me/company", { headers })
      .then(r => r.json())
      .then(d => { if (d?.name) setCompany({ name: d.name, address: d.address, phone: d.phone, ntn: d.ntn }); })
      .catch(() => {});
    fetch("/api/company/admin-control", { headers })
      .then(r => r.json())
      .then(d => { if (d?.loyaltySettings) setLoyaltyConfig(lc => ({ ...lc, ...d.loyaltySettings })); })
      .catch(() => {});
    loadStock();
  }, []);

  const products = productRecords.filter(r => r.status !== "inactive").map(r => ({
    id: r.id, name: r.title,
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
  const cashTotal  = todaySales.filter(r => r.data?.payMethod === "cash").reduce((a, r) => a + (r.amount || 0), 0);
  const cardTotal  = todaySales.filter(r => r.data?.payMethod !== "cash").reduce((a, r) => a + (r.amount || 0), 0);
  const nextReceiptNo = `POS-${String(saleRecords.length + 1).padStart(4, "0")}`;

  const subtotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemDiscAmt = cart.reduce((s, i) => s + (i.itemDiscount || 0) * i.qty, 0);
  const globalDisc  = Math.min(Math.max(0, subtotal - itemDiscAmt), Math.max(0, Number(discount) || 0));
  const discAmt     = itemDiscAmt + globalDisc;
  const taxPct      = Math.max(0, Math.min(100, Number(taxRate) || 0));
  const taxAmt      = Math.round((subtotal - discAmt) * taxPct / 100);
  const total       = subtotal - discAmt + taxAmt;
  const rounded     = Math.round(total);
  const rounding    = rounded - total;

  // Loyalty calculations
  const safeRedeemPts    = Math.min(redeemPts, loyaltyCustomer?.points || 0);
  const loyaltyDiscount  = loyaltyConfig.enabled && loyaltyCustomer ? safeRedeemPts * loyaltyConfig.redeemValue : 0;
  const finalTotal       = Math.max(0, rounded - loyaltyDiscount);
  const pointsToEarn     = loyaltyConfig.enabled && loyaltyCustomer ? Math.floor(finalTotal / 100) * loyaltyConfig.pointsPerHundred : 0;

  const tenderedAmt = Number(tendered) || 0;
  const change      = payMethod === "cash" && tenderedAmt >= finalTotal ? tenderedAmt - finalTotal : 0;
  const totalQty    = cart.reduce((s, i) => s + i.qty, 0);

  // Loyalty customer search
  const lcResults = loyaltyQ.length >= 2
    ? loyaltyRecords.filter(r => {
        if (r.status === "inactive") return false;
        const q = loyaltyQ.toLowerCase();
        const digits = loyaltyQ.replace(/\D/g, "");
        const cardDigits = String(r.data?.cardNo || "").replace(/\D/g, "");
        return (
          r.title.toLowerCase().includes(q) ||
          String(r.data?.phone || "").includes(loyaltyQ) ||
          String(r.data?.cardNo || "").toLowerCase().includes(q) ||
          (digits.length >= 4 && cardDigits.endsWith(digits))
        );
      }).slice(0, 6)
    : [];

  function availableStock(prod: typeof products[0]) {
    if (!prod.itemNewId) return 9999;
    return stockMap[prod.itemNewId] ?? 0;
  }

  function addToCart(prod: typeof products[0]) {
    setCheckoutError("");
    const inCart = cart.find(i => i.id === prod.id)?.qty || 0;
    const avail = availableStock(prod);
    if (inCart + 1 > avail) { setCheckoutError(`"${prod.name}" — stock nahi hai. Available: ${avail}`); return; }
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
    setCart(prev => prev.map(i => i.id === id ? { ...i, itemDiscount: Math.max(0, parseFloat(val) || 0) } : i));
  }
  function removeItem(id: string) { setCart(prev => prev.filter(i => i.id !== id)); }

  function holdCart() {
    if (cart.length === 0) { showFKeyMsg("F3", "Cart khali hai — hold karne ke liye items add karo", "amber"); return; }
    const heldTotal = cart.reduce((s, i) => s + i.price * i.qty - (i.itemDiscount || 0) * i.qty, 0);
    const held: HeldSale = {
      id: `HOLD-${Date.now()}`,
      cart: [...cart], discount, taxRate, itemNote,
      customer: customerName,
      savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      total: Math.round(heldTotal),
    };
    setHeldSales(prev => [...prev, held]);
    setCart([]); setDiscount(""); setItemNote(""); setCustomerName(""); setTendered("");
    showFKeyMsg("F3", `✓ Sale held — ${cart.length} items saved (Hold #${heldSales.length + 1})`, "green");
    setShowHeld(false);
  }

  function recallHeld(id: string) {
    const held = heldSales.find(h => h.id === id);
    if (!held) return;
    if (cart.length > 0) {
      holdCart(); // auto-hold current cart first
    }
    setCart(held.cart);
    setDiscount(held.discount);
    setTaxRate(held.taxRate);
    setItemNote(held.itemNote);
    setCustomerName(held.customer);
    setHeldSales(prev => prev.filter(h => h.id !== id));
    setShowHeld(false);
    showFKeyMsg("F3", `✓ Sale recalled — ${held.cart.length} items restored`, "green");
  }

  function deleteHeld(id: string) {
    setHeldSales(prev => prev.filter(h => h.id !== id));
  }

  function handleSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = search.trim(); if (!q) return;
    const match = products.find(p => p.sku && p.sku.toLowerCase() === q.toLowerCase())
      || (filtered.length === 1 ? filtered[0] : null);
    if (match) {
      addToCart(match); setSearch("");
      setSearchMsg({ text: `✓ ${match.name} added`, ok: true });
    } else {
      setSearchMsg({ text: filtered.length === 0 ? `No match for "${q}"` : `${filtered.length} results found`, ok: filtered.length > 0 });
    }
    setTimeout(() => setSearchMsg(null), 2500);
  }

  async function checkout() {
    if (cart.length === 0) { setCheckoutError("Cart is empty."); return; }
    if (finalTotal <= 0 && rounded > 0 && loyaltyDiscount < rounded) { setCheckoutError("Total must be greater than zero."); return; }
    if (payMethod === "cash" && tendered && tenderedAmt < finalTotal) {
      setCheckoutError(`Cash tendered (Rs. ${tenderedAmt}) is less than total (Rs. ${finalTotal}).`); return;
    }
    for (const item of cart) {
      const avail = availableStock(item as any);
      if (item.qty > avail) { setCheckoutError(`"${item.name}" — insufficient stock. Available: ${avail}`); return; }
    }
    setProcessingCheckout(true); setCheckoutError("");
    try {
      const snapshot = cart.map(i => ({ ...i }));
      const nowDate = new Date();
      const syncedItems = snapshot.filter(i => i.itemNewId);
      if (syncedItems.length > 0) {
        const stockRes = await fetch("/api/pos-checkout", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ date: nowDate.toISOString(), items: syncedItems.map(i => ({ itemNewId: i.itemNewId, name: i.name, qty: i.qty, rate: i.price })) }),
        });
        if (!stockRes.ok) { const err = await stockRes.json(); setCheckoutError(err.error || "Stock deduction failed"); setProcessingCheckout(false); return; }
        loadStock();
      }
      const saved = await createSale({
        title: nextReceiptNo, status: "completed", amount: finalTotal,
        data: { payMethod, items: snapshot.map(i => `${i.name} x${i.qty}`).join(", "), discount: discAmt + loyaltyDiscount, taxRate: taxPct, taxAmt, subtotal, cart: snapshot, tendered: tenderedAmt, change, cashierName, sessionId: activeSession?.id || null, sessionRef: activeSession?.title || null, customerName: loyaltyCustomer?.name || customerName || null, itemNote: itemNote || null, loyaltyCard: loyaltyCustomer?.cardNo || null, loyaltyRedeemed: safeRedeemPts, loyaltyEarned: pointsToEarn },
      });
      if (activeSession) {
        const isCash = payMethod === "cash";
        await updateSession(activeSession.id, {
          amount: (activeSession.amount || 0) + finalTotal,
          data: { cashSales: Number(activeSession.data?.cashSales || 0) + (isCash ? finalTotal : 0), cardSales: Number(activeSession.data?.cardSales || 0) + (!isCash ? finalTotal : 0), transactions: Number(activeSession.data?.transactions || 0) + 1 },
        });
      }
      // Update loyalty customer points
      if (loyaltyCustomer && loyaltyConfig.enabled) {
        const existingRec = loyaltyRecords.find(r => r.id === loyaltyCustomer.id);
        const newBalance = loyaltyCustomer.points + pointsToEarn - safeRedeemPts;
        await updateLoyaltyRec(loyaltyCustomer.id, {
          amount: newBalance,
          data: {
            ...(existingRec?.data || {}),
            phone: loyaltyCustomer.phone,
            cardNo: loyaltyCustomer.cardNo,
            totalSpent: Number(existingRec?.data?.totalSpent || 0) + finalTotal,
            lastPurchase: nowDate.toISOString(),
            history: [
              ...(Array.isArray(existingRec?.data?.history) ? (existingRec.data.history as any[]).slice(-49) : []),
              { date: nowDate.toISOString(), saleRef: saved.title, earned: pointsToEarn, redeemed: safeRedeemPts, amount: finalTotal }
            ],
          },
        });
      }
      setReceipt({
        receiptNo: saved.title || nextReceiptNo,
        fbrInvoice: generateFBRInvoice(saved.title || nextReceiptNo, nowDate),
        soldAt: nowDate.toISOString(), items: snapshot, subtotal,
        discount: discAmt + loyaltyDiscount, taxRate: taxPct, taxAmt, rounding,
        total: finalTotal, totalQty: snapshot.reduce((s, i) => s + i.qty, 0),
        payMethod, tendered: tenderedAmt, change, cashierName,
        loyaltyEarned: pointsToEarn, loyaltyRedeemed: safeRedeemPts,
        loyaltyTotal: loyaltyCustomer ? loyaltyCustomer.points + pointsToEarn - safeRedeemPts : 0,
      });
      setCart([]); setDiscount(""); setTendered(""); setCustomerName(""); setItemNote("");
      setLoyaltyCustomer(null); setLoyaltyQ(""); setRedeemPts(0);
    } catch { setCheckoutError("Checkout failed. Please try again."); }
    setProcessingCheckout(false);
  }
  checkoutFnRef.current = checkout;

  async function clearCart() {
    if (cart.length === 0) return;
    if (!await confirmToast("Clear the current cart?")) return;
    setCart([]); setDiscount(""); setTendered(""); setCheckoutError(""); setItemNote("");
  }

  function printReceipt() { window.print(); }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "F2")  { e.preventDefault(); searchRef.current?.focus(); showFKeyMsg("F2", "✓ Search focused", "green"); return; }
      if (e.key === "F3")  { e.preventDefault(); holdCart(); return; }
      if (e.key === "F4")  { e.preventDefault(); setShowPriceCheck(true); setPriceCheckQ(""); setTimeout(() => priceCheckRef.current?.focus(), 80); return; }
      if (e.key === "F5")  { e.preventDefault(); discountRef.current?.focus(); discountRef.current?.select(); showFKeyMsg("F5", "✓ Discount field — type amount", "green"); return; }
      if (e.key === "F6")  { e.preventDefault(); noteRef.current?.focus(); showFKeyMsg("F6", "✓ Note field active", "green"); return; }
      if (e.key === "F7")  { e.preventDefault(); holdCart(); return; }
      if (e.key === "F10") { e.preventDefault(); checkoutFnRef.current(); return; }
      if (e.key === "Escape") { setShowPriceCheck(false); setShowHeld(false); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [cart, discount, taxRate, itemNote, customerName, heldSales]);

  const PAY_METHODS = [
    { id: "cash", label: "Cash", color: "#10b981" }, { id: "card", label: "Card", color: "#6366f1" },
    { id: "easypaisa", label: "EasyPaisa", color: "#10b981" }, { id: "jazzcash", label: "JazzCash", color: "#dc2626" },
  ] as const;
  const QUICK_AMTS = [500, 1000, 1500, 2000];
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  function PaginationBar() {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    for (let i = 0; i < totalPages; i++) {
      if (i === 0 || i === totalPages - 1 || Math.abs(i - safeP) <= 1) pages.push(i);
    }
    const withEllipsis: (number | -1)[] = [];
    let prev = -2;
    for (const p of pages) { if (prev !== -2 && p > prev + 1) withEllipsis.push(-1); withEllipsis.push(p); prev = p; }
    return (
      <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, background: "#0c1322" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginRight: 4 }}>{filtered.length} products</span>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safeP === 0}
          style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: safeP === 0 ? "rgba(255,255,255,.18)" : "#fff", fontSize: 13, cursor: safeP === 0 ? "default" : "pointer", fontFamily: ff }}>‹</button>
        {withEllipsis.map((p, i) =>
          p === -1 ? <span key={`e${i}`} style={{ color: "rgba(255,255,255,.25)", fontSize: 11, padding: "0 2px" }}>…</span>
          : <button key={p} onClick={() => setPage(p)}
              style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: p === safeP ? "#6366f1" : "rgba(255,255,255,.04)", color: p === safeP ? "#fff" : "rgba(255,255,255,.4)", fontSize: 11, fontWeight: p === safeP ? 700 : 400, cursor: "pointer", fontFamily: ff, minWidth: 28 }}>{p + 1}</button>
        )}
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safeP === totalPages - 1}
          style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: safeP === totalPages - 1 ? "rgba(255,255,255,.18)" : "#fff", fontSize: 13, cursor: safeP === totalPages - 1 ? "default" : "pointer", fontFamily: ff }}>›</button>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,.2)", marginLeft: 4 }}>Page {safeP + 1} / {totalPages}</span>
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
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .prod-card { transition: transform .12s, box-shadow .12s, border-color .12s; }
        .prod-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,.2) !important; border-color: rgba(99,102,241,.5) !important; }
        .prod-card:active { transform: scale(.96); }
        .pos-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .pos-scroll::-webkit-scrollbar-track { background: transparent; }
        .pos-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 4px; }
        .qfkey:hover { background: rgba(99,102,241,.14) !important; border-color: rgba(99,102,241,.3) !important; }
        .qfkey:hover span { color: #a5b4fc !important; }
        .cat-pill:hover { background: rgba(99,102,241,.18) !important; color: #a5b4fc !important; }
        .qty-btn:hover { opacity: .8; }
        .pay-opt:hover { opacity: .85; }
        .quick-amt:hover { background: rgba(16,185,129,.12) !important; border-color: rgba(16,185,129,.3) !important; color: #34d399 !important; }
      `}</style>

      {/* ── Session Banner ── */}
      {!activeSession ? (
        <div style={{ background: "rgba(245,158,11,.08)", borderBottom: "1px solid rgba(245,158,11,.18)", padding: "6px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>⚠️ No active session — sales will not be linked to a cashier shift.</span>
          <div style={{ display: "flex", gap: 10 }}>
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
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".08em", marginBottom: 2, textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Header Info Bar ── */}
      <div style={{ background: "#0d1425", borderBottom: "1px solid rgba(255,255,255,.07)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
        <div style={{ marginRight: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.01em" }}>New POS Invoice</div>
        </div>
        <div style={{ flex: 1 }} />
        {/* Invoice No */}
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: "7px 14px", marginRight: 10, minWidth: 140 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 2 }}>Invoice No.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#818cf8" }}>{nextReceiptNo}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </div>
        </div>
        {/* Date/Time */}
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: "7px 14px", marginRight: 10, minWidth: 170 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 2 }}>Date &amp; Time</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#dde1f0" }}>📅 {dateStr}  {clockStr}</div>
        </div>
        {/* Cashier */}
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: "7px 14px", marginRight: 10, minWidth: 120 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 2 }}>Cashier</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>👤 {cashierName}</div>
        </div>
        {/* Customer */}
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 10, padding: "7px 14px", minWidth: 200, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 3 }}>Customer (Optional)</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Customer"
              style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 12, fontFamily: ff, outline: "none" }} />
            <button onClick={() => {}} style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(99,102,241,.2)", border: "1px solid rgba(99,102,241,.35)", color: "#818cf8", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
          </div>
        </div>
      </div>

      {/* ── Main Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

        {/* ════ LEFT: Products Panel ════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid rgba(255,255,255,.06)" }}>

          {/* Search + Quick Access + Categories */}
          <div style={{ padding: "12px 16px 10px", background: "#0c1322", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>

            {/* Search Bar */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2.5"
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey} autoFocus
                  placeholder="Scan barcode / Enter barcode / Search product..."
                  style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 40, paddingRight: 12, paddingTop: 11, paddingBottom: 11,
                    background: "rgba(255,255,255,.04)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: ff, outline: "none",
                    border: `1.5px solid ${searchMsg ? (searchMsg.ok ? "rgba(52,211,153,.45)" : "rgba(248,113,113,.45)") : "rgba(99,102,241,.25)"}` }} />
                {searchMsg && (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: searchMsg.ok ? "#34d399" : "#f87171", whiteSpace: "nowrap" }}>
                    {searchMsg.text}
                  </span>
                )}
              </div>
              {/* Keyboard icon */}
              <button style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"/></svg>
              </button>
              <button onClick={() => { const q = search.trim(); if (!q) return; const match = products.find(p => p.sku?.toLowerCase() === q.toLowerCase()) || (filtered.length === 1 ? filtered[0] : null); if (match) { addToCart(match); setSearch(""); setSearchMsg({ text: `✓ ${match.name} added`, ok: true }); setTimeout(() => setSearchMsg(null), 2000); } }}
                style={{ padding: "0 20px", borderRadius: 10, background: "#6366f1", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff, flexShrink: 0 }}>Search</button>
            </div>

            {/* Quick Access */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontWeight: 600, marginRight: 2 }}>Quick Access</span>
              {fKeyMsg && (() => {
                const isGreen = fKeyMsg.endsWith("__green");
                const text = fKeyMsg.replace(/__amber$|__green$/, "");
                return (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 5,
                    color: isGreen ? "#34d399" : "#fbbf24",
                    background: isGreen ? "rgba(52,211,153,.1)" : "rgba(245,158,11,.1)",
                    border: `1px solid ${isGreen ? "rgba(52,211,153,.25)" : "rgba(245,158,11,.22)"}` }}>
                    {text}
                  </span>
                );
              })()}
              {([
                ["F2", "Recent Items", () => { searchRef.current?.focus(); showFKeyMsg("F2", "✓ Search focused", "green"); }],
                ["F3", "Hold Sale",    () => holdCart()],
                ["F4", "Price Check",  () => { setShowPriceCheck(true); setPriceCheckQ(""); setTimeout(() => priceCheckRef.current?.focus(), 80); showFKeyMsg("F4", "✓ Price Check open", "green"); }],
                ["F5", "Discount",     () => { discountRef.current?.focus(); discountRef.current?.select(); showFKeyMsg("F5", "✓ Discount field — type amount", "green"); }],
                ["F6", "Note",         () => { noteRef.current?.focus(); showFKeyMsg("F6", "✓ Note field active", "green"); }],
              ] as [string, string, () => void][]).map(([key, label, action]) => {
                const isActive = flashKey === key;
                const msgColor = fKeyMsg?.endsWith("green") ? "green" : "amber";
                const isGreen  = isActive && msgColor === "green";
                const isAmber  = isActive && msgColor === "amber";
                return (
                  <button key={key} className="qfkey" onClick={action}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontFamily: ff, transition: "all .12s",
                      background: isGreen ? "rgba(52,211,153,.1)" : isAmber ? "rgba(245,158,11,.1)" : "rgba(255,255,255,.05)",
                      border: `1px solid ${isGreen ? "rgba(52,211,153,.3)" : isAmber ? "rgba(245,158,11,.3)" : "rgba(255,255,255,.1)"}` }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
                      color: isGreen ? "#34d399" : isAmber ? "#fbbf24" : "#6366f1",
                      background: isGreen ? "rgba(52,211,153,.15)" : isAmber ? "rgba(245,158,11,.15)" : "rgba(99,102,241,.15)" }}>{key}</span>
                    <span style={{ fontSize: 11, fontWeight: 600,
                      color: isGreen ? "#34d399" : isAmber ? "#fbbf24" : "rgba(255,255,255,.5)" }}>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Category Pills */}
            <div className="pos-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {categories.map(c => (
                <button key={c} className={cat !== c ? "cat-pill" : ""} onClick={() => setCat(c)}
                  style={{ padding: "6px 16px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: ff, transition: "all .12s",
                    background: cat === c ? "#6366f1" : "rgba(255,255,255,.06)",
                    border: cat === c ? "1.5px solid #6366f1" : "1.5px solid rgba(255,255,255,.1)",
                    color: cat === c ? "#fff" : "rgba(255,255,255,.5)" }}>
                  {c}
                  {cat === c && filtered.length > 0 && <span style={{ marginLeft: 6, background: "rgba(255,255,255,.2)", borderRadius: 10, padding: "1px 6px", fontSize: 9 }}>{filtered.length}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {loadingProducts && <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.25)", fontSize: 13 }}>Loading products...</div>}
            {!loadingProducts && products.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,.25)" }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>No products yet</div>
                <a href="/dashboard/retail/catalog" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>Add products →</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {paginated.map(p => {
                const stockQty  = p.itemNewId ? (stockMap[p.itemNewId] ?? 0) : (p.catalogStock !== null ? p.catalogStock : null);
                const outOfStock = stockQty !== null && stockQty <= 0;
                const lowStock   = stockQty !== null && stockQty > 0 && stockQty <= 5;
                return (
                  <div key={p.id} className="prod-card" onClick={() => !outOfStock && addToCart(p)}
                    style={{ background: "#111c30", border: `1.5px solid ${outOfStock ? "rgba(239,68,68,.18)" : "rgba(255,255,255,.08)"}`, borderRadius: 12, padding: "14px 13px 12px", userSelect: "none", opacity: outOfStock ? 0.5 : 1, cursor: outOfStock ? "not-allowed" : "pointer", position: "relative", boxSizing: "border-box" }}>
                    {outOfStock && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(239,68,68,.18)", color: "#f87171", fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>OUT</div>}
                    {lowStock   && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(245,158,11,.15)", color: "#f59e0b", fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>LOW</div>}
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 6 }}>{p.category}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, marginBottom: 4, color: "#e2e8f0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.name}</div>
                    {p.sku && <div style={{ fontSize: 9, color: "rgba(255,255,255,.22)", marginBottom: 8 }}>SKU: {p.sku}</div>}
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#818cf8", marginBottom: 4 }}>Rs. {p.price.toLocaleString()}</div>
                    {stockQty !== null && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: outOfStock ? "#f87171" : lowStock ? "#f59e0b" : "#34d399" }}>
                        Stock: {outOfStock ? "Out" : stockQty}
                      </div>
                    )}
                  </div>
                );
              })}
              {!loadingProducts && filtered.length === 0 && products.length > 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "rgba(255,255,255,.22)", fontSize: 12 }}>No products match "{search || cat}"</div>
              )}
            </div>
          </div>

          <PaginationBar />
        </div>

        {/* ════ RIGHT: Cart Panel ════ */}
        <div style={{ width: 460, background: "#0c1322", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Cart Header */}
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
            {/* Top row: Cart title + buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Cart
                <span style={{ marginLeft: 6, fontSize: 12, color: "rgba(255,255,255,.45)", fontWeight: 500 }}>({cart.length} Items)</span>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                {receipt && (
                  <button onClick={printReceipt} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.1)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>🖨 Receipt</button>
                )}
                <button onClick={clearCart} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.08)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Clear</button>
                <button onClick={() => setShowHeld(v => !v)} style={{ position: "relative", padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(99,102,241,.3)", background: showHeld ? "rgba(99,102,241,.2)" : "rgba(99,102,241,.1)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                  Hold
                  {heldSales.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#f59e0b", color: "#000", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{heldSales.length}</span>}
                </button>
              </div>
            </div>

            {/* ── Loyalty Customer Row ── always visible ── */}
            <div style={{ position: "relative" }}>
              {loyaltyCustomer ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.28)", borderRadius: 9 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🎁</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", lineHeight: 1.2 }}>{loyaltyCustomer.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 1 }}>
                      {loyaltyCustomer.cardNo} · <span style={{ color: "#f59e0b", fontWeight: 700 }}>{loyaltyCustomer.points} pts</span>
                      {pointsToEarn > 0 && <span style={{ color: "#34d399", marginLeft: 4 }}>+{pointsToEarn} pts this sale</span>}
                    </div>
                  </div>
                  {loyaltyCustomer.points >= loyaltyConfig.minRedeemPoints && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>Redeem:</span>
                      <input type="number" min={0} max={loyaltyCustomer.points}
                        value={redeemPts || ""}
                        onChange={e => { const v = Math.max(0, Math.min(loyaltyCustomer.points, parseInt(e.target.value) || 0)); setRedeemPts(v); }}
                        placeholder="0"
                        style={{ width: 50, textAlign: "center", background: "rgba(255,255,255,.07)", border: "1px solid rgba(245,158,11,.35)", borderRadius: 5, padding: "2px 6px", color: "#fff", fontSize: 11, fontFamily: ff, outline: "none" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>pts</span>
                      {safeRedeemPts > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>= −Rs.{loyaltyDiscount}</span>}
                    </div>
                  )}
                  <button onClick={() => { setLoyaltyCustomer(null); setLoyaltyQ(""); setRedeemPts(0); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 15, cursor: "pointer", padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              ) : (
                <div>
                  <input
                    value={loyaltyQ}
                    onChange={e => { setLoyaltyQ(e.target.value); setShowLoyaltySearch(true); }}
                    onFocus={() => setShowLoyaltySearch(true)}
                    onBlur={() => setTimeout(() => setShowLoyaltySearch(false), 200)}
                    placeholder="🎁 Loyalty customer — name, phone, or last 4+ card digits..."
                    style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(245,158,11,.05)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, padding: "7px 12px", color: "rgba(255,255,255,.65)", fontSize: 11, fontFamily: ff, outline: "none" }} />
                  {showLoyaltySearch && lcResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#141e33", border: "1px solid rgba(245,158,11,.3)", borderRadius: 9, zIndex: 60, marginTop: 4, overflow: "hidden", boxShadow: "0 12px 32px rgba(0,0,0,.65)" }}>
                      {lcResults.map(r => (
                        <div key={r.id}
                          onMouseDown={() => {
                            setLoyaltyCustomer({ id: r.id, name: r.title, cardNo: String(r.data?.cardNo || ""), phone: String(r.data?.phone || ""), points: r.amount || 0, totalSpent: Number(r.data?.totalSpent) || 0 });
                            setLoyaltyQ(""); setShowLoyaltySearch(false); setRedeemPts(0);
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(245,158,11,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#f59e0b", fontWeight: 800, flexShrink: 0 }}>{r.title.charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{r.title}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>{String(r.data?.cardNo || "")} · {String(r.data?.phone || "")}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>{r.amount || 0}</div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)" }}>pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showLoyaltySearch && loyaltyQ.length >= 2 && lcResults.length === 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#141e33", border: "1px solid rgba(255,255,255,.1)", borderRadius: 9, zIndex: 60, marginTop: 4, padding: "12px 14px", textAlign: "center", color: "rgba(255,255,255,.35)", fontSize: 12 }}>
                      No loyalty customers found ·{" "}
                      <a href="/dashboard/retail/loyalty" style={{ color: "#f59e0b", textDecoration: "none", fontWeight: 700 }}>Register one →</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column Headers */}
          {cart.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 72px 90px 60px 70px 20px", gap: 4, padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(255,255,255,.02)", flexShrink: 0 }}>
              {(["#", "Item", "Price", "Qty", "Discount", "Total", ""] as string[]).map((h, i) => (
                <div key={i} style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".06em", textTransform: "uppercase", textAlign: i >= 2 && i <= 5 ? "right" : "left" }}>{h}</div>
              ))}
            </div>
          )}

          {/* Cart Items */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: "auto", padding: cart.length === 0 ? 0 : "4px 10px" }}>
            {cart.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,.18)", gap: 10 }}>
                <div style={{ fontSize: 44 }}>🛒</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Cart is empty</div>
                <div style={{ fontSize: 11 }}>Tap a product · press F2 to search</div>
              </div>
            ) : cart.map((item, idx) => {
              const lineTotal = item.price * item.qty - (item.itemDiscount || 0) * item.qty;
              return (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 72px 90px 60px 70px 20px", gap: 4, alignItems: "center", padding: "8px 4px", marginBottom: 3, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.25)", textAlign: "center" }}>{idx + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#e2e8f0" }}>{item.name}</div>
                    {item.sku && <div style={{ fontSize: 9, color: "rgba(255,255,255,.28)", marginTop: 1 }}>SKU: {item.sku}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textAlign: "right" }}>Rs. {item.price.toLocaleString()}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}
                      style={{ width: 22, height: 22, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>−</button>
                    <input type="number" min={1} value={item.qty === 0 ? "" : item.qty}
                      onChange={e => setQty(item.id, e.target.value)}
                      onBlur={e => commitQty(item.id, e.target.value)}
                      onFocus={e => e.target.select()}
                      style={{ width: 28, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 5, padding: "1px 0", outline: "none", fontFamily: ff }} />
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}
                      style={{ width: 22, height: 22, background: "#6366f1", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>+</button>
                  </div>
                  <div>
                    <input type="number" min={0} value={item.itemDiscount || ""}
                      onChange={e => setItemDisc(item.id, e.target.value)}
                      placeholder="0.00"
                      style={{ width: "100%", textAlign: "right", fontSize: 10, color: item.itemDiscount ? "#fbbf24" : "rgba(255,255,255,.28)", background: "transparent", border: `1px solid ${item.itemDiscount ? "rgba(245,158,11,.3)" : "rgba(255,255,255,.08)"}`, borderRadius: 5, padding: "3px 5px", outline: "none", fontFamily: ff, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", textAlign: "right" }}>Rs. {lineTotal.toLocaleString()}</div>
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.2)", fontSize: 13, cursor: "pointer", padding: 0, textAlign: "center" }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* Add item note */}
          {cart.length > 0 && (
            <div style={{ padding: "6px 14px", borderTop: "1px solid rgba(255,255,255,.05)", flexShrink: 0 }}>
              <input ref={noteRef} value={itemNote} onChange={e => setItemNote(e.target.value)} placeholder="✏ Add item note..."
                style={{ width: "100%", boxSizing: "border-box" as const, background: "transparent", border: "none", borderBottom: "1px dashed rgba(255,255,255,.1)", color: "rgba(255,255,255,.4)", fontSize: 11, fontFamily: ff, outline: "none", padding: "4px 2px" }} />
            </div>
          )}

          {/* Summary + Payment */}
          <div style={{ padding: "12px 16px 14px", borderTop: "1px solid rgba(255,255,255,.08)", flexShrink: 0 }}>

            {/* Summary Lines */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 7 }}>
                <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {/* Discount row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Discount</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <input ref={discountRef} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0.00" type="number" min="0"
                    style={{ width: 64, textAlign: "right", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, padding: "3px 7px", color: "#fff", fontSize: 12, fontFamily: ff, outline: "none" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, padding: "3px 7px" }}>Rs.</span>
                  <span style={{ fontSize: 12, color: discAmt > 0 ? "#f87171" : "rgba(255,255,255,.35)", fontWeight: discAmt > 0 ? 700 : 400, minWidth: 55, textAlign: "right" }}>
                    {discAmt > 0 ? discAmt.toLocaleString() : "0.00"}
                  </span>
                </div>
              </div>
              {/* Tax row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Tax</span>
                  <input value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0" type="number" min="0" max="100"
                    style={{ width: 42, textAlign: "center", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 5, padding: "3px 6px", color: "#fbbf24", fontSize: 11, fontFamily: ff, outline: "none" }} />
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>%</span>
                </div>
                <span style={{ fontSize: 12, color: taxAmt > 0 ? "#fbbf24" : "rgba(255,255,255,.35)", fontWeight: taxAmt > 0 ? 700 : 400 }}>
                  {taxAmt > 0 ? `Rs. ${taxAmt.toLocaleString()}` : "Rs. 0.00"}
                </span>
              </div>
              {/* Rounding */}
              {Math.abs(rounding) > 0.001 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.35)", marginBottom: 7 }}>
                  <span>Rounding</span><span>Rs. {rounding.toFixed(2)}</span>
                </div>
              )}
              {/* Loyalty Discount */}
              {loyaltyDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#34d399", fontWeight: 700, marginBottom: 7, padding: "5px 8px", background: "rgba(52,211,153,.06)", borderRadius: 6, border: "1px solid rgba(52,211,153,.15)" }}>
                  <span>🎁 Loyalty Redeem ({safeRedeemPts} pts)</span>
                  <span>−Rs. {loyaltyDiscount.toLocaleString()}</span>
                </div>
              )}
              {/* Grand Total */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Grand Total</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: cart.length > 0 ? "#818cf8" : "rgba(255,255,255,.2)", letterSpacing: "-.02em" }}>
                  Rs. {finalTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 5 }}>Payment Method</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
                {PAY_METHODS.map(m => (
                  <button key={m.id} className="pay-opt" onClick={() => setPayMethod(m.id)}
                    style={{ padding: "7px 0", borderRadius: 7, border: `1.5px solid ${payMethod === m.id ? m.color : "rgba(255,255,255,.08)"}`,
                      background: payMethod === m.id ? `${m.color}22` : "rgba(255,255,255,.03)",
                      color: payMethod === m.id ? m.color : "rgba(255,255,255,.35)",
                      fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .12s" }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash tendered */}
            {payMethod === "cash" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>Amount Received</span>
                  <input ref={tenderedRef} value={tendered} onChange={e => setTendered(e.target.value)} placeholder="0.00" type="number" min="0"
                    style={{ width: 110, textAlign: "right", background: "rgba(255,255,255,.05)", border: "1px solid rgba(16,185,129,.25)", borderRadius: 7, padding: "5px 10px", color: "#fff", fontSize: 13, fontFamily: ff, outline: "none", fontWeight: 600 }} />
                </div>
                {tenderedAmt >= finalTotal && finalTotal > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#34d399", fontWeight: 700, padding: "7px 12px", background: "rgba(52,211,153,.08)", borderRadius: 8, border: "1px solid rgba(52,211,153,.18)", marginBottom: 6 }}>
                    <span>Change</span><span>Rs. {change.toLocaleString()}</span>
                  </div>
                )}
                {/* Quick amounts */}
                <div style={{ display: "flex", gap: 5 }}>
                  {QUICK_AMTS.map(amt => (
                    <button key={amt} className="quick-amt" onClick={() => setTendered(String(amt))}
                      style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: `1px solid ${Number(tendered) === amt ? "rgba(16,185,129,.4)" : "rgba(255,255,255,.1)"}`, background: Number(tendered) === amt ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.04)", color: Number(tendered) === amt ? "#34d399" : "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .1s" }}>
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                  <button className="quick-amt" onClick={() => setTendered(String(finalTotal))}
                    style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "1px solid rgba(52,211,153,.25)", background: "rgba(52,211,153,.07)", color: "#34d399", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                    Exact
                  </button>
                </div>
              </div>
            )}

            {checkoutError && (
              <div style={{ marginTop: 8, padding: "7px 10px", borderRadius: 7, background: "rgba(248,113,113,.09)", border: "1px solid rgba(248,113,113,.2)", color: "#fca5a5", fontSize: 11 }}>
                {checkoutError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ── BOTTOM ACTION BAR ── */}
      {/* ══════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", background: "#080e1c", borderTop: "1px solid rgba(255,255,255,.08)", flexShrink: 0, height: 58 }}>
        {/* F7 Hold Invoice */}
        <button onClick={holdCart}
          style={{ height: "100%", padding: "0 22px", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.04)", border: "none", borderRight: "1px solid rgba(255,255,255,.07)", color: "rgba(255,255,255,.55)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .12s", flexShrink: 0, position: "relative" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", background: "rgba(99,102,241,.15)", padding: "2px 6px", borderRadius: 3 }}>F7</span>
          Hold Invoice
          {heldSales.length > 0 && <span style={{ position: "absolute", top: 8, right: 8, background: "#f59e0b", color: "#000", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{heldSales.length}</span>}
        </button>
        {/* F8 Print Preview */}
        <button onClick={() => { if (receipt) printReceipt(); else showFKeyMsg("F8", "F8 — No receipt yet, complete a sale first", "amber"); }}
          style={{ height: "100%", padding: "0 22px", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.04)", border: "none", borderRight: "1px solid rgba(255,255,255,.07)", color: flashKey === "F8" ? "#fbbf24" : "rgba(255,255,255,.55)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .12s", flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: flashKey === "F8" ? "#fbbf24" : "#6366f1", background: flashKey === "F8" ? "rgba(245,158,11,.15)" : "rgba(99,102,241,.15)", padding: "2px 6px", borderRadius: 3 }}>F8</span>
          Print Preview
        </button>

        {/* Center summary */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 24, padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Items</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{cart.length}</span>
          </div>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Total Qty</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{totalQty}</span>
          </div>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,.1)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: cart.length > 0 ? "#818cf8" : "rgba(255,255,255,.25)" }}>Rs. {finalTotal.toLocaleString()}</span>
          </div>
        </div>

        {/* Pay & Print */}
        <button onClick={checkout} disabled={cart.length === 0 || processingCheckout}
          style={{ height: "100%", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, background: cart.length > 0 ? "linear-gradient(135deg,#059669,#10b981)" : "rgba(255,255,255,.06)", border: "none", borderLeft: "1px solid rgba(255,255,255,.07)", color: cart.length > 0 ? "#fff" : "rgba(255,255,255,.2)", fontSize: 13, fontWeight: 700, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontFamily: ff, flexShrink: 0, transition: "opacity .15s" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          {processingCheckout ? "Processing..." : "Pay & Print"}
        </button>

        {/* F10 Pay */}
        <button onClick={checkout} disabled={cart.length === 0 || processingCheckout}
          style={{ height: "100%", padding: "0 28px", display: "flex", alignItems: "center", gap: 8, background: cart.length > 0 ? "#6366f1" : "rgba(255,255,255,.05)", border: "none", borderLeft: "1px solid rgba(255,255,255,.07)", color: cart.length > 0 ? "#fff" : "rgba(255,255,255,.2)", fontSize: 14, fontWeight: 800, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontFamily: ff, flexShrink: 0, boxShadow: cart.length > 0 ? "inset 0 0 0 1px rgba(255,255,255,.1)" : "none" }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: cart.length > 0 ? "#c7d2fe" : "rgba(255,255,255,.2)", background: "rgba(255,255,255,.12)", padding: "2px 6px", borderRadius: 3 }}>F10</span>
          Pay  →
        </button>
      </div>

      {/* ── Held Sales Panel ── */}
      {showHeld && (
        <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setShowHeld(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(94vw,520px)", background: "#111c30", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.6)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Held Sales</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 1 }}>{heldSales.length} sale{heldSales.length !== 1 ? "s" : ""} on hold — click to recall</div>
              </div>
              <button onClick={() => setShowHeld(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 14px" }}>
              {heldSales.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,.3)", fontSize: 13 }}>No held sales</div>
              ) : heldSales.map((h, i) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 10px", marginBottom: 6, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 800, color: "#818cf8" }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                      Hold #{i + 1} — {h.cart.length} item{h.cart.length !== 1 ? "s" : ""}
                      {h.customer && <span style={{ marginLeft: 6, fontSize: 10, color: "#34d399" }}>· {h.customer}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                      {h.cart.map(c => c.name).join(", ").slice(0, 55)}{h.cart.map(c => c.name).join(", ").length > 55 ? "…" : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 1 }}>Saved at {h.savedAt}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#818cf8" }}>Rs. {h.total.toLocaleString()}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                      <button onClick={() => recallHeld(h.id)}
                        style={{ padding: "4px 12px", borderRadius: 6, background: "#6366f1", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Recall</button>
                      <button onClick={() => deleteHeld(h.id)}
                        style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(255,255,255,.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>F3 / F7 to hold current cart</span>
              <button onClick={holdCart} disabled={cart.length === 0}
                style={{ padding: "6px 16px", borderRadius: 8, background: cart.length > 0 ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.05)", border: "1px solid rgba(99,102,241,.3)", color: cart.length > 0 ? "#818cf8" : "rgba(255,255,255,.2)", fontSize: 12, fontWeight: 700, cursor: cart.length > 0 ? "pointer" : "not-allowed", fontFamily: ff }}>
                Hold Current Cart ({cart.length} items)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Price Check Modal (F4) ── */}
      {showPriceCheck && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowPriceCheck(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: "min(94vw,560px)", background: "#111c30", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.6)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>🔍 Price Check</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 1 }}>Search product to check price — press Enter to add to cart</div>
              </div>
              <button onClick={() => setShowPriceCheck(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input ref={priceCheckRef} value={priceCheckQ} onChange={e => setPriceCheckQ(e.target.value)}
                  onKeyDown={e => { if (e.key === "Escape") setShowPriceCheck(false); if (e.key === "Enter") { const res = products.filter(p => p.name.toLowerCase().includes(priceCheckQ.toLowerCase()) || p.sku.toLowerCase().includes(priceCheckQ.toLowerCase())); if (res.length === 1) { addToCart(res[0]); setShowPriceCheck(false); showFKeyMsg("F4", `✓ ${res[0].name} added to cart`, "green"); } } }}
                  placeholder="Type product name or SKU..."
                  style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 38, paddingRight: 12, paddingTop: 11, paddingBottom: 11, background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(99,102,241,.3)", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: ff, outline: "none" }} />
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {priceCheckQ.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,.25)", fontSize: 13 }}>Start typing to search products</div>
                ) : (() => {
                  const res = products.filter(p =>
                    p.name.toLowerCase().includes(priceCheckQ.toLowerCase()) ||
                    p.sku.toLowerCase().includes(priceCheckQ.toLowerCase())
                  );
                  if (res.length === 0) return <div style={{ textAlign: "center", padding: "24px 0", color: "#f87171", fontSize: 13 }}>No product found for "{priceCheckQ}"</div>;
                  return res.map(p => {
                    const stockQty = p.itemNewId ? (stockMap[p.itemNewId] ?? 0) : (p.catalogStock !== null ? p.catalogStock : null);
                    const outOfStock = stockQty !== null && stockQty <= 0;
                    return (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", marginBottom: 6, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, cursor: outOfStock ? "not-allowed" : "pointer", opacity: outOfStock ? 0.5 : 1 }}
                        onClick={() => { if (!outOfStock) { addToCart(p); setShowPriceCheck(false); showFKeyMsg("F4", `✓ ${p.name} added`, "green"); } }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(99,102,241,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>📦</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{p.name}</div>
                          {p.sku && <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>SKU: {p.sku} · {p.category}</div>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#818cf8" }}>Rs. {p.price.toLocaleString()}</div>
                          <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600, color: outOfStock ? "#f87171" : stockQty !== null && stockQty <= 5 ? "#f59e0b" : "#34d399" }}>
                            {stockQty !== null ? (outOfStock ? "Out of stock" : `${stockQty} in stock`) : "Stock N/A"}
                          </div>
                        </div>
                        {!outOfStock && (
                          <button style={{ padding: "5px 12px", borderRadius: 7, background: "#6366f1", border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff, flexShrink: 0 }}>+ Add</button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            <div style={{ padding: "8px 18px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>Press Esc to close · Enter to add single match</span>
              <button onClick={() => setShowPriceCheck(false)} style={{ padding: "6px 16px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.5)", fontSize: 12, cursor: "pointer", fontFamily: ff }}>Close</button>
            </div>
          </div>
        </div>
      )}

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
