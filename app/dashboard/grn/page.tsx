"use client";
import { fmtDate } from "@/lib/dateUtils";
import { ItemPicker } from "@/components/ItemPicker";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { confirmToast } from "@/lib/toast-feedback";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { PrintActionBar } from "@/components/print/PrintActionBar";
import { PrintDocA4, PrintPaperWrapper } from "@/components/print/PrintDocA4";
import { useResponsive } from "@/hooks/useResponsive";
import { useRateFormula } from "@/hooks/useRateFormula";
import {
  RateFormulaHeadCells,
  RateFormulaRowCells,
  RateFormulaMobileFields,
  rateFormulaPrintColumns,
  rateFormulaPrintValues,
  rateFormulaLineIncomplete,
  rateFormulaColumnsWidth,
  rateFormulaEnterHandler,
  type RateFormulaMeta,
} from "@/components/RateFormulaCells";
import { computeRateFromFormula, emptyRateFormulaMeta, itemPickerLabel, metaFromItem, readRateFormulaMeta } from "@/lib/rateFormula";
import type { RateFormulaValue } from "@/lib/rateFormula";

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const PANEL = "var(--panel-bg)";
const BORDER = "var(--border)";
const TEXT  = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG    = "var(--app-bg)";

type GRNItem = {
  itemId: string; name: string; orderedQty: string; receivedQty: string; rate: string; remarks: string;
  /** Rate-formula dimensions, when this company uses one. See lib/rateFormula.ts. */
  meta?: RateFormulaMeta;
};
type GRN = {
  id: string; grnNo: string; date: string; status: string;
  supplierId?: string; poId?: string | null;
  supplier?: { id?: string; name: string };
  po?: { poNo: string } | null;
  // The list endpoint returns whole records, so a row carries everything the
  // form needs to show it again — no second fetch to open one.
  remarks?: string | null; partyBillNo?: string | null; purchaseType?: string | null;
  biltyNo?: string | null; location?: string | null; cargo?: string | null;
  driver?: string | null; vehicleNo?: string | null;
  items: Array<{ itemId?: string; item: { name: string }; orderedQty: number; receivedQty: number; rate: number; remarks?: string | null; meta?: unknown }>;
};
type PO  = { id: string; poNo: string; supplier: { id: string; name: string }; items: Array<{ itemId: string; item: { id: string; name: string }; qty: number; rate: number }> };

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  RECEIVED: { bg: "rgba(52,211,153,0.12)",  text: "#34d399", border: "rgba(52,211,153,0.3)"  },
  PARTIAL:  { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", border: "rgba(251,191,36,0.3)"  },
  PENDING:  { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", border: "rgba(148,163,184,0.3)" },
};

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { padding: "9px 13px", borderRadius: 8, border: `1.5px solid ${BORDER}`, background: BG, color: TEXT, fontFamily: FONT, fontSize: 13.5, outline: "none", width: "100%", boxSizing: "border-box" as const, ...extra };
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.6 }}>{children}</div>;
}

