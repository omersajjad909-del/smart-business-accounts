"use client";
import { fmtDate } from "@/lib/dateUtils";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";
import { useRouter } from "next/navigation";

type Account = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  description?: string;
  availableQty: number;
};
type Row = {
  itemId: string;
  name: string;
  description: string;
  availableQty: number;
  qty: number | "";
  rate: number | "";
};

type Quotation = {
  id: string;
  quotationNo: string;
  date: string;
  customerId: string;
  customer?: { name: string };
  total: number;
  items: Array<{ item: { name: string; description?: string }; qty: number; rate: number }>;
  status: string;
};

type TaxConfig = {
  id: string;
  taxType: string;
  taxCode: string;
  taxRate: number;
  description?: string;
};

type PrintPreferences = {
  paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM";
  showLogo: boolean;
  logoUrl: string;
  headerNote: string;
  footerNote: string;
  thermalFontSize: "sm" | "md" | "lg";
};

export default function QuotationPage() {
  const _router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<Account[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<Quotation | null>(null);

  const [quotationNo, setQuotationNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(today);
  const [validUntil, setValidUntil] = useState("");
  const [freight, setFreight] = useState<number | "">("");
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState<Row[]>([{
    itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "",
  }]);
  const [searchTerm, _setSearchTerm] = useState("");

  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [printMode, setPrintMode] = useState<"none" | "a4" | "55mm">("none");
  const [savedQuotation, setSavedQuotation] = useState<any>(null);
  const [_sendingEmail, _setSendingEmail] = useState(false);
  const [hideRates, setHideRates] = useState(false);
  const [companyName, setCompanyName] = useState("FINOVA SME");
  const [printPrefs, setPrintPrefs] = useState<PrintPreferences>({
    paperSize: "A4",
    showLogo: true,
    logoUrl: "",
    headerNote: "",
    footerNote: "Thank you for your business!",
    thermalFontSize: "md",
  });
  const isThermalPrint = printPrefs.paperSize !== "A4";
  const thermalWidth = printPrefs.paperSize === "THERMAL_58MM" ? "58mm" : "80mm";
  
  // Tax states
  const [applyTax, setApplyTax] = useState(false);
  const [selectedTaxId, setSelectedTaxId] = useState("");
  const [taxes, setTaxes] = useState<TaxConfig[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!hasPermission(user, PERMISSIONS.CREATE_QUOTATION)) {
      setLoading(false);
      return;
    }
    setAuthorized(true);
    
    // Load initial data
    loadQuotations();
    
    fetch("/api/accounts", {
      headers: { "x-user-role": user.role },
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts || [];
        setCustomers(list.filter((a: any) => a.partyType === "CUSTOMER"));
      });

    fetch("/api/items-new")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []));

    fetch("/api/tax-configuration")
      .then(r => r.json())
      .then(d => setTaxes(Array.isArray(d) ? d : []))
      .catch(err => console.log("Tax config error:", err));
      
    fetch("/api/quotation", {
        headers: {
            "x-user-role": user.role || "",
            "x-user-id": user.id || ""
        }
    })
    .then(r => r.json())
    .then(d => {
        if(d?.nextNo) setQuotationNo(d.nextNo);
    });

    fetch("/api/me/company")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.name) setCompanyName(d.name); });

    fetch("/api/company/admin-control")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.printPreferences) {
          setPrintPrefs((prev) => ({
            ...prev,
            paperSize: d.printPreferences.paperSize || prev.paperSize,
            showLogo: d.printPreferences.showLogo ?? prev.showLogo,
            logoUrl: d.printPreferences.logoUrl || prev.logoUrl,
            headerNote: d.printPreferences.headerNote || prev.headerNote,
            footerNote: d.printPreferences.footerNote || prev.footerNote,
            thermalFontSize: d.printPreferences.thermalFontSize || prev.thermalFontSize,
          }));
        }
      });

    setLoading(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.code === "F7" || e.key === "F7") {
        e.preventDefault();
        if (showForm && !preview) {
          setDate(today);
          setCustomerId("");
          setCustomerName("");
        }
      }
      if (e.code === "F8" || e.key === "F8") {
        e.preventDefault();
        if (showForm && !preview) {
          const query = prompt("Enter search query (Quotation No, Customer Name, etc.):");
          if (query) {
            const foundCustomer = customers.find(c => 
              c.name.toLowerCase().includes(query.toLowerCase())
            );
            if (foundCustomer) {
              setCustomerId(foundCustomer.id);
              setCustomerName(foundCustomer.name);
            } else {
              toast.error(`No customer found matching "${query}"`);
            }
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyPress, true);
    return () => document.removeEventListener("keydown", handleKeyPress, true);
  }, [today, showForm, preview, customers]);

  async function loadQuotations() {
    try {
      const res = await fetch("/api/quotation", {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      const data = await res.json();
      if (data?.quotations) {
        setQuotations(data.quotations);
      }
    } catch (e) {
      console.error("Load quotations error:", e);
    }
  }

  function addRow() {
    setRows(r => [
      ...r,
      { itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "" },
    ]);
  }

  function selectItem(index: number, itemId: string) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const copy = [...rows];
    copy[index] = {
      ...copy[index],
      itemId: item.id,
      name: item.name,
      description: item.description || "",
      availableQty: item.availableQty,
      qty: "",
    };
    setRows(copy);
  }

  function updateRow(index: number, key: "qty" | "rate", val: string) {
    const copy = [...rows];
    const num = val === "" ? "" : Number(val);
    copy[index][key] = num;
    setRows(copy);
  }

  const total = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.rate) || 0), 0);
  const selectedTax = taxes.find(t => t.id === selectedTaxId);
  const taxAmount = applyTax && selectedTax ? (total * (selectedTax.taxRate / 100)) : 0;
  const netTotal = total + taxAmount + (Number(freight) || 0);

  async function saveQuotation() {
    const clean = rows.filter(r => r.itemId && r.qty && r.rate);
    if (!customerId || !clean.length) {
      toast.error("Customer aur items zaroori hain");
      return;
    }

    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const baseBody = {
        quotationNo,
        customerId,
        date,
        validUntil: validUntil || null,
        freight: Number(freight) || 0,
        remarks: remarks || null,
        items: clean.map(r => {
          const qty = Number(r.qty);
          const rate = Number(r.rate);
          return { itemId: r.itemId, qty, rate, amount: qty * rate };
        }),
        applyTax,
        taxConfigId: applyTax ? selectedTaxId : null,
      };
      const body = editing ? { id: editing.id, ...baseBody } : baseBody;

      const res = await fetch("/api/quotation", {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Save failed");
      }
      
      const data = await res.json();
      
      if (data.quotation) {
        setSavedQuotation(data.quotation);
        setQuotationNo(data.quotation.quotationNo || quotationNo);
        setCustomerName(data.quotation.customer?.name || customerName);
      }
      
      setPreview(true);
      await loadQuotations();
      if (editing) {
        setEditing(null);
        setShowForm(false);
        setShowList(true);
      }
      toast.success("Quotation saved successfully!");
    } catch (e: any) {
      toast.error("Saving failed: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(q: Quotation) {
    setEditing(q);
    setQuotationNo(q.quotationNo);
    setCustomerId(q.customerId);
    setCustomerName(q.customer?.name || "");
    setDate(new Date(q.date).toISOString().slice(0, 10));
    setFreight((q as any).freight || "");
    setRemarks((q as any).remarks || "");
    setRows(q.items.map((it: any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      description: it.item?.description || "",
      availableQty: 0, // Not needed for edit
      qty: it.qty.toString(),
      rate: it.rate.toString(),
    })));
    setShowForm(true);
    setShowList(false);
  }

  async function deleteQuotation(id: string) {
    if (!await confirmToast("Are you sure you want to delete this quotation?")) return;
    try {
      const res = await fetch(`/api/quotation?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
      });
      if (res.ok) {
        toast.success("Quotation deleted successfully");
        await loadQuotations();
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
    setCustomerId("");
    setCustomerName("");
    setDate(today);
    setValidUntil("");
    setRows([{ itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "" }]);
    setApplyTax(false);
    setSelectedTaxId("");
    setPreview(false);
  }

  // Share on WhatsApp
  const shareOnWhatsApp = () => {
    if (!savedQuotation) {
      toast.error("Please save the quotation first");
      return;
    }
    
    // Construct a message
    let message = `*Quotation: ${savedQuotation.quotationNo}*\n`;
    message += `Date: ${fmtDate(savedQuotation.date)}\n`;
    message += `Customer: ${customerName}\n\n`;
    message += `*Items:*\n`;
    
    savedQuotation.items.forEach((item: any, index: number) => {
      message += `${index + 1}. ${item.item.name} x ${item.qty} @ ${item.rate} = ${(item.qty * item.rate).toLocaleString()}\n`;
    });
    
    message += `\n*Total Amount: ${savedQuotation.total.toLocaleString()}*`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Share on SMS
  const shareOnSMS = () => {
    if (!savedQuotation) {
      toast.error("Please save the quotation first");
      return;
    }
    
    // Construct a message (shorter for SMS)
    let message = `Quotation: ${savedQuotation.quotationNo}\n`;
    message += `Date: ${fmtDate(savedQuotation.date)}\n`;
    message += `Customer: ${customerName}\n`;
    message += `Total: ${savedQuotation.total.toLocaleString()}`;
    
    const url = `sms:?body=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!authorized) return <div className="p-6 text-red-600">Access Denied</div>;

  const filteredQuotations = quotations.filter(q => {
  if (!searchTerm.trim()) return true;

  const term = searchTerm.toLowerCase();

  return (
    q.quotationNo?.toLowerCase().includes(term) ||
    q.customer?.name?.toLowerCase().includes(term) ||
    q.date?.toLowerCase().includes(term) ||
    q.status?.toLowerCase().includes(term)
  );
});



  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Quotation / Estimate</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowList(!showList); setShowForm(!showForm); setEditing(null); }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => { setShowForm(true); setShowList(false); resetForm(); loadQuotations(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New Quotation
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Quotation No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">No quotations found</td>
                </tr>
              ) : (
                filteredQuotations.map(q => (
                  <tr key={q.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{q.quotationNo}</td>
                    <td className="p-3">{fmtDate(q.date)}</td>
                    <td className="p-3">{q.customer?.name || "N/A"}</td>
                    <td className="p-3 text-right">{q.total.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${q.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(q)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuotation(q.id)}
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
          <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 border rounded print:hidden gap-4">
            <h1 className="text-2xl font-bold">Quotation ({preview && savedQuotation ? savedQuotation.quotationNo : quotationNo})</h1>
            {!preview ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={saveQuotation} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  {saving ? "Saving..." : editing ? "Update Quotation" : "Save & Preview"}
                </button>
                <button onClick={() => { setShowForm(false); setEditing(null); resetForm(); }} className="bg-gray-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => { setPrintMode("a4"); setTimeout(() => window.print(), 150); }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#16a34a", color: "white", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>
                  Print A4
                </button>
                <button onClick={() => { setPrintMode("55mm"); setTimeout(() => window.print(), 150); }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#0891b2", color: "white", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontSize: 13 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print 55mm
                </button>
                <button onClick={() => setHideRates(!hideRates)} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#7c3aed", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  {hideRates ? "Show Rates" : "Hide Rates"}
                </button>
                <button onClick={shareOnWhatsApp} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#25D366", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  📱 WhatsApp
                </button>
                <button onClick={shareOnSMS} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#3b82f6", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  💬 SMS
                </button>
                <button onClick={() => setPreview(false)} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#d97706", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  ✏️ Edit
                </button>
                <button onClick={() => { setPreview(false); resetForm(); loadQuotations(); }} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#475569", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  + New Quotation
                </button>
              </div>
            )}
          </div>

          {!preview && (
            <div className="bg-white border p-6 rounded space-y-4">
              <div className="mb-2 text-xs text-gray-500 italic">
                Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Customer | <strong>F8</strong> = Search Query
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input value={quotationNo} readOnly className="border p-2 bg-gray-100" placeholder="Quotation No" />
                <div>
                  <label className="text-xs font-bold">Customer (F7: Clear, F8: Query)</label>
                  <select className="border p-2 w-full" value={customerId} onChange={e => {
                    setCustomerId(e.target.value);
                    setCustomerName(customers.find(c => c.id === e.target.value)?.name || "");
                  }}>
                    <option value="">Select Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold">Date</label>
                  <input type="date" className="border p-2 w-full" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-bold">Valid Until</label>
                  <input type="date" className="border p-2 w-full" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border mt-4 text-sm min-w-[600px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">Item</th>
                      <th className="border p-2 w-24">Qty</th>
                      <th className="border p-2 w-32">Rate</th>
                      <th className="border p-2 w-32 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border p-2">
                          <select className="w-full" value={r.itemId} onChange={e => selectItem(i, e.target.value)}>
                            <option value="">Select Item</option>
                            {items.map(it => (
                              <option key={it.id} value={it.id}>
                                {it.name} ({it.description})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border p-2">
                          <input type="number" value={r.qty} className="w-full text-center" onChange={e => updateRow(i, "qty", e.target.value)} />
                        </td>
                        <td className="border p-2">
                          <input type="number" value={r.rate} className="w-full text-center" onChange={e => updateRow(i, "rate", e.target.value)} />
                        </td>
                        <td className="border p-2 text-right">
                          {(Number(r.qty) * Number(r.rate) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addRow} className="bg-gray-100 px-4 py-1 rounded">+ Add Row</button>

              <div className="flex flex-col md:flex-row justify-between gap-4 pt-4">
                {/* Remarks - left side */}
                <div className="flex-1">
                  <label className="text-xs font-bold block mb-1">Remarks / Notes</label>
                  <textarea
                    className="border p-2 w-full text-sm"
                    rows={3}
                    placeholder="Optional remarks or terms..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>

                {/* Totals - right side */}
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between"><span>Total</span><span>{total.toLocaleString()}</span></div>

                  {/* Freight */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm font-semibold">Freight</span>
                    <input
                      type="number"
                      min={0}
                      value={freight}
                      onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      className="border p-1 text-sm w-28 text-right"
                    />
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
                          {taxes.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.taxType} - {t.taxCode} ({t.taxRate}%)
                            </option>
                          ))}
                        </select>
                        {selectedTax && (
                          <div className="flex justify-between text-sm">
                            <span>Tax ({selectedTax.taxRate}%)</span>
                            <span>{taxAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Net Total</span>
                    <span>{netTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PRINT STYLES ── */}
          {preview && savedQuotation && (
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                .qt-print, .qt-print * { visibility: visible !important; }
                .qt-print { position: fixed !important; inset: 0 !important; margin: 0 !important; }
                .qt-print.qt-a4 { width: 210mm !important; padding: 14mm 16mm 12mm !important; font-size: 10.5pt !important; }
                .qt-print.qt-55mm { width: 55mm !important; padding: 3mm 2.5mm !important; font-size: 7pt !important; }
                .no-print, .print-hidden { display: none !important; }
              }
            `}</style>
          )}

          {/* ── A4 PREVIEW ── */}
          {preview && savedQuotation && printMode !== "55mm" && (
            <div className="qt-print qt-a4" style={{
              background: "white", color: "#111",
              fontFamily: "'Outfit','Inter',sans-serif",
              borderRadius: 12, overflow: "hidden",
              boxShadow: "0 8px 50px rgba(0,0,0,0.28)",
              maxWidth: 860, margin: "0 auto 32px",
            }}>
              {/* Top accent bar */}
              <div style={{ height: 6, background: "linear-gradient(90deg,#0f172a,#334155)" }} />

              {/* Header */}
              <div style={{ padding: "26px 36px 18px", borderBottom: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", letterSpacing: -0.8, lineHeight: 1 }}>{companyName}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 6 }}>Quotation / Estimate</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    background: "#0f172a", color: "white",
                    padding: "6px 18px", borderRadius: 6,
                    fontSize: 11, fontWeight: 800, letterSpacing: 3,
                    textTransform: "uppercase", marginBottom: 12, display: "inline-block"
                  }}>
                    QUOTATION
                  </div>
                  <table style={{ fontSize: 12, borderCollapse: "collapse", marginLeft: "auto" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "3px 14px 3px 0", color: "#94a3b8", fontWeight: 600, textAlign: "right", fontSize: 11 }}>QT #</td>
                        <td style={{ padding: "3px 0", fontWeight: 900, color: "#0f172a", fontFamily: "monospace", fontSize: 14, letterSpacing: 0.5 }}>{savedQuotation.quotationNo}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "3px 14px 3px 0", color: "#94a3b8", fontWeight: 600, textAlign: "right", fontSize: 11 }}>Date</td>
                        <td style={{ padding: "3px 0", fontWeight: 700, color: "#0f172a", fontSize: 12 }}>{fmtDate(savedQuotation.date)}</td>
                      </tr>
                      {savedQuotation.validUntil && (
                        <tr>
                          <td style={{ padding: "3px 14px 3px 0", color: "#94a3b8", fontWeight: 600, textAlign: "right", fontSize: 11 }}>Valid Until</td>
                          <td style={{ padding: "3px 0", fontWeight: 700, color: "#0f172a", fontSize: 12 }}>{fmtDate(savedQuotation.validUntil)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill To */}
              <div style={{ padding: "14px 36px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5 }}>Bill To</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                  {savedQuotation.customer?.name || customerName || "—"}
                </div>
              </div>

              {/* Items Table */}
              <div style={{ padding: "0 36px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #0f172a" }}>
                      <th style={{ padding: "12px 6px 8px 0", textAlign: "left", fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 28 }}>#</th>
                      <th style={{ padding: "12px 6px 8px", textAlign: "left", fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>Item Description</th>
                      <th style={{ padding: "12px 6px 8px", textAlign: "center", fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 70 }}>Qty</th>
                      {!hideRates && <th style={{ padding: "12px 6px 8px", textAlign: "right", fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 110 }}>Rate</th>}
                      {!hideRates && <th style={{ padding: "12px 0 8px 6px", textAlign: "right", fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, width: 120 }}>Amount</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {savedQuotation.items.map((item: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "11px 6px 11px 0", fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ padding: "11px 6px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.item?.name || item.itemId}</div>
                          {item.item?.description && <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{item.item.description}</div>}
                        </td>
                        <td style={{ padding: "11px 6px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.qty}</td>
                        {!hideRates && <td style={{ padding: "11px 6px", textAlign: "right", fontSize: 12, color: "#475569" }}>{Number(item.rate).toLocaleString()}</td>}
                        {!hideRates && <td style={{ padding: "11px 0 11px 6px", textAlign: "right", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{(item.qty * item.rate).toLocaleString()}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals + Remarks */}
              <div style={{ padding: "18px 36px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, borderTop: "1.5px solid #e2e8f0", marginTop: 6 }}>
                {/* Remarks left */}
                <div style={{ flex: 1 }}>
                  {savedQuotation.remarks ? (
                    <div style={{ borderLeft: "3px solid #cbd5e1", paddingLeft: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Remarks / Notes</div>
                      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.7 }}>{savedQuotation.remarks}</div>
                    </div>
                  ) : (
                    <div style={{ borderLeft: "3px solid #e2e8f0", paddingLeft: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: 0.8 }}>Remarks / Notes</div>
                      <div style={{ fontSize: 11, color: "#e2e8f0", marginTop: 3 }}>—</div>
                    </div>
                  )}
                </div>
                {/* Totals right */}
                {!hideRates && (
                  <div style={{ minWidth: 250 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "7px 0", color: "#64748b", fontWeight: 600 }}>Sub Total</td>
                          <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{Number(savedQuotation.total).toLocaleString()}</td>
                        </tr>
                        {Number(savedQuotation.freight) > 0 && (
                          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "7px 0", color: "#64748b", fontWeight: 600 }}>Freight</td>
                            <td style={{ padding: "7px 0", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{Number(savedQuotation.freight).toLocaleString()}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={2} style={{ padding: 0 }}>
                            <div style={{ background: "#0f172a", borderRadius: 6, marginTop: 4, display: "flex", justifyContent: "space-between", padding: "10px 14px" }}>
                              <span style={{ color: "white", fontWeight: 800, fontSize: 13 }}>NET TOTAL</span>
                              <span style={{ color: "white", fontWeight: 900, fontSize: 15 }}>
                                {(Number(savedQuotation.total) + Number(savedQuotation.freight || 0)).toLocaleString()}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div style={{ padding: "0 36px 28px", display: "flex", gap: 32 }}>
                {["Prepared By", "Checked By", "Authorized By"].map(label => (
                  <div key={label} style={{ flex: 1, textAlign: "center", borderTop: "1.5px solid #cbd5e1", paddingTop: 8, marginTop: 44 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ padding: "10px 36px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>{printPrefs.footerNote || "Thank you for your business!"}</div>
                <div style={{ fontSize: 10, color: "#cbd5e1" }}>Generated by FinovaOS</div>
              </div>
            </div>
          )}

          {/* ── 55mm THERMAL PREVIEW ── */}
          {preview && savedQuotation && (
            <div className="qt-print qt-55mm" style={{
              background: "white", color: "#000",
              fontFamily: "'Courier New',Courier,monospace",
              width: 220, margin: "0 auto 32px",
              padding: "10px 12px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              borderRadius: 4,
              display: printMode === "55mm" ? "block" : "none",
            }}>
              {/* Header */}
              <div style={{ textAlign: "center", borderBottom: "1px dashed #555", paddingBottom: 7, marginBottom: 7 }}>
                <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5 }}>{companyName}</div>
                <div style={{ fontSize: 8, marginTop: 2, letterSpacing: 2, textTransform: "uppercase" }}>Quotation</div>
              </div>
              {/* Info */}
              <div style={{ fontSize: 9, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>QT#:</span>
                  <strong style={{ fontFamily: "monospace" }}>{savedQuotation.quotationNo}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span>Date:</span><span>{fmtDate(savedQuotation.date)}</span>
                </div>
                {savedQuotation.validUntil && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span>Valid:</span><span>{fmtDate(savedQuotation.validUntil)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>To:</span>
                  <strong>{savedQuotation.customer?.name || customerName}</strong>
                </div>
              </div>
              {/* Items */}
              <div style={{ borderTop: "1px dashed #555", borderBottom: "1px dashed #555", padding: "5px 0", marginBottom: 5 }}>
                {savedQuotation.items.map((item: any, i: number) => (
                  <div key={i} style={{ marginBottom: 5 }}>
                    <div style={{ fontSize: 9, fontWeight: 700 }}>{item.item?.name || item.itemId}</div>
                    {!hideRates ? (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#333" }}>
                        <span>{item.qty} x {Number(item.rate).toLocaleString()}</span>
                        <strong>{(item.qty * item.rate).toLocaleString()}</strong>
                      </div>
                    ) : (
                      <div style={{ fontSize: 8, color: "#444" }}>Qty: {item.qty}</div>
                    )}
                  </div>
                ))}
              </div>
              {/* Totals */}
              {!hideRates && (
                <div style={{ fontSize: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span>Sub Total:</span><span>{Number(savedQuotation.total).toLocaleString()}</span>
                  </div>
                  {Number(savedQuotation.freight) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span>Freight:</span><span>{Number(savedQuotation.freight).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 11, borderTop: "1px solid #000", paddingTop: 4, marginTop: 3 }}>
                    <span>NET TOTAL:</span>
                    <span>{(Number(savedQuotation.total) + Number(savedQuotation.freight || 0)).toLocaleString()}</span>
                  </div>
                </div>
              )}
              {/* Remarks */}
              {savedQuotation.remarks && (
                <div style={{ marginTop: 7, fontSize: 8, borderTop: "1px dashed #555", paddingTop: 5, color: "#333" }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Remarks:</div>
                  <div style={{ lineHeight: 1.4 }}>{savedQuotation.remarks}</div>
                </div>
              )}
              {/* Footer */}
              <div style={{ textAlign: "center", fontSize: 7, marginTop: 10, paddingTop: 6, borderTop: "1px dashed #555", color: "#666" }}>
                FinovaOS · Thank you for your business!
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
