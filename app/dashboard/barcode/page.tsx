"use client";

import toast from "react-hot-toast";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useCurrency } from "@/lib/useCurrency";

type Item = { id: string; name: string; code?: string; barcode?: string; unit?: string; salePrice?: number; stockQty?: number };

// ─── Pure Code128B barcode generator — no library, pure SVG ───────────────────
// Code128 pattern table: each value maps to an 11-bit binary string (1=bar, 0=space)
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
  "11010000100", // 103 = START A
  "11010010000", // 104 = START B  ← we use this
  "11010011100", // 105 = START C
];
const C128_STOP = "1100011101011"; // 13 modules

function encodeCode128B(text: string): string {
  if (!text) return "";
  const vals: number[] = [];
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c < 32 || c > 126) continue; // skip unsupported chars
    vals.push(c - 32);
  }
  if (vals.length === 0) return "";
  const checksum = (104 + vals.reduce((s, v, i) => s + v * (i + 1), 0)) % 103;
  const quiet = "0".repeat(11);
  return quiet + C128[104] + vals.map(v => C128[v]).join("") + C128[checksum] + C128_STOP + quiet;
}

interface BarcodeProps {
  value: string;
  label?: string;
  moduleWidth?: number;
  height?: number;
  showText?: boolean;
  bg?: string;
  fg?: string;
  style?: React.CSSProperties;
}

