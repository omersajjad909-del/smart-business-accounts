"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchJson,
  formatMoney,
  saasBg,
  saasBorder,
  saasFont,
  saasMuted,
  type SubscriptionsControlCenter,
} from "./_shared";
import type { BusinessType } from "@/lib/businessModules";

const emptyState: SubscriptionsControlCenter = {
  summary: {
    plans: 0,
    activePlans: 0,
    subscribers: 0,
    activeSubscribers: 0,
    trialSubscribers: 0,
    pastDueSubscribers: 0,
    cancelledSubscribers: 0,
    mrr: 0,
    arr: 0,
    collectedThisCycle: 0,
    failedBillings: 0,
  },
  plans: [],
  subscribers: [],
  billings: [],
};

export default function SubscriptionsOverviewPage() {
  const [businessType, setBusinessType] = useState<BusinessType>("saas_company");
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/company/business-type", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.businessType) setBusinessType(data.businessType as BusinessType);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    fetchJson("/api/subscriptions/control-center", emptyState).then(setData);
  }, []);

  const isMembershipWebsite = businessType === "membership_website";
  const isSubscriptionBox = businessType === "subscription_box";
  const { summary, plans, subscribers } = data;
  const title = isMembershipWebsite
    ? "Members, access tiers, and recurring revenue command center"
    : isSubscriptionBox
      ? "Curated boxes, renewals, and fulfillment command center"
      : "Recurring revenue and subscriber command center";
  const intro = isMembershipWebsite
    ? "Membership plans, gated content access, renewals, and member lifecycle ko ek clean website-membership workflow me monitor karein."
    : isSubscriptionBox
      ? "Box plans, subscriber cycles, dispatch runs, aur repeat-fulfillment workflow ko ek clean subscription-commerce flow me monitor karein."
      : "Plans, subscribers, renewals, and monthly recurring revenue ko ek clean SaaS workflow me monitor karein.";
  const flow = isMembershipWebsite
    ? [
        { title: "Plan Setup", body: "Free, premium, aur annual member plans ko commercial structure ke saath define karein." },
        { title: "Member Onboarding", body: "Website members ko plan assign karein, trial ya active lifecycle me onboard karein." },
        { title: "Content Access", body: "Courses, downloads, community zones, aur premium libraries ko tier-wise lock karein." },
        { title: "Recurring Revenue", body: "Renewals, due subscriptions, churn, aur member value ko monthly track karein." },
      ]
    : isSubscriptionBox
      ? [
          { title: "Plan Setup", body: "Monthly, quarterly, ya premium box plans ko curated pricing ke saath define karein." },
          { title: "Subscriber Desk", body: "Members ko box plan assign karein aur unki next cycle date lock karein." },
          { title: "Box Catalog", body: "Har cycle ke curated items aur themed box bundles ko plan-wise map karein." },
          { title: "Fulfillment", body: "Packing, dispatch, courier tracking, aur delivered runs ko member-wise monitor karein." },
        ]
    : [
        { title: "Plan Setup", body: "Pricing, seats, trial days, aur commercial packaging define karein." },
        { title: "Subscriber Desk", body: "Company onboard karein, active plan assign karein, aur renewal date lock karein." },
        { title: "Recurring Billing", body: "Billing runs, invoice schedule, aur collection status monitor karein." },
        { title: "MRR Analytics", body: "MRR, ARR, churn, renewals, aur overdue subscriber health track karein." },
      ];
  const quickLinks = isMembershipWebsite
    ? [
        { href: "/dashboard/subscriptions/plans", label: "Membership Plans" },
        { href: "/dashboard/subscriptions/subscribers", label: "Members" },
        { href: "/dashboard/subscriptions/content-tiers", label: "Content Tiers" },
        { href: "/dashboard/subscriptions/member-access", label: "Member Access" },
        { href: "/dashboard/subscriptions/mrr", label: "Renewal Analytics" },
      ]
    : isSubscriptionBox
      ? [
          { href: "/dashboard/subscriptions/plans", label: "Box Plans" },
          { href: "/dashboard/subscriptions/subscribers", label: "Subscribers" },
          { href: "/dashboard/subscriptions/box-catalog", label: "Box Catalog" },
          { href: "/dashboard/subscriptions/fulfillment", label: "Fulfillment" },
          { href: "/dashboard/subscriptions/mrr", label: "Recurring Revenue" },
        ]
    : [
        { href: "/dashboard/subscriptions/plans", label: "Plans" },
        { href: "/dashboard/subscriptions/subscribers", label: "Subscribers" },
        { href: "/dashboard/subscriptions/billing", label: "Recurring Billing" },
        { href: "/dashboard/subscriptions/mrr", label: "MRR / ARR" },
      ];

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: saasFont }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
            {isMembershipWebsite ? "Membership Website" : isSubscriptionBox ? "Subscription Box" : "SaaS Company"}
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 900 }}>{title}</h1>
          <p style={{ margin: 0, fontSize: 14, color: saasMuted, maxWidth: 760 }}>
            {intro}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {quickLinks.map((item) => (
            <Link prefetch={false} key={item.href} href={item.href} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${saasBorder}`, background: saasBg, color: "#93c5fd", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Plans", value: summary.plans, color: "#60a5fa" },
          { label: "Active Subscribers", value: summary.activeSubscribers, color: "#34d399" },
          { label: "Trials", value: summary.trialSubscribers, color: "#f59e0b" },
          { label: "MRR", value: formatMoney(Math.round(summary.mrr)), color: "#c084fc" },
          { label: "ARR", value: formatMoney(Math.round(summary.arr)), color: "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontSize: 12, color: saasMuted, marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(59,130,246,.14), rgba(14,165,233,.08))", border: `1px solid ${saasBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#bfdbfe", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>
            {isMembershipWebsite ? "Membership Flow" : isSubscriptionBox ? "Fulfillment Flow" : "SaaS Flow"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12 }}>
            {flow.map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(147,197,253,.16)", color: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,.62)" }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Revenue Snapshot</div>
            <div style={{ display: "grid", gap: 10 }}>
              {[
                { label: "Collected this cycle", value: formatMoney(summary.collectedThisCycle), color: "#34d399" },
                { label: "Past due subscribers", value: summary.pastDueSubscribers, color: "#f97316" },
                { label: "Cancelled subscribers", value: summary.cancelledSubscribers, color: "#f87171" },
                { label: "Draft or retired plans", value: plans.filter((item) => item.status !== "active").length, color: "#fbbf24" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", borderRadius: 12, padding: "10px 12px" }}>
                  <span style={{ fontSize: 13, color: saasMuted }}>{row.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: saasBg, border: `1px solid ${saasBorder}`, borderRadius: 18, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Renewal Watchlist</div>
            <div style={{ display: "grid", gap: 10 }}>
              {subscribers.slice(0, 5).map((item) => (
                <div key={item.id} style={{ border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.03)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{item.company}</div>
                  <div style={{ fontSize: 12, color: saasMuted, marginTop: 4 }}>{item.planName} | Renewal {item.renewalDate || "-"}</div>
                </div>
              ))}
              {subscribers.length === 0 && <div style={{ color: "rgba(255,255,255,.28)" }}>No subscriber records yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
