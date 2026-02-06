"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Invoice = { id: string; invoiceNo: string; customerName: string; customerId: string; };
type Row = { itemId: string; name: string; qty: number | ""; rate: number; maxQty: number; };

type SaleReturn = {
  id: string;
  returnNo: string;
  date: string;
  customerId: string;
  customer?: { name: string };
  invoiceId: string;
  invoice?: { invoiceNo: string };
  total: number;
  items: Array<{ itemId?: string; item?: { name: string }; qty: number; rate: number }>;
};

type SavedItem = {
  name: string;
  qty: number;
  rate: number;
};

type SavedReturnData = {
  returnNo: string;
  date: string;
  customerName: string;
  invoiceNo: string;
  items: SavedItem[];
  total: number;
  freight: number;
  netTotal: number;
};

export default function SalesReturnPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<SaleReturn | null>(null);

  const [invoiceId, setInvoiceId] = useState("");
  const [displayInvoiceNo, setDisplayInvoiceNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState(today);
  const [freight, setFreight] = useState<number | "">("");

  const [preview, setPreview] = useState(false);
  const [savedData, setSavedData] = useState<SavedReturnData | null>(null);

  const loadReturns = useCallback(async () => {
    try {
      const res = await fetch("/api/sale-return", {
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setReturns(data);
      }
    } catch (e) {
      console.error("Load returns error:", e);
    }
  }, [user?.role]);

  const handleInvoiceChange = useCallback(async (id: string) => {
    setInvoiceId(id);
    if (!id) { 
      setRows([]); 
      setCustomerName(""); 
      setDisplayInvoiceNo(""); 
      return; 
    }

    const selectedInv = invoices.find(i => i.id === id);
    if (selectedInv) setDisplayInvoiceNo(selectedInv.invoiceNo);

    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/sales-invoice/${id}`, {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Failed to load invoice details");
        setInvoiceId("");
        setRows([]);
        return;
      }

      const data = await res.json();

      if (data.items && data.items.length === 0) {
        alert("Ye Invoice pehle hi mukammal return ho chuki hai!");
        setInvoiceId("");
        setRows([]);
        return;
      }

      setCustomerName(data.customerName || "");
      setCustomerId(data.customerId || "");
      setRows(data.items || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Load error:", err);
      alert(`Error loading invoice: ${message}`);
    }
  }, [invoices]);

  // Keyboard shortcuts - F7: Clear date/customer, F8: Query dialog
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.code === "F7" || e.key === "F7") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !preview) {
          setDate(today);
          setInvoiceId("");
          setCustomerId("");
          setCustomerName("");
          setDisplayInvoiceNo("");
        }
      }
      if (e.code === "F8" || e.key === "F8") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !preview) {
          const query = prompt("Enter search query (Invoice No, Customer Name, etc.):");
          if (query) {
            const foundInvoice = invoices.find(inv => 
              inv.invoiceNo.toLowerCase().includes(query.toLowerCase()) ||
              inv.customerName.toLowerCase().includes(query.toLowerCase())
            );
            if (foundInvoice) {
              handleInvoiceChange(foundInvoice.id);
            } else {
              alert(`No invoice found matching "${query}"`);
            }
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyPress, true);
    return () => document.removeEventListener("keydown", handleKeyPress, true);
  }, [today, showForm, preview, invoices, handleInvoiceChange]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadReturns();
    const user = getCurrentUser();
    if (!user) {
      alert("Session expired. Please login again.");
      return;
    }

    fetch("/api/sales-invoice", {
      headers: {
        "x-user-role": user.role || "",
        "x-user-id": user.id || ""
      }
    })
      .then((r) => {
        if (!r.ok) {
          if (r.status === 403) {
            alert("You don't have permission to view sales invoices");
            return { invoices: [] };
          }
          throw new Error(`Failed to load invoices: ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (d?.invoices) {
          const activeInvoices = d.invoices.filter(
            (inv: { status?: string }) => inv.status !== "RETURNED"
          );
          setInvoices(activeInvoices);
        } else if (d?.error) {
          alert(`Error: ${d.error}`);
        } else {
          console.error("Unexpected response format:", d);
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Load invoices error:", err);
        alert(`Failed to load invoices: ${message}`);
      });
  }, [loadReturns]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateRow = <K extends keyof Row>(
  index: number,
  key: K,
  value: Row[K]
) => {
  const copy = [...rows];
  copy[index] = {
    ...copy[index],
    [key]: value,
  };
  setRows(copy);
};


  const total = rows.reduce((s, r) => s + (Number(r.qty) || 0) * r.rate, 0);
  const netTotal = total + (Number(freight) || 0);

  async function saveReturn() {
    const clean = rows
      .filter(r => r.itemId && Number(r.qty) > 0)
      .map(r => ({
        ...r,
        qty: Number(r.qty),
      }));
    if (!invoiceId || !clean.length) return alert("Select items to return");

    const method = editing ? "PUT" : "POST";
    const body = editing
      ? { id: editing.id, customerId, invoiceId, date, freight: freight || 0, items: clean }
      : { customerId, invoiceId, date, freight: freight || 0, items: clean };

    const res = await fetch("/api/sale-return", {
      method,
      headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.success) {
      setSavedData({
        returnNo: data.returnNo,
        date,
        customerName,
        invoiceNo: displayInvoiceNo,
        items: clean,
        total,
        freight: freight || 0,
        netTotal
      });
      setPreview(true);
      await loadReturns();
      if (editing) {
        setEditing(null);
        setShowForm(false);
        setShowList(true);
      }
    } else alert(data.error);
  }

  function startEdit(ret: SaleReturn) {
    setEditing(ret);
    setInvoiceId(ret.invoiceId);
    setDisplayInvoiceNo(ret.invoice?.invoiceNo || "");
    setCustomerId(ret.customerId);
    setCustomerName(ret.customer?.name || "");
    setDate(new Date(ret.date).toISOString().slice(0, 10));
    setRows(ret.items.map((it) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      qty: it.qty,
      rate: it.rate,
      maxQty: it.qty,
    })));
    setShowForm(true);
    setShowList(false);
  }

  async function deleteReturn(id: string) {
    if (!confirm("Are you sure you want to delete this return?")) return;
    try {
      const res = await fetch(`/api/sale-return?id=${id}`, {
        method: "DELETE",
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      if (res.ok) {
        alert("Return deleted successfully");
        await loadReturns();
      } else {
        const err = await res.json();
        alert(err.error || "Delete failed");
      }
    } catch (_e) {
      alert("Delete failed");
    }
  }

  function resetForm() {
    setEditing(null);
    setInvoiceId("");
    setDisplayInvoiceNo("");
    setCustomerId("");
    setCustomerName("");
    setDate(today);
    setFreight("");
    setRows([]);
    setPreview(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-red-600">Sales Return</h1>
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
            + New Return
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div className="bg-white border rounded overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Return No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Invoice No</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-400">No returns found</td>
                </tr>
              ) : (
                returns.map(ret => (
                  <tr key={ret.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{ret.returnNo}</td>
                    <td className="p-3">{new Date(ret.date).toLocaleDateString()}</td>
                    <td className="p-3">{ret.customer?.name || "N/A"}</td>
                    <td className="p-3">{ret.invoice?.invoiceNo || "N/A"}</td>
                    <td className="p-3 text-right">{ret.total.toLocaleString()}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(ret)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteReturn(ret.id)}
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
          {!preview ? (
            <div className="space-y-4 border p-6 bg-white rounded shadow">
              <div className="mb-2 text-xs text-gray-500 italic">
                💡 Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Invoice | <strong>F8</strong> = Search Query
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <h1 className="text-xl font-bold text-red-600">{editing ? "Edit Sales Return" : "Sales Return Form"}</h1>
                <div className="flex gap-2">
                  <button onClick={saveReturn} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 font-black rounded uppercase">
                    {editing ? "Update Return" : "Confirm Sales Return"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditing(null); resetForm(); }} className="bg-gray-600 text-white px-6 py-2 rounded">
                    Cancel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold uppercase">Select Invoice (F7: Clear, F8: Query)</label>
                  <select className="border p-2 rounded" value={invoiceId} onChange={e => handleInvoiceChange(e.target.value)}>
                    <option value="">-- Choose Invoice --</option>
                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNo} - {i.customerName}</option>)}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold uppercase">Return Date (F7: Clear)</label>
                  <input type="date" className="border p-2 rounded" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>

              <div className="p-3 bg-gray-800 text-white font-bold rounded">
                Customer: {customerName || "Not Selected"}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border text-sm mt-4 min-w-[600px]">
                  <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Item Name</th>
                    <th className="border p-2 w-24 text-center">Remaining</th>
                    <th className="border p-2 w-24 text-center">Return Qty</th>
                    <th className="border p-2 w-32 text-center">Rate</th>
                    <th className="border p-2 w-32 text-right">Amount</th>
                    <th className="border p-1 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-red-50">
                      <td className="border p-2 font-semibold">{r.name}</td>
                      <td className="border p-2 text-center text-blue-600 font-bold">{r.maxQty}</td>
                      <td className="border p-2">
                        <input type="number" className="w-full text-center border p-1 rounded font-bold bg-yellow-50"
                          value={r.qty}
                          onChange={e => {
                            const v = Number(e.target.value);
                            updateRow(i, "qty", v > r.maxQty ? r.maxQty : v);
                          }}
                        />
                      </td>
                      <td className="border p-2 text-center font-mono">{r.rate}</td>
                      <td className="border p-2 text-right font-bold">{(Number(r.qty) * r.rate).toLocaleString()}</td>
                      <td className="border p-2 text-center text-red-500 cursor-pointer" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>✕</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end gap-2 border-t pt-4">
                <div className="w-64 flex justify-between"><span>Subtotal:</span> <span className="font-mono">{total.toLocaleString()}</span></div>
                <div className="w-64 flex justify-between items-center py-1">
                  <span>Freight:</span>
                  <input type="number" className="border p-1 w-24 text-right rounded" value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} />
                </div>
                <div className="w-64 flex justify-between font-bold text-xl text-red-600 border-t-2 pt-2">
                  <span>Net Total:</span> <span>{netTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="invoice-print space-y-6">
              <div className="flex gap-4 no-print bg-gray-100 p-4 rounded">
                <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2 rounded font-bold shadow">Print Voucher</button>
                <button onClick={() => { setPreview(false); resetForm(); }} className="bg-white border border-gray-300 px-8 py-2 rounded font-bold">New Return</button>
              </div>

              <div className="print-voucher bg-white p-10 border shadow-sm mx-auto">
                <div className="text-center mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-3xl font-black uppercase">Sales Return Voucher</h1>
                  <p className="text-sm">Date: {savedData?.date} | Voucher No: {savedData?.returnNo}</p>
                </div>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-2">
                  <p><strong>Customer:</strong> {savedData?.customerName}</p>
                  <p className="text-right"><strong>Ref Invoice:</strong> {savedData?.invoiceNo}</p>
                </div>

                <table className="w-full border-collapse border border-black text-sm">
                  <thead>
                    <tr className="bg-gray-100 uppercase">
                      <th className="border border-black p-2 text-left">Item Description</th>
                      <th className="border border-black p-2 text-center w-24">Qty</th>
                      <th className="border border-black p-2 text-center w-32">Rate</th>
                      <th className="border border-black p-2 text-right w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedData?.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="border border-black p-2">{it.name}</td>
                        <td className="border border-black p-2 text-center">{it.qty}</td>
                        <td className="border border-black p-2 text-center">{it.rate.toLocaleString()}</td>
                        <td className="border border-black p-2 text-right">{(it.qty * it.rate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 flex flex-col items-end font-bold space-y-1">
                  <p>Subtotal: {savedData?.total.toLocaleString()}</p>
                  <p>Freight: {savedData?.freight.toLocaleString()}</p>
                  <p className="text-xl border-t-2 border-black pt-2">Net Total: {savedData?.netTotal.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
