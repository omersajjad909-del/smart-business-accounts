"use client";

import Link from "next/link";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  ecommerceBg,
  ecommerceBorder,
  ecommerceFont,
  ecommerceMuted,
  mapEcommerceOrders,
  mapEcommerceProducts,
  mapEcommerceReturns,
  mapEcommerceShipments,
} from "./_shared";

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: ecommerceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

export default function EcommerceOverviewPage() {
  const productsHook = useBusinessRecords("ecommerce_product");
  const ordersHook = useBusinessRecords("ecommerce_order");
  const returnsHook = useBusinessRecords("ecommerce_return");
  const shippingHook = useBusinessRecords("ecommerce_shipment");

  const products = mapEcommerceProducts(productsHook.records);
  const orders = mapEcommerceOrders(ordersHook.records);
  const returns = mapEcommerceReturns(returnsHook.records);
  const shipments = mapEcommerceShipments(shippingHook.records);

  const deliveredRevenue = orders.filter((order) => order.status === "delivered").reduce((sum, order) => sum + order.amount, 0);
  const activeProducts = products.filter((product) => product.status === "active").length;
  const pendingOrders = orders.filter((order) => order.status === "pending" || order.status === "processing").length;
  const openReturns = returns.filter((record) => record.status === "pending" || record.status === "approved").length;
  const inTransit = shipments.filter((shipment) => shipment.status === "processing" || shipment.status === "dispatched" || shipment.status === "in_transit").length;

  const topProducts = [...products].sort((a, b) => b.sales - a.sales).slice(0, 4);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ecommerceFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>E-Commerce / Online Store</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Command Center</h1>
        <p style={{ margin: 0, fontSize: 14, color: ecommerceMuted, maxWidth: 720 }}>
          Catalog se order, return, aur shipping tak poora online commerce flow ek jagah se manage karein. Marketplace aur direct store dono ke liye ye desk built hai.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Active Products" value={activeProducts} tone="#34d399" />
        <StatCard label="Pending Orders" value={pendingOrders} tone="#f59e0b" />
        <StatCard label="In Transit" value={inTransit} tone="#60a5fa" />
        <StatCard label="Open Returns" value={openReturns} tone="#f87171" />
        <StatCard label="Delivered Revenue" value={`Rs. ${deliveredRevenue.toLocaleString()}`} tone="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,.14), rgba(20,184,166,.12))", border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#c7d2fe", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Business Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Catalog Ready", body: "SKU, price, stock, aur platform listing control." },
              { title: "Orders Control", body: "Marketplace aur direct store orders ka live desk." },
              { title: "Returns Desk", body: "Approval, rejection, aur refund status discipline." },
              { title: "Shipping Ops", body: "Courier, city, ETA, aur dispatch closure tracking." },
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
              <div style={{ color: ecommerceMuted, fontSize: 13 }}>Abhi products add nahi hue. Pehle catalog build karein, phir top sellers yahan show honge.</div>
            ) : topProducts.map((product) => (
              <div key={product.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: ecommerceMuted }}>{product.sku || "No SKU"} • {product.platform}</div>
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
              { label: "Catalog Health", value: `${activeProducts}/${products.length || 0} active products`, tone: "#c7d2fe" },
              { label: "Order Conversion", value: `${orders.filter((order) => order.status === "delivered").length} delivered orders`, tone: "#34d399" },
              { label: "Customer Service", value: `${openReturns} active return cases`, tone: "#f59e0b" },
              { label: "Fulfillment Readiness", value: `${inTransit} shipments in motion`, tone: "#60a5fa" },
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
