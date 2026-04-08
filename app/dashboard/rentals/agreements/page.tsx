"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapRentalAgreement, rentalsAccent } from "../_shared";

const statusOptions = ["draft", "active", "closed"];

export default function RentalsAgreementsPage() {
  return (
    <BusinessRecordWorkspace
      title="Agreements"
      subtitle="Rental agreements with terms, security deposits, and conditions."
      accent={rentalsAccent}
      category="rental_agreement"
      emptyState="No rental agreements yet. Create the first contract."
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
        return [
          { label: "Agreements", value: rows.length, color: rentalsAccent },
          { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#60a5fa" },
          { label: "Closed", value: rows.filter((row) => String(row.status) === "closed").length, color: "#94a3b8" },
          { label: "Contract Value", value: value.toLocaleString(), color: "#fbbf24" },
        ];
      }}
    />
  );
}
