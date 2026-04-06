"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapUtilityConnection, utilityAccent } from "../_shared";

const statusOptions = ["pending", "active", "suspended"];

export default function UtilityConnectionsPage() {
  return (
    <BusinessRecordWorkspace
      title="Connections"
      subtitle="Manage customer accounts, tariff classes, and activation status for utility operations."
      accent={utilityAccent}
      category="utility_connection"
      emptyState="No utility connections yet. Add the first service account."
      fields={[
        { key: "account", label: "Account No", placeholder: "UT-000124", required: true },
        { key: "customer", label: "Customer", placeholder: "Blue Town Residency", required: true },
        { key: "area", label: "Area", placeholder: "Sector B / Zone 4", required: true },
        { key: "tariff", label: "Tariff", placeholder: "Commercial / Domestic", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "pending" }}
      columns={[
        { key: "account", label: "Account" },
        { key: "customer", label: "Customer" },
        { key: "area", label: "Area" },
        { key: "tariff", label: "Tariff" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapUtilityConnection}
      buildCreatePayload={(form) => ({
        title: form.account,
        status: form.status,
        data: {
          customer: form.customer,
          area: form.area,
          tariff: form.tariff,
        },
      })}
      summarize={(rows) => [
        { label: "Accounts", value: rows.length, color: "#38bdf8" },
        { label: "Active", value: rows.filter((row) => String(row.status) === "active").length, color: "#34d399" },
        { label: "Pending", value: rows.filter((row) => String(row.status) === "pending").length, color: "#fbbf24" },
        { label: "Suspended", value: rows.filter((row) => String(row.status) === "suspended").length, color: "#f87171" },
      ]}
    />
  );
}
