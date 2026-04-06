"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRentalAgreement, rentalAccent } from "../_shared";

const statusOptions = ["draft", "active", "closed"];

export default function RentalAgreementsPage() {
  return (
    <BusinessRecordWorkspace
      title="Rental Agreements"
      subtitle="Manage customer contracts, asset assignments, and revenue visibility for rentals."
      accent={rentalAccent}
      category="rental_agreement"
      emptyState="No rental agreements yet. Create your first contract."
      fields={[
        { key: "agreement", label: "Agreement", placeholder: "RA-2026-0012", required: true },
        { key: "customer", label: "Customer", placeholder: "Midas Event House", required: true },
        { key: "asset", label: "Asset", placeholder: "Toyota Yaris / Generator set", required: true },
        { key: "amount", label: "Agreement Value", type: "number", placeholder: "90000", required: true },
        { key: "startDate", label: "Start Date", type: "date", required: true },
        { key: "endDate", label: "End Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "draft" }}
      columns={[
        { key: "agreement", label: "Agreement" },
        { key: "customer", label: "Customer" },
        { key: "asset", label: "Asset" },
        { key: "startDate", label: "Start" },
        { key: "endDate", label: "End" },
        { key: "amount", label: "Value" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapRentalAgreement}
      buildCreatePayload={(form) => ({
        title: form.agreement,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.startDate,
        data: {
          customer: form.customer,
          asset: form.asset,
          endDate: form.endDate,
        },
      })}
      summarize={(rows) => {
        const value = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const active = rows.filter((row) => String(row.status) === "active").length;
        const closed = rows.filter((row) => String(row.status) === "closed").length;
        return [
          { label: "Agreements", value: rows.length, color: "#22c55e" },
          { label: "Active", value: active, color: "#60a5fa" },
          { label: "Closed", value: closed, color: "#94a3b8" },
          { label: "Contract Value", value: value.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