function Barcode128({ value, label, moduleWidth = 2, height = 60, showText = true, bg = "white", fg = "black", style }: BarcodeProps) {
  const bits = encodeCode128B(value);
  if (!bits) return null;
  const svgW = bits.length * moduleWidth;
  const svgH = height + (showText ? 20 : 4);

  return (
    <svg width={svgW} height={svgH} style={style} xmlns="http://www.w3.org/2000/svg">
      <rect width={svgW} height={svgH} fill={bg} />
      {bits.split("").map((bit, i) =>
        bit === "1" ? (
          <rect key={i} x={i * moduleWidth} y={2} width={moduleWidth} height={height} fill={fg} />
        ) : null
      )}
      {showText && (
        <text
          x={svgW / 2} y={height + 16}
          textAnchor="middle"
          fontSize={11}
          fontFamily="'Courier New',monospace"
          fill={fg}
          letterSpacing="1.5"
        >
          {label ?? value}
        </text>
      )}
    </svg>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function BarcodePage() {
  const [items, setItems]         = useState<Item[]>([]);
  const [filtered, setFiltered]   = useState<Item[]>([]);
  const [search, setSearch]       = useState("");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned]     = useState<Item | null>(null);
  const [scanErr, setScanErr]     = useState("");
  const [printItem, setPrintItem]       = useState<Item | null>(null);
  const [printQty, setPrintQty]         = useState(1);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [assigning, setAssigning]       = useState<string | null>(null);
  const [assignInput, setAssignInput]   = useState<Record<string, string>>({});
  const scanRef = useRef<HTMLInputElement>(null);
  const currency = useCurrency();

  const headers = () => {
    const user = getCurrentUser();
    const h: Record<string, string> = {};
    if (user?.id)        h["x-user-id"]    = user.id;
    if (user?.role)      h["x-user-role"]  = user.role;
    if (user?.companyId) h["x-company-id"] = user.companyId;
    return h;
  };

  function loadItems() {
    fetch("/api/barcode", { credentials: "include", headers: headers() })
      .then(r => r.json())
      .then(d => {
        const list: Item[] = d.items || [];
        setItems(list);
        setFiltered(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadItems(); }, []);

  async function handleAssignBarcode(item: Item) {
    const barcode = (assignInput[item.id] || "").trim();
    setAssigning(item.id);
    try {
      const res = await fetch("/api/barcode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ itemId: item.id, barcode: barcode || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, barcode: data.item.barcode } : i));
        setAssignInput(prev => ({ ...prev, [item.id]: "" }));
        toast.success("Barcode assigned");
      } else {
        toast.error(data.error || "Failed to assign barcode");
      }
    } catch {
      toast.error("Error assigning barcode");
    } finally {
      setAssigning(null);
    }
  }

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? items.filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.barcode?.toLowerCase().includes(q) ||
      i.code?.toLowerCase().includes(q)
    ) : items);
  }, [search, items]);

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const val = scanInput.trim();
    if (!val) return;
    const found = items.find(i => i.barcode === val || i.code === val);
    if (found) {
      setScanned(found);
      setScanErr("");
    } else {
      setScanned(null);
      setScanErr(`No item found for: "${val}"`);
    }
    setScanInput("");
    scanRef.current?.focus();
  }

  function openPrint(item: Item) {
    setPrintItem(item);
    setPrintQty(1);
    setShowPrintModal(true);
  }

  function executePrint() {
    setShowPrintModal(false);
    setTimeout(() => window.print(), 200);
  }

  const printLabels = printItem ? Array.from({ length: Math.max(1, Math.min(printQty, 100)) }) : [];

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Outfit','DM Sans',sans-serif" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body { background: white !important; }
          @page { margin: 8mm; }
        }
        .print-area { display: none; }
      `}</style>

      {/* ── Print Area ───────────────────────────────────────────── */}
      {printItem && (
        <div className="print-area">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 4 }}>
            {printLabels.map((_, idx) => (
              <div key={idx} style={{
                border: "1px dashed #ccc", borderRadius: 6,
                padding: "10px 14px", textAlign: "center",
                display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4,
                pageBreakInside: "avoid",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#000", maxWidth: 180, textAlign: "center", lineHeight: 1.3 }}>
                  {printItem.name}
                </div>
                <Barcode128
                  value={printItem.barcode!}
                  moduleWidth={1.5}
                  height={48}
                  bg="white"
                  fg="black"
                />
                {printItem.salePrice != null && (
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#000" }}>
                    {currency}{printItem.salePrice}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main UI ──────────────────────────────────────────────── */}
      <div className="no-print">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px" }}>
            Barcode Management
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            Real Code128 barcodes — assign, preview, and print labels for any item.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Scanner */}
          <div style={{ borderRadius: 14, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)", padding: "20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="8" x2="10" y2="16"/>
                <line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="9" x2="18" y2="15"/>
              </svg>
              Barcode Scanner
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
              USB scanner ya phone scanner se scan karo, ya manually barcode type karo.
            </p>
            <form onSubmit={handleScan} style={{ display: "flex", gap: 8 }}>
              <input
                ref={scanRef}
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Scan or type barcode…"
                autoFocus
                style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid rgba(99,102,241,.3)", color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <button type="submit" style={{ padding: "10px 16px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Find
              </button>
            </form>

            {scanned && (
              <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 10, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", marginBottom: 4 }}>✓ Item Found</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{scanned.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                  Code: {scanned.code || "—"} · Barcode: {scanned.barcode || "—"}
                  {scanned.salePrice != null && ` · Price: ${currency}${scanned.salePrice}`}
                  {scanned.stockQty  != null && ` · Stock: ${scanned.stockQty} ${scanned.unit || ""}`}
                </div>
                {scanned.barcode && (
                  <>
                    <div style={{ marginTop: 10, padding: "10px", borderRadius: 8, background: "white", display: "inline-block" }}>
                      <Barcode128 value={scanned.barcode} height={44} moduleWidth={1.5} />
                    </div>
                    <br />
                    <button onClick={() => openPrint(scanned)} style={{ marginTop: 8, padding: "7px 14px", borderRadius: 8, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      🖨 Print Label
                    </button>
                  </>
                )}
              </div>
            )}
            {scanErr && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 10, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", fontSize: 12.5, color: "#f87171" }}>
                {scanErr}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Total Items",      val: items.length,                        color: "#818cf8" },
              { label: "With Barcode",     val: items.filter(i => i.barcode).length, color: "#34d399" },
              { label: "Without Barcode",  val: items.filter(i => !i.barcode).length,color: "#f87171" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ flex: 1, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid var(--border)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
                <span style={{ fontSize: 24, fontWeight: 800, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items List */}
        <div style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>All Items</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, code, or barcode…"
              style={{ width: 280, padding: "7px 12px", borderRadius: 9, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
            />
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading items…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Item Name","Code","Barcode Preview","Unit","Sale Price","Action"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "var(--text-muted)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding: "11px 16px", color: "var(--text-primary)", fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)", fontFamily: "monospace" }}>{item.code || "—"}</td>
                    <td style={{ padding: "8px 16px" }}>
                      {item.barcode ? (
                        <div style={{ display: "inline-block", background: "white", padding: "4px 6px", borderRadius: 4 }}>
                          <Barcode128 value={item.barcode} moduleWidth={1} height={32} showText={false} bg="white" fg="black" />
                        </div>
                      ) : (
                        <span style={{ color: "rgba(255,255,255,.2)", fontSize: 11 }}>Not set</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{item.unit || "—"}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)" }}>{item.salePrice != null ? `${currency}${item.salePrice}` : "—"}</td>
                    <td style={{ padding: "8px 16px" }}>
                      {item.barcode ? (
                        <button onClick={() => openPrint(item)} style={{ padding: "5px 12px", borderRadius: 7, background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.25)", color: "#a5b4fc", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          🖨 Print
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={assignInput[item.id] || ""}
                            onChange={e => setAssignInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Barcode or leave blank to auto"
                            style={{ width: 160, padding: "4px 8px", borderRadius: 6, background: "var(--app-bg)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 11.5, fontFamily: "inherit", outline: "none" }}
                          />
                          <button
                            onClick={() => handleAssignBarcode(item)}
                            disabled={assigning === item.id}
                            style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                          >
                            {assigning === item.id ? "…" : "Assign"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No items found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Print Quantity Modal ──────────────────────────────────── */}
      {showPrintModal && printItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--panel-bg, #1a1d2e)", border: "1px solid var(--border)", borderRadius: 18, padding: 28, width: 460, fontFamily: "'Outfit',sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>🖨 Print Barcode Labels</h2>
              <button onClick={() => setShowPrintModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>✕</button>
            </div>

            {/* Live preview */}
            <div style={{ background: "white", borderRadius: 10, padding: "16px", textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#000", marginBottom: 8 }}>{printItem.name}</div>
              <Barcode128 value={printItem.barcode!} moduleWidth={2} height={56} bg="white" fg="black" />
              {printItem.salePrice != null && (
                <div style={{ fontSize: 13, fontWeight: 800, color: "#000", marginTop: 6 }}>
                  {currency}{printItem.salePrice}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>
                Kitne labels print karni hain? (max 100)
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setPrintQty(q => Math.max(1, q - 1))}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 18, cursor: "pointer", fontWeight: 700 }}
                >−</button>
                <input
                  type="number" min={1} max={100}
                  value={printQty}
                  onChange={e => setPrintQty(Math.max(1, Math.min(100, Number(e.target.value))))}
                  style={{ width: 80, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" }}
                />
                <button
                  onClick={() => setPrintQty(q => Math.min(100, q + 1))}
                  style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--app-bg)", color: "var(--text-primary)", fontSize: 18, cursor: "pointer", fontWeight: 700 }}
                >+</button>
                <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
                  {[1, 4, 8, 12, 24].map(n => (
                    <button key={n} onClick={() => setPrintQty(n)}
                      style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${printQty === n ? "rgba(99,102,241,.5)" : "var(--border)"}`, background: printQty === n ? "rgba(99,102,241,.15)" : "transparent", color: printQty === n ? "#818cf8" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowPrintModal(false)}
                style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={executePrint}
                style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                🖨 Print {printQty} Label{printQty > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
