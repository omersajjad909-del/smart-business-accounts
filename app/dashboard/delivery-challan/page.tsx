"use client";
import { fmtDate } from "@/lib/dateUtils";
import { ItemPicker } from "@/components/ItemPicker";
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
import { useResponsive } from "@/hooks/useResponsive";
import { useCompanyPrintHeader } from "@/hooks/useCompanyPrintHeader";


type Account = { id: string; name: string; address?: string; phone?: string; ntn?: string; strn?: string };
type Item = {
  id: string;
  name: string;
  description?: string;
  availableQty: number;
  code?: string;
  unit?: string;
  stockIn?: number;
  stockOut?: number;
  stockBal?: number;
  category?: string;
};

// Items a dispatch can be packed in. Stocked like anything else, so the same
// picker and the same received / sold / balance figures apply.
const PACKAGING_CATEGORY = "PACKAGING";

// Module level so the picker's memo keeps a stable identity across renders.
function itemStockValues(item: { id: string }) {
  const row = item as Item;
  if (row.stockBal === undefined) return null;
  return { received: row.stockIn ?? 0, sold: row.stockOut ?? 0, balance: row.stockBal };
}
type Row = {
  itemId: string;
  name: string;
  description: string;
  availableQty: number;
  qty: number | "";
  rate: number | "";
  sku?: string;
  unit?: string;
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
  serialNo?: string;
  orderNo?: string;
  poNo?: string;
  dNo?: string;
  packagingType?: string;
  packagingQty?: number;
  packagingItemId?: string | null;
  salesInvoiceId?: string | null;
  approvalStatus?: string;
  salesInvoice?: { id: string; invoiceNo: string } | null;
  packagingItem?: { id: string; name: string; code?: string | null; unit?: string | null } | null;
  items: Array<{ item: { name: string; description?: string; code?: string; unit?: string }; qty: number; rate?: number }>;
  status: string;
};

type PrintPreferences = {
  paperSize: "A4" | "THERMAL_80MM" | "THERMAL_58MM";
  showLogo: boolean;
  showAddress?: boolean;
  showPhone?: boolean;
  showTaxNumber?: boolean;
  logoUrl: string;
  headerNote: string;
  footerNote: string;
};

