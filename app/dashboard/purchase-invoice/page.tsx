"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth";

const Barcode = dynamic(() => import("react-barcode"), { 
  ssr: false,
  loading: () => <p>Loading Barcode...</p>
});
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
};

type TaxConfig = {
  id: string;
  taxType: string;
  taxCode: string;
  taxRate: number;
  description?: string;
};

type Currency = {
  id: string;
  code: string;
  name: string;
  exchangeRate: number;
};

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

  const [rows, setRows] = useState<Row[]>([
    { itemId: "", name: "", description: "", qty: "", rate: "" },
  ]);

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [printMode, setPrintMode] = useState<"none" | "a4" | "55mm">("none");
  const [origin, setOrigin] = useState("");

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

  // Keyboard shortcuts - F7: Clear date/supplier, F8: Query dialog
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.code === "F7" || e.key === "F7") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !showPreview) {
          setDate(today);
          setSupplierId("");
          setSupplierName("");
        }
      }
      if (e.code === "F8" || e.key === "F8") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !showPreview) {
          const query = prompt("Enter search query (Invoice No, Supplier Name, etc.):");
          if (query) {
            const foundSupplier = suppliers.find(s => 
              s.name.toLowerCase().includes(query.toLowerCase())
            );
            if (foundSupplier) {
              setSupplierId(foundSupplier.id);
              setSupplierName(foundSupplier.name);
              handleSupplierChange(foundSupplier.id);
            } else {
              toast.error(`No supplier found matching "${query}"`);
            }
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyPress, true);
    return () => document.removeEventListener("keydown", handleKeyPress, true);
  }, [today, showForm, showPreview, suppliers]);

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
    setRows([{ itemId: "", name: "", description: "", qty: "", rate: "" }]);
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
      setRows([{ itemId: "", name: "", description: "", qty: "", rate: "" }]);
    }
  }, [supplierId, allPOs, allGrns, invoices, editing, selectedPoId]);

  function handlePoSelection(poId: string) {
    setSelectedPoId(poId);
    const po = filteredPOs.find(p => p.id === poId);
    if (!po) return;
    const nextRows = getInvoiceableRowsForPo(po);
    setRows(nextRows.length > 0 ? nextRows : [{ itemId: "", name: "", description: "", qty: "", rate: "" }]);
  }

  function updateRow(index: number, key: "qty" | "rate", value: string) {
    const copy = [...rows];
    copy[index][key] = value === "" ? "" : Number(value);
    setRows(copy);
  }

  const total = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.rate) || 0), 0);
  const selectedTax = taxes.find(t => t.id === selectedTaxId);
  const taxAmount = applyTax && selectedTax ? (total * (selectedTax.taxRate / 100)) : 0;
  const netTotal = total + (Number(freight) || 0) + taxAmount;

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
        location,
        freight: Number(freight) || 0,
        items: clean,
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
        setInvoiceId((typeof data === "object" && data.invoiceNo) ? data.invoiceNo : (data?.id || invoiceId));
        setSavedInvoiceId((typeof data === "object" && data.id) ? data.id : (editing?.id || null));
        setShowPreview(true);
        await loadInvoices();
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
    setEditing(inv);
    setInvoiceId(inv.invoiceNo);
    setSupplierId(inv.supplierId);
    setSupplierName(inv.supplier?.name || "");
    setApprovalStatus(inv.approvalStatus || "PENDING");
    setDate(new Date(inv.date).toISOString().slice(0, 10));
    setRows(inv.items.map((it: any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      description: it.item?.description || "",
      qty: it.qty.toString(),
      rate: it.rate.toString(),
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
    setLocation("MAIN");
    setFreight("");
    setApprovalStatus("PENDING");
    setRows([{ itemId: "", name: "", description: "", qty: "", rate: "" }]);
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
  const filteredInvoices = invoices.filter(inv => {
  if (!searchTerm.trim()) return true;

  const term = searchTerm.toLowerCase();

  return (
    inv.invoiceNo?.toLowerCase().includes(term) ||
    inv.supplier?.name?.toLowerCase().includes(term) ||
    inv.date?.toLowerCase().includes(term)
  );
});


  return (
    <div style={{ padding: isMobile ? 12 : 24, maxWidth: 1380, margin: "0 auto", fontFamily: FONT, color: TEXT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Purchase Invoice</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: MUTED }}>{invoices.length} total purchase invoices</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => { setShowList(!showList); setShowForm(showList); setEditing(null); }}
            style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: showList ? "rgba(99,102,241,0.12)" : PANEL, color: showList ? ACCENT : TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => { setShowForm(true); setShowList(false); resetForm(); }}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}
          >
            + New Invoice
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 800 }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.07)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7 }}>Invoice No</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7 }}>Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7 }}>Supplier</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7 }}>Total</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px 16px", textAlign: "center", color: MUTED }}>No invoices found</td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => (
                    <tr key={inv.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "13px 16px", fontWeight: 700, color: ACCENT, fontFamily: "monospace", fontSize: 13 }}>{inv.invoiceNo}</td>
                      <td style={{ padding: "13px 16px", color: MUTED }}>{fmtDate(inv.date)}</td>
                      <td style={{ padding: "13px 16px", fontWeight: 600 }}>{inv.supplier?.name || "N/A"}</td>
                      <td style={{ padding: "13px 16px", textAlign: "right", fontWeight: 700 }}>{inv.total.toLocaleString()}</td>
                      <td style={{ padding: "13px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <button onClick={() => startEdit(inv)} style={{ padding: "5px 13px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.35)", background: "rgba(99,102,241,0.08)", color: ACCENT, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer", marginRight: 8 }}>Edit</button>
                        <button onClick={() => deleteInvoice(inv.id)} style={{ padding: "5px 13px", borderRadius: 6, border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.07)", color: "#f87171", fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "11px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>{filteredInvoices.length} invoices in view</div>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <>
          <div className="print:hidden" style={{ background: PANEL, border: `1.5px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginTop: showList ? 24 : 0 }}>
            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(37,99,235,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h3"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{editing ? "Edit Purchase Invoice" : "New Purchase Invoice"}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Follow the same clean workflow as PO and GRN, with faster matching and clearer totals</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {!showPreview ? (
                <button onClick={saveInvoice} disabled={saving} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}>
                  {saving ? "Saving..." : editing ? "Update Invoice" : "Save & Preview"}
                </button>
              ) : (
                <>
                  <button onClick={() => { setPrintMode("a4"); setTimeout(() => window.print(), 150); }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#1e293b", color: "#f1f5f9", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>
                    Print A4
                  </button>
                  <button onClick={() => { setPrintMode("55mm"); setTimeout(() => window.print(), 150); }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#1e293b", color: "#f1f5f9", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Print 55mm
                  </button>
                  <button
                    onClick={sendInvoiceEmail}
                    disabled={sendingEmail}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: sendingEmail ? "not-allowed" : "pointer", opacity: sendingEmail ? 0.7 : 1 }}
                  >
                    {sendingEmail ? "Sending..." : "📧 Email Invoice"}
                  </button>
                  <button onClick={() => setShowPreview(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    Back to Edit
                  </button>
                </>
              )}
              <button onClick={() => { setShowForm(false); setEditing(null); resetForm(); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontFamily: FONT, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>

          {!showPreview && (
            <div style={{ padding: 22 }}>
              <div style={{ marginBottom: 16, fontSize: 12, color: MUTED, fontStyle: "italic" }}>
                Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Supplier | <strong>F8</strong> = Search Query
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
                <div>
                  <div style={labelStyle()}>Supplier (F7 / F8)</div>
                  <select ref={supplierRef} value={supplierId} onChange={e => handleSupplierChange(e.target.value)} style={inp()}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <div style={labelStyle()}>Against Purchase Order</div>
                  <select value={selectedPoId} onChange={e => handlePoSelection(e.target.value)} style={inp()}>
                    <option value="">-- Select PO --</option>
                    {filteredPOs.map(p => <option key={p.id} value={p.id}>{p.poNo}</option>)}
                  </select>
                </div>

                <div>
                  <div style={labelStyle()}>Invoice Date</div>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp(), colorScheme: "dark" }} />
                </div>
                <div>
                  <div style={labelStyle()}>Currency</div>
                  <select
                    style={inp()}
                    value={currencyId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setCurrencyId(nextId);
                      const cur = currencies.find((c) => c.id === nextId);
                      if (cur) setExchangeRate(cur.exchangeRate || 1);
                    }}
                  >
                    <option value="">Base Currency</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={labelStyle()}>Exchange Rate</div>
                  <input
                    type="number"
                    style={inp()}
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                  />
                </div>

                <div>
                  <div style={labelStyle()}>Approval Status</div>
                  <select
                    style={inp()}
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div>
                  <div style={labelStyle()}>Location</div>
                  <select value={location} onChange={e => setLocation(e.target.value)} style={inp()}>
                    <option value="MAIN">Main</option>
                    <option value="SHOP">Shop</option>
                  </select>
                </div>
                <div>
                  <div style={labelStyle()}>Invoice Code</div>
                  <div style={{ ...inp({ fontFamily: "monospace", fontWeight: 700, color: ACCENT, background: "rgba(99,102,241,0.06)" }) }}>{invoiceId || "Auto-generated after save"}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 330px", gap: 18, alignItems: "start" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>Invoice Items</div>
                      <div style={{ fontSize: 11, color: MUTED }}>Pulled from PO or adjusted before posting</div>
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>{rows.length} line items</div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead>
                  <tr style={{ background: "rgba(99,102,241,0.07)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7 }}>Item</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, width: 110 }}>Qty</th>
                    <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, width: 140 }}>Rate</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", color: MUTED, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.7, width: 150 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, color: TEXT }}>{r.name || "Unselected Item"}</div>
                        {r.description && <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{r.description}</div>}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <input type="number" value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} style={{ ...inp({ textAlign: "center", padding: "8px 10px" }) }} />
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <input type="number" value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} style={{ ...inp({ textAlign: "center", padding: "8px 10px" }) }} />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{(Number(r.qty) * Number(r.rate) || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, position: isMobile ? "static" : "sticky", top: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Totals & Charges</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
                    <span style={{ color: MUTED }}>Gross Total</span>
                    <strong>{total.toLocaleString()}</strong>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={labelStyle()}>Freight</div>
                    <input type="number" value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} style={{ ...inp({ textAlign: "right" }) }} />
                  </div>
                  
                  {/* Tax Section */}
                  <div style={{ paddingTop: 14, borderTop: `1px solid ${BORDER}`, marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setApplyTax(!applyTax);
                        if (!applyTax) setSelectedTaxId("");
                      }}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", background: applyTax ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "rgba(255,255,255,0.06)", color: applyTax ? "#fff" : TEXT }}
                    >
                      {applyTax ? "Tax Applied" : "+ Add Tax"}
                    </button>
                    
                    {applyTax && (
                      <div style={{ marginTop: 12 }}>
                        <select
                          value={selectedTaxId}
                          onChange={e => setSelectedTaxId(e.target.value)}
                          style={inp()}
                        >
                          <option value="">Select Tax</option>
                          {taxes.map(tax => (
                            <option key={tax.id} value={tax.id}>
                              {tax.taxType} ({tax.taxCode}) - {tax.taxRate}%
                            </option>
                          ))}
                        </select>
                        {selectedTax && (
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 13, color: "#60a5fa" }}>
                            <span>{selectedTax.taxType} ({selectedTax.taxRate}%)</span>
                            <strong>{taxAmount.toLocaleString()}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ paddingTop: 14, borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: MUTED, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase" }}>Net Payable</div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 3 }}>{netTotal.toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, textAlign: "right" }}>{supplierName || "No supplier selected"}</div>
                  </div>
                </div>
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
          {showPreview && (printMode === "none" || printMode === "a4") && (
            <div className="pi-print pi-a4" style={{
              background: "white", color: "#111",
              fontFamily: "'Outfit','Inter',sans-serif",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 8px 50px rgba(0,0,0,0.25)",
              maxWidth: 860, margin: "0 auto 32px",
            }}>
              {/* Top bar */}
              <div style={{ height: 5, background: "#111" }} />

              {/* Header */}
              <div style={{ padding: "28px 36px 20px", borderBottom: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: -0.8, lineHeight: 1 }}>{supplierName ? supplierName : "—"}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginTop: 5 }}>Vendor / Supplier</div>
                  {location && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>Location: {location}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ background: "#0f172a", color: "white", padding: "5px 16px", borderRadius: 6, fontSize: 11, fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 10, display: "inline-block" }}>
                    Purchase Invoice
                  </div>
                  <table style={{ fontSize: 12, borderCollapse: "collapse", marginLeft: "auto" }}>
                    <tbody>
                      {[["Invoice #", invoiceId], ["Date", fmtDate(date)], ["Status", approvalStatus]].map(([k, v]) => (
                        <tr key={k}>
                          <td style={{ padding: "2px 12px 2px 0", color: "#94a3b8", fontWeight: 600, textAlign: "right" }}>{k}</td>
                          <td style={{ padding: "2px 0", fontWeight: 800, color: "#0f172a", fontFamily: k === "Invoice #" ? "monospace" : "inherit" }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Barcode + QR */}
                  {invoiceId && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <Barcode value={invoiceId} width={1.2} height={36} fontSize={10} displayValue={false} background="white" lineColor="#111" />
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#475569" }}>INV: {invoiceId}</div>
                      </div>
                      {origin && (
                        <div style={{ textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: 6 }}>
                          <QRCodeSVG value={`${origin}/view/purchase-invoice?id=${savedInvoiceId || invoiceId}`} size={64} />
                          <div style={{ fontSize: 8, fontWeight: 800, background: "#111", color: "white", padding: "1px 4px", marginTop: 3 }}>SCAN FOR ONLINE BILL</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ padding: "0 36px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #0f172a" }}>
                      {[["#","left",30],["Item Description","left","auto"],["Qty","center",70],["Rate","right",110],["Amount","right",120]].map(([label, align, w]) => (
                        <th key={label as string} style={{ padding: "12px 0 8px", textAlign: align as any, fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: w as any }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.name).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "11px 0", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "11px 0" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.name}</div>
                          {r.description && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{r.description}</div>}
                        </td>
                        <td style={{ padding: "11px 0", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.qty}</td>
                        <td style={{ padding: "11px 0", textAlign: "right", fontSize: 12, color: "#475569" }}>{Number(r.rate).toLocaleString()}</td>
                        <td style={{ padding: "11px 0", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{(Number(r.qty) * Number(r.rate)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div style={{ padding: "16px 36px 28px", display: "flex", justifyContent: "flex-end", borderTop: "1.5px solid #e2e8f0", marginTop: 4 }}>
                <div style={{ minWidth: 240 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <tbody>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "7px 0", color: "#64748b", fontWeight: 600 }}>Sub Total</td>
                        <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{total.toLocaleString()}</td>
                      </tr>
                      {Number(freight) > 0 && (
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "7px 0", color: "#64748b", fontWeight: 600 }}>Freight</td>
                          <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{Number(freight).toLocaleString()}</td>
                        </tr>
                      )}
                      {selectedTax && (
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "7px 0", color: "#64748b", fontWeight: 600 }}>{selectedTax.taxType} ({selectedTax.taxRate}%)</td>
                          <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{taxAmount.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr style={{ background: "#0f172a" }}>
                        <td style={{ padding: "10px 12px", color: "white", fontWeight: 800, fontSize: 13, borderRadius: "4px 0 0 4px" }}>NET PAYABLE</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", color: "white", fontWeight: 900, fontSize: 15, borderRadius: "0 4px 4px 0" }}>{netTotal.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div style={{ padding: "0 36px 28px", display: "flex", gap: 32 }}>
                {["Prepared By", "Checked By", "Authorized By"].map(label => (
                  <div key={label} style={{ flex: 1, textAlign: "center", borderTop: "1.5px solid #cbd5e1", paddingTop: 7, marginTop: 40 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: "10px 36px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Generated by FinovaOS · {fmtDate(new Date().toISOString())}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>Computer generated document</div>
              </div>
            </div>
          )}

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
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total:</span><span>{total.toLocaleString()}</span></div>
                {Number(freight) > 0 && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Freight:</span><span>{Number(freight).toLocaleString()}</span></div>}
                {selectedTax && <div style={{ display: "flex", justifyContent: "space-between" }}><span>{selectedTax.taxType}:</span><span>{taxAmount.toLocaleString()}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 11, borderTop: "1px solid #000", paddingTop: 3, marginTop: 3 }}>
                  <span>NET:</span><span>{netTotal.toLocaleString()}</span>
                </div>
              </div>
              {/* Barcode */}
              {invoiceId && (
                <div style={{ textAlign: "center", marginTop: 8, borderTop: "1px dashed #555", paddingTop: 6 }}>
                  <Barcode value={invoiceId} width={1} height={28} fontSize={8} displayValue={true} background="white" lineColor="#000" />
                </div>
              )}
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
