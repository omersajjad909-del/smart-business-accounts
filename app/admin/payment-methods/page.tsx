"use client";

import AdminMasterDataPage from "@/app/admin/components/AdminMasterDataPage";

type PaymentMethodRow = {
  provider?: string;
  managedExternally?: boolean;
  note?: string;
  defaultId?: string | null;
  paymentMethods?: Array<{ id?: string; label?: string; type?: string; isDefault?: boolean }>;
};

export default function AdminPaymentMethodsPage() {
  return (
    <AdminMasterDataPage<PaymentMethodRow>
      title="Payment Methods"
      subtitle="Billing provider and configured payment collection methods for this workspace."
      endpoint="/api/billing/payment-methods"
      metricLabel="Payment Methods"
      emptyTitle="No payment methods configured"
      emptyHint="If billing is provider-managed, checkout methods will be controlled by that provider."
      columns={[
        { key: "provider", label: "Provider", render: (item) => <span style={{ fontWeight: 700, color: "white" }}>{item.provider || "-"}</span> },
        {
          key: "managed",
          label: "Managed By",
          render: (item) => (item.managedExternally ? "External Provider" : "Workspace"),
        },
        {
          key: "count",
          label: "Configured",
          render: (item) => item.paymentMethods?.length ?? 0,
        },
        {
          key: "default",
          label: "Default",
          render: (item) => item.defaultId || "None",
        },
        {
          key: "note",
          label: "Details",
          render: (item) => (
            <span style={{ color: "rgba(255,255,255,.62)" }}>
              {item.note || "No additional payment method notes."}
            </span>
          ),
        },
      ]}
    />
  );
}
