"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`nimport { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";

type GRNItem = {
  itemId: string;
  name: string;
  orderedQty: string;
  receivedQty: string;
  rate: string;
  remarks: string;
};

type GRN = {
  id: string;
  grnNo: string;
  date: string;
  status: string;
  supplier?: { name: string };
  po?: { poNo: string } | null;
  items: Array<{ item: { name: string; unit: string }; orderedQty: number; receivedQty: number; rate: number; amount: number }>;
};

type PO = { id: string; poNo: string; supplier: { id: string; name: string }; items: Array<{ itemId: string; item: { id: string; name: string; unit: string }; qty: number; rate: number }> };

export default function GRNPage() {
  const today = new Date().toISOString().slice(0, 10);
  const user = getCurrentUser();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [showList, setShowList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [grnNo, setGrnNo] = useState("");
  const [date, setDate] = useState(today);
  const [poId, setPoId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState<GRNItem[]>([
    { itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" },
  ]);

  useEffect(() => {
    fetch("/api/accounts?type=SUPPLIER", { headers: buildHeaders() })
      .then((r) => r.json())
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch("/api/items-new", { headers: buildHeaders() })
      .then((r) => r.json())
      .then((d) => setAllItems(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch("/api/purchase-order", { headers: buildHeaders() })
      .then((r) => r.json())
      .then((d) => setPos(Array.isArray(d) ? d : []))
      .catch(() => {});

    loadGRNs();
  }, []);

  function buildHeaders(): Record<string, string> {
    const u = getCurrentUser();
    return {
      "Content-Type": "application/json",
      "x-company-id": u?.companyId || "",
      "x-user-role": u?.role || "",
      "x-user-id": u?.id || "",
    };
  }

  function loadGRNs() {
    fetch("/api/grn", { headers: buildHeaders() })
      .then((r) => r.json())
      .then((d) => setGrns(Array.isArray(d) ? d : []))
      .catch(() => {});
  }

  function handlePOSelect(selectedPoId: string) {
    setPoId(selectedPoId);
    if (!selectedPoId) return;
    const po = pos.find((p) => p.id === selectedPoId);
    if (!po) return;
    setSupplierId(po.supplier.id);
    setRows(
      po.items.map((i) => ({
        itemId: i.itemId,
        name: i.item.name,
        orderedQty: String(i.qty),
        receivedQty: String(i.qty),
        rate: String(i.rate),
        remarks: "",
      }))
    );
  }

  function updateRow(idx: number, field: keyof GRNItem, value: string) {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "itemId") {
      const found = allItems.find((it: any) => it.id === value);
      if (found) updated[idx].name = found.name;
    }
    setRows(updated);
  }

  function addRow() {
    setRows([...rows, { itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" }]);
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setGrnNo("");
    setDate(today);
    setPoId("");
    setSupplierId("");
    setRemarks("");
    setRows([{ itemId: "", name: "", orderedQty: "", receivedQty: "", rate: "", remarks: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!grnNo || !supplierId || rows.some((r) => !r.itemId || !r.receivedQty)) {
      toast.error("Fill GRN No, Supplier, and all item rows");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/grn", {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({
          grnNo,
          date,
          poId: poId || null,
          supplierId,
          remarks,
          items: rows.map((r) => ({
            itemId: r.itemId,
            orderedQty: Number(r.orderedQty) || 0,
            receivedQty: Number(r.receivedQty),
            rate: Number(r.rate) || 0,
            remarks: r.remarks,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast.success("GRN saved successfully");
      resetForm();
      loadGRNs();
      setShowList(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!await confirmToast("Delete this GRN?")) return;
    const res = await fetch(`/api/grn?id=${id}`, { method: "DELETE", headers: buildHeaders() });
    if (res.ok) {
      toast.success("Deleted");
      loadGRNs();
    } else {
      toast.error("Delete failed");
    }
  }

  const totalAmount = rows.reduce(
    (sum, r) => sum + (Number(r.receivedQty) || 0) * (Number(r.rate) || 0),
    0
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goods Receipt Note (GRN)</h1>
          <p className="text-sm text-gray-500">Record goods received from suppliers against PO</p>
        </div>
        <button
          onClick={() => setShowList(!showList)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          {showList ? "New GRN" : `View All GRNs (${grns.length})`}
        </button>
      </div>

      {showList ? (
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">GRN No</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">PO Ref</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No GRNs found
                  </td>
                </tr>
              ) : (
                grns.map((grn) => (
                  <tr key={grn.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{grn.grnNo}</td>
                    <td className="px-4 py-3">{new Date(grn.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{grn.supplier?.name || "-"}</td>
                    <td className="px-4 py-3">{grn.po?.poNo || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          grn.status === "RECEIVED"
                            ? "bg-green-100 text-green-700"
                            : grn.status === "PARTIAL"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{grn.items.length} items</td>
                    <td className="px-4 py-3">
                      {user?.role === "ADMIN" && (
                        <button
                          onClick={() => handleDelete(grn.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">GRN Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GRN No *</label>
                <input
                  value={grnNo}
                  onChange={(e) => setGrnNo(e.target.value)}
                  placeholder="GRN-001"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Against PO</label>
                <select
                  value={poId}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select PO (optional) --</option>
                  {pos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNo} â€” {p.supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl shadow border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Items Received</h2>
              <button
                type="button"
                onClick={addRow}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                    <th className="px-3 py-2 text-left">Item *</th>
                    <th className="px-3 py-2 text-center">Ordered Qty</th>
                    <th className="px-3 py-2 text-center">Received Qty *</th>
                    <th className="px-3 py-2 text-center">Rate</th>
                    <th className="px-3 py-2 text-center">Amount</th>
                    <th className="px-3 py-2 text-left">Remarks</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-2 py-2">
                        <select
                          value={row.itemId}
                          onChange={(e) => updateRow(idx, "itemId", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500"
                          required
                        >
                          <option value="">-- Item --</option>
                          {allItems.map((it: any) => (
                            <option key={it.id} value={it.id}>
                              {it.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={row.orderedQty}
                          onChange={(e) => updateRow(idx, "orderedQty", e.target.value)}
                          className="w-24 border rounded px-2 py-1 text-sm text-center"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={row.receivedQty}
                          onChange={(e) => updateRow(idx, "receivedQty", e.target.value)}
                          className="w-24 border rounded px-2 py-1 text-sm text-center"
                          placeholder="0"
                          required
                          min="0"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={row.rate}
                          onChange={(e) => updateRow(idx, "rate", e.target.value)}
                          className="w-28 border rounded px-2 py-1 text-sm text-center"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </td>
                      <td className="px-2 py-2 text-center text-gray-700 font-medium">
                        {((Number(row.receivedQty) || 0) * (Number(row.rate) || 0)).toLocaleString()}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={row.remarks}
                          onChange={(e) => updateRow(idx, "remarks", e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                          placeholder="Note..."
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="text-red-400 hover:text-red-600 text-lg leading-none"
                        >
                          Ã—
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <span className="text-sm text-gray-500 mr-3">Total Amount:</span>
                <span className="text-xl font-bold text-gray-900">
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save GRN"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
