"use client";

import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  distributionBg,
  distributionBorder,
  distributionFont,
  findRouteById,
  mapDistributionRoutes,
  todayIso,
  type VanSaleStatus,
} from "../_shared";

type VanSaleForm = {
  salesman: string;
  routeId: string;
  van: string;
  saleAmount: number;
  collectionAmount: number;
  customers: number;
  date: string;
};

const STATUS_COLOR: Record<VanSaleStatus, string> = {
  draft: "#f59e0b",
  submitted: "#3b82f6",
  settled: "#34d399",
};

const emptyForm: VanSaleForm = {
  salesman: "",
  routeId: "",
  van: "",
  saleAmount: 0,
  collectionAmount: 0,
  customers: 0,
  date: todayIso(),
};

export default function VanSalesPage() {
  const saleRecords = useBusinessRecords("van_sale");
  const routeRecords = useBusinessRecords("distribution_route");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VanSaleForm>(emptyForm);

  const routes = useMemo(() => mapDistributionRoutes(routeRecords.records).filter((route) => route.status === "active"), [routeRecords.records]);
  const sales = useMemo(() => saleRecords.records.map((record) => {
    const routeId = String(record.data?.routeId || "");
    const route = findRouteById(routes, routeId);
    const collectionAmount = Number(record.data?.collectionAmount || 0);

    return {
      id: record.id,
      salesman: record.title,
      routeId,
      routeName: String(record.data?.routeName || route?.name || ""),
      van: String(record.data?.van || route?.vehicle || ""),
      saleAmount: record.amount || 0,
      collectionAmount,
      customers: Number(record.data?.customers || 0),
      date: record.date?.split("T")[0] || "",
      status: (record.status as VanSaleStatus) || "draft",
    };
  }), [routes, saleRecords.records]);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.saleAmount, 0);
  const totalCollections = sales.reduce((sum, sale) => sum + sale.collectionAmount, 0);
  const totalCustomers = sales.reduce((sum, sale) => sum + sale.customers, 0);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function syncRoute(routeId: string) {
    const route = findRouteById(routes, routeId);
    setForm((prev) => ({
      ...prev,
      routeId,
      van: route?.vehicle || prev.van,
      salesman: prev.salesman || route?.driver || "",
    }));
  }

  function editSale(sale: (typeof sales)[number]) {
    setEditingId(sale.id);
    setForm({
      salesman: sale.salesman,
      routeId: sale.routeId,
      van: sale.van,
      saleAmount: sale.saleAmount,
      collectionAmount: sale.collectionAmount,
      customers: sale.customers,
      date: sale.date || todayIso(),
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.salesman.trim()) return;
    const route = findRouteById(routes, form.routeId);
    const payload = {
      title: form.salesman.trim(),
      status: "submitted" as VanSaleStatus,
      amount: form.saleAmount,
      date: form.date || todayIso(),
      data: {
        routeId: form.routeId,
        routeName: route?.name || "",
        van: form.van.trim(),
        customers: Number(form.customers) || 0,
        collectionAmount: Number(form.collectionAmount) || 0,
      },
    };

    if (editingId) {
      await saleRecords.update(editingId, payload);
    } else {
      await saleRecords.create(payload);
    }

    closeModal();
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Van Sales</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
            Record route-wise van sales, visited customers, and collection performance.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Sale
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Trips Logged", value: sales.length, color: "#f97316" },
          { label: "Sales Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, color: "#34d399" },
          { label: "Collections", value: `Rs. ${totalCollections.toLocaleString()}`, color: "#38bdf8" },
          { label: "Customers Visited", value: totalCustomers, color: "#818cf8" },
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
              {["Salesman", "Route", "Van", "Date", "Customers", "Sales", "Collections", "Status", "Actions"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}`, fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{sale.salesman}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{sale.routeName || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{sale.van || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{sale.date || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{sale.customers}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {sale.saleAmount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#38bdf8", fontWeight: 700 }}>Rs. {sale.collectionAmount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: `${STATUS_COLOR[sale.status]}20`, color: STATUS_COLOR[sale.status], borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {sale.status}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 8 }}>
                  <button onClick={() => editSale(sale)} style={{ padding: "6px 10px", background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Edit
                  </button>
                  {sale.status !== "settled" && (
                    <button onClick={() => saleRecords.update(sale.id, { status: "settled" })} style={{ padding: "6px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Mark Settled
                    </button>
                  )}
                  <button onClick={() => saleRecords.remove(sale.id)} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!saleRecords.loading && sales.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                  No van sales logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${distributionBorder}`, borderRadius: 16, padding: 32, width: 560, fontFamily: distributionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Van Sale" : "Add Van Sale"}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Salesman</label>
                <input type="text" value={form.salesman} onChange={(event) => setForm((prev) => ({ ...prev, salesman: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Route</label>
                <select value={form.routeId} onChange={(event) => syncRoute(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}>
                  <option value="">Select route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} - {route.area}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Date</label>
                <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Van / Vehicle</label>
                <input type="text" value={form.van} onChange={(event) => setForm((prev) => ({ ...prev, van: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Customers Visited</label>
                <input type="number" min={0} value={form.customers} onChange={(event) => setForm((prev) => ({ ...prev, customers: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Sale Amount</label>
                <input type="number" min={0} value={form.saleAmount} onChange={(event) => setForm((prev) => ({ ...prev, saleAmount: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Collection Amount</label>
                <input type="number" min={0} value={form.collectionAmount} onChange={(event) => setForm((prev) => ({ ...prev, collectionAmount: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {editingId ? "Update Sale" : "Save Sale"}
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
