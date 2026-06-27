"use client";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth";

import { QRCodeSVG } from "qrcode.react";

type Supplier = { id: string; name: string; partyType: string };

type POItem = {
  itemId: string;
  qty: number;
  rate: number;
  invoicedQty: number;
  item: {
    id: string;
    name: string;
    description?: string | null;
  };
};

type PurchaseOrder = {
  id: string;
  poNo: string;
  supplierId: string;
  supplier?: { id: string; name: string } | null;
  items: POItem[];
};

type PurchaseInvoice = {
  id: string;
  invoiceNo: string;
  date: string;
  supplierId: string;
  poId?: string | null;
  supplier?: { name: string };
  total: number;
  approvalStatus?: string;
  items: Array<{ itemId?: string; item: { name: string; description?: string | null }; qty: number; rate: number }>;
};

type GRN = {
  id: string;
  po?: { id: string; poNo: string } | null;
  items: Array<{
    itemId: string;
    receivedQty: number;
    rate: number;
    item?: { id: string; name: string; description?: string | null } | null;
  }>;
};

type Row = {
  itemId: string;
  name: string;
  description?: string | null;
  qty: number | "";
  rate: number | "";
  discountPercent: number | "";
  taxPercent: number | "";
  unit: string;
  sku: string;
};

type TaxConfig = {
  id: string;
  taxType: string;
  taxCode: string;
  taxRate: number;
  description?: string;
};

type InventoryItem = { id: string; name: string; barcode?: string; purchaseRate?: number; unit?: string; code?: string; description?: string };

type Currency = {
  id: string;
  code: string;
  name: string;
  exchangeRate: number;
};

