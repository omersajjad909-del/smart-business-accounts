import toast from "react-hot-toast";
"use client";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Item = { id: string; name: string; code?: string; barcode?: string; unit?: string; salePrice?: number; stockQty?: number };

function BarcodeDisplay({ value, label }: { value: string; label: string }) {
  // Render a simple visual barcode using CSS bars
  const bars = value.split("").map((c, i) => c.charCodeAt(0));
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: 56, gap: 1, marginBottom: 6 }}>
        {/* Start guard */}
        <div style={{ width: 2, height: 56, background: "white" }}/>
        <div style={{ width: 1, height: 56, background: "transparent" }}/>
        <div style={{ width: 2, height: 56, background: "white" }}/>
        {/* Data bars derived from barcode string */}
        {value.slice(0, 12).split("").map((ch, i) => {
          const n = ch.charCodeAt(0) % 8;
          return [0,1,2,3].map(j => (
            <div key={`${i}-${j}`} style={{ width: j % 2 === 0 ? ((n + j + 1) % 3) + 1 : 1, height: j % 3 === 0 ? 56 : 44, background: j % 2 === 0 ? "white" : "transparent" }}/>
          ));
        })}
        {/* End guard */}
        <div style={{ width: 1, height: 56, background: "transparent" }}/>
        <div style={{ width: 2, height: 56, background: "white" }}/>
        <div style={{ width: 1, height: 56, background: "transparent" }}/>
        <div style={{ width: 2, height: 56, background: "white" }}/>
      </div>
      <div style={{ fontSize: 11, letterSpacing: "2px", color: "white", fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function BarcodePage() {
  const [items, setItems]         = useState<Item[]>([]);
  const [filtered, setFiltered]   = useState<Item[]>([]);
  const [search, setSearch]       = useState("");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned]     = useState<Item | null>(null);
  const [scanErr, setScanErr]     = useState("");
  const [printItem, setPrintItem]       = useState<Item | null>(null);
  const [loading, setLoading]           = useState(true);
  const [assigning, setAssigning]       = useState<string | null>(null);
  const [assignInput, setAssignInput]   = useState<Record<string, string>>({});
  const scanRef = useRef<HTMLInputElement>(null);

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

  function printLabel(item: Item) {
    setPrintItem(item);
    setTimeout(() => {
      window.print();
      setPrintItem(null);
    }, 300);
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: "'Outfit','DM Sans',sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } .print-label { display: block !important; } }`}</style>

      {/* Print label (hidden until print) */}
      {printItem && (
        <div className="print-label" style={{ display: "none", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{printItem.name}</div>
          {printItem.barcode && <BarcodeDisplay value={printItem.barcode} label={printItem.code || ""} />}
          {printItem.salePrice && <div style={{ fontSize: 14, marginTop: 8 }}>Price: ${printItem.salePrice}</div>}
        </div>
      )}

      <div className="no-print">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 4px" }}>Barcode Management</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>Scan barcodes to find items, or print barcode labels for your inventory.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Scanner */}
          <div style={{ borderRadius: 14, background: "rgba(99,102,241,.06)", border: "1px solid rgba(99,102,241,.2)", padding: "20px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="9" x2="18" y2="15"/></svg>
              Barcode Scanner
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginBottom: 14, lineHeight: 1.6 }}>
              Click the input below and scan with a USB barcode scanner, or type the barcode manually.
            </p>
            <form onSubmit={handleScan} style={{ display: "flex", gap: 8 }}>
              <input
                ref={scanRef}
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Scan or type barcode…"
                autoFocus
                style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,.07)", border: "1px solid rgba(99,102,241,.3)", color: "white", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <button type="submit" style={{ padding: "10px 16px", borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Find
              </button>
            </form>

            {scanned && (
              <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 10, background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", marginBottom: 4 }}>✓ Item Found</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{scanned.name}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.4)", marginTop: 4 }}>
                  Code: {scanned.code || "—"} · Barcode: {scanned.barcode || "—"}
                  {scanned.salePrice != null && ` · Price: $${scanned.salePrice}`}
                  {scanned.stockQty  != null && ` · Stock: ${scanned.stockQty} ${scanned.unit || ""}`}
                </div>
                <button onClick={() => printLabel(scanned)} style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  🖨 Print Label
                </button>
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
              { label: "Total Items", val: items.length, color: "#818cf8" },
              { label: "With Barcode",  val: items.filter(i => i.barcode).length, color: "#34d399" },
              { label: "Without Barcode", val: items.filter(i => !i.barcode).length, color: "#f87171" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ flex: 1, borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>{label}</span>
                <span style={{ fontSize: 24, fontWeight: 800, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Items List */}
        <div style={{ borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>All Items</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, code, or barcode…"
              style={{ width: 280, padding: "7px 12px", borderRadius: 9, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", color: "white", fontSize: 12.5, fontFamily: "inherit", outline: "none" }}
            />
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13 }}>Loading items…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  {["Item Name","Code","Barcode","Unit","Sale Price","Action"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "rgba(255,255,255,.35)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding: "11px 16px", color: "rgba(255,255,255,.8)", fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: "11px 16px", color: "rgba(255,255,255,.4)", fontFamily: "monospace" }}>{item.code || "—"}</td>
                    <td style={{ padding: "11px 16px" }}>
                      {item.barcode
                        ? <span style={{ color: "#34d399", fontFamily: "monospace", fontSize: 11.5 }}>{item.barcode}</span>
                        : <span style={{ color: "rgba(255,255,255,.2)", fontSize: 11.5 }}>Not set</span>
                      }
                    </td>
                    <td style={{ padding: "11px 16px", color: "rgba(255,255,255,.4)" }}>{item.unit || "—"}</td>
                    <td style={{ padding: "11px 16px", color: "rgba(255,255,255,.6)" }}>{item.salePrice != null ? `$${item.salePrice}` : "—"}</td>
                    <td style={{ padding: "8px 16px" }}>
                      {item.barcode ? (
                        <button onClick={() => printLabel(item)} style={{ padding: "5px 12px", borderRadius: 7, background: "rgba(129,140,248,.12)", border: "1px solid rgba(129,140,248,.25)", color: "#a5b4fc", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                          🖨 Print
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={assignInput[item.id] || ""}
                            onChange={e => setAssignInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Barcode or leave blank to auto"
                            style={{ width: 160, padding: "4px 8px", borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "white", fontSize: 11.5, fontFamily: "inherit", outline: "none" }}
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
                  <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,.2)" }}>No items found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
