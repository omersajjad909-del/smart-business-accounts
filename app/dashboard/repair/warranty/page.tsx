"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRepairWarranty, repairAccent } from "../_shared";

const statusOptions = ["covered", "claimed", "expired"];

export default function RepairWarrantyPage() {
  return (
    <BusinessRecordWorkspace
      title="Warranty Tracking"
      subtitle="Track warranty periods, covered jobs, and repeat repair liability."
      accent={repairAccent}
      category="repair_warranty"
      emptyState="No warranty records yet. Add the first covered repair."
      fields={[
        { key: "claim", label: "Claim Ref", placeholder: "RW-2007", required: true },
        { key: "customer", label: "Customer", placeholder: "TechZone Mall", required: true },
        { key: "device", label: "Device", placeholder: "MacBook Pro", required: true },
        { key: "expiryDate", label: "Expiry Date", type: "date", required: true },
        { key: "amount", label: "Coverage Value", type: "number", placeholder: "15000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "covered" }}
      columns={[
        { key: "claim", label: "Claim" },
        { key: "customer", label: "Customer" },
        { key: "device", label: "Device" },
        { key: "expiryDate", label: "Expiry" },
        { key: "amount", label: "Coverage" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRepairWarranty}
      buildCreatePayload={(form) => ({
        title: form.claim,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.expiryDate,
        data: {
          customer: form.customer,
          device: form.device,
        },
      })}
      summarize={(rows) => [
        { label: "Claims", value: rows.length, color: repairAccent },
        { label: "Covered", value: rows.filter((row) => String(row.status) === "covered").length, color: "#34d399" },
        { label: "Claimed", value: rows.filter((row) => String(row.status) === "claimed").length, color: "#60a5fa" },
        { label: "Expired", value: rows.filter((row) => String(row.status) === "expired").length, color: "#94a3b8" },
      ]}
    />
  );
}
