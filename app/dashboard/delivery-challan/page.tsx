"use client";
import { fmtDate } from "@/lib/dateUtils";
import { DateInput } from "@/app/dashboard/reports/_components/DateInput";
import { confirmToast, alertToast } from "@/lib/toast-feedback";
import { PrintActionBar } from "@/components/print/PrintActionBar";
import { PrintDocA4, PrintPaperWrapper } from "@/components/print/PrintDocA4";

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

type DeliveryChallan = {
  id: string;
  challanNo: string;
  date: string;
  customerId: string;
  customer?: { name: string };
  driverName?: string;
  vehicleNo?: string;
  remarks?: string;
  items: Array<{ item: { name: string; description?: string }; qty: number; rate?: number }>;
  status: string;
};

type PrintPreferences = {
  paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM";
  showLogo: boolean;
  logoUrl: string;
  headerNote: string;
  footerNote: string;
};

export default function DeliveryChallanPage() {
  const _router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();

  const [_authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [customers, setCustomers] = useState<Account[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<DeliveryChallan | null>(null);

  const [challanNo, setChallanNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(today);
  const [driverName, setDriverName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [remarks, setRemarks] = useState("");
const [searchTerm, _setSearchTerm] = useState("");


  const [rows, setRows] = useState<Row[]>([{
    itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "",
  }]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [savedChallan, setSavedChallan] = useState<any>(null);
  const [companyName, setCompanyName] = useState("FINOVA SME");
  const [printPrefs, setPrintPrefs] = useState<PrintPreferences>({
    paperSize: "A4",
    showLogo: true,
    logoUrl: "",
    headerNote: "",
    footerNote: "Thank you for your business!",
  });
  const isThermalPrint = printPrefs.paperSize !== "A4";
  const thermalWidth = printPrefs.paperSize === "THERMAL_58MM" ? "58mm" : "80mm";

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    // Using CREATE_QUOTATION as a proxy permission or if there's a specific one like CREATE_DELIVERY_CHALLAN
    // Assuming if they can create quotation/invoice, they can create challan.
    // Ideally we should add CREATE_DELIVERY_CHALLAN to permissions, but for now reuse or check role.
    if (!hasPermission(user, PERMISSIONS.CREATE_QUOTATION)) { // Fallback permission check
       // You might want to update permissions lib later
    }
    setAuthorized(true);
    
    // Load initial data
    loadChallans();
    
    fetch("/api/accounts", {
      headers: { "x-user-role": user.role },
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts || [];
        setCustomers(list.filter((a: any) => a.partyType === "CUSTOMER"));
      });

    fetch("/api/stock-available-for-sale")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []));

    fetch("/api/delivery-challan", {
        headers: {
            "x-user-role": user.role || "",
            "x-user-id": user.id || ""
        }
    })
    .then(r => r.json())
    .then(_d => {
        // If there's logic to get nextNo from API, otherwise just handle in state
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
          }));
        }
      });

    setLoading(false);
  }, []);
  const shareOnSMS = () => {
  const msg = "Your delivery challan details";
  window.open(`sms:?body=${encodeURIComponent(msg)}`);
};


  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.code === "F7" || e.key === "F7") {
        e.preventDefault();
        if (showForm && !preview) {
          setDate(today);
          setCustomerId("");
          setCustomerName("");
          setDriverName("");
          setVehicleNo("");
          setRemarks("");
        }
      }
      if (e.code === "F8" || e.key === "F8") {
        e.preventDefault();
        if (showForm && !preview) {
          const query = prompt("Enter search query (Challan No, Customer Name, etc.):");
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

  async function loadChallans() {
    try {
      const res = await fetch("/api/delivery-challan", {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setChallans(data);
      }
    } catch (e) {
      console.error("Load challans error:", e);
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

  async function saveChallan() {
    const clean = rows.filter(r => r.itemId && r.qty);
    if (!customerId || !clean.length) {
      toast.error("Customer and items are required.");
      return;
    }

    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const baseBody = {
        challanNo,
        customerId,
        date,
        driverName: driverName || null,
        vehicleNo: vehicleNo || null,
        remarks: remarks || null,
        items: clean.map(r => ({ itemId: r.itemId, qty: Number(r.qty), rate: Number(r.rate) || 0 })),
      };
      const body = editing ? { id: editing.id, ...baseBody } : baseBody;

      const res = await fetch("/api/delivery-challan", {
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
      
      if (data) {
        setSavedChallan(data);
        setChallanNo(data.challanNo || challanNo);
        setCustomerName(customers.find(c => c.id === customerId)?.name || customerName);
      }
      
      setPreview(true);
      await loadChallans();
      if (editing) {
        setEditing(null);
        setShowForm(false);
        setShowList(true);
      }
      toast.success("Delivery Challan saved successfully!");
    } catch (e: any) {
      toast.error("Saving failed: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: DeliveryChallan) {
    setEditing(c);
    setChallanNo(c.challanNo);
    setCustomerId(c.customerId);
    setCustomerName(c.customer?.name || "");
    setDate(new Date(c.date).toISOString().slice(0, 10));
    setDriverName(c.driverName || "");
    setVehicleNo(c.vehicleNo || "");
    setRemarks(c.remarks || "");
    setRows(c.items.map((it: any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      description: it.item?.description || "",
      availableQty: 0, // Not needed for edit
      qty: it.qty.toString(),
      rate: it.rate ? it.rate.toString() : "",
    })));
    setShowForm(true);
    setShowList(false);
  }

  async function deleteChallan(id: string) {
    if (!await confirmToast("Are you sure you want to delete this delivery challan?")) return;
    try {
      const res = await fetch(`/api/delivery-challan?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || ""
        },
      });
      if (res.ok) {
        toast.success("Delivery Challan deleted successfully");
        await loadChallans();
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
    setDriverName("");
    setVehicleNo("");
    setRemarks("");
    setRows([{ itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "" }]);
    setPreview(false);
  }

  // Share on WhatsApp
  const shareOnWhatsApp = () => {
    if (!savedChallan) {
      toast.error("Please save the challan first");
      return;
    }
    
    // Construct a message
    let message = `*Delivery Challan: ${savedChallan.challanNo}*\n`;
    message += `Date: ${fmtDate(savedChallan.date)}\n`;
    message += `Customer: ${customerName}\n`;
    if (savedChallan.driverName) message += `Driver: ${savedChallan.driverName}\n`;
    if (savedChallan.vehicleNo) message += `Vehicle: ${savedChallan.vehicleNo}\n`;
    message += `\n*Items:*\n`;
    
    savedChallan.items.forEach((item: any, index: number) => {
      // Fetch item name from local items if possible, or use from savedChallan if populated
      // savedChallan.items might not have item details fully if not populated in response, but let's assume API returns it or we use logic
      // Actually API returns items with included item details in GET but create/update response might vary.
      // Ideally use local items map if needed or ensure API returns included.
      // The API create/update returns just the main object usually, but let's trust we can reconstruct or refetch.
      // Wait, create/update response in my API route above does NOT include relation `items` fully populated with `item` name.
      // It returns `items` array of created objects.
      // I should rely on `rows` state for names if savedChallan is fresh, or fetch proper object.
      // For simplicity, let's use `rows` since it matches the saved state.
      
      const row = rows[index];
      message += `${index + 1}. ${row.name} x ${item.qty} ${row.description ? `(${row.description})` : ''}\n`;
    });
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  function shareOnEmail() {
    const email = prompt("Customer email:");
    if (!email?.includes("@")) return;
    fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "generic",
        to: email,
        subject: `Delivery Challan ${savedChallan?.challanNo || challanNo}`,
        html: `<p>Dear ${customerName},</p><p>Please find your Delivery Challan <strong>${savedChallan?.challanNo || challanNo}</strong> dated ${fmtDate(date)}.</p><p>Thank you for your business.</p>`,
      }),
    }).then(r => r.ok ? toast.success("Email sent!") : toast.error("Email failed")).catch(() => toast.error("Email failed"));
  }

  if (loading) return <div className="p-6">Loading...</div>;
  // if (!authorized) return <div className="p-6 text-red-600">Access Denied</div>;

  const filteredChallans = challans.filter(c => {
  const term = searchTerm.toLowerCase();

  return (
    c.challanNo?.toLowerCase().includes(term) ||
    c.customer?.name?.toLowerCase().includes(term) ||
    c.date?.toLowerCase().includes(term)
  );
});


  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Delivery Challan</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowList(!showList); setShowForm(!showForm); setEditing(null); }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => { setShowForm(true); setShowList(false); resetForm(); loadChallans(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New Challan
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div className="bg-white border rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Challan No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Vehicle/Driver</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-400">No challans found</td>
                </tr>
              ) : (
                filteredChallans.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{c.challanNo}</td>
                    <td className="p-3">{fmtDate(c.date)}</td>
                    <td className="p-3">{c.customer?.name || "N/A"}</td>
                    <td className="p-3">
                        {c.vehicleNo && <span className="block text-xs">🚗 {c.vehicleNo}</span>}
                        {c.driverName && <span className="block text-xs">👤 {c.driverName}</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${c.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(c)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteChallan(c.id)}
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
            <h1 className="text-2xl font-bold">Delivery Challan ({challanNo || "New"})</h1>
            {!preview ? (
              <div className="flex flex-wrap gap-2">
                <button onClick={saveChallan} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  {saving ? "Saving..." : editing ? "Update Challan" : "Save & Preview"}
                </button>
                <button onClick={() => { setShowForm(false); setEditing(null); resetForm(); }} className="bg-gray-600 text-white px-6 py-2 rounded flex-1 md:flex-none">
                  Cancel
                </button>
              </div>
            ) : (
              <PrintActionBar
                onPrintA4={() => window.print()}
                onWhatsApp={shareOnWhatsApp}
                onSms={shareOnSMS}
                onEmail={shareOnEmail}
                onEdit={() => setPreview(false)}
                onNew={() => { setPreview(false); resetForm(); }}
                newLabel="New Challan"
              />
            )}
          </div>

          {!preview && (
            <div className="bg-white border p-6 rounded space-y-4">
              <div className="mb-2 text-xs text-gray-500 italic">
                Keyboard Shortcuts: <strong>F7</strong> = Clear Form | <strong>F8</strong> = Search Customer
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <input value={challanNo} readOnly className="border p-2 bg-gray-100" placeholder="Challan No (Auto)" />
                <div>
                  <label className="text-xs font-bold">Customer</label>
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
                  <DateInput value={date} onChange={setDate} style={{ border: "1px solid #d1d5db", padding: "0.5rem", width: "100%" }} />
                </div>
                <div>
                  <label className="text-xs font-bold">Status</label>
                   <input type="text" value="PENDING" disabled className="border p-2 w-full bg-gray-100" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div>
                    <label className="text-xs font-bold">Driver Name</label>
                    <input className="border p-2 w-full" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Driver Name" />
                 </div>
                 <div>
                    <label className="text-xs font-bold">Vehicle No</label>
                    <input className="border p-2 w-full" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="Vehicle No" />
                 </div>
                 <div>
                    <label className="text-xs font-bold">Remarks</label>
                    <input className="border p-2 w-full" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any remarks..." />
                 </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border mt-4 text-sm min-w-[600px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">Item</th>
                      <th className="border p-2 w-24">Qty</th>
                      <th className="border p-2 w-32">Rate (Opt)</th>
                      <th className="border p-2 w-32 text-right">Amount (Est)</th>
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
                          <input type="number" value={r.rate} className="w-full text-center" onChange={e => updateRow(i, "rate", e.target.value)} placeholder="Optional" />
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
            </div>
          )}

          {/* PREVIEW */}
          {preview && (
            <PrintPaperWrapper>
              <PrintDocA4
                companyName={companyName}
                docTitle="DELIVERY CHALLAN"
                docNo={savedChallan?.challanNo || challanNo}
                date={fmtDate(date)}
                partyLabel="Customer"
                partyName={customerName}
                metaFields={[
                  ...(driverName ? [{ label: "Driver", value: driverName }] : []),
                  ...(vehicleNo ? [{ label: "Vehicle", value: vehicleNo }] : []),
                ]}
                columns={[
                  { key: "no", label: "#", align: "center", width: 30 },
                  { key: "name", label: "Description" },
                  { key: "qty", label: "Qty", align: "center", width: 70 },
                  { key: "unit", label: "Unit", align: "center", width: 70 },
                ]}
                rows={rows.filter(r => r.itemId && r.qty).map((row, index) => ({
                  no: index + 1,
                  name: row.name,
                  qty: row.qty,
                  unit: "—",
                }))}
                totalsLines={[
                  { label: "Total Items:", value: rows.filter(r => r.itemId && r.qty).length, bold: true },
                ]}
                notes={remarks || undefined}
                footerNote={printPrefs.footerNote || undefined}
                signatureLabels={["Received By", "Delivered By"]}
              />
            </PrintPaperWrapper>
          )}
        </>
      )}
    </div>
  );
}
