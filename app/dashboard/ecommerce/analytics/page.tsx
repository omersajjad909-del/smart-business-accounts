"use client";

import { useMemo } from "react";
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
} from "../_shared";

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: ecommerceMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: ecommerceMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

export default function EcommerceAnalyticsPage() {
  const productsHook = useBusinessRecords("ecommerce_product");
  const ordersHook = useBusinessRecords("ecommerce_order");
  const returnsHook = useBusinessRecords("ecommerce_return");
  const shipmentsHook = useBusinessRecords("ecommerce_shipment");

  const products = mapEcommerceProducts(productsHook.records);
  const orders = mapEcommerceOrders(ordersHook.records);
  const returns = mapEcommerceReturns(returnsHook.records);
  const shipments = mapEcommerceShipments(shipmentsHook.records);

  const platformData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const order of orders) {
      totals.set(order.platform, (totals.get(order.platform) || 0) + order.amount);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const returnReasonData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const record of returns) {
      totals.set(record.reason, (totals.get(record.reason) || 0) + 1);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [returns]);

  const fulfilled = orders.filter((order) => order.status === "delivered").length;
  const cancelled = orders.filter((order) => order.status === "cancelled").length;
  const grossSales = orders.reduce((sum, order) => sum + order.amount, 0);
  const totalReturns = returns.reduce((sum, record) => sum + record.amount, 0);
  const returnRate = orders.length ? Math.round((returns.length / orders.length) * 100) : 0;
  const deliveryRate = shipments.length ? Math.round((shipments.filter((shipment) => shipment.status === "delivered").length / shipments.length) * 100) : 0;

  const topProducts = [...products]
    .map((product) => ({ ...product, revenue: product.sales * product.price }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: ecommerceFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#818cf8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Ecommerce Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Revenue, returns, aur fulfillment ka real picture</h1>
        <p style={{ margin: 0, fontSize: 14, color: ecommerceMuted, maxWidth: 760 }}>
          Online store performance ko platform, product, aur customer care lens se dekhein. Yeh page owner ko batata hai ke growth kahan se aa rahi hai aur friction kahan ho raha hai.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Gross Sales" value={`Rs. ${grossSales.toLocaleString()}`} note="All ecommerce orders" color="#34d399" />
        <Metric title="Delivered Orders" value={String(fulfilled)} note="Closed revenue orders" color="#60a5fa" />
        <Metric title="Return Rate" value={`${returnRate}%`} note="Return requests vs orders" color="#f59e0b" />
        <Metric title="Delivery Success" value={`${deliveryRate}%`} note="Delivered shipments ratio" color="#a78bfa" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Platform Contribution</div>
          <div style={{ display: "grid", gap: 12 }}>
            {platformData.length === 0 ? (
              <div style={{ fontSize: 13, color: ecommerceMuted }}>Abhi platform sales data nahi hai.</div>
            ) : platformData.map(([platform, total]) => {
              const width = grossSales ? Math.max(8, Math.round((total / grossSales) * 100)) : 8;
              return (
                <div key={platform}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{platform}</span>
                    <span style={{ fontSize: 12, color: ecommerceMuted }}>Rs. {total.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#f87171", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Return Pressure</div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
              <span style={{ fontSize: 13, color: ecommerceMuted }}>Total return value</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#f87171" }}>Rs. {totalReturns.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
              <span style={{ fontSize: 13, color: ecommerceMuted }}>Cancelled orders</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#f59e0b" }}>{cancelled}</span>
            </div>
            {returnReasonData.slice(0, 4).map(([reason, count]) => (
              <div key={reason} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13 }}>{reason}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#c7d2fe" }}>{count} cases</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Revenue Products</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topProducts.length === 0 ? (
              <div style={{ color: ecommerceMuted, fontSize: 13 }}>Top products dekhne ke liye pehle sales ya product data add karein.</div>
            ) : topProducts.map((product) => (
              <div key={product.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: ecommerceMuted }}>{product.platform} • {product.sales} units</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>Rs. {product.revenue.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: ecommerceBg, border: `1px solid ${ecommerceBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operational Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Fulfillment pressure", value: `${shipments.filter((shipment) => shipment.status === "processing" || shipment.status === "dispatched").length} open shipments`, tone: "#60a5fa" },
              { label: "Refund exposure", value: `${returns.filter((record) => record.status === "approved").length} approved refunds pending`, tone: "#f87171" },
              { label: "Catalog depth", value: `${products.filter((product) => product.stock > 0).length} in-stock products`, tone: "#34d399" },
              { label: "Order mix", value: `${orders.filter((order) => order.status === "pending" || order.status === "processing").length} active orders`, tone: "#f59e0b" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: ecommerceMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
