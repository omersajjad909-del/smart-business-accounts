"use client";

import AdminMasterDataPage from "@/app/admin/components/AdminMasterDataPage";

type ProductRow = {
  code?: string;
  name?: string;
  category?: string;
  unit?: string;
  rate?: number;
  minStock?: number;
};

export default function AdminProductsPage() {
  return (
    <AdminMasterDataPage<ProductRow>
      title="Products"
      subtitle="Inventory products and item master records from your live workspace."
      endpoint="/api/items-new"
      metricLabel="Total Products"
      emptyTitle="No products found"
      emptyHint="Add products from your inventory workflow and they will appear here."
      columns={[
        { key: "code", label: "Code", render: (item) => item.code || "-" },
        { key: "name", label: "Product", render: (item) => <span style={{ fontWeight: 700, color: "white" }}>{item.name || "-"}</span> },
        { key: "category", label: "Category", render: (item) => item.category || "-" },
        { key: "unit", label: "Unit", render: (item) => item.unit || "-" },
        { key: "rate", label: "Rate", render: (item) => (item.rate ?? 0).toLocaleString() },
        { key: "stock", label: "Min Stock", render: (item) => item.minStock ?? 0 },
      ]}
    />
  );
}
