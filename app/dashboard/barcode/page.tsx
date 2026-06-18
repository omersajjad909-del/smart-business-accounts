"use client";

import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useCurrency } from "@/lib/useCurrency";

type Item = {
  id: string; name: string; code?: string; barcode?: string;
  unit?: string; category?: string; rate?: number; purchaseRate?: number;
  taxRate?: number; minStock?: number; description?: string;
  salePrice?: number; stockQty?: number; _source?: string;
};

// ─── Pure Code128B barcode generator — no library, pure SVG ──────────────────
const C128: string[] = [
  "11011001100","11001101100","11001100110","10010011000","10010001100",
  "10001001100","10011001000","10011000100","10001100100","11001001000",
  "11001000100","11000100100","10110011100","10011011100","10011001110",
  "10111001100","10011101100","10011100110","11001110010","11001011100",
  "11001001110","11011100100","11001110100","11101101110","11101001100",
  "11100101100","11100100110","11101100100","11100110100","11100110010",
  "11011011000","11011000110","11000110110","10100011000","10001011000",
  "10001000110","10110001000","10001101000","10001100010","11010001000",
  "11000101000","11000100010","10110111000","10110001110","10001101110",
  "10111011000","10111000110","10001110110","11101110110","11010001110",
  "11000101110","11011101000","11011100010","11011101110","11101011000",
  "11101000110","11100010110","11101101000","11101100010","11100011010",
  "11101111010","11001000010","11110001010","10100110000","10100001100",
  "10010110000","10010000110","10000101100","10000100110","10110010000",
  "10110000100","10011010000","10011000010","10000110100","10000110010",
  "11000010010","11001010000","11110111010","11000010100","10001111010",
  "10100111100","10010111100","10010011110","10111100100","10011110100",
  "10011110010","11110100100","11110010100","11110010010","11011011110",
  "11011110110","11110110110","10101111000","10100011110","10001011110",
  "10111101000","10111100010","11110101000","11110100010","10111011110",
  "10111101110","11101011110","11110101110",
  "11010000100","11010010000","11010011100",
];
const C128_STOP = "1100011101011";

function encodeCode128B(text: string): string {
  if (!text) return "";
  const vals: number[] = [];
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) continue;
    vals.push(c - 32);
  }
  if (vals.length === 0) return "";
  const checksum = (104 + vals.reduce((s, v, i) => s + v * (i + 1), 0)) % 103;
  const quiet = "0".repeat(11);
  return quiet + C128[104] + vals.map(v => C128[v]).join("") + C128[checksum] + C128_STOP + quiet;
}

