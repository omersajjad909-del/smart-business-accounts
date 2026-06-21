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
  category: string; sku: string; barcode?: string; itemNewId?: string; itemDiscount: number;
};

type BarcodeItem = {
  id: string;
  name: string;
  code?: string | null;
  barcode?: string | null;
  rate?: number | null;
  salePrice?: number | null;
};

export default function POSPage() {
  const userRef = useRef(getCurrentUser());
  const user = userRef.current;
  const cashierName = (user as { name?: string } | null)?.name || "Cashier";

  const { records: productRecords, loading: loadingProducts, refetch: refetchProducts } = useBusinessRecords("catalog_product");
  const { records: saleRecords, create: createSale } = useBusinessRecords("pos_sale");
  const { records: sessionRecords, update: updateSession } = useBusinessRecords("pos_session");
  const { records: loyaltyRecords, create: createLoyaltyRec, update: updateLoyaltyRec } = useBusinessRecords("loyalty_customer");
  const { records: discountRecords } = useBusinessRecords("retail_discount");
  const activeSession = sessionRecords.find(s => s.status?.toLowerCase() === "open") || null;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [searchMsg, setSearchMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [discount, setDiscount] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [tendered, setTendered] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "bank_transfer" | "cheque">("cash");
  const [txRef, setTxRef] = useState("");
  const [company, setCompany] = useState<CompanyInfo>({ name: "My Store" });
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [barcodeItems, setBarcodeItems] = useState<BarcodeItem[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [page, setPage] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [clockStr, setClockStr] = useState("");
  const [itemNote, setItemNote] = useState("");
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const [fKeyMsg, setFKeyMsg] = useState<string | null>(null);

  // Camera Scanner
  const [showScanner, setShowScanner]     = useState(false);
  const [scannerError, setScannerError]   = useState("");
  const [scannerStatus, setScannerStatus] = useState<"idle" | "starting" | "scanning" | "unsupported">("idle");
  const [lastScanned, setLastScanned]     = useState("");

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

  const [discountCode, setDiscountCode] = useState("");
  const [discountCodeMsg, setDiscountCodeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function applyDiscountCode() {
    const code = discountCode.trim();
    if (!code) return;
    const today = new Date().toISOString().slice(0, 10);
    const match = discountRecords.find(r => {
      const rCode = (r.data?.code as string || r.title || "").toLowerCase();
      if (rCode !== code.toLowerCase()) return false;
      if (r.status === "inactive") return false;
      const from = r.data?.validFrom as string | undefined;
      const to   = r.data?.validTo   as string | undefined;
      if (from && today < from) return false;
      if (to   && today > to)   return false;
      return true;
    });
    if (!match) {
      setDiscountCodeMsg({ text: `Code "${code}" not found or expired`, ok: false });
      setTimeout(() => setDiscountCodeMsg(null), 3000);
      return;
    }
    const amt = match.amount || Number(match.data?.amount || 0);
    setDiscount(String(amt));
    setDiscountCode("");
    setDiscountCodeMsg({ text: `✓ Code applied — Rs. ${amt} off`, ok: true });
    setTimeout(() => setDiscountCodeMsg(null), 3000);
  }

  const searchRef    = useRef<HTMLInputElement>(null);
  const discountRef  = useRef<HTMLInputElement>(null);
  const tenderedRef  = useRef<HTMLInputElement>(null);
  const noteRef      = useRef<HTMLInputElement>(null);
  const videoRef              = useRef<HTMLVideoElement>(null);
  const scannerStreamRef      = useRef<MediaStream | null>(null);
  const scannerRafRef         = useRef<number>(0);
  const fileInputRef          = useRef<HTMLInputElement>(null);
  const handleScannedCodeRef  = useRef<(code: string) => void>(() => {});
  const checkoutFnRef = useRef<() => Promise<void>>(async () => {});
  const fKeyTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => setClockStr(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Refetch products when user switches back to this tab (catches price updates from other pages)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refetchProducts();
        loadBarcodeItems();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refetchProducts]);

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

  function loadBarcodeItems() {
    fetch("/api/barcode", { credentials: "include", headers: authHeaders() })
      .then(r => r.ok ? r.json() : { items: [] })
      .then((data: { items?: BarcodeItem[] }) => setBarcodeItems(Array.isArray(data.items) ? data.items : []))
      .catch(() => {});
  }

  useEffect(() => {
    const h = user as { id?: string; role?: string; companyId?: string } | null;
    const headers: HeadersInit = { "x-user-id": h?.id || "", "x-user-role": h?.role || "ADMIN", "x-company-id": h?.companyId || "" };
    fetch("/api/me/company", { headers })
      .then(r => r.json())
      .then(d => { if (d?.name) setCompany(c => ({ ...c, name: d.name, address: d.address, phone: d.phone })); })
      .catch(() => {});
    fetch("/api/company/admin-control", { headers, credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d?.loyaltySettings) setLoyaltyConfig(lc => ({ ...lc, ...d.loyaltySettings }));
        if (d?.taxProfile) setCompany(c => ({
          ...c,
          taxIdLabel: d.taxProfile.taxIdLabel || "",
          taxIdValue: d.taxProfile.taxIdValue || d.taxProfile.vatNumber || d.taxProfile.gstNumber || "",
        }));
      })
      .catch(() => {});
    loadStock();
    loadBarcodeItems();
  }, []);

  const barcodeItemById = new Map(barcodeItems.map(item => [item.id, item]));
  const barcodeItemByCode = new Map<string, BarcodeItem>();
  barcodeItems.forEach(item => {
    [item.code, item.barcode, item.name].forEach(value => {
      const key = String(value || "").trim().toLowerCase();
      if (key && !barcodeItemByCode.has(key)) barcodeItemByCode.set(key, item);
    });
  });

  const products = productRecords.filter(r => r.status !== "inactive").map(r => {
    const sku = (r.data?.sku as string) || "";
    const itemNewId = (r.data?.itemNewId as string) || "";
    const inventoryItem =
      (itemNewId && barcodeItemById.get(itemNewId)) ||
      barcodeItemByCode.get(sku.trim().toLowerCase()) ||
      barcodeItemByCode.get(r.title.trim().toLowerCase());
    const inventoryRate = Number(inventoryItem?.rate ?? inventoryItem?.salePrice ?? NaN);
    return {
      id: r.id, name: r.title,
      category: (r.data?.category as string) || "General",
      price: Number.isFinite(inventoryRate) ? inventoryRate : r.amount || 0,
      sku,
      barcode: (inventoryItem?.barcode as string) || (r.data?.barcode as string) || sku,
      itemNewId,
      catalogStock: typeof r.data?.stock === "number" ? r.data.stock as number : null,
      imageUrl: (r.data?.imageUrl as string) || "",
    };
  });

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = products.filter(p => {
    const matchCat = cat === "All" || p.category === cat;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeP = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE);
  useEffect(() => { setPage(0); }, [cat, search]);

  // Start ZXing camera scanner after modal renders
  useEffect(() => {
    if (!showScanner) return;
    const video = videoRef.current;
    if (!video) return;

    let mounted = true;
    let stopControls: (() => void) | null = null;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("CameraUnsupported");
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (!mounted) return;

        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const cameras = devices.filter(device => device.kind === "videoinput");
        const backCamera = cameras.find(device => /back|rear|environment/i.test(device.label));
        const videoConstraints: MediaTrackConstraints = backCamera
          ? { deviceId: { exact: backCamera.deviceId } }
          : { facingMode: { ideal: "environment" } };
        const reader = new BrowserMultiFormatReader();

        const controls = await reader.decodeFromConstraints(
          { video: videoConstraints },
          video,
          (result, err) => {
            if (!mounted || !result) return;
            handleScannedCodeRef.current(result.getText());
          }
        );

        stopControls = () => controls.stop();
        if (mounted) setScannerStatus("scanning");
      } catch (e: any) {
        if (!mounted) return;
        setScannerError(
          e?.name === "NotAllowedError"
            ? "Camera permission deny ki. Browser settings mein allow karo."
            : e?.message === "CameraUnsupported"
              ? "Is browser/device mein camera scanning support nahi hai. Photo upload try karo."
            : "Camera open nahi ho saka. Dobara try karo."
        );
        setScannerStatus("idle");
      }
    })();

    return () => {
      mounted = false;
      stopControls?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner]);

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
  const change      = tenderedAmt > 0 && tenderedAmt >= finalTotal ? tenderedAmt - finalTotal : 0;
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
    const normalizedQ = q.toLowerCase();
    const match = products.find(p =>
      (p.sku && p.sku.toLowerCase() === normalizedQ) ||
      (p.barcode && p.barcode.toLowerCase() === normalizedQ)
    )
      || (filtered.length === 1 ? filtered[0] : null);
    if (match) {
      addToCart(match); setSearch("");
      setSearchMsg({ text: `✓ ${match.name} added`, ok: true });
    } else {
      setSearchMsg({ text: filtered.length === 0 ? `No match for "${q}"` : `${filtered.length} results found`, ok: filtered.length > 0 });
    }
    setTimeout(() => setSearchMsg(null), 2500);
  }

  // ── Camera Scanner ────────────────────────────────────────────────────────
  function handleScannedCode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    const normalizedCode = code.toLowerCase();
    const match = products.find(p =>
      (p.sku     && p.sku.toLowerCase()     === normalizedCode) ||
      (p.barcode && p.barcode.toLowerCase() === normalizedCode) ||
      (p.name    && p.name.toLowerCase()    === normalizedCode)
    );
    if (match) {
      addToCart(match);
      setLastScanned(`✓ ${match.name}`);
      stopScanner();
      setTimeout(() => setLastScanned(""), 2500);
    } else {
      setLastScanned(`"${code}" — item not found`);
      setSearch(code);
      stopScanner();
    }
  }
  handleScannedCodeRef.current = handleScannedCode;

  function stopScanner() {
    setShowScanner(false); // triggers useEffect cleanup which stops stream
    setScannerError("");
    setScannerStatus("idle");
    setLastScanned("");
  }

  function startScanner() {
    setScannerError("");
    setLastScanned("");
    setScannerStatus("starting");
    setShowScanner(true); // useEffect handles everything after render
  }

  async function handleFileCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannerError("");
    setLastScanned("Photo read ho rahi hai…");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const result = await reader.decodeFromImageElement(image);
        handleScannedCode(result.getText());
        return;
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch {
      setLastScanned("");
      setScannerError("Barcode detect nahi hua. Clear photo lo — barcode seedha aur visible hona chahiye.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function checkout() {
    if (cart.length === 0) { setCheckoutError("Cart is empty."); return; }
    if (finalTotal <= 0 && rounded > 0 && loyaltyDiscount < rounded) { setCheckoutError("Total must be greater than zero."); return; }
    if (payMethod === "cash" && tendered && tenderedAmt < finalTotal) {
      setCheckoutError(`Amount received (Rs. ${tenderedAmt}) is less than total (Rs. ${finalTotal}).`); return;
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
          body: JSON.stringify({ date: nowDate.toISOString(), items: syncedItems.map(i => ({ itemNewId: i.itemNewId, name: i.name, qty: i.qty, rate: i.price })), total: finalTotal, taxAmt, discount: discAmt + loyaltyDiscount, payMethod }),
        });
        if (!stockRes.ok) { const err = await stockRes.json(); setCheckoutError(err.error || "Stock deduction failed"); setProcessingCheckout(false); return; }
        loadStock();
      }
      const saved = await createSale({
        title: nextReceiptNo, status: "completed", amount: finalTotal,
        data: { payMethod, txRef: txRef || null, items: snapshot.map(i => `${i.name} x${i.qty}`).join(", "), discount: discAmt + loyaltyDiscount, taxRate: taxPct, taxAmt, subtotal, cart: snapshot, tendered: tenderedAmt, change, cashierName, sessionId: activeSession?.id || null, sessionRef: activeSession?.title || null, customerName: loyaltyCustomer?.name || customerName || null, itemNote: itemNote || null, loyaltyCard: loyaltyCustomer?.cardNo || null, loyaltyRedeemed: safeRedeemPts, loyaltyEarned: pointsToEarn },
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
      // Create proper SalesInvoice document (inventory + GL already done by pos-checkout)
      fetch("/api/pos-invoice", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptNo: saved.title || nextReceiptNo,
          date: nowDate.toISOString().slice(0, 10),
          customerId: loyaltyCustomer?.id || null,
          items: snapshot.filter(i => i.itemNewId).map(i => ({
            itemId: i.itemNewId,
            qty: i.qty,
            rate: i.price,
            discountPercent: i.itemDiscount ? Math.round((i.itemDiscount / i.price) * 100) : 0,
            taxPercent: taxPct,
          })),
          total: finalTotal,
          discount: discAmt + loyaltyDiscount,
          taxAmt,
          payMethod,
        }),
      }).catch(() => {});

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
      setCart([]); setDiscount(""); setTendered(""); setTxRef(""); setCustomerName(""); setItemNote("");
      setLoyaltyCustomer(null); setLoyaltyQ(""); setRedeemPts(0);
    } catch { setCheckoutError("Checkout failed. Please try again."); }
    setProcessingCheckout(false);
  }
  checkoutFnRef.current = checkout;

  async function clearCart() {
    if (cart.length === 0) return;
    if (!await confirmToast("Clear the current cart?")) return;
    setCart([]); setDiscount(""); setTendered(""); setTxRef(""); setCheckoutError(""); setItemNote("");
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
    { id: "cash",          label: "💵 Cash",          color: "#10b981" },
    { id: "card",          label: "💳 Card",           color: "#6366f1" },
    { id: "bank_transfer", label: "🏦 Bank Transfer",  color: "#3b82f6" },
    { id: "cheque",        label: "📄 Cheque",         color: "#f59e0b" },
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
    <div style={{ height: "100vh", background: "#070c18", color: "#fff", fontFamily: ff, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
        .prod-card { transition: transform .1s, box-shadow .1s, border-color .1s; }
        .prod-card:hover { transform: translateY(-3px) !important; box-shadow: 0 10px 28px rgba(99,102,241,.28) !important; border-color: rgba(99,102,241,.6) !important; }
        .prod-card:active { transform: scale(.95) !important; }
        .pos-scroll::-webkit-scrollbar { width: 3px; height: 3px; }
        .pos-scroll::-webkit-scrollbar-track { background: transparent; }
        .pos-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 3px; }
        .qfkey:hover { background: rgba(99,102,241,.18) !important; border-color: rgba(99,102,241,.4) !important; }
        .cat-pill:hover { background: rgba(99,102,241,.2) !important; color: #c7d2fe !important; }
        .qty-btn:hover { opacity: .75; }
        .pay-opt:hover { transform: translateY(-1px); opacity: .9; }
        .pay-opt { transition: all .1s; }
        .quick-amt:hover { background: rgba(16,185,129,.14) !important; border-color: rgba(16,185,129,.4) !important; color: #34d399 !important; }
        .cart-row:hover { background: rgba(255,255,255,.024) !important; }
        .checkout-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .checkout-btn { transition: all .12s; }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ════════════════════════════════════════════
          TOP HEADER BAR — compact single row ~52px
      ════════════════════════════════════════════ */}
      <div style={{ height: 52, background: "#0f1729", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0, zIndex: 10 }}>
        {/* Left: logo + company */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 10px rgba(99,102,241,.35)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-.01em" }}>{company.name}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: ".08em", textTransform: "uppercase" }}>POS Terminal</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,.07)", flexShrink: 0 }} />

        {/* Center: invoice badge + date + clock */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.22)", borderRadius: 8, padding: "4px 11px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600 }}>Invoice</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#818cf8", fontFamily: "'Courier New',monospace" }}>{nextReceiptNo}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#c7d0e8" }}>{dateStr}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 7, padding: "3px 10px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: ".02em" }}>{clockStr}</span>
          </div>
        </div>

        {/* Right: cashier chip + session dot + stats + session link */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Cashier chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 20, padding: "4px 10px 4px 6px" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(52,211,153,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#34d399", fontWeight: 800, flexShrink: 0 }}>
              {cashierName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>{cashierName}</span>
          </div>
          {/* Active session dot */}
          {activeSession && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 7px #10b981" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399" }}>LIVE</span>
            </div>
          )}
          {/* Stats toggle */}
          <button className="pos-top-btn" onClick={() => setShowStats(v => !v)}
            style={{ padding: "5px 11px", borderRadius: 7, border: `1px solid ${showStats ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.1)"}`, background: showStats ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)", color: showStats ? "#a5b4fc" : "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .12s" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 4, verticalAlign: "middle" }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            {showStats ? "Hide Stats" : "Stats"}
          </button>
          {/* Session link */}
          <a href="/dashboard/retail/pos-sessions"
            style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, transition: "all .12s" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            Session
          </a>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          STATS BAR — collapsible
      ════════════════════════════════════════════ */}
      {showStats && (
        <div style={{ display: "flex", background: "#0c1829", borderBottom: "1px solid rgba(255,255,255,.05)", flexShrink: 0 }}>
          {[
            { label: "TODAY SALES",    value: `Rs. ${todayTotal.toLocaleString()}`,  color: "#34d399", icon: "📈", href: null },
            { label: "TRANSACTIONS",   value: String(todaySales.length),              color: "#e2e8f0", icon: "🧾", href: "/dashboard/retail/sales-history" },
            { label: "CASH",           value: `Rs. ${cashTotal.toLocaleString()}`,    color: "#10b981", icon: "💵", href: null },
            { label: "CARD / DIGITAL", value: `Rs. ${cardTotal.toLocaleString()}`,    color: "#818cf8", icon: "💳", href: null },
            { label: "NEXT RECEIPT",   value: nextReceiptNo,                           color: "#f59e0b", icon: "#",  href: null },
          ].map((s, si) => (
            <div key={s.label} className="pos-stat-tile"
              onClick={() => s.href && (window.location.href = s.href)}
              style={{ flex: 1, padding: "9px 16px", borderRight: si < 4 ? "1px solid rgba(255,255,255,.04)" : "none", cursor: s.href ? "pointer" : "default", transition: "background .12s" }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,.28)", letterSpacing: ".09em", marginBottom: 3, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{s.icon}</span>{s.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: s.color, letterSpacing: "-.01em" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════
          SESSION WARNING BANNER
      ════════════════════════════════════════════ */}
      {!activeSession && (
        <div style={{ background: "rgba(245,158,11,.07)", borderBottom: "1px solid rgba(245,158,11,.18)", padding: "7px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(245,158,11,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>⚠</div>
            <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>No active cashier session — sales won't be linked to a shift.</span>
          </div>
          <a href="/dashboard/retail/pos-sessions" style={{ fontSize: 12, color: "#f59e0b", fontWeight: 700, textDecoration: "none", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 7, padding: "4px 12px" }}>Open Session →</a>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MAIN BODY
      ════════════════════════════════════════════ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, flexDirection: "row" }}>

        {/* ════ LEFT PANEL: Products ════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid rgba(255,255,255,.06)" }}>

          {/* ── Search + Controls Bar ── */}
          <div style={{ padding: "12px 16px 10px", background: "#0f1729", borderBottom: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>

            {/* Row 1: Search input + camera + search button */}
            <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5"
                  style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span style={{ position: "absolute", left: 35, top: "50%", transform: "translateY(-50%)", fontSize: 9, fontWeight: 800, color: "#6366f1", background: "rgba(99,102,241,.15)", padding: "1px 5px", borderRadius: 3, pointerEvents: "none" }}>F2</span>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKey} autoFocus
                  placeholder="Search products, SKU, barcode…"
                  style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 68, paddingRight: searchMsg ? 140 : 14, paddingTop: 10, paddingBottom: 10,
                    background: "rgba(255,255,255,.04)", borderRadius: 10, color: "#fff", fontSize: 13, fontFamily: ff, outline: "none",
                    border: `1.5px solid ${searchMsg ? (searchMsg.ok ? "rgba(52,211,153,.5)" : "rgba(248,113,113,.5)") : "rgba(99,102,241,.2)"}`,
                    transition: "border-color .15s" }} />
                {searchMsg && (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: searchMsg.ok ? "#34d399" : "#f87171", whiteSpace: "nowrap", background: searchMsg.ok ? "rgba(52,211,153,.1)" : "rgba(248,113,113,.1)", padding: "2px 8px", borderRadius: 5 }}>
                    {searchMsg.text}
                  </span>
                )}
              </div>
              {/* Camera scan button */}
              <button onClick={startScanner} title="Scan barcode with camera"
                style={{ width: 42, height: 42, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s",
                  background: scannerStatus === "scanning" ? "rgba(52,211,153,.15)" : "rgba(255,255,255,.05)",
                  border: `1px solid ${scannerStatus === "scanning" ? "rgba(52,211,153,.4)" : "rgba(255,255,255,.1)"}`,
                  color: scannerStatus === "scanning" ? "#34d399" : "rgba(255,255,255,.4)" }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M2 8V6a2 2 0 0 1 2-2h2M2 16v2a2 2 0 0 0 2 2h2M22 8V6a2 2 0 0 0-2-2h-2M22 16v2a2 2 0 0 1-2 2h-2"/>
                  <rect x="7" y="9" width="10" height="6" rx="1"/>
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileCapture} style={{ display: "none" }} />
              <button onClick={() => { const q = search.trim(); if (!q) return; const nq = q.toLowerCase(); const match = products.find(p => p.sku?.toLowerCase() === nq || p.barcode?.toLowerCase() === nq) || (filtered.length === 1 ? filtered[0] : null); if (match) { addToCart(match); setSearch(""); setSearchMsg({ text: `✓ ${match.name} added`, ok: true }); setTimeout(() => setSearchMsg(null), 2000); } }}
                style={{ padding: "0 18px", height: 42, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: ff, flexShrink: 0, boxShadow: "0 2px 10px rgba(99,102,241,.25)" }}>
                Search
              </button>
            </div>

            {/* Row 2: Quick F-keys + flash message */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 9, flexWrap: "nowrap", overflowX: "auto" }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,.25)", fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", flexShrink: 0, marginRight: 2 }}>Quick</span>
              {([
                ["F2", "Search",      () => { searchRef.current?.focus(); showFKeyMsg("F2", "✓ Search focused", "green"); }],
                ["F3", "Hold Sale",   () => holdCart()],
                ["F4", "Price Check", () => { setShowPriceCheck(true); setPriceCheckQ(""); setTimeout(() => priceCheckRef.current?.focus(), 80); showFKeyMsg("F4", "✓ Price Check open", "green"); }],
                ["F5", "Discount",    () => { discountRef.current?.focus(); discountRef.current?.select(); showFKeyMsg("F5", "✓ Discount field active", "green"); }],
                ["F6", "Note",        () => { noteRef.current?.focus(); showFKeyMsg("F6", "✓ Note field active", "green"); }],
              ] as [string, string, () => void][]).map(([key, label, action]) => {
                const isActive = flashKey === key;
                const isGreen  = isActive && fKeyMsg?.endsWith("green");
                const isAmber  = isActive && !fKeyMsg?.endsWith("green");
                return (
                  <button key={key} className="qfkey" onClick={action}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6, cursor: "pointer", fontFamily: ff, transition: "all .12s", flexShrink: 0,
                      background: isGreen ? "rgba(52,211,153,.1)" : isAmber ? "rgba(245,158,11,.1)" : "rgba(255,255,255,.04)",
                      border: `1px solid ${isGreen ? "rgba(52,211,153,.3)" : isAmber ? "rgba(245,158,11,.3)" : "rgba(255,255,255,.09)"}` }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 4px", borderRadius: 3,
                      color: isGreen ? "#34d399" : isAmber ? "#fbbf24" : "#818cf8",
                      background: isGreen ? "rgba(52,211,153,.15)" : isAmber ? "rgba(245,158,11,.15)" : "rgba(99,102,241,.15)" }}>{key}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isGreen ? "#34d399" : isAmber ? "#fbbf24" : "rgba(255,255,255,.45)" }}>{label}</span>
                  </button>
                );
              })}
              {/* Flash message */}
              {fKeyMsg && (() => {
                const isGreen = fKeyMsg.endsWith("__green");
                const text = fKeyMsg.replace(/__amber$|__green$/, "");
                return (
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 5, flexShrink: 0, marginLeft: 4,
                    color: isGreen ? "#34d399" : "#fbbf24",
                    background: isGreen ? "rgba(52,211,153,.09)" : "rgba(245,158,11,.09)",
                    border: `1px solid ${isGreen ? "rgba(52,211,153,.22)" : "rgba(245,158,11,.22)"}` }}>
                    {text}
                  </span>
                );
              })()}
            </div>

            {/* Row 3: Category pills */}
            <div className="pos-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {categories.map(c => (
                <button key={c} className={cat !== c ? "cat-pill" : ""} onClick={() => setCat(c)}
                  style={{ padding: "5px 14px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: ff, transition: "all .12s",
                    background: cat === c ? "#6366f1" : "rgba(255,255,255,.05)",
                    border: cat === c ? "1.5px solid #6366f1" : "1.5px solid rgba(255,255,255,.09)",
                    color: cat === c ? "#fff" : "rgba(255,255,255,.45)",
                    boxShadow: cat === c ? "0 2px 10px rgba(99,102,241,.25)" : "none" }}>
                  {c}
                  {cat === c && filtered.length > 0 && <span style={{ marginLeft: 5, background: "rgba(255,255,255,.2)", borderRadius: 10, padding: "1px 5px", fontSize: 9 }}>{filtered.length}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* ── Product Grid ── */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
            {loadingProducts && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 12, color: "rgba(255,255,255,.25)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 13 }}>Loading products…</span>
              </div>
            )}
            {!loadingProducts && products.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "rgba(255,255,255,.25)" }}>
                <div style={{ fontSize: 40, opacity: 0.4 }}>📦</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No products yet</div>
                <a href="/dashboard/retail/catalog" style={{ fontSize: 12, color: "#6366f1", fontWeight: 700, textDecoration: "none" }}>Add products →</a>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 }}>
              {paginated.map(p => {
                const stockQty   = p.itemNewId ? (stockMap[p.itemNewId] ?? 0) : (p.catalogStock !== null ? p.catalogStock : null);
                const outOfStock = stockQty !== null && stockQty <= 0;
                const lowStock   = stockQty !== null && stockQty > 0 && stockQty <= 5;
                return (
                  <div key={p.id} className="prod-card" onClick={() => !outOfStock && addToCart(p)}
                    style={{ background: "#111c30", border: `1.5px solid ${outOfStock ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.07)"}`, borderRadius: 12, padding: "12px 12px 10px", userSelect: "none", opacity: outOfStock ? 0.48 : 1, cursor: outOfStock ? "not-allowed" : "pointer", position: "relative", boxSizing: "border-box" as const }}>
                    {/* Stock badge */}
                    {outOfStock && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(239,68,68,.2)", color: "#f87171", fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4, zIndex: 1, letterSpacing: ".04em" }}>OUT</div>}
                    {lowStock   && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(245,158,11,.15)", color: "#f59e0b", fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4, zIndex: 1, letterSpacing: ".04em" }}>LOW</div>}
                    {/* Image or placeholder */}
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: 72, objectFit: "cover", borderRadius: 8, marginBottom: 8, display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: 60, borderRadius: 8, background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, fontSize: 20, color: "rgba(99,102,241,.4)" }}>
                        📦
                      </div>
                    )}
                    {/* Category */}
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,.28)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4, fontWeight: 600 }}>{p.category}</div>
                    {/* Name */}
                    <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35, marginBottom: 3, color: "#dde6f5", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{p.name}</div>
                    {/* SKU */}
                    {p.sku && <div style={{ fontSize: 9, color: "rgba(255,255,255,.2)", marginBottom: 6, fontFamily: "'Courier New',monospace" }}>{p.sku}</div>}
                    {/* Price + add button row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: "#818cf8", letterSpacing: "-.01em" }}>Rs. {p.price.toLocaleString()}</span>
                      {!outOfStock && (
                        <button className="add-btn" onClick={e => { e.stopPropagation(); addToCart(p); }}
                          style={{ width: 26, height: 26, borderRadius: 7, background: "#6366f1", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, transition: "background .12s" }}>+</button>
                      )}
                    </div>
                    {/* Stock count */}
                    {stockQty !== null && (
                      <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color: outOfStock ? "#f87171" : lowStock ? "#f59e0b" : "#34d399" }}>
                        {outOfStock ? "Out of stock" : `Stock: ${stockQty}`}
                      </div>
                    )}
                  </div>
                );
              })}
              {!loadingProducts && filtered.length === 0 && products.length > 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "rgba(255,255,255,.22)", fontSize: 12 }}>
                  No products match &quot;{search || cat}&quot;
                </div>
              )}
            </div>
          </div>

          <PaginationBar />
        </div>

        {/* ════ RIGHT PANEL: Cart ════ */}
        <div style={{ width: 440, background: "#0c1322", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid rgba(255,255,255,.06)" }}>

          {/* ── Cart Header ── */}
          <div style={{ padding: "10px 14px 9px", borderBottom: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>
            {/* Row 1: title + actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2.2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Cart</span>
                <span style={{ background: cart.length > 0 ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.07)", border: `1px solid ${cart.length > 0 ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.1)"}`, color: cart.length > 0 ? "#a5b4fc" : "rgba(255,255,255,.3)", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "1px 8px", minWidth: 20, textAlign: "center" }}>{cart.length}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {receipt && (
                  <button onClick={printReceipt} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.1)", color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff, display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Receipt
                  </button>
                )}
                <button onClick={clearCart} style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid rgba(239,68,68,.22)", background: "rgba(239,68,68,.07)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Clear</button>
                <button onClick={() => setShowHeld(v => !v)} style={{ position: "relative", padding: "5px 11px", borderRadius: 7, border: `1px solid ${showHeld ? "rgba(99,102,241,.45)" : "rgba(99,102,241,.25)"}`, background: showHeld ? "rgba(99,102,241,.2)" : "rgba(99,102,241,.08)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>
                  Hold
                  {heldSales.length > 0 && <span style={{ position: "absolute", top: -6, right: -6, background: "#f59e0b", color: "#000", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{heldSales.length}</span>}
                </button>
              </div>
            </div>

            {/* Row 2: Loyalty customer search / display */}
            <div style={{ position: "relative" }}>
              {loyaltyCustomer ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(245,158,11,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🎁</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fbbf24", lineHeight: 1.2 }}>{loyaltyCustomer.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.38)", marginTop: 1 }}>
                      <span style={{ fontFamily: "'Courier New',monospace" }}>{loyaltyCustomer.cardNo}</span>
                      {" · "}<span style={{ color: "#f59e0b", fontWeight: 700 }}>{loyaltyCustomer.points} pts</span>
                      {pointsToEarn > 0 && <span style={{ color: "#34d399", marginLeft: 5 }}>+{pointsToEarn} pts</span>}
                    </div>
                  </div>
                  {loyaltyCustomer.points >= loyaltyConfig.minRedeemPoints && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>Redeem:</span>
                      <input type="number" min={0} max={loyaltyCustomer.points} value={redeemPts || ""}
                        onChange={e => { const v = Math.max(0, Math.min(loyaltyCustomer.points, parseInt(e.target.value) || 0)); setRedeemPts(v); }}
                        placeholder="0"
                        style={{ width: 48, textAlign: "center", background: "rgba(255,255,255,.07)", border: "1px solid rgba(245,158,11,.35)", borderRadius: 5, padding: "2px 5px", color: "#fff", fontSize: 11, fontFamily: ff, outline: "none" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.22)" }}>pts</span>
                      {safeRedeemPts > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>−Rs.{loyaltyDiscount}</span>}
                    </div>
                  )}
                  <button onClick={() => { setLoyaltyCustomer(null); setLoyaltyQ(""); setRedeemPts(0); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,.28)", fontSize: 15, cursor: "pointer", padding: 0, flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              ) : (
                <div>
                  <input value={loyaltyQ}
                    onChange={e => { setLoyaltyQ(e.target.value); setShowLoyaltySearch(true); }}
                    onFocus={() => setShowLoyaltySearch(true)}
                    onBlur={() => setTimeout(() => setShowLoyaltySearch(false), 200)}
                    placeholder="🎁 Loyalty customer — name, phone, or card no…"
                    style={{ width: "100%", boxSizing: "border-box" as const, background: "rgba(245,158,11,.04)", border: "1px solid rgba(245,158,11,.18)", borderRadius: 8, padding: "7px 12px", color: "rgba(255,255,255,.6)", fontSize: 11, fontFamily: ff, outline: "none" }} />
                  {showLoyaltySearch && lcResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#141e33", border: "1px solid rgba(245,158,11,.28)", borderRadius: 9, zIndex: 60, marginTop: 4, overflow: "hidden", boxShadow: "0 14px 36px rgba(0,0,0,.7)" }}>
                      {lcResults.map(r => (
                        <div key={r.id} onMouseDown={() => { setLoyaltyCustomer({ id: r.id, name: r.title, cardNo: String(r.data?.cardNo || ""), phone: String(r.data?.phone || ""), points: r.amount || 0, totalSpent: Number(r.data?.totalSpent) || 0 }); setLoyaltyQ(""); setShowLoyaltySearch(false); setRedeemPts(0); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(245,158,11,.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#f59e0b", fontWeight: 800, flexShrink: 0 }}>{r.title.charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{r.title}</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,.38)" }}>{String(r.data?.cardNo || "")} · {String(r.data?.phone || "")}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b" }}>{r.amount || 0}</div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,.28)" }}>pts</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showLoyaltySearch && loyaltyQ.length >= 2 && lcResults.length === 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#141e33", border: "1px solid rgba(255,255,255,.09)", borderRadius: 9, zIndex: 60, marginTop: 4, padding: "12px 14px", textAlign: "center", color: "rgba(255,255,255,.32)", fontSize: 12 }}>
                      No customers found ·{" "}
                      <a href="/dashboard/retail/loyalty" style={{ color: "#f59e0b", textDecoration: "none", fontWeight: 700 }}>Register →</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Column Headers ── */}
          {cart.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "22px 1fr 68px 88px 58px 68px 18px", gap: 4, padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(255,255,255,.018)", flexShrink: 0 }}>
              {(["#", "Item", "Price", "Qty", "Disc", "Total", ""] as string[]).map((h, i) => (
                <div key={i} style={{ fontSize: 8, color: "rgba(255,255,255,.28)", letterSpacing: ".07em", textTransform: "uppercase", fontWeight: 700, textAlign: i >= 2 && i <= 5 ? "right" : "left" }}>{h}</div>
              ))}
            </div>
          )}

          {/* ── Cart Items ── */}
          <div className="pos-scroll" style={{ flex: 1, overflowY: "auto", padding: cart.length === 0 ? 0 : "4px 10px" }}>
            {cart.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "rgba(255,255,255,.16)", gap: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🛒</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Cart is empty</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.2)" }}>Tap a product or press F2 to search</div>
              </div>
            ) : cart.map((item, idx) => {
              const lineTotal = item.price * item.qty - (item.itemDiscount || 0) * item.qty;
              return (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "22px 1fr 68px 88px 58px 68px 18px", gap: 4, alignItems: "center", padding: "7px 4px", marginBottom: 2, borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.22)", textAlign: "center" }}>{idx + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#dde6f5" }}>{item.name}</div>
                    {item.sku && <div style={{ fontSize: 9, color: "rgba(255,255,255,.24)", marginTop: 1, fontFamily: "'Courier New',monospace" }}>{item.sku}</div>}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.45)", textAlign: "right" }}>Rs.{item.price.toLocaleString()}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}
                      style={{ width: 20, height: 20, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.6)", fontSize: 13, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff, flexShrink: 0 }}>−</button>
                    <input type="number" min={1} value={item.qty === 0 ? "" : item.qty}
                      onChange={e => setQty(item.id, e.target.value)}
                      onBlur={e => commitQty(item.id, e.target.value)}
                      onFocus={e => e.target.select()}
                      style={{ width: 28, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 4, padding: "1px 0", outline: "none", fontFamily: ff }} />
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}
                      style={{ width: 20, height: 20, background: "#6366f1", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff, flexShrink: 0 }}>+</button>
                  </div>
                  <div>
                    <input type="number" min={0} value={item.itemDiscount || ""}
                      onChange={e => setItemDisc(item.id, e.target.value)}
                      placeholder="0"
                      style={{ width: "100%", textAlign: "right", fontSize: 10, color: item.itemDiscount ? "#fbbf24" : "rgba(255,255,255,.25)", background: "transparent", border: `1px solid ${item.itemDiscount ? "rgba(245,158,11,.28)" : "rgba(255,255,255,.07)"}`, borderRadius: 4, padding: "3px 4px", outline: "none", fontFamily: ff, boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textAlign: "right" }}>Rs.{lineTotal.toLocaleString()}</div>
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.18)", fontSize: 13, cursor: "pointer", padding: 0, textAlign: "center", lineHeight: 1 }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* ── Item Note ── */}
          {cart.length > 0 && (
            <div style={{ padding: "6px 14px", borderBottom: "1px dashed rgba(255,255,255,.06)", flexShrink: 0 }}>
              <input ref={noteRef} value={itemNote} onChange={e => setItemNote(e.target.value)} placeholder="✏ Add order note…"
                style={{ width: "100%", boxSizing: "border-box" as const, background: "transparent", border: "none", borderBottom: "1px dashed rgba(255,255,255,.1)", color: "rgba(255,255,255,.38)", fontSize: 11, fontFamily: ff, outline: "none", padding: "4px 2px" }} />
            </div>
          )}

          {/* ── Summary + Payment ── */}
          <div style={{ padding: "10px 14px 12px", borderTop: "1px solid rgba(255,255,255,.07)", flexShrink: 0 }}>

            {/* Compact summary rows */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,.38)", marginBottom: 4 }}>
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>

              {/* Promo code + discount in one row */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                <input value={discountCode} onChange={e => setDiscountCode(e.target.value)} onKeyDown={e => e.key === "Enter" && applyDiscountCode()}
                  placeholder="Promo code…"
                  style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 10, fontFamily: ff, outline: "none" }} />
                <button onClick={applyDiscountCode}
                  style={{ background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.25)", borderRadius: 6, padding: "4px 8px", color: "#a5b4fc", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff, whiteSpace: "nowrap" }}>Apply</button>
                <input ref={discountRef} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="Disc" type="number" min="0"
                  style={{ width: 48, textAlign: "right", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 6, padding: "4px 6px", color: "#fff", fontSize: 10, fontFamily: ff, outline: "none" }} />
              </div>
              {discountCodeMsg && (
                <div style={{ fontSize: 10, marginBottom: 4, color: discountCodeMsg.ok ? "#34d399" : "#f87171" }}>{discountCodeMsg.text}</div>
              )}

              {/* Disc + Tax values */}
              {(discAmt > 0 || taxAmt > 0 || Math.abs(rounding) > 0.001) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {discAmt > 0 && <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>−Rs. {discAmt.toLocaleString()} disc</span>}
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <input value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="0" type="number" min="0" max="100"
                        style={{ width: 30, textAlign: "center", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 4, padding: "2px 4px", color: "#fbbf24", fontSize: 10, fontFamily: ff, outline: "none" }} />
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.28)" }}>% tax</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {taxAmt > 0 && <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600 }}>+Rs. {taxAmt.toLocaleString()}</span>}
                    {Math.abs(rounding) > 0.001 && <span style={{ fontSize: 10, color: "rgba(255,255,255,.28)", marginLeft: 6 }}>rnd {rounding.toFixed(2)}</span>}
                  </div>
                </div>
              )}

              {/* Loyalty discount */}
              {loyaltyDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#34d399", fontWeight: 700, marginBottom: 5, padding: "4px 8px", background: "rgba(52,211,153,.06)", borderRadius: 6, border: "1px solid rgba(52,211,153,.13)" }}>
                  <span>🎁 Loyalty ({safeRedeemPts} pts)</span>
                  <span>−Rs. {loyaltyDiscount.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Grand Total — prominent box */}
            <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,.14),rgba(79,70,229,.06))", border: `1.5px solid ${cart.length > 0 ? "rgba(99,102,241,.32)" : "rgba(255,255,255,.08)"}`, borderRadius: 13, padding: "11px 14px", marginBottom: 9, transition: "border-color .15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,.32)", letterSpacing: ".09em", textTransform: "uppercase", marginBottom: 3 }}>Grand Total</div>
                  <div style={{ fontSize: 27, fontWeight: 900, color: cart.length > 0 ? "#818cf8" : "rgba(255,255,255,.18)", letterSpacing: "-.025em", lineHeight: 1 }}>
                    Rs.&nbsp;{finalTotal.toLocaleString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.28)", marginBottom: 2 }}>{cart.length} item{cart.length !== 1 ? "s" : ""}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,.2)" }}>{totalQty} qty</div>
                </div>
              </div>
            </div>

            {/* Payment method 2×2 */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                {PAY_METHODS.map(m => (
                  <button key={m.id} className="pay-opt" onClick={() => { setPayMethod(m.id as typeof payMethod); setTendered(""); setTxRef(""); }}
                    style={{ padding: "7px 8px", borderRadius: 8, border: `1.5px solid ${payMethod === m.id ? m.color : "rgba(255,255,255,.07)"}`,
                      background: payMethod === m.id ? `${m.color}20` : "rgba(255,255,255,.03)",
                      color: payMethod === m.id ? m.color : "rgba(255,255,255,.28)",
                      fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .12s", textAlign: "center",
                      boxShadow: payMethod === m.id ? `0 2px 12px ${m.color}22` : "none" }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount received */}
            <div style={{ marginBottom: 8 }}>
              <input ref={tenderedRef} value={tendered} onChange={e => setTendered(e.target.value)}
                placeholder="Amount received…" type="number" min="0"
                style={{ width: "100%", textAlign: "left", background: "rgba(255,255,255,.06)", border: `2px solid ${tenderedAmt >= finalTotal && finalTotal > 0 ? "rgba(52,211,153,.55)" : "rgba(255,255,255,.1)"}`, borderRadius: 10, padding: "9px 14px", color: "#fff", fontSize: 17, fontFamily: ff, outline: "none", fontWeight: 700, boxSizing: "border-box" as const, transition: "border-color .15s" }} />
              {tenderedAmt >= finalTotal && finalTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#34d399", fontWeight: 700, padding: "6px 12px", background: "rgba(52,211,153,.07)", borderRadius: 7, border: "1px solid rgba(52,211,153,.16)", marginTop: 5 }}>
                  <span>Change Due</span>
                  <span>Rs. {change.toLocaleString()}</span>
                </div>
              )}
              {payMethod === "cash" && (
                <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
                  {QUICK_AMTS.map(amt => (
                    <button key={amt} className="quick-amt" onClick={() => setTendered(String(amt))}
                      style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: `1px solid ${Number(tendered) === amt ? "rgba(16,185,129,.4)" : "rgba(255,255,255,.09)"}`, background: Number(tendered) === amt ? "rgba(16,185,129,.12)" : "rgba(255,255,255,.04)", color: Number(tendered) === amt ? "#34d399" : "rgba(255,255,255,.38)", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff, transition: "all .1s" }}>
                      {amt >= 1000 ? `${amt / 1000}K` : amt}
                    </button>
                  ))}
                  <button className="quick-amt" onClick={() => setTendered(String(finalTotal))}
                    style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid rgba(52,211,153,.22)", background: "rgba(52,211,153,.06)", color: "#34d399", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: ff }}>Exact</button>
                </div>
              )}
              {payMethod !== "cash" && (
                <input value={txRef} onChange={e => setTxRef(e.target.value)}
                  placeholder={payMethod === "card" ? "Card last 4 digits or ref…" : payMethod === "cheque" ? "Cheque number…" : "Transaction / reference no…"}
                  style={{ width: "100%", marginTop: 6, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "7px 12px", color: "rgba(255,255,255,.6)", fontSize: 11, fontFamily: ff, outline: "none", boxSizing: "border-box" as const }} />
              )}
            </div>

            {/* Checkout error */}
            {checkoutError && (
              <div style={{ padding: "6px 10px", borderRadius: 7, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.18)", color: "#fca5a5", fontSize: 11, marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ flexShrink: 0 }}>⚠</span>{checkoutError}
              </div>
            )}

            {/* COMPLETE SALE button — primary checkout action */}
            <button className="checkout-btn" onClick={checkout} disabled={cart.length === 0 || processingCheckout}
              style={{ width: "100%", height: 50, borderRadius: 13, border: "none",
                background: cart.length > 0
                  ? processingCheckout
                    ? "rgba(16,185,129,.5)"
                    : "linear-gradient(135deg,#10b981,#059669)"
                  : "rgba(255,255,255,.06)",
                color: cart.length > 0 ? "#fff" : "rgba(255,255,255,.18)",
                fontSize: 14, fontWeight: 800, cursor: cart.length > 0 ? "pointer" : "not-allowed",
                fontFamily: ff, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                boxShadow: cart.length > 0 && !processingCheckout ? "0 4px 22px rgba(16,185,129,.3), inset 0 1px 0 rgba(255,255,255,.12)" : "none",
                letterSpacing: "-.01em", transition: "all .12s" }}>
              {processingCheckout ? (
                <>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                  Processing…
                </>
              ) : cart.length === 0 ? (
                <span style={{ fontSize: 13 }}>Add items to checkout</span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Complete Sale
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.55)", background: "rgba(255,255,255,.12)", padding: "2px 6px", borderRadius: 4, letterSpacing: ".04em" }}>F10</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          BOTTOM SHORTCUT BAR
      ════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", background: "#070c18", borderTop: "1px solid rgba(255,255,255,.06)", flexShrink: 0, height: 42 }}>
        {/* Shortcut keys */}
        {([
          ["F2", "Search",   () => { searchRef.current?.focus(); showFKeyMsg("F2", "✓ Search focused", "green"); }],
          ["F3", "Hold",     () => holdCart()],
          ["F4", "Price",    () => { setShowPriceCheck(true); setPriceCheckQ(""); setTimeout(() => priceCheckRef.current?.focus(), 80); }],
          ["F5", "Discount", () => { discountRef.current?.focus(); discountRef.current?.select(); }],
          ["F6", "Note",     () => noteRef.current?.focus()],
        ] as [string, string, () => void][]).map(([key, label, action]) => (
          <button key={key} onClick={action}
            style={{ height: "100%", padding: "0 13px", display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.32)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff, flexShrink: 0, transition: "color .1s" }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: "#6366f1", background: "rgba(99,102,241,.14)", padding: "1px 4px", borderRadius: 3 }}>{key}</span>
            {label}
          </button>
        ))}

        {/* F7 Hold with badge */}
        <button onClick={holdCart}
          style={{ height: "100%", padding: "0 13px", display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.32)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff, flexShrink: 0, position: "relative" }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: "#6366f1", background: "rgba(99,102,241,.14)", padding: "1px 4px", borderRadius: 3 }}>F7</span>
          Hold
          {heldSales.length > 0 && <span style={{ background: "#f59e0b", color: "#000", borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{heldSales.length}</span>}
        </button>

        {/* F8 last receipt */}
        <button onClick={() => { if (receipt) printReceipt(); else showFKeyMsg("F8", "No receipt yet — complete a sale first", "amber"); }}
          style={{ height: "100%", padding: "0 13px", display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,.05)", color: flashKey === "F8" ? "#fbbf24" : "rgba(255,255,255,.32)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff, flexShrink: 0 }}>
          <span style={{ fontSize: 8, fontWeight: 800, color: flashKey === "F8" ? "#fbbf24" : "#6366f1", background: flashKey === "F8" ? "rgba(245,158,11,.14)" : "rgba(99,102,241,.14)", padding: "1px 4px", borderRadius: 3 }}>F8</span>
          Receipt
        </button>

        {/* Center: session indicator */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          {activeSession ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.16)", borderRadius: 20, padding: "3px 11px" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#34d399" }}>{activeSession.title || "Session Active"}</span>
            </div>
          ) : (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.18)", fontWeight: 600 }}>No active session</span>
          )}
          {cart.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,.28)" }}>{cart.length} items · {totalQty} qty</span>
              <span style={{ width: 1, height: 12, background: "rgba(255,255,255,.1)" }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#818cf8" }}>Rs. {finalTotal.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Right actions */}
        <button onClick={startScanner}
          style={{ height: "100%", padding: "0 13px", display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", borderLeft: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.32)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: ff, flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8V6a2 2 0 0 1 2-2h2M2 16v2a2 2 0 0 0 2 2h2M22 8V6a2 2 0 0 0-2-2h-2M22 16v2a2 2 0 0 1-2 2h-2"/><rect x="7" y="9" width="10" height="6" rx="1"/></svg>
          Scan
        </button>
        <a href="/dashboard/retail/sales-history"
          style={{ height: "100%", padding: "0 13px", display: "flex", alignItems: "center", gap: 5, background: "transparent", borderLeft: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.32)", fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}>
          History
        </a>
        <a href="/dashboard/retail/pos-sessions"
          style={{ height: "100%", padding: "0 14px", display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.025)", borderLeft: "1px solid rgba(255,255,255,.05)", color: "rgba(255,255,255,.38)", fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          Session
        </a>
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
                  onKeyDown={e => { if (e.key === "Escape") setShowPriceCheck(false); if (e.key === "Enter") { const q = priceCheckQ.toLowerCase(); const res = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode || "").toLowerCase().includes(q)); if (res.length === 1) { addToCart(res[0]); setShowPriceCheck(false); showFKeyMsg("F4", `✓ ${res[0].name} added to cart`, "green"); } } }}
                  placeholder="Type product name, SKU, or barcode..."
                  style={{ width: "100%", boxSizing: "border-box" as const, paddingLeft: 38, paddingRight: 12, paddingTop: 11, paddingBottom: 11, background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(99,102,241,.3)", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: ff, outline: "none" }} />
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {priceCheckQ.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,.25)", fontSize: 13 }}>Start typing to search products</div>
                ) : (() => {
                  const res = products.filter(p =>
                    p.name.toLowerCase().includes(priceCheckQ.toLowerCase()) ||
                    p.sku.toLowerCase().includes(priceCheckQ.toLowerCase()) ||
                    (p.barcode || "").toLowerCase().includes(priceCheckQ.toLowerCase())
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

      {/* ── Camera Scanner Modal ── */}
      {showScanner && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {/* Header */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Camera Scanner</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>Point at barcode to add product instantly</div>
            </div>
            <button onClick={stopScanner}
              style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>

          {/* Video */}
          <div style={{ position: "relative", width: "min(94vw,480px)", borderRadius: 16, overflow: "hidden", border: "2px solid rgba(99,102,241,.4)", boxShadow: "0 0 40px rgba(99,102,241,.2)" }}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{ width: "100%", display: "block", background: "#000", aspectRatio: "4/3", objectFit: "cover" }} />
            {/* Scan overlay */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ width: 220, height: 100, border: "2px solid rgba(99,102,241,.8)", borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,.35)" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: 20, borderTop: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "4px 0 0 0" }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: 20, height: 20, borderTop: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 4px 0 0" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: 20, height: 20, borderBottom: "3px solid #6366f1", borderLeft: "3px solid #6366f1", borderRadius: "0 0 0 4px" }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderBottom: "3px solid #6366f1", borderRight: "3px solid #6366f1", borderRadius: "0 0 4px 0" }} />
              </div>
            </div>
          </div>

          {/* Status / Error */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            {scannerError ? (
              <div style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", borderRadius: 8, padding: "8px 18px", maxWidth: 340 }}>
                {scannerError}
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ""; fileInputRef.current?.click(); }}
                    style={{ padding: "7px 18px", borderRadius: 8, background: "#6366f1", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    📷 Upload Photo Instead
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: scannerStatus === "scanning" ? "#34d399" : "rgba(255,255,255,.45)" }}>
                {scannerStatus === "starting" && "Starting camera…"}
                {scannerStatus === "scanning" && "🟢 Scanning — hold barcode steady"}
              </div>
            )}
            {!scannerError && (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => { if (fileInputRef.current) fileInputRef.current.value = ""; fileInputRef.current?.click(); }}
                  style={{ padding: "7px 18px", borderRadius: 8, background: "#6366f1", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  📷 Upload Photo Instead
                </button>
              </div>
            )}
            {lastScanned && (
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,.35)" }}>Last: {lastScanned}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
