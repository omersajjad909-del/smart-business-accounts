"use client";

import { useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapSalonAppointments,
  mapSalonServices,
  salonBg,
  salonBorder,
  salonFont,
  salonMuted,
} from "../_shared";

type PackageForm = {
  name: string;
  services: string[];
  price: string;
  sessions: string;
  status: "Active" | "Inactive";
};

const EMPTY_FORM: PackageForm = {
  name: "",
  services: [],
  price: "",
  sessions: "1",
  status: "Active",
};

export default function SalonPackagesPage() {
  const packagesHook = useBusinessRecords("salon_package");
  const services = mapSalonServices(useBusinessRecords("salon_service").records).filter((service) => service.status === "Active");
  const appointments = mapSalonAppointments(useBusinessRecords("salon_appointment").records);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PackageForm>(EMPTY_FORM);
  const [error, setError] = useState("");

  const packages = packagesHook.records.map((record) => ({
    id: record.id,
    name: record.title,
    services: Array.isArray(record.data?.services) ? (record.data?.services as string[]) : [],
    sessions: Number(record.data?.sessions || 1),
    price: Number(record.amount || 0),
    status: String(record.status || "Active"),
  }));

  const activePackages = packages.filter((pkg) => pkg.status === "Active").length;
  const avgPackagePrice = packages.length ? Math.round(packages.reduce((sum, pkg) => sum + pkg.price, 0) / packages.length) : 0;
  const packageServiceCoverage = new Set(packages.flatMap((pkg) => pkg.services)).size;
  const bundleDemand = appointments.filter((appointment) => packages.some((pkg) => pkg.services.includes(appointment.service))).length;

  async function savePackage() {
    setError("");
    if (!form.name.trim()) return setError("Package name required hai.");
    if (form.services.length === 0) return setError("Kam az kam aik service select karein.");
    if (!form.price || Number(form.price) <= 0) return setError("Package price positive honi chahiye.");
    if (!form.sessions || Number(form.sessions) <= 0) return setError("Sessions positive honi chahiye.");
    if (packages.some((pkg) => pkg.name.toLowerCase() === form.name.trim().toLowerCase())) {
      return setError("Ye package pehle se maujood hai.");
    }

    await packagesHook.create({
      title: form.name.trim(),
      status: form.status,
      amount: Number(form.price),
      data: {
        services: form.services,
        sessions: Number(form.sessions),
      },
    });

    setForm(EMPTY_FORM);
    setShowModal(false);
  }

  async function toggleStatus(id: string, currentStatus: string) {
    await packagesHook.update(id, { status: currentStatus === "Active" ? "Inactive" : "Active" });
  }

  function toggleService(serviceName: string) {
    setForm((current) => ({
      ...current,
      services: current.services.includes(serviceName)
        ? current.services.filter((item) => item !== serviceName)
        : [...current.services, serviceName],
    }));
  }

  return (
    <div style={{ padding: "32px", fontFamily: salonFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Beauty Packages</h1>
          <p style={{ fontSize: 14, color: salonMuted, marginTop: 6 }}>Bridal bundles, seasonal offers, aur combo deals ko yahan se structure karein.</p>
        </div>
        <button style={{ background: "#ec4899", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }} onClick={() => setShowModal(true)}>+ New Package</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Total Packages</div><div style={{ fontSize: 28, fontWeight: 800 }}>{packages.length}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Active Packages</div><div style={{ fontSize: 28, fontWeight: 800, color: "#34d399" }}>{activePackages}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Avg Package Price</div><div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>Rs. {avgPackagePrice.toLocaleString()}</div></div>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, padding: "20px 24px" }}><div style={{ fontSize: 13, color: salonMuted, marginBottom: 6 }}>Bundle Demand</div><div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>{bundleDemand} visits</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr .9fr", gap: 18 }}>
        <div style={{ background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 16, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Package", "Included Services", "Sessions", "Price", "Status", "Action"].map((heading) => (
                  <th key={heading} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: salonMuted, borderBottom: "1px solid rgba(255,255,255,.07)", fontWeight: 700 }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: salonMuted, fontSize: 14 }}>No beauty packages yet.</td></tr>
              ) : packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}><div style={{ fontWeight: 700 }}>{pkg.name}</div></td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13, color: "rgba(255,255,255,.72)" }}>{pkg.services.join(", ")}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>{pkg.sessions}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {pkg.price.toLocaleString()}</td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ display: "inline-block", borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, background: pkg.status === "Active" ? "rgba(52,211,153,.16)" : "rgba(148,163,184,.16)", color: pkg.status === "Active" ? "#34d399" : "#94a3b8" }}>{pkg.status}</span>
                  </td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <button onClick={() => toggleStatus(pkg.id, pkg.status)} style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer" }}>
                      {pkg.status === "Active" ? "Pause" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "linear-gradient(135deg, rgba(236,72,153,.12), rgba(168,85,247,.10))", border: `1px solid ${salonBorder}`, borderRadius: 18, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#fbcfe8", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Package Strategy</div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Service Coverage</div>
              <div style={{ fontSize: 13, color: salonMuted }}>{packageServiceCoverage} unique services bundle-ready hain.</div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Upsell Tip</div>
              <div style={{ fontSize: 13, color: salonMuted }}>Hair + nails + skincare combo packages repeat clients ke liye strong offer banti hain.</div>
            </div>
            <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Pricing Control</div>
              <div style={{ fontSize: 13, color: salonMuted }}>Package rate ko single-service total se slightly better rakhein taa ke bundle conversion improve ho.</div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.68)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
          <div style={{ width: 560, background: "#161b27", border: `1px solid ${salonBorder}`, borderRadius: 18, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Create Beauty Package</h2>
                <div style={{ marginTop: 4, fontSize: 12, color: salonMuted }}>Combo services aur offer price define karein.</div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", color: salonMuted, fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Package Name</label>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 8 }}>Included Services</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
                  {services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.name)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: form.services.includes(service.name) ? "rgba(236,72,153,.18)" : salonBg,
                        border: `1px solid ${form.services.includes(service.name) ? "#ec4899" : salonBorder}`,
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{service.name}</div>
                      <div style={{ fontSize: 11, color: salonMuted }}>{service.duration} min • Rs. {service.price.toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Price</label>
                  <input type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Sessions</label>
                  <input type="number" value={form.sessions} onChange={(event) => setForm((current) => ({ ...current, sessions: event.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: salonMuted, marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "Active" | "Inactive" }))} style={{ width: "100%", boxSizing: "border-box", background: salonBg, border: `1px solid ${salonBorder}`, borderRadius: 10, padding: "10px 12px", color: "#fff" }}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <div style={{ marginTop: 14, fontSize: 12, color: "#fda4af" }}>{error}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              <button onClick={savePackage} style={{ flex: 1, padding: "11px 0", background: "#ec4899", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save Package</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${salonBorder}`, borderRadius: 10, color: salonMuted, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
