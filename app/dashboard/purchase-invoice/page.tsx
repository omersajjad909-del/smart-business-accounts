"use client";

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
        setSuppliers(list.filter((a: Any) => a.partyType === "SUPPLIER"));
      });

    // Load tax configurations
    fetch("/api/tax-configuration")
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
      };
      const body = editing ? { id: editing.id, ...baseBody } : baseBody;

      const res = await fetch("/api/purchase-invoice", {
        method,
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get("content-type") || "";
      let data: Any = null;
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
    } catch (err: Any) {
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
    setDate(new Date(inv.date).toISOString().slice(0, 10));
    setRows(inv.items.map((it: Any) => ({
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
    if (!confirm("Are you sure you want to delete this invoice?")) return;
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Purchase Invoice</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowList(!showList); setShowForm(!showForm); setEditing(null); }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => { setShowForm(true); setShowList(false); resetForm(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New Invoice
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Invoice No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">No invoices found</td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{inv.invoiceNo}</td>
                    <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="p-3">{inv.supplier?.name || "N/A"}</td>
                    <td className="p-3 text-right">{inv.total.toLocaleString()}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(inv)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <>
          <div className="flex justify-between items-center bg-gray-50 p-4 border rounded print:hidden">
            <div>
              <h1 className="text-xl font-bold">
                {editing ? "Edit Invoice" : "Purchase Invoice"}
              </h1>
              {invoiceId && (
                <div className="mt-1">
                   <Barcode value={invoiceId} width={1} height={30} fontSize={12} displayValue={true} />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {!showPreview ? (
                <button onClick={saveInvoice} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow-md transition-all">
                  {saving ? "Saving..." : editing ? "Update Invoice" : "Save & Preview"}
                </button>
              ) : (
              
                <>

                <input
  type="text"
  placeholder="Search invoices..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="border px-3 py-2 rounded w-full md:w-64"
/>

                  <button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow-md">
                    Print / Download PDF
                  </button>
                  <button 
                    onClick={sendInvoiceEmail} 
                    disabled={sendingEmail}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow-md disabled:bg-gray-400"
                  >
                    {sendingEmail ? "Sending..." : "📧 Email"}
                  </button>
                  <button onClick={() => setShowPreview(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded border font-bold">
                    Back to Edit
                  </button>
                </>
              )}
              <button onClick={() => { setShowForm(false); setEditing(null); resetForm(); }} className="bg-gray-600 text-white px-6 py-2 rounded font-bold">
                Cancel
              </button>
            </div>
          </div>

          {!showPreview && (
            <div className="bg-white border p-6 rounded space-y-6 shadow-sm">
              <div className="mb-2 text-xs text-gray-500 italic">
                💡 Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Supplier | <strong>F8</strong> = Search Query
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-bold">Supplier (F7: Clear, F8: Query)</label>
                  <select ref={supplierRef} className="border p-2 rounded w-full" value={supplierId} onChange={e => handleSupplierChange(e.target.value)}>
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <select className="border p-2 bg-yellow-50 rounded" value={selectedPoId} onChange={e => handlePoSelection(e.target.value)}>
                  <option value="">-- Select PO --</option>
                  {filteredPOs.map(p => <option key={p.id} value={p.id}>{p.poNo}</option>)}
                </select>

                <div>
                  <label className="text-xs font-bold">Date (F7: Clear)</label>
                  <input type="date" className="border p-2 rounded w-full" value={date} onChange={e => setDate(e.target.value)} />
                </div>

                <select className="border p-2 rounded" value={location} onChange={e => setLocation(e.target.value)}>
                  <option value="MAIN">Main</option>
                  <option value="SHOP">Shop</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border text-sm min-w-[600px]">
                  <thead className="bg-gray-100 font-bold">
                  <tr>
                    <th className="border p-2 text-left">Item</th>
                    <th className="border p-2 w-24 text-center">Qty</th>
                    <th className="border p-2 w-32 text-center">Rate</th>
                    <th className="border p-2 w-32 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border p-2">
                        <div className="font-medium uppercase">{r.name}</div>
                        {r.description && <div className="text-xs text-gray-500">{r.description}</div>}
                      </td>
                      <td className="border p-2">
                        <input type="number" className="w-full text-center outline-none" value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} />
                      </td>
                      <td className="border p-2">
                        <input type="number" className="w-full text-center outline-none" value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} />
                      </td>
                      <td className="border p-2 text-right font-mono font-bold">{(Number(r.qty) * Number(r.rate) || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-80 p-4 border bg-gray-50 rounded space-y-2">
                  <div className="flex justify-between text-sm"><span>Gross Total:</span><span>{total.toLocaleString()}</span></div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Freight:</span>
                    <input type="number" className="border w-32 text-right p-1 rounded" value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} />
                  </div>
                  
                  {/* Tax Section */}
                  <div className="border-t pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setApplyTax(!applyTax);
                        if (!applyTax) setSelectedTaxId("");
                      }}
                      className={`w-full py-1 px-2 rounded font-semibold text-sm ${
                        applyTax ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {applyTax ? "✓ Tax Applied" : "+ Add Tax"}
                    </button>
                    
                    {applyTax && (
                      <div className="space-y-2">
                        <select
                          value={selectedTaxId}
                          onChange={e => setSelectedTaxId(e.target.value)}
                          className="w-full border p-1 text-sm"
                        >
                          <option value="">Select Tax</option>
                          {taxes.map(tax => (
                            <option key={tax.id} value={tax.id}>
                              {tax.taxType} ({tax.taxCode}) - {tax.taxRate}%
                            </option>
                          ))}
                        </select>
                        {selectedTax && (
                          <div className="flex justify-between text-sm text-blue-600">
                            <span>{selectedTax.taxType} ({selectedTax.taxRate}%)</span>
                            <span>{taxAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between font-black text-lg border-t pt-2 text-blue-900 uppercase"><span>Net Payable:</span><span>{netTotal.toLocaleString()}</span></div>
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
