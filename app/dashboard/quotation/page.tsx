"use client";

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

export default function QuotationPage() {
  const router = useRouter();
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
  const [rows, setRows] = useState<Row[]>([{
    itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "",
  }]);
  const [searchTerm, setSearchTerm] = useState("");

  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [savedQuotation, setSavedQuotation] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hideRates, setHideRates] = useState(false);
  
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
  const netTotal = total + taxAmount;

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
        setQuotationNo(data.quotationNo || quotationNo);
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
    if (!confirm("Are you sure you want to delete this quotation?")) return;
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
    } catch (e) {
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
    message += `Date: ${new Date(savedQuotation.date).toLocaleDateString()}\n`;
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
    message += `Date: ${new Date(savedQuotation.date).toLocaleDateString()}\n`;
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
                    <td className="p-3">{new Date(q.date).toLocaleDateString()}</td>
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
            <h1 className="text-2xl font-bold">Quotation ({quotationNo})</h1>
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
              <div className="flex flex-wrap gap-2">
                <button onClick={() => window.print()} className="bg-green-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  Print
                </button>
                <button 
                  onClick={() => setHideRates(!hideRates)} 
                  className="bg-purple-600 text-white px-6 py-2 rounded flex-1 md:flex-none"
                >
                  {hideRates ? "Show Rates" : "Hide Rates"}
                </button>
                <button 
                  onClick={shareOnWhatsApp}
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 flex-1 md:flex-none"
                >
                  📱 WhatsApp
                </button>
                <button 
                  onClick={shareOnSMS}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 flex-1 md:flex-none"
                >
                  💬 SMS
                </button>
                <button onClick={() => setPreview(false)} className="bg-yellow-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  Edit
                </button>
                <button onClick={() => { setPreview(false); resetForm(); }} className="bg-gray-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  New Quotation
                </button>
              </div>
            )}
          </div>

          {!preview && (
            <div className="bg-white border p-6 rounded space-y-4">
              <div className="mb-2 text-xs text-gray-500 italic">
                💡 Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Customer | <strong>F8</strong> = Search Query
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

              <div className="flex justify-end pt-4">
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between"><span>Total</span><span>{total.toLocaleString()}</span></div>
                  
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

          {/* PREVIEW SECTION */}
          {preview && savedQuotation && (
            <div className="bg-white p-8 border rounded shadow-lg max-w-4xl mx-auto print:shadow-none print:border-none">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold uppercase tracking-wider">Quotation</h1>
                <p className="text-gray-500">Date: {new Date(savedQuotation.date).toLocaleDateString()}</p>
                <p className="text-gray-500 font-bold">#{savedQuotation.quotationNo}</p>
              </div>

              <div className="flex justify-between mb-8">
                <div>
                  <h3 className="font-bold text-gray-700">Bill To:</h3>
                  <p className="text-lg font-semibold">{customerName}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-gray-700">Details:</h3>
                  {savedQuotation.validUntil && (
                     <p>Valid Until: {new Date(savedQuotation.validUntil).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="text-left py-2 px-4">Item</th>
                    <th className="text-center py-2 px-4">Qty</th>
                    {!hideRates && <th className="text-right py-2 px-4">Rate</th>}
                    {!hideRates && <th className="text-right py-2 px-4">Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {savedQuotation.items.map((item: any, i: number) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-4">
                        <p className="font-bold">{item.item.name}</p>
                        {item.item.description && <p className="text-xs text-gray-500">{item.item.description}</p>}
                      </td>
                      <td className="text-center py-2 px-4">{item.qty}</td>
                      {!hideRates && <td className="text-right py-2 px-4">{item.rate.toLocaleString()}</td>}
                      {!hideRates && <td className="text-right py-2 px-4">{(item.qty * item.rate).toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>

              {!hideRates && (
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>{savedQuotation.total.toLocaleString()}</span>
                  </div>
                  {/* You might want to display tax here if saved in quotation */}
                  <div className="flex justify-between font-bold text-xl border-t pt-2">
                    <span>Total:</span>
                    <span>{savedQuotation.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              )}
              
              <div className="mt-12 pt-8 border-t text-center text-gray-500 text-sm">
                <p>Thank you for your business!</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
