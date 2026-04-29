"use client";

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
        { key: "submissionDate", label: "Submission Date", type: "date", required: true },
        { key: "amount", label: "Service Fee", type: "number", placeholder: "25000", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "document_check" }}
      columns={[
        { key: "caseRef", label: "Case Ref" },
        { key: "applicant", label: "Applicant" },
        { key: "country", label: "Country" },
        { key: "passportNo", label: "Passport" },
        { key: "submissionDate", label: "Submitted" },
        { key: "amount", label: "Fee" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapVisaCase}
      buildCreatePayload={(form) => ({
        title: form.caseRef,
        status: form.status,
        amount: Number(form.amount || 0),
        date: form.submissionDate,
        data: {
          applicant: form.applicant,
          country: form.country,
          passportNo: form.passportNo,
        },
      })}
      summarize={(rows) => {
        const totalValue = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        return [
          { label: "Cases", value: rows.length, color: travelAccent },
          { label: "Submitted", value: rows.filter((row) => String(row.status) === "submitted").length, color: "#fbbf24" },
          { label: "Approved", value: rows.filter((row) => String(row.status) === "approved").length, color: "#34d399" },
          { label: "Fee Value", value: totalValue.toLocaleString(), color: "#a78bfa" },
        ];
      }}
    />
  );
}