// ─── Query helpers ────────────────────────────────────────────────────────────
function piParseIso(raw: string): string {
  const d = raw.replace(/[-\/\.]/g, "");
  if (/^\d{6}$/.test(d)) { const yy=d.slice(4,6); return `${parseInt(yy)>=50?`19${yy}`:`20${yy}`}-${d.slice(2,4)}-${d.slice(0,2)}`; }
  if (/^\d{8}$/.test(d)) return `${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return "";
}
function piDateOp(raw: string): { op: string; iso: string } | null {
  let op="=", rest=raw.trim();
  if (rest.startsWith(">=")) { op=">="; rest=rest.slice(2).trim(); }
  else if (rest.startsWith("<=")) { op="<="; rest=rest.slice(2).trim(); }
  else if (rest.startsWith(">")) { op=">"; rest=rest.slice(1).trim(); }
  else if (rest.startsWith("<")) { op="<"; rest=rest.slice(1).trim(); }
  else if (rest.startsWith("=")) { op="="; rest=rest.slice(1).trim(); }
  const iso=piParseIso(rest); if (!iso) return null; return {op,iso};
}
function piMatchDate(vIso: string, q: string): boolean {
  if (!q.trim()) return true; const p=piDateOp(q); if (!p) return false;
  const {op,iso}=p;
  if (op==="=") return vIso===iso; if (op===">") return vIso>iso;
  if (op==="<") return vIso<iso; if (op===">=") return vIso>=iso;
  if (op==="<=") return vIso<=iso; return false;
}
function piRunQuery(invoices: PurchaseInvoice[], invNo: string, dateQ: string, party: string): PurchaseInvoice[] {
  let r=[...invoices];
  if (invNo.trim()) { const q=invNo.trim().toLowerCase(); r=r.filter(v=>v.invoiceNo.toLowerCase().includes(q)); }
  if (dateQ.trim()) r=r.filter(v=>piMatchDate(new Date(v.date).toISOString().slice(0,10), dateQ));
  if (party.trim()) { const q=party.trim().toLowerCase(); r=r.filter(v=>(v.supplier?.name||"").toLowerCase().includes(q)); }
  return r.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
}

const FONT = "'Outfit','Inter',sans-serif";
const ACCENT = "#6366f1";
const PANEL = "var(--panel-bg)";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-muted)";
const BG = "var(--app-bg)";

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "9px 13px",
    borderRadius: 8,
    border: `1.5px solid ${BORDER}`,
    background: BG,
    color: TEXT,
    fontFamily: FONT,
    fontSize: 13.5,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    ...extra,
  };
}

function labelStyle(): React.CSSProperties {
  return {
    fontSize: 10.5,
    color: MUTED,
    fontWeight: 700,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };
}

function PurchaseInvoiceContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();
  const requestHeaders = {
    "x-user-role": user?.role || "ADMIN",
    "x-user-id": user?.id || "",
    "x-company-id": user?.companyId || "",
  };

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const [allGrns, setAllGrns] = useState<GRN[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<PurchaseInvoice | null>(null);

const [searchTerm, setSearchTerm] = useState("");


  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [selectedPoId, setSelectedPoId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState("MAIN");
  const [freight, setFreight] = useState<number | "">("");
  const [approvalStatus, setApprovalStatus] = useState("PENDING");

  const [rows, setRows] = useState<Row[]>([{ itemId: "", name: "", description: "", qty: "", rate: "", discountPercent: "", taxPercent: "", unit: "", sku: "" }]);

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [printMode, setPrintMode] = useState<"none" | "a4" | "55mm">("none");
  const [origin, setOrigin] = useState("");
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [scanCode, setScanCode] = useState("");
  const [scanActive, setScanActive] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const [sendingEmail, setSendingEmail] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);
  
  // Tax states
  const [applyTax, setApplyTax] = useState(false);
  const [selectedTaxId, setSelectedTaxId] = useState("");
  const [taxes, setTaxes] = useState<TaxConfig[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currencyId, setCurrencyId] = useState("");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  // ── Query Mode (F7 / F8) ────────────────────────────────────────────────────
  const [piQueryMode,    setPiQueryMode]    = useState(false);
  const [piQueryInvNo,   setPiQueryInvNo]   = useState("");
  const [piQueryDate,    setPiQueryDate]    = useState("");
  const [piQueryParty,   setPiQueryParty]   = useState("");
  const [piQueryResults, setPiQueryResults] = useState<PurchaseInvoice[]>([]);
  const [piQueryIdx,     setPiQueryIdx]     = useState(-1);
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState<number | "">("");
  const [discountType, setDiscountType] = useState("flat");
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [batchNo, setBatchNo]       = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [advancePayment, setAdvancePayment] = useState<number | "">();
  const emptyRow = (): Row => ({ itemId: "", name: "", description: "", qty: "", rate: "", discountPercent: "", taxPercent: "", unit: "", sku: "" });

  function handlePIScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!scanCode.trim()) return;
    const found = allInventoryItems.find(i => i.barcode === scanCode || i.id === scanCode || i.code === scanCode);
    if (!found) { toast.error(`Item not found: ${scanCode}`); setScanCode(""); return; }
    const existingIdx = rows.findIndex(r => r.itemId === found.id);
    if (existingIdx >= 0) {
      const updated = [...rows];
      updated[existingIdx] = { ...updated[existingIdx], qty: Number(updated[existingIdx].qty || 0) + 1 };
      setRows(updated);
    } else {
      const newRow: Row = { itemId: found.id, name: found.name, description: found.description || "", qty: 1, rate: found.purchaseRate || "", discountPercent: "", taxPercent: "", unit: found.unit || "", sku: found.code || "" };
      const last = rows[rows.length - 1];
      if (!last.itemId && last.qty === "" && last.rate === "") {
        setRows([...rows.slice(0, -1), newRow, emptyRow()]);
      } else {
        setRows([...rows, newRow, emptyRow()]);
      }
    }
    setScanCode("");
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    fetch("/api/currencies")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCurrencies(data);
      })
      .catch(() => {});
  }, []);

  const supplierRef = useRef<HTMLSelectElement>(null);

  // ── Query Mode helpers ───────────────────────────────────────────────────────
  function piEnterQuery() { setPiQueryMode(true); setPiQueryInvNo(""); setPiQueryDate(""); setPiQueryParty(""); setPiQueryResults([]); setPiQueryIdx(-1); }
  function piExitQuery()  { setPiQueryMode(false); setPiQueryIdx(-1); setPiQueryResults([]); }
  function piNavTo(idx: number) {
    if (idx < 0 || idx >= piQueryResults.length) return;
    setPiQueryIdx(idx);
    startEdit(piQueryResults[idx]);
    setShowPreview(false);
  }
  function piExecuteQuery(invNo: string, dateQ: string, party: string) {
    const results = piRunQuery(invoices, invNo, dateQ, party);
    if (results.length === 0) { toast.error("No invoices found matching your criteria"); return; }
    setPiQueryResults(results); setPiQueryIdx(0); setPiQueryMode(false);
    startEdit(results[0]); setShowPreview(false);
    toast.success(`${results.length} invoice${results.length > 1 ? "s" : ""} found — ${results[0].invoiceNo}`);
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F7") { e.preventDefault(); piEnterQuery(); }
      if (e.key === "Escape" && piQueryMode) { e.preventDefault(); piExitQuery(); }
      if (e.key === "PageDown" && piQueryIdx >= 0) { e.preventDefault(); piNavTo(piQueryIdx + 1); }
      if (e.key === "PageUp"   && piQueryIdx >= 0) { e.preventDefault(); piNavTo(piQueryIdx - 1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piQueryMode, piQueryIdx, piQueryResults]);

  useEffect(() => {
    fetch("/api/me/company").then(r => r.ok ? r.json() : null).then(d => { if (d) setCompanyInfo(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    loadInvoices();
    fetch("/api/accounts", { headers: requestHeaders })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts;
        setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER"));
      });

    // Load tax configurations
    fetch("/api/tax-configuration", { headers: requestHeaders })
      .then(r => r.json())
      .then(d => setTaxes(Array.isArray(d) ? d : []))
      .catch(err => console.log("Tax config error:", err));

    fetch("/api/purchase-order", {
      headers: requestHeaders,
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllPOs(data);
      });

    fetch("/api/grn", {
      headers: requestHeaders,
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllGrns(data);
      })
      .catch(() => {});

    fetch("/api/items-new", { headers: requestHeaders })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllInventoryItems(data.map((i: any) => ({ id: i.id, name: i.name, barcode: i.barcode || "", purchaseRate: i.purchaseRate ?? 0, unit: i.unit || "", code: i.code || "", description: i.description || "" })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (queryId) {
      fetch(`/api/purchase-invoice?id=${queryId}`, {
         headers: requestHeaders
      })
      .then(r => r.json())
      .then(data => {
         if (data && !data.error) {
            startEdit(data);
         }
      })
      .catch(e => console.error("Error loading invoice:", e));
    }
  }, [queryId]);

  async function loadInvoices() {
    try {
      const res = await fetch("/api/purchase-invoice?type=invoices", {
        headers: requestHeaders,
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (e) {
      console.error("Load invoices error:", e);
    }
  }

  function getInvoiceableRowsForPo(po: PurchaseOrder) {
    const linkedGrns = allGrns.filter((grn) => grn.po?.id === po.id);

    if (linkedGrns.length > 0) {
      const receivedByItem = new Map<string, { qty: number; rate: number; name: string; description: string }>();
      linkedGrns.forEach((grn) => {
        grn.items.forEach((item) => {
          const current = receivedByItem.get(item.itemId) || {
            qty: 0,
            rate: item.rate,
            name: item.item?.name || po.items.find((pi) => pi.itemId === item.itemId)?.item.name || "",
            description: item.item?.description || po.items.find((pi) => pi.itemId === item.itemId)?.item.description || "",
          };
          current.qty += Number(item.receivedQty || 0);
          if (!current.rate && item.rate) current.rate = item.rate;
          receivedByItem.set(item.itemId, current);
        });
      });

      const invoicedByItem = new Map<string, number>();
      invoices
        .filter((invoice) => invoice.poId === po.id && (!editing || invoice.id !== editing.id))
        .forEach((invoice) => {
          invoice.items.forEach((item) => {
            if (!item.itemId) return;
            invoicedByItem.set(item.itemId, (invoicedByItem.get(item.itemId) || 0) + Number(item.qty || 0));
          });
        });

      return Array.from(receivedByItem.entries())
        .map(([itemId, item]) => {
          const remainingQty = Math.max(0, item.qty - (invoicedByItem.get(itemId) || 0));
          return {
            itemId,
            name: item.name,
            description: item.description || "",
            qty: remainingQty,
            rate: item.rate,
          };
        })
        .filter((row) => row.qty > 0);
    }

    return po.items
      .map((pi) => ({
        itemId: pi.itemId,
        name: pi.item.name,
        description: pi.item.description || "",
        qty: Math.max(0, pi.qty - pi.invoicedQty),
        rate: pi.rate,
      }))
      .filter((row) => row.qty > 0);
  }

  function handleSupplierChange(id: string) {
    setSupplierId(id);
    const s = suppliers.find(x => x.id === id);
    setSupplierName(s?.name || "");
    setSelectedPoId("");
    setRows([emptyRow()]);
  }

  useEffect(() => {
    if (!supplierId) {
      setFilteredPOs([]);
      return;
    }

    const pos = allPOs.filter((po) => {
      const poSupplierId = po.supplierId || po.supplier?.id || "";
      if (poSupplierId !== supplierId) return false;
      return getInvoiceableRowsForPo(po).length > 0;
    });

    setFilteredPOs(pos);

    if (selectedPoId && !pos.some((po) => po.id === selectedPoId)) {
      setSelectedPoId("");
      setRows([emptyRow()]);
    }
  }, [supplierId, allPOs, allGrns, invoices, editing, selectedPoId]);

  function handlePoSelection(poId: string) {
    setSelectedPoId(poId);
    const po = filteredPOs.find(p => p.id === poId);
    if (!po) return;
    const nextRows = getInvoiceableRowsForPo(po);
    setRows(nextRows.length > 0 ? nextRows.map(r => ({ ...emptyRow(), ...r })) : [emptyRow()]);
  }

  function updateRow(index: number, key: keyof Row, value: any) {
    const copy = [...rows];
    (copy[index] as any)[key] = value;
    if (index === copy.length - 1 && value !== "") copy.push(emptyRow());
    setRows(copy);
  }

  const subtotal = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.rate) || 0), 0);
  const perItemDiscountAmt = rows.reduce((s, r) => s + ((Number(r.qty) * Number(r.rate) || 0) * (Number(r.discountPercent) || 0) / 100), 0);
  const perItemTaxAmt = rows.reduce((s, r) => {
    const base = (Number(r.qty) * Number(r.rate) || 0) * (1 - (Number(r.discountPercent) || 0) / 100);
    return s + base * (Number(r.taxPercent) || 0) / 100;
  }, 0);
  const discountAmt = discountType === "percent" ? subtotal * Number(discount) / 100 : Number(discount) || 0;
  const selectedTax = taxes.find(t => t.id === selectedTaxId);
  const taxableAmount = subtotal - perItemDiscountAmt - discountAmt;
  const globalTaxAmt = applyTax && selectedTax ? (taxableAmount * selectedTax.taxRate / 100) : 0;
  const totalTax = perItemTaxAmt + globalTaxAmt;
  const netTotal = taxableAmount + totalTax + (Number(freight) || 0);
  const cur = companyInfo?.baseCurrency || "Rs.";

  async function saveInvoice() {
    const clean = rows.filter(r => r.itemId && r.qty !== "" && Number(r.qty) > 0);
    if (!supplierId || clean.length === 0) {
      toast.error("Supplier and item are required");
      return;
    }

    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const baseBody = {
        supplierId,
        poId: selectedPoId,
        date,
        dueDate: dueDate || null,
        location,
        freight: Number(freight) || 0,
        discount: Number(discount) || 0,
        discountType,
        notes: notes || null,
        reference: reference || null,
        paymentMethod: paymentMethod || null,
        paymentTerms: paymentTerms || null,
        items: clean.map((r: any) => ({ ...r, discountPercent: Number(r.discountPercent) || 0, taxPercent: Number(r.taxPercent) || 0 })),
        applyTax,
        taxConfigId: applyTax ? selectedTaxId : null,
        currencyId: currencyId || null,
        exchangeRate,
        approvalStatus,
      };
      const body = editing ? { id: editing.id, ...baseBody } : baseBody;

      const res = await fetch("/api/purchase-invoice", {
        method,
        headers: { "Content-Type": "application/json", ...requestHeaders },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any = null;
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      } else {
        try {
          const text = await res.text();
          data = text || null;
        } catch {
          data = null;
        }
      }
      if (res.ok && data) {
        const newInvoiceNo = (typeof data === "object" && data.invoiceNo) ? data.invoiceNo : (data?.id || invoiceId);
        const newDbId = (typeof data === "object" && data.id) ? data.id : (editing?.id || null);
        setInvoiceId(newInvoiceNo);
        setSavedInvoiceId(newDbId);

        // Save stock_receipt BusinessRecords with batch/expiry for each item (enables Expiry Report)
        if (expiryDate || batchNo) {
          const clean = rows.filter(r => r.itemId && r.qty !== "" && Number(r.qty) > 0);
          await Promise.allSettled(clean.map(r =>
            fetch("/api/business-records", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...requestHeaders },
              body: JSON.stringify({
                category: "stock_receipt",
                title: r.name,
                amount: Number(r.qty) * Number(r.rate),
                data: {
                  productName:  r.name,
                  itemNewId:    r.itemId,
                  qtyReceived:  Number(r.qty),
                  costPrice:    Number(r.rate),
                  invoiceNo:    newInvoiceNo,
                  supplierId,
                  supplierName,
                  batchNo:      batchNo   || null,
                  expiryDate:   expiryDate || null,
                  stockBefore:  0,
                  stockAfter:   Number(r.qty),
                },
              }),
            })
          ));
        }

        await loadInvoices();
        // Re-fetch saved invoice so rows are correct even if useEffect reset them
        if (newDbId) {
          try {
            const invRes = await fetch(`/api/purchase-invoice?id=${newDbId}`, { headers: requestHeaders });
            const inv = await invRes.json();
            if (inv?.items?.length > 0) {
              setRows(inv.items.map((it: any) => ({
                itemId: it.itemId || "",
                name: it.item?.name || "",
                description: it.item?.description || "",
                qty: it.qty,
                rate: it.rate,
                discountPercent: it.discountPercent ?? "",
                taxPercent: it.taxPercent ?? "",
                unit: it.item?.unit || "",
                sku: it.item?.code || "",
              })));
            }
          } catch {}
        }
        setShowPreview(true);
        if (editing) {
          setEditing(null);
          setShowForm(false);
          setShowList(true);
        }
        toast.success("Invoice saved successfully!");
      } else {
        const msg = (data && typeof data === "object" && data.error)
          ? data.error
          : (typeof data === "string" && data.trim().length > 0)
            ? data
            : "Save failed (empty/invalid response)";
        toast.error("Error: " + msg);
      }
    } catch (err: any) {
      toast.error("System Error: " + err.message);
    } finally {
      setSaving(false);
    }
  }


  function startEdit(inv: PurchaseInvoice) {
    const inv2 = inv as any;
    setEditing(inv);
    setInvoiceId(inv.invoiceNo);
    setSupplierId(inv.supplierId);
    setSupplierName(inv.supplier?.name || "");
    setApprovalStatus(inv.approvalStatus || "PENDING");
    setDate(new Date(inv.date).toISOString().slice(0, 10));
    setDueDate(inv2.dueDate ? new Date(inv2.dueDate).toISOString().slice(0, 10) : "");
    setDiscount(inv2.discount ?? "");
    setDiscountType(inv2.discountType || "flat");
    setNotes(inv2.notes || "");
    setReference(inv2.reference || "");
    setPaymentMethod(inv2.paymentMethod || "");
    setPaymentTerms(inv2.paymentTerms || "");
    setRows(inv.items.map((it: any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      description: it.item?.description || "",
      qty: it.qty.toString(),
      rate: it.rate.toString(),
      discountPercent: it.discountPercent ?? "",
      taxPercent: it.taxPercent ?? "",
      unit: it.item?.unit || "",
      sku: it.item?.code || "",
    })));
    setShowForm(true);
    setShowList(false);
  }

  async function deleteInvoice(id: string) {
    if (!await confirmToast("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/purchase-invoice?id=${id}`, {
        method: "DELETE",
        headers: requestHeaders,
      });
      if (res.ok) {
        toast.success("Invoice deleted successfully");
        await loadInvoices();
      } else {
        const err = await res.json();
        toast.error(err.error || "Delete failed");
      }
    } catch (_e) {
      toast.error("Delete failed");
    }
  }

  function resetForm() {
    setEditing(null);
    setSupplierId("");
    setSupplierName("");
    setSelectedPoId("");
    setDate(today);
    setDueDate("");
    setLocation("MAIN");
    setFreight("");
    setDiscount("");
    setDiscountType("flat");
    setNotes("");
    setReference("");
    setPaymentMethod("");
    setPaymentTerms("");
    setBatchNo("");
    setExpiryDate("");
    setAdvancePayment("");
    setApprovalStatus("PENDING");
    setRows([emptyRow()]);
    setApplyTax(false);
    setSelectedTaxId("");
    setShowPreview(false);
    setSavedInvoiceId(null);
  }

  async function sendInvoiceEmail() {
    if (!savedInvoiceId) {
      toast.error("Please save the invoice first");
      return;
    }

    const supplierEmail = prompt("Enter supplier email address:");
    if (!supplierEmail || !supplierEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          type: "purchase-invoice",
          invoiceId: savedInvoiceId,
          to: supplierEmail,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("✅ Email sent successfully!");
      } else {
        toast.error(`❌ Failed to send email: ${data.error || "Unknown error"}`);
      }
    } catch (_error) {
      toast.error("❌ Failed to send email. Please check email configuration.");
    } finally {
      setSendingEmail(false);
    }
  }
  const payableAmount = netTotal - (Number(advancePayment) || 0);

  const filteredInvoices = invoices.filter(inv => {
  if (!searchTerm.trim()) return true;
  const term = searchTerm.toLowerCase();
  return (
    inv.invoiceNo?.toLowerCase().includes(term) ||
    inv.supplier?.name?.toLowerCase().includes(term) ||
    inv.date?.toLowerCase().includes(term)
  );
});

  function amountInWords(n: number): string {
    const units = ["","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
    const tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
    function say(x: number): string {
      if (x === 0) return "";
      if (x < 20) return units[x];
      if (x < 100) return tens[Math.floor(x/10)] + (x%10 ? " " + units[x%10] : "");
      return units[Math.floor(x/100)] + " hundred" + (x%100 ? " and " + say(x%100) : "");
    }
    if (n <= 0) return "Zero";
    const whole = Math.floor(n);
    const p: string[] = [];
    const cr = Math.floor(whole/10000000); if (cr) p.push(say(cr) + " crore");
    const lk = Math.floor((whole%10000000)/100000); if (lk) p.push(say(lk) + " lakh");
    const th = Math.floor((whole%100000)/1000); if (th) p.push(say(th) + " thousand");
    const rm = whole%1000; if (rm) p.push(say(rm));
    const words = p.join(" ");
    return (words.charAt(0).toUpperCase() + words.slice(1)) + " only";
  }


  return (
    <div style={{ padding: isMobile ? 8 : "0 0 40px", maxWidth: 1480, margin: "0 auto", fontFamily: FONT, color: TEXT }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ padding: isMobile ? "16px 12px 12px" : "20px 28px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, borderBottom: `1px solid ${BORDER}`, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span>Dashboard</span>
            <span style={{ color: BORDER }}>/</span>
            <span style={{ color: ACCENT, fontWeight: 600 }}>Purchase Invoice</span>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: -0.5, color: piQueryMode ? "#facc15" : TEXT, display: "flex", alignItems: "center", gap: 10 }}>
            {piQueryMode ? "🔍 Query Mode" : (
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>
                Purchase Invoice
              </>
            )}
          </h1>
          {invoiceId && <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: "monospace", fontWeight: 700 }}>{invoiceId}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {piQueryIdx >= 0 && !piQueryMode && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 10, padding: "6px 12px" }}>
              <button onClick={() => piNavTo(piQueryIdx - 1)} disabled={piQueryIdx === 0} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: piQueryIdx===0?"rgba(255,255,255,.2)":"rgba(255,255,255,.7)", fontSize: 13, cursor: piQueryIdx===0?"default":"pointer", fontFamily: FONT }}>◀</button>
              <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700, minWidth: 110, textAlign: "center" }}>{piQueryResults[piQueryIdx]?.invoiceNo} · {piQueryIdx+1}/{piQueryResults.length}</span>
              <button onClick={() => piNavTo(piQueryIdx + 1)} disabled={piQueryIdx === piQueryResults.length-1} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: piQueryIdx===piQueryResults.length-1?"rgba(255,255,255,.2)":"rgba(255,255,255,.7)", fontSize: 13, cursor: piQueryIdx===piQueryResults.length-1?"default":"pointer", fontFamily: FONT }}>▶</button>
              <button onClick={piExitQuery} style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: FONT }}>✕ Exit</button>
            </div>
          )}
          <button onClick={piQueryMode ? piExitQuery : piEnterQuery}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${piQueryMode ? "rgba(250,204,21,.4)" : BORDER}`, background: piQueryMode ? "rgba(250,204,21,.1)" : PANEL, color: piQueryMode ? "#facc15" : TEXT, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ background: piQueryMode ? "#facc15" : "rgba(99,102,241,.15)", color: piQueryMode ? "#000" : ACCENT, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 800 }}>F7</span>
            {piQueryMode ? "Cancel Query" : "Query Mode"}
          </button>
          {showPreview && (
            <>
              <button onClick={() => { setPrintMode("a4"); setTimeout(() => window.print(), 150); }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: PANEL, color: TEXT, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
              <button onClick={sendInvoiceEmail} disabled={sendingEmail} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "rgba(99,102,241,.12)", color: ACCENT, fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: sendingEmail?"not-allowed":"pointer", opacity: sendingEmail?0.7:1 }}>{sendingEmail?"Sending…":"Email"}</button>
              <button onClick={() => setShowPreview(false)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 12.5, cursor: "pointer" }}>Back to Edit</button>
            </>
          )}
          <button onClick={() => { setShowList(!showList); setShowForm(showList); setEditing(null); }}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: showList ? "rgba(99,102,241,0.1)" : PANEL, color: showList ? ACCENT : TEXT, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            {showList ? "Hide List" : "All Invoices"}
          </button>
          <button onClick={() => { setShowForm(true); setShowList(false); resetForm(); piExitQuery(); }}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(37,99,235,.3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New Invoice
          </button>
        </div>
      </div>

      {/* ── QUERY MODE FORM ── */}
      {piQueryMode && (
        <div style={{ background: "rgba(250,204,21,.04)", border: "2px solid rgba(250,204,21,.3)", borderRadius: 14, padding: "22px 28px", marginBottom: 24, marginInline: 28 }}>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: "rgba(250,204,21,.7)" }}>Enter criteria — leave blank to get all. Use <b style={{ color: "#facc15" }}>&gt;</b>, <b style={{ color: "#facc15" }}>&lt;</b>, <b style={{ color: "#facc15" }}>&gt;=</b> for date range.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "180px 240px 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(250,204,21,.6)", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Invoice #</div>
              <input autoFocus value={piQueryInvNo} onChange={e => setPiQueryInvNo(e.target.value)} placeholder="PI-1 or blank…"
                style={{ ...inp(), border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                onKeyDown={e => { if (e.key === "F8") { e.preventDefault(); piExecuteQuery(piQueryInvNo, piQueryDate, piQueryParty); } if (e.key === "Escape") piExitQuery(); }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(250,204,21,.6)", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Date (e.g. &gt;010425)</div>
              <input value={piQueryDate} onChange={e => setPiQueryDate(e.target.value)} placeholder=">010125 or blank…"
                style={{ ...inp(), border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                onKeyDown={e => { if (e.key === "F8") { e.preventDefault(); piExecuteQuery(piQueryInvNo, piQueryDate, piQueryParty); } if (e.key === "Escape") piExitQuery(); }} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(250,204,21,.6)", fontWeight: 700, marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Supplier</div>
              <input value={piQueryParty} onChange={e => setPiQueryParty(e.target.value)} placeholder="e.g. ABC Suppliers…"
                style={{ ...inp(), border: "1px solid rgba(250,204,21,.3)", background: "rgba(250,204,21,.05)" }}
                onKeyDown={e => { if (e.key === "F8") { e.preventDefault(); piExecuteQuery(piQueryInvNo, piQueryDate, piQueryParty); } if (e.key === "Escape") piExitQuery(); }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => piExecuteQuery(piQueryInvNo, piQueryDate, piQueryParty)}
              style={{ padding: "9px 28px", borderRadius: 8, background: "linear-gradient(135deg,#facc15,#ca8a04)", border: "none", color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ background: "rgba(0,0,0,.2)", borderRadius: 3, padding: "1px 6px", fontSize: 10 }}>F8</span>Execute Query
            </button>
            <button onClick={piExitQuery} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>Cancel (Esc)</button>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {showList && (
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginInline: isMobile ? 8 : 28, marginBottom: 24 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>All Purchase Invoices</div>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by invoice #, supplier…" style={{ ...inp({ width: 260, padding: "7px 12px", fontSize: 12.5 }) }} />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.05)" }}>
                  {["Invoice No","Date","Supplier","Total","Status","Actions"].map((h, hi) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: hi >= 3 && hi < 5 ? "right" : hi === 5 ? "center" : "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase" as const, letterSpacing: 0.6 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: MUTED }}>No invoices found</td></tr>
                ) : filteredInvoices.map(inv => (
                  <tr key={inv.id} style={{ borderTop: `1px solid ${BORDER}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", fontSize: 13 }}>{inv.invoiceNo}</td>
                    <td style={{ padding: "12px 16px", color: MUTED, fontSize: 12 }}>{fmtDate(inv.date)}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{inv.supplier?.name || "—"}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>{inv.total.toLocaleString()}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: inv.approvalStatus === "APPROVED" ? "rgba(52,211,153,.1)" : inv.approvalStatus === "REJECTED" ? "rgba(248,113,113,.1)" : "rgba(251,191,36,.1)", color: inv.approvalStatus === "APPROVED" ? "#34d399" : inv.approvalStatus === "REJECTED" ? "#f87171" : "#fbbf24" }}>{inv.approvalStatus || "PENDING"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <button onClick={() => startEdit(inv)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(99,102,241,.3)", background: "rgba(99,102,241,.07)", color: ACCENT, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 6 }}>Edit</button>
                      <button onClick={() => deleteInvoice(inv.id)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.06)", color: "#f87171", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 11.5, color: MUTED }}>{filteredInvoices.length} of {invoices.length} invoices</div>
        </div>
      )}

      {/* ── FORM ── */}
      {showForm && (
        <>
          <div className="print:hidden">

          {!showPreview && (
            <div className="no-print" style={{ padding: isMobile ? "0 8px" : "0 28px" }}>

              {/* ── 3-PANEL HEADER ROW ── */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>

                {/* Panel 1: Supplier */}
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(99,102,241,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.7 }}>Supplier Details</div>
                  </div>
                  <select value={supplierId} onChange={e => handleSupplierChange(e.target.value)} style={{ ...inp({ marginBottom: 8 }) }}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {supplierId && (() => {
                    const s = suppliers.find(x => x.id === supplierId) as any;
                    if (!s) return null;
                    return (
                      <div style={{ padding: "8px 10px", background: "rgba(99,102,241,.04)", borderRadius: 8, border: `1px solid rgba(99,102,241,.12)` }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: TEXT }}>{s.name}</div>
                        {(s.email || s.phone) && <div style={{ fontSize: 11, color: MUTED, marginBottom: 2, display: "flex", gap: 10, flexWrap: "wrap" }}>{s.email && <span>{s.email}</span>}{s.phone && <span>{s.phone}</span>}</div>}
                        {s.address && <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>{s.address}{s.city ? `, ${s.city}` : ""}</div>}
                        {(s.ntn || s.strn) && <div style={{ fontSize: 10, color: MUTED, display: "flex", gap: 10 }}>{s.ntn && <span>NTN: {s.ntn}</span>}{s.strn && <span>STRN: {s.strn}</span>}</div>}
                      </div>
                    );
                  })()}
                </div>

                {/* Panel 2: Invoice Details */}
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(37,99,235,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </div>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.7 }}>Invoice Details</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: ACCENT }}>{invoiceId || "Auto #"}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: approvalStatus === "APPROVED" ? "rgba(52,211,153,.12)" : approvalStatus === "REJECTED" ? "rgba(248,113,113,.12)" : "rgba(251,191,36,.12)", color: approvalStatus === "APPROVED" ? "#34d399" : approvalStatus === "REJECTED" ? "#f87171" : "#fbbf24" }}>{approvalStatus}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                    <div>
                      <div style={labelStyle()}>Invoice Date</div>
                      <DateInput value={date} onChange={setDate} style={inp({ padding: "7px 10px", fontSize: 12.5 })} />
                    </div>
                    <div>
                      <div style={labelStyle()}>Due Date</div>
                      <DateInput value={dueDate} onChange={setDueDate} style={inp({ padding: "7px 10px", fontSize: 12.5 })} />
                    </div>
                    <div>
                      <div style={labelStyle()}>Approval</div>
                      <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)} style={inp({ padding: "7px 10px", fontSize: 12.5 })}>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle()}>Reference</div>
                      <input value={reference} onChange={e => setReference(e.target.value)} placeholder="PO / ref no." style={inp({ padding: "7px 10px", fontSize: 12.5 })} />
                    </div>
                  </div>
                </div>

                {/* Panel 3: Business & Location */}
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(16,185,129,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.7 }}>Business & Location</div>
                  </div>
                  {companyInfo ? (
                    <div style={{ padding: "8px 10px", background: "rgba(16,185,129,.04)", borderRadius: 8, border: "1px solid rgba(16,185,129,.12)", marginBottom: 9 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{companyInfo.name}</div>
                      {companyInfo.address && <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>{companyInfo.address}</div>}
                      {(companyInfo.phone || companyInfo.ntn) && <div style={{ fontSize: 10, color: MUTED, display: "flex", gap: 10 }}>{companyInfo.phone && <span>{companyInfo.phone}</span>}{companyInfo.ntn && <span>NTN: {companyInfo.ntn}</span>}</div>}
                    </div>
                  ) : <div style={{ fontSize: 11, color: MUTED, fontStyle: "italic", marginBottom: 9 }}>Loading…</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                    <div>
                      <div style={labelStyle()}>Location</div>
                      <select value={location} onChange={e => setLocation(e.target.value)} style={inp({ padding: "7px 10px", fontSize: 12.5 })}>
                        <option value="MAIN">Main</option>
                        <option value="SHOP">Shop</option>
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle()}>Against PO</div>
                      <select value={selectedPoId} onChange={e => handlePoSelection(e.target.value)} style={inp({ padding: "7px 10px", fontSize: 12.5 })}>
                        <option value="">— No PO —</option>
                        {filteredPOs.map(p => <option key={p.id} value={p.id}>{p.poNo}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle()}>Currency</div>
                      <select style={inp({ padding: "7px 10px", fontSize: 12.5 })} value={currencyId} onChange={e => { const id = e.target.value; setCurrencyId(id); const c = currencies.find(c => c.id === id); if (c) setExchangeRate(c.exchangeRate || 1); }}>
                        <option value="">Base</option>
                        {currencies.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle()}>Ex. Rate</div>
                      <input type="number" style={inp({ padding: "7px 10px", textAlign: "right", fontSize: 12.5 })} value={exchangeRate} onChange={e => setExchangeRate(Number(e.target.value) || 1)} placeholder="1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SCAN BAR ── */}
              <div onClick={() => setScanActive(true)} style={{ background: scanActive ? "rgba(99,102,241,.05)" : PANEL, border: `1.5px ${scanActive ? "solid" : "dashed"} ${scanActive ? ACCENT : BORDER}`, borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "text", marginBottom: 16, transition: "all .15s" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="8" x2="10" y2="16"/><line x1="14" y1="10" x2="14" y2="14"/><line x1="18" y1="9" x2="18" y2="15"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: ACCENT, letterSpacing: ".08em", textTransform: "uppercase" as const, marginBottom: 3 }}>Scan Barcode / Search Item &nbsp;<span style={{ color: MUTED, fontWeight: 600 }}>— type SKU or scan barcode, press Enter to add</span></div>
                  <input value={scanCode} onChange={e => setScanCode(e.target.value)} onKeyDown={handlePIScan} onFocus={() => setScanActive(true)} onBlur={() => setScanActive(false)}
                    placeholder="Scan or type item code…"
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 7, background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, fontSize: 13, fontFamily: "monospace", outline: "none" }} />
                </div>
                <div style={{ fontSize: 10, color: MUTED, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ background: "rgba(255,255,255,.06)", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "2px 7px", fontFamily: "monospace", fontWeight: 700, fontSize: 10 }}>F4</span>
                  <span>Item Search</span>
                </div>
              </div>

              {/* ── MAIN 2-COL LAYOUT ── */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 16, alignItems: "start" }}>

                {/* LEFT: Items + Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Items Table */}
                  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "11px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(99,102,241,.03)" }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: TEXT, display: "flex", alignItems: "center", gap: 7 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                        Invoice Items
                      </div>
                      <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{rows.filter(r => r.itemId).length} line items</div>
                    </div>
                    {isMobile ? (
                      <div style={{ padding: "10px 14px" }}>
                        {rows.map((r, i) => (
                          <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 5, textTransform: "uppercase" as const }}>Item {i + 1}</div>
                            <div style={{ fontWeight: 700, color: TEXT, marginBottom: 4 }}>{r.name || <span style={{ color: MUTED, fontStyle: "italic" }}>—</span>}</div>
                            {r.sku && <div style={{ fontSize: 10, color: ACCENT, fontFamily: "monospace", marginBottom: 6 }}>{r.sku}</div>}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div><div style={labelStyle()}>Qty</div><input type="number" value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} style={inp({ padding: "7px 9px", textAlign: "right" })} /></div>
                              <div><div style={labelStyle()}>Unit Cost</div><input type="number" value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} style={inp({ padding: "7px 9px", textAlign: "right" })} /></div>
                              <div><div style={labelStyle()}>Disc%</div><input type="number" value={r.discountPercent} onChange={e => updateRow(i, "discountPercent", e.target.value)} style={inp({ padding: "7px 9px", textAlign: "right" })} /></div>
                              <div><div style={labelStyle()}>Tax%</div><input type="number" value={r.taxPercent} onChange={e => updateRow(i, "taxPercent", e.target.value)} style={inp({ padding: "7px 9px", textAlign: "right" })} /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                          <thead>
                            <tr style={{ background: "rgba(99,102,241,.04)" }}>
                              {["#","SKU / Code","Product Name","Unit","Qty","Unit Cost","Disc%","Tax%","Total",""].map((h, hi) => (
                                <th key={hi} style={{ padding: "9px 8px", textAlign: hi >= 4 && hi < 9 ? "right" : hi === 9 ? "center" : "left", color: MUTED, fontWeight: 700, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 0.5, whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => {
                              const lineBase = (Number(r.qty) || 0) * (Number(r.rate) || 0);
                              const lineDisc = lineBase * (Number(r.discountPercent) || 0) / 100;
                              const lineTax = (lineBase - lineDisc) * (Number(r.taxPercent) || 0) / 100;
                              const lineTotal = lineBase - lineDisc + lineTax;
                              return (
                                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}
                                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.025)")}
                                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                  <td style={{ padding: "7px 8px", color: MUTED, fontSize: 11.5, width: 28 }}>{i + 1}</td>
                                  <td style={{ padding: "7px 8px", width: 90 }}>
                                    {r.sku ? <span style={{ fontFamily: "monospace", fontSize: 11, color: ACCENT, fontWeight: 700 }}>{r.sku}</span> : <span style={{ color: MUTED, fontSize: 11 }}>—</span>}
                                  </td>
                                  <td style={{ padding: "7px 8px", minWidth: 160 }}>
                                    <select value={r.itemId} onChange={e => {
                                      const item = allInventoryItems.find(it => it.id === e.target.value);
                                      if (item) {
                                        const copy = [...rows];
                                        copy[i] = { ...copy[i], itemId: item.id, name: item.name, description: item.description || "", sku: item.code || "", unit: item.unit || "", rate: item.purchaseRate || "" };
                                        if (i === copy.length - 1) copy.push(emptyRow());
                                        setRows(copy);
                                      } else {
                                        const copy = [...rows];
                                        copy[i] = { ...copy[i], itemId: "", name: "", sku: "", unit: "" };
                                        setRows(copy);
                                      }
                                    }} style={{ ...inp({ padding: "5px 7px", fontSize: 12.5 }), fontWeight: r.itemId ? 600 : 400 }}>
                                      <option value="">— Select Item —</option>
                                      {allInventoryItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                                    </select>
                                    {r.description && <div style={{ fontSize: 10, color: MUTED, marginTop: 2, paddingLeft: 2 }}>{r.description}</div>}
                                  </td>
                                  <td style={{ padding: "7px 8px", width: 64 }}>
                                    <input value={r.unit} onChange={e => updateRow(i, "unit", e.target.value)} placeholder="pcs" style={inp({ padding: "5px 6px", fontSize: 12, textAlign: "center" })} />
                                  </td>
                                  <td style={{ padding: "7px 8px", width: 76 }}><input type="number" value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 12.5 })} /></td>
                                  <td style={{ padding: "7px 8px", width: 96 }}><input type="number" value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} placeholder="0.00" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 12.5 })} /></td>
                                  <td style={{ padding: "7px 8px", width: 64 }}><input type="number" value={r.discountPercent} onChange={e => updateRow(i, "discountPercent", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 12.5 })} /></td>
                                  <td style={{ padding: "7px 8px", width: 64 }}><input type="number" value={r.taxPercent} onChange={e => updateRow(i, "taxPercent", e.target.value)} placeholder="0" style={inp({ padding: "5px 7px", textAlign: "right", fontSize: 12.5 })} /></td>
                                  <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, fontSize: 13, width: 96, color: lineTotal > 0 ? TEXT : MUTED, whiteSpace: "nowrap" }}>{lineTotal > 0 ? lineTotal.toLocaleString() : "—"}</td>
                                  <td style={{ padding: "7px 8px", width: 28, textAlign: "center" }}>
                                    <button onClick={() => { if (rows.length > 1) setRows(rows.filter((_, idx) => idx !== i)); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: 2, opacity: rows.length === 1 ? 0.2 : 0.6, lineHeight: 1 }} disabled={rows.length === 1}>×</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Notes + Payment + Batch row */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                    {/* Notes & Batch */}
                    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 11, color: TEXT }}>Notes & Batch Info</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        <div>
                          <div style={labelStyle()}>Notes</div>
                          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for this invoice…" rows={3} style={{ ...inp({ resize: "vertical" as const, fontSize: 12.5 }) }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                          <div>
                            <div style={labelStyle()}>Batch # (optional)</div>
                            <input value={batchNo} onChange={e => setBatchNo(e.target.value)} placeholder="e.g. B2024-01" style={inp({ fontSize: 12.5 })} />
                          </div>
                          <div>
                            <div style={labelStyle()}>Expiry Date (optional)</div>
                            <DateInput value={expiryDate} onChange={setExpiryDate} style={inp({ fontSize: 12.5 })} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Payment Terms */}
                    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 11, color: TEXT }}>Payment Terms</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        <div>
                          <div style={labelStyle()}>Payment Method</div>
                          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inp({ fontSize: 12.5 })}>
                            <option value="">Select Method</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Credit">Credit</option>
                          </select>
                        </div>
                        <div>
                          <div style={labelStyle()}>Payment Terms</div>
                          <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={inp({ fontSize: 12.5 })}>
                            <option value="">Select Terms</option>
                            <option value="Immediate">Immediate</option>
                            <option value="Net 15">Net 15 Days</option>
                            <option value="Net 30">Net 30 Days</option>
                            <option value="Net 45">Net 45 Days</option>
                            <option value="Net 60">Net 60 Days</option>
                          </select>
                        </div>
                        <div>
                          <div style={labelStyle()}>Global Tax</div>
                          <button type="button" onClick={() => { setApplyTax(!applyTax); if (!applyTax) setSelectedTaxId(""); }}
                            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: applyTax ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "rgba(37,99,235,.08)", color: applyTax ? "#fff" : ACCENT }}>
                            {applyTax ? "✓ Tax Applied" : "+ Add Global Tax"}
                          </button>
                          {applyTax && (
                            <div style={{ marginTop: 7 }}>
                              <select value={selectedTaxId} onChange={e => setSelectedTaxId(e.target.value)} style={inp({ fontSize: 12.5 })}>
                                <option value="">Select Tax</option>
                                {taxes.map(tax => <option key={tax.id} value={tax.id}>{tax.taxType} ({tax.taxCode}) — {tax.taxRate}%</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Invoice Summary Panel */}
                <div style={{ position: isMobile ? "static" : "sticky", top: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
                    {/* Summary header */}
                    <div style={{ padding: "13px 16px", borderBottom: `1px solid ${BORDER}`, background: "linear-gradient(135deg,rgba(37,99,235,.08),rgba(99,102,241,.06))" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 3 }}>Invoice Summary</div>
                      <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: ACCENT }}>{invoiceId || "Auto #"}</div>
                    </div>

                    {/* Line items */}
                    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: MUTED }}>Subtotal</span>
                        <span style={{ fontWeight: 600 }}>{cur} {subtotal.toLocaleString()}</span>
                      </div>
                      {perItemDiscountAmt > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#f87171" }}>
                          <span>Item Discounts</span><span>− {cur} {perItemDiscountAmt.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: MUTED }}>Discount</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <select value={discountType} onChange={e => setDiscountType(e.target.value)} style={{ ...inp({ width: 52, padding: "3px 5px", fontSize: 11 }) }}><option value="flat">Flat</option><option value="percent">%</option></select>
                          <input type="number" value={discount} onChange={e => setDiscount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" style={{ ...inp({ width: 74, padding: "3px 6px", fontSize: 12, textAlign: "right" }) }} />
                        </div>
                      </div>
                      {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#f87171" }}><span>Discount Amt</span><span>− {cur} {discountAmt.toLocaleString()}</span></div>}
                      {perItemTaxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#60a5fa" }}><span>Item Tax</span><span>+ {cur} {perItemTaxAmt.toLocaleString()}</span></div>}
                      {selectedTax && globalTaxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#60a5fa" }}><span>{selectedTax.taxType} ({selectedTax.taxRate}%)</span><span>+ {cur} {globalTaxAmt.toLocaleString()}</span></div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: MUTED }}>Freight</span>
                        <input type="number" value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" style={{ ...inp({ width: 90, padding: "3px 6px", fontSize: 12, textAlign: "right" }) }} />
                      </div>

                      {/* Grand Total */}
                      <div style={{ margin: "4px 0", padding: "10px 12px", borderRadius: 9, background: "linear-gradient(135deg,rgba(37,99,235,.12),rgba(99,102,241,.08))", border: "1px solid rgba(99,102,241,.18)" }}>
                        <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: 0.6, marginBottom: 3 }}>Grand Total</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: ACCENT, letterSpacing: -0.5 }}>{cur} {netTotal.toLocaleString()}</div>
                      </div>

                      {/* In Words */}
                      <div style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,.03)", border: `1px solid ${BORDER}`, fontSize: 11, color: MUTED, fontStyle: "italic", lineHeight: 1.4 }}>
                        {netTotal > 0 ? amountInWords(netTotal) : "—"}
                      </div>

                      {/* Payment method display */}
                      {paymentMethod && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                          <span style={{ color: MUTED }}>Payment</span>
                          <span style={{ fontWeight: 700, color: TEXT }}>{paymentMethod}</span>
                        </div>
                      )}

                      {/* Advance Payment */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                        <span style={{ color: MUTED }}>Advance Paid</span>
                        <input type="number" value={advancePayment} onChange={e => setAdvancePayment(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" style={{ ...inp({ width: 90, padding: "3px 6px", fontSize: 12, textAlign: "right" }) }} />
                      </div>

                      {/* Payable Amount */}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1.5px solid ${BORDER}`, paddingTop: 10, fontSize: 14, fontWeight: 800 }}>
                        <span>Payable Amount</span>
                        <span style={{ color: payableAmount > 0 ? "#f87171" : "#34d399" }}>{cur} {payableAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={saveInvoice} disabled={saving}
                        style={{ padding: "12px", borderRadius: 9, border: "none", background: saving ? "#374151" : "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontFamily: FONT, fontSize: 14, fontWeight: 800, cursor: saving ? "not-allowed" : "pointer", boxShadow: saving ? "none" : "0 4px 16px rgba(37,99,235,.4)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                        {saving ? (
                          <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Saving…</>
                        ) : (
                          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>{editing ? "Update Invoice" : "Save & Preview"}</>
                        )}
                      </button>
                      <button onClick={() => { setShowForm(false); resetForm(); }}
                        style={{ padding: "10px", borderRadius: 9, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SHORTCUTS BAR ── */}
              <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.02)", border: `1px solid ${BORDER}`, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, marginRight: 4 }}>Shortcuts:</span>
                {(piQueryMode ? [
                  { key: "F8", label: "Execute Query", c: "#facc15" },
                  { key: "Esc", label: "Cancel Query", c: undefined },
                ] : piQueryIdx >= 0 ? [
                  { key: "F7", label: "New Query", c: ACCENT },
                  { key: "PgDn", label: "Next Invoice", c: undefined },
                  { key: "PgUp", label: "Prev Invoice", c: undefined },
                  { key: "Esc", label: "Clear Query", c: undefined },
                ] : [
                  { key: "F2", label: "Supplier", c: undefined },
                  { key: "F4", label: "Item Search", c: undefined },
                  { key: "F7", label: "Query Mode", c: ACCENT },
                  { key: "F8", label: "Save Draft", c: "#34d399" },
                  { key: "F9", label: "Save & Post", c: "#3b82f6" },
                  { key: "Esc", label: "Clear", c: undefined },
                ]).map(s => (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 9px 3px 5px", borderRadius: 6, border: `1px solid ${s.c ? `${s.c}33` : BORDER}`, background: s.c ? `${s.c}0d` : "transparent" }}>
                    <span style={{ background: s.c ? `${s.c}22` : "rgba(255,255,255,.06)", color: s.c || MUTED, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800, fontFamily: "monospace", border: `1px solid ${s.c ? `${s.c}44` : BORDER}` }}>{s.key}</span>
                    <span style={{ fontSize: 10.5, color: s.c || MUTED, fontWeight: s.c ? 700 : 500 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PRINT STYLES ── */}
          {showPreview && (
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                .pi-print, .pi-print * { visibility: visible !important; }
                .pi-print { position: fixed !important; inset: 0 !important; }
                .pi-print.pi-a4 { width: 210mm !important; padding: 18mm 18mm 14mm !important; font-size: 11pt !important; }
                .pi-print.pi-55mm { width: 55mm !important; padding: 4mm 3mm !important; font-size: 7pt !important; }
                .no-print, .print\\:hidden { display: none !important; }
              }
            `}</style>
          )}

          {/* ── A4 PREVIEW ── */}
          {showPreview && (printMode === "none" || printMode === "a4") && (() => {
            const showDisc = perItemDiscountAmt > 0 || discountAmt > 0;
            const statusStyle = (s: string) => s === "APPROVED"
              ? { bg:"#dcfce7", color:"#166534", border:"#bbf7d0" }
              : s === "REJECTED"
              ? { bg:"#fee2e2", color:"#991b1b", border:"#fca5a5" }
              : s === "DRAFT"
              ? { bg:"#f1f5f9", color:"#475569", border:"#cbd5e1" }
              : { bg:"#fef9c3", color:"#713f12", border:"#fde68a" };
            const ss = statusStyle(approvalStatus);
            return (
            <div className="pi-print pi-a4" style={{
              background: "white", color: "#111",
              fontFamily: "'Outfit','Inter',sans-serif",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 8px 50px rgba(0,0,0,0.25)",
              maxWidth: 860, margin: "0 auto 32px",
            }}>
              {/* Accent strip */}
              <div style={{ height: 5, background: "linear-gradient(90deg,#6366f1,#818cf8,#22d3ee)" }} />

              {/* ── Header: Our Company + Invoice Details ── */}
              <div style={{ padding: "24px 36px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
                {/* Left: Company letterhead */}
                <div style={{ flex: 1 }}>
                  {companyInfo?.logoUrl && (
                    <img src={companyInfo.logoUrl} alt="" style={{ height: 44, marginBottom: 10, objectFit: "contain" }} />
                  )}
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", letterSpacing: -0.5, lineHeight: 1.1 }}>
                    {companyInfo?.name || "Your Company"}
                  </div>
                  {companyInfo?.address && (
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 5, maxWidth: 320, lineHeight: 1.55 }}>{companyInfo.address}</div>
                  )}
                  <div style={{ display: "flex", gap: 16, marginTop: 5, flexWrap: "wrap" }}>
                    {companyInfo?.phone && (
                      <div style={{ fontSize: 10.5, color: "#64748b" }}>📞 {companyInfo.phone}</div>
                    )}
                    {companyInfo?.ntn && (
                      <div style={{ fontSize: 10.5, color: "#64748b" }}>NTN: {companyInfo.ntn}</div>
                    )}
                  </div>
                </div>

                {/* Right: Invoice badge + meta + QR */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#1e293b", color: "white", padding: "7px 20px", borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase" as const, marginBottom: 14 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", flexShrink: 0 }} />
                    Purchase Invoice
                  </div>
                  <table style={{ fontSize: 12, borderCollapse: "collapse", marginLeft: "auto" }}>
                    <tbody>
                      {([
                        ["Invoice #", invoiceId || "—"],
                        ["Date",      fmtDate(date)],
                        ...(reference ? [["Ref", reference]] : []),
                      ] as [string,string][]).map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ padding: "3px 14px 3px 0", color: "#94a3b8", fontWeight: 600, fontSize: 11, textAlign: "right" }}>{k}</td>
                          <td style={{ padding: "3px 0", fontWeight: 800, color: "#0f172a", fontFamily: k === "Invoice #" ? "monospace" : "inherit", fontSize: k === "Invoice #" ? 13 : 12 }}>{v}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: "4px 14px 4px 0", color: "#94a3b8", fontWeight: 600, fontSize: 11, textAlign: "right" }}>Status</td>
                        <td style={{ padding: "4px 0" }}>
                          <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                            {approvalStatus}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {origin && savedInvoiceId && (
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ textAlign: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px" }}>
                        <QRCodeSVG value={`${origin}/view/purchase-invoice?id=${savedInvoiceId}`} size={62} />
                        <div style={{ fontSize: 7.5, fontWeight: 800, color: "#64748b", marginTop: 4, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>Scan for online bill</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Vendor / Supplier block ── */}
              <div style={{ padding: "13px 36px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#6366f111", border: "1px solid #6366f128", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 3 }}>Vendor / Supplier</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: -0.3 }}>{supplierName || "—"}</div>
                  {location && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Branch / Location: {location}</div>}
                </div>
              </div>

              {/* ── Items Table ── */}
              <div style={{ padding: "18px 36px 0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#1e293b" }}>
                      {(["#", "Item Description", "Unit", "Qty", "Rate", ...(showDisc ? ["Disc%"] : []), "Amount"] as string[]).map((h, hi) => (
                        <th key={hi} style={{
                          padding: "10px 0",
                          fontSize: 9, fontWeight: 800,
                          color: "rgba(255,255,255,.65)",
                          textTransform: "uppercase" as const, letterSpacing: 0.8,
                          textAlign: (h === "#" || h === "Item Description" ? "left" : h === "Amount" ? "right" : "center") as any,
                          paddingLeft: h === "#" ? 14 : h === "Item Description" ? 0 : 0,
                          paddingRight: h === "Amount" ? 14 : 0,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.name).map((r, i) => {
                      const lineAmt = (Number(r.qty) * Number(r.rate) || 0) * (1 - (Number(r.discountPercent) || 0) / 100);
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "11px 0 11px 14px", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ padding: "11px 12px 11px 0" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.name}</div>
                            {r.description && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{r.description}</div>}
                            {r.sku && <div style={{ fontSize: 9.5, color: "#6366f1", fontFamily: "monospace", marginTop: 1 }}>SKU: {r.sku}</div>}
                          </td>
                          <td style={{ padding: "11px 0", textAlign: "center", fontSize: 12, color: "#64748b" }}>{r.unit || "—"}</td>
                          <td style={{ padding: "11px 0", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.qty}</td>
                          <td style={{ padding: "11px 0", textAlign: "center", fontSize: 12, color: "#475569" }}>{Number(r.rate).toLocaleString()}</td>
                          {showDisc && (
                            <td style={{ padding: "11px 0", textAlign: "center", fontSize: 11, color: Number(r.discountPercent) > 0 ? "#f59e0b" : "#94a3b8" }}>
                              {Number(r.discountPercent) > 0 ? `${r.discountPercent}%` : "—"}
                            </td>
                          )}
                          <td style={{ padding: "11px 14px 11px 0", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
                            {lineAmt.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Totals ── */}
              <div style={{ padding: "18px 36px 28px", display: "flex", justifyContent: "flex-end", borderTop: "1.5px solid #e2e8f0", marginTop: 14 }}>
                <div style={{ minWidth: 270 }}>
                  {([
                    { label: "Sub Total",                   value: subtotal,          show: true },
                    { label: `Item Discounts`,              value: -perItemDiscountAmt, show: perItemDiscountAmt > 0 },
                    { label: `Discount (${discountType === "percent" ? `${discount}%` : "Flat"})`, value: -discountAmt, show: discountAmt > 0 },
                    { label: "Freight",                     value: Number(freight),   show: Number(freight) > 0 },
                    { label: selectedTax ? `${selectedTax.taxType} (${selectedTax.taxRate}%)` : "Tax", value: totalTax, show: totalTax > 0 },
                  ] as {label:string;value:number;show:boolean}[]).filter(r => r.show).map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
                      <span style={{ color: "#64748b", fontWeight: 600 }}>{r.label}</span>
                      <span style={{ color: r.value < 0 ? "#ef4444" : "#0f172a", fontWeight: 700, fontFamily: "monospace" }}>
                        {r.value < 0 ? "−" : ""}{cur} {Math.abs(r.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", background: "linear-gradient(135deg,#6366f1,#4f46e5)", borderRadius: 10, marginTop: 12, boxShadow: "0 6px 20px rgba(99,102,241,.35)" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "white", letterSpacing: 0.5 }}>NET PAYABLE</span>
                    <span style={{ fontSize: 17, fontWeight: 900, color: "white", fontFamily: "monospace" }}>{cur} {netTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* ── Notes / Payment Info ── */}
              {(notes || paymentMethod || paymentTerms) && (
                <div style={{ padding: "14px 36px 18px", borderTop: "1px solid #e2e8f0", background: "#fafafa" }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 1.2, marginBottom: 8 }}>Notes & Payment</div>
                  <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                    {notes && (
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.65 }}>{notes}</div>
                      </div>
                    )}
                    {(paymentMethod || paymentTerms) && (
                      <div style={{ fontSize: 11.5, color: "#64748b", display: "grid", gap: 4 }}>
                        {paymentMethod && <div><strong style={{ color: "#0f172a" }}>Method:</strong> {paymentMethod}</div>}
                        {paymentTerms  && <div><strong style={{ color: "#0f172a" }}>Terms:</strong> {paymentTerms}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Signatures ── */}
              <div style={{ padding: "0 36px 28px", display: "flex", gap: 24 }}>
                {["Prepared By", "Checked By", "Authorized By"].map(label => (
                  <div key={label} style={{ flex: 1, textAlign: "center", borderTop: "2px solid #e2e8f0", paddingTop: 8, marginTop: 52 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" as const, letterSpacing: 0.8 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* ── Footer ── */}
              <div style={{ padding: "10px 36px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: "white" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>Generated by FinovaOS · {fmtDate(new Date().toISOString())}</span>
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Computer generated document</div>
              </div>
            </div>
            );
          })()}

          {/* ── 55mm THERMAL PREVIEW ── */}
          {showPreview && (
            <div className="pi-print pi-55mm" style={{
              background: "white", color: "#000",
              fontFamily: "'Courier New',Courier,monospace",
              width: 220, margin: "0 auto 32px",
              padding: "10px 12px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
              borderRadius: 4,
              display: printMode === "55mm" ? "block" : "none",
            }}>
              {/* Header */}
              <div style={{ textAlign: "center", borderBottom: "1px dashed #555", paddingBottom: 6, marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>{supplierName || "Supplier"}</div>
                <div style={{ fontSize: 8, marginTop: 2, color: "#444" }}>PURCHASE INVOICE</div>
              </div>
              {/* Invoice info */}
              <div style={{ fontSize: 9, marginBottom: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>INV#:</span><strong>{invoiceId}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Date:</span><span>{fmtDate(date)}</span></div>
              </div>
              {/* Items */}
              <div style={{ borderTop: "1px dashed #555", borderBottom: "1px dashed #555", padding: "5px 0", marginBottom: 5 }}>
                {rows.filter(r => r.name).map((r, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#444" }}>
                      <span>{r.qty} x {Number(r.rate).toLocaleString()}</span>
                      <strong>{(Number(r.qty) * Number(r.rate)).toLocaleString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
              {/* Totals */}
              <div style={{ fontSize: 9 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total:</span><span>{subtotal.toLocaleString()}</span></div>
                {Number(freight) > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Freight:</span><span>{Number(freight).toLocaleString()}</span></div>}
                {selectedTax && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{selectedTax.taxType}:</span><span>{globalTaxAmt.toLocaleString()}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 11, borderTop: "1px solid #000", paddingTop: 3, marginTop: 3 }}>
                  <span>NET:</span><span>{netTotal.toLocaleString()}</span>
                </div>
              </div>
              {/* QR */}
              {origin && invoiceId && (
                <div style={{ textAlign: "center", marginTop: 6 }}>
                  <QRCodeSVG value={`${origin}/view/purchase-invoice?id=${savedInvoiceId || invoiceId}`} size={56} />
                  <div style={{ fontSize: 7, marginTop: 2 }}>Scan for online bill</div>
                </div>
              )}
              <div style={{ textAlign: "center", fontSize: 7, marginTop: 8, color: "#666" }}>FinovaOS · Computer generated</div>
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PurchaseInvoicePage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading Invoice...</div>}>
      <PurchaseInvoiceContent />
    </Suspense>
  );
}
