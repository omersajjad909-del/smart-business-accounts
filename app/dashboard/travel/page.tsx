"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson, travelAccent, type TravelControlCenter } from "./_shared";

const emptyState: TravelControlCenter = {
  summary: { tickets: 0, issuedTickets: 0, pendingTickets: 0, visaCases: 0, activeVisaCases: 0, settlements: 0, pendingSettlements: 0, monthlySales: 0, supplierExposure: 0 },
  tickets: [],
  visas: [],
  settlements: [],
};

export default function TravelOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/travel/control-center", emptyState).then(setData);
  }, []);

  const { summary, tickets, visas } = data;

  return (
    <div style={{ padding: "28px 32px", color: "#e2e8f0", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, color: "white" }}>Travel Agency Command Center</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.45)" }}>
            Manage airline ticketing, visa processing, and customer travel commitments from one live workspace.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Airline Tickets", href: "/dashboard/travel/tickets" },
            { label: "Visa Cases", href: "/dashboard/travel/visas" },
            { label: "Supplier Settlements", href: "/dashboard/travel/settlements" },
            { label: "Quotation", href: "/dashboard/quotation" },
            { label: "Sales Invoice", href: "/dashboard/sales-invoice" },
          ].map((item) => (
            <Link
              prefetch={false}
              key={item.href}
              href={item.href}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.03)",
                color: "#7dd3fc",
                textDecoration: "none",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Tickets", value: summary.tickets, color: travelAccent },
          { label: "Issued", value: summary.issuedTickets, color: "#34d399" },
          { label: "Pending", value: summary.pendingTickets, color: "#fbbf24" },
          { label: "Visa Cases", value: summary.visaCases, color: "#a78bfa" },
          { label: "Active Visas", value: summary.activeVisaCases, color: "#f97316" },
          { label: "Settlements", value: summary.settlements, color: "#38bdf8" },
          { label: "Pending Payables", value: summary.pendingSettlements, color: "#fb7185" },
          { label: "Sales Value", value: summary.monthlySales.toLocaleString(), color: "#60a5fa" },
          { label: "Supplier Exposure", value: summary.supplierExposure.toLocaleString(), color: "#c084fc" },
        ].map((card) => (
          <div key={card.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Ticketing Desk</div>
          <div style={{ display: "grid", gap: 10 }}>
            {tickets.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.booking}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.passenger || "-"} | {item.airline || "-"}</div>
                <div style={{ fontSize: 12, color: "#7dd3fc", marginTop: 6 }}>{item.route || "-"} | {item.status}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginTop: 4 }}>{item.invoiceNo || "No invoice"} | {item.settlementRef || "No settlement"}</div>
              </div>
            ))}
            {tickets.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No airline tickets yet.</div>}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Visa Processing Desk</div>
          <div style={{ display: "grid", gap: 10 }}>
            {visas.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.caseRef}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.applicant || "-"} | {item.country || "-"}</div>
                <div style={{ fontSize: 12, color: "#c4b5fd", marginTop: 6 }}>{item.submissionDate || "-"} | {item.status}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.38)", marginTop: 4 }}>{item.invoiceNo || "No invoice"} | {item.settlementRef || "No settlement"}</div>
              </div>
            ))}
            {visas.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No visa applications yet.</div>}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "white", marginBottom: 14 }}>Supplier Settlement Queue</div>
          <div style={{ display: "grid", gap: 10 }}>
            {data.settlements.slice(0, 6).map((item) => (
              <div key={item.id} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{item.settlementRef}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 4 }}>{item.supplierName || "-"} | {item.customerName || "-"}</div>
                <div style={{ fontSize: 12, color: "#c084fc", marginTop: 6 }}>{item.amount.toLocaleString()} | {item.status}</div>
              </div>
            ))}
            {data.settlements.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)" }}>No settlement commitments yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
