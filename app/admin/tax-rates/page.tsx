"use client";

import AdminMasterDataPage from "@/app/admin/components/AdminMasterDataPage";

type TaxRateRow = {
  taxCode?: string;
  taxType?: string;
  description?: string;
  taxRate?: number;
  isActive?: boolean;
};

export default function AdminTaxRatesPage() {
  return (
    <AdminMasterDataPage<TaxRateRow>
      title="Tax Rates"
      subtitle="Configured tax profiles and active tax rules from company settings."
      endpoint="/api/tax-configuration"
      metricLabel="Configured Tax Rates"
      emptyTitle="No tax rates found"
      emptyHint="Create tax configurations in your company setup to manage invoice taxes."
      columns={[
        { key: "code", label: "Code", render: (item) => item.taxCode || "-" },
        { key: "type", label: "Type", render: (item) => item.taxType || "-" },
        { key: "desc", label: "Description", render: (item) => item.description || "-" },
        { key: "rate", label: "Rate", render: (item) => `${item.taxRate ?? 0}%` },
        {
          key: "status",
          label: "Status",
          render: (item) => (
            <span
              style={{
                display: "inline-flex",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                background: item.isActive ? "rgba(52,211,153,.15)" : "rgba(248,113,113,.12)",
                color: item.isActive ? "#34d399" : "#f87171",
              }}
            >
              {item.isActive ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
    />
  );
}