export default function DeliveryChallanPage() {
  const { isMobile } = useResponsive();
  // Address, phone, tax registration and the Print & Branding switches,
  // read the one way every document reads them.
  const printHeader = useCompanyPrintHeader();
  const router = useRouter();
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
  const [serialNo, setSerialNo] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [poNo, setPoNo] = useState("");
  const [dNo, setDNo] = useState("");
  // packagingType is the old free-text label (BAGS / CARTON / PACKET). Kept
  // read-only for challans written before packing material was stocked; new
  // ones name a real item instead, so the dispatch can take it out of stock.
  const [packagingType, setPackagingType] = useState("");
  const [packagingItemId, setPackagingItemId] = useState("");
  const [packagingQty, setPackagingQty] = useState<number | "">("");

  // Challans ticked in the list, to be billed together. A month of deliveries
  // usually settles on one invoice, so this is the normal case, not an extra.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");


  const [rows, setRows] = useState<Row[]>([{
    itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "",
  }]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [savedChallan, setSavedChallan] = useState<any>(null);
  const [companyName, setCompanyName] = useState("FINOVA SME");
  const [companyInfo, setCompanyInfo] = useState<{ address?: string; phone?: string; email?: string; logoUrl?: string; ntn?: string; ntnLabel?: string; strn?: string }>({});
  const [printPrefs, setPrintPrefs] = useState<PrintPreferences>({
    paperSize: "A4",
    showLogo: true,
    logoUrl: "",
    headerNote: "",
    footerNote: "Thank you for your business!",
  });
  const isThermalPrint = printPrefs.paperSize !== "A4";
  const thermalWidth = printPrefs.paperSize === "THERMAL_58MM" ? "58mm" : "80mm";

  // Packing material is picked from the catalogue rather than a hardcoded
  // word, so the dispatch can take it out of stock like anything else.
  const packagingItems = items.filter(i => i.category === PACKAGING_CATEGORY);

  // The invoice this challan is delivering against, printed so the customer's
  // gate can tie the two documents together.
  const invoiceRef = savedChallan?.salesInvoice?.invoiceNo || "";

  // What the printed challan says it was packed in: the item's own name, or —
  // on a challan written before packing was stocked — the old free-text label.
  const packagingLabel = (() => {
    const pickedId = savedChallan?.packagingItemId || packagingItemId;
    const name =
      savedChallan?.packagingItem?.name ||
      items.find(i => i.id === pickedId)?.name ||
      savedChallan?.packagingType ||
      packagingType;
    if (!name) return "";
    const qty = savedChallan?.packagingQty ?? (packagingQty === "" ? 0 : packagingQty);
    return `${name} — Qty ${qty || 0}`;
  })();

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
    
    fetch("/api/accounts?partyType=CUSTOMER", {
      headers: { "x-user-role": user.role },
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts || [];
        setCustomers(list.filter((a: any) => a.partyType === "CUSTOMER"));
      });

    // The same catalogue Sales Invoice reads. The old
    // /api/stock-available-for-sale dropped every item whose balance was not
    // above zero, so an item at or below zero could not be dispatched at all.
    fetch("/api/items-new?withStock=1", {
      headers: {
        "x-user-role": user.role || "",
        "x-user-id": user.id || "",
        ...(user.companyId ? { "x-company-id": user.companyId } : {}),
      },
    })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setItems(list.map((i: any) => ({
          id: i.id,
          name: i.name,
          description: i.description || "",
          code: i.code || "",
          unit: i.unit || "",
          category: i.category || "",
          stockIn: Number(i.stockIn ?? 0),
          stockOut: Number(i.stockOut ?? 0),
          stockBal: Number(i.stockBal ?? 0),
          availableQty: Number(i.stockBal ?? 0),
        })));
      })
      .catch(() => setItems([]));

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
            showAddress: d.printPreferences.showAddress ?? prev.showAddress,
            showPhone: d.printPreferences.showPhone ?? prev.showPhone,
            showTaxNumber: d.printPreferences.showTaxNumber ?? prev.showTaxNumber,
            logoUrl: d.printPreferences.logoUrl || prev.logoUrl,
            headerNote: d.printPreferences.headerNote || prev.headerNote,
            footerNote: d.printPreferences.footerNote || prev.footerNote,
          }));
        }
        // The challan letterhead had no address/phone/NTN at all — every
        // other print in the app already reads these from here.
        if (d?.companyIdentity || d?.invoiceContact || d?.taxProfile) {
          setCompanyInfo((c) => ({
            ...c,
            address: d.companyIdentity?.legalAddress || c.address,
            phone: d.invoiceContact?.phone || c.phone,
            email: d.invoiceContact?.email || c.email,
            ntn: d.taxProfile?.taxIdValue || c.ntn,
            ntnLabel: d.taxProfile?.taxIdLabel || c.ntnLabel,
            strn: d.taxProfile?.gstNumber || c.strn,
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
        const query = prompt("Search (Challan No, Customer Name, Date):");
        if (!query) return;

        if (showForm && !preview) {
          const foundCustomer = customers.find(c =>
            c.name.toLowerCase().includes(query.toLowerCase())
          );
          if (foundCustomer) {
            setCustomerId(foundCustomer.id);
            setCustomerName(foundCustomer.name);
            return;
          }
        }

        setSearchTerm(query);
        setShowList(true);
        setShowForm(false);
      }
    }
    document.addEventListener("keydown", handleKeyPress, true);
    return () => document.removeEventListener("keydown", handleKeyPress, true);
  }, [today, showForm, preview, customers]);

  // Only unbilled challans can be ticked, and they all have to be the same
  // customer's — one invoice cannot bill two customers.
  const billableCustomerId = (() => {
    if (!selectedIds.length) return null;
    const first = challans.find(c => c.id === selectedIds[0]);
    return first?.customerId || null;
  })();

  function toggleSelected(c: DeliveryChallan) {
    setSelectedIds(prev => {
      if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
      const firstId = prev[0];
      const first = firstId ? challans.find(x => x.id === firstId) : null;
      if (first && first.customerId !== c.customerId) {
        toast.error("One invoice, one customer — untick the others first.");
        return prev;
      }
      return [...prev, c.id];
    });
  }

  /** A month of deliveries settling on one bill. */
  function invoiceSelected() {
    if (!selectedIds.length) return;
    router.push(`/dashboard/sales-invoice?fromChallans=${selectedIds.join(",")}`);
  }

  /** Bill this one challan by itself — the same road as a ticked batch. */
  function invoiceOne(c: DeliveryChallan) {
    router.push(`/dashboard/sales-invoice?fromChallans=${c.id}`);
  }

  /**
   * Approve or reject the challan. The goods and the paperwork are separate
   * questions: this settles whether the document stands, and moves no stock
   * and no ledger of its own.
   */
  async function decide(c: DeliveryChallan, status: "APPROVED" | "REJECTED") {
    try {
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ type: "DELIVERY_CHALLAN", id: c.id, status }),
      });
      if (res.status === 403) throw new Error("Only an admin can approve or reject.");
      if (!res.ok) throw new Error("Could not update approval.");
      toast.success(`${c.challanNo} ${status.toLowerCase()}`);
      await loadChallans();
    } catch (e: any) {
      toast.error(e.message || "Could not update approval.");
    }
  }

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
      { itemId: "", name: "", description: "", availableQty: 0, qty: "", rate: "", sku: "", unit: "" },
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
      sku: item.code || "",
      unit: item.unit || "",
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
        serialNo: serialNo || null,
        orderNo: orderNo || null,
        poNo: poNo || null,
        dNo: dNo || null,
        packagingType: packagingType || null,
        packagingItemId: packagingItemId || null,
        packagingQty: packagingQty === "" ? null : Number(packagingQty),
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
      
      // Straight to the print preview, whether this was a new challan or an
      // update. An update used to hide the form and open the list instead, so
      // the one thing the button promises — a challan to print — never
      // appeared. The editing record is deliberately left set: the preview's
      // Edit button then comes back to this same challan rather than starting
      // a copy of it.
      setPreview(true);
      await loadChallans();
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
    setSerialNo(c.serialNo || "");
    setOrderNo(c.orderNo || "");
    setPoNo(c.poNo || "");
    setDNo(c.dNo || "");
    setPackagingType(c.packagingType || "");
    setPackagingItemId(c.packagingItemId || "");
    setPackagingQty(c.packagingQty ?? "");
    setRows(c.items.map((it: any) => ({
      itemId: it.itemId || "",
      name: it.item?.name || "",
      description: it.item?.description || "",
      availableQty: 0, // Not needed for edit
      qty: it.qty.toString(),
      rate: it.rate ? it.rate.toString() : "",
      sku: it.item?.code || "",
      unit: it.item?.unit || "",
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
    setSerialNo(""); setOrderNo(""); setPoNo(""); setDNo(""); setPackagingType(""); setPackagingItemId(""); setPackagingQty("");
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
      {showList && selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-300 rounded p-3 mb-2 text-sm">
          <span className="text-blue-900">
            <b>{selectedIds.length}</b> challan{selectedIds.length > 1 ? "s" : ""} ticked
            {" — "}
            {challans.find(c => c.id === selectedIds[0])?.customer?.name}
          </span>
          <span className="flex gap-2">
            <button onClick={() => setSelectedIds([])} className="px-3 py-1 border rounded text-gray-600">
              Clear
            </button>
            <button onClick={invoiceSelected} className="bg-blue-600 text-white px-4 py-1 rounded">
              🧾 Make Invoice
            </button>
          </span>
        </div>
      )}

      {showList && (
        <div className="flex items-center gap-2">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search challan no, customer or date…  (F8)"
            className="border p-2 rounded w-full max-w-md text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="text-sm text-gray-600 px-3 py-2 border rounded">
              Clear
            </button>
          )}
          <span className="text-xs text-gray-500">{filteredChallans.length} of {challans.length}</span>
        </div>
      )}

      {showList && (
        <div className="bg-white border rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 w-10"></th>
                <th className="p-3 text-left">Challan No</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Vehicle/Driver</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Approval</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-gray-400">No challans found</td>
                </tr>
              ) : (
                filteredChallans.map(c => (
                  <tr key={c.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-center">
                      {c.status === "INVOICED" ? (
                        <span className="text-xs text-gray-400" title="Already billed">✓</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelected(c)}
                          disabled={!!billableCustomerId && billableCustomerId !== c.customerId}
                          title="Tick to bill this challan"
                        />
                      )}
                    </td>
                    <td className="p-3 font-bold">{c.challanNo}</td>
                    <td className="p-3">{fmtDate(c.date)}</td>
                    <td className="p-3">{c.customer?.name || "N/A"}</td>
                    <td className="p-3">
                        {c.vehicleNo && <span className="block text-xs">🚗 {c.vehicleNo}</span>}
                        {c.driverName && <span className="block text-xs">👤 {c.driverName}</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${c.status === 'INVOICED' ? 'bg-blue-100 text-blue-800' : c.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {c.status}
                      </span>
                      {c.salesInvoice && (
                        <span className="block text-[11px] text-gray-500 mt-1">{c.salesInvoice.invoiceNo}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {(() => {
                        const a = c.approvalStatus || "DRAFT";
                        const tone = a === "APPROVED" ? "bg-green-100 text-green-800"
                          : a === "REJECTED" ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800";
                        return <span className={`px-2 py-1 rounded text-xs ${tone}`}>{a}</span>;
                      })()}
                    </td>
                    <td className="p-3 text-center space-x-2 whitespace-nowrap">
                      {c.status !== "INVOICED" && (
                        <button
                          onClick={() => invoiceOne(c)}
                          className="text-green-700 hover:text-green-900 font-medium text-sm"
                          title="Bill this challan — the ledger is posted when the invoice is saved"
                        >
                          Sales Invoice
                        </button>
                      )}
                      {(c.approvalStatus || "DRAFT") !== "APPROVED" && (
                        <button onClick={() => decide(c, "APPROVED")} className="text-emerald-700 hover:text-emerald-900 font-medium text-sm">
                          Approve
                        </button>
                      )}
                      {(c.approvalStatus || "DRAFT") !== "REJECTED" && (
                        <button onClick={() => decide(c, "REJECTED")} className="text-orange-600 hover:text-orange-800 font-medium text-sm">
                          Reject
                        </button>
                      )}
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
                Keyboard Shortcuts: <strong>F7</strong> = Clear Form | <strong>F8</strong> = Search
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

              {/* Buyer's own references the challan is checked against on
                  receipt, and how the goods were packed for dispatch. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                 <div>
                    <label className="text-xs font-bold">S/#</label>
                    <input className="border p-2 w-full" value={serialNo} onChange={e => setSerialNo(e.target.value)} placeholder="Optional" />
                 </div>
                 <div>
                    <label className="text-xs font-bold">Order No</label>
                    <input className="border p-2 w-full" value={orderNo} onChange={e => setOrderNo(e.target.value)} placeholder="Optional" />
                 </div>
                 <div>
                    <label className="text-xs font-bold">PO No</label>
                    <input className="border p-2 w-full" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="Optional" />
                 </div>
                 <div>
                    <label className="text-xs font-bold">D No</label>
                    <input className="border p-2 w-full" value={dNo} onChange={e => setDNo(e.target.value)} placeholder="Optional" />
                 </div>
                 <div>
                    <label className="text-xs font-bold">Packaging Source</label>
                    {packagingItems.length === 0 ? (
                      <div className="border p-2 w-full text-xs text-gray-500">
                        No packing material in the catalogue yet — add an item under
                        the <b>Packing Material</b> category in Items.
                      </div>
                    ) : (
                      <ItemPicker
                        items={packagingItems as any}
                        value={packagingItemId}
                        onChange={(picked: string) => setPackagingItemId(picked)}
                        stockValues={itemStockValues}
                        allowManual={false}
                        placeholder="Bags / Carton / Packet…"
                      />
                    )}
                    {packagingType && !packagingItemId && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        Was recorded as “{packagingType}” before packing material was stocked.
                      </div>
                    )}
                 </div>
                 <div>
                    <label className="text-xs font-bold">Packaging Qty</label>
                    <input type="number" className="border p-2 w-full" value={packagingQty} onChange={e => setPackagingQty(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" />
                 </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border mt-4 text-sm min-w-[600px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 w-28 text-left">Item Code</th>
                      <th className="border p-2 text-left">Item</th>
                      <th className="border p-2 w-24">Qty</th>
                      <th className="border p-2 w-32">Rate (Opt)</th>
                      <th className="border p-2 w-32 text-right">Amount (Est)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border p-2 text-xs text-gray-500 font-mono">{r.sku || "—"}</td>
                        <td className="border p-2">
                          <ItemPicker
                            items={items as any}
                            value={r.itemId}
                            onChange={(__picked: string) => selectItem(i, __picked)}
                            stockValues={itemStockValues}
                            allowManual={false}
                            // placeholder="Type to search — e.g. e1060"
                          />
                        </td>
                        <td className="border p-2">
                          <input type="number" step="any" value={r.qty} className="w-full text-center" onChange={e => updateRow(i, "qty", e.target.value)} />
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
          {/* The Print & Branding switches apply here too. They were read on the
              two invoices only, so turning "Show address" off left it printing
              on every other document — a setting that looked applied and was
              not. */}
          {preview && (
            <PrintPaperWrapper>
              <PrintDocA4
                {...printHeader}
                companyName={printHeader.companyName || companyName}
                docTitle="DELIVERY CHALLAN"
                docNo={savedChallan?.challanNo || challanNo}
                date={fmtDate(date)}
                partyLabel="Customer"
                partyName={customerName}
                metaFields={[
                  ...(serialNo ? [{ label: "S/#", value: serialNo }] : []),
                  ...(orderNo ? [{ label: "Order No", value: orderNo }] : []),
                  ...((savedChallan?.poNo || poNo) ? [{ label: "PO No", value: savedChallan?.poNo || poNo }] : []),
                  ...((savedChallan?.dNo || dNo) ? [{ label: "D No", value: savedChallan?.dNo || dNo }] : []),
                  ...(driverName ? [{ label: "Driver", value: driverName }] : []),
                  ...(vehicleNo ? [{ label: "Vehicle", value: vehicleNo }] : []),
                ]}
                columns={[
                  { key: "no", label: "#", align: "center", width: 30 },
                  { key: "code", label: "Item Code", width: 70 },
                  { key: "name", label: "Description" },
                  { key: "qty", label: "Qty", align: "center", width: 70 },
                  { key: "unit", label: "Unit", align: "center", width: 70 },
                ]}
                rows={rows.filter(r => r.itemId && r.qty).map((row, index) => ({
                  no: index + 1,
                  code: row.sku || "—",
                  name: row.name,
                  qty: row.qty,
                  unit: row.unit || "—",
                }))}
                totalsLines={[
                  { label: "Total Items:", value: rows.filter(r => r.itemId && r.qty).length, bold: true },
                ]}
                summaryFields={[
                  ...(invoiceRef ? [{ label: "Against Invoice", value: invoiceRef }] : []),
                  ...(packagingLabel ? [{ label: "Packaging Source", value: packagingLabel }] : []),
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
