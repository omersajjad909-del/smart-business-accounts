"use client";

import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  distributionBg,
  distributionBorder,
  distributionFont,
  findRouteById,
  mapDistributionRoutes,
  todayIso,
} from "../_shared";

type ItemOption = {
  id: string;
  name: string;
  availableQty: number;
};

type StockForm = {
  routeId: string;
  van: string;
  itemId: string;
  itemName: string;
  loadQty: number;
  soldQty: number;
  returnedQty: number;
  amount: number;
  date: string;
};

const emptyForm: StockForm = {
  routeId: "",
  van: "",
  itemId: "",
  itemName: "",
  loadQty: 0,
  soldQty: 0,
  returnedQty: 0,
  amount: 0,
  date: todayIso(),
};

export default function StockOnVanPage() {
  const stockRecords = useBusinessRecords("van_stock");
  const routeRecords = useBusinessRecords("distribution_route");
  const [items, setItems] = useState<ItemOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StockForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const routes = useMemo(() => mapDistributionRoutes(routeRecords.records).filter((route) => route.status === "active"), [routeRecords.records]);

  useEffect(() => {
    fetch("/api/stock-available-for-sale")
      .then((response) => response.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  const loads = useMemo(() => stockRecords.records.map((record) => {
    const routeId = String(record.data?.routeId || "");
    const route = findRouteById(routes, routeId);
    const loadQty = Number(record.data?.loadQty || 0);
    const soldQty = Number(record.data?.soldQty || 0);
    const returnedQty = Number(record.data?.returnedQty || 0);
    const balanceQty = loadQty - soldQty - returnedQty;

    return {
      id: record.id,
      routeName: String(record.data?.routeName || route?.name || ""),
      van: String(record.data?.van || route?.vehicle || ""),
      itemName: String(record.data?.itemName || record.title || ""),
      loadQty,
      soldQty,
      returnedQty,
      balanceQty,
      amount: record.amount || 0,
      date: record.date?.split("T")[0] || "",
      status: record.status || "loaded",
      routeId,
      itemId: String(record.data?.itemId || ""),
    };
  }), [routes, stockRecords.records]);

  const totalLoaded = loads.reduce((sum, row) => sum + row.loadQty, 0);
  const totalBalance = loads.reduce((sum, row) => sum + row.balanceQty, 0);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function syncRoute(routeId: string) {
    const route = findRouteById(routes, routeId);
    setForm((prev) => ({ ...prev, routeId, van: route?.vehicle || prev.van }));
  }

  function syncItem(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    setForm((prev) => ({ ...prev, itemId, itemName: item?.name || prev.itemName }));
  }

  function editLoad(load: (typeof loads)[number]) {
    setEditingId(load.id);
    setForm({
      routeId: load.routeId,
      van: load.van,
      itemId: load.itemId,
      itemName: load.itemName,
      loadQty: load.loadQty,
      soldQty: load.soldQty,
      returnedQty: load.returnedQty,
      amount: load.amount,
      date: load.date || todayIso(),
    });
    setShowModal(true);
  }

  async function save() {
    const itemName = form.itemName.trim();
    if (!form.routeId) {
      setFormError("Route selection is required.");
      return;
    }
    if (!itemName || !form.itemId) {
      setFormError("Item selection is required.");
      return;
    }
    if (!form.van.trim()) {
      setFormError("Van name is required.");
      return;
    }
    if (form.loadQty <= 0) {
      setFormError("Loaded quantity must be greater than zero.");
      return;
    }
    if (form.soldQty < 0 || form.returnedQty < 0 || form.amount < 0) {
      setFormError("Sold, returned, and amount values cannot be negative.");
      return;
    }
    if (form.soldQty + form.returnedQty > form.loadQty) {
      setFormError("Sold plus returned quantity cannot exceed loaded quantity.");
      return;
    }
    setFormError("");
    const route = findRouteById(routes, form.routeId);
    const payload = {
      title: itemName,
      status: "loaded",
      amount: form.amount,
      date: form.date || todayIso(),
      data: {
        routeId: form.routeId,
        routeName: route?.name || "",
        van: form.van.trim(),
        itemId: form.itemId,
        itemName: form.itemName.trim(),
        loadQty: Number(form.loadQty) || 0,
        soldQty: Number(form.soldQty) || 0,
        returnedQty: Number(form.returnedQty) || 0,
      },
    };

    if (editingId) {
      await stockRecords.update(editingId, payload);
    } else {
      await stockRecords.create(payload);
    }
    closeModal();
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Stock on Van</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
            Track van loading, sales movement, and returned quantity per route.
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Load Stock
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Load Entries", value: loads.length, color: "#f97316" },
          { label: "Total Loaded Qty", value: totalLoaded, color: "#38bdf8" },
          { label: "On-Van Balance", value: totalBalance, color: "#34d399" },
        ].map((card) => (
          <div key={card.label} style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Route", "Van", "Item", "Loaded", "Sold", "Returned", "Balance", "Date", "Actions"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}`, fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{load.routeName || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{load.van || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{load.itemName}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#38bdf8", fontWeight: 700 }}>{load.loadQty}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>{load.soldQty}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#f59e0b", fontWeight: 700 }}>{load.returnedQty}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: load.balanceQty >= 0 ? "#a5b4fc" : "#f87171", fontWeight: 700 }}>{load.balanceQty}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{load.date || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 8 }}>
                  <button onClick={() => editLoad(load)} style={{ padding: "6px 10px", background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => { if (window.confirm(`Delete van load for ${load.itemName}?`)) void stockRecords.remove(load.id); }} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!stockRecords.loading && loads.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                  No stock loading records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${distributionBorder}`, borderRadius: 16, padding: 32, width: 560, fontFamily: distributionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Load" : "Load Stock on Van"}</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Route</label>
                <select value={form.routeId} onChange={(event) => syncRoute(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
                  <option value="">Select route</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.name} - {route.area}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Van</label>
                <input type="text" value={form.van} onChange={(event) => setForm((prev) => ({ ...prev, van: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Item</label>
                <select value={form.itemId} onChange={(event) => syncItem(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
                  <option value="">Select item</option>
                  {items.map((item) => <option key={item.id} value={item.id}>{item.name} (Avail: {item.availableQty})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Date</label>
                <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Loaded Qty</label>
                <input type="number" min={0} value={form.loadQty} onChange={(event) => setForm((prev) => ({ ...prev, loadQty: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Sold Qty</label>
                <input type="number" min={0} value={form.soldQty} onChange={(event) => setForm((prev) => ({ ...prev, soldQty: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Returned Qty</label>
                <input type="number" min={0} value={form.returnedQty} onChange={(event) => setForm((prev) => ({ ...prev, returnedQty: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Loaded Value</label>
                <input type="number" min={0} value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {editingId ? "Update Load" : "Save Load"}
              </button>
              <button onClick={closeModal} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${distributionBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
