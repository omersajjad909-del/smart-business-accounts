"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapPrintDelivery, printingAccent } from "../_shared";

const statusOptions = ["ready", "dispatched", "delivered"];

export default function PrintDeliveryPage() {
  return (
    <BusinessRecordWorkspace
      title="Delivery"
      subtitle="Track dispatches, couriers, and final delivery acknowledgements for print jobs."
      accent={printingAccent}
      category="print_delivery"
      emptyState="No delivery runs yet. Add a dispatch once a job is ready to ship."
      fields={[
        { key: "dispatch", label: "Dispatch Ref", placeholder: "DEL-PR-1007", required: true },
        { key: "client", label: "Client", placeholder: "Evergreen Foods", required: true },
        { key: "courier", label: "Courier", placeholder: "Leopard / own rider", required: true },
        { key: "destination", label: "Destination", placeholder: "Islamabad office", required: true },
        { key: "deliveredAt", label: "Dispatch Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "ready" }}
      columns={[
        { key: "dispatch", label: "Dispatch" },
        { key: "client", label: "Client" },
        { key: "courier", label: "Courier" },
        { key: "destination", label: "Destination" },
        { key: "deliveredAt", label: "Dispatch Date" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapPrintDelivery}
      buildCreatePayload={(form) => ({
        title: form.dispatch,
        status: form.status,
        date: form.deliveredAt,
        data: {
          client: form.client,
          courier: form.courier,
          destination: form.destination,
        },
      })}
      summarize={(rows) => {
        const ready = rows.filter((row) => String(row.status) === "ready").length;
        const dispatched = rows.filter((row) => String(row.status) === "dispatched").length;
        const delivered = rows.filter((row) => String(row.status) === "delivered").length;
        return [
          { label: "Dispatches", value: rows.length, color: "#60a5fa" },
          { label: "Ready", value: ready, color: "#fbbf24" },
          { label: "In Transit", value: dispatched, color: "#a78bfa" },
          { label: "Delivered", value: delivered, color: "#34d399" },
        ];
      }}
    />
  );
}
