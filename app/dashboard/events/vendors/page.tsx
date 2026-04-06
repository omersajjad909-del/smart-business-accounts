"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { eventsAccent, mapEventVendor } from "../_shared";

const statusOptions = ["active", "standby", "blocked"];

export default function EventVendorsPage() {
  return (
    <BusinessRecordWorkspace
      title="Vendors"
      subtitle="Manage caterers, decorators, photographers, and outsourced execution partners."
      accent={eventsAccent}
      category="event_vendor"
      emptyState="No vendors yet. Add the first partner to your event network."
      fields={[
        { key: "vendor", label: "Vendor", placeholder: "Pearl Catering", required: true },
        { key: "service", label: "Service", placeholder: "Catering / Decor / Photography", required: true },
        { key: "contact", label: "Contact", placeholder: "+92 300 1234567", required: true },
        { key: "city", label: "City", placeholder: "Lahore", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "active" }}
      columns={[
        { key: "vendor", label: "Vendor" },
        { key: "service", label: "Service" },
        { key: "contact", label: "Contact" },
        { key: "city", label: "City" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapEventVendor}
      buildCreatePayload={(form) => ({
        title: form.vendor,
        status: form.status,
        data: {
          service: form.service,
          contact: form.contact,
          city: form.city,
        },
      })}
      summarize={(rows) => [
        { label: "Vendors", value: rows.length, color: "#fb7185" },
        { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#34d399" },
        { label: "Standby", value: rows.filter((row) => String(row.status) === "standby").length, color: "#fbbf24" },
        { label: "Blocked", value: rows.filter((row) => String(row.status) === "blocked").length, color: "#f87171" },
      ]}
    />
  );
}
