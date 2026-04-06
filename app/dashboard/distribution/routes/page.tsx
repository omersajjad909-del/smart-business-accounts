"use client";`r`nimport { confirmToast, alertToast } from "@/lib/toast-feedback";`r`n
import { useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  distributionBg,
  distributionBorder,
  distributionFont,
  mapDistributionRoutes,
  type RouteStatus,
} from "../_shared";

type RouteForm = {
  name: string;
  area: string;
  driver: string;
  vehicle: string;
  stops: number;
};

const emptyForm: RouteForm = {
  name: "",
  area: "",
  driver: "",
  vehicle: "",
  stops: 0,
};

export default function DistributionRoutesPage() {
  const { records, loading, create, update, remove } = useBusinessRecords("distribution_route");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RouteForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const routes = useMemo(() => mapDistributionRoutes(records), [records]);
  const activeRoutes = routes.filter((route) => route.status === "active").length;
  const totalStops = routes.reduce((sum, route) => sum + route.stops, 0);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function save() {
    const name = form.name.trim();
    const area = form.area.trim();
    const driver = form.driver.trim();
    const vehicle = form.vehicle.trim();
    if (!name) {
      setFormError("Route name is required.");
      return;
    }
    if (!area) {
      setFormError("Area or zone is required.");
      return;
    }
    if (form.stops < 0) {
      setFormError("Planned stops cannot be negative.");
      return;
    }
    setFormError("");
    const payload = {
      title: name,
      status: "active" as RouteStatus,
      data: {
        area,
        driver,
        vehicle,
        stops: Number(form.stops) || 0,
      },
    };

    if (editingId) {
      await update(editingId, payload);
    } else {
      await create(payload);
    }

    closeModal();
  }

  function editRoute(route: (typeof routes)[number]) {
    setEditingId(route.id);
    setForm({
      name: route.name,
      area: route.area,
      driver: route.driver,
      vehicle: route.vehicle,
      stops: route.stops,
    });
    setShowModal(true);
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Distribution Routes</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
            Create route masters, assign drivers, and keep delivery planning organized.
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setFormError(""); }}
          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          + Add Route
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Routes", value: routes.length, color: "#f97316" },
          { label: "Active Routes", value: activeRoutes, color: "#34d399" },
          { label: "Planned Stops", value: totalStops, color: "#818cf8" },
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
              {["Route", "Area", "Driver", "Vehicle", "Stops", "Status", "Actions"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}`, fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{route.name}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{route.area || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{route.driver || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{route.vehicle || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{route.stops}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{
                    display: "inline-block",
                    background: route.status === "active" ? "rgba(52,211,153,.15)" : "rgba(107,114,128,.15)",
                    color: route.status === "active" ? "#34d399" : "#9ca3af",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                  }}>
                    {route.status}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 8 }}>
                  <button onClick={() => editRoute(route)} style={{ padding: "6px 10px", background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Edit
                  </button>
                  <button onClick={() => update(route.id, { status: route.status === "active" ? "inactive" : "active" })} style={{ padding: "6px 10px", background: "rgba(249,115,22,.15)", border: "1px solid rgba(249,115,22,.3)", color: "#f97316", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    {route.status === "active" ? "Pause" : "Activate"}
                  </button>
                  <button onClick={() => { if (await confirmToast(`Delete route ${route.name}?`)) void remove(route.id); }} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && routes.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                  No distribution routes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${distributionBorder}`, borderRadius: 16, padding: 32, width: 520, fontFamily: distributionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Route" : "Add Route"}</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                ["Route Name", "name", "text", "span 2"],
                ["Area / Zone", "area", "text", ""],
                ["Assigned Driver", "driver", "text", ""],
                ["Vehicle / Van", "vehicle", "text", ""],
              ].map(([label, key, type, span]) => (
                <div key={key} style={{ gridColumn: span || undefined }}>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>{label}</label>
                  <input
                    type={type}
                    value={String((form as Record<string, unknown>)[key] ?? "")}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Planned Stops</label>
                <input
                  type="number"
                  min={0}
                  value={form.stops}
                  onChange={(event) => setForm((prev) => ({ ...prev, stops: Number(event.target.value) }))}
                  style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {editingId ? "Update Route" : "Save Route"}
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
