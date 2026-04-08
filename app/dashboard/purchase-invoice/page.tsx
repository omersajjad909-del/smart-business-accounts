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
  items: POItem[];
};

type PurchaseInvoice = {
  id: string;
  invoiceNo: string;
  date: string;
  supplierId: string;
  supplier?: { name: string };
  total: number;
  approvalStatus?: string;
  items: Array<{ item: { name: string }; qty: number; rate: number }>;
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

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
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
    fetch("/api/accounts", { headers: { "x-user-role": user?.role || "ADMIN" } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts;
        setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER"));
      });

    // Load tax configurations
    fetch("/api/tax-configuration", { headers: { "x-user-role": user?.role || "ADMIN" } })
      .then(r => r.json())
      .then(d => setTaxes(Array.isArray(d) ? d : []))
      .catch(err => console.log("Tax config error:", err));

    fetch("/api/purchase-invoice", {
      headers: { "x-user-role": user?.role || "ADMIN" },
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllPOs(data);
      });
  }, []);

  useEffect(() => {
    if (queryId) {
      fetch(`/api/purchase-invoice?id=${queryId}`, {
         headers: { "x-user-role": user?.role || "ADMIN" }
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
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (e) {
      console.error("Load invoices error:", e);
    }
  }

  function handleSupplierChange(id: string) {
    setSupplierId(id);
    const s = suppliers.find(x => x.id === id);
    setSupplierName(s?.name || "");
    const pos = allPOs.filter(p => p.supplierId === id);
    setFilteredPOs(pos);
    setSelectedPoId("");
    setRows([{ itemId: "", name: "", description: "", qty: "", rate: "" }]);
  }

  function handlePoSelection(poId: string) {
    setSelectedPoId(poId);
    const po = filteredPOs.find(p => p.id === poId);
    if (!po) return;

    setRows(
      po.items
        .map(pi => ({
          itemId: pi.itemId,
          name: pi.item.name,
          description: pi.item.description || "",
          qty: Math.max(0, pi.qty - pi.invoicedQty),
          rate: pi.rate,
        }))
        .filter(r => r.qty > 0)
    );
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
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" },
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
        headers: { "x-user-role": user?.role || "ADMIN" },
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
    <div style={{ padding: 24, maxWidth: 1380, margin: "0 auto", fontFamily: FONT, color: TEXT }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Purchase Invoice</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: MUTED }}>{invoices.length} total purchase invoices</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
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

                <input
  type="text"
  placeholder="Search invoices..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  style={{ ...inp({ width: 220 }) }}
/>

                  <button onClick={() => window.print()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Print / PDF
                  </button>
                  <button 
                    onClick={sendInvoiceEmail} 
                    disabled={sendingEmail}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "rgba(99,102,241,0.14)", color: TEXT, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: sendingEmail ? "not-allowed" : "pointer", opacity: sendingEmail ? 0.7 : 1 }}
                  >
                    {sendingEmail ? "Sending..." : "Email Invoice"}
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 330px", gap: 18, alignItems: "start" }}>
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

                <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18, position: "sticky", top: 24 }}>
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

          {/* PREVIEW */}
          {showPreview && (
            <div className="invoice-print bg-white mx-auto text-black">
              <div className="flex justify-between border-b-4 border-black pb-4 mb-6">
                <div>
                  <h1 className="text-4xl font-black italic tracking-tighter">US TRADERS</h1>
                  <p className="text-[10px] font-bold uppercase tracking-[3px] text-gray-600">Industrial Goods & Services</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black uppercase underline">Purchase Invoice</h2>
                  <p className="text-sm font-bold mt-1">INV #: {invoiceId}</p>
                  <p className="text-sm">Date: {date}</p>
                  {invoiceId && (
                    <div className="flex flex-col items-end gap-2 mt-2">
                      <div className="text-center">
                        <Barcode value={invoiceId} width={1.5} height={40} fontSize={14} displayValue={false} />
                        <span className="text-[10px] font-bold">INV ID: {invoiceId}</span>
                      </div>
                      
                      {origin && (
                        <div className="flex flex-col items-center mt-2 border-t pt-2">
                          <QRCodeSVG value={`${origin}/view/purchase-invoice?id=${invoiceId}`} size={80} />
                          <span className="text-[10px] font-bold mt-1 bg-black text-white px-1">SCAN FOR ONLINE BILL</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[10px] uppercase font-bold text-gray-400">Vendor / Supplier:</p>
                <p className="text-xl font-black uppercase">{supplierName}</p>
                <p className="text-xs font-bold italic">Location: {location}</p>
              </div>

              <table className="w-full text-sm border-collapse border border-black">
                <thead>
                  <tr className="bg-black text-white border border-black uppercase text-[10px]">
                    <th className="p-2 border border-black text-center w-12">Sr.</th>
                    <th className="p-2 border border-black text-left">Description of Items</th>
                    <th className="p-2 border border-black text-center w-24">Qty</th>
                    <th className="p-2 border border-black text-center w-32">Rate</th>
                    <th className="p-2 border border-black text-right w-36">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border border-black font-bold">
                      <td className="p-3 border border-black text-center">{i + 1}</td>
                      <td className="p-3 border border-black">
                        <div className="uppercase">{r.name}</div>
                        {r.description && <div className="text-[10px] font-normal leading-tight lowercase text-gray-600">{r.description}</div>}
                      </td>
                      <td className="p-3 border border-black text-center">{r.qty}</td>
                      <td className="p-3 border border-black text-center">{Number(r.rate).toLocaleString()}</td>
                      <td className="p-3 border border-black text-right font-mono">{(Number(r.qty) * Number(r.rate)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mt-4">
                <div className="w-72 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold border-b border-black pb-1"><span>SUB-TOTAL:</span><span>{total.toLocaleString()}</span></div>
                  <div className="flex justify-between text-[11px] font-bold border-b border-black pb-1"><span>FREIGHT:</span><span>{Number(freight || 0).toLocaleString()}</span></div>
                  {selectedTax && (
                    <div className="flex justify-between text-[11px] font-bold border-b border-black pb-1">
                      <span>{selectedTax.taxType.toUpperCase()} ({selectedTax.taxRate}%):</span>
                      <span>{taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-2xl font-black border-t-2 border-black pt-1 bg-gray-50 p-2">
                    <span>NET:</span>
                    <span>{netTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-32 flex justify-between px-10">
                <div className="text-center w-48 border-t-2 border-black pt-1 text-[10px] font-bold uppercase">Prepared By</div>
                <div className="text-center w-48 border-t-2 border-black pt-1 text-[10px] font-bold uppercase">Authorized Sign</div>
              </div>
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