interface BarcodeProps {
  value: string; label?: string; moduleWidth?: number; height?: number;
  showText?: boolean; bg?: string; fg?: string; style?: React.CSSProperties;
}
function Barcode128({ value, label, moduleWidth = 2, height = 60, showText = true, bg = "white", fg = "black", style }: BarcodeProps) {
  const bits = encodeCode128B(value);
  if (!bits) return null;
  const svgW = bits.length * moduleWidth;
  const svgH = height + (showText ? 20 : 4);
  return (
    <svg width={svgW} height={svgH} style={style} xmlns="http://www.w3.org/2000/svg">
      <rect width={svgW} height={svgH} fill={bg} />
      {bits.split("").map((bit, i) => bit === "1" ? <rect key={i} x={i * moduleWidth} y={2} width={moduleWidth} height={height} fill={fg} /> : null)}
      {showText && <text x={svgW / 2} y={height + 16} textAnchor="middle" fontSize={11} fontFamily="'Courier New',monospace" fill={fg} letterSpacing="1.5">{label ?? value}</text>}
    </svg>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "assign" | "price-update" | "bulk";
type UpdateLog = { name: string; barcode: string; oldPrice: number; newPrice: number; ts: string };

export default function BarcodePage() {
  const [tab, setTab] = useState<Tab>("assign");

  // ── Assign / Scan / Print tab ──────────────────────────────────────────────
  const [items, setItems]         = useState<Item[]>([]);
  const [filtered, setFiltered]   = useState<Item[]>([]);
  const [search, setSearch]       = useState("");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned]     = useState<Item | null>(null);
  const [scanErr, setScanErr]     = useState("");
  const [printItem, setPrintItem]         = useState<Item | null>(null);
  const [printQty, setPrintQty]           = useState(1);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignInput, setAssignInput] = useState<Record<string, string>>({});
  const scanRef = useRef<HTMLInputElement>(null);

  // ── Batch print state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPrintQty, setBatchPrintQty] = useState(1);
  const [batchActive, setBatchActive]     = useState(false);

  // ── Price Update tab ───────────────────────────────────────────────────────
  const [puScan, setPuScan]       = useState("");
  const [puItem, setPuItem]       = useState<Item | null>(null);
  const [puErr, setPuErr]         = useState("");
  const [puSalePrice, setPuSalePrice]   = useState("");
  const [puCostPrice, setPuCostPrice]   = useState("");
  const [puSaving, setPuSaving]         = useState(false);
  const [puLog, setPuLog]               = useState<UpdateLog[]>([]);
  const puScanRef = useRef<HTMLInputElement>(null);
  const puPriceRef = useRef<HTMLInputElement>(null);

  // ── Bulk price change tab ──────────────────────────────────────────────────
  const [bulkCategory, setBulkCategory] = useState("ALL");
  const [bulkType, setBulkType]         = useState<"percent" | "fixed">("percent");
  const [bulkValue, setBulkValue]       = useState("");
  const [bulkDirection, setBulkDirection] = useState<"increase" | "decrease">("increase");
  const [bulkPreview, setBulkPreview]   = useState<{id:string;name:string;old:number;newRate:number}[]>([]);
  const [bulkSaving, setBulkSaving]     = useState(false);

  const currency = useCurrency();

  const getHeaders = () => {
    const user = getCurrentUser();
    return {
      "x-user-id":    user?.id        || "",
      "x-user-role":  user?.role      || "ADMIN",
      "x-company-id": user?.companyId || "",
    } as Record<string, string>;
  };

  function loadItems() {
    fetch("/api/barcode", { credentials: "include", headers: getHeaders() })
      .then(r => r.json())
      .then(d => {
        const list: Item[] = (d.items || []).map((i: Item) => ({ ...i, salePrice: i.rate }));
        setItems(list);
        setFiltered(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => { loadItems(); }, []);

  // full item details for price update (includes unit, category etc.)
  function findItemByBarcode(val: string): Item | undefined {
    return items.find(i => i.barcode === val || i.code === val);
  }

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? items.filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.barcode?.toLowerCase().includes(q) ||
      i.code?.toLowerCase().includes(q)
    ) : items);
  }, [search, items]);

  // ── Assign tab handlers ────────────────────────────────────────────────────
  async function handleAssignBarcode(item: Item) {
    const barcode = (assignInput[item.id] || "").trim();
    setAssigning(item.id);
    try {
      const res = await fetch("/api/barcode", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ itemId: item.id, barcode: barcode || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, barcode: data.item.barcode } : i));
        setAssignInput(prev => ({ ...prev, [item.id]: "" }));
        toast.success("Barcode assigned ✓");
      } else toast.error(data.error || "Failed");
    } catch { toast.error("Error"); }
    finally { setAssigning(null); }
  }

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const val = scanInput.trim();
    if (!val) return;
    const found = findItemByBarcode(val);
    if (found) { setScanned(found); setScanErr(""); }
    else { setScanned(null); setScanErr(`"${val}" — no item found`); }
    setScanInput("");
    scanRef.current?.focus();
  }

  const [testScanItem, setTestScanItem] = useState<Item | null>(null);

  function openPrint(item: Item) { setPrintItem(item); setPrintQty(1); setShowPrintModal(true); }
  function executePrint() { setShowPrintModal(false); setTimeout(() => window.print(), 200); }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function selectAllWithBarcode() {
    const ids = filtered.filter(i => i.barcode).map(i => i.id);
    setSelectedIds(prev => prev.size === ids.length && ids.every(id => prev.has(id)) ? new Set() : new Set(ids));
  }
  function executeBatchPrint() {
    setShowBatchModal(false);
    setBatchActive(true);
    setTimeout(() => { window.print(); setBatchActive(false); }, 200);
  }

  // ── Price Update tab handlers ──────────────────────────────────────────────
  function handlePuScan(e: React.FormEvent) {
    e.preventDefault();
    const val = puScan.trim();
    if (!val) return;
    const found = findItemByBarcode(val);
    if (found) {
      setPuItem(found);
      setPuSalePrice(String(found.rate ?? found.salePrice ?? ""));
      setPuCostPrice(String(found.purchaseRate ?? ""));
      setPuErr("");
      setTimeout(() => puPriceRef.current?.focus(), 80);
    } else {
      setPuItem(null);
      setPuErr(`"${val}" — item not found`);
    }
    setPuScan("");
    if (!found) puScanRef.current?.focus();
  }

  async function savePuPrice(e: React.FormEvent) {
    e.preventDefault();
    if (!puItem) return;
    const newSale = Number(puSalePrice);
    const newCost = Number(puCostPrice) || puItem.purchaseRate || 0;
    if (!newSale || newSale <= 0) { toast.error("Valid sale price daalo"); return; }

    setPuSaving(true);
    try {
      const res = await fetch("/api/items-new", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({
          id:           puItem.id,
          name:         puItem.name,
          category:     puItem.category     || "TRADING",
          unit:         puItem.unit         || "PCS",
          rate:         newSale,
          purchaseRate: newCost,
          taxRate:      puItem.taxRate      || 0,
          minStock:     puItem.minStock     || 0,
          barcode:      puItem.barcode      || "",
          description:  puItem.description  || "",
        }),
      });
      if (res.ok) {
        const oldPrice = puItem.rate ?? puItem.salePrice ?? 0;
        // update local items list
        setItems(prev => prev.map(i => i.id === puItem.id ? { ...i, rate: newSale, salePrice: newSale, purchaseRate: newCost } : i));
        setPuLog(prev => [{
          name: puItem.name,
          barcode: puItem.barcode || puItem.code || "",
          oldPrice,
          newPrice: newSale,
          ts: new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
        }, ...prev].slice(0, 50));
        toast.success(`${puItem.name} — price updated ✓`);
        setPuItem(null);
        setPuSalePrice("");
        setPuCostPrice("");
        setTimeout(() => puScanRef.current?.focus(), 80);
      } else {
        const d = await res.json();
        toast.error(d.error || "Save failed");
      }
    } catch { toast.error("Error saving"); }
    finally { setPuSaving(false); }
  }

  // ── Bulk price change handlers ─────────────────────────────────────────────
  const categories = ["ALL", ...Array.from(new Set(items.map(i => i.category || "TRADING").filter(Boolean)))];

  function calcBulkPreview() {
    const v = Number(bulkValue);
    if (!v || v <= 0) { toast.error("Valid value daalo"); return; }
    const targetItems = bulkCategory === "ALL" ? items : items.filter(i => (i.category || "TRADING") === bulkCategory);
    const preview = targetItems
      .filter(i => (i.rate ?? 0) > 0)
      .map(i => {
        const old = i.rate ?? 0;
        let newRate = old;
        if (bulkType === "percent") {
          newRate = bulkDirection === "increase" ? old * (1 + v / 100) : old * (1 - v / 100);
        } else {
          newRate = bulkDirection === "increase" ? old + v : old - v;
        }
        newRate = Math.max(0, Math.round(newRate * 100) / 100);
        return { id: i.id, name: i.name, old, newRate };
      });
    setBulkPreview(preview);
  }

  async function applyBulkChange() {
    if (!bulkPreview.length) return;
    setBulkSaving(true);
    let done = 0;
    try {
      for (const p of bulkPreview) {
        const item = items.find(i => i.id === p.id);
        if (!item) continue;
        await fetch("/api/items-new", {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json", ...getHeaders() },
          body: JSON.stringify({
            id: item.id, name: item.name,
            category: item.category || "TRADING", unit: item.unit || "PCS",
            rate: p.newRate, purchaseRate: item.purchaseRate || 0,
            taxRate: item.taxRate || 0, minStock: item.minStock || 0,
            barcode: item.barcode || "", description: item.description || "",
          }),
        });
        done++;
      }
      // refresh local
      setItems(prev => prev.map(i => {
        const p = bulkPreview.find(b => b.id === i.id);
        return p ? { ...i, rate: p.newRate, salePrice: p.newRate } : i;
      }));
      toast.success(`${done} items updated ✓`);
      setBulkPreview([]);
      setBulkValue("");
    } catch { toast.error("Kuch galat hua"); }
    finally { setBulkSaving(false); }
  }

  const printLabels = printItem ? Array.from({ length: Math.max(1, Math.min(printQty, 100)) }) : [];
  const batchSelectedItems = filtered.filter(i => i.barcode && selectedIds.has(i.id));
  const batchPrintLabels: Item[] = batchActive
    ? batchSelectedItems.flatMap(item => Array.from({ length: Math.max(1, Math.min(batchPrintQty, 50)) }, () => item))
    : [];

  // ── UI ─────────────────────────────────────────────────────────────────────
  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700,
    cursor: "pointer", border: `1px solid ${active ? "rgba(99,102,241,.5)" : "var(--border)"}`,
    background: active ? "rgba(99,102,241,.15)" : "transparent",
    color: active ? "#818cf8" : "var(--text-muted)",
    fontFamily: "inherit",
  });

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Outfit','DM Sans',sans-serif" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            display: block !important;
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            background: white !important;
            z-index: 99999 !important;
          }
          body { background: white !important; }
          @page { margin: 8mm; size: auto; }
        }
        .print-area { display: none; }
      `}</style>

      {/* Single-item print area */}
      {printItem && !batchActive && (
        <div className="print-area">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 4 }}>
            {printLabels.map((_, idx) => (
              <div key={idx} style={{ border: "1px dashed #ccc", borderRadius: 6, padding: "10px 14px", textAlign: "center", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, pageBreakInside: "avoid" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#000", maxWidth: 180, textAlign: "center", lineHeight: 1.3 }}>{printItem.name}</div>
                <Barcode128 value={printItem.barcode!} moduleWidth={1.5} height={48} bg="white" fg="black" />
                {(printItem.rate ?? printItem.salePrice) != null && (
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#000" }}>{currency}{printItem.rate ?? printItem.salePrice}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch print area */}
      {batchActive && (
        <div className="print-area">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 4 }}>
            {batchPrintLabels.map((item, idx) => (
              <div key={idx} style={{ border: "1px dashed #ccc", borderRadius: 6, padding: "10px 14px", textAlign: "center", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, pageBreakInside: "avoid" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#000", maxWidth: 180, textAlign: "center", lineHeight: 1.3 }}>{item.name}</div>
                <Barcode128 value={item.barcode!} moduleWidth={1.5} height={48} bg="white" fg="black" />
                {(item.rate ?? item.salePrice) != null && (
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#000" }}>{currency}{item.rate ?? item.salePrice}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="no-print">
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px" }}>Barcode Management</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Assign barcodes, print labels, and update prices by scanning items one by one.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button style={TAB_STYLE(tab === "assign")}       onClick={() => setTab("assign")}>       📦 Assign & Print</button>
          <button style={TAB_STYLE(tab === "price-update")} onClick={() => setTab("price-update")}> 💰 Price Update Scanner</button>
          <button style={TAB_STYLE(tab === "bulk")}         onClick={() => setTab("bulk")}>         ⚡ Bulk Price Change</button>
        </div>

        {/* ══ TAB 1: Assign & Print ═══════════════════════════════════════════ */}
        {tab === "assign" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* Scanner */}
              <div style={{ borderRadius: 14, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)", padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>🔍 Scanner — scan or type a barcode to find an item</div>
                <form onSubmit={handleScan} style={{ display: "flex", gap: 8 }}>
                  <input ref={scanRef} value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder="Scan or type barcode…" autoFocus
                    style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid rgba(99,102,241,.3)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                  <button type="submit" style={{ padding: "10px 16px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Find</button>
                </form>
                {scanned && (
                  <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 10, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{scanned.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                      {scanned.code && `Code: ${scanned.code} · `}Barcode: {scanned.barcode || "—"}
                      {scanned.salePrice != null && ` · Price: ${currency}${scanned.salePrice}`}
                      {scanned.stockQty  != null && ` · Stock: ${scanned.stockQty} ${scanned.unit || ""}`}
                    </div>
                    {scanned.barcode && (
                      <>
                        <div style={{ marginTop: 10, padding: 8, background: "white", display: "inline-block", borderRadius: 6 }}>
                          <Barcode128 value={scanned.barcode} height={40} moduleWidth={1.5} />
                        </div>
                        <br />
                        <button onClick={() => openPrint(scanned)} style={{ marginTop: 8, padding: "6px 14px", borderRadius: 8, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🖨 Print Label</button>
                      </>
                    )}
                  </div>
                )}
                {scanErr && <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 9, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", fontSize: 12.5, color: "#f87171" }}>{scanErr}</div>}
              </div>

              {/* Stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Total Items",     val: items.length,                         color: "#818cf8" },
                  { label: "With Barcode",    val: items.filter(i => i.barcode).length,  color: "#34d399" },
                  { label: "Without Barcode", val: items.filter(i => !i.barcode).length, color: "#f87171" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ flex: 1, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid var(--border)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Items Table */}
            <div style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginRight: "auto" }}>All Items</span>

                {/* Batch print bar */}
                {selectedIds.size > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.3)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#818cf8" }}>{selectedIds.size} selected</span>
                    <button onClick={() => setShowBatchModal(true)} style={{ padding: "5px 12px", borderRadius: 7, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      🖨 Print Selected
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} style={{ padding: "5px 8px", borderRadius: 7, background: "transparent", border: "1px solid rgba(255,255,255,.15)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                )}

                <button onClick={selectAllWithBarcode}
                  style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {selectedIds.size > 0 && batchSelectedItems.length === selectedIds.size ? "✓ Deselect All" : "Select All with Barcode"}
                </button>

                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, barcode…"
                  style={{ width: 220, padding: "7px 12px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12.5, fontFamily: "inherit", outline: "none" }} />
              </div>
              {loading ? <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div> : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 10px 10px 16px", width: 32 }} />
                    {["Item","Code","Barcode Preview","Unit","Price","Action"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map(item => (
                      <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: selectedIds.has(item.id) ? "rgba(99,102,241,.05)" : "transparent" }}>
                        <td style={{ padding: "11px 10px 11px 16px" }}>
                          {item.barcode && (
                            <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)}
                              style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#6366f1" }} />
                          )}
                        </td>
                        <td style={{ padding: "11px 16px", color: "var(--text-primary)", fontWeight: 600 }}>{item.name}</td>
                        <td style={{ padding: "11px 16px", color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {item._source === "catalog" && item.code
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, background: "rgba(245,158,11,.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,.3)", borderRadius: 4, padding: "1px 5px", letterSpacing: ".04em", fontFamily: "inherit" }}>SKU</span>
                                {item.code}
                              </span>
                            : (item.code || "—")}
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          {item.barcode
                            ? <div style={{ display: "inline-block", background: "white", padding: "3px 5px", borderRadius: 4 }}><Barcode128 value={item.barcode} moduleWidth={1} height={28} showText={false} bg="white" fg="black" /></div>
                            : <span style={{ color: "rgba(255,255,255,.2)", fontSize: 11 }}>Not set</span>}
                        </td>
                        <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{item.unit || "—"}</td>
                        <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{item.rate != null ? `${currency}${item.rate}` : "—"}</td>
                        <td style={{ padding: "8px 16px" }}>
                          {item.barcode ? (
                            <div style={{ display: "flex", gap: 5 }}>
                              <button onClick={() => openPrint(item)} style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.25)", color: "#a5b4fc", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>🖨 Print</button>
                              <button onClick={() => setTestScanItem(item)} style={{ padding: "5px 10px", borderRadius: 7, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)", color: "#34d399", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>📱 Test</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 6 }}>
                              <input value={assignInput[item.id] || ""} onChange={e => setAssignInput(p => ({ ...p, [item.id]: e.target.value }))} placeholder="Type or leave blank"
                                style={{ width: 140, padding: "4px 8px", borderRadius: 6, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 11.5, fontFamily: "inherit", outline: "none" }} />
                              <button onClick={() => handleAssignBarcode(item)} disabled={assigning === item.id}
                                style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                                {assigning === item.id ? "…" : "Assign"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No items found</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ══ TAB 2: Price Update Scanner ══════════════════════════════════════ */}
        {tab === "price-update" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left — scanner + form */}
            <div>
              <div style={{ borderRadius: 14, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.25)", padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b", marginBottom: 6 }}>💰 Price Update Scanner</div>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 18px", lineHeight: 1.6 }}>
                  Scan a barcode → current price appears → enter new price → Save → scan next item. No need to search through lists.
                </p>

                {/* Step 1 — Scan */}
                {!puItem && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Step 1 — Scan Item</div>
                    <form onSubmit={handlePuScan} style={{ display: "flex", gap: 8 }}>
                      <input
                        ref={puScanRef}
                        value={puScan}
                        onChange={e => setPuScan(e.target.value)}
                        placeholder="Scan or type barcode…"
                        autoFocus
                        style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: "var(--app-bg)", border: "1.5px solid rgba(245,158,11,.4)", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", outline: "none" }}
                      />
                      <button type="submit" style={{ padding: "12px 18px", borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Scan</button>
                    </form>
                    {puErr && <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", color: "#f87171", fontSize: 12.5 }}>{puErr}</div>}
                  </>
                )}

                {/* Step 2 — Price entry */}
                {puItem && (
                  <>
                    <div style={{ padding: "14px 16px", borderRadius: 10, background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)", marginBottom: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{puItem.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        {puItem.barcode && `Barcode: ${puItem.barcode} · `}
                        Unit: {puItem.unit || "PCS"} · Category: {puItem.category || "—"}
                      </div>
                      <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Current Sale Price</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#f87171" }}>{currency}{puItem.rate ?? puItem.salePrice ?? "—"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Current Cost Price</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-muted)" }}>{currency}{puItem.purchaseRate ?? "—"}</div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={savePuPrice}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Step 2 — Enter New Price</div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>New Sale Price (Rs.) *</label>
                          <input
                            ref={puPriceRef}
                            type="number" min="0" step="0.01"
                            value={puSalePrice}
                            onChange={e => setPuSalePrice(e.target.value)}
                            placeholder="e.g. 90"
                            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--app-bg)", border: "1.5px solid rgba(245,158,11,.4)", color: "var(--text-primary)", fontSize: 16, fontWeight: 700, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>New Cost Price (Rs.)</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={puCostPrice}
                            onChange={e => setPuCostPrice(e.target.value)}
                            placeholder="Optional"
                            style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 16, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                      </div>

                      {puSalePrice && Number(puSalePrice) !== (puItem.rate ?? puItem.salePrice) && (
                        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", fontSize: 13 }}>
                          <span style={{ color: "#f87171" }}>{currency}{puItem.rate ?? puItem.salePrice}</span>
                          {" → "}
                          <span style={{ fontWeight: 800, color: "#34d399" }}>{currency}{puSalePrice}</span>
                          {" "}
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                            ({Number(puSalePrice) > (puItem.rate ?? 0) ? "▲" : "▼"} {Math.abs(Number(puSalePrice) - (puItem.rate ?? 0)).toFixed(0)} Rs.)
                          </span>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="submit" disabled={puSaving}
                          style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: puSaving ? "var(--border)" : "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", color: "#000", fontSize: 14, fontWeight: 800, cursor: puSaving ? "not-allowed" : "pointer" }}>
                          {puSaving ? "Saving…" : "✓ Save & Next Item"}
                        </button>
                        <button type="button" onClick={() => { setPuItem(null); setPuScan(""); setTimeout(() => puScanRef.current?.focus(), 80); }}
                          style={{ padding: "12px 18px", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>

              {/* Tip box */}
              <div style={{ borderRadius: 12, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.15)", padding: "14px 16px", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.8 }}>
                <strong style={{ color: "#818cf8" }}>Tip:</strong> Connect a USB barcode scanner — scan item, type new price, press Enter, scan next item. <br/>
                Update 100 items in under 10 minutes.
              </div>
            </div>

            {/* Right — session log */}
            <div style={{ borderRadius: 14, background: "rgba(255,255,255,.02)", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Session Log</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{puLog.length} updated today</span>
              </div>
              {puLog.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No updates yet.<br/>Scan an item to start recording changes.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Time","Item","Old","New","Change"].map(h => (
                        <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {puLog.map((l, i) => {
                      const diff = l.newPrice - l.oldPrice;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>{l.ts}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600 }}>{l.name}</td>
                          <td style={{ padding: "10px 14px", color: "#f87171" }}>{currency}{l.oldPrice}</td>
                          <td style={{ padding: "10px 14px", color: "#34d399", fontWeight: 700 }}>{currency}{l.newPrice}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: diff >= 0 ? "#818cf8" : "#f87171" }}>
                            {diff >= 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB 3: Bulk Price Change ══════════════════════════════════════════ */}
        {tab === "bulk" && (
          <div>
            <div style={{ borderRadius: 14, background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.2)", padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f87171", marginBottom: 6 }}>⚡ Bulk Price Change</div>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.6 }}>
                Update prices for an entire category or all items at once — by percentage or fixed amount.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>Category</label>
                  <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
                    {categories.map(c => <option key={c} value={c}>{c === "ALL" ? "All Categories" : c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>Change Type</label>
                  <select value={bulkType} onChange={e => setBulkType(e.target.value as "percent" | "fixed")}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
                    <option value="percent">% Percentage</option>
                    <option value="fixed">Rs. Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>Direction</label>
                  <select value={bulkDirection} onChange={e => setBulkDirection(e.target.value as "increase" | "decrease")}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, outline: "none" }}>
                    <option value="increase">▲ Increase</option>
                    <option value="decrease">▼ Decrease</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>
                    Value ({bulkType === "percent" ? "%" : "Rs."})
                  </label>
                  <input type="number" min="0" step="0.01" value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                    placeholder={bulkType === "percent" ? "e.g. 10" : "e.g. 5"}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={calcBulkPreview}
                  style={{ padding: "10px 22px", borderRadius: 10, background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Preview Changes
                </button>
                {bulkPreview.length > 0 && (
                  <button onClick={applyBulkChange} disabled={bulkSaving}
                    style={{ padding: "10px 22px", borderRadius: 10, background: bulkSaving ? "var(--border)" : "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: bulkSaving ? "not-allowed" : "pointer" }}>
                    {bulkSaving ? "Updating…" : `✓ Apply to ${bulkPreview.length} Items`}
                  </button>
                )}
                {bulkPreview.length > 0 && (
                  <button onClick={() => setBulkPreview([])}
                    style={{ padding: "10px 18px", borderRadius: 10, background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            {bulkPreview.length > 0 && (
              <div style={{ borderRadius: 14, background: "rgba(255,255,255,.02)", border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Preview — {bulkPreview.length} items</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 10 }}>
                    {bulkDirection === "increase" ? "▲ Increase" : "▼ Decrease"} by {bulkValue}{bulkType === "percent" ? "%" : " Rs."}
                  </span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["Item","Category","Old Price","New Price","Change"].map(h => (
                        <th key={h} style={{ padding: "9px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.slice(0, 200).map(p => {
                      const diff = p.newRate - p.old;
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          <td style={{ padding: "9px 16px", fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: "9px 16px", color: "var(--text-muted)" }}>{items.find(i => i.id === p.id)?.category || "—"}</td>
                          <td style={{ padding: "9px 16px", color: "#f87171" }}>{currency}{p.old}</td>
                          <td style={{ padding: "9px 16px", color: "#34d399", fontWeight: 700 }}>{currency}{p.newRate}</td>
                          <td style={{ padding: "9px 16px", fontWeight: 700, color: diff >= 0 ? "#818cf8" : "#f87171" }}>
                            {diff >= 0 ? "+" : ""}{diff.toFixed(0)} Rs.
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Scan Modal */}
      {testScanItem && testScanItem.barcode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", backdropFilter: "blur(10px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setTestScanItem(null)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 560, width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#000", marginBottom: 6 }}>{testScanItem.name}</div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 20 }}>{testScanItem.barcode}</div>
            {/* Large barcode for screen scanning */}
            <div style={{ background: "white", border: "2px solid #e5e7eb", borderRadius: 10, padding: "20px 24px", display: "inline-block", marginBottom: 20 }}>
              <Barcode128 value={testScanItem.barcode} moduleWidth={3} height={90} bg="white" fg="black" />
            </div>
            <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "12px 16px", textAlign: "left", marginBottom: 16, fontSize: 12.5, color: "#92400e", lineHeight: 1.7 }}>
              <strong>📱 iPhone scanning:</strong><br/>
              Native Camera app does not support Code128 barcodes.<br/>
              Use one of these free apps instead:<br/>
              • <strong>Barcode Scanner & QR Reader</strong> (App Store)<br/>
              • <strong>QR Code Reader</strong> by Scan<br/>
              • <strong>ShopSavvy</strong>
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 16px", textAlign: "left", fontSize: 12.5, color: "#166534", marginBottom: 20, lineHeight: 1.7 }}>
              <strong>✅ Android scanning:</strong><br/>
              Google Lens or the default camera app — scans Code128 natively.
            </div>
            <button onClick={() => setTestScanItem(null)} style={{ padding: "10px 28px", borderRadius: 10, background: "#111", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button>
          </div>
        </div>
      )}

      {/* Print Qty Modal */}
      {showPrintModal && printItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--panel-bg, #1a1d2e)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: 460, fontFamily: "'Outfit',sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>🖨 Print Labels</h2>
              <button onClick={() => setShowPrintModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ background: "white", borderRadius: 10, padding: 16, textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#000", marginBottom: 8 }}>{printItem.name}</div>
              <Barcode128 value={printItem.barcode!} moduleWidth={2} height={56} bg="white" fg="black" />
              {(printItem.rate ?? printItem.salePrice) != null && (
                <div style={{ fontSize: 13, fontWeight: 800, color: "#000", marginTop: 6 }}>{currency}{printItem.rate ?? printItem.salePrice}</div>
              )}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>How many labels? (max 100)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setPrintQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 18, cursor: "pointer" }}>−</button>
                <input type="number" min={1} max={100} value={printQty} onChange={e => setPrintQty(Math.max(1, Math.min(100, Number(e.target.value))))}
                  style={{ width: 70, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" }} />
                <button onClick={() => setPrintQty(q => Math.min(100, q + 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 18, cursor: "pointer" }}>+</button>
                <div style={{ display: "flex", gap: 5, marginLeft: 6 }}>
                  {[1, 4, 8, 12, 24, 48].map(n => (
                    <button key={n} onClick={() => setPrintQty(n)}
                      style={{ padding: "6px 9px", borderRadius: 7, border: `1px solid ${printQty === n ? "rgba(99,102,241,.5)" : "var(--border)"}`, background: printQty === n ? "rgba(99,102,241,.15)" : "transparent", color: printQty === n ? "#818cf8" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowPrintModal(false)} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={executePrint} style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                🖨 Print {printQty} Label{printQty > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Print Modal */}
      {showBatchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--panel-bg, #1a1d2e)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: 500, fontFamily: "'Outfit',sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>🖨 Batch Print Barcodes</h2>
              <button onClick={() => setShowBatchModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            {/* Selected items preview */}
            <div style={{ borderRadius: 10, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", padding: "12px 16px", marginBottom: 20, maxHeight: 180, overflowY: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>
                {batchSelectedItems.length} items selected
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {batchSelectedItems.map(item => (
                  <div key={item.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.25)", fontSize: 11.5, color: "var(--text-primary)", fontWeight: 600 }}>
                    {item.name}
                    <button onClick={() => toggleSelect(item.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 12, cursor: "pointer", padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Qty per item */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>Copies per item (max 50)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setBatchPrintQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 18, cursor: "pointer" }}>−</button>
                <input type="number" min={1} max={50} value={batchPrintQty} onChange={e => setBatchPrintQty(Math.max(1, Math.min(50, Number(e.target.value))))}
                  style={{ width: 70, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" }} />
                <button onClick={() => setBatchPrintQty(q => Math.min(50, q + 1))} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 18, cursor: "pointer" }}>+</button>
                <div style={{ display: "flex", gap: 5, marginLeft: 6 }}>
                  {[1, 2, 4, 8, 12].map(n => (
                    <button key={n} onClick={() => setBatchPrintQty(n)}
                      style={{ padding: "6px 9px", borderRadius: 7, border: `1px solid ${batchPrintQty === n ? "rgba(99,102,241,.5)" : "var(--border)"}`, background: batchPrintQty === n ? "rgba(99,102,241,.15)" : "transparent", color: batchPrintQty === n ? "#818cf8" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                Total labels: <strong style={{ color: "#818cf8" }}>{batchSelectedItems.length * batchPrintQty}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowBatchModal(false)} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={executeBatchPrint} disabled={batchSelectedItems.length === 0}
                style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: batchSelectedItems.length === 0 ? .5 : 1 }}>
                🖨 Print {batchSelectedItems.length * batchPrintQty} Labels
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
