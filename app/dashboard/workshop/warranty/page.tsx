"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapWorkshopWarranty, workshopAccent } from "../_shared";

const statusOptions = ["active", "claimed", "expired"];

export default function WorkshopWarrantyPage() {
  return (
    <BusinessRecordWorkspace
      title="Warranty Jobs"
      subtitle="Track warranty exposure, claims, and covered repairs against customer vehicles."
      accent={workshopAccent}
      category="workshop_warranty"
      emptyState="No warranty records yet. Add the first warranty claim."
      fields={[
        { key: "claim", label: "Claim Ref", placeholder: "WR-1102", required: true },
        { key: "customer", label: "Customer", placeholder: "Hassan Autos", required: true },
        { key: "vehicle", label: "Vehicle", placeholder: "Hilux / RWP-101", required: true },
        { key: "expiryDate", label: "Expiry Date", type: "date", required: true },
        { key: "amount", label: "Coverage Value", type: "number", placeholder: "18000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "active" }}
      columns={[
        { key: "claim", label: "Claim" },
        { key: "customer", label: "Customer" },
        { key: "vehicle", label: "Vehicle" },
        { key: "expiryDate", label: "Expiry" },
        { key: "amount", label: "Coverage" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapWorkshopWarranty}
      buildCreatePayload={(form) => ({
        title: form.claim,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.expiryDate,
        data: {
          customer: form.customer,
          vehicle: form.vehicle,
        },
      })}
      summarize={(rows) => [
        { label: "Claims", value: rows.length, color: workshopAccent },
        { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#34d399" },
        { label: "Claimed", value: rows.filter((row) => String(row.status) === "claimed").length, color: "#60a5fa" },
        { label: "Expired", value: rows.filter((row) => String(row.status) === "expired").length, color: "#94a3b8" },
      ]}
    />
  );
}
