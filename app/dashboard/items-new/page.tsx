import toast from "react-hot-toast";
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Item = {
  id: string;
  code: string;
  name: string;
  unit: string;
  rate: number;
  minStock: number; 
  barcode?: string | null;
  description?: string | null;
};

export default function ItemsNewPage() {
  const user = getCurrentUser();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [rate, setRate] = useState("");
  const [minStock, setMinStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const _UNITS = ["PCS","KG","GM","TON","QTL","MND","LTR","ML","BTL","DRM","MTR","CM","FT","YD","IN","SFT","SQM","BOX","PACK","CTN","BAG","ROLL","SHEET","BDL","DOZ","PAIR","SET","UNIT","NO"];


  async function loadItems() {
    try {
      const res = await fetch("/api/items-new", {
        headers: {
          "x-user-role": user?.role || "ADMIN",
          "x-company-id": user?.companyId || "",
        },
      });

      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
      else setItems([]);
    } catch {
      setItems([]);
    }
  }


  useEffect(() => {
    loadItems();
  }, []);

  async function saveItem() {
    if (!name || !unit) {
      toast("Item name aur unit zaroori hai");
      return;
    }

    setSaving(true);

    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/items-new", {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "ADMIN",
          "x-company-id": user?.companyId || "",
        },
        body: JSON.stringify({
          id: editingId,
          name,
          unit,
          rate,
          minStock,
          barcode,
          description
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      // Reset form
      setName("");
      setUnit("");
      setRate("");
      setMinStock("");
      setBarcode("");
      setDescription("");
      setEditingId(null);

      await loadItems();
      toast.success(editingId ? "Item updated successfully" : "Item saved successfully");
    } catch (err: any) {
      toast(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(item: Item) {
    setEditingId(item.id);
    setName(item.name);
    setUnit(item.unit);
    setRate(String(item.rate || ""));
    setMinStock(String(item.minStock || ""));
    setBarcode(item.barcode || "");
    setDescription(item.description || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setUnit("");
    setRate("");
    setMinStock("");
    setDescription("");
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/items-new?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user?.role || "ADMIN",
          "x-company-id": user?.companyId || "",
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }

      await loadItems();
      toast.success("Item deleted successfully");
    } catch (err: any) {
      toast(err.message);
    }
  }

  return (
    <div className="max-w-5xl p-6 space-y-6 mx-auto">
      <h1 className="text-2xl font-bold">Item Coding</h1>

      {/* FORM */}
      <div className="bg-white border p-4 rounded grid grid-cols-2 gap-3 shadow-sm">
        <input
          className="border p-2 rounded"
          placeholder="Item Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
  className="border p-2 rounded"
  value={unit}
  onChange={(e) => setUnit(e.target.value)}
>
  <option value="">Select Unit</option>
  <optgroup label="Weight">
    <option value="KG">Kilogram (KG)</option>
    <option value="GM">Gram (GM)</option>
    <option value="TON">Ton / Tonne</option>
    <option value="QTL">Quintal (100 KG)</option>
    <option value="MND">Mound / Mann (40 KG)</option>
  </optgroup>
  <optgroup label="Volume / Liquid">
    <option value="LTR">Liter</option>
    <option value="ML">Milliliter</option>
    <option value="BTL">Bottle</option>
    <option value="DRM">Drum</option>
  </optgroup>
  <optgroup label="Length / Area">
    <option value="MTR">Meter</option>
    <option value="CM">Centimeter</option>
    <option value="FT">Feet</option>
    <option value="IN">Inch</option>
    <option value="YD">Yard</option>
    <option value="SFT">Square Feet</option>
    <option value="SQM">Square Meter</option>
  </optgroup>
  <optgroup label="Counting / Packing">
    <option value="PCS">Pieces</option>
    <option value="DOZ">Dozen (12 pcs)</option>
    <option value="PAIR">Pair</option>
    <option value="SET">Set</option>
    <option value="BOX">Box</option>
    <option value="PACK">Pack</option>
    <option value="CTN">Carton</option>
    <option value="BAG">Bag</option>
    <option value="ROLL">Roll</option>
    <option value="SHEET">Sheet</option>
    <option value="BDL">Bundle</option>
    <option value="NO">Number (No.)</option>
    <option value="UNIT">Unit</option>
  </optgroup>
</select>


        <input
          className="border p-2 rounded"
          type="number"
          placeholder="Standard Rate"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />

        {/* 📉 MIN STOCK INPUT */}
        <input
          className="border p-2 rounded bg-yellow-50"
          type="number"
          placeholder="Low Stock Alert Level (Min Stock)"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
        />

        {/* 📟 BARCODE INPUT */}
        <input
          className="border p-2 rounded bg-gray-50"
          placeholder="Scan Barcode / SKU"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />

        <input
          className="border p-2 rounded col-span-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="col-span-2 flex gap-2">
          <button
            onClick={saveItem}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 font-bold flex-1"
          >
            {saving ? "Saving..." : editingId ? "Update Item" : "Save Item"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded font-bold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm text-left min-w-[800px]">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Barcode</th>
              <th className="p-3">Unit</th>
              <th className="p-3 text-right">Rate</th>
              <th className="p-3 text-right text-red-600">Min Stock</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{i.code}</td>
                <td className="p-3 font-bold">{i.name}</td>
                <td className="p-3 font-mono text-xs text-gray-600">{i.barcode || "-"}</td>
                <td className="p-3">{i.unit}</td>
                <td className="p-3 text-right">{i.rate}</td>
                <td className="p-3 text-right font-bold text-red-500">{i.minStock}</td>
                <td className="p-3 text-gray-500 text-xs">{i.description}</td>
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => handleEdit(i)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(i.id)}
                    className="text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}