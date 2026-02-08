"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

type PO = {
  id: string;
  poNo: string;
  date: string;
  supplierId: string;
  supplier?: { name: string };
  remarks?: string;
  items: Array<{ item: { name: string }; qty: number; rate: number }>;
};

export default function PurchaseOrderPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [showList, setShowList] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editing, setEditing] = useState<PO | null>(null);

  const [poNo, setPoNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [date, setDate] = useState(today);
  const [remarks, setRemarks] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("PENDING");
  const [rows, setRows] = useState([{ itemId: "", name: "", desc: "", qty: "", rate: "" }]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savedPO, setSavedPO] = useState<PO | null>(null);

  // Email Modal State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");


  // Keyboard shortcuts - F7: Clear date/customer, F8: Query dialog
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // Use code for function keys
      if (e.code === "F7" || e.key === "F7") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !preview) {
          setDate(today);
          setSupplierId("");
          setSupplierName("");
        }
      }
      if (e.code === "F8" || e.key === "F8") {
        e.preventDefault();
        e.stopPropagation();
        if (showForm && !preview) {
          // Open query/search dialog
          const query = prompt("Enter search query (Invoice No, Supplier Name, etc.):");
          if (query) {
            // Search in suppliers
            const foundSupplier = suppliers.find(s =>
              s.name.toLowerCase().includes(query.toLowerCase())
            );
            if (foundSupplier) {
              setSupplierId(foundSupplier.id);
              setSupplierName(foundSupplier.name);
            } else {
              toast.error(`No supplier found matching "${query}"`);
            }
          }
        }
      }
    }
    document.addEventListener("keydown", handleKeyPress, true);
    return () => document.removeEventListener("keydown", handleKeyPress, true);
  }, [today, showForm, preview, suppliers]);

  /* LOAD DATA */
  useEffect(() => {
    loadPOs();
    fetch("/api/accounts", { 
      headers: { 
        "x-user-role": user?.role || "ADMIN",
        "x-user-id": user?.id || "",
        "x-company-id": user?.companyId || ""
      } 
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load accounts");
        return r.json();
      })
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts;
        if (Array.isArray(list)) {
          setSuppliers(list.filter((a: any) => a.partyType === "SUPPLIER"));
        } else {
          setSuppliers([]);
        }
      })
      .catch(err => {
        console.error("Error loading suppliers:", err);
        setSuppliers([]);
      });

    fetch("/api/items-new", { 
      headers: { 
        "x-user-role": user?.role || "ADMIN",
        "x-user-id": user?.id || "",
        "x-company-id": user?.companyId || ""
      } 
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load items");
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data);
        } else {
          console.error("Items API returned non-array:", data);
          setItems([]);
        }
      })
      .catch(err => {
        console.error("Error loading items:", err);
        setItems([]);
      });
  }, []);

  async function loadPOs() {
    try {
      // Load next PO number
      const nextRes = await fetch("/api/purchase-order?nextNo=true", { 
        headers: { 
          "x-user-role": user?.role || "ADMIN",
          "x-user-id": user?.id || "",
          "x-company-id": user?.companyId || ""
        } 
      });
      const nextData = await nextRes.json();
      if (nextData?.poNo) setPoNo(nextData.poNo);

      // Load all POs
      const res = await fetch("/api/purchase-order", { 
        headers: { 
          "x-user-role": user?.role || "ADMIN",
          "x-user-id": user?.id || "",
          "x-company-id": user?.companyId || ""
        } 
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPos(data);
      } else {
        console.error("POs API returned non-array:", data);
        setPos([]);
      }
    } catch (e) {
      console.error("Load POs error:", e);
      setPos([]);
    }
  }

  function updateRow(i: number, key: string, val: any) {
    const copy = [...rows];
    (copy[i] as any)[key] = val;
    setRows(copy);
  }

  function addRow() {
    setRows([...rows, { itemId: "", name: "", desc: "", qty: "", rate: "" }]);
  }

  const total = rows.reduce((s, r) => s + (r.qty && r.rate ? Number(r.qty) * Number(r.rate) : 0), 0);

  async function savePO() {
    const clean = rows.filter(r => r.itemId && r.qty);
    if (!supplierId || clean.length === 0) { toast.error("Supplier aur items zaroori hain"); return; }
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { id: editing.id, poNo, supplierId, date, remarks, approvalStatus, items: clean }
        : { poNo, supplierId, date, remarks, approvalStatus, items: clean };

      const res = await fetch("/api/purchase-order", {
        method,
        headers: { "Content-Type": "application/json", "x-user-role": user?.role || "ADMIN" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedPO(data);   // 🔥 IMPORTANT
        setPreview(true);
        await loadPOs();


        if (editing) {
          setEditing(null);
          setShowForm(false);
          setShowList(true);
        }
      }
      else {
        const err = await res.json();
        alert(err.error || "Saving failed");
      }
    } catch (_err) { alert("Error saving PO"); }
    finally { setSaving(false); }
  }

  function startEdit(po: PO) {
    setEditing(po);
    setPoNo(po.poNo);
    setSupplierId(po.supplierId);
    setSupplierName(po.supplier?.name || "");
    setDate(new Date(po.date).toISOString().slice(0, 10));
    setRemarks(po.remarks || "");
    setRows(po.items.map((it: any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      desc: it.item?.description || "",
      qty: it.qty.toString(),
      rate: it.rate.toString(),
    })));
    setShowForm(true);
    setShowList(false);
  }

  async function deletePO(id: string) {
    if (!confirm("Are you sure you want to delete this PO?")) return;
    try {
      const res = await fetch(`/api/purchase-order?id=${id}`, {
        method: "DELETE",
        headers: { 
          "x-user-role": user?.role || "ADMIN",
          "x-user-id": user?.id || "",
          "x-company-id": user?.companyId || ""
        },
      });
      if (res.ok) {
        alert("PO deleted successfully");
        await loadPOs();
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
    setPoNo("");
    setSupplierId("");
    setSupplierName("");
    setDate(today);
    setRemarks("");
    setApprovalStatus("PENDING");
    setRows([{ itemId: "", name: "", desc: "", qty: "", rate: "" }]);
    setPreview(false);
  }

  function openEmailModal() {
    if (!preview) {
      toast.error("Please save and preview the PO first");
      return;
    }
    // Try to find supplier email
    const supplier = suppliers.find(s => s.id === supplierId);
    setRecipientEmail(supplier?.email || "");
    setEmailModalOpen(true);
  }

  async function confirmSendEmail() {
    if (!recipientEmail || !recipientEmail.includes("@")) {
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
          type: "purchase-order",
          invoiceId: savedPO?.id,
          to: recipientEmail,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("✅ Email sent successfully!");
        setEmailModalOpen(false);
      } else {
        toast.error(data.error || "Failed to send email");
      }
    } catch (_error) {
      toast.error("Failed to send email. Please check email configuration.");
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-black">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Purchase Order</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowList(!showList); setShowForm(!showForm); setEditing(null); }}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            {showList ? "Hide List" : "Show List"}
          </button>
          <button
            onClick={() => { setShowForm(true); setShowList(false); resetForm(); loadPOs(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + New PO
          </button>
        </div>
      </div>

      {/* LIST VIEW */}
      {showList && (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">PO No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">No POs found</td>
                </tr>
              ) : (
                pos.map(po => (
                  <tr key={po.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-bold">{po.poNo}</td>
                    <td className="p-3">{new Date(po.date).toLocaleDateString()}</td>
                    <td className="p-3">{po.supplier?.name || "N/A"}</td>
                    <td className="p-3 text-right">{po.items?.length || 0}</td>
                    <td className="p-3 text-center space-x-2">
                      <button
                        onClick={() => startEdit(po)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePO(po.id)}
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
          <div className="flex justify-between items-center bg-gray-50 p-4 border rounded-lg print:hidden font-sans">
            <h1 className="text-xl font-bold">{editing ? "Edit PO" : "Create Purchase Order"}</h1>
            <div className="flex gap-3">
              {!preview ? (
                <button
                  onClick={savePO}
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-2 rounded font-bold uppercase"
                >
                  {saving ? "Saving..." : editing ? "Update PO" : "Save & Preview"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => window.print()}
                    className="bg-green-600 text-white px-6 py-2 rounded font-bold uppercase"
                  >
                    Print / Download PDF
                  </button>
                  <button
                    onClick={openEmailModal}
                    disabled={sendingEmail}
                    className="bg-blue-600 text-white px-6 py-2 rounded font-bold uppercase disabled:bg-gray-400"
                  >
                    {sendingEmail ? "Sending..." : "📧 Email"}
                  </button>
                  <button
                    onClick={() => setPreview(false)}
                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded font-bold uppercase border"
                  >
                    Back to Edit
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  resetForm();
                }}
                className="bg-gray-600 text-white px-6 py-2 rounded font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          </div>

          {!preview && (
            <div className="bg-white border p-8 rounded-xl shadow-sm space-y-6">
              <div className="mb-2 text-xs text-gray-500 italic">
                💡 Keyboard Shortcuts: <strong>F7</strong> = Clear Date & Supplier | <strong>F8</strong> = Search Query
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                <div><label className="text-xs font-bold uppercase text-gray-500">PO Number</label><input className="border w-full p-2 bg-gray-50 rounded font-bold" value={poNo} disabled /></div>
                <div><label className="text-xs font-bold uppercase text-gray-500">Order Date (F7: Clear)</label><input type="date" className="border w-full p-2 rounded font-bold" value={date} onChange={e => setDate(e.target.value)} /></div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-500">Approval Status</label>
                  <select
                    className="border w-full p-2 rounded font-bold bg-white"
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Select Supplier (F7: Clear, F8: Query)</label>
                <select className="border p-2 w-full rounded font-bold" value={supplierId} onChange={e => {
                  setSupplierId(e.target.value);
                  const s = suppliers.find(x => x.id === e.target.value);
                  setSupplierName(s?.name || "");
                }}>
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <table className="w-full text-left font-sans">
                <thead className="border-b-2">
                  <tr className="text-xs uppercase text-gray-400">
                    <th className="pb-2">Item Description</th>
                    <th className="w-24 text-center pb-2">Qty</th>
                    <th className="w-32 text-right pb-2">Rate</th>
                    <th className="w-32 text-right pb-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3">
                        <select className="w-full p-1 border rounded font-bold" value={r.itemId} onChange={e => {
                          const it = items.find(x => x.id === e.target.value);
                          if (!it) return;
                          updateRow(i, "itemId", it.id);
                          updateRow(i, "name", it.name);
                          updateRow(i, "desc", it.description || "");
                        }}>
                          <option value="">Select Item</option>
                          {items.map(it => <option key={it.id} value={it.id}>{it.name} ({it.description})</option>)}
                        </select>
                      </td>
                      <td><input type="number" className="w-full text-center border rounded p-1 font-bold" value={r.qty} onChange={e => updateRow(i, "qty", e.target.value)} /></td>
                      <td><input type="number" className="w-full text-right border rounded p-1 font-bold" value={r.rate} onChange={e => updateRow(i, "rate", e.target.value)} /></td>
                      <td className="text-right font-black">{(Number(r.qty) * Number(r.rate)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addRow} className="text-blue-600 font-bold uppercase text-xs">+ Add New Row</button>
              <textarea className="border w-full p-3 rounded h-24 font-sans text-sm" placeholder="Any Special Remarks..." value={remarks} onChange={e => setRemarks(e.target.value)} />
              <div className="text-right text-3xl font-black text-blue-700">Rs. {total.toLocaleString()}</div>
            </div>
          )}

          {/* PREVIEW */}
          {preview && (
            <div className="invoice-print bg-white border-2 p-12 shadow-2xl rounded-sm mx-auto min-h-[297mm] print:shadow-none print:border-0 print:p-0 text-black">
              <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
                <div>
                  <h1 className="text-4xl font-black tracking-tighter">US TRADERS</h1>
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-500">Premium Quality Industrial Suppliers</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black uppercase italic">Purchase Order</h2>
                  <div className="mt-2 text-sm font-bold">
                    <p>{poNo}</p>
                    <p>Date: {date}</p>
                  </div>
                </div>
              </div>

              <div className="mb-10 bg-gray-100 p-4 border-l-8 border-black">
                <h3 className="text-[10px] uppercase font-black text-gray-400">Vendor / Supplier:</h3>
                <p className="text-xl font-black uppercase underline">{supplierName}</p>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-black text-white text-xs uppercase">
                    <th className="p-3 text-left w-12">#</th>
                    <th className="p-3 text-left">Item Name</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-center w-20">Qty</th>
                    <th className="p-3 text-right w-28">Rate</th>
                    <th className="p-3 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b-2 border-black font-bold">
                      <td className="p-3 text-gray-500">{i + 1}</td>
                      <td className="p-3 uppercase">{r.name}</td>
                      <td className="p-3 text-xs text-gray-600 italic leading-tight">{r.desc}</td>
                      <td className="p-3 text-center">{r.qty}</td>
                      <td className="p-3 text-right">{Number(r.rate).toLocaleString()}</td>
                      <td className="p-3 text-right font-black">{(Number(r.qty) * Number(r.rate)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  {remarks && (
                    <div className="space-y-1">
                      <h4 className="text-[10px] uppercase font-black text-gray-400">Remarks:</h4>
                      <p className="text-sm border-l-4 border-gray-300 pl-3 font-medium italic">{remarks}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xl border-t-4 border-black pt-3 font-black uppercase">
                    <span>Net Total:</span>
                    <span>Rs. {total.toLocaleString()}</span>
                  </div>
                  <div className="pt-20 flex justify-between gap-4">
                    <div className="flex-1 border-t-2 border-black text-center text-[9px] font-black uppercase pt-1">Prepared By</div>
                    <div className="flex-1 border-t-2 border-black text-center text-[9px] font-black uppercase pt-1">Authorized</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* EMAIL MODAL */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Send Email</h2>
            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="supplier@example.com"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmSendEmail}
                disabled={sendingEmail}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {sendingEmail ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
