"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Row = { itemId: string; name: string; qty: number | ""; maxQty: number };

type Outward = {
  id: string;
  outwardNo: number;
  date: string;
  customerId: string;
  customer?: { name: string };
  driverName?: string;
  vehicleNo?: string;
  remarks?: string;
  items: Array<{ item: { name: string }; qty: number }>;
};

export default function OutwardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();

  const [customers, setCustomers] = useState<Any[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Any[]>([]);
  const [outwards, setOutwards] = useState<Outward[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<Outward | null>(null);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(today);
  const [driverName, setDriverName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedData, setSavedData] = useState<Any>(null);

  // Keyboard shortcuts - F7: Clear date/customer, F8: Query dialog
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.code === "F7" || e.key === "F7") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !showPreview) {
          setDate(today);
          setCustomerId("");
          setSelectedInvoiceId("");
          setRows([]);
        }
      }
      if (e.code === "F8" || e.key === "F8") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !showPreview) {
          const query = prompt("Enter search query (Customer Name, Invoice No, etc.):");
          if (query) {
            const foundCustomer = customers.find(c => 
              c.name.toLowerCase().includes(query.toLowerCase())
            );
            if (foundCustomer) {
              setCustomerId(foundCustomer.id);
            } else {
              const foundInvoice = customerInvoices.find(inv =>
                inv.invoiceNo.toLowerCase().includes(query.toLowerCase())
              );
              if (foundInvoice) {
                setCustomerId(foundInvoice.customerId);
                handleInvoiceChange(foundInvoice.id);
              } else {
                alert(`No customer or invoice found matching "${query}"`);
              }
            }
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyPress, true);
    return () => document.removeEventListener("keydown", handleKeyPress, true);
  }, [today, showForm, showPreview, customers, customerInvoices]);

  useEffect(() => {
    loadOutwards();
    const user = getCurrentUser();
    fetch("/api/accounts?type=CUSTOMER", { 
      headers: { 
        "x-user-role": user?.role || "ADMIN" 
      } 
    })
      .then(r => r.json())
      .then(d => {
        const data = Array.isArray(d) ? d : (d.accounts || []);
        setCustomers(data.filter((a: Any) => a.partyType === "CUSTOMER"));
      })
      .catch(err => {
        console.error("Error loading customers:", err);
        alert("Failed to load customers");
      });
  }, []);

  async function loadOutwards() {
    try {
      const res = await fetch("/api/outward", {
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOutwards(data);
      }
    } catch (e) {
      console.error("Load outwards error:", e);
    }
  }

  useEffect(() => {
    if (!customerId) {
      setCustomerInvoices([]);
      return;
    }

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
      .then(r => {
        if (!r.ok) {
          if (r.status === 403) {
            alert("You don't have permission to view sales invoices");
            return { invoices: [] };
          }
          throw new Error(`Failed to load invoices: ${r.status}`);
        }
        return r.json();
      })
      .then(d => {
        if (d?.invoices) {
          const filtered = d.invoices.filter((inv: Any) => 
            inv.customerId === customerId && inv.status !== "RETURNED"
          );
          setCustomerInvoices(filtered);
        } else if (d?.error) {
          alert(`Error: ${d.error}`);
        } else {
          console.error("Unexpected response format:", d);
          setCustomerInvoices([]);
        }
      })
      .catch(err => {
        console.error("Error loading invoices:", err);
        alert(`Failed to load invoices: ${err.message || "Unknown error"}`);
        setCustomerInvoices([]);
      });
  }, [customerId]);

  async function handleInvoiceChange(invId: string) {
    setSelectedInvoiceId(invId);
    if (!invId) {
      setRows([]);
      return;
    }

    const inv = customerInvoices.find(i => i.id === invId);
    if (inv && inv.items && Array.isArray(inv.items)) {
      const autoRows = inv.items.map((it: Any) => ({
        itemId: it.itemId,
        name: it.item?.name || it.name || "Unknown Item",
        qty: it.qty,
        maxQty: it.qty,
      }));
      setRows(autoRows);
    } else {
      console.error("Invoice not found or items missing:", inv);
      alert("Invoice items not found. Please try selecting the invoice again.");
    }
  }

  function updateRow(i: number, key: keyof Row, val: Any) {
    const copy = [...rows] as Any;
    copy[i][key] = val;
    setRows(copy);
  }

  async function saveOutward() {
    const clean = rows.filter(r => r.itemId && Number(r.qty) > 0);
    if (!customerId || clean.length === 0) return alert("Select Customer and Items");

    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { id: editing.id, customerId, invoiceId: selectedInvoiceId, date, driverName, vehicleNo, remarks, items: clean }
        : { customerId, invoiceId: selectedInvoiceId, date, driverName, vehicleNo, remarks, items: clean };

      const res = await fetch("/api/outward", {
        method,
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSavedData({ ...data, customerName: customers.find(c => c.id === customerId)?.name });
      setShowPreview(true);
      await loadOutwards();
      if (editing) {
        setEditing(null);
        setShowForm(false);
        setShowList(true);
      }
    } catch (err: Any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(out: Outward) {
    setEditing(out);
    setCustomerId(out.customerId);
    setDate(new Date(out.date).toISOString().slice(0, 10));
    setDriverName(out.driverName || "");
    setVehicleNo(out.vehicleNo || "");
    setRemarks(out.remarks || "");
    setRows(out.items.map((it: Any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      qty: it.qty.toString(),
      maxQty: it.qty,
    })));
    setShowForm(true);
    setShowList(false);
  }

  async function deleteOutward(id: string) {
    if (!confirm("Are you sure you want to delete this outward?")) return;
    try {
      const res = await fetch(`/api/outward?id=${id}`, {
        method: "DELETE",
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      if (res.ok) {
        alert("Outward deleted successfully");
        await loadOutwards();
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
    setCustomerId("");
    setSelectedInvoiceId("");
    setDate(today);
    setDriverName("");
    setVehicleNo("");
    setRemarks("");
    setRows([]);
    setShowPreview(false);
  }

  if (showPreview) {
    return (
      <div className="invoice-print p-10 bg-white min-h-screen">
        <div className="max-w-4xl mx-auto border-2 border-black p-8">
           <div className="text-center border-b-4 border-black pb-4 mb-6">
             <h1 className="text-4xl font-black">US TRADERS</h1>
             <p className="font-bold">OUTWARD GATE PASS #{savedData.outwardNo}</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 mb-6 font-bold">
             <div>
               <p>CUSTOMER: {savedData.customerName}</p>
               <p>DATE: {date}</p>
             </div>
             <div className="text-right">
               <p>VEHICLE: {vehicleNo}</p>
               <p>DRIVER: {driverName}</p>
             </div>
           </div>
           <table className="w-full border-2 border-black">
             <thead>
               <tr className="bg-gray-100">
                 <th className="border-2 p-2">Item</th>
                 <th className="border-2 p-2">Qty</th>
               </tr>
             </thead>
             <tbody>
               {savedData.items.map((it: Any, i: number) => (
                 <tr key={i}>
                   <td className="border-2 p-2 font-bold">{rows[i]?.name}</td>
                   <td className="border-2 p-2 text-center text-xl font-black">{it.qty}</td>
                 </tr>
               ))}
             </tbody>
           </table>
           <div className="mt-20 flex justify-between">
             <div className="border-t-2 border-black w-40 text-center">Receiver Sign</div>
             <div className="border-t-2 border-black w-40 text-center">Authorized Sign</div>
           </div>
        </div>
        <div className="mt-8 flex gap-4 justify-center no-print">
          <button onClick={() => window.print()} className="bg-green-600 text-white px-8 py-2 font-bold">PRINT</button>
          <button onClick={() => { setShowPreview(false); resetForm(); }} className="bg-blue-600 text-white px-8 py-2 font-bold">NEW</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white border shadow-xl rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-black border-b-4 border-black pb-2 uppercase">
          Outward Gate Pass
        </h1>
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
            + New Outward
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div className="bg-white border rounded overflow-x-auto mb-4">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Outward No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Vehicle</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outwards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">No outwards found</td>
                </tr>
              ) : (
                outwards.map(out => (
                  <tr key={out.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">#{out.outwardNo}</td>
                    <td className="p-3">{new Date(out.date).toLocaleDateString()}</td>
                    <td className="p-3">{out.customer?.name || "N/A"}</td>
                    <td className="p-3">{out.vehicleNo || "N/A"}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(out)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteOutward(out.id)}
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
          <div className="mb-2 text-xs text-gray-500 italic">
            💡 Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Customer | <strong>F8</strong> = Search Query
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold uppercase">Customer (F7: Clear, F8: Query)</label>
              <select
                className="border-2 p-3 rounded font-bold"
                value={customerId}
                onChange={e => { setCustomerId(e.target.value); setSelectedInvoiceId(""); setRows([]); }}
              >
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold uppercase">Select Reference Invoice</label>
              <select
                className="border-2 p-3 rounded font-bold bg-blue-50"
                value={selectedInvoiceId}
                onChange={e => handleInvoiceChange(e.target.value)}
                disabled={!customerId}
              >
                <option value="">-- Choose Sales Invoice --</option>
                {customerInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.invoiceNo} (Items: {inv.items.length})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs font-bold uppercase">Date (F7: Clear)</label>
              <input type="date" className="border-2 p-3 rounded font-bold w-full" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <input className="border-2 p-3 rounded font-bold" placeholder="Driver Name" value={driverName} onChange={e => setDriverName(e.target.value)} />
            <input className="border-2 p-3 rounded font-bold" placeholder="Vehicle No" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} />
          </div>

          <table className="w-full border-2 border-black mb-4">
            <thead className="bg-black text-white text-xs">
              <tr>
                <th className="p-3 text-left">Item Name</th>
                <th className="p-3 w-32 text-center">Inv Qty</th>
                <th className="p-3 w-32 text-center">Dispatch Qty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="p-2 font-bold border">{r.name}</td>
                  <td className="p-2 text-center border bg-gray-50">{r.maxQty}</td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      className="w-full p-2 text-center font-black bg-yellow-50"
                      value={r.qty}
                      onChange={e => updateRow(i, "qty", Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <textarea className="w-full border-2 p-3 rounded mb-6" placeholder="Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />

          <div className="flex gap-2">
            <button
              onClick={saveOutward}
              disabled={saving || rows.length === 0}
              className="w-full bg-blue-700 text-white font-black py-4 rounded-xl text-xl uppercase"
            >
              {saving ? "Processing..." : editing ? "Update Gate Pass" : "Save & Print Gate Pass"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditing(null); resetForm(); }}
              className="bg-gray-600 text-white px-6 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
