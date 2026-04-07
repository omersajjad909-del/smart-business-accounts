"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EcommerceControlCenter, ecommerceBg, ecommerceBorder, ecommerceFont, ecommerceMuted, fetchJson } from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: ecommerceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

const emptyState: EcommerceControlCenter = {
  summary: {
    products: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    orders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    deliveredRevenue: 0,
    grossSales: 0,
    returns: 0,
    openReturns: 0,
    refundValue: 0,
    shipments: 0,
    inTransitShipments: 0,
    deliveryRate: 0,
    returnRate: 0,
  },
  products: [],
  orders: [],
  returns: [],
  shipments: [],
};

export default function EcommerceOverviewPage() {
  const [data, setData] = useState<EcommerceControlCenter>(emptyState);

  useEffect(() => {
    fetchJson("/api/ecommerce/control-center", emptyState).then(setData);
  }, []);

  const topProducts = useMemo(() => [...data.products].sort((a, b) => b.sales - a.sales).slice(0, 4), [data.products]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ecommerceFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>E-Commerce / Online Store</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Command Center</h1>
        <p style={{ margin: 0, fontSize: 14, color: ecommerceMuted, maxWidth: 720 }}>
          Catalog, orders, returns, and shipping are now unified through one dedicated ecommerce control center.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Active Products" value={data.summary.activeProducts} tone="#34d399" />
        <StatCard label="Pending Orders" value={data.summary.activeOrders} tone="#f59e0b" />
        <StatCard label="In Transit" value={data.summary.inTransitShipments} tone="#60a5fa" />
        <StatCard label="Open Returns" value={data.summary.openReturns} tone="#f87171" />
        <StatCard label="Delivered Revenue" value={`Rs. ${data.summary.deliveredRevenue.toLocaleString()}`} tone="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,.14), rgba(20,184,166,.12))", border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#c7d2fe", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Business Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Catalog Ready", body: `${data.summary.activeProducts} active listings are currently available.` },
              { title: "Orders Control", body: `${data.summary.activeOrders} orders are live across pending and processing.` },
              { title: "Returns Desk", body: `${data.summary.openReturns} return cases need action.` },
              { title: "Shipping Ops", body: `${data.summary.inTransitShipments} shipments are currently moving.` },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(99,102,241,.2)", color: "#c7d2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/ecommerce/products", label: "Manage Catalog", hint: "Products, SKU, stock, platforms" },
              { href: "/dashboard/ecommerce/orders", label: "Open Orders Desk", hint: "Pending to delivered flow" },
              { href: "/dashboard/ecommerce/returns", label: "Review Returns", hint: "Refund and issue control" },
              { href: "/dashboard/ecommerce/shipping", label: "Track Shipments", hint: "Courier and ETA follow-up" },
              { href: "/dashboard/ecommerce/analytics", label: "See Ecommerce Analytics", hint: "Revenue, returns, platform mix" },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: ecommerceMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Selling Products</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topProducts.length === 0 ? (
              <div style={{ color: ecommerceMuted, fontSize: 13 }}>No products have been added yet.</div>
            ) : topProducts.map((product) => (
              <div key={product.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: ecommerceMuted }}>{product.sku || "No SKU"} | {product.platform}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#34d399" }}>{product.sales} sold</div>
                  <div style={{ fontSize: 12, color: ecommerceMuted }}>Rs. {product.price.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#f87171", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operations Snapshot</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Catalog Health", value: `${data.summary.activeProducts}/${data.summary.products || 0} active products`, tone: "#c7d2fe" },
              { label: "Order Conversion", value: `${data.summary.deliveredOrders} delivered orders`, tone: "#34d399" },
              { label: "Customer Service", value: `${data.summary.openReturns} active return cases`, tone: "#f59e0b" },
              { label: "Fulfillment Readiness", value: `${data.summary.inTransitShipments} shipments in motion`, tone: "#60a5fa" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 13, color: ecommerceMuted }}>{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
