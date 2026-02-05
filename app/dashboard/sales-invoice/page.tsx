"use client";

import { Suspense, useEffect, useRef as _useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { getCurrentUser } from "@/lib/auth";

const Barcode = dynamic(() => import("react-barcode"), { 
  ssr: false,
  loading: () => <p>Loading Barcode...</p>
});
import { QRCodeSVG } from "qrcode.react";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

type Account = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  description?: string;
  availableQty: number;
  barcode?: string;
};
type Row = {
  itemId: string;
  name: string;
  description: string;
  availableQty: number;
  qty: number | "";
  rate: number | "";
};

type SalesInvoice = {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customer?: { name: string };
  total: number;
  items: Array<{ item: { name: string; description?: string }; qty: number; rate: number }>;
  driverName?: string;
  vehicleNo?: string;
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

function SalesInvoiceContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();
  const canCreate = hasPermission(user, PERMISSIONS.CREATE_SALES_INVOICE);

  const [customers, setCustomers] = useState<Account[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<SalesInvoice | null>(null);

  const [invoiceNo, setInvoiceNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(today);
  const [location, setLocation] = useState("MAIN");
  const [driverName, setDriverName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [rows, setRows] = useState<Row[]>([{
    itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "",
  }]);
  const [freight, setFreight] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState<Any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [previewMode, setPreviewMode] = useState<"INVOICE" | "DELIVERY">("INVOICE");
  const [searchTerm, _setSearchTerm] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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

  // Keyboard shortcuts - F7: Clear date/customer, F8: Query dialog
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.code === "F7" || e.key === "F7") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !preview) {
          setDate(today);
          setCustomerId("");
          setCustomerName("");
        }
      }
      if (e.code === "F8" || e.key === "F8") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !preview) {
          const query = prompt("Enter search query (Invoice No, Customer Name, etc.):");
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

  useEffect(() => {
    if (!user || !user.id) return;
    loadInvoices();
    fetch("/api/accounts", {
      headers: { "x-user-role": user.role },
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts || [];
        setCustomers(list.filter((a: Any) => a.partyType === "CUSTOMER"));
      });

    fetch("/api/stock-available-for-sale")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []));

    // Load tax configurations
    fetch("/api/tax-configuration")
      .then(r => r.json())
      .then(d => setTaxes(Array.isArray(d) ? d : []))
      .catch(err => console.log("Tax config error:", err));

    fetch("/api/sales-invoice", {
      headers: {
        "x-user-role": user.role || "",
        "x-user-id": user.id || ""
      }
    })
      .then(r => {
        if (r.status === 403) throw new Error("No Permission");
        return r.json();
      })
      .then(d => {
        if (d?.nextNo) setInvoiceNo(d.nextNo);
      })
      .catch (_err => console.log("Access Denied or Error"));
  }, []);

  useEffect(() => {
    if (!queryId || !user) return;
    fetch(`/api/sales-invoice?id=${queryId}`, {
      headers: {
        "x-user-role": user.role || "",
        "x-user-id": user.id || ""
      }
    })
      .then(r => r.json())
      .then(inv => {
        if (inv && !inv.error) {
          setSavedInvoice(inv);
          setInvoiceNo(inv.invoiceNo || invoiceNo);
          setCustomerName(inv.customer?.name || inv.customerName || "");
          setPreview(true);
          setShowForm(true);
          setShowList(false);
        }
      })
      .catch(e => console.error("Error loading sales invoice:", e));
  }, [queryId, user]);

  async function loadInvoices() {
    try {
      const res = await fetch("/api/sales-invoice", {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      const data = await res.json();
      if (data?.invoices) {
        setInvoices(data.invoices);
      }
    } catch (e) {
      console.error("Load invoices error:", e);
    }
  }

  function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      if (!scanCode) return;

      const found = items.find(
        (i) => i.barcode === scanCode || i.id === scanCode // Fallback to ID if needed
      );

      if (found) {
        // Add to rows
        const newRow: Row = {
          itemId: found.id,
          name: found.name,
          description: found.description || "",
          availableQty: found.availableQty,
          qty: 1,
          rate: "", // or fetch default rate if available
        };

        // If the last row is empty, replace it. Otherwise append.
        const lastRow = rows[rows.length - 1];
        if (!lastRow.itemId) {
          const newRows = [...rows];
          newRows[rows.length - 1] = newRow;
          setRows(newRows);
        } else {
          setRows([...rows, newRow]);
        }

        toast.success(`Added ${found.name}`);
        setScanCode("");
      } else {
        toast.error("Item not found");
        setScanCode("");
      }
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
    if (key === "qty" && num !== "" && num > copy[index].availableQty) return;
    copy[index][key] = num;
    setRows(copy);
  }

  const total = rows.reduce((s, r) => s + (Number(r.qty) * Number(r.rate) || 0), 0);
  const selectedTax = taxes.find(t => t.id === selectedTaxId);
  const taxAmount = applyTax && selectedTax ? (total * (selectedTax.taxRate / 100)) : 0;
  const netTotal = total + (freight === "" ? 0 : Number(freight)) + taxAmount;

  const filteredInvoices = invoices.filter(inv => {
    const term = searchTerm.toLowerCase();
    return (
      inv.invoiceNo.toLowerCase().includes(term) ||
      (inv.customer?.name || "").toLowerCase().includes(term) ||
      inv.total.toString().includes(term)
    );
  });

  async function saveInvoice() {
    const clean = rows.filter(r => r.itemId && r.qty && r.rate);
    if (!customerId || !clean.length) {
      toast.error("Customer aur items zaroori hain");
      return;
    }

    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const baseBody = {
        invoiceNo,
        customerId,
        date,
        location,
        driverName,
        vehicleNo,
        freight: freight || 0,
        items: clean.map(r => ({ itemId: r.itemId, qty: Number(r.qty), rate: Number(r.rate) })),
        applyTax,
        taxConfigId: applyTax ? selectedTaxId : null,
        currencyId: currencyId || null,
        exchangeRate,
      };
      const body = editing ? { id: editing.id, ...baseBody } : baseBody;

      const res = await fetch("/api/sales-invoice", {
        method,
        credentials: "include",
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

      if (data.invoice) {
        setSavedInvoice(data.invoice);
        setInvoiceNo(data.invoiceNo || invoiceNo);
        setCustomerName(data.invoice.customer?.name || customerName);
      }

      setPreview(true);
      await loadInvoices();
      if (editing) {
        setEditing(null);
        setShowForm(false);
        setShowList(true);
      }
      toast.success("Invoice saved successfully!");
    } catch (e: Any) {
      toast.error("Saving failed: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(inv: SalesInvoice) {
    setEditing(inv);
    setInvoiceNo(inv.invoiceNo);
    setCustomerId(inv.customerId);
    setCustomerName(inv.customer?.name || "");
    setDate(new Date(inv.date).toISOString().slice(0, 10));
    setDriverName(inv.driverName || "");
    setVehicleNo(inv.vehicleNo || "");
    setRows(inv.items.map((it: Any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      description: it.item?.description || "",
      availableQty: it.qty || 0,
      qty: it.qty.toString(),
      rate: it.rate.toString(),
    })));
    setShowForm(true);
    setShowList(false);
  }

  async function deleteInvoice(id: string) {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/sales-invoice?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
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
    setCustomerId("");
    setCustomerName("");
    setDate(today);
    setLocation("MAIN");
    setDriverName("");
    setVehicleNo("");
    setFreight("");
    setRows([{ itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "" }]);
    setApplyTax(false);
    setSelectedTaxId("");
    setPreview(false);
  }

  async function sendInvoiceEmail() {
    if (!savedInvoice || !savedInvoice.id) {
      alert("Please save the invoice first");
      return;
    }

    const customerEmail = prompt("Enter customer email address:");
    if (!customerEmail || !customerEmail.includes("@")) {
      alert("Please enter a valid email address");
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
          type: "sales-invoice",
          invoiceId: savedInvoice.id,
          to: customerEmail,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ Email sent successfully!");
      } else {
        alert(`❌ Failed to send email: ${data.error || "Unknown error"}`);
      }
    } catch (_error) {
      alert("❌ Failed to send email. Please check email configuration.");
    } finally {
      setSendingEmail(false);
    }
  }

  const shareOnWhatsApp = () => {
    if (!savedInvoice) {
      toast.error("Please save the invoice first");
      return;
    }

    // Construct a message
    let message = `*Sales Invoice: ${savedInvoice.invoiceNo}*\n`;
    message += `Date: ${new Date(savedInvoice.date).toLocaleDateString()}\n`;
    message += `Customer: ${customerName}\n\n`;
    message += `*Items:*\n`;

    savedInvoice.items.forEach((item: Any, index: number) => {
      message += `${index + 1}. ${item.item.name} x ${item.qty} @ ${item.rate} = ${(item.qty * item.rate).toLocaleString()}\n`;
    });

    message += `\n*Total Amount: ${savedInvoice.total.toLocaleString()}*`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const _shareOnSMS = () => {
    if (!savedInvoice) {
      toast.error("Please save the invoice first");
      return;
    }

    // Construct a message (shorter for SMS)
    let message = `Invoice: ${savedInvoice.invoiceNo}\n`;
    message += `Date: ${new Date(savedInvoice.date).toLocaleDateString()}\n`;
    message += `Customer: ${customerName}\n`;
    message += `Total: ${savedInvoice.total.toLocaleString()}`;

    const url = `sms:?body=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!canCreate) {
    return <div>Access Denied</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales Invoice</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowList(!showList); setShowForm(!showForm); setEditing(null); }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => { setShowForm(true); setShowList(false); resetForm(); loadInvoices(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New Invoice
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div className="bg-white border rounded overflow-hidden">
          {/* <div className="p-4 border-b bg-gray-50">
            <input
              type="text"
              placeholder="Search by Invoice No, Customer, Amount..."
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div> */}
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Invoice No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Customer</th>
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
                    <td className="p-3">{inv.customer?.name || "N/A"}</td>
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
          <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-4 border rounded print:hidden gap-4">
            <div>
              <h1 className="text-2xl font-bold">Sales Invoice ({invoiceNo})</h1>
              {(invoiceNo && invoiceNo !== "SI-1") && (
                 <div className="mt-1">
                   <Barcode value={invoiceNo} width={1} height={30} fontSize={12} displayValue={true} />
                 </div>
              )}
            </div>
            {!preview ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={saveInvoice} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  {saving ? "Saving..." : editing ? "Update Invoice" : "Save & Preview"}
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
                  onClick={() => setPreviewMode(prev => prev === "INVOICE" ? "DELIVERY" : "INVOICE")}
                  className="bg-purple-600 text-white px-6 py-2 rounded flex-1 md:flex-none"
                >
                  {previewMode === "DELIVERY" ? "Show Rates" : "Hide Rates"}
                </button>
                <button
                  onClick={sendInvoiceEmail}
                  disabled={sendingEmail}
                  className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400 flex-1 md:flex-none"
                >
                  {sendingEmail ? "Sending..." : "📧 Email"}
                </button>
                <button
                  onClick={shareOnWhatsApp}
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 flex-1 md:flex-none"
                >
                  📱 WhatsApp
                </button>
                <button onClick={() => setPreview(false)} className="bg-yellow-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  Edit
                </button>
                <button onClick={() => { setPreview(false); resetForm(); }} className="bg-gray-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  New Invoice
                </button>
              </div>
            )}
          </div>

          {!preview && (
            <div className="bg-white border p-6 rounded space-y-4">
              <div className="mb-2 text-xs text-gray-500 italic">
                💡 Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Customer | <strong>F8</strong> = Search Query
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <input value={invoiceNo} readOnly className="border p-2 bg-gray-100" />
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
                  <label className="text-xs font-bold">Date (F7: Clear)</label>
                  <input type="date" className="border p-2 w-full" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold">Currency</label>
                  <select
                    className="border p-2"
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
                <div className="flex flex-col">
                  <label className="text-xs font-bold">Exchange Rate</label>
                  <input
                    type="number"
                    className="border p-2"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold">Location</label>
                  <select className="border p-2" value={location} onChange={e => setLocation(e.target.value)}>
                    <option value="MAIN">Main</option>
                    <option value="SHOP">Shop</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold">Driver Name</label>
                  <input type="text" className="border p-2" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver Name" />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold">Vehicle No</label>
                  <input type="text" className="border p-2" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Vehicle No" />
                </div>
              </div>

              {/* 📟 BARCODE SCANNER SECTION */}
              <div className="flex items-center gap-4 bg-blue-50 p-4 rounded border border-blue-200 shadow-sm">
                <span className="text-3xl">📟</span>
                <div className="flex-1">
                  <label className="text-xs font-bold text-blue-800 block mb-1">SCAN BARCODE / SKU TO ADD ITEM</label>
                  <input
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    onKeyDown={handleScan}
                    placeholder="Click here and scan barcode..."
                    className="border-2 border-blue-400 p-2 w-full rounded text-lg font-mono focus:ring-4 focus:ring-blue-200 outline-none transition-all"
                  />
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
                                {it.name} ({it.description}) — Stock {it.availableQty}
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
                  <div className="flex justify-between items-center">
                    <span>Freight</span>
                    <input type="number" value={freight} onChange={e => setFreight(e.target.value === "" ? "" : Number(e.target.value))} className="border w-32 text-right p-1" />
                  </div>

                  {/* Tax Section */}
                  <div className="border-t pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setApplyTax(!applyTax);
                        if (!applyTax) setSelectedTaxId("");
                      }}
                      className={`w-full py-1 px-2 rounded font-semibold text-sm ${applyTax ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
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

                  <div className="flex justify-between font-bold border-t pt-2 text-lg"><span>Net Total</span><span>{netTotal.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {preview && (
            <div className="invoice-print bg-white p-10 border shadow-lg mx-auto print:border-0 print:p-0 print:shadow-none min-h-[297mm]">
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
                <div>
                  <h1 className="text-4xl font-black">{previewMode === "DELIVERY" ? "DELIVERY NOTE" : "SALES INVOICE"}</h1>
                  <p className="text-gray-600">US Traders</p>
                </div>
                <div className="text-right">
                  <p><b>Invoice #:</b> {savedInvoice?.invoiceNo || invoiceNo}</p>
                  <p><b>Date:</b> {savedInvoice?.date ? new Date(savedInvoice.date).toISOString().slice(0, 10) : date}</p>
                  <p><b>Location:</b> {location}</p>
                  {(savedInvoice?.invoiceNo || invoiceNo) && (
                    <div className="flex flex-col items-end gap-2 mt-2">
                      <div className="text-center">
                        <Barcode value={savedInvoice?.invoiceNo || invoiceNo} width={1.5} height={40} fontSize={14} displayValue={false} />
                        <span className="text-[10px] font-bold">INV ID: {savedInvoice?.invoiceNo || invoiceNo}</span>
                      </div>

                      {origin && (
                        <div className="flex flex-col items-center mt-2 border-t pt-2">
                          <QRCodeSVG value={`${origin}/view/sales-invoice?id=${savedInvoice?.id || queryId}`} size={80} />
                          <span className="text-[10px] font-bold mt-1 bg-black text-white px-1">SCAN FOR ONLINE BILL</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2">
                <div>
                  <h3 className="text-gray-500 uppercase text-xs font-bold mb-1">Bill To:</h3>
                  <p className="text-xl font-bold">{savedInvoice?.customer?.name || customerName || "Not Selected"}</p>
                </div>
                <div className="text-right">
                  {(savedInvoice?.driverName || driverName) && (
                    <p><b>Driver:</b> {savedInvoice?.driverName || driverName}</p>
                  )}
                  {(savedInvoice?.vehicleNo || vehicleNo) && (
                    <p><b>Vehicle:</b> {savedInvoice?.vehicleNo || vehicleNo}</p>
                  )}
                </div>
              </div>

              <table className="w-full border-collapse mb-8">
                <thead>
                  <tr className="border-y-2 border-black">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-center w-24">Qty</th>
                    {previewMode === "INVOICE" && <th className="py-2 text-right w-32">Rate</th>}
                    {previewMode === "INVOICE" && <th className="py-2 text-right w-32">Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {(savedInvoice?.items || rows.filter(r => r.itemId)).map((r: Any, i: number) => {
                    const itemName = r.item?.name || r.name || "Unknown";
                    const itemDesc = r.item?.description || r.description || "";
                    const qty = r.qty || 0;
                    const rate = r.rate || 0;
                    const amount = qty * rate;

                    return (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="py-3">
                          <p className="font-bold">{itemName}</p>
                          {itemDesc && <p className="text-sm text-gray-600">{itemDesc}</p>}
                        </td>
                        <td className="py-3 text-center">{qty}</td>
                        {previewMode === "INVOICE" && <td className="py-3 text-right">{Number(rate).toLocaleString()}</td>}
                        {previewMode === "INVOICE" && <td className="py-3 text-right font-semibold">{amount.toLocaleString()}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {previewMode === "INVOICE" && (
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Freight:</span>
                      <span>{Number(freight || 0).toLocaleString()}</span>
                    </div>
                    {selectedTax && (
                      <div className="flex justify-between">
                        <span>{selectedTax.taxType.toUpperCase()} ({selectedTax.taxRate}%):</span>
                        <span>{taxAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t-2 border-black pt-2 text-xl font-bold">
                      <span>Net Total:</span>
                      <span>{netTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <span className="font-bold">Prepared by</span>
                <span className="w-72">_____________________</span>
              </div>
              <div>
                <span className="font-bold">Recieved by</span>
                <span className="w-72">_____________________</span>
              </div>

              <div className="mt-20 border-t pt-4 text-center text-gray-400 text-sm">
                Thank you for your business!
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SalesInvoicePage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading Invoice...</div>}>
      <SalesInvoiceContent />
    </Suspense>
  );
}
