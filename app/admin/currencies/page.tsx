"use client";

import AdminMasterDataPage from "@/app/admin/components/AdminMasterDataPage";

type CurrencyRow = {
  code?: string;
  name?: string;
  symbol?: string;
  exchangeRate?: number;
  isActive?: boolean;
};

export default function AdminCurrenciesPage() {
  return (
    <AdminMasterDataPage<CurrencyRow>
      title="Currencies"
      subtitle="Active currencies and exchange rates configured for the current company."
      endpoint="/api/currencies"
      metricLabel="Active Currencies"
      emptyTitle="No currencies found"
      emptyHint="Add currencies in company settings to support multi-currency transactions."
      columns={[
        { key: "code", label: "Code", render: (item) => <span style={{ fontWeight: 700, color: "white" }}>{item.code || "-"}</span> },
        { key: "name", label: "Currency", render: (item) => item.name || "-" },
        { key: "symbol", label: "Symbol", render: (item) => item.symbol || "-" },
        { key: "rate", label: "Exchange Rate", render: (item) => String(item.exchangeRate ?? 1) },
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
                background: item.isActive === false ? "rgba(248,113,113,.12)" : "rgba(52,211,153,.15)",
                color: item.isActive === false ? "#f87171" : "#34d399",
              }}
            >
              {item.isActive === false ? "Inactive" : "Active"}
            </span>
          ),
        },
      ]}
    />
  );
}