export default function GRNPage() {
  const { isMobile } = useResponsive();
  // Companies that price a line from a calculation get extra columns and a
  // computed rate. Everyone else gets exactly the grid that was here before.
  const { settings: rf, active: rfActive } = useRateFormula("grn");
  /**
   * What the line got from the item that was just picked. The picker fires
   * Enter straight after its onChange, before React has committed the new row,
   * so the Enter handler cannot read the rows to find out whether the item
   * already answered the nominated column.
   */
  const lastPickedMeta = useRef<Record<string, any> | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const user  = getCurrentUser();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allItems,  setAllItems]  = useState<any[]>([]);
  const [pos,       setPos]       = useState<PO[]>([]);
  const allPosRef = useRef<PO[]>([]);
  const [grns,      setGrns]      = useState<GRN[]>([]);
  const [showList,  setShowList]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState(false);
  const [printMode, setPrintMode] = useState<"a4"|"58mm">("a4");

  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [grnNo,      setGrnNo]      = useState("");
  const [date,       setDate]       = useState(today);
  const [poId,       setPoId]       = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [remarks,    setRemarks]    = useState("");
  const [notes,      setNotes]      = useState("");
  const [partyBillNo, setPartyBillNo] = useState("");
  const [purchaseType, setPurchaseType] = useState<"CASH" | "CREDIT">("CREDIT");
  const [biltyNo, setBiltyNo] = useState("");
  const [location, setLocation] = useState("");
  const [cargo, setCargo] = useState("");
  const [driver, setDriver] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const emptyRow = (): GRNItem => ({ itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "", ...(rfActive ? { meta: emptyRateFormulaMeta(rf) } : {}) });
  const [rows, setRows] = useState<GRNItem[]>([emptyRow()]);

  function bh(): Record<string, string> {
    return { "Content-Type": "application/json", "x-company-id": user?.companyId || "", "x-user-role": user?.role || "", "x-user-id": user?.id || "" };
  }

  async function parseJsonResponse<T = any>(response: Response): Promise<T | null> {
    const text = await response.text();
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    fetch("/api/me/company").then(async (r) => {
      const d = await parseJsonResponse(r);
      if (d) setCompanyInfo(d);
    }).catch(() => {});
    fetch("/api/accounts?partyType=SUPPLIER", { headers: bh() }).then(async (r) => {
      const d = await parseJsonResponse(r);
      const list = Array.isArray(d) ? d : [];
      setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER"));
    }).catch(() => {});
    fetch("/api/items-new",     { headers: bh() }).then(async (r) => {
      const d = await parseJsonResponse(r);
      setAllItems(Array.isArray(d) ? d : []);
    }).catch(() => {});
    fetch("/api/purchase-order",{ headers: bh() }).then(async (r) => {
      const d = await parseJsonResponse(r);
      const records = Array.isArray(d) ? d : [];
      allPosRef.current = records;
      setPos(records);
    }).catch(() => {});
    loadGRNs();
    loadNextGrnNo();
  }, []);

  async function loadGRNs() {
    try {
      const r = await fetch("/api/grn", { headers: bh() });
      const d = await parseJsonResponse(r);
      setGrns(Array.isArray(d) ? d : []);
    } catch {
      setGrns([]);
    }
  }

  async function loadNextGrnNo() {
    try {
      const r = await fetch("/api/grn?nextNo=true", { headers: bh() });
      const d = await parseJsonResponse(r);
      if (d?.grnNo) setGrnNo(d.grnNo);
    } catch {}
  }

  const supplierPOs = supplierId ? pos.filter((p) => p.supplier.id === supplierId) : [];
  const selectedPO = pos.find((p) => p.id === poId);
  const allowedItems = selectedPO
    ? allItems.filter((item: any) => selectedPO.items.some((line) => line.itemId === item.id))
    : allItems;

  /**
   * The badge on each row of the item picker.
   *
   * With the table no longer pre-filled, this is where the order becomes
   * visible: open the list against a PO and every item carries what was ordered,
   * so the operator can match the delivery note against it before choosing.
   * Null when no PO is linked — a direct receipt has nothing to compare to.
   */
  const grnOrderedNote = (item: { id: string }) => {
    const line = selectedPO?.items.find((l) => l.itemId === item.id);
    return line ? `ordered ${line.qty}` : null;
  };

  /**
   * Open a saved receipt.
   *
   * It opens read-only, in the same preview the form hands you after saving —
   * so it prints identically to the day it was raised. There is deliberately no
   * edit: a GRN books stock the moment it is saved, so changing one has to
   * reverse and re-post those movements, and the API has no PUT to do that.
   * Correcting a receipt today means deleting it and raising it again.
   */
  function openGrn(grn: GRN) {
    setGrnNo(grn.grnNo);
    setDate(String(grn.date || "").slice(0, 10));
    setSupplierId(grn.supplierId || grn.supplier?.id || "");
    setPoId(grn.poId || "");
    setRemarks(grn.remarks || "");
    setPartyBillNo(grn.partyBillNo || "");
    setPurchaseType(grn.purchaseType === "CASH" ? "CASH" : "CREDIT");
    setBiltyNo(grn.biltyNo || "");
    setLocation(grn.location || "");
    setCargo(grn.cargo || "");
    setDriver(grn.driver || "");
    setVehicleNo(grn.vehicleNo || "");
    setRows(
      grn.items.map((line) => ({
        itemId: line.itemId || "",
        name: line.item?.name || "",
        orderedQty: String(line.orderedQty ?? ""),
        receivedQty: String(line.receivedQty ?? ""),
        rate: String(line.rate ?? ""),
        remarks: line.remarks || "",
        ...(rfActive ? { meta: readRateFormulaMeta(rf, line.meta) } : {}),
      })),
    );
    setShowList(false);
    setPreview(true);
  }

  // ── Query mode (F7 / F8) ──────────────────────────────────────────────────
  const [queryMode, setQueryMode] = useState(false);
  const [queryGrnNo, setQueryGrnNo] = useState("");
  const [queryDate, setQueryDate] = useState("");
  const [queryParty, setQueryParty] = useState("");
  const [queryResults, setQueryResults] = useState<GRN[]>([]);
  const [queryIdx, setQueryIdx] = useState(-1);

  function enterQuery() {
    setQueryMode(true);
    setQueryGrnNo(""); setQueryDate(""); setQueryParty("");
    setQueryResults([]); setQueryIdx(-1);
  }
  function exitQuery() { setQueryMode(false); setQueryIdx(-1); setQueryResults([]); }

  function runQuery(no: string, dateQ: string, party: string): GRN[] {
    const n = no.trim().toLowerCase();
    const p = party.trim().toLowerCase();
    const d = dateQ.trim();
    return grns.filter((g) => {
      if (n && !g.grnNo.toLowerCase().includes(n)) return false;
      if (p && !(g.supplier?.name || "").toLowerCase().includes(p)) return false;
      if (d && String(g.date || "").slice(0, 10) !== d) return false;
      return true;
    });
  }

  function queryNavTo(idx: number) {
    if (idx < 0 || idx >= queryResults.length) return;
    setQueryIdx(idx);
    openGrn(queryResults[idx]);
  }

  function executeQuery() {
    const results = runQuery(queryGrnNo, queryDate, queryParty);
    if (results.length === 0) { toast.error("No GRNs match that search"); return; }
    setQueryResults(results);
    setQueryIdx(0);
    setQueryMode(false);
    openGrn(results[0]);
    toast.success(`${results.length} GRN${results.length > 1 ? "s" : ""} found — ${results[0].grnNo}`);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F7") { e.preventDefault(); enterQuery(); }
      if (e.key === "Escape" && queryMode) { e.preventDefault(); exitQuery(); }
      if (e.key === "PageDown" && queryIdx >= 0) { e.preventDefault(); queryNavTo(queryIdx + 1); }
      if (e.key === "PageUp" && queryIdx >= 0) { e.preventDefault(); queryNavTo(queryIdx - 1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryMode, queryIdx, queryResults, grns]);

  function focusItemRow(index: number) {
    requestAnimationFrame(() => {
      const input = document.getElementById(`grn-item-${index}`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  function handleSupplierSelect(id: string) {
    setSupplierId(id);
    const matches = allPosRef.current.filter((p) =>
      p.supplier.id === id && !["RECEIVED", "COMPLETED", "CANCELLED"].includes(p.status || "")
    );
    setPos(matches);
    if (matches.length === 1) handlePOSelect(matches[0].id);
    else {
      setPoId("");
      setRows([emptyRow()]);
    }
  }

  /**
   * Choosing a PO no longer writes its lines into the table.
   *
   * A goods receipt records what physically arrived, which is rarely the whole
   * order: half the lines turn up, one is short, one was never sent. Filling
   * the table with the full order meant the operator's job was to delete rows
   * and zero out quantities — and a line left at its ordered figure by mistake
   * booked stock that never came through the gate.
   *
   * The table starts empty. The PO still does its work: it narrows the item
   * list to what was ordered, shows each item's ordered quantity in the picker,
   * and hands that quantity over the moment an item is chosen.
   */
  function handlePOSelect(id: string) {
    setPoId(id);
    setRows([emptyRow()]);
    if (!id) return;
    const po = pos.find(p => p.id === id);
    if (po) setSupplierId(po.supplier.id);
  }

  /**
   * One formula column changed on one line. The rate is re-derived from the
   * whole line rather than patched, so a correction to any column lands on the
   * rate immediately — which is the entire point of the feature.
   */
  function updateRowMeta(idx: number, key: string, value: RateFormulaValue) {
    const copy = [...rows];
    const meta = { ...(copy[idx].meta || {}), [key]: value };
    copy[idx] = { ...copy[idx], meta };
    const result = computeRateFromFormula(rf, meta);
    if (result.rate != null) copy[idx].rate = String(result.rate);
    if (idx === copy.length - 1 && value !== "")
      copy.push({ itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "", meta: emptyRateFormulaMeta(rf) });
    setRows(copy);
  }

  // The settings arrive one request after the first render, so rows built
  // before then have no meta. Backfilling here rather than blocking the form
  // on the lookup keeps the page usable for companies that never turn it on.
  useEffect(() => {
    if (!rfActive) return;
    setRows(prev => prev.some(r => r.meta) ? prev : prev.map(r => ({ ...r, meta: emptyRateFormulaMeta(rf) })));
  }, [rfActive, rf]);

  /** Picking an item pulls its saved dimensions onto the line. */
  function selectGrnItem(idx: number, itemId: string) {
    updateRow(idx, "itemId", itemId);

    // The ordered quantity travels with the item rather than being laid out in
    // advance: pick the item, and what the PO expects is already in the Ordered
    // column. Received is left blank on purpose — that is the one figure the
    // operator has to read off the delivery themselves.
    const poLine = selectedPO?.items.find((line: any) => line.itemId === itemId) as any;
    if (poLine) {
      setRows(prev => {
        const copy = [...prev];
        if (!copy[idx]) return prev;
        copy[idx] = {
          ...copy[idx],
          orderedQty: String(poLine.qty ?? ""),
          rate: String(poLine.rate || copy[idx].rate || ""),
        };
        return copy;
      });
    }

    if (!rfActive) return;
    const item = allItems.find((x: any) => x.id === itemId);
    if (!item) return;
    setRows(prev => {
      const copy = [...prev];
      const meta = metaFromItem(rf, item.meta, copy[idx]?.meta, `${item.name || ""} ${item.description || ""}`);
      lastPickedMeta.current = meta;
      copy[idx] = { ...copy[idx], meta };
      const r = computeRateFromFormula(rf, meta);
      if (r.rate != null) copy[idx].rate = String(r.rate);
      return copy;
    });
  }

  function updateRow(idx: number, field: keyof GRNItem, value: string) {
    const u = [...rows];
    u[idx] = { ...u[idx], [field]: value };
    if (field === "itemId") { const f = allItems.find((it: any) => it.id === value); if (f) u[idx].name = f.name; }
    if (idx === u.length - 1 && value !== "")
      u.push(emptyRow());
    setRows(u);
  }

  function resetForm() {
    setDate(today); setPoId(""); setSupplierId(""); setRemarks(""); setNotes("");
    setPartyBillNo(""); setPurchaseType("CREDIT"); setBiltyNo(""); setLocation(""); setCargo(""); setDriver(""); setVehicleNo("");
    setRows([emptyRow()]);
    setPreview(false);
    loadNextGrnNo();
  }

  async function handleSubmit() {
    const filledItems = rows.filter(r => r.itemId && r.receivedQty);
    if (rfActive) {
      for (let i = 0; i < filledItems.length; i++) {
        const missing = rateFormulaLineIncomplete(rf, filledItems[i].meta);
        if (missing) { toast.error(`Line ${i + 1}: ${missing.label} is required`); return; }
      }
    }
    if (!grnNo || !supplierId || filledItems.length === 0) {
      toast.error("GRN No, Supplier, and at least one item are required"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/grn", {
        method: "POST", headers: bh(),
        body: JSON.stringify({ grnNo, date, poId: poId || null, supplierId, remarks, partyBillNo, purchaseType, biltyNo, location, cargo, driver, vehicleNo, items: filledItems.map(r => ({ itemId: r.itemId, orderedQty: Number(r.orderedQty) || 0, receivedQty: Number(r.receivedQty), rate: Number(r.rate) || 0, remarks: r.remarks, meta: rfActive ? (r.meta || null) : null })) }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let message = "Failed to save GRN";
        try {
          const parsed = JSON.parse(raw);
          message = parsed?.error || message;
        } catch {
          if (raw.trim()) message = raw.slice(0, 240);
        }
        throw new Error(message);
      }
      toast.success("GRN saved successfully!");
      setPreview(true);
      loadGRNs();
      loadNextGrnNo();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this GRN?")) return;
    const res = await fetch(`/api/grn?id=${id}`, { method: "DELETE", headers: bh() });
    if (res.ok) { toast.success("Deleted"); loadGRNs(); }
    else toast.error("Delete failed");
  }

  function doPrint(mode: "a4" | "58mm") { setPrintMode(mode); setTimeout(() => window.print(), 150); }

  const filledRows = rows.filter(r => r.name && r.receivedQty);
  const supplierName = suppliers.find(s => s.id === supplierId)?.name || "";
  const poRef = pos.find(p => p.id === poId)?.poNo || "";

  function shareWhatsApp() {
    let msg = `*GOODS RECEIPT NOTE: ${grnNo}*\nDate: ${fmtDate(date)}\nSupplier: ${supplierName}`;
    if (poRef) msg += `\nPO Ref: ${poRef}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function sendEmail() {
    const email = prompt("Supplier email:");
    if (!email?.includes("@")) return;
    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "generic",
        to: email,
        subject: `Goods Receipt Note ${grnNo}`,
        html: `<p>Dear ${supplierName},</p><p>Please find your Goods Receipt Note <strong>${grnNo}</strong> dated ${fmtDate(date)}.</p>`,
      }),
    }).then(r => r.ok ? toast.success("Email sent!") : toast.error("Email failed")).catch(() => toast.error("Email failed"));
  }

  return (
    <div style={{ fontFamily: FONT, color: TEXT, minHeight: "100vh" }}>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .grn-print, .grn-print * { visibility: visible !important; }
          .grn-print { position: fixed !important; inset: 0 !important; background: white !important; color: black !important; filter: grayscale(100%) !important; }
          .grn-print.a4-print  { padding: 28px 36px !important; font-size: 12px !important; }
          .grn-print.t58-print { padding: 8px 10px !important; width: 55mm !important; font-size: 9px !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Goods Receipt Note</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: MUTED }}>{grns.length} total GRNs</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={enterQuery}
            title="Search saved GRNs"
            style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: queryMode ? "rgba(250,204,21,.15)" : PANEL, color: queryMode ? "#facc15" : TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ background: queryMode ? "#facc15" : "rgba(99,102,241,.15)", color: queryMode ? "#000" : ACCENT, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 800 }}>F7</span>
            Query Mode
          </button>
          {/* Two buttons used to sit here, both reading "New GRN" — one kept the
              draft on screen and one wiped it, and neither said so. The first is
              the way back to whatever you were filling in. */}
          <button onClick={() => { setShowList(!showList); if (!showList) { setPreview(false); } }}
            style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: showList ? "rgba(99,102,241,0.12)" : PANEL, color: showList ? ACCENT : TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {showList ? "← Back to Form" : `View All GRNs (${grns.length})`}
          </button>
          {showList && (
            <button onClick={() => { setShowList(false); resetForm(); }}
              style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>
              + New GRN
            </button>
          )}
        </div>
      </div>

      {/* ── Query bar (F7) ── */}
      {queryMode && (
        <div className="no-print" style={{ background: "rgba(250,204,21,.07)", border: "1px solid rgba(250,204,21,.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#facc15", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
            Query Mode — fill any field, then press F8
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
            <div>
              <Label>GRN No</Label>
              <input value={queryGrnNo} onChange={e => setQueryGrnNo(e.target.value)} placeholder="GRN-301" autoFocus
                onKeyDown={e => { if (e.key === "F8" || e.key === "Enter") { e.preventDefault(); executeQuery(); } if (e.key === "Escape") exitQuery(); }}
                style={inp()} />
            </div>
            <div>
              <Label>Date</Label>
              <DateInput value={queryDate} onChange={setQueryDate} style={inp()} />
            </div>
            <div>
              <Label>Supplier</Label>
              <input value={queryParty} onChange={e => setQueryParty(e.target.value)} placeholder="Any part of the name"
                onKeyDown={e => { if (e.key === "F8" || e.key === "Enter") { e.preventDefault(); executeQuery(); } if (e.key === "Escape") exitQuery(); }}
                style={inp()} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={executeQuery}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#facc15", color: "#000", fontFamily: FONT, fontSize: 12.5, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                F8 Execute
              </button>
              <button onClick={exitQuery}
                style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: MUTED, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                Esc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Query results: step through what the search found ── */}
      {queryIdx >= 0 && queryResults.length > 0 && (
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 12.5, color: MUTED }}>
            Result <strong style={{ color: TEXT }}>{queryIdx + 1}</strong> of {queryResults.length} —{" "}
            <strong style={{ color: ACCENT, fontFamily: "monospace" }}>{queryResults[queryIdx]?.grnNo}</strong>
          </span>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <button onClick={() => queryNavTo(queryIdx - 1)} disabled={queryIdx === 0}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: queryIdx === 0 ? MUTED : TEXT, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, cursor: queryIdx === 0 ? "not-allowed" : "pointer", opacity: queryIdx === 0 ? .4 : 1 }}>
              ← PgUp
            </button>
            <button onClick={() => queryNavTo(queryIdx + 1)} disabled={queryIdx >= queryResults.length - 1}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: queryIdx >= queryResults.length - 1 ? MUTED : TEXT, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, cursor: queryIdx >= queryResults.length - 1 ? "not-allowed" : "pointer", opacity: queryIdx >= queryResults.length - 1 ? .4 : 1 }}>
              PgDn →
            </button>
            <button onClick={exitQuery}
              style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ── List View ── */}
      {showList && (
        <div className="no-print" style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.07)", borderBottom: `1px solid ${BORDER}` }}>
                  {["GRN No", "Date", "Supplier", "PO Ref", "Status", "Items", "Actions"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grns.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: isMobile ? "26px 10px" : "48px 16px", textAlign: "center", color: MUTED }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📥</div>
                    <div style={{ fontWeight: 600 }}>No GRNs recorded yet</div>
                  </td></tr>
                ) : grns.map(grn => {
                  const sc = STATUS_COLORS[grn.status] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={grn.id} style={{ borderBottom: `1px solid ${BORDER}`, transition: "background .12s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.05)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td style={{ padding: "13px 16px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", fontSize: 13 }}>{grn.grnNo}</td>
                      <td style={{ padding: "13px 16px", color: MUTED, fontSize: 12 }}>{fmtDate(grn.date)}</td>
                      <td style={{ padding: "13px 16px", fontWeight: 600 }}>{grn.supplier?.name || "—"}</td>
                      <td style={{ padding: "13px 16px", color: MUTED, fontSize: 12, fontFamily: "monospace" }}>{grn.po?.poNo || "—"}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{grn.status}</span>
                      </td>
                      <td style={{ padding: "13px 16px", color: MUTED }}>{grn.items.length} items</td>
                      <td style={{ padding: "13px 16px" }}>
                        {user?.role === "ADMIN" && (
                          <button onClick={() => handleDelete(grn.id)} style={{ padding: "5px 13px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.07)", color: "#f87171", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{grns.length} goods receipt notes</div>
        </div>
      )}

      {/* ── Form ── */}
      {!showList && !preview && (
        <div className="no-print">
          {/* Page Header */}
          <div style={{ background: PANEL, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "14px 22px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(52,211,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>New Goods Receipt Note</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Record items received from supplier</div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px", gap: 20, alignItems: "start" }}>

            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Supplier + Business Details */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Supplier Details</div>
                  <select value={supplierId} onChange={e => handleSupplierSelect(e.target.value)} style={{ ...inp(), marginBottom: 10 }}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {supplierId && suppliers.find((s: any) => s.id === supplierId) && (() => {
                    const s = suppliers.find((x: any) => x.id === supplierId);
                    return (
                      <div style={{ padding: "10px 12px", background: "var(--panel-bg-2,rgba(255,255,255,0.03))", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.name}</div>
                        {(s.email || s.phone) && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>{s.email && <span>{s.email}</span>}{s.phone && <span>{s.phone}</span>}</div>}
                        {s.address && <div style={{ fontSize: 12, color: MUTED }}>{s.address}</div>}
                      </div>
                    );
                  })()}
                </div>
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Your Business</div>
                  {companyInfo ? (
                    <div style={{ padding: "10px 12px", background: "var(--panel-bg-2,rgba(255,255,255,0.03))", borderRadius: 8, border: `1px solid ${BORDER}` }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{companyInfo.name}</div>
                      {companyInfo.address && <div style={{ fontSize: 12, color: MUTED, marginBottom: 3 }}>{companyInfo.address}</div>}
                      {companyInfo.phone && <div style={{ fontSize: 12, color: MUTED }}>{companyInfo.phone}</div>}
                    </div>
                  ) : <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic" }}>Loading company info…</div>}
                  <div style={{ marginTop: 10 }}>
                    <Label>Against PO (optional)</Label>
                    <select value={poId} onChange={e => handlePOSelect(e.target.value)} style={inp()}>
                      <option value="">— No PO Reference —</option>
                      {pos.map(p => <option key={p.id} value={p.id}>{p.poNo} · {p.supplier.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Inward header details — these travel with the GRN and appear on print. */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Inward & Transport Details</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <div><Label>Party Bill #</Label><input value={partyBillNo} onChange={e => setPartyBillNo(e.target.value)} placeholder="Supplier bill #" style={inp()} /></div>
                  <div><Label>Purchase Type</Label><select value={purchaseType} onChange={e => setPurchaseType(e.target.value as "CASH" | "CREDIT")} style={inp()}><option value="CREDIT">Credit</option><option value="CASH">Cash</option></select></div>
                  <div><Label>Bilty #</Label><input value={biltyNo} onChange={e => setBiltyNo(e.target.value)} placeholder="Bilty / LR #" style={inp()} /></div>
                  <div><Label>Location</Label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Godown / location" style={inp()} /></div>
                  <div><Label>Cargo</Label><input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Cargo details" style={inp()} /></div>
                  <div><Label>Driver</Label><input value={driver} onChange={e => setDriver(e.target.value)} placeholder="Driver name" style={inp()} /></div>
                  <div><Label>Vehicle #</Label><input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Vehicle number" style={inp()} /></div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Items Received</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{rows.filter(r => r.itemId && r.receivedQty).length} items</div>
                </div>
                {isMobile ? (
                  <div style={{ padding: "10px 14px" }}>
                    {rows.map((row, idx) => {
                      const isShort = row.orderedQty && row.receivedQty && Number(row.receivedQty) < Number(row.orderedQty);
                      return (
                        <div key={idx} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" as const }}>Item {idx + 1}</span>
                            <button onClick={() => setRows(rows.filter((_, i) => i !== idx))} disabled={rows.length === 1} style={{ background: "none", border: "none", cursor: rows.length === 1 ? "not-allowed" : "pointer", color: "#f87171", fontSize: 18, lineHeight: 1, padding: 0, opacity: rows.length === 1 ? 0.3 : 1 }}>×</button>
                          </div>
                          <ItemPicker
                            items={allowedItems as any}
                            value={row.itemId}
                            onChange={(__picked: string) => selectGrnItem(idx, __picked)}
                            onKeyDown={rateFormulaEnterHandler(rf, rfActive, idx, () => lastPickedMeta.current)}
                            label={rfActive ? itemPickerLabel : undefined}
                            note={grnOrderedNote}
                            inputId={`grn-item-${idx}`}
                            style={{ ...inp({ marginBottom: 8 }) }}
                            allowManual={false}
                            // placeholder="Type to search — e.g. e1060"
                          />
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8 }}>
                            {rfActive && (
                              <RateFormulaMobileFields settings={rf} meta={row.meta} onChange={(key, value) => updateRowMeta(idx, key, value)} />
                            )}
                            <div><Label>Ordered</Label><input type="number" step="any" value={row.orderedQty} onChange={e => updateRow(idx, "orderedQty", e.target.value)} placeholder="0" style={inp({ textAlign: "center" })} /></div>
                            <div><Label><span style={{ color: isShort ? "#fbbf24" : "#34d399" }}>Received</span></Label><input type="number" step="any" value={row.receivedQty} onChange={e => updateRow(idx, "receivedQty", e.target.value)} placeholder="0" style={inp({ textAlign: "center", color: isShort ? "#fbbf24" : "#34d399", fontWeight: 700 })} /></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 + (rfActive ? rateFormulaColumnsWidth(rf) + 94 : 0), fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "rgba(99,102,241,0.07)" }}>
                          {[["#","left",30],["Item","left","auto"]].map(([h,a,w]) => (
                            <th key={h as string} style={{ padding: "10px 8px", textAlign: a as any, color: MUTED, fontWeight: 700, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.6, width: w as any }}>{h}</th>
                          ))}
                          {rfActive && <RateFormulaHeadCells settings={rf} />}
                          {[["Ordered","center",90],["Received","center",90],...(rfActive ? [["Rate","right",94] as const] : []),["Note","left",120],["","center",30]].map(([h,a,w]) => (
                            <th key={"t" + (h as string)} style={{ padding: "10px 8px", textAlign: a as any, color: MUTED, fontWeight: 700, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.6, width: w as any }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => {
                          const isShort = row.orderedQty && row.receivedQty && Number(row.receivedQty) < Number(row.orderedQty);
                          return (
                            <tr key={idx} style={{ borderTop: `1px solid ${BORDER}` }}>
                              <td style={{ padding: "6px 8px", color: MUTED, fontSize: 12 }}>{idx + 1}</td>
                              <td style={{ padding: "6px 8px" }}>
                                <ItemPicker
                                  items={allowedItems as any}
                                  value={row.itemId}
                                  onChange={(__picked: string) => selectGrnItem(idx, __picked)}
                                  onKeyDown={rateFormulaEnterHandler(rf, rfActive, idx, () => lastPickedMeta.current)}
                                  label={rfActive ? itemPickerLabel : undefined}
                                  note={grnOrderedNote}
                                  inputId={`grn-item-${idx}`}
                                  style={inp({ padding: "6px 10px" })}
                                  allowManual={false}
                                  placeholder="Type to search — e.g. e1060"
                                />
                              </td>
                              {rfActive && (
                                <RateFormulaRowCells settings={rf} meta={row.meta} rowIndex={idx} onChange={(key, value) => updateRowMeta(idx, key, value)} />
                              )}
                              <td style={{ padding: "6px 8px" }}><input type="number" step="any" value={row.orderedQty} onChange={e => updateRow(idx, "orderedQty", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "center", color: MUTED })} /></td>
                              <td style={{ padding: "6px 8px" }}><input type="number" step="any" value={row.receivedQty} onChange={e => updateRow(idx, "receivedQty", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "center", color: isShort ? "#fbbf24" : "#34d399", fontWeight: 700 })} /></td>
                              {rfActive && (
                                <td style={{ padding: "6px 8px", width: 94 }}>
                                  <input type="number" value={row.rate} onChange={e => updateRow(idx, "rate", e.target.value)} readOnly={!rf.rateEditable} title={!rf.rateEditable ? "Worked out by your rate formula" : undefined} placeholder="0.00" style={inp({ padding: "5px 7px", textAlign: "right", ...(rf.rateEditable ? {} : { opacity: 0.75, cursor: "not-allowed" }) })} />
                                </td>
                              )}
                              <td style={{ padding: "6px 8px" }}><input value={row.remarks} onChange={e => updateRow(idx, "remarks", e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); focusItemRow(idx + 1); } }} placeholder="Note..." style={inp({ padding: "5px 8px", fontSize: 12 })} /></td>
                              <td style={{ padding: "6px 8px" }}><button onClick={() => setRows(rows.filter((_, i) => i !== idx))} disabled={rows.length === 1} style={{ background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16, padding: 0, opacity: rows.length === 1 ? 0.3 : 1 }}>×</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Remarks + Notes */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: TEXT }}>Notes & Remarks</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <div><Label>Remarks</Label><input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional remarks..." style={inp()} /></div>
                  <div><Label>Internal Notes</Label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." style={inp()} /></div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, position: isMobile ? "static" : "sticky", top: 24 }}>

              {/* GRN Header */}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 1, textTransform: "uppercase" as const, marginBottom: 6 }}>GRN</div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "monospace", color: ACCENT, marginBottom: 16 }}>{grnNo || "Auto #"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div><Label>Receipt Date</Label><DateInput value={date} onChange={setDate} style={inp()} /></div>
                </div>
              </div>

              {/* Save Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={handleSubmit} disabled={saving} style={{ padding: "12px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 15, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>{saving ? "Saving…" : "Save & Preview"}</button>
                <button onClick={resetForm} style={{ padding: "10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>Clear Form</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── Preview Action Bar ── */}
      {!showList && preview && (
        <div className="no-print" style={{ marginBottom: 20 }}>
          <PrintActionBar
            onPrintA4={() => { setPrintMode("a4"); setTimeout(() => window.print(), 100); }}
            onPrintThermal={() => { setPrintMode("58mm"); setTimeout(() => window.print(), 100); }}
            thermalLabel="58mm"
            onEmail={sendEmail}
            onWhatsApp={shareWhatsApp}
            onEdit={() => setPreview(false)}
            onNew={() => { resetForm(); }}
            newLabel="New GRN"
          />
        </div>
      )}

      {/* ══ A4 PRINT PREVIEW ══ */}
      {!showList && preview && printMode !== "58mm" && (
        <PrintPaperWrapper>
          <PrintDocA4
            companyName={companyInfo?.name || "Company Name"}
            companyAddress={companyInfo?.address}
            companyPhone={companyInfo?.phone}
            docTitle="GOODS RECEIPT NOTE"
            docNo={grnNo}
            date={fmtDate(date)}
            partyLabel="Supplier"
            partyName={supplierName || "—"}
            metaFields={[
              ...(poRef ? [{ label: "PO Reference", value: poRef }] : []),
              ...(partyBillNo ? [{ label: "Party Bill #", value: partyBillNo }] : []),
              ...(biltyNo ? [{ label: "Bilty #", value: biltyNo }] : []),
              ...(purchaseType ? [{ label: "Purchase Type", value: purchaseType }] : []),
              ...(location ? [{ label: "Location", value: location }] : []),
              ...(cargo ? [{ label: "Cargo", value: cargo }] : []),
              ...(driver ? [{ label: "Driver", value: driver }] : []),
              ...(vehicleNo ? [{ label: "Vehicle #", value: vehicleNo }] : []),
            ]}
            columns={[
              { key: "no", label: "#", align: "center", width: 30 },
              { key: "name", label: "Item" },
              ...(rfActive ? rateFormulaPrintColumns(rf) : []),
              { key: "ordered", label: "Ordered", align: "center", width: 70 },
              { key: "received", label: "Received", align: "center", width: 70 },
            ]}
            rows={filledRows.map((r, i) => ({
              no: i + 1,
              name: r.name,
              ...(rfActive ? rateFormulaPrintValues(rf, r.meta) : {}),
              ordered: r.orderedQty || "—",
              received: r.receivedQty,
            }))}
            totalsLines={[]}
            notes={remarks || undefined}
            signatureLabels={["Received By", "Verified By"]}
          />
        </PrintPaperWrapper>
      )}

      {/* ══ 58mm THERMAL PREVIEW ══ */}
      {!showList && preview && (
        <div className="grn-print t58-print" style={{
          background: "white", color: "#000",
          fontFamily: "'Courier New',Courier,monospace",
          width: 220, margin: "0 auto",
          padding: "10px 12px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          borderRadius: 4,
          display: printMode === "58mm" ? "block" : "none",
        }}>
          <div style={{ textAlign: "center", borderBottom: "1px dashed #555", paddingBottom: 6, marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>GOODS RECEIPT NOTE</div>
          </div>
          <div style={{ fontSize: 9, marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>GRN No:</span><span style={{ fontWeight: 700 }}>{grnNo}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Date:</span><span>{fmtDate(date)}</span></div>
            {poRef && <div style={{ display: "flex", justifyContent: "space-between" }}><span>PO Ref:</span><span>{poRef}</span></div>}
          </div>
          <div style={{ fontSize: 9, borderTop: "1px dashed #555", borderBottom: "1px dashed #555", padding: "4px 0", marginBottom: 5 }}>
            <div style={{ fontWeight: 700 }}>Supplier: {supplierName}</div>
          </div>
          <div style={{ fontSize: 9, marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderBottom: "1px solid #000", paddingBottom: 2, marginBottom: 3 }}>
              <span style={{ flex: 2 }}>Item</span>
              <span style={{ width: 24, textAlign: "right" }}>Rcv</span>
            </div>
            {filledRows.map((r, i) => (
              <div key={i} style={{ display: "flex", marginBottom: 2 }}>
                <span style={{ flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 76 }}>{r.name}</span>
                <span style={{ width: 24, textAlign: "right" }}>{r.receivedQty}</span>
              </div>
            ))}
          </div>
          {remarks && <div style={{ fontSize: 8, borderTop: "1px dashed #555", paddingTop: 3, marginTop: 4 }}><span style={{ fontWeight: 700 }}>Note: </span>{remarks}</div>}
          <div style={{ textAlign: "center", fontSize: 8, borderTop: "1px dashed #555", paddingTop: 4, marginTop: 4 }}>
            <div>FinovaOS · {fmtDate(new Date())}</div>
          </div>
        </div>
      )}
    </div>
  );
}
