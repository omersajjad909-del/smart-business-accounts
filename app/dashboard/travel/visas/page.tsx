"use client";

import { alertToast } from "@/lib/toast-feedback";
import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapVisaCase, travelAccent } from "../_shared";

const statusOptions = ["document_check", "submitted", "approved", "rejected"];

export default function TravelVisasPage() {
  return (
    <BusinessRecordWorkspace
      title="Visa Cases"
      subtitle="Manage applicant files, submission dates, passport references, and processing fees."
      accent={travelAccent}
      category="visa_case"
      emptyState="No visa cases yet. Add the first applicant file."
      fields={[
        { key: "caseRef", label: "Case Ref", placeholder: "VISA-24007", required: true },
        { key: "applicant", label: "Applicant", placeholder: "Sara Khan", required: true },
        { key: "country", label: "Destination Country", placeholder: "United Kingdom", required: true },
        { key: "passportNo", label: "Passport No", placeholder: "AB1234567", required: true },
        { key: "supplier", label: "Embassy / Supplier", placeholder: "UK Visa Center", required: true },
        { key: "submissionDate", label: "Submission Date", type: "date", required: true },
        { key: "amount", label: "Service Fee", type: "number", placeholder: "25000", required: true },
        { key: "cost", label: "Supplier Cost", type: "number", placeholder: "18000", required: true },
        { key: "paymentDue", label: "Settlement Due", type: "date" },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "document_check" }}
      columns={[
        { key: "caseRef", label: "Case Ref" },
        { key: "applicant", label: "Applicant" },
        { key: "country", label: "Country" },
        { key: "passportNo", label: "Passport" },
        { key: "supplier", label: "Supplier" },
        { key: "submissionDate", label: "Submitted" },
        { key: "amount", label: "Fee" },
        { key: "invoiceNo", label: "Invoice" },
        { key: "settlementRef", label: "Settlement" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapVisaCase}
      actions={[
        {
          label: (row) => (String(row.invoiceNo || "") ? `Invoice ${String(row.invoiceNo)}` : "Create Invoice"),
          tone: "success",
          onClick: async (row, helpers) => {
            if (row.invoiceId) {
              window.location.href = `/dashboard/sales-invoice?id=${encodeURIComponent(String(row.invoiceId))}`;
              return;
            }
            const response = await fetch("/api/travel/create-invoice", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recordId: row.id }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Failed to create invoice");
            await helpers.refetch();
            alertToast(`Sales invoice ${result.invoiceNo} created for ${String(row.applicant || "this visa case")}.`, "success", "Invoice Created");
          },
        },
        {
          label: (row) => (String(row.settlementRef || "") ? `Settlement ${String(row.settlementRef)}` : "Create Settlement"),
          tone: "neutral",
          onClick: async (row, helpers) => {
            if (row.settlementId) {
              window.location.href = "/dashboard/travel/settlements";
              return;
            }
            const response = await fetch("/api/travel/create-settlement", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ recordId: row.id }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.error || "Failed to create settlement");
            await helpers.refetch();
            alertToast(`Settlement ${result.settlementRef} created for ${String(row.supplier || "supplier")}.`, "success", "Settlement Created");
          },
        },
      ]}
      buildCreatePayload={(form) => ({
        title: form.caseRef,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.submissionDate,
        data: {
          applicant: form.applicant,
          country: form.country,
          passportNo: form.passportNo,
          supplier: form.supplier,
          cost: Number(form.cost || 0),
          paymentDue: form.paymentDue || null,
        },
      })}
      summarize={(rows) => {
        const totalValue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const totalCost = rows.reduce((sum, row) => sum + Number(row.cost || 0), 0);
        return [
          { label: "Cases", value: rows.length, color: travelAccent },
          { label: "Submitted", value: rows.filter((row) => String(row.status) === "submitted").length, color: "#fbbf24" },
          { label: "Approved", value: rows.filter((row) => String(row.status) === "approved").length, color: "#34d399" },
          { label: "Invoice Ready", value: rows.filter((row) => !String(row.invoiceNo || "")).length, color: "#f97316" },
          { label: "Margin", value: (totalValue - totalCost).toLocaleString(), color: "#a78bfa" },
        ];
      }}
    />
  );
}
