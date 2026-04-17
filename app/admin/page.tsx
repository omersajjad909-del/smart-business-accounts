"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";
// ═══════════════════════════════════════════════════════════════
//  FINOVA — COMPLETE ADMIN PANEL
//  FILE: app/admin/page.tsx  (or wrap in your admin layout)
//  All sections: Dashboard · Companies · Users · Revenue ·
//  Geo · Usage · Plans · System · Logs · Permissions · Settings
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { clearCurrentUser, getCurrentUser, updateStoredUser } from "@/lib/auth";
import { DASHBOARD_FEATURE_DEFS, createDefaultDashboardFeatureFlags } from "@/lib/dashboardFeatureRegistry";
type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const NOTIF_CONFIG: Record<string,{ icon:string; color:string; bg:string }> = {
  new_signup:           { icon:"✦", color:"#34d399", bg:"rgba(52,211,153,.12)"  },
  subscription_past_due:{ icon:"⚠", color:"#f87171", bg:"rgba(248,113,113,.12)" },
  plan_upgraded:        { icon:"⬆", color:"#818cf8", bg:"rgba(129,140,248,.12)" },
  at_risk_company:      { icon:"⚠️", color:"#fbbf24", bg:"rgba(251,191,36,.12)"  },
  system_error:         { icon:"⚡", color:"#f87171", bg:"rgba(248,113,113,.12)" },
  new_chat:             { icon:"💬", color:"#38bdf8", bg:"rgba(56,189,248,.12)"  },
  stripe_failed:        { icon:"💳", color:"#f87171", bg:"rgba(248,113,113,.12)" },
  INFO:                 { icon:"ℹ️", color:"#818cf8", bg:"rgba(129,140,248,.12)" },
  WARNING:              { icon:"⚠", color:"#fbbf24", bg:"rgba(251,191,36,.12)"  },
  ERROR:                { icon:"⚡", color:"#f87171", bg:"rgba(248,113,113,.12)" },
  SUCCESS:              { icon:"✓", color:"#34d399", bg:"rgba(52,211,153,.12)"  },
};

function getAdminUser(): any {
  return getCurrentUser() || {};
}

/* ── tiny helpers ── */
function fmt(n: number | undefined | null, prefix = "") {
  if (n == null) return "—";
  if (n >= 1_000_000) return prefix + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return prefix + (n / 1_000).toFixed(1) + "K";
  return prefix + n.toString();
}
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400)return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}


const PERMISSIONS_LIST = [
  "invoices.create","invoices.edit","invoices.delete","invoices.view",
  "reports.view","reports.export","banking.reconcile","banking.import",
  "inventory.manage","crm.access","hr.payroll","settings.manage",
  "users.invite","users.manage","admin.access",
];

/* ═══════════════════════════════════════════════════════
   NAV CONFIG
═══════════════════════════════════════════════════════ */
type Page = "dashboard"|"companies"|"users"|"revenue"|"geo"|"usage"|"plans"|"system"|"logs"|"permissions"|"settings"|"profile"|"tickets"|"broadcasts"|"flags"|"apikeys"|"visitors"|"updates"|"livesupport"|"subscriptions"|"coupons"|"emaillogs"|"referrals"|"teams"|"testimonials"|"leads"|"seo"|"social"|"business_modules"|"newsletter"|"feedback"|"crm"|"fraud";

// SVG icon paths per nav item (14x14 viewBox, stroke-based)
const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  companies:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  subscriptions:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  revenue:          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  geo:              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  usage:            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  visitors:         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  plans:            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  business_modules: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  coupons:          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  referrals:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  leads:            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  broadcasts:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.9-1.84a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  testimonials:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  newsletter:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  feedback:         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  updates:          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.55"/></svg>,
  seo:              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  social:           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  livesupport:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/></svg>,
  tickets:          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>,
  system:           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logs:             <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  emaillogs:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  flags:            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  apikeys:          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  permissions:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  teams:            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  settings:         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

const NAV: { page:Page; label:string; icon:string; color:string; badge?:string }[] = [
  { page:"dashboard",        label:"Dashboard",        icon:"",  color:"#818cf8" },
  { page:"companies",        label:"Companies & Users", icon:"", color:"#38bdf8" },
  { page:"subscriptions",    label:"Subscriptions",    icon:"",  color:"#fbbf24" },
  { page:"revenue",          label:"Revenue",          icon:"",  color:"#34d399" },
  { page:"geo",              label:"Geo Analytics",    icon:"",  color:"#a78bfa" },
  { page:"usage",            label:"Usage Insights",   icon:"",  color:"#f472b6" },
  { page:"visitors",         label:"Visitor Analytics", icon:"", color:"#38bdf8" },
  { page:"plans",            label:"Plans & Billing",  icon:"",  color:"#818cf8" },
  { page:"business_modules", label:"Business Modules", icon:"",  color:"#a78bfa" },
  { page:"coupons",          label:"Coupon Codes",     icon:"",  color:"#34d399" },
  { page:"referrals",        label:"Referrals",        icon:"",  color:"#a78bfa" },
  { page:"crm",              label:"CRM",              icon:"",  color:"#22d3ee" },
  { page:"leads",            label:"Lead Management",  icon:"",  color:"#f87171" },
  { page:"broadcasts",       label:"Broadcasts",       icon:"",  color:"#818cf8" },
  { page:"testimonials",     label:"Testimonials",     icon:"",  color:"#fbbf24" },
  { page:"newsletter",       label:"Newsletter",       icon:"",  color:"#34d399" },
  { page:"feedback",         label:"Feedback",         icon:"",  color:"#f87171" },
  { page:"updates",          label:"Product Updates",  icon:"",  color:"#a78bfa" },
  { page:"seo",              label:"SEO Settings",     icon:"",  color:"#34d399" },
  { page:"social",           label:"Social Media",     icon:"",  color:"#f472b6" },
  { page:"livesupport",      label:"Live Support",     icon:"",  color:"#38bdf8" },
  { page:"tickets",          label:"Support Tickets",  icon:"",  color:"#fbbf24" },
  { page:"fraud",            label:"Fraud Monitor",    icon:"",  color:"#f87171", badge:"NEW" },
  { page:"system",           label:"System Health",    icon:"",  color:"#34d399", badge:"OK" },
  { page:"logs",             label:"Audit Logs",       icon:"",  color:"#94a3b8" },
  { page:"emaillogs",        label:"Email Logs",       icon:"",  color:"#94a3b8" },
  { page:"flags",            label:"Feature Flags",    icon:"",  color:"#f472b6" },
  { page:"apikeys",          label:"API Keys",         icon:"",  color:"#fbbf24" },
  { page:"permissions",      label:"Permissions",      icon:"",  color:"#f87171" },
  { page:"teams",            label:"Team Access",      icon:"",  color:"#f472b6" },
  { page:"settings",         label:"Settings",         icon:"",  color:"#94a3b8" },
];

const NAV_GROUPS: { label: string; pages: Page[] }[] = [
  { label: "Overview",   pages: ["dashboard"] },
  { label: "Analytics",  pages: ["revenue","geo","usage","visitors"] },
  { label: "Business",   pages: ["companies","subscriptions","plans","business_modules"] },
  { label: "Marketing",  pages: ["coupons","referrals","crm","leads","broadcasts","testimonials","newsletter","feedback"] },
  { label: "Content",    pages: ["updates","seo","social"] },
  { label: "Support",    pages: ["livesupport","tickets"] },
  { label: "Security",   pages: ["fraud"] },
  { label: "System",     pages: ["system","logs","emaillogs","flags","apikeys"] },
  { label: "Access",     pages: ["permissions","teams","settings"] },
];

/* ═══════════════════════════════════════════════════════
   MINI CHART COMPONENTS
═══════════════════════════════════════════════════════ */
function LineChart({ data, height=80 }: { data:{label:string;value:number}[]; height?:number }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.15)", fontSize:11 }}>
      No data yet
    </div>
  );
  const max = Math.max(...data.map(d=>d.value||0), 1);
  const min = Math.min(...data.map(d=>d.value||0), 0);
  const range = max - min || 1;
  const W = 300; const H = height;
  const pts = data.map((d,i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.value - min) / range) * (H - 20) - 10;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} L${pts.join(" L")} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height, overflow:"visible" }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity=".35"/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lg)"/>
      <polyline points={pts.join(" ")} fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i) => {
        const [x,y] = pts[i].split(",").map(Number);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#818cf8"/>
            <text x={x} y={H} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.3)">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function BarChart({ data }: { data:{label:string;value:number;color:string}[] }) {
  const max = Math.max(...data.map(d=>d.value||0), 1);
  return (
    <div style={{ display:"flex", gap:12, alignItems:"flex-end", height:80 }}>
      {data.map((d,i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:10, color:"rgba(255,255,255,.5)", fontWeight:700 }}>{d.value}</span>
          <div style={{ width:"100%", height: Math.max(4, ((d.value||0)/max)*64), borderRadius:6, background:d.color, opacity:.85 }}/>
          <span style={{ fontSize:9, color:"rgba(255,255,255,.35)" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniDonut({ value, max, color="#6366f1", size=56 }: { value:number; max:number; color?:string; size?:number }) {
  const pct = Math.min(value/max, 1);
  const r = 20; const c = 2*Math.PI*r;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="6"/>
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${pct*c} ${c}`} strokeLinecap="round"
        transform="rotate(-90 28 28)" style={{ transition:"stroke-dasharray .6s ease" }}/>
      <text x="28" y="32" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">
        {Math.round(pct*100)}%
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED UI ATOMS
═══════════════════════════════════════════════════════ */
function Badge({ status }: { status:string }) {
  const map: Record<string,[string,string,string]> = {
    active:   ["#34d399","rgba(52,211,153,.12)",""],
    trial:    ["#fbbf24","rgba(251,191,36,.12)",""],
    past_due: ["#f87171","rgba(248,113,113,.12)","⚠"],
    cancelled:["#6b7280","rgba(107,114,128,.12)","✕"],
    OK:       ["#34d399","rgba(52,211,153,.12)",""],
    WARNING:  ["#fbbf24","rgba(251,191,36,.12)","⚠"],
    ERROR:    ["#f87171","rgba(248,113,113,.12)","✕"],
  };
  const [c,bg,dot] = map[status] || ["#818cf8","rgba(129,140,248,.12)",""];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, background:bg, color:c, fontSize:10.5, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", border:`1px solid ${c}28` }}>
      <span style={{ fontSize:8 }}>{dot}</span>{status.replace(/_/g," ")}
    </span>
  );
}

function SectionCard({ title, children, action, accent }: { title:string; children:React.ReactNode; action?:React.ReactNode; accent?:string }) {
  return (
    <div style={{ background:"linear-gradient(135deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.015) 100%)", borderRadius:18, border:"1px solid rgba(255,255,255,.08)", padding:"22px 24px", position:"relative", overflow:"hidden" }}>
      {accent && <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:`linear-gradient(180deg, ${accent}, transparent)`, borderRadius:"18px 0 0 18px" }}/>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <span style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.6)", letterSpacing:".07em", textTransform:"uppercase" }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, icon, color="#6366f1", trend }: {
  label:string; value:string|number; sub?:string; icon:string; color?:string; trend?:number;
}) {
  return (
    <div style={{ background:"linear-gradient(135deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.02) 100%)", borderRadius:18, border:"1px solid rgba(255,255,255,.08)", padding:"20px 22px", position:"relative", overflow:"hidden", transition:"all .25s cubic-bezier(.4,0,.2,1)", cursor:"default" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${color}55`;e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 40px ${color}20`;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.08)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      {/* Ambient glow blob */}
      <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%", background:color, opacity:.07, filter:"blur(20px)" }}/>
      {/* Top accent line */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${color}, transparent)`, borderRadius:"18px 18px 0 0" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:`linear-gradient(135deg, ${color}25, ${color}10)`, border:`1px solid ${color}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{icon}</div>
        {trend !== undefined && (
          <div style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 10px", borderRadius:20, background: trend>=0?"rgba(52,211,153,.1)":"rgba(248,113,113,.1)", border:`1px solid ${trend>=0?"rgba(52,211,153,.2)":"rgba(248,113,113,.2)"}` }}>
            <span style={{ fontSize:11, fontWeight:700, color: trend>=0?"#34d399":"#f87171" }}>{trend>=0?"↑":"↓"} {Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div style={{ fontSize:28, fontWeight:800, color:"white", fontFamily:"'Outfit',sans-serif", lineHeight:1, letterSpacing:"-0.02em" }}>{value}</div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,.45)", marginTop:5, fontWeight:600 }}>{label}</div>
      {sub && <div style={{ fontSize:10.5, color:"rgba(255,255,255,.22)", marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function DataTable({ cols, rows, empty="No data" }: {
  cols: { key:string; label:string; align?:"right"|"left"; render?:(v:any,row:any)=>React.ReactNode }[];
  rows: any[] | null;
  empty?: string;
}) {
  return (
    <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid rgba(255,255,255,.07)" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
        <thead>
          <tr style={{ background:"rgba(255,255,255,.04)" }}>
            {cols.map(c => (
              <th key={c.key} style={{ padding:"10px 14px", textAlign:c.align||"left", color:"rgba(255,255,255,.35)", fontWeight:800, letterSpacing:".07em", fontSize:10, textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,.07)", whiteSpace:"nowrap" }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows ? (
            <tr><td colSpan={cols.length} style={{ padding:"32px 14px", textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={cols.length} style={{ padding:"36px 14px", textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>{empty}</td></tr>
          ) : rows.map((row,i) => (
            <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,.05)", transition:"background .15s" }}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(129,140,248,.06)")}
              onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
              {cols.map(c => (
                <td key={c.key} style={{ padding:"11px 14px", color:"rgba(255,255,255,.75)", textAlign:c.align||"left" }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: DASHBOARD
═══════════════════════════════════════════════════════ */
function PageDashboard({ setPage }: { setPage:(p:Page)=>void }) {
  const [kpis,    setKpis]    = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [logs,    setLogs]    = useState<any[]>([]);
  const [health,  setHealth]  = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/web/metrics").then(r=>r.json()).then(setKpis).catch(()=>{});
    fetch("/api/admin/web/revenue").then(r=>r.json()).then(setRevenue).catch(()=>{});
    fetch("/api/admin/logs").then(r=>r.json()).then(d=>setLogs(d.rows||[])).catch(()=>{});
    fetch("/api/admin/system/health").then(r=>r.json()).then(setHealth).catch(()=>{});
  }, []);

  const planDist = [
    { label:"Starter",    value: revenue?.planDistribution?.starter    || 0, color:"#64748b" },
    { label:"Pro",        value: revenue?.planDistribution?.pro        || 0, color:"#6366f1" },
    { label:"Enterprise", value: revenue?.planDistribution?.enterprise || 0, color:"#818cf8" },
  ];
  const churnPct = kpis ? Math.round((kpis.churnThisMonth / Math.max(kpis.totalCompanies,1)) * 100) : 0;

  const loading = !kpis;

  const Skeleton = () => (
    <div style={{ height:28, borderRadius:6, background:"rgba(255,255,255,.06)", animation:"shimmer 1.6s ease infinite", backgroundSize:"200% 100%", backgroundImage:"linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 100%)" }}/>
  );

  const statCards = [
    { label:"Total Companies",      value:fmt(kpis?.totalCompanies),         sub:"All time",          color:"#6366f1", trend:kpis?.trends?.totalCompanies,
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1"/><rect x="2" y="3" width="20" height="18" rx="1"/></svg> },
    { label:"Active Subscriptions",  value:fmt(kpis?.activeSubs),             sub:"Paid plans",        color:"#818cf8", trend:kpis?.trends?.activeSubs,
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { label:"Monthly Revenue",       value:fmt(kpis?.revenueThisMonth,"$"),   sub:"MRR this month",   color:"#34d399", trend:12,
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label:"New Signups",            value:fmt(kpis?.newSignups30d),          sub:"Last 30 days",     color:"#a78bfa", trend:kpis?.trends?.newSignups30d,
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
    { label:"Churn This Month",       value:churnPct+"%",                      sub:"Cancellation rate", color:"#f87171", trend:kpis?.trends?.churnThisMonth,
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg> },
    { label:"Active Users (24h)",     value:fmt(kpis?.logins24h),              sub:"Unique sessions",  color:"#38bdf8", trend:kpis?.trends?.logins24h,
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* ── KPI Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            borderRadius:16, padding:"20px 22px", position:"relative", overflow:"hidden",
            background:"#0d1226",
            border:"1px solid rgba(255,255,255,.07)",
            transition:"border-color .2s, transform .2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=`${card.color}40`;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,.07)";e.currentTarget.style.transform="translateY(0)";}}>
            {/* Top accent */}
            <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${card.color},${card.color}00)`,borderRadius:"16px 16px 0 0" }}/>
            {/* Glow */}
            <div style={{ position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:card.color,opacity:.06,filter:"blur(16px)",pointerEvents:"none" }}/>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              {/* Icon */}
              <div style={{ width:38,height:38,borderRadius:10,background:`${card.color}18`,border:`1px solid ${card.color}28`,display:"flex",alignItems:"center",justifyContent:"center",color:card.color }}>
                {card.icon}
              </div>
              {/* Trend badge */}
              {card.trend !== undefined && card.trend !== null && (
                <div style={{ display:"flex",alignItems:"center",gap:3,padding:"3px 9px",borderRadius:20,
                  background:card.trend>=0?"rgba(52,211,153,.08)":"rgba(248,113,113,.08)",
                  border:`1px solid ${card.trend>=0?"rgba(52,211,153,.18)":"rgba(248,113,113,.18)"}` }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={card.trend>=0?"#34d399":"#f87171"} strokeWidth="2.5" strokeLinecap="round">
                    {card.trend>=0 ? <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></> : <><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></>}
                  </svg>
                  <span style={{ fontSize:10.5,fontWeight:700,color:card.trend>=0?"#34d399":"#f87171" }}>{Math.abs(card.trend)}%</span>
                </div>
              )}
            </div>

            {loading ? <Skeleton/> : (
              <div style={{ fontSize:30,fontWeight:800,color:"white",letterSpacing:"-0.03em",lineHeight:1 }}>{card.value}</div>
            )}
            <div style={{ marginTop:6, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:12.5,fontWeight:600,color:"rgba(255,255,255,.5)" }}>{card.label}</span>
              <span style={{ fontSize:10.5,color:"rgba(255,255,255,.22)" }}>{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>

        {/* MRR Growth */}
        <div style={{ borderRadius:16, background:"#0d1226", border:"1px solid rgba(255,255,255,.07)", padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"white" }}>Revenue Growth</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Monthly recurring revenue trend</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.18)" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#34d399" }}/>
              <span style={{ fontSize:11, fontWeight:700, color:"#34d399" }}>Growing</span>
            </div>
          </div>
          <LineChart data={revenue?.mrrSeries||[]} height={130}/>
          <div style={{ display:"flex", gap:20, marginTop:14, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.05)" }}>
            {[
              { label:"This Month", value: fmt(kpis?.revenueThisMonth,"$"), color:"#34d399" },
              { label:"Active Subs", value: fmt(kpis?.activeSubs), color:"#818cf8" },
              { label:"Companies",  value: fmt(kpis?.totalCompanies), color:"#6366f1" },
            ].map(s=>(
              <div key={s.label}>
                <div style={{ fontSize:16, fontWeight:800, color:s.color, letterSpacing:"-0.02em" }}>{loading?"—":s.value}</div>
                <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Distribution */}
        <div style={{ borderRadius:16, background:"#0d1226", border:"1px solid rgba(255,255,255,.07)", padding:"20px 22px" }}>
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"white" }}>Plan Distribution</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Active subscriptions by tier</div>
          </div>
          <BarChart data={planDist}/>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16, paddingTop:14, borderTop:"1px solid rgba(255,255,255,.05)" }}>
            {planDist.map((d,i) => {
              const total = planDist.reduce((s,p)=>s+p.value,0)||1;
              const pct = Math.round((d.value/total)*100);
              return (
                <div key={d.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:3, background:d.color, flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.5)", flex:1 }}>{d.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.75)" }}>{d.value}</span>
                  <div style={{ width:60, height:4, borderRadius:4, background:"rgba(255,255,255,.06)" }}>
                    <div style={{ width:`${pct}%`, height:"100%", borderRadius:4, background:d.color }}/>
                  </div>
                  <span style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", width:28, textAlign:"right" }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>

        {/* Recent Activity */}
        <div style={{ borderRadius:16, background:"#0d1226", border:"1px solid rgba(255,255,255,.07)", padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"white" }}>Recent Activity</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Latest platform events</div>
            </div>
            <button onClick={()=>setPage("logs")}
              style={{ fontSize:11, color:"#818cf8", background:"rgba(129,140,248,.08)", border:"1px solid rgba(129,140,248,.18)", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontWeight:700, fontFamily:"inherit", transition:"background .15s" }}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(129,140,248,.15)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(129,140,248,.08)")}>
              View all
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {logs.length===0 ? (
              <div style={{ padding:"32px", textAlign:"center", color:"rgba(255,255,255,.18)", fontSize:13 }}>No activity yet</div>
            ) : logs.slice(0,6).map((l:any,i:number) => {
              const actionStr = String(l.action||"");
              const isInvoice = actionStr.includes("INVOICE");
              const isLogin   = actionStr.includes("LOGIN");
              const isPlan    = actionStr.includes("PLAN");
              const iconColor = isLogin?"#818cf8":isInvoice?"#34d399":isPlan?"#fbbf24":"#38bdf8";
              const iconBg    = isLogin?"rgba(129,140,248,.1)":isInvoice?"rgba(52,211,153,.1)":isPlan?"rgba(251,191,36,.1)":"rgba(56,189,248,.1)";
              return (
                <div key={l.id||i} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 12px", borderRadius:10, transition:"background .12s", cursor:"default" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.03)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <div style={{ width:32, height:32, borderRadius:9, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round">
                      {isLogin?<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></>
                       :isInvoice?<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>
                       :isPlan?<><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>
                       :<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                    </svg>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, color:"rgba(255,255,255,.75)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {actionStr.replace(/_/g," ").toLowerCase().replace(/^\w/,c=>c.toUpperCase())}
                    </div>
                    <div style={{ fontSize:10.5, color:"rgba(255,255,255,.25)", marginTop:2 }}>
                      {l.userId ? l.userId.slice(0,8)+"…" : "System"}{l.companyId ? " · "+l.companyId.slice(0,8)+"…" : ""}
                    </div>
                  </div>
                  <span style={{ fontSize:10.5, color:"rgba(255,255,255,.2)", flexShrink:0, whiteSpace:"nowrap" }}>
                    {l.createdAt ? timeAgo(l.createdAt) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Status */}
        <div style={{ borderRadius:16, background:"#0d1226", border:"1px solid rgba(255,255,255,.07)", padding:"20px 22px", display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"white" }}>System Status</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2 }}>Infrastructure health</div>
            </div>
            <button onClick={()=>setPage("system")}
              style={{ fontSize:11, color:"#34d399", background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.18)", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(52,211,153,.15)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(52,211,153,.08)")}>
              Details
            </button>
          </div>

          {/* Status items */}
          {([
            { label:"API Errors (24h)", value:health?.apiErrors24h??null,     good:(v:number)=>v<10  },
            { label:"Failed Logins",    value:health?.failedLogins24h??null,  good:(v:number)=>v<20  },
            { label:"Queue Failures",   value:health?.queueFailures24h??null, good:(v:number)=>v===0 },
            { label:"Uptime",           value:health?.uptime??null,           good:()=>true          },
          ] as any[]).map((s:any) => {
            const isGood = s.value !== null ? s.good(s.value) : true;
            return (
              <div key={s.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:11, background:"rgba(255,255,255,.025)", border:`1px solid ${isGood?"rgba(255,255,255,.06)":"rgba(248,113,113,.18)"}` }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:isGood?"#34d399":"#f87171", flexShrink:0, boxShadow:isGood?"0 0 6px rgba(52,211,153,.5)":"0 0 6px rgba(248,113,113,.5)" }}/>
                <span style={{ fontSize:12, color:"rgba(255,255,255,.45)", flex:1 }}>{s.label}</span>
                <span style={{ fontSize:14, fontWeight:800, color:isGood?"rgba(255,255,255,.8)":"#f87171", letterSpacing:"-0.02em" }}>
                  {s.value !== null ? s.value : "—"}
                </span>
              </div>
            );
          })}

          {/* Overall banner */}
          <div style={{ marginTop:"auto", padding:"12px 14px", borderRadius:11, background:"rgba(52,211,153,.05)", border:"1px solid rgba(52,211,153,.14)", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", boxShadow:"0 0 6px #34d399", animation:"pulse 2.5s ease infinite", flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:"#34d399" }}>All systems operational</div>
              {health?.lastBackupAt && <div style={{ fontSize:10.5, color:"rgba(52,211,153,.5)", marginTop:2 }}>Last backup {timeAgo(health.lastBackupAt)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════
   PAGE: COMPANIES & USERS (combined)
═══════════════════════════════════════════════════════ */
function PageCompaniesUsers() {
  const [tab, setTab] = useState<"companies"|"users">("companies");

  // ── Companies state ──
  const [cq,       setCq]       = useState("");
  const [planF,    setPlanF]    = useState("all");
  const [bizTypeF, setBizTypeF] = useState("all");
  const [rows,     setRows]     = useState<any[]|null>(null);
  const [busy,     setBusy]     = useState<string|null>(null);

  // ── Company detail modal ──
  const [detail,       setDetail]       = useState<any|null>(null);
  const [detailLoading,setDetailLoading]= useState(false);

  // ── Users state ──
  const [uq,          setUq]          = useState("");
  const [roleF,       setRoleF]       = useState("all");
  const [users,       setUsers]       = useState<any[]|null>(null);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState("USER");
  const [inviteMsg,    setInviteMsg]    = useState<{text:string;ok:boolean}|null>(null);
  const [inviteBusy,   setInviteBusy]  = useState(false);
  const [managingUser, setManagingUser] = useState<any|null>(null);
  const [orphanCount,  setOrphanCount] = useState(0);
  const [cleanBusy,    setCleanBusy]   = useState(false);
  const [cleanMsg,     setCleanMsg]    = useState<{text:string;ok:boolean}|null>(null);

  function loadUsers(h: Record<string,string>) {
    fetch("/api/admin/users/all", { headers: h })
      .then(r=>r.json()).then(d=>setUsers(d.rows||[])).catch(()=>setUsers([]));
    fetch("/api/admin/users/cleanup", { headers: h })
      .then(r=>r.json()).then(d=>setOrphanCount(d.orphanCount||0)).catch(()=>{});
  }

  useEffect(() => {
    const h = adminHeaders();
    fetch("/api/admin/companies/all", { headers: h })
      .then(r=>r.json()).then(d=>setRows(d.rows||[])).catch(()=>setRows([]));
    loadUsers(h);
  }, []);

  async function cleanOrphans() {
    if (!await confirmToast(`Delete ${orphanCount} orphan users (no company)? This cannot be undone.`)) return;
    setCleanBusy(true); setCleanMsg(null);
    try {
      const r = await fetch("/api/admin/users/cleanup", { method:"POST", headers: adminHeaders() });
      const d = await r.json();
      if (r.ok) {
        setCleanMsg({ text:`✓ Deleted ${d.deleted} orphan users`, ok:true });
        setOrphanCount(0);
        loadUsers(adminHeaders());
      } else {
        setCleanMsg({ text: d.error||"Failed", ok:false });
      }
    } catch { setCleanMsg({ text:"Network error", ok:false }); }
    setCleanBusy(false);
    setTimeout(()=>setCleanMsg(null), 4000);
  }

  function adminHeaders(): Record<string,string> {
    try {
      const u = getAdminUser();
      const h: Record<string,string> = {};
      if (u?.id)   h["x-user-id"]   = u.id;
      if (u?.role) h["x-user-role"] = u.role;
      return h;
    } catch { return {}; }
  }

  async function openDetail(id: string) {
    setDetail({ loading: true, id });
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/admin/companies/${id}`, { headers: adminHeaders() });
      const d = await r.json();
      setDetail(d);
    } catch {
      setDetail(null);
    }
    setDetailLoading(false);
  }

  function goDashboard(id: string, name: string) {
    updateStoredUser((parsed) => {
      if (parsed?.user) {
        return { ...parsed, user: { ...parsed.user, companyId: id, companyName: name } };
      }
      return { ...parsed, companyId: id, companyName: name };
    });
    window.location.href = "/dashboard";
  }

  async function deleteCompany(id: string) {
    if (!await confirmToast("Permanently delete this company and ALL its data? This cannot be undone.")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/admin/companies/actions", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ companyId:id, action:"DELETE" }),
      });
      if (r.ok) { setRows(prev=>prev?prev.filter(row=>row.id!==id):[]); if (detail?.company?.id===id) setDetail(null); alertToast("Deleted."); }
      else { const j=await r.json(); alertToast(j.error||"Failed"); }
    } catch { alertToast("Something went wrong"); }
    finally { setBusy(null); }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteBusy(true);
    try {
      const h = adminHeaders();
      h["Content-Type"] = "application/json";
      const r = await fetch("/api/invitations", {
        method: "POST", headers: h,
        body: JSON.stringify({ email: inviteEmail, inviteRole }),
      });
      const d = await r.json();
      if (r.ok) {
        setInviteMsg({ text:"Invite sent to "+inviteEmail, ok:true });
        setInviteEmail(""); setInviteRole("USER");
      } else {
        setInviteMsg({ text: d.error||"Failed to send invite", ok:false });
      }
    } catch {
      setInviteMsg({ text:"Something went wrong", ok:false });
    }
    setInviteBusy(false);
    setTimeout(()=>setInviteMsg(null), 4000);
  }

  async function manageUser(userId: string) {
    const h = adminHeaders();
    const r = await fetch(`/api/admin/users/${userId}`, { headers: h }).catch(()=>null);
    if (r?.ok) { const d = await r.json(); setManagingUser(d.user); }
  }

  async function updateUserRole(userId: string, newRole: string, active: boolean) {
    const h = { ...adminHeaders(), "Content-Type":"application/json" };
    const r = await fetch(`/api/admin/users/${userId}`, { method:"PATCH", headers:h, body:JSON.stringify({ role:newRole, active }) }).catch(()=>null);
    if (r?.ok) {
      setUsers(prev => prev ? prev.map(u => u.id===userId ? {...u, role:newRole, active} : u) : prev);
      setManagingUser((u: any) => u ? { ...u, role:newRole, active } : u);
    }
  }

  const BIZ_LABEL_MAP: Record<string,string> = {
    trading:"Trading",wholesale:"Wholesale",distribution:"Distribution",
    restaurant:"Restaurant",retail:"Retail",manufacturing:"Manufacturing",
    hospital:"Hospital",school:"School",hotel:"Hotel",construction:"Construction",
    pharmacy:"Pharmacy",transport:"Transport",real_estate:"Real Estate",
    import_company:"Import/Export",service:"Service",ngo:"NGO",
    it:"IT / Software",law_firm:"Law Firm",salon:"Salon",gym:"Gym",
    ecommerce:"E-commerce",agriculture:"Agriculture",
  };
  const BIZ_TYPE_LIST = Object.keys(BIZ_LABEL_MAP);

  const filteredCompanies = (rows||[]).filter((c:any) => {
    const q = cq.toLowerCase();
    const bizLabel = BIZ_LABEL_MAP[c.businessType||""] || c.businessType || "";
    const matchQ =
      String(c.name||"").toLowerCase().includes(q) ||
      String(c.country||"").toLowerCase().includes(q) ||
      String(c.ownerEmail||"").toLowerCase().includes(q) ||
      String(c.businessType||"").toLowerCase().includes(q) ||
      bizLabel.toLowerCase().includes(q);
    const matchPlan    = planF==="all"    || String(c.plan||"").toLowerCase()===planF;
    const matchBizType = bizTypeF==="all" || String(c.businessType||"")=== bizTypeF;
    return matchQ && matchPlan && matchBizType;
  });

  const filteredUsers = (users||[]).filter((u:any) =>
    (roleF==="all" || String(u.role||"").toLowerCase()===roleF.toLowerCase()) &&
    (String(u.name||"").toLowerCase().includes(uq.toLowerCase()) ||
     String(u.email||"").toLowerCase().includes(uq.toLowerCase()))
  );

  const tabBtn = (t: "companies"|"users", label: string, icon: string, count: number|null) => {
    const active = tab === t;
    return (
      <button onClick={()=>setTab(t)} style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"10px 22px", borderRadius:10, cursor:"pointer", fontFamily:"inherit",
        fontSize:13, fontWeight:700, transition:"all .18s",
        border: active ? "1px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.08)",
        background: active ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
        color: active ? "#a5b4fc" : "rgba(255,255,255,.4)",
        boxShadow: active ? "0 0 14px rgba(99,102,241,.15)" : "none",
      }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        {label}
        {count !== null && (
          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11,
            background: active ? "rgba(99,102,241,.3)" : "rgba(255,255,255,.08)",
            color: active ? "#c7d2fe" : "rgba(255,255,255,.35)" }}>
            {count}
          </span>
        )}
      </button>
    );
  };

  /* ── Company Detail Modal ── */
  const ROLE_COLORS: Record<string,string> = { ADMIN:"#f87171", MANAGER:"#fbbf24", ACCOUNTANT:"#34d399", USER:"#818cf8" };

  function CompanyDetailModal() {
    if (!detail) return null;
    const c = detail.company || {};
    const roleCounts: Record<string,number> = detail.roleCounts || {};
    const users: any[] = detail.users || [];
    const isLoading = detail.loading;

    // Owner = first ADMIN user or first user
    const ownerUser = users.find((u:any) => u.role?.toUpperCase()==="ADMIN") || users[0] || null;

    const [showPass, setShowPass] = useState(false);
    const [copied,   setCopied]   = useState<string|null>(null);
    function copyText(text: string, key: string) {
      navigator.clipboard.writeText(text).then(()=>{ setCopied(key); setTimeout(()=>setCopied(null),1500); });
    }

    const [newPlan, setNewPlan] = useState(String(c.plan||"STARTER").toUpperCase());
    const [newStatus, setNewStatus] = useState(String(c.subscriptionStatus||"ACTIVE").toUpperCase());
    const [planNote, setPlanNote] = useState("");
    const [planSaving, setPlanSaving] = useState(false);
    const [planMsg, setPlanMsg] = useState<{text:string;ok:boolean}|null>(null);

    async function changePlan() {
      setPlanSaving(true); setPlanMsg(null);
      try {
        const r = await fetch("/api/admin/companies/change-plan", {
          method:"POST", headers:{"Content-Type":"application/json",...adminHeaders()},
          body: JSON.stringify({ companyId:c.id, plan:newPlan, subscriptionStatus:newStatus, note:planNote }),
        });
        const d = await r.json();
        if (r.ok) {
          setDetail((prev:any) => prev ? { ...prev, company:{ ...prev.company, plan:newPlan, subscriptionStatus:newStatus } } : prev);
          setRows((prev:any) => prev ? prev.map((row:any) => row.id===c.id ? {...row, plan:newPlan, subscriptionStatus:newStatus} : row) : prev);
          setPlanMsg({ text:"Plan updated successfully", ok:true });
          setPlanNote("");
        } else { setPlanMsg({ text:d.error||"Failed", ok:false }); }
      } catch { setPlanMsg({ text:"Network error", ok:false }); }
      setPlanSaving(false);
      setTimeout(()=>setPlanMsg(null),3000);
    }

    // User limit
    const PLAN_LIMITS: Record<string,number|null> = { STARTER:5, PRO:20, ENTERPRISE:null, CUSTOM:null };
    const maxU = PLAN_LIMITS[String(c.plan||"STARTER").toUpperCase()] ?? null;
    const usedU = detail.totalUsers || 0;

    return (
      <div style={{ position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.75)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}
        onClick={e=>{if(e.target===e.currentTarget)setDetail(null);}}>
        <div style={{ width:"100%",maxWidth:780,background:"#0e1120",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"32px 36px",position:"relative",boxShadow:"0 40px 100px rgba(0,0,0,.7)",maxHeight:"88vh",overflowY:"auto" }}>
          {/* Close */}
          <button onClick={()=>setDetail(null)} style={{ position:"absolute",top:18,right:20,background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:22,lineHeight:1,fontFamily:"inherit" }}>✕</button>

          {isLoading ? (
            <div style={{ textAlign:"center",padding:"60px 0",color:"rgba(255,255,255,.3)",fontSize:14 }}>Loading company details…</div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display:"flex",alignItems:"flex-start",gap:16,marginBottom:28 }}>
                <div style={{ width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🏢</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:20,fontWeight:800,color:"white",marginBottom:4 }}>{c.name || "—"}</div>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
                    <Badge status={c.plan}/>
                    <Badge status={c.subscriptionStatus}/>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,.3)" }}>{c.country}</span>
                  </div>
                </div>
                <button onClick={()=>goDashboard(c.id,c.name)}
                  style={{ padding:"8px 18px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",color:"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",boxShadow:"0 4px 14px rgba(99,102,241,.3)" }}>
                  Open Dashboard →
                </button>
              </div>

              {/* Stats row */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:24 }}>
                {[
                  { label:"Total Users",   value:detail.totalUsers||0,          color:"#818cf8" },
                  { label:"Admins",        value:roleCounts.ADMIN||0,            color:"#f87171" },
                  { label:"Managers",      value:roleCounts.MANAGER||0,          color:"#fbbf24" },
                  { label:"Accountants",   value:roleCounts.ACCOUNTANT||0,       color:"#34d399" },
                  { label:"Regular Users", value:roleCounts.USER||0,             color:"#94a3b8" },
                  { label:"Plan",          value:c.plan||"—",                    color:"#a5b4fc" },
                ].map(s=>(
                  <div key={s.label} style={{ padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",position:"relative",overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${s.color},transparent)` }}/>
                    <div style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Company info + subscription */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
                <div style={{ padding:"16px",borderRadius:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize:11,fontWeight:800,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:12 }}>Company Info</div>
                  {[
                    { k:"Business Type", v: c.businessType ? c.businessType.replace(/_/g," ").replace(/\b\w/g,(l:string)=>l.toUpperCase()) : "—" },
                    { k:"Country",  v: c.country||"—" },
                    { k:"Currency", v: c.baseCurrency||"—" },
                    { k:"Setup Done", v: c.businessSetupDone ? "✅ Yes" : "⏳ Pending" },
                    { k:"Joined",   v: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—" },
                    { k:"Renews",   v: c.currentPeriodEnd ? new Date(c.currentPeriodEnd).toLocaleDateString() : "—" },
                  ].map(row=>(
                    <div key={row.k} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ fontSize:11.5,color:"rgba(255,255,255,.35)",fontWeight:600 }}>{row.k}</span>
                      <span style={{ fontSize:12,color:"rgba(255,255,255,.75)",fontWeight:700 }}>{row.v}</span>
                    </div>
                  ))}
                  {c.stripeCustomerId && (
                    <div style={{ marginTop:8,fontSize:10,color:"rgba(255,255,255,.2)",fontFamily:"monospace",wordBreak:"break-all" }}>{c.stripeCustomerId}</div>
                  )}
                </div>
                {/* User Limit */}
                <div style={{ padding:"16px",borderRadius:12,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize:11,fontWeight:800,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:12 }}>User Limit</div>
                  <div style={{ fontSize:22,fontWeight:900,color:"#818cf8",marginBottom:8 }}>
                    {usedU} <span style={{ fontSize:14,color:"rgba(255,255,255,.3)" }}>/ {maxU===null?"∞":maxU}</span>
                  </div>
                  {maxU !== null && (
                    <div style={{ height:7,borderRadius:10,background:"rgba(255,255,255,.06)",overflow:"hidden",marginBottom:8 }}>
                      <div style={{ height:"100%",borderRadius:10,background: usedU>=maxU?"linear-gradient(90deg,#f87171,#ef4444)":"linear-gradient(90deg,#6366f1,#818cf8)",width:`${Math.min(100,(usedU/maxU)*100)}%`,transition:"width .3s" }}/>
                    </div>
                  )}
                  <div style={{ fontSize:11,color: maxU!==null&&usedU>=maxU?"#f87171":"rgba(255,255,255,.3)" }}>
                    {maxU===null ? "Unlimited users" : usedU>=maxU ? "Limit reached" : `${maxU-usedU} slots remaining`}
                  </div>
                  {c.activeModules && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:10,color:"rgba(255,255,255,.3)",fontWeight:700,marginBottom:5 }}>ACTIVE MODULES</div>
                      <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                        {c.activeModules.split(",").filter(Boolean).map((m:string)=>(
                          <span key={m} style={{ padding:"2px 8px",borderRadius:12,background:"rgba(251,191,36,.1)",border:"1px solid rgba(251,191,36,.2)",fontSize:10,color:"#fbbf24",fontWeight:600 }}>{m.trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Account */}
              {ownerUser && (
                <div style={{ padding:"16px 18px",borderRadius:12,background:"rgba(56,189,248,.05)",border:"1px solid rgba(56,189,248,.15)",marginBottom:16 }}>
                  <div style={{ fontSize:11,fontWeight:800,color:"rgba(56,189,248,.7)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:12 }}>Owner Account</div>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0" }}>
                    <div>
                      <div style={{ fontSize:10,fontWeight:700,color:"rgba(255,255,255,.3)",marginBottom:2 }}>EMAIL</div>
                      <div style={{ fontSize:13,fontWeight:600,color:"#38bdf8",fontFamily:"monospace" }}>{ownerUser.email||""}</div>
                    </div>
                    {ownerUser.email && (
                      <button onClick={()=>copyText(ownerUser.email,"email")}
                        style={{ padding:"5px 12px",borderRadius:7,background:copied==="email"?"rgba(34,197,94,.12)":"rgba(56,189,248,.1)",border:`1px solid ${copied==="email"?"rgba(34,197,94,.3)":"rgba(56,189,248,.25)"}`,color:copied==="email"?"#22c55e":"#38bdf8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                        {copied==="email"?"Copied":"Copy"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Plan Management */}
              <div style={{ padding:"18px",borderRadius:12,background:"rgba(99,102,241,.07)",border:"1px solid rgba(99,102,241,.2)",marginBottom:20 }}>
                <div style={{ fontSize:11,fontWeight:800,color:"rgba(99,102,241,.7)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:14 }}>Plan Management</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                  <div>
                    <label style={{ fontSize:10.5,color:"rgba(255,255,255,.35)",fontWeight:700,display:"block",marginBottom:5 }}>Plan</label>
                    <select value={newPlan} onChange={e=>setNewPlan(e.target.value)}
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none" }}>
                      {["STARTER","PRO","ENTERPRISE","CUSTOM"].map(p=><option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10.5,color:"rgba(255,255,255,.35)",fontWeight:700,display:"block",marginBottom:5 }}>Status</label>
                    <select value={newStatus} onChange={e=>setNewStatus(e.target.value)}
                      style={{ width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none" }}>
                      {["ACTIVE","TRIALING","PAST_DUE","CANCELED","INACTIVE"].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <input value={planNote} onChange={e=>setPlanNote(e.target.value)} placeholder="Optional note (reason for change)…"
                  style={{ width:"100%",padding:"8px 12px",borderRadius:8,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:12,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:10 }}/>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <button onClick={changePlan} disabled={planSaving}
                    style={{ padding:"8px 20px",borderRadius:9,background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",color:"white",fontWeight:700,fontSize:12,cursor:planSaving?"not-allowed":"pointer",fontFamily:"inherit",opacity:planSaving?.7:1 }}>
                    {planSaving?"Saving…":"Apply Changes"}
                  </button>
                  {planMsg && <span style={{ fontSize:12,fontWeight:600,color:planMsg.ok?"#34d399":"#f87171" }}>{planMsg.ok?"✓":"✕"} {planMsg.text}</span>}
                </div>
              </div>

              {/* Users list */}
              {users.length > 0 && (
                <div>
                  <div style={{ fontSize:11,fontWeight:800,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:10 }}>
                    Users ({users.length})
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto" }}>
                    {users.map((u:any)=>(
                      <div key={u.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.05)" }}>
                        <div style={{ width:30,height:30,borderRadius:8,background:`${ROLE_COLORS[u.role]||"#818cf8"}22`,border:`1px solid ${ROLE_COLORS[u.role]||"#818cf8"}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:ROLE_COLORS[u.role]||"#818cf8",flexShrink:0 }}>
                          {(u.name||"?").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:700,color:"white",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.name}</div>
                          <div style={{ fontSize:11,color:"rgba(255,255,255,.35)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.email}</div>
                        </div>
                        <Badge status={u.role}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {detail.recentActivity?.length > 0 && (
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:11,fontWeight:800,color:"rgba(255,255,255,.35)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:10 }}>Recent Activity</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                    {detail.recentActivity.slice(0,5).map((a:any,i:number)=>(
                      <div key={i} style={{ display:"flex",gap:10,alignItems:"center",fontSize:12,color:"rgba(255,255,255,.5)",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                        <span style={{ color:"#818cf8",fontWeight:700,fontFamily:"monospace" }}>{a.action}</span>
                        <span style={{ marginLeft:"auto",flexShrink:0 }}>{a.createdAt?timeAgo(a.createdAt):"—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Company detail modal */}
      {detail && <CompanyDetailModal/>}

      {/* User manage modal */}
      {managingUser && (
        <div style={{ position:"fixed",inset:0,zIndex:9000,background:"rgba(0,0,0,.75)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}
          onClick={e=>{if(e.target===e.currentTarget)setManagingUser(null);}}>
          <div style={{ width:"100%",maxWidth:480,background:"#0e1120",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:"32px 36px",position:"relative",boxShadow:"0 40px 100px rgba(0,0,0,.7)" }}>
            <button onClick={()=>setManagingUser(null)} style={{ position:"absolute",top:18,right:20,background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:22,lineHeight:1 }}>✕</button>

            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:24 }}>
              <div style={{ width:48,height:48,borderRadius:13,background:"linear-gradient(135deg,#4f46e5,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:"white" }}>
                {(managingUser.name||"?").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:17,fontWeight:800,color:"white" }}>{managingUser.name}</div>
                <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginTop:2 }}>{managingUser.email}</div>
              </div>
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              {/* Status */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)" }}>
                <div>
                  <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:2 }}>Account Status</div>
                  <div style={{ fontSize:13,fontWeight:700,color:managingUser.active!==false?"#34d399":"#f87171" }}>{managingUser.active!==false?"Active":"Deactivated"}</div>
                </div>
                <button onClick={()=>updateUserRole(managingUser.id,managingUser.role,!(managingUser.active!==false))}
                  style={{ padding:"7px 16px",borderRadius:9,background:managingUser.active!==false?"rgba(248,113,113,.12)":"rgba(52,211,153,.12)",border:`1px solid ${managingUser.active!==false?"rgba(248,113,113,.3)":"rgba(52,211,153,.3)"}`,color:managingUser.active!==false?"#f87171":"#34d399",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                  {managingUser.active!==false?"Deactivate":"Activate"}
                </button>
              </div>

              {/* Role change */}
              <div style={{ padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:10 }}>Change Role</div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  {["ADMIN","MANAGER","ACCOUNTANT","USER","VIEWER"].map(r=>(
                    <button key={r} onClick={()=>updateUserRole(managingUser.id,r,managingUser.active!==false)}
                      style={{ padding:"7px 14px",borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:`1px solid ${managingUser.role===r?"rgba(99,102,241,.5)":"rgba(255,255,255,.08)"}`,background:managingUser.role===r?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)",color:managingUser.role===r?"#a5b4fc":"rgba(255,255,255,.45)" }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Companies */}
              {managingUser.companies?.length > 0 && (
                <div style={{ padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,.5)",marginBottom:8 }}>Companies ({managingUser.companies.length})</div>
                  {managingUser.companies.map((uc: any)=>(
                    <div key={uc.company?.id} style={{ fontSize:13,color:"rgba(255,255,255,.6)",display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ fontWeight:600 }}>{uc.company?.name}</span>
                      <Badge status={uc.company?.plan}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
        {tabBtn("companies", "Companies", "🏢", rows ? rows.length : null)}
        {tabBtn("users",     "Users",     "👥", users ? users.length : null)}
        <div style={{ marginLeft:"auto", fontSize:12, color:"rgba(255,255,255,.25)", fontStyle:"italic" }}>
          Companies = tenants · Users = individual accounts
        </div>
      </div>

      {/* ── COMPANIES TAB ── */}
      {tab === "companies" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <div style={{ position:"relative", flex:1, minWidth:200 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"
                style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={cq} onChange={e=>setCq(e.target.value)} placeholder="Search companies…"
                style={{ width:"100%",padding:"9px 12px 9px 34px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="rgba(129,140,248,.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
              />
            </div>
            {["all","starter","pro","enterprise"].map(p=>(
              <button key={p} onClick={()=>setPlanF(p)} style={{ padding:"9px 16px",borderRadius:10,border:`1px solid ${planF===p?"rgba(99,102,241,.5)":"rgba(255,255,255,.08)"}`,background:planF===p?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)",color:planF===p?"#a5b4fc":"rgba(255,255,255,.4)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize" }}>
                {p}
              </button>
            ))}
            <select value={bizTypeF} onChange={e=>setBizTypeF(e.target.value)}
              style={{ padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"#94a3b8",fontSize:12,outline:"none",cursor:"pointer",fontFamily:"inherit" }}>
              <option value="all">All Business Types</option>
              {BIZ_TYPE_LIST.map(t=><option key={t} value={t}>{BIZ_LABEL_MAP[t]}</option>)}
            </select>
          </div>

          <SectionCard title={`Companies (${filteredCompanies.length})`} accent="#38bdf8">
            <DataTable
              rows={rows===null ? null : filteredCompanies}
              cols={[
                { key:"name", label:"Company", render:(v,r)=>(
                  <div>
                    <div style={{ fontWeight:700,color:"white",fontSize:13 }}>{v}</div>
                    {r.country && <div style={{ fontSize:10,color:"rgba(255,255,255,.25)",marginTop:1 }}>{r.country}</div>}
                  </div>
                )},
                { key:"ownerEmail", label:"Owner Email", render:(v)=>( 
                  <div style={{ minWidth:200 }}>
                    {v ? <span style={{ fontSize:12,color:"rgba(255,255,255,.7)",fontFamily:"monospace" }}>{v}</span> : <span style={{ color:"rgba(255,255,255,.2)",fontSize:12 }}></span>}
                  </div>
                )},
                { key:"businessType", label:"Business Type", render:v=>(
                  <span style={{ padding:"2px 9px",borderRadius:20,background:"rgba(56,189,248,.1)",border:"1px solid rgba(56,189,248,.18)",color:"#7dd3fc",fontSize:11,fontWeight:700,whiteSpace:"nowrap" }}>
                    {BIZ_LABEL_MAP[v||""]||v||"—"}
                  </span>
                )},
                { key:"plan",    label:"Plan",    render:v=><Badge status={v}/> },
                { key:"subscriptionStatus", label:"Status", render:v=><Badge status={v}/> },
                { key:"aiScore", label:"AI Health", render:(v,r)=>{
                  if(v==null) return <span style={{color:"rgba(255,255,255,.2)",fontSize:12}}>—</span>;
                  const color = v>=75?"#10b981":v>=50?"#f59e0b":"#ef4444";
                  const label = r.aiHealth||(v>=75?"Healthy":v>=50?"At Risk":"Critical");
                  return (
                    <span style={{ display:"inline-flex",alignItems:"center",gap:5 }}>
                      <svg width="26" height="26" viewBox="0 0 28 28">
                        <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3"/>
                        <circle cx="14" cy="14" r="11" fill="none" stroke={color} strokeWidth="3"
                          strokeDasharray={`${(v/100)*69.1} 69.1`} strokeLinecap="round" transform="rotate(-90 14 14)"/>
                      </svg>
                      <span style={{fontSize:12,fontWeight:800,color}}>{v}</span>
                      <span style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>{label}</span>
                    </span>
                  );
                }},
                { key:"usersCount", label:"Users",    align:"right", render:v=><span style={{ fontWeight:700,color:"#818cf8" }}>{v}</span> },
                { key:"lastLogin",  label:"Last Active", render:v=>v?timeAgo(v):"—" },
                { key:"id", label:"", render:(id,r)=>(
                  <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                    <button onClick={()=>openDetail(id)}
                      style={{ padding:"5px 12px",borderRadius:7,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#a5b4fc",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                      View →
                    </button>
                    <button onClick={()=>deleteCompany(id)} disabled={busy===id}
                      style={{ padding:"5px 12px",borderRadius:7,background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:busy===id?0.5:1 }}>
                      {busy===id?"...":"Delete"}
                    </button>
                  </div>
                )},
              ]}
            />
          </SectionCard>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Invite */}
          <SectionCard title="Invite User" accent="#818cf8">
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="email@company.com"
                style={{ flex:2,minWidth:200,padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none" }}
                onFocus={e=>e.target.style.borderColor="rgba(129,140,248,.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
              />
              <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}
                style={{ padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none",cursor:"pointer" }}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="USER">User</option>
              </select>
              <button onClick={sendInvite} disabled={inviteBusy||!inviteEmail.trim()}
                style={{ padding:"9px 22px",borderRadius:10,background:"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",color:"white",fontSize:13,fontWeight:700,cursor:inviteBusy?"default":"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(99,102,241,.35)",opacity:inviteBusy||!inviteEmail.trim()?.7:1 }}>
                {inviteBusy?"Sending…":"Send Invite"}
              </button>
              {inviteMsg && <span style={{ alignSelf:"center",fontSize:12,color:inviteMsg.ok?"#34d399":"#f87171",fontWeight:600 }}>{inviteMsg.ok?"✓":"✕"} {inviteMsg.text}</span>}
            </div>
          </SectionCard>

          {/* Orphan cleanup banner */}
          {orphanCount > 0 && (
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)" }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#f87171" }}>{orphanCount} orphan {orphanCount===1?"user":"users"} found</div>
                <div style={{ fontSize:11,color:"rgba(255,255,255,.4)" }}>Inki company delete ho chuki hai — yeh users kisi company se linked nahi hain</div>
              </div>
              {cleanMsg && <span style={{ fontSize:12,fontWeight:600,color:cleanMsg.ok?"#34d399":"#f87171" }}>{cleanMsg.text}</span>}
              <button onClick={cleanOrphans} disabled={cleanBusy}
                style={{ padding:"8px 18px",borderRadius:9,background:"rgba(248,113,113,.2)",border:"1px solid rgba(248,113,113,.4)",color:"#f87171",fontSize:12,fontWeight:700,cursor:cleanBusy?"not-allowed":"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>
                {cleanBusy ? "Deleting…" : `️ Delete ${orphanCount} Orphans`}
              </button>
            </div>
          )}
          {cleanMsg && orphanCount===0 && (
            <div style={{ padding:"10px 16px",borderRadius:10,background:"rgba(52,211,153,.1)",border:"1px solid rgba(52,211,153,.25)",color:"#34d399",fontSize:13,fontWeight:600 }}>
              {cleanMsg.text}
            </div>
          )}

          {/* Filters */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <div style={{ position:"relative", flex:1, minWidth:200 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2"
                style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={uq} onChange={e=>setUq(e.target.value)} placeholder="Search users…"
                style={{ width:"100%",padding:"9px 12px 9px 34px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="rgba(129,140,248,.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
              />
            </div>
            {["all","admin","manager","accountant","user"].map(r=>(
              <button key={r} onClick={()=>setRoleF(r)} style={{ padding:"9px 16px",borderRadius:10,border:`1px solid ${roleF===r?"rgba(99,102,241,.5)":"rgba(255,255,255,.08)"}`,background:roleF===r?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)",color:roleF===r?"#a5b4fc":"rgba(255,255,255,.4)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize" }}>
                {r}
              </button>
            ))}
          </div>

          <SectionCard title={`Users (${filteredUsers.length})`} accent="#818cf8">
            <DataTable
              rows={users===null ? null : filteredUsers}
              cols={[
                { key:"name", label:"Name", render:(v,r)=>(
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#4f46e5,#818cf8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0 }}>
                      {v.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight:700,color:"white",fontSize:13 }}>{v}</div>
                      {(r.companyName||r.company)
                        ? <div style={{ fontSize:10.5,color:"rgba(255,255,255,.3)" }}>{r.companyName||r.company}</div>
                        : <div style={{ fontSize:10.5,color:"#f87171",fontWeight:600 }}>⚠ No Company</div>
                      }
                    </div>
                  </div>
                )},
                { key:"email",     label:"Email" },
                { key:"role",      label:"Role",       render:v=><Badge status={v}/> },
                { key:"lastLogin", label:"Last Login",  render:v=>v?timeAgo(v):"—" },
                { key:"id", label:"", render:(id)=>(
                  <button onClick={()=>manageUser(id)} style={{ padding:"5px 12px",borderRadius:7,background:"rgba(99,102,241,.15)",border:"1px solid rgba(99,102,241,.3)",color:"#a5b4fc",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
                    Manage
                  </button>
                )},
              ]}
            />
          </SectionCard>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: REVENUE
═══════════════════════════════════════════════════════ */
function PageRevenue() {
  const [metrics, setMetrics] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/web/metrics").then(r=>r.json()).then(setMetrics).catch(()=>{});
    fetch("/api/admin/web/revenue").then(r=>r.json()).then(setRevenue).catch(()=>{});
  }, []);

  const mrr  = metrics?.revenueThisMonth || 0;
  const arr  = mrr * 12;
  const planDist = [
    { label:"Starter",    value: revenue?.planDistribution?.starter    || 0, color:"#64748b" },
    { label:"Pro",        value: revenue?.planDistribution?.pro        || 0, color:"#6366f1" },
    { label:"Enterprise", value: revenue?.planDistribution?.enterprise || 0, color:"#818cf8" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14 }}>
        <KPICard label="MRR"         value={fmt(mrr,"$")}                  icon="💰" color="#34d399" trend={12}/>
        <KPICard label="ARR"         value={fmt(arr,"$")}                  icon="📈" color="#818cf8" trend={12}/>
        <KPICard label="Active Paid" value={fmt(metrics?.activeSubs)}      icon=""  color="#6366f1" trend={metrics?.trends?.activeSubs}/>
        <KPICard label="Churn Rate"  value={Math.round((metrics?.churnThisMonth/Math.max(metrics?.totalCompanies||1,1))*100)+"%"} icon="📉" color="#f87171" trend={metrics?.trends?.churnThisMonth}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
        <SectionCard title="MRR Growth — Last 6 Months">
          <LineChart data={revenue?.mrrSeries||[]} height={120}/>
        </SectionCard>
        <SectionCard title="Plan Split">
          <BarChart data={planDist}/>
          <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8 }}>
            {planDist.map(d => (
              <div key={d.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:d.color }}/>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>{d.label}</span>
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:"white" }}>{d.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════════════════
   SHARED: REAL WORLD MAP (Leaflet.js)
   Used by PageGeo and PageVisitors
═══════════════════════════════════════════════════════ */
function GeoLeafletMap({ rows, title, colorScheme="indigo", liveCount=0 }: {
  rows: { country:string; countryName?:string; activeUsers30d?:number; companies?:number; topCity?:string; flag?:string }[];
  title: string;
  colorScheme?: "indigo" | "cyan";
  liveCount?: number;
}) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  const accent = colorScheme === "cyan" ? "#38bdf8" : "#818cf8";
  const accentRgb = colorScheme === "cyan" ? "56,189,248" : "129,140,248";

  // City name → exact lat/lon (used when topCity is available)
  const CITY_COORDS: Record<string,[number,number]> = {
    // Pakistan
    "Faisalabad":[31.418,73.079],"Lahore":[31.558,74.351],"Karachi":[24.861,67.010],
    "Islamabad":[33.738,73.084],"Rawalpindi":[33.598,73.042],"Multan":[30.196,71.475],
    "Peshawar":[34.008,71.579],"Quetta":[30.183,66.999],"Gujranwala":[32.161,74.188],
    "Sialkot":[32.499,74.536],"Hyderabad PK":[25.396,68.374],"Bahawalpur":[29.395,71.678],
    "Sargodha":[32.083,72.670],"Sukkur":[27.706,68.857],"Larkana":[27.559,68.225],
    "Sheikhupura":[31.713,73.988],"Rahim Yar Khan":[28.420,70.296],"Gujrat":[32.573,74.080],
    "Kasur":[31.117,74.453],"Mardan":[34.198,72.046],"Mingora":[34.773,72.360],
    // India
    "Mumbai":[19.076,72.877],"Delhi":[28.613,77.209],"Bangalore":[12.972,77.594],
    "Chennai":[13.083,80.270],"Hyderabad":[17.385,78.487],"Kolkata":[22.572,88.364],
    "Pune":[18.520,73.856],"Ahmedabad":[23.023,72.572],
    // UAE
    "Dubai":[25.204,55.270],"Abu Dhabi":[24.453,54.377],"Sharjah":[25.346,55.420],
    // UK
    "London":[51.507,-0.128],"Manchester":[53.480,-2.244],"Birmingham":[52.486,-1.890],
    // USA
    "New York":[40.713,-74.006],"Los Angeles":[34.052,-118.244],"Chicago":[41.878,-87.630],
    "Houston":[29.760,-95.370],"Phoenix":[33.449,-112.074],
    // Others
    "Dhaka":[23.810,90.412],"Riyadh":[24.688,46.722],"Doha":[25.286,51.533],
    "Istanbul":[41.015,28.980],"Cairo":[30.044,31.236],"Lagos":[6.455,3.384],
    "Nairobi":[-1.286,36.820],"Singapore":[1.352,103.820],"Kuala Lumpur":[3.140,101.686],
    "Jakarta":[-6.215,106.845],"Manila":[14.599,120.985],"Bangkok":[13.756,100.502],
    "Tokyo":[35.689,139.692],"Beijing":[39.905,116.407],"Shanghai":[31.228,121.474],
    "Seoul":[37.566,126.978],"Sydney":[-33.868,151.209],"Melbourne":[-37.814,144.963],
    "Toronto":[43.651,-79.383],"Vancouver":[49.283,-123.121],"São Paulo":[-23.550,-46.633],
  };

  // Country ISO2 → lat/lon (approx center)
  const COUNTRY_CENTERS: Record<string,[number,number]> = {
    PK:[30.5,69.5],AE:[24,54],IN:[20.6,79],SA:[24,45],GB:[55,-3],
    US:[38,-97],BD:[23.7,90.4],QA:[25.3,51.2],TR:[39,35],NG:[9,8],
    EG:[26,30],KE:[-1,38],ZA:[-29,25],AU:[-25,134],SG:[1.35,103.8],
    MY:[4,109],ID:[-5,120],PH:[13,122],JP:[36,138],CN:[35,105],
    DE:[51.2,10.5],FR:[46.2,2.2],IT:[41.9,12.6],ES:[40.5,-3.7],NL:[52.1,5.3],
    CA:[56,-106],MX:[24,-102],BR:[-14,-51],AR:[-34,-64],CO:[4,-72],
    RU:[61,105],KZ:[48,68],IR:[32,53],IQ:[33,44],OM:[21,57],
    KW:[29.3,47.7],BH:[26,50.6],YE:[15,48],LK:[7.9,80.7],
    NP:[28,84],AF:[33,65],UZ:[41,64],AZ:[40.1,47.6],GE:[42,43.5],
    ZW:[-20,30],GH:[8,-1],ET:[9,39],TZ:[-6,35],UG:[1,32],
    MA:[32,-5],TN:[34,9],DZ:[28,3],LY:[27,17],SD:[15,30],
    CL:[-30,-71],PE:[-10,-76],VE:[8,-66],EC:[-2,-77.5],
    HK:[22.4,114],TW:[23.7,121],KR:[37,128],VN:[16,108],TH:[15,101],
    MM:[17,96],KH:[12.6,105],LA:[18,103],NZ:[-41,174],
    PL:[52,20],SE:[62,15],NO:[60,8],DK:[56,10],FI:[64,26],
    CH:[47,8],AT:[47.5,14],BE:[50.5,4],PT:[39.5,-8],GR:[39,22],
    CZ:[50,15.5],HU:[47,19],RO:[46,25],BG:[43,25],UA:[49,31],
    SK:[48.7,19.7],HR:[45.1,15.5],RS:[44,21],BA:[44,17],
    IL:[31.5,35],JO:[31,36],LB:[34,36],SY:[35,38],
  };

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    // Load Leaflet CSS
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!mapRef.current) return;

      // Init map
      const map = L.map(mapRef.current, {
        center: [20, 10],
        zoom: 2,
        minZoom: 1,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark tile layer — CartoDB Dark Matter (free, no API key)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = map;
      setReady(true);
    };
    document.head.appendChild(script);

    return () => {
      leafletRef.current?.remove();
      leafletRef.current = null;
    };
  }, []);

  // Add markers when map ready + rows change
  useEffect(() => {
    if (!ready || !leafletRef.current) return;
    const L = (window as any).L;
    const map = leafletRef.current;

    // Clear old markers
    map.eachLayer((layer: any) => {
      if (layer._isFinovaMarker) map.removeLayer(layer);
    });

    if (!rows.length) return;

    const maxVal = Math.max(...rows.map(r => r.activeUsers30d||0), 1);

    rows.forEach(row => {
      // Prefer city-level coords, fall back to country center
      const cityKey = (row.topCity || "").trim();
      const coords = (cityKey && CITY_COORDS[cityKey]) || COUNTRY_CENTERS[row.country];
      if (!coords) return;

      const val  = row.activeUsers30d || 0;
      const pct  = val / maxVal;
      const r    = Math.max(8, Math.min(40, 8 + pct * 32));
      const isTop = pct > 0.5;

      const pulseColor = isTop
        ? (colorScheme==="cyan" ? "#34d399" : "#34d399")
        : accent;

      // Custom circle marker with pulse
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:${r*2}px;height:${r*2}px;">
            <div style="
              position:absolute;inset:0;border-radius:50%;
              background:${pulseColor};opacity:0.25;
              animation:leaflet-pulse 2s ease infinite;
            "></div>
            <div style="
              position:absolute;top:50%;left:50%;
              transform:translate(-50%,-50%);
              width:${r}px;height:${r}px;border-radius:50%;
              background:${pulseColor};opacity:0.85;
              border:2px solid white;
              display:flex;align-items:center;justify-content:center;
              font-size:${Math.max(8,r*0.5)}px;font-weight:800;color:white;
              box-shadow:0 0 ${r}px ${pulseColor}55;
            ">${val>999?(val/1000).toFixed(1)+"k":val}</div>
          </div>`,
        iconSize:   [r*2, r*2],
        iconAnchor: [r, r],
      });

      const marker = L.marker(coords, { icon });
      marker._isFinovaMarker = true;

      // Tooltip
      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:160px;">
          <div style="font-size:15px;font-weight:800;color:#1e1b4b;margin-bottom:6px;">
            ${row.flag||"🌐"} ${row.countryName||row.country}
          </div>
          ${row.topCity ? `<div style="font-size:12px;color:#6366f1;margin-bottom:4px;">📍 ${row.topCity}</div>` : ""}
          <div style="font-size:12px;color:#374151;">👥 <b>${val.toLocaleString()}</b> active users</div>
          <div style="font-size:12px;color:#374151;margin-top:2px;">⬡ <b>${row.companies||0}</b> companies</div>
        </div>
      `, { maxWidth: 220 });

      marker.addTo(map);
    });

    // Add CSS for pulse animation once
    if (!document.getElementById("finova-leaflet-pulse")) {
      const style = document.createElement("style");
      style.id = "finova-leaflet-pulse";
      style.textContent = `
        @keyframes leaflet-pulse {
          0%   { transform: scale(1);   opacity: 0.25; }
          50%  { transform: scale(1.6); opacity: 0.1; }
          100% { transform: scale(1);   opacity: 0.25; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,.25) !important;
        }
        .leaflet-popup-tip { display:none; }
        .leaflet-control-zoom a {
          background: rgba(8,12,30,.9) !important;
          color: white !important;
          border-color: rgba(255,255,255,.1) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, [ready, rows]);

  return (
    <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase" }}>{title}</span>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {liveCount>0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:7,height:7,borderRadius:"50%",background:"#f87171",animation:"blink 1.5s ease infinite" }}/>
              <span style={{ fontSize:11,color:"#f87171",fontWeight:700 }}>{liveCount} live</span>
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:7,height:7,borderRadius:"50%",background:"#34d399",animation:"blink 2s ease infinite" }}/>
            <span style={{ fontSize:11,color:"#34d399",fontWeight:600 }}>Live</span>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div style={{ position:"relative" }}>
        <div ref={mapRef} style={{ height:420, width:"100%", background:"#060810" }}/>
        {!ready && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#060810", color:"rgba(255,255,255,.2)", fontSize:12 }}>
            Loading map...
          </div>
        )}
        {/* Legend */}
        <div style={{ position:"absolute", bottom:12, left:12, zIndex:1000, display:"flex", gap:12, background:"rgba(6,8,30,.85)", borderRadius:10, padding:"8px 12px", border:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:10,height:10,borderRadius:"50%",background:"#34d399",border:"1.5px solid white" }}/>
            <span style={{ fontSize:10,color:"rgba(255,255,255,.5)" }}>High activity</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:10,height:10,borderRadius:"50%",background:accent,border:"1.5px solid white" }}/>
            <span style={{ fontSize:10,color:"rgba(255,255,255,.5)" }}>Active</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:10,color:"rgba(255,255,255,.3)" }}>Click marker for details</span>
          </div>
        </div>
      </div>
    </div>
  );
}


function PageGeo() {
  const [rows,    setRows]    = useState<any[]|null>(null);

  useEffect(() => {
    fetch("/api/admin/geo/countries")
      .then(r=>r.json())
      .then(d=>setRows(d.rows||[]))
      .catch(()=>setRows([]));
  }, []);

  const total      = (rows||[]).reduce((s:number,r:any)=>s+(r.companies||0), 0);
  const topCountry = [...(rows||[])].sort((a:any,b:any)=>b.companies-a.companies)[0];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
        <KPICard label="Countries"       value={rows?.length??0}           icon="🌍" color="#38bdf8"/>
        <KPICard label="Total Companies" value={total}                     icon="⬡"  color="#6366f1"/>
        <KPICard label="Top Market"      value={topCountry?.country||"—"}  icon="🏆" color="#fbbf24" sub={`${topCountry?.companies||0} companies`}/>
      </div>

      {/* Real Leaflet Map */}
      <GeoLeafletMap rows={rows||[]} title="Company Distribution Map" colorScheme="indigo"/>

      {/* Country Table */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"20px 22px" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", display:"block", marginBottom:16 }}>Country Breakdown</span>
        <DataTable
          rows={rows ? [...rows].sort((a:any,b:any)=>b.activeUsers30d-a.activeUsers30d) : null}
          cols={[
            { key:"country", label:"Country", render:(v:any)=>(
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#818cf8" }}>{v}</div>
                <span style={{ fontSize:13, fontWeight:700, color:"white" }}>{v}</span>
              </div>
            )},
            { key:"companies",     label:"Companies",          align:"right" },
            { key:"activeUsers30d",label:"Active Users (30d)",  align:"right", render:(v:any)=><span style={{ fontWeight:700,color:"#818cf8" }}>{v}</span> },
            { key:"share", label:"Share", align:"right", render:(_:any,row:any)=>{
              const tot = (rows||[]).reduce((s:number,r:any)=>s+(r.activeUsers30d||0),0);
              const pct = tot ? Math.round((row.activeUsers30d/tot)*100) : 0;
              return (
                <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                  <div style={{ width:70, height:5, borderRadius:3, background:"rgba(255,255,255,.07)", overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#6366f1,#818cf8)", borderRadius:3 }}/>
                  </div>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", width:30, textAlign:"right" }}>{pct}%</span>
                </div>
              );
            }},
          ]}
        />
      </div>
    </div>
  );
}
function PageUsage({ setPage }: { setPage:(p:Page)=>void }) {
  const [topActive,   setTopActive]   = useState<any[]|null>(null);
  const [atRisk,      setAtRisk]      = useState<any[]|null>(null);
  const [highInvoice, setHighInvoice] = useState<any[]|null>(null);
  const [quickModal,  setQuickModal]  = useState<{type:"reengagement"|"upgrade",count:number}|null>(null);
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(false);

  useEffect(() => {
    fetch("/api/admin/usage/top-active").then(r=>r.json()).then(d=>setTopActive(d.rows||[])).catch(()=>setTopActive([]));
    fetch("/api/admin/usage/at-risk").then(r=>r.json()).then(d=>setAtRisk(d.rows||[])).catch(()=>setAtRisk([]));
    fetch("/api/admin/usage/high-invoice").then(r=>r.json()).then(d=>setHighInvoice(d.rows||[])).catch(()=>setHighInvoice([]));
  }, []);

  async function sendQuickBroadcast(type: "reengagement"|"upgrade") {
    setSending(true);
    const payload = type === "reengagement"
      ? { subject:"We miss you! Come back to FinovaOS", audience:"churned",
          body:"Hi,\n\nWe noticed you haven't logged in for a while. Your FinovaOS workspace is waiting!\n\nA lot has improved — new features, faster reports, and better invoice management.\n\n👉 Log back in and pick up where you left off.\n\nIf you need help, just reply to this email.\n\n— The FinovaOS Team" }
      : { subject:"You're a power user — time to upgrade!", audience:"active",
          body:"Hi,\n\nYour business is generating a lot of invoices on FinovaOS — that's amazing!\n\nYou might be hitting limits soon. Upgrade to Pro or Enterprise to unlock:\n✓ Unlimited invoices & users\n✓ Advanced reports\n✓ Priority support\n✓ Multi-branch support\n\n👉 Upgrade now and keep growing.\n\n— The FinovaOS Team" };
    try {
      await fetch("/api/admin/broadcasts", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({...payload, channel:"email"}) });
      setSent(true);
      setTimeout(()=>{ setSent(false); setQuickModal(null); }, 2500);
    } catch {}
    setSending(false);
  }

  const btnStyle = (color: string): React.CSSProperties => ({
    fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:7, border:`1px solid ${color}40`,
    background:`${color}15`, color, cursor:"pointer", whiteSpace:"nowrap" as const,
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

      {/* Quick action info bar */}
      <div style={{ background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", borderRadius:12, padding:"12px 18px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,.5)" }}>📊 Usage data helps you act fast:</span>
        <button onClick={()=>setQuickModal({type:"reengagement", count:atRisk?.length||0})} style={btnStyle("#f87171")}>
          📧 Re-engage At-Risk ({atRisk?.length||0})
        </button>
        <button onClick={()=>setQuickModal({type:"upgrade", count:highInvoice?.length||0})} style={btnStyle("#34d399")}>
          ⬆️ Upgrade Offer to Power Users ({highInvoice?.length||0})
        </button>
        <button onClick={()=>setPage("broadcasts")} style={btnStyle("#818cf8")}>
          ✉ Open Broadcasts →
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>

        {/* Most Active */}
        <SectionCard title="🔥 Top Active (7d)">
          <DataTable rows={topActive} cols={[
            { key:"name",    label:"Company" },
            { key:"country", label:"Country" },
            { key:"activity",label:"Sessions",align:"right",render:(v:any)=><span style={{ fontWeight:700,color:"#6366f1" }}>{v}</span> },
          ]}/>
        </SectionCard>

        {/* At Risk */}
        <SectionCard title="⚠️ At Risk (no login 14d+)">
          <div style={{ marginBottom:10 }}>
            <button onClick={()=>setQuickModal({type:"reengagement", count:atRisk?.length||0})}
              style={{ width:"100%", padding:"8px", borderRadius:8, background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.3)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              📧 Email Bhejo — Wapas Bulao
            </button>
          </div>
          <DataTable rows={atRisk} cols={[
            { key:"name",      label:"Company" },
            { key:"plan",      label:"Plan",   render:(v:any)=><Badge status={String(v||"").toLowerCase()}/> },
            { key:"lastLogin", label:"Last Login", render:(v:any)=>v?timeAgo(v):"Never" },
          ]}/>
          {atRisk && atRisk.length === 0 && <div style={{ fontSize:12,color:"#34d399",textAlign:"center",padding:"12px 0" }}>✓ All Activated!</div>}
        </SectionCard>

        {/* High Invoice */}
        <SectionCard title="📊 High Invoice Volume (30d)">
          <div style={{ marginBottom:10 }}>
            <button onClick={()=>setQuickModal({type:"upgrade", count:highInvoice?.length||0})}
              style={{ width:"100%", padding:"8px", borderRadius:8, background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontSize:11, fontWeight:700, cursor:"pointer" }}>
              ⬆️ Upgrade Offer Bhejo
            </button>
          </div>
          <DataTable rows={highInvoice} cols={[
            { key:"name",    label:"Company" },
            { key:"invoices",label:"Invoices",align:"right" },
            { key:"amount",  label:"Amount",  align:"right", render:(v:any)=>`$${fmt(v)}` },
          ]}/>
        </SectionCard>
      </div>

      {/* Feature Adoption */}
      <SectionCard title="Feature Adoption">
        <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
          {[
            { label:"Invoicing",  value:97, max:100, color:"#6366f1" },
            { label:"Bank Recon", value:72, max:100, color:"#818cf8" },
            { label:"Reports",    value:88, max:100, color:"#34d399" },
            { label:"Inventory",  value:45, max:100, color:"#fbbf24" },
            { label:"CRM",        value:31, max:100, color:"#f87171" },
            { label:"HR/Payroll", value:18, max:100, color:"#38bdf8" },
          ].map(d => (
            <div key={d.label} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <MiniDonut value={d.value} max={d.max} color={d.color}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600 }}>{d.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Quick Send Modal */}
      {quickModal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center" }}
          onClick={()=>!sending&&setQuickModal(null)}>
          <div style={{ background:"#10142a",borderRadius:20,padding:"32px 28px",width:460,border:"1px solid rgba(255,255,255,.1)",boxShadow:"0 24px 60px rgba(0,0,0,.6)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:16,fontWeight:800,color:"white",marginBottom:6 }}>
              {quickModal.type==="reengagement" ? "📧 Re-engagement Email" : "⬆️ Upgrade Offer Email"}
            </div>
            <div style={{ fontSize:12,color:"rgba(255,255,255,.4)",marginBottom:20 }}>
              {quickModal.type==="reengagement"
                ? `${quickModal.count} at-risk companies ko wapas bulane ka email bhejein (jo 14+ din se login nahi kiye)`
                : `Power users ko Pro/Enterprise upgrade ki offer bhejein`}
            </div>
            <div style={{ background:"rgba(255,255,255,.04)",borderRadius:10,padding:"14px 16px",fontSize:12,color:"rgba(255,255,255,.5)",lineHeight:1.8,marginBottom:20,maxHeight:160,overflowY:"auto" }}>
              {quickModal.type==="reengagement"
                ? "Subject: We miss you! Come back to FinovaOS\n\nHi, We noticed you haven't logged in for a while. Your FinovaOS workspace is waiting! A lot has improved — new features, faster reports, and better invoice management.\n\n👉 Log back in and pick up where you left off."
                : "Subject: You're a power user — time to upgrade!\n\nHi, Your business is generating a lot of invoices on FinovaOS — that's amazing! Upgrade to Pro or Enterprise to unlock unlimited invoices, advanced reports, and priority support."}
            </div>
            {sent ? (
              <div style={{ padding:"12px",borderRadius:10,background:"rgba(52,211,153,.15)",border:"1px solid rgba(52,211,153,.3)",color:"#34d399",fontSize:13,fontWeight:700,textAlign:"center" }}>
                ✓ Email campaign successfully sent!
              </div>
            ) : (
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>setQuickModal(null)} disabled={sending}
                  style={{ flex:1,padding:"11px",borderRadius:10,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"rgba(255,255,255,.5)",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                  Cancel
                </button>
                <button onClick={()=>sendQuickBroadcast(quickModal.type)} disabled={sending}
                  style={{ flex:2,padding:"11px",borderRadius:10,background:sending?"rgba(99,102,241,.3)":"linear-gradient(135deg,#4f46e5,#7c3aed)",border:"none",color:"white",fontSize:13,fontWeight:700,cursor:sending?"not-allowed":"pointer" }}>
                  {sending ? "Sending..." : "📣 Send Now"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function PagePlans() {
  type PlanKey = "starter"|"pro"|"enterprise";
  const DEFAULT_FEATURES = [
    // Core accounting (from website)
    "Sales Invoices","Purchase Invoices","Ledger & Trial Balance","Chart of Accounts",
    "Bank Reconciliation","Payment Receipts","Expense Management","Credit & Debit Notes",
    // Inventory & operations
    "Inventory Management","Inventory Reports","Purchase Orders","Goods Receipt Notes",
    // Advanced accounting
    "Advanced Reports","Financial Statements","Audit Logs","Recurring Transactions",
    // Business modules
    "CRM","HR & Payroll","Multi-Branch","Department Budgets",
    // System features
    "Backup & Restore","API Access","Priority Support","Custom Integrations",
  ];
  const [plansTab, setPlansTab] = useState<"config"|"custom"|"modules">("config");
  const [pricing, setPricing]   = useState({ starter:{monthly:49,yearly:39}, pro:{monthly:99,yearly:79}, enterprise:{monthly:249,yearly:199} });
  const [seatPricing, setSeatPricing] = useState({ monthly:7, yearly:6 });
  const [planLimits, setPlanLimits] = useState<Record<string,number|null>>({ starter:3, pro:10, enterprise:25 });
  const [saved,   setSaved]     = useState<""|"saving"|"ok"|"err">("");
  const [features, setFeatures] = useState<string[]>(DEFAULT_FEATURES);
  const [pf, setPf] = useState<Record<PlanKey, string[]>>({
    starter: [
      "Sales Invoices","Purchase Invoices","Ledger & Trial Balance","Chart of Accounts",
      "Bank Reconciliation","Payment Receipts","Expense Management","Credit & Debit Notes",
    ],
    pro: [
      "Sales Invoices","Purchase Invoices","Ledger & Trial Balance","Chart of Accounts",
      "Bank Reconciliation","Payment Receipts","Expense Management","Credit & Debit Notes",
      "Inventory Management","Inventory Reports","Purchase Orders","Goods Receipt Notes",
      "Advanced Reports","Financial Statements","Audit Logs","Recurring Transactions",
      "CRM","Multi-Branch","Department Budgets","Backup & Restore","Priority Support",
    ],
    enterprise: [...DEFAULT_FEATURES],
  });

  // Load from API
  useEffect(() => {
    const u = getAdminUser();
    const headers: Record<string,string> = {};
    if (u?.id)   headers["x-user-id"]   = u.id;
    if (u?.role) headers["x-user-role"] = u.role;
    fetch("/api/admin/plan-config", { headers })
      .then(r => r.json())
      .then(d => {
        if (d.pricing) setPricing(p => ({ ...p, ...d.pricing }));
        if (d.seatPricing) setSeatPricing(s => ({ ...s, ...d.seatPricing }));
        if (d.features) setFeatures(d.features);
        if (d.featureMatrix) setPf(d.featureMatrix);
        if (d.planLimits) setPlanLimits(l => ({ ...l, ...d.planLimits }));
      })
      .catch(() => {});
  }, []);

  async function savePricing() {
    setSaved("saving");
    try {
      const u = getAdminUser();
      const headers: Record<string,string> = { "Content-Type":"application/json" };
      if (u?.id)   headers["x-user-id"]   = u.id;
      if (u?.role) headers["x-user-role"] = u.role;
      const r = await fetch("/api/admin/plan-config", {
        method: "POST",
        headers,
        body: JSON.stringify({ pricing, seatPricing, features, featureMatrix: pf, planLimits }),
      });
      setSaved(r.ok ? "ok" : "err");
      setTimeout(() => setSaved(""), 2500);
    } catch {
      setSaved("err");
      setTimeout(() => setSaved(""), 2500);
    }
  }

  function toggle(plan: PlanKey, feat: string) {
    setPf(prev => ({
      ...prev,
      [plan]: prev[plan].includes(feat) ? prev[plan].filter(f=>f!==feat) : [...prev[plan], feat],
    }));
  }

  function addFeature(name: string) {
    const trimmed = name.trim();
    if (!trimmed || features.includes(trimmed)) return;
    setFeatures(prev => [...prev, trimmed]);
    // Auto-enable for enterprise
    setPf(prev => ({ ...prev, enterprise: [...prev.enterprise, trimmed] }));
  }

  function removeFeature(name: string) {
    setFeatures(prev => prev.filter(f => f !== name));
    setPf(prev => ({
      starter:    prev.starter.filter(f => f !== name),
      pro:        prev.pro.filter(f => f !== name),
      enterprise: prev.enterprise.filter(f => f !== name),
    }));
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Tab bar */}
      <div style={{ display:"flex", gap:0, background:"rgba(255,255,255,.04)", borderRadius:12, padding:4, width:"fit-content", border:"1px solid rgba(255,255,255,.07)" }}>
        {([["config","⚙ Plan Config"],["custom","✦ Custom Orders"],["modules","📦 Module Prices"]] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setPlansTab(t)}
            style={{ padding:"8px 18px", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
              background: plansTab===t?"linear-gradient(135deg,#4f46e5,#7c3aed)":"transparent",
              color: plansTab===t?"white":"rgba(255,255,255,.4)" }}>
            {l}
          </button>
        ))}
      </div>
      {plansTab === "config" && (
        <PagePlansConfig
          pricing={pricing}
          setPricing={setPricing}
          saved={saved}
          onSave={savePricing}
          features={features}
          pf={pf}
          toggle={toggle}
          defaultFeatures={DEFAULT_FEATURES}
          addFeature={addFeature}
          removeFeature={removeFeature}
          seatPricing={seatPricing}
          setSeatPricing={setSeatPricing}
          planLimits={planLimits}
          setPlanLimits={setPlanLimits}
        />
      )}
      {plansTab === "custom" && <PageCustomOrders/>}
      {plansTab === "modules" && <PageModulePrices/>}
    </div>
  );
}

function PagePlansConfig({ pricing, setPricing, saved, onSave, features, pf, toggle, defaultFeatures, addFeature, removeFeature, seatPricing, setSeatPricing, planLimits, setPlanLimits }: any) {
  const plans = ["starter","pro","enterprise"] as const;
  const saveLabel = saved==="saving"?"Saving…":saved==="ok"?"✓ Saved!":saved==="err"?"✕ Error":"Save Changes";
  const [newFeat, setNewFeat] = useState("");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <SectionCard title="Pricing Configuration" action={
        <button onClick={onSave} disabled={saved==="saving"}
          style={{ padding:"7px 18px",borderRadius:9,background:saved==="ok"?"rgba(52,211,153,.2)":saved==="err"?"rgba(248,113,113,.2)":"linear-gradient(135deg,#6366f1,#4f46e5)",border:saved==="ok"?"1px solid rgba(52,211,153,.4)":saved==="err"?"1px solid rgba(248,113,113,.4)":"none",color:saved==="ok"?"#34d399":saved==="err"?"#f87171":"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",opacity:saved==="saving"?.7:1 }}>
          {saveLabel}
        </button>
      }>
        <div style={{ marginBottom:14, padding:"12px", borderRadius:10, background:"rgba(16,185,129,.08)", border:"1px solid rgba(16,185,129,.22)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.45)", letterSpacing:".05em", textTransform:"uppercase", marginBottom:8 }}>
            Extra Seat Add-On Pricing
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:10 }}>
            {(["monthly","yearly"] as const).map(period => (
              <div key={period}>
                <label style={{ fontSize:10.5, color:"rgba(255,255,255,.35)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>
                  {period} per-seat
                </label>
                <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.05)", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", padding:"7px 12px" }}>
                  <span style={{ color:"rgba(255,255,255,.4)", fontSize:13 }}>$</span>
                  <input
                    type="number"
                    min="0"
                    value={seatPricing?.[period] ?? 0}
                    onChange={e=>setSeatPricing((s:any)=>({ ...s, [period]: Number(e.target.value || 0) }))}
                    style={{ background:"none",border:"none",color:"#6ee7b7",fontSize:16,fontWeight:700,width:"100%",outline:"none",fontFamily:"inherit" }}
                  />
                  <span style={{ color:"rgba(255,255,255,.25)", fontSize:11 }}>/user/mo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {plans.map(plan => (
            <div key={plan} style={{ padding:"16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"white", textTransform:"capitalize", marginBottom:14 }}>{plan}</div>
              {["monthly","yearly"].map(period => (
                <div key={period} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10.5, color:"rgba(255,255,255,.35)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>{period}</label>
                  <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.05)", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", padding:"7px 12px" }}>
                    <span style={{ color:"rgba(255,255,255,.4)", fontSize:13 }}>$</span>
                    <input type="number"
                      value={(pricing as any)[plan][period]}
                      onChange={e=>setPricing((p:any)=>({...p,[plan]:{...(p as any)[plan],[period]:Number(e.target.value)}}))}
                      style={{ background:"none",border:"none",color:"white",fontSize:16,fontWeight:700,width:"100%",outline:"none",fontFamily:"inherit" }}
                    />
                    <span style={{ color:"rgba(255,255,255,.25)", fontSize:11 }}>/mo</span>
                  </div>
                </div>
              ))}
              {/* Max Users */}
              <div style={{ marginTop:4 }}>
                <label style={{ fontSize:10.5, color:"rgba(255,255,255,.35)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Max Users</label>
                <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(99,102,241,.08)", borderRadius:8, border:"1px solid rgba(99,102,241,.2)", padding:"7px 12px" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,.6)" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={planLimits[plan] ?? ""}
                    onChange={e=>setPlanLimits((l:any)=>({...l,[plan]:e.target.value===""?null:Number(e.target.value)}))}
                    placeholder="Unlimited"
                    style={{ background:"none",border:"none",color:"#a5b4fc",fontSize:15,fontWeight:700,width:"100%",outline:"none",fontFamily:"inherit" }}
                  />
                  <span style={{ color:"rgba(255,255,255,.25)", fontSize:11 }}>users</span>
                </div>
                <div style={{ marginTop:4, fontSize:10, color:"rgba(255,255,255,.3)" }}>
                  Leave empty for unlimited
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Feature Matrix" action={
        <button onClick={onSave} disabled={saved==="saving"}
          style={{ padding:"7px 18px",borderRadius:9,background:saved==="ok"?"rgba(52,211,153,.2)":saved==="err"?"rgba(248,113,113,.2)":"linear-gradient(135deg,#6366f1,#4f46e5)",border:saved==="ok"?"1px solid rgba(52,211,153,.4)":saved==="err"?"1px solid rgba(248,113,113,.4)":"none",color:saved==="ok"?"#34d399":saved==="err"?"#f87171":"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",opacity:saved==="saving"?.7:1 }}>
          {saveLabel}
        </button>
      }>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
            <thead>
              <tr>
                <th style={{ padding:"10px 12px", textAlign:"left", color:"rgba(255,255,255,.35)", fontWeight:700, fontSize:11, letterSpacing:".05em", textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,.07)" }}>Feature</th>
                {plans.map(p => (
                  <th key={p} style={{ padding:"10px 16px", textAlign:"center", color:"rgba(255,255,255,.35)", fontWeight:700, fontSize:11, letterSpacing:".05em", textTransform:"uppercase", borderBottom:"1px solid rgba(255,255,255,.07)" }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feat:any) => {
                const isCustom = !defaultFeatures.includes(feat);
                return (
                  <tr key={feat} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding:"10px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ color:"rgba(255,255,255,.6)", fontWeight:500, fontSize:12.5 }}>{feat}</span>
                        {isCustom && (
                          <button onClick={()=>removeFeature(feat)} title="Remove feature"
                            style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(248,113,113,.5)", fontSize:14, lineHeight:1, padding:"0 2px", display:"flex", alignItems:"center" }}
                            onMouseEnter={e=>(e.currentTarget.style.color="#f87171")}
                            onMouseLeave={e=>(e.currentTarget.style.color="rgba(248,113,113,.5)")}>
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {plans.map(plan => (
                      <td key={plan} style={{ padding:"10px 16px", textAlign:"center" }}>
                        <button onClick={()=>toggle(plan,feat)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:16 }}>
                          {pf[plan].includes(feat)
                            ? <span style={{ color:"#34d399" }}>✓</span>
                            : <span style={{ color:"rgba(255,255,255,.15)" }}>✕</span>
                          }
                        </button>
                      </td>
                    ))}
                  </tr>
                );
              })}
              {/* Add custom feature row */}
              <tr>
                <td colSpan={4} style={{ padding:"10px 12px" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input
                      value={newFeat}
                      onChange={e=>setNewFeat(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter"){ addFeature(newFeat); setNewFeat(""); } }}
                      placeholder="Add a custom feature…"
                      style={{ flex:1, padding:"7px 12px", borderRadius:8, background:"rgba(99,102,241,.08)", border:"1px dashed rgba(99,102,241,.35)", color:"white", fontSize:12.5, fontFamily:"inherit", outline:"none" }}
                    />
                    <button
                      onClick={()=>{ addFeature(newFeat); setNewFeat(""); }}
                      disabled={!newFeat.trim()}
                      style={{ padding:"7px 16px", borderRadius:8, background:"rgba(99,102,241,.7)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:newFeat.trim()?1:.4, transition:"opacity .2s" }}>
                      + Add
                    </button>
                  </div>
                  <div style={{ fontSize:10.5, color:"rgba(255,255,255,.2)", marginTop:5 }}>
                    Custom features auto-enable for Enterprise. Press Enter or click + Add. Will show on the website pricing page.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CUSTOM ORDERS — Admin view of custom plan signups
══════════════════════════════════════════════ */
function PageCustomOrders() {
  const [orders, setOrders]   = useState<any[]|null>(null);
  const [selected, setSelected] = useState<any|null>(null);
  const [approving, setApproving] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/admin/custom-plans")
      .then(r=>r.json())
      .then(d=>setOrders(d.orders||[]))
      .catch(()=>setOrders([]));
  }, []);

  async function approve(id:string, price:number) {
    setApproving(id);
    try {
      await fetch("/api/admin/custom-plans", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"APPROVE", id, finalPrice:price }),
      });
      setOrders(os=>(os||[]).map(o=>o.id===id?{...o,status:"approved",finalPrice:price}:o));
      if(selected?.id===id) setSelected((o:any)=>o?{...o,status:"approved",finalPrice:price}:o);
    } catch {}
    setApproving(null);
  }

  async function reject(id:string) {
    if(!await confirmToast("Reject this custom plan request?")) return;
    try {
      await fetch("/api/admin/custom-plans", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"REJECT", id }),
      });
      setOrders(os=>(os||[]).map(o=>o.id===id?{...o,status:"rejected"}:o));
    } catch {}
  }

  const STATUS_STYLE: Record<string,[string,string]> = {
    pending:  ["#fbbf24","rgba(251,191,36,.12)"],
    approved: ["#34d399","rgba(52,211,153,.12)"],
    rejected: ["#f87171","rgba(248,113,113,.12)"],
    active:   ["#818cf8","rgba(129,140,248,.12)"],
  };

  const pending = (orders||[]).filter(o=>o.status==="pending").length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KPICard label="Total Requests"  value={orders?.length??0} icon="✦" color="#818cf8"/>
        <KPICard label="Pending Review"  value={pending}           icon="⏳" color="#fbbf24"/>
        <KPICard label="Approved"        value={(orders||[]).filter(o=>o.status==="approved"||o.status==="active").length} icon="✓" color="#34d399"/>
        <KPICard label="Rejected"        value={(orders||[]).filter(o=>o.status==="rejected").length} icon="" color="#f87171"/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr", gap:16 }}>
        {/* Orders list */}
        <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.07)", fontSize:12, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".05em" }}>Custom Plan Requests</div>
          <div style={{ maxHeight:500, overflowY:"auto" }}>
            {orders===null ? (
              <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>Loading...</div>
            ) : orders.length===0 ? (
              <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>No custom plan requests yet</div>
            ) : orders.map(o=>{
              const [sc,sb] = STATUS_STYLE[o.status]||["#818cf8","rgba(129,140,248,.12)"];
              return (
                <div key={o.id} onClick={()=>setSelected(o)}
                  style={{ padding:"13px 18px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,.04)",
                    background:selected?.id===o.id?"rgba(99,102,241,.1)":"transparent" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"white" }}>{o.companyName||"New Company"}</div>
                      <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>{o.email} · {o.createdAt?.slice(0,10)}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, background:sb, color:sc, fontSize:10, fontWeight:700 }}>{o.status}</span>
                      <span style={{ fontSize:12, fontWeight:800, color:"#fbbf24" }}>${o.requestedPrice||o.finalPrice||0}/mo</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order detail */}
        <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"20px" }}>
          {!selected ? (
            <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.15)", fontSize:13 }}>Select a request to review</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:"white" }}>{selected.companyName||"New Company"}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>{selected.email} · #{selected.id?.slice(0,8)}</div>
                </div>
                <div style={{ fontSize:20, fontWeight:900, color:"#fbbf24" }}>${selected.finalPrice||selected.requestedPrice||0}<span style={{ fontSize:11, color:"rgba(255,255,255,.3)", fontWeight:500 }}>/mo</span></div>
              </div>

              {/* Modules */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".05em", textTransform:"uppercase", marginBottom:8 }}>Selected Modules</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {(selected.modules||[]).map((m:string)=>(
                    <span key={m} style={{ padding:"4px 10px", borderRadius:8, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.25)", color:"#818cf8", fontSize:11, fontWeight:600 }}>{m.replace(/_/g," ")}</span>
                  ))}
                </div>
              </div>

              {/* Price override */}
              {selected.status==="pending" && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".05em", textTransform:"uppercase", marginBottom:8 }}>Override Price (optional)</div>
                  <input type="number" defaultValue={selected.requestedPrice||0}
                    onChange={e=>setSelected((o:any)=>({...o,finalPrice:Number(e.target.value)}))}
                    style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:14, outline:"none", boxSizing:"border-box" }}/>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.25)", marginTop:4 }}>Auto-calculated: ${selected.requestedPrice||0}/mo · You can adjust if needed</div>
                </div>
              )}

              {/* Actions */}
              {selected.status==="pending" && (
                <div style={{ display:"flex", gap:10, marginTop:4 }}>
                  <button onClick={()=>reject(selected.id)}
                    style={{ flex:1, padding:"10px", borderRadius:10, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                     Reject
                  </button>
                  <button onClick={()=>approve(selected.id, selected.finalPrice||selected.requestedPrice||0)} disabled={approving===selected.id}
                    style={{ flex:2, padding:"10px", borderRadius:10, background:"linear-gradient(135deg,#059669,#34d399)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    {approving===selected.id ? "Approving..." : "✓ Approve & Activate"}
                  </button>
                </div>
              )}
              {selected.status!=="pending" && (
                <div style={{ padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", color:"rgba(255,255,255,.4)", fontSize:12, textAlign:"center" }}>
                  This request has been {selected.status}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MODULE PRICES — Admin can edit per-module pricing
══════════════════════════════════════════════ */
function PageModulePrices() {
  // Import MODULES from lib — here we inline for admin override
  const DEFAULT_MODULES = [
    { key:"accounting",         name:"Accounting & Invoicing", icon:"📊", price:15, category:"core" },
    { key:"crm",                name:"CRM",                    icon:"👥", price:15, category:"core" },
    { key:"hr_payroll",         name:"HR & Payroll",           icon:"👨‍💼", price:20, category:"core" },
    { key:"bank_reconciliation",name:"Bank Reconciliation",    icon:"🏦", price:10, category:"finance" },
    { key:"tax_filing",         name:"Tax Filing",             icon:"🧾", price:10, category:"finance" },
    { key:"inventory",          name:"Inventory",              icon:"📦", price:12, category:"operations" },
    { key:"reports",            name:"Advanced Reports",       icon:"📈", price:8,  category:"operations" },
    { key:"multi_branch",       name:"Multi-Branch",           icon:"🏢", price:15, category:"operations" },
    { key:"whatsapp",           name:"WhatsApp / Slack",       icon:"💬", price:8,  category:"integrations" },
    { key:"api_access",         name:"API Access",             icon:"", price:20, category:"integrations" },
  ];

  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);

  useEffect(()=>{
    fetch("/api/admin/module-prices")
      .then(r=>r.json())
      .then(d=>{ if(d.modules?.length) setModules(d.modules); })
      .catch(()=>{});
  },[]);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/admin/module-prices", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ modules }),
      });
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    } catch {}
    setSaving(false);
  }

  const total = modules.reduce((s,m)=>s+m.price, 0);
  const categories = ["core","finance","operations","integrations"];
  const catLabels: Record<string,string> = { core:"Core Modules", finance:"Finance", operations:"Operations", integrations:"Integrations" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>Set price per module for Custom plan. Changes reflect live on pricing page.</div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {saved && <span style={{ color:"#34d399", fontSize:12, fontWeight:600 }}>✓ Saved</span>}
          <button onClick={save} disabled={saving}
            style={{ padding:"9px 22px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {saving?"Saving...":"Save Prices"}
          </button>
        </div>
      </div>

      {categories.map(cat=>{
        const catMods = modules.filter(m=>m.category===cat);
        return (
          <div key={cat} style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
            <div style={{ padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,.06)", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".06em" }}>{catLabels[cat]}</div>
            {catMods.map((m,i)=>(
              <div key={m.key} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 18px", borderBottom:i<catMods.length-1?"1px solid rgba(255,255,255,.04)":"none" }}>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"white" }}>{m.name}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.25)", fontFamily:"monospace" }}>{m.key}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>$</span>
                  <input type="number" min="0" max="999" value={m.price}
                    onChange={e=>setModules(ms=>ms.map(mod=>mod.key===m.key?{...mod,price:Number(e.target.value)}:mod))}
                    style={{ width:72, padding:"7px 10px", borderRadius:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", fontSize:14, fontWeight:700, outline:"none", textAlign:"center" }}/>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>/mo</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <div style={{ padding:"14px 18px", borderRadius:12, background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.2)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>If all modules selected (max price)</span>
        <span style={{ fontSize:18, fontWeight:800, color:"#fbbf24" }}>${total}/mo</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: SYSTEM HEALTH
═══════════════════════════════════════════════════════ */
function PageSystem() {
  const [h, setH] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/system/health")
      .then(r=>r.json())
      .then(setH)
      .catch(()=>{});
  }, []);

  const metrics = [
    { label:"API Errors (24h)",    value:h?.apiErrors24h??0,     icon:"⚡", good:(h?.apiErrors24h??0)<10  },
    { label:"Failed Logins (24h)", value:h?.failedLogins24h??0,  icon:"🔐", good:(h?.failedLogins24h??0)<20 },
    { label:"Queue Failures (24h)",value:h?.queueFailures24h??0, icon:"📋", good:(h?.queueFailures24h??0)===0 },
    { label:"Uptime",              value:h?.uptime??"—",          icon:"📡", good:true },
    { label:"DB Latency",          value:h?.dbLatency??"—",       icon:"", good:true },
    { label:"Backup Status",       value:h?.backupStatus??"—",    icon:"💾", good:h?.backupStatus==="OK" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ padding:"20px", borderRadius:14, background:"rgba(255,255,255,.03)", border:`1px solid ${m.good?"rgba(52,211,153,.2)":"rgba(248,113,113,.3)"}` }}>
            <div style={{ fontSize:20, marginBottom:8 }}>{m.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:m.good?"#34d399":"#f87171", fontFamily:"'Lora',serif" }}>{String(m.value)}</div>
            <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginTop:4, fontWeight:600 }}>{m.label}</div>
          </div>
        ))}
      </div>
      <SectionCard title="Last Backup">
        <div style={{ padding:"16px", borderRadius:12, background:"rgba(52,211,153,.06)", border:"1px solid rgba(52,211,153,.15)", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:28 }}>💾</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#34d399" }}>Backup completed successfully</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>
              {h?.lastBackupAt ? new Date(h.lastBackupAt).toLocaleString()+" · "+timeAgo(h.lastBackupAt) : "No backup info"}
            </div>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Service Status">
        {["API Server","Database","Email Service","File Storage","Queue Worker","Stripe Webhooks"].map((s,i) => (
          <div key={s} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <span style={{ fontSize:13, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{s}</span>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:i===5?"#fbbf24":"#34d399" }}/>
              <span style={{ fontSize:11.5, fontWeight:700, color:i===5?"#fbbf24":"#34d399" }}>{i===5?"Degraded":"Operational"}</span>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
function PageLogs() {
  const [q,       setQ]       = useState("");
  const [actionF, setActionF] = useState("");
  const [allLogs, setAllLogs] = useState<any[]|null>(null);

  useEffect(() => {
    fetch("/api/admin/logs")
      .then(r=>r.json())
      .then(d=>setAllLogs(d.rows||[]))
      .catch(()=>setAllLogs([]));
  }, []);

  const filtered = (allLogs||[]).filter((l:any) =>
    (!q || String(l.userId||"").toLowerCase().includes(q.toLowerCase()) || String(l.companyId||"").toLowerCase().includes(q.toLowerCase())) &&
    (!actionF || String(l.action||"").includes(actionF.toUpperCase()))
  );
  const ACTION_COLORS: Record<string,string> = {
    INVOICE_CREATED:"#818cf8",
    USER_LOGIN:"#34d399",
    PLAN_UPGRADED:"#fbbf24",
    REPORT_EXPORTED:"#38bdf8",
    BANK_RECONCILIATION:"#a78bfa",
    SUBSCRIPTION_PAST_DUE:"#f87171",
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"flex", gap:10 }}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by user or company…"
          style={{ flex:2,padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none" }}
          onFocus={e=>e.target.style.borderColor="rgba(129,140,248,.5)"}
          onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
        />
        <input value={actionF} onChange={e=>setActionF(e.target.value)} placeholder="Filter by action…"
          style={{ flex:1,padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none" }}
          onFocus={e=>e.target.style.borderColor="rgba(129,140,248,.5)"}
          onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
        />
      </div>

      <SectionCard title={`Audit Log (${filtered.length} entries)`}>
        <DataTable
          rows={allLogs===null ? null : filtered}
          cols={[
            { key:"createdAt", label:"Time", render:v=>(
              <div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.6)" }}>{new Date(v).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{new Date(v).toLocaleDateString()}</div>
              </div>
            )},
            { key:"companyId", label:"Company", render:v=><span style={{ fontWeight:600,color:"white",fontSize:12 }}>{v}</span> },
            { key:"userId",    label:"User" },
            { key:"action",    label:"Action", render:v=>(
              <span style={{ padding:"3px 10px",borderRadius:6,background:`${ACTION_COLORS[v]||"#818cf8"}18`,color:ACTION_COLORS[v]||"#818cf8",fontSize:10.5,fontWeight:700,letterSpacing:".04em" }}>
                {v.replace(/_/g," ")}
              </span>
            )},
            { key:"details", label:"Details", render:v=>(
              <span style={{ fontSize:11,color:"rgba(255,255,255,.35)",fontFamily:"monospace" }}>
                {JSON.stringify(v).slice(0,60)}
              </span>
            )},
          ]}
        />
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: PERMISSIONS
═══════════════════════════════════════════════════════ */
/* ── Plan features for permissions page ─────────────────────── */
const PLAN_FEATURES = [
  // Core
  { key:"VIEW_DASHBOARD",          label:"Dashboard Home",           route:"/dashboard",                  category:"Core" },
  { key:"VIEW_SETTINGS",           label:"Settings",                 route:"/dashboard/branches",         category:"Core" },
  { key:"VIEW_AUDIT_LOG",          label:"Audit Log",                route:"/dashboard/users/logs",       category:"Core" },
  { key:"VIEW_LOGS",               label:"System Logs",              route:"/dashboard/users/logs",       category:"Core" },
  { key:"MANAGE_USERS",            label:"Users & Permissions",      route:"/dashboard/users",            category:"Core" },
  // Banking
  { key:"BANK_RECONCILIATION",     label:"Bank Reconciliation",      route:"/dashboard/bank-reconciliation", category:"Banking & Payment" },
  { key:"PAYMENT_RECEIPTS",        label:"Payment Receipts",         route:"/dashboard/payment-receipts", category:"Banking & Payment" },
  { key:"EXPENSE_VOUCHERS",        label:"Expense Vouchers",         route:"/dashboard/expense-vouchers", category:"Banking & Payment" },
  { key:"TAX_CONFIGURATION",       label:"Tax Configuration",        route:"/dashboard/tax-configuration",category:"Banking & Payment" },
  // Accounts
  { key:"VIEW_ACCOUNTS",           label:"Accounts Overview",        route:"/dashboard/accounts",         category:"Accounts" },
  { key:"CREATE_CPV",              label:"CPV — Cash Payment",       route:"/dashboard/cpv",              category:"Accounts" },
  { key:"CREATE_CRV",              label:"CRV — Cash Receipt",       route:"/dashboard/crv",              category:"Accounts" },
  { key:"VIEW_ACCOUNTING",         label:"Accounting Module",        route:"/dashboard/contra",           category:"Accounts" },
  // Inventory
  { key:"VIEW_CATALOG",            label:"Inventory Catalog",        route:"/dashboard/items-new",        category:"Inventory" },
  { key:"CREATE_ACCOUNTS",         label:"Chart of Accounts",        route:"/dashboard/accounts",         category:"Inventory" },
  { key:"CREATE_ITEMS",            label:"Inventory Items",          route:"/dashboard/items-new",        category:"Inventory" },
  { key:"CREATE_STOCK_RATE",       label:"Stock Rates",              route:"/dashboard/stock-rate",       category:"Inventory" },
  // Sales & Purchase
  { key:"VIEW_INVENTORY",          label:"Sales & Purchase",         route:"/dashboard/sales-invoice",    category:"Sales & Purchase" },
  { key:"CREATE_SALES_INVOICE",    label:"Sales Invoice",            route:"/dashboard/sales-invoice",    category:"Sales & Purchase" },
  { key:"CREATE_QUOTATION",        label:"Quotation / Estimate",     route:"/dashboard/quotation",        category:"Sales & Purchase" },
  { key:"CREATE_DELIVERY_CHALLAN", label:"Delivery Challan",         route:"/dashboard/delivery-challan", category:"Sales & Purchase" },
  { key:"CREATE_PURCHASE_INVOICE", label:"Purchase Invoice",         route:"/dashboard/purchase-invoice", category:"Sales & Purchase" },
  { key:"CREATE_PURCHASE_ORDER",   label:"Purchase Order (PO)",      route:"/dashboard/purchase-order",  category:"Sales & Purchase" },
  { key:"CREATE_SALE_RETURN",      label:"Sale Return",              route:"/dashboard/sale-return",      category:"Sales & Purchase" },
  { key:"CREATE_OUTWARD",          label:"Outward / Dispatch",       route:"/dashboard/outward",          category:"Sales & Purchase" },
  // Reports
  { key:"VIEW_REPORTS",            label:"General Reports",          route:"/dashboard/reports",          category:"Reports" },
  { key:"VIEW_FINANCIAL_REPORTS",  label:"Financial Reports",        route:"/dashboard/reports/ledger",   category:"Reports" },
  { key:"VIEW_AGEING_REPORT",      label:"Ageing Report",            route:"/dashboard/reports/ageing",   category:"Reports" },
  { key:"VIEW_LEDGER_REPORT",      label:"Ledger Report",            route:"/dashboard/reports/ledger",   category:"Reports" },
  { key:"VIEW_TRIAL_BALANCE_REPORT",label:"Trial Balance",           route:"/dashboard/reports/trial-balance", category:"Reports" },
  { key:"VIEW_PROFIT_LOSS_REPORT", label:"Profit & Loss",            route:"/dashboard/reports/profit-loss",  category:"Reports" },
  { key:"VIEW_INVENTORY_REPORTS",  label:"Inventory Reports",        route:"/dashboard/reports/inventory",category:"Reports" },
  // Advanced Financial Reports
  { key:"VIEW_REPORTS",  label:"Budget vs Actual",           route:"/dashboard/reports/budget-vs-actual",    category:"Reports" },
  { key:"VIEW_REPORTS",  label:"COGS Report",                route:"/dashboard/reports/cogs",                category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Gross Margin",               route:"/dashboard/reports/gross-margin",        category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Expense Breakdown",          route:"/dashboard/reports/expense-breakdown",   category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Breakeven Analysis",         route:"/dashboard/reports/breakeven",           category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Tax Forecast",               route:"/dashboard/reports/tax-forecast",        category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Audit & Exceptions",         route:"/dashboard/reports/audit-exception",     category:"Reports" },
  // Inventory Intelligence
  { key:"VIEW_INVENTORY_REPORTS",  label:"Stock Movement",   route:"/dashboard/reports/stock/movement",      category:"Reports" },
  { key:"VIEW_INVENTORY_REPORTS",  label:"Dead Stock",       route:"/dashboard/reports/stock/dead",          category:"Reports" },
  { key:"VIEW_INVENTORY_REPORTS",  label:"Stock Turnover",   route:"/dashboard/reports/stock/turnover",      category:"Reports" },
  { key:"VIEW_INVENTORY_REPORTS",  label:"Expiry Tracking",  route:"/dashboard/reports/stock/expiry",        category:"Reports" },
  { key:"VIEW_INVENTORY_REPORTS",  label:"Stock Valuation",  route:"/dashboard/reports/stock/valuation",     category:"Reports" },
  { key:"VIEW_INVENTORY_REPORTS",  label:"Warehouse Stock",  route:"/dashboard/reports/stock/warehouse",     category:"Reports" },
  // Sales & Customer Analytics
  { key:"VIEW_REPORTS",  label:"Customer Profitability",     route:"/dashboard/reports/customer-profitability", category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Salesman Performance",       route:"/dashboard/reports/salesman-performance",   category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Discount Analysis",          route:"/dashboard/reports/discount-analysis",      category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Sales by Region",            route:"/dashboard/reports/sales-region",           category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Product Profitability",      route:"/dashboard/reports/product-profitability",  category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Returns Analysis",           route:"/dashboard/reports/returns-analysis",       category:"Reports" },
  // Receivables & Payables
  { key:"VIEW_AGEING_REPORT",  label:"Supplier Ageing (AP)", route:"/dashboard/reports/supplier-ageing",      category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Payment History",            route:"/dashboard/reports/payment-history",      category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Bad Debts",                  route:"/dashboard/reports/bad-debts",            category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Credit Analysis",            route:"/dashboard/reports/credit-analysis",      category:"Reports" },
  // Operations Reports
  { key:"VIEW_REPORTS",  label:"Order Fulfillment",          route:"/dashboard/reports/order-fulfillment",    category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Delivery Performance",       route:"/dashboard/reports/delivery-performance", category:"Reports" },
  { key:"VIEW_REPORTS",  label:"PO Tracking",                route:"/dashboard/reports/po-tracking",          category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Supplier Performance",       route:"/dashboard/reports/supplier-performance", category:"Reports" },
  // Strategic Reports
  { key:"VIEW_REPORTS",  label:"Sales Forecast",             route:"/dashboard/reports/forecast",             category:"Reports" },
  { key:"VIEW_REPORTS",  label:"Scenario Planning",          route:"/dashboard/reports/scenario",             category:"Reports" },
  // HR & CRM
  { key:"VIEW_HR_PAYROLL",             label:"HR & Payroll",                route:"/dashboard/employees",        category:"HR & CRM" },
  { key:"VIEW_CRM",                    label:"CRM",                         route:"/dashboard/crm/contacts",     category:"HR & CRM" },
  { key:"BACKUP_RESTORE",              label:"Backup & Restore",            route:"/dashboard/backup-restore",   category:"HR & CRM" },
  // AI Features
  { key:"AI_ASSISTANT",                label:"AI Assistant (Ask Anything)", route:"/dashboard",                  category:"AI Features" },
  { key:"AI_BUSINESS_OPERATOR",        label:"AI Business Operator",        route:"/dashboard",                  category:"AI Features" },
  { key:"AI_SMART_SUGGESTIONS",        label:"Smart Invoice Suggestions",   route:"/dashboard",                  category:"AI Features" },
  { key:"AI_FORECAST",                 label:"AI Sales Forecast",           route:"/dashboard/reports/forecast", category:"AI Features" },
  { key:"AI_ANOMALY_DETECTION",        label:"Anomaly & Fraud Detection",   route:"/dashboard",                  category:"AI Features" },
  { key:"AI_EXPENSE_CATEGORIZATION",   label:"AI Expense Categorization",   route:"/dashboard",                  category:"AI Features" },
  { key:"AI_NATURAL_LANGUAGE",         label:"Natural Language Reports",    route:"/dashboard/reports",          category:"AI Features" },
  { key:"AI_CASH_FLOW_PREDICTION",     label:"AI Cash Flow Prediction",     route:"/dashboard",                  category:"AI Features" },
];

const PF_CATEGORIES = Array.from(new Set(PLAN_FEATURES.map(f => f.category)));

const PLAN_DEFAULTS: Record<string, string[]> = {
  STARTER:    PLAN_FEATURES.filter(f => ["VIEW_DASHBOARD","VIEW_SETTINGS","MANAGE_USERS","BANK_RECONCILIATION","PAYMENT_RECEIPTS","EXPENSE_VOUCHERS","TAX_CONFIGURATION","VIEW_ACCOUNTS","CREATE_CPV","CREATE_CRV","VIEW_ACCOUNTING","VIEW_CATALOG","CREATE_ACCOUNTS","CREATE_ITEMS","CREATE_STOCK_RATE","VIEW_INVENTORY","CREATE_SALES_INVOICE","CREATE_QUOTATION","CREATE_DELIVERY_CHALLAN","CREATE_PURCHASE_INVOICE","CREATE_PURCHASE_ORDER","CREATE_SALE_RETURN","CREATE_OUTWARD","VIEW_REPORTS","VIEW_FINANCIAL_REPORTS","VIEW_AGEING_REPORT","VIEW_LEDGER_REPORT","VIEW_TRIAL_BALANCE_REPORT"].includes(f.key)).map(f=>f.key),
  PRO:        PLAN_FEATURES.filter(f => f.key !== "VIEW_HR_PAYROLL").map(f=>f.key),
  ENTERPRISE: PLAN_FEATURES.map(f=>f.key),
  CUSTOM:     [],
};

const PLAN_UI = {
  STARTER:    { icon:"🌱", name:"Starter",      color:"#818cf8", glow:"rgba(129,140,248,.2)", border:"rgba(129,140,248,.3)" },
  PRO:        { icon:"🚀", name:"Professional", color:"#34d399", glow:"rgba(52,211,153,.2)",  border:"rgba(52,211,153,.3)"  },
  ENTERPRISE: { icon:"💎", name:"Enterprise",   color:"#fbbf24", glow:"rgba(251,191,36,.2)",  border:"rgba(251,191,36,.3)"  },
  CUSTOM:     { icon:"⚡", name:"Custom",       color:"#38bdf8", glow:"rgba(56,189,248,.2)",  border:"rgba(56,189,248,.3)"  },
} as const;

type PlanKey = keyof typeof PLAN_UI;

const BIZ_ICONS: Record<string, string> = {
  salon:"💇", gym:"🏋️", restaurant:"🍽️", retail:"🛒", trading:"📦",
  distribution:"🚚", manufacturing:"🏭", service:"🔧", healthcare:"🏥",
  real_estate:"🏠", construction:"🏗️", school:"🎓", hotel:"🏨",
  pharmacy:"💊", transport:"🚌", trade:"📊", ecommerce:"🛍️",
  agriculture:"🌾", ngo:"🤝", law_firm:"⚖️", it:"💻",
  automotive:"🚗", repair:"🔨", maintenance:"🛠️", media:"📺",
  subscriptions:"📱", isp:"📡", solar:"☀️", events:"🎪",
  rentals:"🏢", firm:"👔", franchise:"🏪",
};

function PagePermissions() {
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [planPerms, setPlanPerms]               = useState<Record<string,string[]>>(PLAN_DEFAULTS);
  const [dashboardFeatureFlags, setDashboardFeatureFlags] = useState<Record<string, string[]>>(() => createDefaultDashboardFeatureFlags());
  const [saving, setSaving]   = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [bizSearch, setBizSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/plan-config")
      .then(r=>r.json())
      .then(d => {
        if (d?.planPermissions) setPlanPerms(p=>({...p,...d.planPermissions}));
        if (d?.dashboardFeatureFlags) setDashboardFeatureFlags(p=>({...p,...d.dashboardFeatureFlags}));
      })
      .catch(()=>{});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const existing = await fetch("/api/admin/plan-config").then(r=>r.json()).catch(()=>({}));
      await fetch("/api/admin/plan-config",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...existing, planPermissions: planPerms, dashboardFeatureFlags}),
      });
      setSavedMsg("Saved!"); setTimeout(()=>setSavedMsg(""),2500);
    } catch { setSavedMsg("Error!"); setTimeout(()=>setSavedMsg(""),2500); }
    setSaving(false);
  };

  const syncPlan = async (plan?: string) => {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/admin/sync-plan-permissions",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-user-role":"ADMIN"},
        body:JSON.stringify(plan ? { plans:[plan] } : {}),
      });
      const d = await res.json();
      setSyncMsg(d.success ? `✅ ${d.message}` : `❌ ${d.error||"Sync failed"}`);
    } catch { setSyncMsg("❌ Network error"); }
    setSyncing(false);
    setTimeout(()=>setSyncMsg(""),4000);
  };

  const PLAN_KEYS = ["STARTER","PRO","ENTERPRISE"] as const;

  // Group all business-specific features by business type
  const bizGroups = DASHBOARD_FEATURE_DEFS.reduce<Record<string, typeof DASHBOARD_FEATURE_DEFS>>((acc, f) => {
    (acc[f.business] ||= []).push(f);
    return acc;
  }, {});

  const toggleFeature = (plan: string, featureId: string) => {
    setDashboardFeatureFlags(prev => {
      const s = new Set(prev[plan]||[]);
      s.has(featureId) ? s.delete(featureId) : s.add(featureId);
      return {...prev,[plan]:Array.from(s)};
    });
  };

  const togglePerm = (plan: string, permKey: string) => {
    setPlanPerms(prev => {
      const s = new Set(prev[plan]||[]);
      s.has(permKey) ? s.delete(permKey) : s.add(permKey);
      return {...prev,[plan]:Array.from(s)};
    });
  };

  const enableAllForPlan = (plan: string, bizFeatures: typeof DASHBOARD_FEATURE_DEFS) => {
    setDashboardFeatureFlags(prev => {
      const s = new Set(prev[plan]||[]);
      bizFeatures.forEach(f=>s.add(f.id));
      return {...prev,[plan]:Array.from(s)};
    });
    setPlanPerms(prev => ({...prev,[plan]:PLAN_FEATURES.map(f=>f.key)}));
  };

  const disableAllForPlan = (plan: string, bizFeatures: typeof DASHBOARD_FEATURE_DEFS) => {
    setDashboardFeatureFlags(prev => {
      const s = new Set(prev[plan]||[]);
      bizFeatures.forEach(f=>s.delete(f.id));
      return {...prev,[plan]:Array.from(s)};
    });
    setPlanPerms(prev => ({...prev,[plan]:[]}));
  };

  // Shared header action buttons
  const ActionBar = ({ showSync = true }: { showSync?: boolean }) => (
    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
      {savedMsg && <span style={{ fontSize:12, fontWeight:700, color:savedMsg==="Error!"?"#f87171":"#34d399", padding:"6px 14px", borderRadius:8, background:savedMsg==="Error!"?"rgba(248,113,113,.12)":"rgba(52,211,153,.12)" }}>{savedMsg==="Error!"?"":"✓ "}{savedMsg}</span>}
      {syncMsg  && <span style={{ fontSize:12, fontWeight:700, color:syncMsg.startsWith("✅")?"#34d399":"#f87171", padding:"6px 14px", borderRadius:8, background:syncMsg.startsWith("✅")?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)" }}>{syncMsg}</span>}
      <button onClick={save} disabled={saving}
        style={{ padding:"9px 22px",borderRadius:10,background:saving?"rgba(99,102,241,.4)":"linear-gradient(135deg,#6366f1,#4f46e5)",border:"none",color:"white",fontSize:13,fontWeight:700,cursor:saving?"default":"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(99,102,241,.35)" }}>
        {saving?"Saving…":"💾 Save Changes"}
      </button>
      {showSync && <>
        <button onClick={()=>syncPlan()} disabled={syncing}
          style={{ padding:"9px 18px",borderRadius:10,background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.25)",color:"#fbbf24",fontSize:12,fontWeight:700,cursor:syncing?"default":"pointer",fontFamily:"inherit" }}>
          {syncing?"…":"⚡ Sync All Plans"}
        </button>
      </>}
    </div>
  );

  /* ── STEP 2: Business detail — 3 plan columns ── */
  if (selectedBusiness) {
    const bizFeatures = bizGroups[selectedBusiness] || [];
    const bizLabel = bizFeatures[0]?.businessLabel || selectedBusiness;
    const bizIcon  = BIZ_ICONS[selectedBusiness] || "🏢";
    const totalPerPlan = bizFeatures.length + PLAN_FEATURES.length;

    // Helper: render a single toggleable row (shared for both sections)
    type PlanMeta = { icon:string; name:string; color:string; glow:string; border:string };
    const ModuleRow = ({ label, sub, on, onToggle, meta }: { label:string; sub:string; on:boolean; onToggle:()=>void; meta: PlanMeta }) => (
      <div onClick={onToggle}
        style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 14px", cursor:"pointer",
          background:on?"rgba(255,255,255,.04)":"transparent", transition:"background .15s" }}
        onMouseEnter={e=>(e.currentTarget.style.background=on?"rgba(255,255,255,.06)":"rgba(255,255,255,.03)")}
        onMouseLeave={e=>(e.currentTarget.style.background=on?"rgba(255,255,255,.04)":"transparent")}>
        <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, border:`2px solid ${on?meta.color:"rgba(255,255,255,.2)"}`, background:on?meta.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
          {on && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5 9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:600, color:on?"white":"rgba(255,255,255,.38)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", marginTop:1 }}>{sub}</div>
        </div>
        <div style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:5, background:on?meta.glow:"rgba(255,255,255,.05)", color:on?meta.color:"rgba(255,255,255,.25)", flexShrink:0 }}>
          {on?"ON":"OFF"}
        </div>
      </div>
    );

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
        <style>{`@keyframes pf-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, flexWrap:"wrap" }}>
          <button onClick={()=>setSelectedBusiness(null)}
            style={{ padding:"8px 16px", borderRadius:10, border:"1.5px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.7)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            ← All Businesses
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:800, color:"white" }}>{bizIcon} {bizLabel}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.4)", marginTop:2 }}>{bizFeatures.length} business pages + {PLAN_FEATURES.length} general pages — configure per plan</div>
          </div>
          <ActionBar showSync={false} />
        </div>

        {/* 3 plan columns */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, animation:"pf-in .25s ease" }}>
          {PLAN_KEYS.map(plan => {
            const meta = PLAN_UI[plan];
            const flags   = dashboardFeatureFlags[plan] || [];
            const perms   = planPerms[plan] || [];
            const bizEnabled  = bizFeatures.filter(f=>flags.includes(f.id)).length;
            const permEnabled = PLAN_FEATURES.filter(f=>perms.includes(f.key)).length;
            const totalEnabled = bizEnabled + permEnabled;
            const pct = totalPerPlan ? Math.round((totalEnabled/totalPerPlan)*100) : 0;

            return (
              <div key={plan} style={{ borderRadius:16, border:`2px solid ${meta.border}`, overflow:"hidden", display:"flex", flexDirection:"column" }}>

                {/* Plan header */}
                <div style={{ padding:"14px 16px", background:meta.glow, borderBottom:`1px solid ${meta.border}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:"rgba(0,0,0,.25)", border:`1.5px solid ${meta.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{meta.icon}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color:meta.color }}>{meta.name}</div>
                      <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", marginTop:1 }}>{totalEnabled} / {totalPerPlan} enabled ({pct}%)</div>
                    </div>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,.1)", borderRadius:99, overflow:"hidden", marginBottom:8 }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:meta.color, borderRadius:99, transition:"width .3s" }}/>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>enableAllForPlan(plan, bizFeatures)}
                      style={{ flex:1, fontSize:10, fontWeight:700, padding:"5px 0", borderRadius:7, border:`1px solid ${meta.border}`, background:"rgba(0,0,0,.2)", color:meta.color, cursor:"pointer", fontFamily:"inherit" }}>
                      ✓ Enable All
                    </button>
                    <button onClick={()=>disableAllForPlan(plan, bizFeatures)}
                      style={{ flex:1, fontSize:10, fontWeight:700, padding:"5px 0", borderRadius:7, border:"1px solid rgba(255,255,255,.12)", background:"rgba(0,0,0,.2)", color:"rgba(255,255,255,.45)", cursor:"pointer", fontFamily:"inherit" }}>
                      ✗ Disable All
                    </button>
                  </div>
                </div>

                {/* Business-specific pages */}
                {bizFeatures.length > 0 && (
                  <div style={{ background:"rgba(255,255,255,.02)", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ padding:"7px 14px", background:"rgba(255,255,255,.04)", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <span style={{ fontSize:10, fontWeight:800, color:meta.color, textTransform:"uppercase", letterSpacing:".06em" }}>Business Pages</span>
                      <span style={{ fontSize:10, color:"rgba(255,255,255,.35)" }}>{bizEnabled}/{bizFeatures.length}</span>
                    </div>
                    {bizFeatures.map(f => (
                      <ModuleRow key={f.id} label={f.label} sub={f.section} on={flags.includes(f.id)} onToggle={()=>toggleFeature(plan,f.id)} meta={meta} />
                    ))}
                  </div>
                )}

                {/* General pages (PLAN_FEATURES grouped by category) */}
                <div style={{ flex:1, background:"rgba(255,255,255,.01)" }}>
                  {PF_CATEGORIES.map(cat => {
                    const catFeats = PLAN_FEATURES.filter(f=>f.category===cat);
                    const catEnabled = catFeats.filter(f=>perms.includes(f.key)).length;
                    return (
                      <div key={cat}>
                        <div style={{ padding:"7px 14px", background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.05)", borderTop:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <span style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".06em" }}>{cat}</span>
                          <span style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{catEnabled}/{catFeats.length}</span>
                        </div>
                        {catFeats.map(f => (
                          <ModuleRow key={`${f.key}-${f.label}`} label={f.label} sub={f.route} on={perms.includes(f.key)} onToggle={()=>togglePerm(plan,f.key)} meta={meta} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── STEP 1: Business grid ── */
  const bizEntries = Object.entries(bizGroups).filter(([key, feats]) =>
    !bizSearch || feats[0]?.businessLabel?.toLowerCase().includes(bizSearch.toLowerCase()) || key.toLowerCase().includes(bizSearch.toLowerCase())
  );
  const planTotals = PLAN_KEYS.map(plan => ({
    plan,
    meta: PLAN_UI[plan],
    count: (dashboardFeatureFlags[plan]||[]).length,
    total: DASHBOARD_FEATURE_DEFS.length,
  }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      <style>{`@keyframes pf-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:"white", marginBottom:4 }}>Business Module Permissions</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>Select a business type → configure which plan gets access to each module</div>
        </div>
        <ActionBar />
      </div>

      {/* Plan summary strip */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:22 }}>
        {planTotals.map(({plan,meta,count,total}) => (
          <div key={plan} style={{ padding:"12px 16px", borderRadius:12, background:meta.glow, border:`1.5px solid ${meta.border}`, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>{meta.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:800, color:meta.color }}>{meta.name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:1 }}>{count} / {total} modules enabled</div>
            </div>
            <div style={{ height:36, width:36, borderRadius:"50%", background:"rgba(0,0,0,.2)", border:`1.5px solid ${meta.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:12, fontWeight:800, color:meta.color }}>{total?Math.round((count/total)*100):0}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ position:"relative", marginBottom:16 }}>
        <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"rgba(255,255,255,.3)" }}>🔍</span>
        <input value={bizSearch} onChange={e=>setBizSearch(e.target.value)} placeholder="Search businesses…"
          style={{ width:"100%", padding:"10px 14px 10px 40px", borderRadius:12, border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.05)", color:"white", fontSize:13, outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
        {bizSearch && <button onClick={()=>setBizSearch("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"rgba(255,255,255,.4)", cursor:"pointer", fontSize:16, lineHeight:1 }}>✕</button>}
      </div>

      {/* Business type grid */}
      <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,.4)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:12 }}>
        {bizEntries.length} Business Types — click to configure modules
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(170px, 1fr))", gap:10, animation:"pf-in .25s ease" }}>
        {bizEntries.map(([bizKey, features]) => {
          const bizLabel = features[0]?.businessLabel || bizKey;
          const icon = BIZ_ICONS[bizKey] || "🏢";
          // Count how many features are enabled across all plans
          const enabledAcrossPlans = PLAN_KEYS.reduce((sum, plan) => {
            const flags = dashboardFeatureFlags[plan]||[];
            return sum + features.filter(f=>flags.includes(f.id)).length;
          }, 0);
          const maxPossible = features.length * PLAN_KEYS.length;
          const pct = maxPossible ? Math.round((enabledAcrossPlans/maxPossible)*100) : 0;
          return (
            <div key={bizKey} onClick={()=>setSelectedBusiness(bizKey)}
              style={{ padding:"16px 14px", borderRadius:14, cursor:"pointer", border:"1.5px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.03)", transition:"all .2s", display:"flex", flexDirection:"column", gap:8 }}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.border="1.5px solid rgba(99,102,241,.4)";(e.currentTarget as HTMLDivElement).style.background="rgba(99,102,241,.08)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.border="1.5px solid rgba(255,255,255,.08)";(e.currentTarget as HTMLDivElement).style.background="rgba(255,255,255,.03)";}}>
              <div style={{ fontSize:28 }}>{icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"white", lineHeight:1.3 }}>{bizLabel}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{features.length} modules</div>
              <div style={{ height:3, background:"rgba(255,255,255,.08)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ width:`${pct}%`, height:"100%", background:"#6366f1", borderRadius:99 }}/>
              </div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>{pct}% configured</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: LIVE SUPPORT
═══════════════════════════════════════════════════════ */
type ConvStatus = "bot"|"waiting"|"agent"|"closed";
type AdminConv = {
  id: string; customer_name: string; customer_email: string|null;
  status: ConvStatus; assigned_agent: string|null;
  created_at: string; updated_at: string; last_message?: string;
};
type AdminMsg = {
  id: string; conversation_id: string;
  sender: "customer"|"bot"|"agent"; text: string; created_at: string;
};
const SUPPORT_STATUS = {
  bot:     { label:"AI Bot",   color:"#818cf8", bg:"rgba(129,140,248,.12)", dot:"#6366f1" },
  waiting: { label:"Waiting",  color:"#fbbf24", bg:"rgba(251,191,36,.12)",  dot:"#f59e0b" },
  agent:   { label:"Live",     color:"#34d399", bg:"rgba(52,211,153,.12)",  dot:"#10b981" },
  closed:  { label:"Closed",   color:"#6b7280", bg:"rgba(107,114,128,.12)", dot:"#6b7280" },
};
const QUICK_REPLIES_ADMIN = [
  "I'll look into that right away!",
  "Could you share more details?",
  "Let me check and get back to you.",
  "Is there anything else I can help with?",
  "Please try refreshing and let me know.",
];

function PageLiveSupport() {
  const [convs,       setConvs]       = useState<AdminConv[]>([]);
  const [activeId,    setActiveId]    = useState<string|null>(null);
  const [messages,    setMessages]    = useState<AdminMsg[]>([]);
  const [replyText,   setReplyText]   = useState("");
  const [filter,      setFilter]      = useState<"all"|"waiting"|"agent"|"bot"|"closed">("all");
  const [search,      setSearch]      = useState("");
  const [sending,     setSending]     = useState(false);
  const [nowMs,       setNowMs]       = useState(Date.now());
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  const activeConv = convs.find(c => c.id === activeId);
  const waitingCount = convs.filter(c => c.status === "waiting").length;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => { const t = setInterval(() => setNowMs(Date.now()), 30000); return () => clearInterval(t); }, []);

  // Poll conversations
  const loadConvs = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/conversations?limit=100");
      const d = await r.json();
      setConvs(d.data || []);
    } catch {}
  }, []);
  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 3000); return () => clearInterval(t); }, [loadConvs]);

  // Poll messages for active conv
  const loadMsgs = useCallback(async () => {
    if (!activeId) return;
    try {
      const r = await fetch(`/api/chat/messages?conversationId=${activeId}`);
      const d = await r.json();
      setMessages((d.data || []).map((m: Record<string,string>) => ({ ...m, conversation_id: m.conversation_id || activeId })));
    } catch {}
  }, [activeId]);
  useEffect(() => {
    if (!activeId) return;
    loadMsgs();
    const t = setInterval(loadMsgs, 2500);
    return () => clearInterval(t);
  }, [activeId, loadMsgs]);

  async function takeOver() {
    if (!activeId) return;
    await fetch(`/api/chat/conversations/${activeId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status:"agent", assignedAgent:"Admin Agent" }) });
    await fetch("/api/chat/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ conversationId:activeId, sender:"agent", text:"Hi! I'm an Admin Agent from FinovaOS Support. How can I help you? 😊" }) });
    loadConvs(); loadMsgs();
  }

  async function closeConv() {
    if (!activeId) return;
    await fetch(`/api/chat/conversations/${activeId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status:"closed" }) });
    loadConvs();
  }

  async function sendReply(text?: string) {
    const msg = (text || replyText).trim();
    if (!msg || !activeId || sending) return;
    setSending(true); setReplyText("");
    await fetch("/api/chat/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ conversationId:activeId, sender:"agent", text:msg }) });
    loadMsgs(); setSending(false);
    inputRef.current?.focus();
  }

  function timeAgo(iso: string) {
    const diff = nowMs - new Date(iso).getTime();
    const m = Math.floor(diff/60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  }

  const filtered = convs.filter(c => {
    const mf = filter === "all" || c.status === filter;
    const ms = !search || c.customer_name.toLowerCase().includes(search.toLowerCase()) || (c.customer_email||"").toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  return (
    <div style={{ display:"flex", height:"calc(100vh - 120px)", gap:0, borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,.08)" }}>

      {/* ── LEFT: Conversation list ── */}
      <div style={{ width:280, flexShrink:0, borderRight:"1px solid rgba(255,255,255,.07)", display:"flex", flexDirection:"column", background:"rgba(255,255,255,.01)" }}>

        {/* Header */}
        <div style={{ padding:"14px 14px 10px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"white" }}>Live Chats</div>
            {waitingCount > 0 && (
              <div style={{ padding:"2px 8px", borderRadius:99, background:"rgba(251,191,36,.15)", border:"1px solid rgba(251,191,36,.3)", fontSize:10, fontWeight:800, color:"#fbbf24" }}>
                ⏳ {waitingCount} waiting
              </div>
            )}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
            style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}/>
          <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
            {(["all","waiting","agent","bot","closed"] as const).map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{
                fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, border:"none", cursor:"pointer", fontFamily:"inherit",
                background: filter===f ? (f==="waiting"?"#fbbf24":f==="agent"?"#34d399":f==="bot"?"#818cf8":f==="closed"?"#6b7280":"#6366f1") : "rgba(255,255,255,.06)",
                color: filter===f ? (f==="all"?"white":"#080c1e") : "rgba(255,255,255,.35)",
              }}>
                {f==="all"?`All(${convs.length})`:f==="waiting"?`⏳${convs.filter(c=>c.status===f).length}`:f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding:20, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12, lineHeight:1.6 }}>
              {convs.length === 0 ? "No conversations yet.\nChat widget on your website will create them." : "No matches."}
            </div>
          )}
          {filtered.map(c => {
            const st = SUPPORT_STATUS[c.status] || SUPPORT_STATUS.bot;
            const isAct = c.id === activeId;
            return (
              <div key={c.id} onClick={()=>setActiveId(c.id)}
                style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.04)", cursor:"pointer", transition:"background .15s",
                  background: isAct ? "rgba(99,102,241,.1)" : "transparent",
                  borderLeft: isAct ? "3px solid #6366f1" : "3px solid transparent" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:st.dot, flexShrink:0 }}/>
                    <span style={{ fontSize:12.5, fontWeight:700, color:"white" }}>{c.customer_name}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:9, padding:"1px 5px", borderRadius:99, background:st.bg, color:st.color, fontWeight:700 }}>{st.label}</span>
                    <span style={{ fontSize:9.5, color:"rgba(255,255,255,.2)" }}>{timeAgo(c.updated_at)}</span>
                  </div>
                </div>
                {c.customer_email && <div style={{ fontSize:10, color:"rgba(255,255,255,.25)", marginBottom:2 }}>{c.customer_email}</div>}
                {c.last_message && <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.last_message}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── RIGHT: Chat area ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {!activeId ? (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"rgba(255,255,255,.2)" }}>
            <div style={{ fontSize:40 }}>💬</div>
            <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,.35)" }}>Select a conversation</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.2)", textAlign:"center", maxWidth:280, lineHeight:1.7 }}>
              Conversations from your website chat widget appear here automatically. New chats refresh every 3 seconds.
            </div>
          </div>
        ) : (
          <>
            {/* Conv header */}
            {activeConv && (
              <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"rgba(255,255,255,.02)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:9, background:"linear-gradient(135deg,#6366f1,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>
                    {activeConv.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700 }}>{activeConv.customer_name}</div>
                    <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)" }}>{activeConv.customer_email||"No email"} · {timeAgo(activeConv.created_at)}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  {(activeConv.status==="bot"||activeConv.status==="waiting") && (
                    <button onClick={takeOver} style={{ padding:"6px 14px", borderRadius:8, background:"linear-gradient(135deg,#34d399,#059669)", border:"none", color:"white", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      👤 Take Over
                    </button>
                  )}
                  {activeConv.status!=="closed" && (
                    <button onClick={closeConv} style={{ padding:"6px 12px", borderRadius:8, background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)", color:"#f87171", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      ✕ Close
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", display:"flex", flexDirection:"column", gap:9 }}>
              {messages.map((msg, i) => (
                <div key={msg.id||i} style={{ display:"flex", justifyContent:msg.sender==="customer"?"flex-end":"flex-start", gap:7, alignItems:"flex-end" }}>
                  {msg.sender!=="customer" && (
                    <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, background:msg.sender==="agent"?"linear-gradient(135deg,#34d399,#059669)":"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
                      {msg.sender==="agent"?"👤":"🤖"}
                    </div>
                  )}
                  <div style={{
                    maxWidth:"70%", padding:"8px 12px",
                    borderRadius:msg.sender==="customer"?"13px 13px 4px 13px":"13px 13px 13px 4px",
                    background:msg.sender==="customer"?"linear-gradient(135deg,#6366f1,#4f46e5)":msg.sender==="agent"?"rgba(52,211,153,.12)":"rgba(255,255,255,.06)",
                    border:msg.sender==="agent"?"1px solid rgba(52,211,153,.25)":"none",
                    fontSize:12.5, color:"rgba(255,255,255,.88)", lineHeight:1.65, whiteSpace:"pre-line",
                  }}>
                    {msg.sender!=="customer" && (
                      <div style={{ fontSize:9.5, fontWeight:700, color:msg.sender==="agent"?"#34d399":"#818cf8", marginBottom:3 }}>
                        {msg.sender==="agent"?`👤 ${activeConv?.assigned_agent||"Agent"}`:"🤖 AI Bot"}
                      </div>
                    )}
                    {msg.text}
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.2)", marginTop:3, textAlign:"right" }}>
                      {new Date(msg.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                  {msg.sender==="customer" && (
                    <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, background:"rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12 }}>
                      {activeConv?.customer_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>

            {/* Quick replies */}
            {activeConv?.status==="agent" && (
              <div style={{ padding:"5px 16px", borderTop:"1px solid rgba(255,255,255,.05)", display:"flex", gap:5, flexWrap:"wrap", flexShrink:0 }}>
                {QUICK_REPLIES_ADMIN.map((qr,i) => (
                  <button key={i} onClick={()=>sendReply(qr)} style={{ fontSize:10, padding:"2px 9px", borderRadius:99, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.2)", color:"#818cf8", cursor:"pointer", fontFamily:"inherit", fontWeight:600, transition:"all .15s" }}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(99,102,241,.22)";e.currentTarget.style.color="white";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(99,102,241,.1)";e.currentTarget.style.color="#818cf8";}}>
                    {qr.length>35?qr.slice(0,35)+"…":qr}
                  </button>
                ))}
              </div>
            )}

            {/* Reply input */}
            {activeConv && activeConv.status!=="closed" && (
              <div style={{ padding:"10px 16px 14px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                {activeConv.status!=="agent" ? (
                  <div style={{ padding:12, borderRadius:10, background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.2)", fontSize:12, color:"#fbbf24", textAlign:"center" }}>
                    {activeConv.status==="waiting" ? "⏳ Customer is waiting. Click \"Take Over\" to join." : "🤖 AI bot is handling this. Click \"Take Over\" to take control."}
                  </div>
                ) : (
                  <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:"rgba(255,255,255,.04)", borderRadius:12, border:"1.5px solid rgba(255,255,255,.08)", padding:"8px 10px", transition:"border .2s" }}
                    onFocusCapture={e=>(e.currentTarget.style.borderColor="rgba(129,140,248,.4)")}
                    onBlurCapture={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.08)")}>
                    <textarea ref={inputRef} value={replyText} onChange={e=>setReplyText(e.target.value)}
                      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendReply();}}}
                      rows={2} placeholder="Type your reply… (Enter to send)"
                      style={{ flex:1, background:"none", border:"none", color:"white", fontSize:13, fontFamily:"inherit", lineHeight:1.6, resize:"none", outline:"none" }}/>
                    <button onClick={()=>sendReply()} disabled={!replyText.trim()||sending} style={{
                      width:34, height:34, borderRadius:9, border:"none", flexShrink:0,
                      background:replyText.trim()?"linear-gradient(135deg,#6366f1,#4f46e5)":"rgba(255,255,255,.06)",
                      cursor:replyText.trim()?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" opacity={replyText.trim()?1:0.3}>
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}
            {activeConv?.status==="closed" && (
              <div style={{ padding:"12px 16px", flexShrink:0, borderTop:"1px solid rgba(255,255,255,.06)" }}>
                <div style={{ textAlign:"center", padding:10, borderRadius:10, background:"rgba(107,114,128,.08)", border:"1px solid rgba(107,114,128,.2)", fontSize:12, color:"#9ca3af" }}>✕ Conversation closed</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: SETTINGS
═══════════════════════════════════════════════════════ */
function PageSettings() {
  const [saved,   setSaved]   = useState<""|"saving"|"ok"|"err">("");
  const [danger,  setDanger]  = useState<Record<string,string>>({});
  const [form, setForm] = useState({ appName:"FinovaOS", supportEmail:"finovaos.app@gmail.com", maintenanceMode:false, allowSignups:true, maxUsersPerCompany:50, sessionTimeout:30 });

  useEffect(() => {
    const u = getAdminUser();
    const h: Record<string,string> = {};
    if (u?.id) h["x-user-id"]=u.id; if (u?.role) h["x-user-role"]=u.role;
    fetch("/api/admin/settings", { headers: h })
      .then(r=>r.json()).then(d=>{ if(d.settings) setForm(f=>({...f,...d.settings})); }).catch(()=>{});
  }, []);

  async function saveSettings() {
    setSaved("saving");
    try {
      const u = getAdminUser();
      const h: Record<string,string> = { "Content-Type":"application/json" };
      if (u?.id) h["x-user-id"]=u.id; if (u?.role) h["x-user-role"]=u.role;
      const r = await fetch("/api/admin/settings", { method:"POST", headers:h, body:JSON.stringify(form) });
      setSaved(r.ok?"ok":"err"); setTimeout(()=>setSaved(""),2500);
    } catch { setSaved("err"); setTimeout(()=>setSaved(""),2500); }
  }

  async function runAction(action: string, key: string) {
    setDanger(d=>({...d,[key]:"running"}));
    try {
      const u = getAdminUser();
      const h: Record<string,string> = { "Content-Type":"application/json" };
      if (u?.id) h["x-user-id"]=u.id; if (u?.role) h["x-user-role"]=u.role;
      const r = await fetch("/api/admin/system", { method:"POST", headers:h, body:JSON.stringify({ action }) });
      setDanger(d=>({...d,[key]:r.ok?"done":"err"})); setTimeout(()=>setDanger(d=>({...d,[key]:""})),2500);
    } catch { setDanger(d=>({...d,[key]:"err"})); setTimeout(()=>setDanger(d=>({...d,[key]:""})),2500); }
  }

  const saveLabel = saved==="saving"?"Saving…":saved==="ok"?"✓ Saved!":saved==="err"?"✕ Error":"Save Settings";

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <SectionCard title="General Settings" action={
        <button onClick={saveSettings} disabled={saved==="saving"}
          style={{ padding:"7px 18px",borderRadius:9,background:saved==="ok"?"rgba(52,211,153,.2)":saved==="err"?"rgba(248,113,113,.2)":"linear-gradient(135deg,#6366f1,#4f46e5)",border:saved==="ok"?"1px solid rgba(52,211,153,.4)":saved==="err"?"1px solid rgba(248,113,113,.4)":"none",color:saved==="ok"?"#34d399":saved==="err"?"#f87171":"white",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>
          {saveLabel}
        </button>
      }>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {[
            { key:"appName", label:"App Name", type:"text" },
            { key:"supportEmail", label:"Support Email", type:"email" },
            { key:"maxUsersPerCompany", label:"Max Users per Company", type:"number" },
            { key:"sessionTimeout", label:"Session Timeout (minutes)", type:"number" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:11.5,color:"rgba(255,255,255,.4)",fontWeight:700,letterSpacing:".05em",textTransform:"uppercase",display:"block",marginBottom:6 }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e=>setForm(p=>({...p,[f.key]:f.type==="number"?Number(e.target.value):e.target.value}))}
                style={{ width:"100%",padding:"9px 14px",borderRadius:10,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",color:"white",fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box" }}
                onFocus={e=>e.target.style.borderColor="rgba(129,140,248,.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Feature Toggles">
        {[
          { key:"maintenanceMode", label:"Maintenance Mode", desc:"Blocks all non-admin logins", danger:true },
          { key:"allowSignups",    label:"Allow New Signups", desc:"Enable/disable public registration", danger:false },
        ].map(t => (
          <div key={t.key} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:t.danger&&(form as any)[t.key]?"#f87171":"white" }}>{t.label}</div>
              <div style={{ fontSize:11.5,color:"rgba(255,255,255,.3)",marginTop:2 }}>{t.desc}</div>
            </div>
            <div onClick={()=>setForm(p=>({...p,[t.key]:!(p as any)[t.key]}))}
              style={{ width:44,height:24,borderRadius:12,background:(form as any)[t.key]?(t.danger?"#f87171":"#6366f1"):"rgba(255,255,255,.1)",cursor:"pointer",transition:"all .25s",position:"relative",flexShrink:0 }}>
              <div style={{ width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:3,left:(form as any)[t.key]?22:3,transition:"left .25s" }}/>
            </div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Danger Zone">
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[
            { label:"Clear All Cache",    desc:"Flushes server cache. Users may experience brief slowdown.", btn:"Clear Cache", key:"cache",   action:"CLEAR_CACHE",   color:"#fbbf24" },
            { label:"Force Backup Now",   desc:"Triggers an immediate database backup.",                     btn:"Run Backup",  key:"backup",  action:"FORCE_BACKUP",  color:"#38bdf8" },
            { label:"Broadcast Alert",    desc:"Send a system-wide notification to all active users.",        btn:"Send Alert",  key:"alert",   action:"BROADCAST",     color:"#a78bfa" },
          ].map(d => {
            const st = danger[d.key]||"";
            const btnLabel = st==="running"?"Running…":st==="done"?"✓ Done":st==="err"?"✕ Error":d.btn;
            return (
              <div key={d.label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:12,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)" }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:700,color:"white" }}>{d.label}</div>
                  <div style={{ fontSize:11.5,color:"rgba(255,255,255,.3)",marginTop:2 }}>{d.desc}</div>
                </div>
                <button onClick={()=>runAction(d.action,d.key)} disabled={st==="running"}
                  style={{ padding:"7px 16px",borderRadius:9,border:`1px solid ${d.color}40`,background:st==="done"?`${d.color}25`:st==="err"?"rgba(248,113,113,.15)":`${d.color}12`,color:st==="err"?"#f87171":d.color,fontSize:12,fontWeight:700,cursor:st==="running"?"default":"pointer",fontFamily:"inherit",flexShrink:0,marginLeft:16,opacity:st==="running"?.7:1 }}>
                  {btnLabel}
                </button>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT — LAYOUT + ROUTER
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   NOTIFICATIONS DROPDOWN COMPONENT
═══════════════════════════════════════════════════════ */
function NotificationsDropdown({ notifs, onMarkRead, onMarkAllRead, onClear }: {
  notifs: Notif[];
  onMarkRead: (id:string) => void;
  onMarkAllRead: () => void;
  onClear: (id:string) => void;
}) {
  const unread = notifs.filter(n=>!n.isRead).length;
  return (
    <div style={{
      position:"absolute", top:"calc(100% + 10px)", right:0,
      width:360, maxHeight:520,
      background:"rgba(8,12,30,.98)", border:"1.5px solid rgba(99,102,241,.25)",
      borderRadius:16, boxShadow:"0 24px 64px rgba(0,0,0,.7), 0 0 0 1px rgba(99,102,241,.1)",
      display:"flex", flexDirection:"column", overflow:"hidden", zIndex:999,
      animation:"fadeUp .2s ease both",
    }}>
      {/* Header */}
      <div style={{ padding:"14px 16px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <span style={{ fontSize:13.5, fontWeight:800, color:"white" }}>Notifications</span>
          {unread > 0 && (
            <span style={{ marginLeft:8, padding:"2px 8px", borderRadius:10, background:"rgba(248,113,113,.2)", color:"#f87171", fontSize:10.5, fontWeight:800 }}>
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={onMarkAllRead} style={{ fontSize:11, color:"#818cf8", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY:"auto", flex:1 }}>
        {notifs.length === 0 ? (
          <div style={{ padding:"40px 20px", textAlign:"center", color:"rgba(255,255,255,.25)", fontSize:13 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>🔔</div>
            No notifications yet
          </div>
        ) : notifs.map(n => {
          const cfg = NOTIF_CONFIG[n.type] || { icon:"", color:"#818cf8", bg:"rgba(129,140,248,.12)" };
          return (
            <div key={n.id}
              style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.04)", display:"flex", gap:12, alignItems:"flex-start",
                background: n.isRead ? "transparent" : "rgba(99,102,241,.05)",
                transition:"background .2s", cursor:"pointer", position:"relative" }}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.03)")}
              onMouseLeave={e=>(e.currentTarget.style.background=n.isRead?"transparent":"rgba(99,102,241,.05)")}
              onClick={()=>!n.isRead&&onMarkRead(n.id)}
            >
              {/* Unread dot */}
              {!n.isRead && (
                <div style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)", width:5, height:5, borderRadius:"50%", background:"#6366f1", flexShrink:0 }}/>
              )}

              {/* Icon */}
              <div style={{ width:34, height:34, borderRadius:10, background:cfg.bg, border:`1px solid ${cfg.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, marginTop:1 }}>
                {cfg.icon}
              </div>

              {/* Content */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12.5, fontWeight:700, color: n.isRead ? "rgba(255,255,255,.55)" : "white", lineHeight:1.4, marginBottom:3 }}>
                  {n.title}
                </div>
                <div style={{ fontSize:11.5, color:"rgba(255,255,255,.35)", lineHeight:1.5 }}>
                  {n.message}
                </div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", marginTop:4 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>

              {/* Dismiss */}
              <button onClick={e=>{e.stopPropagation();onClear(n.id);}}
                style={{ background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.2)", fontSize:14, padding:"2px 4px", borderRadius:5, transition:"color .15s", flexShrink:0 }}
                onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,.7)")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.2)")}>
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {notifs.length > 0 && (
        <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"center", flexShrink:0 }}>
          <button onClick={onMarkAllRead} style={{ fontSize:11.5, color:"rgba(255,255,255,.3)", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", transition:"color .2s" }}
            onMouseEnter={e=>(e.currentTarget.style.color="rgba(255,255,255,.6)")}
            onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.3)")}>
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: PROFILE
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   PAGE: SUPPORT TICKETS
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   PAGE: VISITOR ANALYTICS
   Real-time website visitors — country, city, device
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   PAGE: PRODUCT UPDATES
   Admin posts updates → users see them in dashboard
═══════════════════════════════════════════════════════ */
function PageUpdates() {
  type Update = {
    id: string; title: string; body: string; type: string;
    published: boolean; createdAt: string; version?: string;
  };

  const [updates,  setUpdates]  = useState<Update[]|null>(null);
  const [form,     setForm]     = useState({ title:"", body:"", type:"feature", version:"", published:true });
  const [editing,  setEditing]  = useState<Update|null>(null);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saved,    setSaved]    = useState(false);

  const TYPE_CONFIG: Record<string,{label:string;icon:string;color:string;bg:string}> = {
    feature:     { label:"New Feature",   icon:"✨", color:"#818cf8", bg:"rgba(129,140,248,.12)" },
    improvement: { label:"Improvement",   icon:"⚡", color:"#38bdf8", bg:"rgba(56,189,248,.12)"  },
    bugfix:      { label:"Bug Fix",       icon:"🐛", color:"#34d399", bg:"rgba(52,211,153,.12)"  },
    announcement:{ label:"Announcement",  icon:"📣", color:"#fbbf24", bg:"rgba(251,191,36,.12)"  },
    maintenance: { label:"Maintenance",   icon:"🔧", color:"#f87171", bg:"rgba(248,113,113,.12)" },
  };

  useEffect(()=>{
    const u = getAdminUser();
    const headers: Record<string, string> = {};
    if (u?.id) headers["x-user-id"] = u.id;
    if (u?.role) headers["x-user-role"] = u.role;

    fetch("/api/admin/updates", { headers })
      .then(r=>r.json())
      .then(d=>setUpdates(d.updates||[]))
      .catch(()=>setUpdates([]));
  },[]);

  async function handleSave() {
    if (!form.title.trim()||!form.body.trim()) return;
    setSaving(true);
    try {
      const isEdit = !!editing;
      const u = getAdminUser();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (u?.id) headers["x-user-id"] = u.id;
      if (u?.role) headers["x-user-role"] = u.role;

      const res = await fetch("/api/admin/updates", {
        method:"POST",
        headers,
        body: JSON.stringify({ action: isEdit?"EDIT":"CREATE", id:editing?.id, ...form }),
      });
      const d = await res.json();
      if (!res.ok) {
        alertToast(d.error || "Failed to save update");
        setSaving(false);
        return;
      }

      if (isEdit) {
        setUpdates(us=>(us||[]).map(u=>u.id===editing!.id?{...u,...form,id:u.id,createdAt:u.createdAt}:u));
      } else {
        setUpdates(us=>[d.update||{id:Date.now().toString(),createdAt:new Date().toISOString(),...form},...(us||[])]);
      }
      setForm({ title:"", body:"", type:"feature", version:"", published:true });
      setEditing(null);
      setShowForm(false);
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    } catch (e: any) {
      alertToast("Error: " + e.message);
    }
    setSaving(false);
  }

  async function togglePublish(u: Update) {
    const updated = { ...u, published:!u.published };
    setUpdates(us=>(us||[]).map(x=>x.id===u.id?updated:x));
    
    const admin = getAdminUser();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (admin?.id) headers["x-user-id"] = admin.id;
    if (admin?.role) headers["x-user-role"] = admin.role;

    await fetch("/api/admin/updates", {
      method:"POST",
      headers,
      body: JSON.stringify({ action:"TOGGLE_PUBLISH", id:u.id, published:!u.published }),
    }).catch(()=>{});
  }

  async function deleteUpdate(id:string) {
    if (!await confirmToast("Delete this update?")) return;
    setUpdates(us=>(us||[]).filter(u=>u.id!==id));

    const admin = getAdminUser();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (admin?.id) headers["x-user-id"] = admin.id;
    if (admin?.role) headers["x-user-role"] = admin.role;

    await fetch("/api/admin/updates", {
      method:"POST",
      headers,
      body: JSON.stringify({ action:"DELETE", id }),
    }).catch(()=>{});
  }

  function startEdit(u: Update) {
    setEditing(u);
    setForm({ title:u.title, body:u.body, type:u.type, version:u.version||"", published:u.published });
    setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  }

  const published = (updates||[]).filter(u=>u.published).length;
  const drafts    = (updates||[]).filter(u=>!u.published).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        <KPICard label="Total Updates"  value={updates?.length??0} icon="🚀" color="#818cf8"/>
        <KPICard label="Published"      value={published}           icon="✓"  color="#34d399"/>
        <KPICard label="Drafts"         value={drafts}              icon=""  color="#fbbf24"/>
        <KPICard label="Users Notified" value={published*0}         icon="👥" color="#38bdf8"/>
      </div>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {saved && <span style={{ fontSize:12, color:"#34d399", fontWeight:700 }}>✓ Saved successfully</span>}
          <Link href="/changelog" target="_blank" style={{ fontSize:12, fontWeight:600, color:"#818cf8", textDecoration:"none" }}>
            View public changelog 
          </Link>
        </div>
        <button onClick={()=>{ setShowForm(v=>!v); setEditing(null); setForm({ title:"", body:"", type:"feature", version:"", published:true }); }}
          style={{ padding:"9px 20px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          {showForm ? "✕ Cancel" : "+ New Update"}
        </button>
      </div>

      {/* Compose / Edit form */}
      {showForm && (
        <div style={{ background:"rgba(99,102,241,.06)", borderRadius:16, border:"1.5px solid rgba(99,102,241,.25)", padding:"22px 24px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:18 }}>
            {editing ? "✎ Edit Update" : "✦ New Update"}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            {/* Title */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Title *</label>
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Multi-currency invoicing is now live"
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(99,102,241,.3)", color:"white", fontSize:14, fontWeight:600, outline:"none", boxSizing:"border-box" }}/>
            </div>
            {/* Type */}
            <div>
              <label style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Type</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {Object.entries(TYPE_CONFIG).map(([k,v])=>(
                  <div key={k} onClick={()=>setForm(f=>({...f,type:k}))}
                    style={{ padding:"5px 12px", borderRadius:20, cursor:"pointer", fontSize:11, fontWeight:700,
                      background:form.type===k?v.bg:"rgba(255,255,255,.04)",
                      border:`1px solid ${form.type===k?v.color:"rgba(255,255,255,.08)"}`,
                      color:form.type===k?v.color:"rgba(255,255,255,.35)" }}>
                    {v.icon} {v.label}
                  </div>
                ))}
              </div>
            </div>
            {/* Version */}
            <div>
              <label style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Version (optional)</label>
              <input value={form.version} onChange={e=>setForm(f=>({...f,version:e.target.value}))} placeholder="v2.4.1"
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"monospace" }}/>
            </div>
            {/* Body */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Description *</label>
              <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} rows={4}
                placeholder="Describe what changed, what's new, or what was fixed..."
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6 }}/>
            </div>
          </div>
          {/* Publish toggle + Save */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div onClick={()=>setForm(f=>({...f,published:!f.published}))}
              style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
              <div style={{ position:"relative", width:40, height:22, borderRadius:11,
                background:form.published?"linear-gradient(135deg,#4f46e5,#7c3aed)":"rgba(255,255,255,.1)", transition:"background .25s" }}>
                <div style={{ position:"absolute", top:3, left:form.published?20:3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left .25s" }}/>
              </div>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:600 }}>{form.published?"Publish immediately":"Save as draft"}</span>
            </div>
            <button onClick={handleSave} disabled={saving||!form.title.trim()||!form.body.trim()}
              style={{ padding:"10px 28px", borderRadius:10, background:saving?"rgba(99,102,241,.3)":"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer" }}>
              {saving?"Saving...": editing?"Update":"Publish Update"}
            </button>
          </div>
        </div>
      )}

      {/* Updates list */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {updates===null ? (
          <div style={{ padding:32, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading...</div>
        ) : updates.length===0 ? (
          <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.15)", fontSize:13 }}>
            <div style={{ fontSize:32, marginBottom:10 }}>🚀</div>
            No updates yet — create your first one!
          </div>
        ) : updates.map(u=>{
          const tc = TYPE_CONFIG[u.type] || TYPE_CONFIG.feature;
          return (
            <div key={u.id} style={{ background:"rgba(255,255,255,.03)", borderRadius:14, border:`1px solid ${u.published?"rgba(255,255,255,.07)":"rgba(251,191,36,.15)"}`, padding:"18px 20px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  {/* Type badge + version */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ padding:"3px 10px", borderRadius:20, background:tc.bg, color:tc.color, fontSize:10, fontWeight:800, letterSpacing:".04em" }}>
                      {tc.icon} {tc.label}
                    </span>
                    {u.version && (
                      <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.4)", fontSize:10, fontWeight:700, fontFamily:"monospace" }}>
                        {u.version}
                      </span>
                    )}
                    {!u.published && (
                      <span style={{ padding:"3px 10px", borderRadius:20, background:"rgba(251,191,36,.1)", color:"#fbbf24", fontSize:10, fontWeight:700 }}>
                        DRAFT
                      </span>
                    )}
                  </div>
                  {/* Title */}
                  <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:6 }}>{u.title}</div>
                  {/* Body */}
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.5)", lineHeight:1.6 }}>{u.body}</div>
                  {/* Date */}
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.2)", marginTop:8 }}>
                    {new Date(u.createdAt).toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" })}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                  {/* Publish toggle */}
                  <button onClick={()=>togglePublish(u)}
                    style={{ padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", border:"none",
                      background:u.published?"rgba(52,211,153,.12)":"rgba(251,191,36,.12)",
                      color:u.published?"#34d399":"#fbbf24" }}>
                    {u.published?"✓ Published":" Draft"}
                  </button>
                  <button onClick={()=>startEdit(u)}
                    style={{ padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer",
                      background:"rgba(99,102,241,.12)", border:"1px solid rgba(99,102,241,.2)", color:"#818cf8" }}>
                    ✎ Edit
                  </button>
                  <button onClick={()=>deleteUpdate(u.id)}
                    style={{ padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer",
                      background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171" }}>
                    ✕ Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function PageVisitors() {
  const [stats,    setStats]    = useState<any>(null);
  const [visitors, setVisitors] = useState<any[]|null>(null);
  const [live,     setLive]     = useState<any[]>([]);
  const [tab,      setTab]      = useState<"map"|"table"|"live">("map");
  const [tooltip,  setTooltip]  = useState<any|null>(null);
  const [range,    setRange]    = useState<"24h"|"7d"|"30d">("7d");

  function load() {
    fetch(`/api/admin/visitors?range=${range}`)
      .then(r=>r.json())
      .then(d=>{ setStats(d.stats||{}); setVisitors(d.rows||[]); setLive(d.live||[]); })
      .catch(()=>{ setStats({}); setVisitors([]); });
  }

  useEffect(()=>{ load(); }, [range]);

  // Poll live visitors every 30s
  useEffect(()=>{
    const t = setInterval(()=>{
      fetch("/api/admin/visitors?range=live")
        .then(r=>r.json()).then(d=>setLive(d.live||[])).catch(()=>{});
    }, 30000);
    return ()=>clearInterval(t);
  }, []);

  // Country → SVG map coords
  const COORDS: Record<string,[number,number]> = {
    PK:[640,220],AE:[610,235],IN:[660,230],SA:[590,240],GB:[470,140],
    US:[200,190],BD:[680,225],QA:[600,240],TR:[555,195],NG:[490,270],
    EG:[545,225],KE:[560,285],ZA:[530,340],AU:[790,360],SG:[730,280],
    MY:[720,275],ID:[740,290],PH:[760,255],JP:[790,210],CN:[720,210],
    DE:[500,155],FR:[480,160],IT:[505,170],ES:[465,170],NL:[490,145],
    CA:[190,165],MX:[180,230],BR:[280,320],AR:[255,370],CO:[235,270],
    RU:[620,150],KZ:[630,190],IR:[605,215],IQ:[590,215],
  };

  const DEVICE_ICON: Record<string,string> = { mobile:"📱", desktop:"💻", tablet:"📟" };
  const maxVisitors = Math.max(...(visitors||[]).map((r:any)=>r.visitors||0), 1);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        {[
          { label:"Total Visits",     value:stats?.totalVisits??0,    icon:"👁",  color:"#818cf8" },
          { label:"Unique Visitors",  value:stats?.uniqueVisitors??0, icon:"👤", color:"#38bdf8" },
          { label:"Countries",        value:stats?.countries??0,       icon:"🌍", color:"#34d399" },
          { label:"Cities",           value:stats?.cities??0,          icon:"🏙", color:"#fbbf24" },
          { label:"Live Now",         value:live.length,               icon:"🔴", color:"#f87171" },
        ].map(k=>(
          <div key={k.label} style={{ background:"rgba(255,255,255,.03)", borderRadius:14, border:"1px solid rgba(255,255,255,.07)", padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:16 }}>{k.icon}</span>
              {k.label==="Live Now" && live.length>0 && (
                <div style={{ width:7,height:7,borderRadius:"50%",background:"#f87171",animation:"blink 1.5s ease infinite" }}/>
              )}
            </div>
            <div style={{ fontSize:24, fontWeight:800, color:k.color }}>{k.value.toLocaleString()}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"space-between" }}>
        {/* Tabs */}
        <div style={{ display:"flex", gap:0, background:"rgba(255,255,255,.04)", borderRadius:12, padding:4, border:"1px solid rgba(255,255,255,.07)" }}>
          {(["map","table","live"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{ padding:"7px 18px", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", textTransform:"capitalize",
                background:tab===t?"linear-gradient(135deg,#4f46e5,#7c3aed)":"transparent",
                color:tab===t?"white":"rgba(255,255,255,.4)" }}>
              {t==="map"?" Map":t==="table"?"📋 Table":"🔴 Live"}
            </button>
          ))}
        </div>
        {/* Range */}
        <div style={{ display:"flex", gap:6 }}>
          {(["24h","7d","30d"] as const).map(r=>(
            <button key={r} onClick={()=>setRange(r)}
              style={{ padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer",
                background:range===r?"rgba(99,102,241,.2)":"rgba(255,255,255,.04)",
                border:`1px solid ${range===r?"rgba(99,102,241,.4)":"rgba(255,255,255,.08)"}`,
                color:range===r?"#818cf8":"rgba(255,255,255,.35)" }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* MAP TAB */}
      {tab==="map" && (
        <GeoLeafletMap rows={(visitors||[]).map((r:any)=>({
          country: r.country,
          countryName: r.countryName,
          activeUsers30d: r.visitors||0,
          companies: r.uniqueVisitors||0,
          topCity: r.topCity,
          flag: r.flag,
        }))} title="Visitor World Map" colorScheme="cyan" liveCount={live.length}/>
      )}

            {/* TABLE TAB */}
      {tab==="table" && (
        <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16 }}>
          {/* Country breakdown */}
          <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.07)", fontSize:12, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".05em" }}>By Country & City</div>
            <div style={{ maxHeight:440, overflowY:"auto" }}>
              {(visitors||[]).length===0 ? (
                <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>No visitor data yet</div>
              ) : (visitors||[]).map((row:any,i:number)=>(
                <div key={row.country} style={{ padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,.04)", display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:20, width:28 }}>{row.flag||"🌐"}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"white" }}>{row.countryName||row.country}</div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:1 }}>📍 {row.topCity||"—"}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#38bdf8" }}>{(row.visitors||0).toLocaleString()}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{row.uniqueVisitors||0} unique</div>
                  </div>
                  <div style={{ width:60 }}>
                    <div style={{ width:"100%", height:4, borderRadius:2, background:"rgba(255,255,255,.07)" }}>
                      <div style={{ width:`${Math.round(((row.visitors||0)/maxVisitors)*100)}%`, height:"100%", borderRadius:2, background:"linear-gradient(90deg,#6366f1,#38bdf8)" }}/>
                    </div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,.25)", textAlign:"right", marginTop:2 }}>
                      {Math.round(((row.visitors||0)/maxVisitors)*100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device + Browser breakdown */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Device type */}
            <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"18px 20px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:14 }}>Device Type</div>
              {[
                { type:"mobile",  label:"Mobile",  icon:"📱", pct: stats?.deviceBreakdown?.mobile||0,  color:"#818cf8" },
                { type:"desktop", label:"Desktop", icon:"💻", pct: stats?.deviceBreakdown?.desktop||0, color:"#38bdf8" },
                { type:"tablet",  label:"Tablet",  icon:"📟", pct: stats?.deviceBreakdown?.tablet||0,  color:"#fbbf24" },
              ].map(d=>(
                <div key={d.type} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.6)" }}>{d.icon} {d.label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:d.color }}>{d.pct}%</span>
                  </div>
                  <div style={{ width:"100%", height:6, borderRadius:3, background:"rgba(255,255,255,.07)" }}>
                    <div style={{ width:`${d.pct}%`, height:"100%", borderRadius:3, background:d.color, transition:"width .5s ease" }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Top pages */}
            <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"18px 20px", flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.5)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:14 }}>Top Pages</div>
              {(stats?.topPages||[
                { page:"/",         visits:0 },
                { page:"/pricing",  visits:0 },
                { page:"/features", visits:0 },
                { page:"/signup",   visits:0 },
              ]).map((p:any,i:number)=>(
                <div key={p.page} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,.25)", width:16 }}>{i+1}</span>
                  <span style={{ flex:1, fontSize:12, color:"rgba(255,255,255,.7)", fontFamily:"monospace" }}>{p.page}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#818cf8" }}>{(p.visits||0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LIVE TAB */}
      {tab==="live" && (
        <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#f87171",animation:"blink 1.5s ease infinite" }}/>
              <span style={{ fontSize:13, fontWeight:700, color:"white" }}>Live Visitors Right Now</span>
              <span style={{ padding:"2px 8px", borderRadius:20, background:"rgba(248,113,113,.12)", color:"#f87171", fontSize:11, fontWeight:700 }}>{live.length}</span>
            </div>
            <span style={{ fontSize:11, color:"rgba(255,255,255,.25)" }}>Refreshes every 30s</span>
          </div>

          {live.length===0 ? (
            <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:10 }}>👁</div>
              No active visitors right now
            </div>
          ) : (
            <div style={{ maxHeight:500, overflowY:"auto" }}>
              {live.map((v:any,i:number)=>(
                <div key={i} style={{ padding:"12px 18px", borderBottom:"1px solid rgba(255,255,255,.04)", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:"#34d399",flexShrink:0,animation:"blink 2s ease infinite" }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"white" }}>{v.countryName||v.country||"Unknown"}</span>
                      {v.city && <span style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>📍 {v.city}</span>}
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:2, fontFamily:"monospace" }}>{v.page||"/"}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,.4)" }}>{DEVICE_ICON[v.device]||"💻"} {v.device||"desktop"}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.2)", marginTop:2 }}>{v.duration||"0s"} on page</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ad targeting suggestion box */}
      {(visitors||[]).length > 0 && (
        <div style={{ background:"rgba(251,191,36,.05)", borderRadius:14, border:"1px solid rgba(251,191,36,.2)", padding:"16px 20px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#fbbf24", textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>Ad Targeting Suggestion</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {(visitors||[]).slice(0,5).map((row:any)=>(
              <div key={row.country} style={{ padding:"6px 14px", borderRadius:20, background:"rgba(251,191,36,.1)", border:"1px solid rgba(251,191,36,.2)", fontSize:12, color:"rgba(255,255,255,.7)" }}>
                📍 {row.topCity&&`${row.topCity}, `}{row.countryName||row.country} — <strong style={{ color:"#fbbf24" }}>{row.visitors} visits</strong>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginTop:10 }}>These are your highest traffic locations — ideal for targeted ads on Google/Meta</div>
        </div>
      )}

    </div>
  );
}


function PageTickets() {
  const [tickets, setTickets]     = useState<any[]|null>(null);
  const [selected, setSelected]   = useState<any|null>(null);
  const [reply, setReply]         = useState("");
  const [filter, setFilter]       = useState("all");
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    fetch("/api/admin/tickets")
      .then(r=>r.json())
      .then(d=>setTickets(d.tickets||[]))
      .catch(()=>setTickets([]));
  }, []);

  async function handleReply() {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await fetch("/api/admin/tickets", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"REPLY", ticketId: selected.id, message: reply }),
      });
      setTickets(ts => (ts||[]).map(t => t.id===selected.id ? { ...t, status:"answered", replies:(t.replies||0)+1 } : t));
      setSelected((t:any) => t ? { ...t, status:"answered" } : t);
      setReply("");
    } catch {}
    setSending(false);
  }

  async function handleStatus(id:string, status:string) {
    await fetch("/api/admin/tickets", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"UPDATE_STATUS", ticketId:id, status }),
    }).catch(()=>{});
    setTickets(ts=>(ts||[]).map(t=>t.id===id?{...t,status}:t));
    if (selected?.id===id) setSelected((t:any)=>t?{...t,status}:t);
  }

  const STATUS_COLOR: Record<string,[string,string]> = {
    open:     ["#f87171","rgba(248,113,113,.12)"],
    answered: ["#fbbf24","rgba(251,191,36,.12)"],
    closed:   ["#34d399","rgba(52,211,153,.12)"],
    pending:  ["#818cf8","rgba(129,140,248,.12)"],
  };

  const filtered = (tickets||[]).filter(t => filter==="all" || t.status===filter);
  const counts   = { all:(tickets||[]).length, open:(tickets||[]).filter(t=>t.status==="open").length, answered:(tickets||[]).filter(t=>t.status==="answered").length, closed:(tickets||[]).filter(t=>t.status==="closed").length };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Total Tickets",  value:counts.all,      color:"#818cf8" },
          { label:"Open",           value:counts.open,     color:"#f87171" },
          { label:"Answered",       value:counts.answered, color:"#fbbf24" },
          { label:"Closed",         value:counts.closed,   color:"#34d399" },
        ].map(k=>(
          <div key={k.label} style={{ background:"rgba(255,255,255,.03)", borderRadius:14, border:"1px solid rgba(255,255,255,.07)", padding:"16px 18px" }}>
            <div style={{ fontSize:24, fontWeight:800, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:16 }}>
        {/* Ticket list */}
        <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
          {/* Filter tabs */}
          <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
            {["all","open","answered","closed"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                style={{ flex:1, padding:"10px 0", fontSize:11, fontWeight:700, background:"none", border:"none", cursor:"pointer", textTransform:"capitalize",
                  color: filter===f ? "#818cf8" : "rgba(255,255,255,.35)",
                  borderBottom: filter===f ? "2px solid #6366f1" : "2px solid transparent" }}>
                {f}
              </button>
            ))}
          </div>
          {/* List */}
          <div style={{ maxHeight:480, overflowY:"auto" }}>
            {tickets===null ? (
              <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>Loading...</div>
            ) : filtered.length===0 ? (
              <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>No tickets</div>
            ) : filtered.map(t=>{
              const [sc,sb] = STATUS_COLOR[t.status]||["#818cf8","rgba(129,140,248,.12)"];
              return (
                <div key={t.id} onClick={()=>setSelected(t)}
                  style={{ padding:"14px 16px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,.05)",
                    background: selected?.id===t.id ? "rgba(99,102,241,.12)" : "transparent",
                    transition:"background .15s" }}
                  onMouseEnter={e=>{ if(selected?.id!==t.id) e.currentTarget.style.background="rgba(255,255,255,.03)"; }}
                  onMouseLeave={e=>{ if(selected?.id!==t.id) e.currentTarget.style.background="transparent"; }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"white", lineHeight:1.3 }}>{t.subject||"(no subject)"}</span>
                    <span style={{ padding:"2px 8px", borderRadius:20, background:sb, color:sc, fontSize:10, fontWeight:700, flexShrink:0 }}>{t.status}</span>
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:5 }}>{t.userEmail||t.companyName||"Unknown"} · {t.createdAt?.slice(0,10)||""}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ticket detail */}
        <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"20px" }}>
          {!selected ? (
            <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.15)", fontSize:13 }}>
              Select a ticket to view
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:14, height:"100%" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"white" }}>{selected.subject}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:3 }}>{selected.userEmail} · #{selected.id?.slice(0,8)}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {["open","answered","closed"].map(s=>(
                    <button key={s} onClick={()=>handleStatus(selected.id,s)}
                      style={{ padding:"5px 12px", borderRadius:8, fontSize:11, fontWeight:700, cursor:"pointer", textTransform:"capitalize",
                        background: selected.status===s ? "rgba(99,102,241,.25)" : "rgba(255,255,255,.05)",
                        border: `1px solid ${selected.status===s?"rgba(99,102,241,.5)":"rgba(255,255,255,.1)"}`,
                        color: selected.status===s ? "#818cf8" : "rgba(255,255,255,.4)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding:"14px", borderRadius:10, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", fontSize:13, color:"rgba(255,255,255,.7)", lineHeight:1.6, minHeight:80 }}>
                {selected.message||"No message body"}
              </div>
              {/* Reply box */}
              <div style={{ marginTop:"auto" }}>
                <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.4)", letterSpacing:".05em", textTransform:"uppercase", marginBottom:8 }}>Reply</div>
                <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3} placeholder="Type your reply..."
                  style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
                <button onClick={handleReply} disabled={sending||!reply.trim()}
                  style={{ marginTop:8, padding:"9px 22px", borderRadius:10, background:sending||!reply.trim()?"rgba(99,102,241,.2)":"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:sending||!reply.trim()?"not-allowed":"pointer" }}>
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: EMAIL BROADCASTS
═══════════════════════════════════════════════════════ */
function PageBroadcasts() {
  const [tab, setTab]           = useState<"compose"|"history">("compose");
  const [form, setForm]         = useState({ subject:"", body:"", audience:"all", plan:"", channel:"email" });
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [history, setHistory]   = useState<any[]|null>(null);
  const [preview, setPreview]   = useState(false);

  useEffect(() => {
    if (tab==="history") {
      fetch("/api/admin/broadcasts")
        .then(r=>r.json())
        .then(d=>setHistory(d.broadcasts||[]))
        .catch(()=>setHistory([]));
    }
  }, [tab]);

  async function handleSend() {
    if (form.channel==="email" && !form.subject.trim()) return;
    if (!form.body.trim()) return;
    setSending(true);
    try {
      await fetch("/api/admin/broadcasts", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(form),
      });
      setSent(true);
      setForm({ subject:"", body:"", audience:"all", plan:"", channel:form.channel });
      setTimeout(()=>setSent(false), 4000);
    } catch {}
    setSending(false);
  }

  const AUDIENCE_OPTS = [
    { value:"all",        label:"All Users",          icon:"", desc:"Every registered user" },
    { value:"active",     label:"Active Subscribers", icon:"✦", desc:"Paid plan users only" },
    { value:"trial",      label:"Trial Users",        icon:"", desc:"Currently on trial" },
    { value:"churned",    label:"Churned Users",      icon:"⚠", desc:"Cancelled subscriptions" },
    { value:"plan",       label:"By Plan",            icon:"⬡", desc:"Specific plan only" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Tabs */}
      <div style={{ display:"flex", gap:0, background:"rgba(255,255,255,.04)", borderRadius:12, padding:4, width:"fit-content", border:"1px solid rgba(255,255,255,.07)" }}>
        {(["compose","history"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:"8px 22px", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", border:"none", textTransform:"capitalize",
              background: tab===t ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "transparent",
              color: tab===t ? "white" : "rgba(255,255,255,.4)" }}>
            {t==="compose" ? "✉ Compose" : "📋 History"}
          </button>
        ))}
      </div>

      {tab==="compose" ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          {/* Form */}
          <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"22px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:16 }}>New Broadcast</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Channel */}
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".05em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Channel</label>
                <div style={{ display:"flex", gap:6 }}>
                  {[{val:"email",icon:"📧",label:"Email"},{val:"whatsapp",icon:"💬",label:"WhatsApp"},{val:"sms",icon:"📱",label:"SMS"}].map(ch=>(
                    <button key={ch.val} onClick={()=>setForm(f=>({...f,channel:ch.val}))}
                      style={{ flex:1, padding:"8px 10px", borderRadius:9, border:`1px solid ${form.channel===ch.val?"rgba(99,102,241,.5)":"rgba(255,255,255,.08)"}`,
                        background:form.channel===ch.val?"rgba(99,102,241,.18)":"rgba(255,255,255,.03)", color:form.channel===ch.val?"#818cf8":"rgba(255,255,255,.4)",
                        fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      {ch.icon} {ch.label}
                    </button>
                  ))}
                </div>
                {form.channel==="whatsapp" && (
                  <div style={{ marginTop:8, padding:"8px 12px", borderRadius:8, background:"rgba(251,191,36,.08)", border:"1px solid rgba(251,191,36,.2)", fontSize:11, color:"#fbbf24" }}>
                    Sends via WhatsApp Business API (WHATSAPP_TOKEN required in .env)
                  </div>
                )}
                {form.channel==="sms" && (
                  <div style={{ marginTop:8, padding:"8px 12px", borderRadius:8, background:"rgba(129,140,248,.08)", border:"1px solid rgba(129,140,248,.2)", fontSize:11, color:"#818cf8" }}>
                    SMS sending requires an SMS provider integration
                  </div>
                )}
              </div>
              {/* Audience */}
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".05em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Audience</label>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {AUDIENCE_OPTS.map(o=>(
                    <div key={o.value} onClick={()=>setForm(f=>({...f,audience:o.value}))}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, cursor:"pointer",
                        background: form.audience===o.value ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.03)",
                        border: `1px solid ${form.audience===o.value ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}` }}>
                      <span style={{ fontSize:14, color:"#818cf8" }}>{o.icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"white" }}>{o.label}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>{o.desc}</div>
                      </div>
                      {form.audience===o.value && <span style={{ fontSize:12, color:"#6366f1" }}>✓</span>}
                    </div>
                  ))}
                </div>
                {form.audience==="plan" && (
                  <select value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}
                    style={{ marginTop:8, width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:12, outline:"none" }}>
                    <option value="">Select plan...</option>
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                )}
              </div>
              {/* Subject — email only */}
              {form.channel==="email" && (
                <div>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".05em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Subject</label>
                  <input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Email subject line..."
                    style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none", boxSizing:"border-box" }}/>
                </div>
              )}
              {/* Body */}
              <div>
                <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".05em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
                  {form.channel==="email" ? "Message Body" : "Message"}
                </label>
                <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} rows={form.channel==="email"?6:4}
                  placeholder={form.channel==="email" ? "Write your email message..." : form.channel==="whatsapp" ? "Write your WhatsApp message..." : "Write your SMS message..."}
                  style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
              </div>
              {sent && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontSize:12, fontWeight:600 }}>✓ Broadcast sent successfully!</div>}
              <div style={{ display:"flex", gap:10 }}>
                {form.channel==="email" && (
                  <button onClick={()=>setPreview(v=>!v)}
                    style={{ padding:"9px 18px", borderRadius:10, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.6)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    {preview ? "Hide" : "Preview"}
                  </button>
                )}
                <button onClick={handleSend} disabled={sending||(form.channel==="email"&&!form.subject.trim())||!form.body.trim()}
                  style={{ flex:1, padding:"9px 18px", borderRadius:10, background:sending?"rgba(99,102,241,.2)":"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:sending?"not-allowed":"pointer" }}>
                  {sending ? "Sending..." : form.channel==="email" ? "📣 Send Email Broadcast" : form.channel==="whatsapp" ? "💬 Send WhatsApp" : "📱 Send SMS"}
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"22px" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:16 }}>
              {form.channel==="email" ? "Email Preview" : form.channel==="whatsapp" ? "WhatsApp Preview" : "SMS Preview"}
            </div>
            {form.channel==="email" ? (
              !preview ? (
                <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,.15)", fontSize:12 }}>Click Preview to see email</div>
              ) : (
                <div style={{ background:"white", borderRadius:10, padding:"24px", color:"#111", fontFamily:"Arial,sans-serif" }}>
                  <div style={{ borderBottom:"2px solid #4f46e5", paddingBottom:12, marginBottom:16 }}>
                    <div style={{ fontSize:18, fontWeight:800, color:"#4f46e5" }}>FinovaOS</div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#111", marginBottom:12 }}>{form.subject||"(no subject)"}</div>
                  <div style={{ fontSize:13, color:"#444", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{form.body||"(empty)"}</div>
                  <div style={{ marginTop:20, paddingTop:12, borderTop:"1px solid #eee", fontSize:11, color:"#999" }}>FinovaOS · Unsubscribe</div>
                </div>
              )
            ) : (
              <div style={{ background:"rgba(37,211,102,.06)", border:"1px solid rgba(37,211,102,.2)", borderRadius:12, padding:16, maxWidth:320 }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", marginBottom:8 }}>
                  {form.channel==="whatsapp" ? "💬 WhatsApp Business" : "📱 SMS"}
                </div>
                <div style={{ background:"rgba(255,255,255,.07)", borderRadius:10, padding:"10px 14px", fontSize:13, color:"rgba(255,255,255,.8)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>
                  {form.body||"(empty message)"}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* History tab */
        <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"20px 22px" }}>
          <DataTable
            rows={history}
            cols={[
              { key:"subject",    label:"Subject",   render:(v:any)=><span style={{ fontWeight:600, color:"white" }}>{v}</span> },
              { key:"audience",   label:"Audience",  render:(v:any)=><span style={{ color:"#818cf8", textTransform:"capitalize" }}>{v}</span> },
              { key:"sentTo",     label:"Recipients",align:"right" },
              { key:"openRate",   label:"Open Rate", align:"right", render:(v:any)=><span style={{ color:"#34d399", fontWeight:700 }}>{v||0}%</span> },
              { key:"createdAt",  label:"Sent",      render:(v:any)=>v?.slice(0,10)||"—" },
            ]}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: FEATURE FLAGS
═══════════════════════════════════════════════════════ */
function PageFlags() {
  const [flags, setFlags]       = useState<any[]|null>(null);
  const [saving, setSaving]     = useState<string|null>(null);
  const [newFlag, setNewFlag]   = useState({ name:"", description:"", enabled:true });
  const [adding, setAdding]     = useState(false);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    fetch("/api/admin/feature-flags")
      .then(r=>r.json())
      .then(d=>setFlags(d.flags||[]))
      .catch(()=>setFlags([]));
  }, []);

  async function toggle(flag: any) {
    setSaving(flag.id);
    const updated = { ...flag, enabled: !flag.enabled };
    try {
      await fetch("/api/admin/feature-flags", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"TOGGLE", id:flag.id, enabled:!flag.enabled }),
      });
      setFlags(fs=>(fs||[]).map(f=>f.id===flag.id ? updated : f));
    } catch {}
    setSaving(null);
  }

  async function addFlag() {
    if (!newFlag.name.trim()) return;
    setSaving("new");
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"CREATE", ...newFlag }),
      });
      const d = await res.json();
      setFlags(fs=>[...(fs||[]), d.flag||{ id:Date.now().toString(), ...newFlag, rollout:100, createdAt:new Date().toISOString() }]);
      setNewFlag({ name:"", description:"", enabled:true });
      setAdding(false);
    } catch {}
    setSaving(null);
  }

  async function deleteFlag(id:string) {
    if (!await confirmToast("Delete this feature flag?")) return;
    await fetch("/api/admin/feature-flags", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"DELETE", id }),
    }).catch(()=>{});
    setFlags(fs=>(fs||[]).filter(f=>f.id!==id));
  }

  const filtered = (flags||[]).filter(f =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase())
  );
  const enabled  = (flags||[]).filter(f=>f.enabled).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KPICard label="Total Flags"   value={flags?.length??0}        icon="⚑" color="#818cf8"/>
        <KPICard label="Enabled"       value={enabled}                  icon="✓" color="#34d399"/>
        <KPICard label="Disabled"      value={(flags?.length??0)-enabled} icon="" color="#f87171"/>
      </div>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search flags..."
          style={{ flex:1, padding:"9px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none" }}/>
        <button onClick={()=>setAdding(v=>!v)}
          style={{ padding:"9px 18px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
          + New Flag
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background:"rgba(99,102,241,.08)", borderRadius:14, border:"1px solid rgba(99,102,241,.25)", padding:"18px 20px", display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ flex:2, minWidth:160 }}>
            <label style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Flag Key</label>
            <input value={newFlag.name} onChange={e=>setNewFlag(f=>({...f,name:e.target.value.replace(/ /g,"_").toLowerCase()}))} placeholder="feature_new_dashboard"
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", fontSize:13, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div style={{ flex:3, minWidth:200 }}>
            <label style={{ fontSize:10, color:"rgba(255,255,255,.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:5 }}>Description</label>
            <input value={newFlag.description} onChange={e=>setNewFlag(f=>({...f,description:e.target.value}))} placeholder="What does this flag control?"
              style={{ width:"100%", padding:"9px 12px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"white", fontSize:13, outline:"none", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setAdding(false)}
              style={{ padding:"9px 14px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.4)", fontSize:12, cursor:"pointer" }}>Cancel</button>
            <button onClick={addFlag} disabled={saving==="new"||!newFlag.name.trim()}
              style={{ padding:"9px 18px", borderRadius:9, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {saving==="new" ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Flags list */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
        {flags===null ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>Loading...</div>
        ) : filtered.length===0 ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>No feature flags yet</div>
        ) : filtered.map((f,i)=>(
          <div key={f.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom: i<filtered.length-1?"1px solid rgba(255,255,255,.05)":"none" }}>
            {/* Toggle */}
            <div onClick={()=>toggle(f)} style={{ position:"relative", width:40, height:22, borderRadius:11, cursor:"pointer", flexShrink:0,
              background: f.enabled ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "rgba(255,255,255,.1)",
              transition:"background .25s", opacity: saving===f.id ? .6 : 1 }}>
              <div style={{ position:"absolute", top:3, left: f.enabled?20:3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left .25s", boxShadow:"0 1px 4px rgba(0,0,0,.4)" }}/>
            </div>
            {/* Info */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:700, color:"white", fontFamily:"monospace" }}>{f.name}</span>
                <span style={{ padding:"2px 7px", borderRadius:20, background: f.enabled?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)", color: f.enabled?"#34d399":"#f87171", fontSize:10, fontWeight:700 }}>
                  {f.enabled ? "ON" : "OFF"}
                </span>
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:2 }}>{f.description||"No description"}</div>
            </div>
            {/* Rollout */}
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#818cf8" }}>{f.rollout??100}%</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>rollout</div>
            </div>
            {/* Updated */}
            <div style={{ fontSize:11, color:"rgba(255,255,255,.2)", width:80, textAlign:"right", flexShrink:0 }}>{f.updatedAt?.slice(0,10)||f.createdAt?.slice(0,10)||"—"}</div>
            {/* Delete */}
            <button onClick={()=>deleteFlag(f.id)}
              style={{ padding:"5px 10px", borderRadius:7, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.2)", color:"#f87171", fontSize:11, cursor:"pointer", flexShrink:0 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: API KEYS MANAGER
═══════════════════════════════════════════════════════ */
function PageApiKeys() {
  const [keys, setKeys]         = useState<any[]|null>(null);
  const [search, setSearch]     = useState("");
  const [revoking, setRevoking] = useState<string|null>(null);
  const [copied, setCopied]     = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/admin/api-keys")
      .then(r=>r.json())
      .then(d=>setKeys(d.keys||[]))
      .catch(()=>setKeys([]));
  }, []);

  async function revoke(id:string, companyName:string) {
    if (!await confirmToast(`Revoke API key for ${companyName}? This cannot be undone.`)) return;
    setRevoking(id);
    try {
      await fetch("/api/admin/api-keys", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ action:"REVOKE", id }),
      });
      setKeys(ks=>(ks||[]).map(k=>k.id===id ? { ...k, status:"revoked", revokedAt:new Date().toISOString() } : k));
    } catch {}
    setRevoking(null);
  }

  function copyKey(key:string, id:string) {
    navigator.clipboard.writeText(key).then(()=>{
      setCopied(id);
      setTimeout(()=>setCopied(null), 2000);
    });
  }

  const filtered = (keys||[]).filter(k =>
    !search ||
    k.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    k.keyPreview?.toLowerCase().includes(search.toLowerCase())
  );

  const active  = (keys||[]).filter(k=>k.status==="active").length;
  const revoked = (keys||[]).filter(k=>k.status==="revoked").length;

  const STATUS_STYLE: Record<string,[string,string]> = {
    active:  ["#34d399","rgba(52,211,153,.12)"],
    revoked: ["#f87171","rgba(248,113,113,.12)"],
    expired: ["#fbbf24","rgba(251,191,36,.12)"],
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        <KPICard label="Total Keys"  value={keys?.length??0} icon="🔑" color="#818cf8"/>
        <KPICard label="Active"      value={active}          icon="✓"  color="#34d399"/>
        <KPICard label="Revoked"     value={revoked}         icon=""  color="#f87171"/>
      </div>

      {/* Search */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by company or key..."
        style={{ padding:"9px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none" }}/>

      {/* Keys table */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 80px", gap:0, padding:"10px 18px", borderBottom:"1px solid rgba(255,255,255,.07)", fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", letterSpacing:".05em", textTransform:"uppercase" }}>
          <span>Company</span><span>Key</span><span>Status</span><span>Last Used</span><span>Created</span><span style={{ textAlign:"right" }}>Action</span>
        </div>
        {keys===null ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>Loading...</div>
        ) : filtered.length===0 ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:12 }}>No API keys found</div>
        ) : filtered.map((k,i)=>{
          const [sc,sb] = STATUS_STYLE[k.status]||["#818cf8","rgba(129,140,248,.12)"];
          return (
            <div key={k.id} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 80px", gap:0, padding:"13px 18px", borderBottom: i<filtered.length-1?"1px solid rgba(255,255,255,.04)":"none", alignItems:"center" }}>
              <span style={{ fontSize:13, fontWeight:600, color:"white" }}>{k.companyName||"—"}</span>
              {/* Key with copy */}
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <code style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontFamily:"monospace", background:"rgba(255,255,255,.05)", padding:"3px 8px", borderRadius:6 }}>
                  {k.keyPreview||"sk-...****"}
                </code>
                <button onClick={()=>copyKey(k.key||k.keyPreview||"", k.id)}
                  style={{ padding:"3px 8px", borderRadius:6, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.25)", color:"#818cf8", fontSize:10, cursor:"pointer" }}>
                  {copied===k.id ? "✓" : "Copy"}
                </button>
              </div>
              <span style={{ padding:"3px 10px", borderRadius:20, background:sb, color:sc, fontSize:10, fontWeight:700, width:"fit-content" }}>{k.status}</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{k.lastUsed?.slice(0,10)||"Never"}</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{k.createdAt?.slice(0,10)||"—"}</span>
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                {k.status==="active" ? (
                  <button onClick={()=>revoke(k.id, k.companyName||"this company")} disabled={revoking===k.id}
                    style={{ padding:"5px 12px", borderRadius:7, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:11, fontWeight:700, cursor:revoking===k.id?"not-allowed":"pointer" }}>
                    {revoking===k.id ? "..." : "Revoke"}
                  </button>
                ) : (
                  <span style={{ fontSize:11, color:"rgba(255,255,255,.2)" }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function PageProfile({ setPage }: { setPage:(p:any)=>void }) {
  const [admin, setAdmin]       = useState({ name:"Super Admin", email:"finovaos.app@gmail.com", role:"ADMIN", joined:"2024-01-01" });
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ name:"Super Admin", email:"finovaos.app@gmail.com" });
  const [pwForm, setPwForm]     = useState({ current:"", next:"", confirm:"" });
  const [pwMsg, setPwMsg]       = useState<{type:"ok"|"err"; text:string}|null>(null);
  const [saved, setSaved]       = useState(false);

  function handleSave() {
    setAdmin(a=>({ ...a, name:form.name, email:form.email }));
    setEditing(false);
    setSaved(true);
    setTimeout(()=>setSaved(false), 3000);
  }

  async function handlePwChange() {
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type:"err", text:"New passwords do not match" }); return; }
    if (pwForm.next.length < 8)         { setPwMsg({ type:"err", text:"Min 8 characters required" }); return; }
    try {
      const res = await fetch("/api/admin/auth/change-password", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      if (res.ok) { setPwMsg({ type:"ok", text:"Password changed successfully" }); setPwForm({ current:"", next:"", confirm:"" }); }
      else { const d = await res.json(); setPwMsg({ type:"err", text: d.error||"Failed" }); }
    } catch { setPwMsg({ type:"err", text:"Network error" }); }
  }

  const statItems = [
    { label:"Role",        value:"Super Admin",  icon:"", color:"#818cf8" },
    { label:"Status",      value:"Active",        icon:"", color:"#34d399" },
    { label:"Last Login",  value:"Just now",      icon:"", color:"#38bdf8" },
    { label:"Member Since",value:admin.joined.slice(0,7), icon:"✦", color:"#fbbf24" },
  ];

  return (
    <div style={{ maxWidth:700, margin:"0 auto", display:"flex", flexDirection:"column", gap:18 }}>

      {/* Profile Card */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:20, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
        {/* Banner */}
        <div style={{ height:90, background:"linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)", position:"relative" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 20% 50%, rgba(99,102,241,.3) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(139,92,246,.25) 0%, transparent 55%)" }}/>
        </div>
        {/* Avatar row */}
        <div style={{ padding:"0 28px 24px", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginTop:-30 }}>
            <div style={{ width:72, height:72, borderRadius:18, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:800, color:"white", border:"3px solid #080c1e", flexShrink:0 }}>A</div>
            <div style={{ display:"flex", gap:10, marginBottom:4 }}>
              {saved && (
                <div style={{ padding:"6px 14px", borderRadius:8, background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontSize:12, fontWeight:600 }}>✓ Saved</div>
              )}
              {editing ? (
                <>
                  <button onClick={()=>setEditing(false)}
                    style={{ padding:"7px 16px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.5)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    Cancel
                  </button>
                  <button onClick={handleSave}
                    style={{ padding:"7px 18px", borderRadius:9, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    Save Changes
                  </button>
                </>
              ) : (
                <button onClick={()=>{ setEditing(true); setForm({ name:admin.name, email:admin.email }); }}
                  style={{ padding:"7px 18px", borderRadius:9, background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", color:"#818cf8", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  ✎ Edit Profile
                </button>
              )}
            </div>
          </div>

          {editing ? (
            <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:12 }}>
              {[{ label:"Display Name", key:"name", placeholder:"Admin name" }, { label:"Email", key:"email", placeholder:"finovaos.app@gmail.com" }].map(f=>(
                <div key={f.key}>
                  <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".05em", textTransform:"uppercase", display:"block", marginBottom:5 }}>{f.label}</label>
                  <input value={(form as any)[f.key]}
                    onChange={e=>setForm(p=>({ ...p, [f.key]:e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(99,102,241,.3)", color:"white", fontSize:13, outline:"none", boxSizing:"border-box" }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:22, fontWeight:800, color:"white", letterSpacing:"-.02em" }}>{admin.name}</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:3 }}>{admin.email}</div>
            </div>
          )}

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginTop:22 }}>
            {statItems.map(s=>(
              <div key={s.label} style={{ background:"rgba(255,255,255,.04)", borderRadius:12, border:"1px solid rgba(255,255,255,.06)", padding:"12px 14px" }}>
                <div style={{ fontSize:16, marginBottom:4 }}><span style={{ color:s.color }}>{s.icon}</span></div>
                <div style={{ fontSize:13, fontWeight:700, color:"white" }}>{s.value}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,.35)", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:"22px 26px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:16 }}>Change Password</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { label:"Current Password",  key:"current",  ph:"Enter current password" },
            { label:"New Password",      key:"next",     ph:"Min 8 characters" },
            { label:"Confirm Password",  key:"confirm",  ph:"Repeat new password" },
          ].map(f=>(
            <div key={f.key}>
              <label style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, letterSpacing:".05em", textTransform:"uppercase", display:"block", marginBottom:5 }}>{f.label}</label>
              <input type="password" value={(pwForm as any)[f.key]}
                onChange={e=>setPwForm(p=>({ ...p, [f.key]:e.target.value }))}
                placeholder={f.ph}
                style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, outline:"none", boxSizing:"border-box" }}
              />
            </div>
          ))}
          {pwMsg && (
            <div style={{ padding:"10px 14px", borderRadius:9, background:pwMsg.type==="ok"?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)", border:`1px solid ${pwMsg.type==="ok"?"rgba(52,211,153,.3)":"rgba(248,113,113,.3)"}`, color:pwMsg.type==="ok"?"#34d399":"#f87171", fontSize:12, fontWeight:600 }}>
              {pwMsg.text}
            </div>
          )}
          <button onClick={handlePwChange}
            style={{ alignSelf:"flex-start", padding:"9px 22px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            Update Password
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ background:"rgba(248,113,113,.04)", borderRadius:16, border:"1px solid rgba(248,113,113,.15)", padding:"22px 26px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:"#f87171", letterSpacing:".04em", textTransform:"uppercase", marginBottom:10 }}>Session</div>
        <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", margin:"0 0 14px" }}>Sign out from all devices and end your current admin session.</p>
        <button onClick={()=>{ clearCurrentUser(); window.location.href="/admin/login"; }}
          style={{ padding:"9px 22px", borderRadius:10, background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.3)", color:"#f87171", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          ⎋ Sign Out
        </button>
      </div>

    </div>
  );
}


/* ═══════════════════════════════════════════════════════
   PAGE: SUBSCRIPTIONS
═══════════════════════════════════════════════════════ */
function PageSubscriptions() {
  const [subs,    setSubs]    = useState<any[]|null>(null);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<"all"|"ACTIVE"|"CANCELLED"|"TRIALING"|"PAST_DUE">("all");
  const [acting,  setActing]  = useState<string|null>(null);

  function adminHeaders() {
    const uu = getAdminUser();
    const h: Record<string,string> = { "Content-Type":"application/json" };
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  useEffect(() => {
    fetch("/api/admin/subscriptions", { headers: adminHeaders() })
      .then(r=>r.json()).then(d=>setSubs(d.subscriptions||[])).catch(()=>setSubs([]));
  }, []);

  async function doAction(id: string, action: "cancel"|"activate") {
    setActing(id);
    try {
      await fetch("/api/admin/subscriptions", {
        method:"PATCH", headers: adminHeaders(),
        body: JSON.stringify({ id, action }),
      });
      setSubs(prev=>(prev||[]).map(s=>s.id===id ? { ...s, status: action==="cancel"?"CANCELLED":"ACTIVE" } : s));
    } catch {}
    setActing(null);
  }

  const STATUS_COLOR: Record<string,[string,string]> = {
    ACTIVE:    ["#34d399","rgba(52,211,153,.12)"],
    TRIALING:  ["#818cf8","rgba(129,140,248,.12)"],
    PAST_DUE:  ["#fbbf24","rgba(251,191,36,.12)"],
    CANCELLED: ["#f87171","rgba(248,113,113,.12)"],
  };

  const filtered = (subs||[]).filter(s => {
    const mf = filter==="all" || s.status===filter;
    const ms = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return mf && ms;
  });

  const totalMRR = (subs||[]).filter(s=>s.status==="ACTIVE"||s.status==="TRIALING").reduce((a,s)=>a+s.mrr,0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Total MRR", value:`$${totalMRR.toLocaleString()}`, color:"#34d399" },
          { label:"Active", value:(subs||[]).filter(s=>s.status==="ACTIVE").length, color:"#818cf8" },
          { label:"Trialing", value:(subs||[]).filter(s=>s.status==="TRIALING").length, color:"#fbbf24" },
          { label:"Cancelled", value:(subs||[]).filter(s=>s.status==="CANCELLED").length, color:"#f87171" },
        ].map(stat=>(
          <div key={stat.label} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{stat.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <SectionCard title="All Subscriptions">
        {/* Toolbar */}
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company…"
            style={{ flex:1, minWidth:160, padding:"7px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none", fontFamily:"inherit" }}/>
          <div style={{ display:"flex", gap:4 }}>
            {(["all","ACTIVE","TRIALING","PAST_DUE","CANCELLED"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:10.5, fontWeight:700, padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit",
                background:filter===f?"rgba(99,102,241,.7)":"rgba(255,255,255,.06)",
                color:filter===f?"white":"rgba(255,255,255,.35)" }}>
                {f==="all"?"All":f.charAt(0)+f.slice(1).toLowerCase().replace("_"," ")}
              </button>
            ))}
          </div>
        </div>

        {subs===null ? (
          <div style={{ textAlign:"center", padding:30, color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:30, color:"rgba(255,255,255,.2)", fontSize:13 }}>No subscriptions found.</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr>
                  {["Company","Plan","Status","MRR","Users","Period End","Actions"].map(h=>(
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", color:"rgba(255,255,255,.3)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid rgba(255,255,255,.07)", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const [tc,bc] = STATUS_COLOR[s.status] || ["#94a3b8","rgba(148,163,184,.1)"];
                  return (
                    <tr key={s.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <td style={{ padding:"10px 12px", color:"white", fontWeight:600 }}>{s.name}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(129,140,248,.12)", color:"#818cf8", fontSize:11, fontWeight:700, textTransform:"capitalize" }}>{s.plan||"—"}</span>
                      </td>
                      <td style={{ padding:"10px 12px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:6, background:bc, color:tc, fontSize:11, fontWeight:700 }}>{s.status}</span>
                      </td>
                      <td style={{ padding:"10px 12px", color:"#34d399", fontWeight:700 }}>${s.mrr}/mo</td>
                      <td style={{ padding:"10px 12px", color:"rgba(255,255,255,.5)" }}>{s.userCount}</td>
                      <td style={{ padding:"10px 12px", color:"rgba(255,255,255,.4)", fontSize:11.5 }}>
                        {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding:"10px 12px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          {s.status!=="CANCELLED" ? (
                            <button onClick={()=>doAction(s.id,"cancel")} disabled={acting===s.id}
                              style={{ padding:"4px 10px", borderRadius:6, border:"1px solid rgba(248,113,113,.3)", background:"rgba(248,113,113,.1)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer", opacity:acting===s.id?.6:1 }}>
                              {acting===s.id?"…":"Cancel"}
                            </button>
                          ) : (
                            <button onClick={()=>doAction(s.id,"activate")} disabled={acting===s.id}
                              style={{ padding:"4px 10px", borderRadius:6, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.1)", color:"#34d399", fontSize:11, fontWeight:700, cursor:"pointer", opacity:acting===s.id?.6:1 }}>
                              {acting===s.id?"…":"Activate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: BUSINESS MODULES
═══════════════════════════════════════════════════════ */
const PHASE_META: Record<number,{label:string;color:string;bg:string}> = {
  1: { label:"Phase 1 — Live",        color:"#34d399", bg:"rgba(52,211,153,.1)"  },
  2: { label:"Phase 2 — Commerce+",   color:"#60a5fa", bg:"rgba(96,165,250,.1)"  },
  3: { label:"Phase 3 — Services",    color:"#a78bfa", bg:"rgba(167,139,250,.1)" },
  4: { label:"Phase 4 — Specialised", color:"#f59e0b", bg:"rgba(245,158,11,.1)"  },
};

function PageBusinessModules() {
  const [modules,      setModules]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState<string|null>(null);
  const [filter,       setFilter]       = useState<"all"|"live"|"coming_soon">("all");
  const [search,       setSearch]       = useState("");
  const [msg,          setMsg]          = useState<{text:string;ok:boolean}|null>(null);
  const [releasing,    setReleasing]    = useState<number|null>(null);

  function adminHeaders(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/business-modules", { headers: adminHeaders() });
      const d = await r.json();
      setModules(d.modules || []);
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); }, []);

  function showMsg(text: string, ok=true) {
    setMsg({text, ok});
    setTimeout(()=>setMsg(null), 4000);
  }

  async function toggle(id: string, currentEnabled: boolean) {
    setSaving(id);
    try {
      const r = await fetch("/api/admin/business-modules", {
        method:"POST", headers: adminHeaders(true),
        body: JSON.stringify({ action:"TOGGLE", id, enabled: !currentEnabled }),
      });
      if (r.ok) {
        const d = await r.json();
        setModules(prev=>prev.map(m=>m.id===id ? {...m, enabled:!currentEnabled, status:!currentEnabled?"live":"coming_soon", adminOverride:true, waitlistCount:0} : m));
        const notifMsg = d.notified > 0 ? ` — 📧 ${d.notified} waitlist notified` : "";
        showMsg(`${!currentEnabled?"✅ Enabled":"⏸ Disabled"}: ${id}${notifMsg}`);
      }
    } finally { setSaving(null); }
  }

  async function notifyWaitlist(id: string, label: string) {
    setSaving(id+"_notify");
    try {
      const r = await fetch("/api/admin/business-modules", {
        method:"POST", headers: adminHeaders(true),
        body: JSON.stringify({ action:"NOTIFY_WAITLIST", id }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.notified > 0) {
          setModules(prev=>prev.map(m=>m.id===id ? {...m, waitlistCount:0} : m));
          showMsg(`📧 ${d.notified} emails sent to ${label} waitlist`);
        } else {
          showMsg(`No pending waitlist entries for ${label}`, false);
        }
      }
    } finally { setSaving(null); }
  }

  async function releasePhase(phase: number) {
    const phaseTypes = modules.filter(m=>m.phase===phase && !m.enabled);
    if (!phaseTypes.length) { showMsg(`All Phase ${phase} types are already live`, false); return; }
    if (!await confirmToast(`Release all ${phaseTypes.length} Phase ${phase} business types? This will notify their waitlists by email.`)) return;

    setReleasing(phase);
    try {
      const r = await fetch("/api/admin/business-modules", {
        method:"POST", headers: adminHeaders(true),
        body: JSON.stringify({ action:"RELEASE_PHASE", phase }),
      });
      if (r.ok) {
        const d = await r.json();
        await load();
        const notifMsg = d.notified > 0 ? `, 📧 ${d.notified} waitlist emails sent` : "";
        showMsg(`🚀 Phase ${phase} released: ${d.newlyEnabled} types enabled${notifMsg}`);
      }
    } finally { setReleasing(null); }
  }

  async function resetOverride(id: string) {
    setSaving(id+"_reset");
    try {
      await fetch("/api/admin/business-modules", {
        method:"POST", headers: adminHeaders(true),
        body: JSON.stringify({ action:"RESET", id }),
      });
      await load();
      showMsg(`Reset to default: ${id}`);
    } finally { setSaving(null); }
  }

  async function resetAll() {
    if (!await confirmToast("Reset all business module overrides to default phase settings?")) return;
    await fetch("/api/admin/business-modules", {
      method:"POST", headers: adminHeaders(true),
      body: JSON.stringify({ action:"RESET_ALL" }),
    });
    await load();
    showMsg("All overrides reset to defaults");
  }

  const displayed = modules.filter(m => {
    if (filter==="live"        && !m.enabled) return false;
    if (filter==="coming_soon" &&  m.enabled) return false;
    if (search && !m.label.toLowerCase().includes(search.toLowerCase()) &&
                  !m.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byPhase: Record<number,any[]> = {1:[],2:[],3:[],4:[]};
  displayed.forEach(m => byPhase[m.phase]?.push(m));

  const totalLive          = modules.filter(m=>m.enabled).length;
  const totalWaitlist      = modules.reduce((s,m)=>s+(m.waitlistCount||0),0);

  const td: React.CSSProperties = { padding:"11px 13px", fontSize:12.5, color:"rgba(255,255,255,.75)", borderBottom:"1px solid rgba(255,255,255,.05)" };
  const th: React.CSSProperties = { padding:"9px 13px", textAlign:"left", fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", borderBottom:"1px solid rgba(255,255,255,.07)" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:800, color:"white", margin:0 }}>Business Modules</h2>
          <p style={{ fontSize:12.5, color:"rgba(255,255,255,.35)", marginTop:4 }}>All audited business types are launch-ready by default. Use overrides only when you want to temporarily hide a type from signup, website, or dashboard access.</p>
        </div>
        <button onClick={resetAll} style={{ padding:"7px 16px", borderRadius:8, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.45)", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          Reset All Overrides
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
        {[
          { label:"Total Types",     val:modules.length,                            color:"#818cf8" },
          { label:"Live",            val:totalLive,                                 color:"#34d399" },
          { label:"Hidden",          val:modules.length - totalLive,                color:"#fbbf24" },
          { label:"Waitlist",        val:totalWaitlist,                             color:"#fb923c" },
          { label:"Admin Overrides", val:modules.filter(m=>m.adminOverride).length, color:"#f87171" },
        ].map(k=>(
          <div key={k.label} style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:10.5, color:"rgba(255,255,255,.35)", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>{k.label}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color, marginTop:4 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Phase Release Buttons */}
      <div style={{ padding:"14px 18px", borderRadius:12, background:"rgba(99,102,241,.05)", border:"1px solid rgba(99,102,241,.12)" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:10 }}>
          🚀 Bulk Phase Controls — keep every type launch-ready or temporarily hide a whole phase
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {([1,2,3,4] as const).map(phase=>{
            const ph = PHASE_META[phase];
            const phTypes    = modules.filter(m=>m.phase===phase);
            const liveCount  = phTypes.filter(m=>m.enabled).length;
            const allLive    = liveCount === phTypes.length;
            const waitlisted = phTypes.reduce((s,m)=>s+(m.waitlistCount||0),0);
            return (
              <button key={phase}
                onClick={()=>releasePhase(phase)}
                disabled={allLive || releasing===phase}
                style={{
                  padding:"8px 16px", borderRadius:9, border:`1px solid ${ph.color}40`,
                  background: allLive ? "rgba(255,255,255,.03)" : `${ph.color}14`,
                  color: allLive ? "rgba(255,255,255,.2)" : ph.color,
                  fontSize:12, fontWeight:700, cursor: allLive?"not-allowed":"pointer", fontFamily:"inherit",
                  opacity: releasing===phase ? .6 : 1,
                }}>
                {releasing===phase ? "Updating…" : allLive ? `${ph.label} ✓ All Launch-Ready` : `Enable ${ph.label} (${liveCount}/${phTypes.length})`}
                {waitlisted > 0 && !allLive && <span style={{ marginLeft:6, fontSize:10.5, color:"#fb923c" }}>· {waitlisted} waiting</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters + message */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search business type…"
          style={{ padding:"7px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.05)", color:"white", fontSize:12.5, outline:"none", width:200 }}/>
        {(["all","live","coming_soon"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", border:"1px solid",
            borderColor: filter===f ? "#6366f1" : "rgba(255,255,255,.1)",
            background:  filter===f ? "rgba(99,102,241,.18)" : "rgba(255,255,255,.04)",
            color:       filter===f ? "#a5b4fc" : "rgba(255,255,255,.4)",
          }}>
            {f==="all"?"All":f==="live"?"🟢 Launch-Ready":"🙈 Hidden"}
          </button>
        ))}
        {msg && <span style={{ fontSize:12, color: msg.ok?"#34d399":"#fbbf24", fontWeight:600 }}>{msg.text}</span>}
      </div>

      {/* Tables per phase */}
      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,.25)" }}>Loading…</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
          {([1,2,3,4] as const).map(phase=>{
            const rows = byPhase[phase];
            if (!rows?.length) return null;
            const ph = PHASE_META[phase];
            return (
              <div key={phase}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <span style={{ padding:"3px 11px", borderRadius:20, fontSize:10.5, fontWeight:700, background:ph.bg, color:ph.color, border:`1px solid ${ph.color}30` }}>{ph.label}</span>
                  <span style={{ fontSize:11.5, color:"rgba(255,255,255,.25)" }}>{rows.filter(r=>r.enabled).length}/{rows.length} launch-ready</span>
                </div>
                <div style={{ border:"1px solid rgba(255,255,255,.07)", borderRadius:12, overflow:"hidden" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        {["","Business Type","Category","Status","Waitlist","Override","Action"].map(h=>(
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(m=>(
                        <tr key={m.id} style={{ background:m.enabled?"rgba(52,211,153,.02)":"transparent" }}>
                          <td style={{ ...td, fontSize:20, width:44 }}>{m.emoji}</td>
                          <td style={td}>
                            <div style={{ fontWeight:700, color:"white" }}>{m.label}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,.28)", marginTop:2 }}>{m.description}</div>
                          </td>
                          <td style={{ ...td, color:"rgba(255,255,255,.4)", fontSize:12 }}>{m.category}</td>
                          <td style={td}>
                            <span style={{ padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:700,
                              background:m.enabled?"rgba(52,211,153,.14)":"rgba(251,191,36,.09)",
                              color:m.enabled?"#34d399":"#fbbf24",
                              border:`1px solid ${m.enabled?"rgba(52,211,153,.28)":"rgba(251,191,36,.22)"}` }}>
                              {m.enabled?"🟢 Launch-Ready":"🙈 Hidden"}
                            </span>
                          </td>
                          <td style={td}>
                            {m.waitlistCount > 0 ? (
                              <button
                                onClick={()=>notifyWaitlist(m.id, m.label)}
                                disabled={saving===m.id+"_notify"}
                                title={`Send email to ${m.waitlistCount} waiting`}
                                style={{ padding:"3px 9px", borderRadius:6, border:"1px solid rgba(251,146,60,.35)", background:"rgba(251,146,60,.1)", color:"#fb923c", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                                {saving===m.id+"_notify" ? "…" : `📧 ${m.waitlistCount}`}
                              </button>
                            ) : (
                              <span style={{ color:"rgba(255,255,255,.18)", fontSize:12 }}>—</span>
                            )}
                          </td>
                          <td style={{ ...td, fontSize:12 }}>
                            {m.adminOverride ? (
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ color:"#f87171", fontWeight:600 }}>Modified</span>
                                <button onClick={()=>resetOverride(m.id)} disabled={saving===m.id+"_reset"}
                                  style={{ fontSize:10, padding:"2px 7px", borderRadius:5, border:"1px solid rgba(248,113,113,.3)", background:"transparent", color:"#f87171", cursor:"pointer" }}>
                                  Reset
                                </button>
                              </div>
                            ) : <span style={{ color:"rgba(255,255,255,.18)" }}>—</span>}
                          </td>
                          <td style={td}>
                            <button onClick={()=>toggle(m.id, m.enabled)} disabled={!!saving && saving===m.id}
                              title={m.enabled?"Disable":"Enable"}
                              style={{ width:44, height:24, borderRadius:12, border:"none", cursor:saving===m.id?"not-allowed":"pointer",
                                background:m.enabled?"#10b981":"rgba(255,255,255,.1)", position:"relative",
                                transition:"background .2s", opacity:saving===m.id?.6:1 }}>
                              <span style={{ position:"absolute", top:2, left:m.enabled?23:2, width:20, height:20, borderRadius:"50%",
                                background:"white", transition:"left .2s", display:"block" }}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div style={{ padding:"14px 18px", borderRadius:10, background:"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.15)", fontSize:12, color:"rgba(255,255,255,.38)", lineHeight:1.8 }}>
        <strong style={{ color:"#a5b4fc" }}>Toggle ON</strong> → Business type stays visible on signup page + website and remains launch-ready. &nbsp;
        <strong style={{ color:"#a5b4fc" }}>Toggle OFF</strong> → Business type is temporarily hidden from signup and public selection. &nbsp;
        <strong style={{ color:"#a5b4fc" }}>📧 Waitlist</strong> → Click to manually send notifications to pending subscribers.
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: COUPON CODES
═══════════════════════════════════════════════════════ */
function PageCoupons() {
  const EMPTY_FORM = { code:"", type:"percent", value:"", maxUses:"", expiresAt:"", applicableTo:"",
                       allowedEmails:"", allowedCompanyIds:"", allowedBusinessTypes:"", allowedCountries:"" };
  const [coupons,  setCoupons]  = useState<any[]|null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState<{text:string;ok:boolean}|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [expanded, setExpanded] = useState<string|null>(null); // coupon id whose targeting is shown

  function adminHeaders(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  function loadCoupons() {
    fetch("/api/admin/coupons", { headers: adminHeaders() })
      .then(r=>r.json()).then(d=>setCoupons(d.coupons||[])).catch(()=>setCoupons([]));
  }
  useEffect(loadCoupons, []);

  async function createCoupon() {
    if (!form.code||!form.value) { setMsg({ text:"Code and value are required", ok:false }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/coupons", {
        method:"POST", headers: adminHeaders(true),
        body: JSON.stringify({
          code: form.code.toUpperCase().trim(),
          type: form.type,
          value: Number(form.value),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
          applicableTo: form.applicableTo || null,
          active: true,
          allowedEmails:        form.allowedEmails        || null,
          allowedCompanyIds:    form.allowedCompanyIds    || null,
          allowedBusinessTypes: form.allowedBusinessTypes || null,
          allowedCountries:     form.allowedCountries     || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg({ text: d.error||"Failed", ok:false }); }
      else { setMsg({ text:"Coupon created!", ok:true }); setForm(EMPTY_FORM); loadCoupons(); }
    } catch { setMsg({ text:"Network error", ok:false }); }
    setSaving(false);
    setTimeout(()=>setMsg(null), 3000);
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/coupons", { method:"PATCH", headers: adminHeaders(true), body: JSON.stringify({ id, active }) });
    setCoupons(prev=>(prev||[]).map(c=>c.id===id?{...c,active}:c));
  }

  async function deleteCoupon(id: string) {
    if (!await confirmToast("Delete this coupon?")) return;
    setDeleting(id);
    await fetch(`/api/admin/coupons?id=${id}`, { method:"DELETE", headers: adminHeaders() });
    setCoupons(prev=>(prev||[]).filter(c=>c.id!==id));
    setDeleting(null);
  }

  // Helper: parse stored JSON array back to display string
  function displayList(val: string|null): string {
    if (!val) return "—";
    try { const a = JSON.parse(val); return Array.isArray(a) ? a.join(", ") : val; } catch { return val; }
  }

  // Helper: does this coupon have any targeting?
  function hasTargeting(c: any): boolean {
    return !!(c.allowedEmails || c.allowedCompanyIds || c.allowedBusinessTypes || c.allowedCountries);
  }

  const inputStyle: React.CSSProperties = { padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none", fontFamily:"inherit", width:"100%" };
  const selectStyle: React.CSSProperties = { ...inputStyle, background:"rgba(13,14,30,1)" };
  const labelStyle: React.CSSProperties = { fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em" };

  const fi = (label: string, key: keyof typeof form, type="text", placeholder="") => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={placeholder} style={inputStyle}/>
    </div>
  );

  const BUSINESS_TYPES = [
    "trading","distribution","import_company","export_company","clearing_forwarding",
    "manufacturing","retail","restaurant","construction","real_estate","hotel","hospital",
    "pharmacy","school","transport","agriculture","ngo","ecommerce","law_firm","it_company",
    "salon","gym","automotive","advertising_agency","saas_company","isp","solar_company",
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* ── Create form ── */}
      <SectionCard title="Create Coupon">
        {/* Basic fields */}
        <div style={{ marginBottom:8, fontSize:11, fontWeight:700, color:"rgba(255,255,255,.25)", textTransform:"uppercase", letterSpacing:".07em" }}>Basic</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:18 }}>
          {fi("Code","code","text","e.g. LAUNCH50")}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={selectStyle}>
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
          </div>
          {fi("Value","value","number",form.type==="percent"?"20 = 20%":"10 = $10")}
          {fi("Max Uses","maxUses","number","Blank = unlimited")}
          {fi("Expires At","expiresAt","date")}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={labelStyle}>Plan</label>
            <select value={form.applicableTo} onChange={e=>setForm(p=>({...p,applicableTo:e.target.value}))} style={selectStyle}>
              <option value="">All Plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Targeting fields */}
        <div style={{ padding:"14px 16px", borderRadius:10, border:"1px solid rgba(99,102,241,.2)", background:"rgba(99,102,241,.05)", marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".07em", textTransform:"uppercase", marginBottom:12 }}>
            🎯 Targeting — leave blank to give to everyone
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>

            {/* Emails */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={labelStyle}>Specific Users (emails)</label>
              <input value={form.allowedEmails} onChange={e=>setForm(p=>({...p,allowedEmails:e.target.value}))}
                placeholder="ali@co.com, sara@x.com"
                style={inputStyle}/>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.2)" }}>Comma-separated emails</span>
            </div>

            {/* Company IDs */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={labelStyle}>Specific Companies (IDs)</label>
              <input value={form.allowedCompanyIds} onChange={e=>setForm(p=>({...p,allowedCompanyIds:e.target.value}))}
                placeholder="uuid1, uuid2"
                style={inputStyle}/>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.2)" }}>Copy from Companies page</span>
            </div>

            {/* Business Types */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={labelStyle}>Business Types</label>
              <input value={form.allowedBusinessTypes} onChange={e=>setForm(p=>({...p,allowedBusinessTypes:e.target.value}))}
                placeholder="trading, distribution, retail"
                style={inputStyle}/>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
                {["trading","distribution","manufacturing","retail","restaurant","hospital","hotel","pharmacy","school","transport"].map(bt=>(
                  <button key={bt} onClick={()=>{
                    const cur = form.allowedBusinessTypes.split(",").map(s=>s.trim()).filter(Boolean);
                    const next = cur.includes(bt) ? cur.filter(s=>s!==bt) : [...cur, bt];
                    setForm(p=>({...p, allowedBusinessTypes: next.join(", ")}));
                  }} style={{
                    padding:"2px 7px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid",
                    borderColor: form.allowedBusinessTypes.includes(bt) ? "rgba(99,102,241,.6)" : "rgba(255,255,255,.1)",
                    background: form.allowedBusinessTypes.includes(bt) ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
                    color: form.allowedBusinessTypes.includes(bt) ? "#a5b4fc" : "rgba(255,255,255,.3)",
                  }}>{bt}</button>
                ))}
              </div>
            </div>

            {/* Countries */}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={labelStyle}>Countries (name or ISO code)</label>
              <input value={form.allowedCountries} onChange={e=>setForm(p=>({...p,allowedCountries:e.target.value}))}
                placeholder="PK, AE, Saudi Arabia"
                style={inputStyle}/>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:4 }}>
                {[{l:"🇵🇰 PK",v:"pk"},{l:"🇦🇪 UAE",v:"ae"},{l:"🇸🇦 KSA",v:"sa"},{l:"🇬🇧 UK",v:"gb"},{l:"🇺🇸 US",v:"us"},{l:"🇧🇩 BD",v:"bd"}].map(({l,v})=>(
                  <button key={v} onClick={()=>{
                    const cur = form.allowedCountries.split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
                    const next = cur.includes(v) ? cur.filter(s=>s!==v) : [...cur, v];
                    setForm(p=>({...p, allowedCountries: next.join(", ")}));
                  }} style={{
                    padding:"2px 7px", borderRadius:5, fontSize:10, fontWeight:700, cursor:"pointer", border:"1px solid",
                    borderColor: form.allowedCountries.toLowerCase().includes(v) ? "rgba(52,211,153,.5)" : "rgba(255,255,255,.1)",
                    background: form.allowedCountries.toLowerCase().includes(v) ? "rgba(52,211,153,.15)" : "rgba(255,255,255,.04)",
                    color: form.allowedCountries.toLowerCase().includes(v) ? "#34d399" : "rgba(255,255,255,.3)",
                  }}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={createCoupon} disabled={saving}
            style={{ padding:"8px 22px", borderRadius:9, background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving?.7:1, fontFamily:"inherit" }}>
            {saving?"Creating…":"+ Create Coupon"}
          </button>
          {msg && <span style={{ fontSize:12, color:msg.ok?"#34d399":"#f87171", fontWeight:600 }}>{msg.text}</span>}
        </div>
      </SectionCard>

      {/* ── List ── */}
      <SectionCard title={`Active Coupons (${(coupons||[]).length})`}>
        {coupons===null ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</div>
        ) : coupons.length===0 ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13 }}>No coupons yet.</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr>
                  {["Code","Discount","Uses","Expires","Plan","Targeting","Status","Actions"].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"rgba(255,255,255,.3)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid rgba(255,255,255,.07)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map(c=>(
                  <>
                  <tr key={c.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)", opacity:c.active?1:.5 }}>
                    <td style={{ padding:"9px 12px", color:"#fbbf24", fontWeight:800, letterSpacing:".04em" }}>{c.code}</td>
                    <td style={{ padding:"9px 12px", color:"white", fontWeight:700 }}>
                      {c.type==="percent"?`${c.value}%`:`$${c.value}`}
                    </td>
                    <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.5)" }}>
                      {c.usedCount}{c.maxUses?` / ${c.maxUses}`:" / ∞"}
                    </td>
                    <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.4)", fontSize:11.5 }}>
                      {c.expiresAt?new Date(c.expiresAt).toLocaleDateString():"Never"}
                    </td>
                    <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.4)", textTransform:"capitalize" }}>
                      {c.applicableTo||"All"}
                    </td>
                    {/* Targeting summary */}
                    <td style={{ padding:"9px 12px" }}>
                      {hasTargeting(c) ? (
                        <button onClick={()=>setExpanded(expanded===c.id?null:c.id)} style={{
                          padding:"2px 9px", borderRadius:6, border:"1px solid rgba(99,102,241,.4)",
                          background:"rgba(99,102,241,.12)", color:"#a5b4fc", fontSize:10.5, fontWeight:700, cursor:"pointer" }}>
                          🎯 Targeted {expanded===c.id?"▲":"▼"}
                        </button>
                      ) : (
                        <span style={{ color:"rgba(255,255,255,.2)", fontSize:11 }}>Everyone</span>
                      )}
                    </td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:c.active?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)", color:c.active?"#34d399":"#f87171" }}>
                        {c.active?"Active":"Inactive"}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>toggleActive(c.id,!c.active)}
                          style={{ padding:"3px 9px", borderRadius:6, border:`1px solid ${c.active?"rgba(251,191,36,.3)":"rgba(52,211,153,.3)"}`, background:c.active?"rgba(251,191,36,.1)":"rgba(52,211,153,.1)", color:c.active?"#fbbf24":"#34d399", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          {c.active?"Disable":"Enable"}
                        </button>
                        <button onClick={()=>deleteCoupon(c.id)} disabled={deleting===c.id}
                          style={{ padding:"3px 9px", borderRadius:6, border:"1px solid rgba(248,113,113,.3)", background:"rgba(248,113,113,.1)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                          {deleting===c.id?"…":"Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded targeting detail row */}
                  {expanded===c.id && (
                    <tr key={c.id+"_detail"} style={{ background:"rgba(99,102,241,.05)" }}>
                      <td colSpan={8} style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                          {[
                            { label:"👤 Users (emails)",     val: displayList(c.allowedEmails) },
                            { label:"🏢 Companies (IDs)",    val: displayList(c.allowedCompanyIds) },
                            { label:"🏪 Business Types",     val: displayList(c.allowedBusinessTypes) },
                            { label:"🌍 Countries",          val: displayList(c.allowedCountries) },
                          ].map(({label,val})=>(
                            <div key={label}>
                              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:3 }}>{label}</div>
                              <div style={{ fontSize:12, color: val==="—"?"rgba(255,255,255,.15)":"rgba(255,255,255,.75)", fontStyle: val==="—"?"italic":"normal" }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: EMAIL LOGS
═══════════════════════════════════════════════════════ */
function PageEmailLogs() {
  const [logs,   setLogs]   = useState<any[]|null>(null);
  const [filter, setFilter] = useState<"all"|"sent"|"failed">("all");
  const [search, setSearch] = useState("");

  function adminHeaders() {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  useEffect(() => {
    fetch("/api/admin/email-logs", { headers: adminHeaders() })
      .then(r=>r.json()).then(d=>setLogs(d.logs||[])).catch(()=>setLogs([]));
  }, []);

  const filtered = (logs||[]).filter(l => {
    const mf = filter==="all"||l.status===filter;
    const ms = !search||l.to.toLowerCase().includes(search.toLowerCase())||l.subject.toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });

  const sentCount   = (logs||[]).filter(l=>l.status==="sent").length;
  const failedCount = (logs||[]).filter(l=>l.status==="failed").length;
  const rate = logs?.length ? Math.round(sentCount/logs.length*100) : 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {[
          { label:"Total Sent",   value:sentCount,   color:"#34d399" },
          { label:"Failed",       value:failedCount, color:"#f87171" },
          { label:"Delivery Rate",value:`${rate}%`,  color:"#818cf8" },
        ].map(s=>(
          <div key={s.label} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <SectionCard title="Email Log">
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by email or subject…"
            style={{ flex:1, minWidth:200, padding:"7px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none", fontFamily:"inherit" }}/>
          <div style={{ display:"flex", gap:4 }}>
            {(["all","sent","failed"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:10.5, fontWeight:700, padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit",
                background:filter===f?(f==="failed"?"rgba(248,113,113,.7)":f==="sent"?"rgba(52,211,153,.7)":"rgba(99,102,241,.7)"):"rgba(255,255,255,.06)",
                color:filter===f?"white":"rgba(255,255,255,.35)" }}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {logs===null ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13 }}>No email logs yet. Emails appear here after being sent.</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr>
                  {["To","Subject","Status","Error","Sent At"].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"rgba(255,255,255,.3)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid rgba(255,255,255,.07)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l=>(
                  <tr key={l.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.7)", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.to}</td>
                    <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.55)", maxWidth:260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.subject}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:l.status==="sent"?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)", color:l.status==="sent"?"#34d399":"#f87171" }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#f87171", fontSize:11.5, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.error||"—"}</td>
                    <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.35)", fontSize:11.5, whiteSpace:"nowrap" }}>{new Date(l.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: REFERRALS
═══════════════════════════════════════════════════════ */
function PageReferrals() {
  const [referrals, setReferrals] = useState<any[]|null>(null);
  const [form, setForm]           = useState({ referrerId:"", refereeEmail:"" });
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState<{text:string;ok:boolean}|null>(null);
  const [filter, setFilter]       = useState<"all"|"pending"|"signed_up"|"converted">("all");

  function adminHeaders(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  function load() {
    fetch("/api/admin/referrals", { headers: adminHeaders() })
      .then(r=>r.json()).then(d=>setReferrals(d.referrals||[])).catch(()=>setReferrals([]));
  }
  useEffect(load, []);

  async function createReferral() {
    if (!form.referrerId||!form.refereeEmail) { setMsg({ text:"Both fields required", ok:false }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/referrals", { method:"POST", headers: adminHeaders(true), body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) { setMsg({ text: d.error||"Failed", ok:false }); }
      else { setMsg({ text:"Referral added!", ok:true }); setForm({ referrerId:"", refereeEmail:"" }); load(); }
    } catch { setMsg({ text:"Network error", ok:false }); }
    setSaving(false); setTimeout(()=>setMsg(null),3000);
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/admin/referrals", { method:"PATCH", headers: adminHeaders(true), body: JSON.stringify({ id, status }) });
    setReferrals(prev=>(prev||[]).map(r=>r.id===id?{...r,status}:r));
  }

  const STATUS_COLOR: Record<string,[string,string]> = {
    pending:    ["#fbbf24","rgba(251,191,36,.12)"],
    signed_up:  ["#818cf8","rgba(129,140,248,.12)"],
    converted:  ["#34d399","rgba(52,211,153,.12)"],
  };

  const filtered = (referrals||[]).filter(r=>filter==="all"||r.status===filter);
  const converted = (referrals||[]).filter(r=>r.status==="converted").length;
  const totalReward = (referrals||[]).reduce((a,r)=>a+(r.reward||0),0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"Total Referrals", value:(referrals||[]).length,   color:"#818cf8" },
          { label:"Converted",       value:converted,                 color:"#34d399" },
          { label:"Pending",         value:(referrals||[]).filter(r=>r.status==="pending").length, color:"#fbbf24" },
          { label:"Total Rewards",   value:`$${totalReward.toFixed(0)}`, color:"#f472b6" },
        ].map(s=>(
          <div key={s.label} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create */}
      <SectionCard title="Add Referral Manually">
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
          {[["Referrer User ID","referrerId","text","User ID who referred"],["Referee Email","refereeEmail","email","Email of invited person"]].map(([label,key,type,ph])=>(
            <div key={key} style={{ display:"flex", flexDirection:"column", gap:4, flex:1, minWidth:180 }}>
              <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
              <input type={type} value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={ph}
                style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none", fontFamily:"inherit" }}/>
            </div>
          ))}
          <button onClick={createReferral} disabled={saving}
            style={{ padding:"8px 18px", borderRadius:9, background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving?.7:1, flexShrink:0 }}>
            {saving?"Adding…":"+ Add"}
          </button>
          {msg && <span style={{ fontSize:12, color:msg.ok?"#34d399":"#f87171", fontWeight:600 }}>{msg.text}</span>}
        </div>
      </SectionCard>

      {/* List */}
      <SectionCard title="Referral List">
        <div style={{ display:"flex", gap:4, marginBottom:12 }}>
          {(["all","pending","signed_up","converted"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ fontSize:10.5, fontWeight:700, padding:"5px 12px", borderRadius:8, border:"none", cursor:"pointer", fontFamily:"inherit",
              background:filter===f?"rgba(99,102,241,.7)":"rgba(255,255,255,.06)",
              color:filter===f?"white":"rgba(255,255,255,.35)" }}>
              {f==="all"?"All":f.replace("_"," ").replace(/^\w/,c=>c.toUpperCase())}
            </button>
          ))}
        </div>

        {referrals===null ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</div>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13 }}>No referrals yet.</div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr>
                  {["Referrer ID","Referee Email","Status","Reward","Date","Actions"].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"rgba(255,255,255,.3)", fontWeight:700, fontSize:11, textTransform:"uppercase", letterSpacing:".05em", borderBottom:"1px solid rgba(255,255,255,.07)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r=>{
                  const [tc,bc]=STATUS_COLOR[r.status]||["#94a3b8","rgba(148,163,184,.1)"];
                  return (
                    <tr key={r.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.5)", fontSize:11.5, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.referrerId}</td>
                      <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.7)" }}>{r.refereeEmail}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:bc, color:tc }}>
                          {r.status.replace("_"," ")}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px", color:"#34d399", fontWeight:700 }}>{r.reward?`$${r.reward}`:"—"}</td>
                      <td style={{ padding:"9px 12px", color:"rgba(255,255,255,.35)", fontSize:11.5, whiteSpace:"nowrap" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <select value={r.status} onChange={e=>updateStatus(r.id,e.target.value)}
                          style={{ padding:"4px 8px", borderRadius:6, border:"1px solid rgba(255,255,255,.1)", background:"rgba(13,14,30,1)", color:"white", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                          <option value="pending">Pending</option>
                          <option value="signed_up">Signed Up</option>
                          <option value="converted">Converted</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: TEAM ACCESS CONTROL
═══════════════════════════════════════════════════════ */
const ALL_PAGES: { page: string; label: string; icon: string }[] = [
  { page:"dashboard",     label:"Dashboard",        icon:"🏠" },
  { page:"companies",     label:"Companies & Users", icon:"🏢" },
  { page:"subscriptions", label:"Subscriptions",    icon:"💳" },
  { page:"revenue",       label:"Revenue",          icon:"💰" },
  { page:"geo",           label:"Geo Analytics",    icon:"🌍" },
  { page:"usage",         label:"Usage Insights",   icon:"📊" },
  { page:"plans",         label:"Plans & Billing",  icon:"💎" },
  { page:"coupons",       label:"Coupon Codes",     icon:"🏷️" },
  { page:"referrals",     label:"Referrals",        icon:"" },
  { page:"system",        label:"System Health",    icon:"⚡" },
  { page:"logs",          label:"Audit Logs",       icon:"📋" },
  { page:"emaillogs",     label:"Email Logs",       icon:"📧" },
  { page:"permissions",   label:"Permissions",      icon:"🔐" },
  { page:"livesupport",   label:"Live Support",     icon:"💬" },
  { page:"settings",      label:"Settings",         icon:"⚙️" },
  { page:"updates",       label:"Product Updates",  icon:"🚀" },
  { page:"tickets",       label:"Support Tickets",  icon:"🎫" },
  { page:"broadcasts",    label:"Broadcasts",       icon:"📣" },
  { page:"visitors",      label:"Visitors",         icon:"👁️" },
  { page:"apikeys",       label:"API Keys",         icon:"🔑" },
  { page:"flags",         label:"Feature Flags",    icon:"🚩" },
  { page:"testimonials",  label:"Testimonials",     icon:"⭐" },
  { page:"leads",         label:"Lead Management",  icon:"🎯" },
  { page:"seo",           label:"SEO Settings",     icon:"🔍" },
];

function PageTeams() {
  const [members, setMembers] = useState<any[]|null>(null);
  const [editing, setEditing] = useState<any|null>(null);   // member being edited
  const [creating, setCreating] = useState(false);
  const [form, setForm]   = useState({ name:"", email:"", password:"", team:"", allowedPages:[] as string[] });
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{text:string;ok:boolean}|null>(null);
  const [deleting, setDeleting] = useState<string|null>(null);

  function adminHeaders(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  function load() {
    fetch("/api/admin/team", { headers: adminHeaders() })
      .then(r=>r.json()).then(d=>setMembers(d.members||[])).catch(()=>setMembers([]));
  }
  useEffect(load, []);

  function togglePage(p: string, cur: string[]) {
    return cur.includes(p) ? cur.filter(x=>x!==p) : [...cur, p];
  }

  async function save() {
    setSaving(true); setMsg(null);
    try {
      if (editing) {
        const r = await fetch("/api/admin/team", { method:"PATCH", headers:adminHeaders(true),
          body: JSON.stringify({ id:editing.id, name:form.name, team:form.team, allowedPages:form.allowedPages, password:form.password||undefined }) });
        const d = await r.json();
        if (!r.ok) { setMsg({ text:d.error||"Failed", ok:false }); }
        else { setMsg({ text:"Saved!", ok:true }); setEditing(null); load(); }
      } else {
        const r = await fetch("/api/admin/team", { method:"POST", headers:adminHeaders(true),
          body: JSON.stringify({ name:form.name, email:form.email, password:form.password, team:form.team, allowedPages:form.allowedPages }) });
        const d = await r.json();
        if (!r.ok) { setMsg({ text:d.error||"Failed", ok:false }); }
        else { setMsg({ text:"Team member created!", ok:true }); setCreating(false); load(); }
      }
    } catch { setMsg({ text:"Network error", ok:false }); }
    setSaving(false); setTimeout(()=>setMsg(null),3000);
  }

  async function toggleActive(id:string, active:boolean) {
    await fetch("/api/admin/team", { method:"PATCH", headers:adminHeaders(true), body:JSON.stringify({ id, active }) });
    setMembers(prev=>(prev||[]).map(m=>m.id===id?{...m,active}:m));
  }

  async function deleteMember(id:string) {
    if (!await confirmToast("Remove this team member?")) return;
    setDeleting(id);
    await fetch(`/api/admin/team?id=${id}`, { method:"DELETE", headers:adminHeaders() });
    setMembers(prev=>(prev||[]).filter(m=>m.id!==id));
    setDeleting(null);
  }

  function openCreate() {
    setForm({ name:"",email:"",password:"",team:"",allowedPages:[] });
    setEditing(null); setCreating(true);
  }

  function openEdit(m: any) {
    let ap: string[] = [];
    try { ap = JSON.parse(m.allowedPages||"[]"); } catch {}
    setForm({ name:m.name, email:m.email, password:"", team:m.team||"", allowedPages:ap });
    setEditing(m); setCreating(false);
  }

  // Quick preset teams
  const PRESETS: Record<string,string[]> = {
    "Contact Team":    ["dashboard","livesupport","tickets"],
    "Marketing Team":  ["dashboard","broadcasts","visitors","referrals","coupons","testimonials","leads","seo"],
    "Finance Team":    ["dashboard","revenue","subscriptions","emaillogs"],
    "Support Team":    ["dashboard","livesupport","tickets","companies"],
    "Tech Team":       ["dashboard","system","logs","apikeys","flags","emaillogs"],
  };

  const showForm = creating || !!editing;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

      {/* Info banner */}
      <div style={{ padding:"14px 18px", borderRadius:12, background:"rgba(99,102,241,.08)", border:"1px solid rgba(99,102,241,.2)", display:"flex", alignItems:"center", gap:12 }}>
        <span style={{ fontSize:20 }}>🔒</span>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", lineHeight:1.6 }}>
          <strong style={{ color:"white" }}>You are the Super Admin</strong> — full access to everything. Team members you create here will only see the pages you allow. They log in via the same <code style={{ color:"#818cf8" }}>/admin/login</code> page.
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <SectionCard title={editing ? `Edit: ${editing.name}` : "Add Team Member"} action={
          <button onClick={()=>{ setCreating(false); setEditing(null); }} style={{ fontSize:12, color:"rgba(255,255,255,.4)", background:"none", border:"none", cursor:"pointer" }}>✕ Close</button>
        }>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>
            {[["Full Name","name","text"],["Email","email","email"],["Password (leave blank to keep)","password","password"]].map(([label,key,type])=>(
              <div key={key} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} disabled={!!editing&&key==="email"}
                  style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none", fontFamily:"inherit", opacity:!!editing&&key==="email"?.5:1 }}/>
              </div>
            ))}
          </div>

          {/* Team label + presets */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:10 }}>
              <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em" }}>Team Name</label>
              <input value={form.team} onChange={e=>setForm(p=>({...p,team:e.target.value}))} placeholder="e.g. Contact Team, Marketing Team"
                style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none", fontFamily:"inherit", maxWidth:300 }}/>
            </div>
            <div style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:6 }}>Quick Presets</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {Object.entries(PRESETS).map(([label, pages])=>(
                <button key={label} onClick={()=>setForm(p=>({...p, team:label, allowedPages:pages}))}
                  style={{ padding:"4px 12px", borderRadius:8, border:"1px solid rgba(129,140,248,.3)", background:"rgba(129,140,248,.1)", color:"#818cf8", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Page checkboxes */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:8 }}>
              Allowed Pages ({form.allowedPages.length} selected)
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:6 }}>
              {ALL_PAGES.map(p=>{
                const on = form.allowedPages.includes(p.page);
                return (
                  <label key={p.page} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, cursor:"pointer",
                    background:on?"rgba(99,102,241,.12)":"rgba(255,255,255,.03)", border:`1px solid ${on?"rgba(99,102,241,.35)":"rgba(255,255,255,.07)"}`,
                    transition:"all .15s" }}>
                    <input type="checkbox" checked={on} onChange={()=>setForm(prev=>({...prev,allowedPages:togglePage(p.page,prev.allowedPages)}))}
                      style={{ accentColor:"#6366f1", width:14, height:14 }}/>
                    <span style={{ fontSize:13 }}>{p.icon}</span>
                    <span style={{ fontSize:12, fontWeight:on?700:400, color:on?"white":"rgba(255,255,255,.45)" }}>{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={save} disabled={saving}
              style={{ padding:"8px 22px", borderRadius:9, background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", opacity:saving?.7:1, fontFamily:"inherit" }}>
              {saving?"Saving…":editing?"Save Changes":"Create Member"}
            </button>
            {msg && <span style={{ fontSize:12, color:msg.ok?"#34d399":"#f87171", fontWeight:600 }}>{msg.text}</span>}
          </div>
        </SectionCard>
      )}

      {/* Member List */}
      <SectionCard title={`Team Members (${(members||[]).length})`} action={
        !showForm ? (
          <button onClick={openCreate}
            style={{ padding:"6px 16px", borderRadius:8, background:"linear-gradient(135deg,#6366f1,#4f46e5)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            + Add Member
          </button>
        ) : undefined
      }>
        {members===null ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</div>
        ) : members.length===0 ? (
          <div style={{ textAlign:"center", padding:24, color:"rgba(255,255,255,.2)", fontSize:13, lineHeight:1.7 }}>
            No team members yet.<br/>
            <span style={{ fontSize:12 }}>Click <strong style={{ color:"#818cf8" }}>+ Add Member</strong> to create your first team member.</span>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {members.map(m=>{
              let ap: string[] = [];
              try { ap = JSON.parse(m.allowedPages||"[]"); } catch {}
              return (
                <div key={m.id} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                  {/* Avatar */}
                  <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#818cf8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    {m.name?.charAt(0)?.toUpperCase()||"?"}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"white" }}>{m.name}</span>
                      {m.team && <span style={{ padding:"1px 8px", borderRadius:99, background:"rgba(129,140,248,.15)", color:"#818cf8", fontSize:10, fontWeight:700 }}>{m.team}</span>}
                      {!m.active && <span style={{ padding:"1px 8px", borderRadius:99, background:"rgba(248,113,113,.15)", color:"#f87171", fontSize:10, fontWeight:700 }}>Disabled</span>}
                    </div>
                    <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginBottom:5 }}>{m.email}</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {ap.slice(0,8).map(p=>{
                        const pi = ALL_PAGES.find(x=>x.page===p);
                        return pi ? (
                          <span key={p} style={{ padding:"2px 7px", borderRadius:6, background:"rgba(99,102,241,.1)", border:"1px solid rgba(99,102,241,.2)", color:"#818cf8", fontSize:10, fontWeight:600 }}>
                            {pi.icon} {pi.label}
                          </span>
                        ) : null;
                      })}
                      {ap.length>8 && <span style={{ fontSize:10, color:"rgba(255,255,255,.25)", padding:"2px 7px" }}>+{ap.length-8} more</span>}
                    </div>
                  </div>
                  {/* Last login */}
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.25)", textAlign:"right", flexShrink:0 }}>
                    {m.lastLoginAt ? `Last login ${new Date(m.lastLoginAt).toLocaleDateString()}` : "Never logged in"}
                  </div>
                  {/* Actions */}
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={()=>openEdit(m)}
                      style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.05)", color:"rgba(255,255,255,.7)", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      Edit
                    </button>
                    <button onClick={()=>toggleActive(m.id,!m.active)}
                      style={{ padding:"5px 12px", borderRadius:7, border:`1px solid ${m.active?"rgba(251,191,36,.3)":"rgba(52,211,153,.3)"}`, background:m.active?"rgba(251,191,36,.08)":"rgba(52,211,153,.08)", color:m.active?"#fbbf24":"#34d399", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      {m.active?"Disable":"Enable"}
                    </button>
                    <button onClick={()=>deleteMember(m.id)} disabled={deleting===m.id}
                      style={{ padding:"5px 12px", borderRadius:7, border:"1px solid rgba(248,113,113,.3)", background:"rgba(248,113,113,.08)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      {deleting===m.id?"…":"Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: TESTIMONIALS
═══════════════════════════════════════════════════════ */
function PageTestimonials() {
  const [testimonials, setTestimonials] = useState<any[]|null>(null);
  const [pending, setPending]   = useState<any[]>([]);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{text:string;ok:boolean}|null>(null);
  const [form, setForm]       = useState({ name:"", company:"", role:"", message:"", rating:5, planUsed:"", avatar:"" });
  const [adding, setAdding]   = useState(false);
  const [actionBusy, setActionBusy] = useState<string|null>(null);

  function adminH(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  function load() {
    fetch("/api/admin/testimonials", { headers: adminH() })
      .then(r=>r.json()).then(d=>setTestimonials((d.testimonials||[]).filter((t:any)=>t.status!=="PENDING"))).catch(()=>setTestimonials([]));
    fetch("/api/admin/testimonials?status=PENDING", { headers: adminH() })
      .then(r=>r.json()).then(d=>setPending(d.testimonials||[])).catch(()=>{});
  }
  useEffect(load, []);

  async function changeStatus(id: string, action: "PUBLISH"|"REJECT") {
    setActionBusy(id+action);
    await fetch("/api/admin/testimonials", {
      method:"PATCH", headers:adminH(true), body:JSON.stringify({ id, action }),
    }).catch(()=>{});
    setPending(p=>p.filter(t=>t.id!==id));
    if (action==="PUBLISH") {
      const t = pending.find(t=>t.id===id);
      if (t) setTestimonials(ts=>[{...t, status:"PUBLISHED"}, ...(ts||[])]);
    }
    setActionBusy(null);
  }

  async function handleCreate() {
    if (!form.name.trim()||!form.message.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/testimonials", {
        method:"POST", headers: adminH(true), body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.testimonial) { setTestimonials(t=>[d.testimonial,...(t||[])]); setAdding(false); setForm({ name:"", company:"", role:"", message:"", rating:5, planUsed:"", avatar:"" }); }
      else setMsg({ text:d.error||"Error", ok:false });
    } catch { setMsg({ text:"Request failed", ok:false }); }
    setSaving(false);
    setTimeout(()=>setMsg(null),3000);
  }

  async function toggleField(id: string, field: "active"|"featured", val: boolean) {
    setTestimonials(ts=>(ts||[]).map(t=>t.id===id?{...t,[field]:val}:t));
    await fetch("/api/admin/testimonials", {
      method:"PATCH", headers:adminH(true), body:JSON.stringify({ id, [field]:val }),
    }).catch(()=>{});
  }

  async function deleteOne(id: string) {
    if (!await confirmToast("Delete this testimonial?")) return;
    await fetch(`/api/admin/testimonials?id=${id}`, { method:"DELETE", headers:adminH() });
    setTestimonials(ts=>(ts||[]).filter(t=>t.id!==id));
  }

  const STAR_COLORS = ["#f87171","#fb923c","#fbbf24","#a3e635","#34d399"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:14, color:"rgba(255,255,255,.5)" }}>{testimonials?.length||0} testimonials</div>
        <button onClick={()=>setAdding(a=>!a)}
          style={{ padding:"8px 18px", borderRadius:9, background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          {adding ? "✕ Cancel" : "+ Add Testimonial"}
        </button>
      </div>

      {msg && <div style={{ padding:"10px 14px", borderRadius:9, background:msg.ok?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)", border:`1px solid ${msg.ok?"rgba(52,211,153,.3)":"rgba(248,113,113,.3)"}`, color:msg.ok?"#34d399":"#f87171", fontSize:12 }}>{msg.text}</div>}

      {/* Pending Reviews */}
      {pending.length > 0 && (
        <div style={{ background:"rgba(251,191,36,.04)", borderRadius:16, border:"1px solid rgba(251,191,36,.2)", overflow:"hidden" }}>
          <div style={{ padding:"12px 18px", borderBottom:"1px solid rgba(251,191,36,.12)", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#fbbf24" }}>⏳ Pending Reviews</span>
            <span style={{ padding:"2px 9px", borderRadius:20, background:"rgba(251,191,36,.15)", color:"#fbbf24", fontSize:11, fontWeight:700 }}>{pending.length}</span>
            <span style={{ fontSize:11.5, color:"rgba(255,255,255,.3)", marginLeft:4 }}>Submitted by users — approve to publish on website</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {pending.map((t,i)=>(
              <div key={t.id} style={{ padding:"16px 18px", borderBottom:i<pending.length-1?"1px solid rgba(255,255,255,.04)":"none", display:"flex", gap:14, alignItems:"flex-start" }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#fbbf24)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, flexShrink:0 }}>
                  {t.name?.[0]||"?"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"white" }}>{t.name}</span>
                    {t.role && <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{t.role}</span>}
                    {t.company && <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>· {t.company}</span>}
                    <span style={{ display:"flex", gap:2 }}>
                      {[1,2,3,4,5].map(n=><span key={n} style={{ fontSize:12, color:n<=t.rating?"#fbbf24":"rgba(255,255,255,.12)" }}>★</span>)}
                    </span>
                    {t.planUsed && <span style={{ padding:"1px 7px", borderRadius:5, background:"rgba(99,102,241,.12)", color:"#818cf8", fontSize:10, fontWeight:700 }}>{t.planUsed}</span>}
                  </div>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,.65)", margin:"0 0 10px", lineHeight:1.65, whiteSpace:"pre-wrap" }}>{t.message}</p>
                  <div style={{ fontSize:10.5, color:"rgba(255,255,255,.25)" }}>
                    Submitted {new Date(t.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                  <button onClick={()=>changeStatus(t.id,"PUBLISH")} disabled={!!actionBusy}
                    style={{ padding:"7px 16px", borderRadius:8, background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)", color:"#34d399", fontSize:12, fontWeight:700, cursor:actionBusy?"not-allowed":"pointer", opacity:actionBusy?.startsWith(t.id)?.7:1 }}>
                    ✓ Approve
                  </button>
                  <button onClick={()=>changeStatus(t.id,"REJECT")} disabled={!!actionBusy}
                    style={{ padding:"7px 16px", borderRadius:8, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:12, fontWeight:700, cursor:actionBusy?"not-allowed":"pointer", opacity:actionBusy?.startsWith(t.id)?.7:1 }}>
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create form */}
      {adding && (
        <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:22 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:16 }}>New Testimonial</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
            {([["Name *","name"],["Company","company"],["Role","role"]] as [string,string][]).map(([label,key])=>(
              <div key={key} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
                <input value={(form as any)[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                  style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none" }}/>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em" }}>Plan Used</label>
              <select value={form.planUsed} onChange={e=>setForm(f=>({...f,planUsed:e.target.value}))}
                style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(15,18,40,1)", color:"white", fontSize:12.5, outline:"none" }}>
                <option value="">None</option>
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em" }}>Avatar URL</label>
              <input value={form.avatar} onChange={e=>setForm(f=>({...f,avatar:e.target.value}))} placeholder="https://..."
                style={{ padding:"8px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none" }}/>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:6 }}>Rating</label>
            <div style={{ display:"flex", gap:6 }}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setForm(f=>({...f,rating:n}))}
                  style={{ fontSize:22, background:"none", border:"none", cursor:"pointer", opacity:n<=form.rating?1:.25, color:STAR_COLORS[n-1] }}>★</button>
              ))}
              <span style={{ fontSize:12, color:"rgba(255,255,255,.4)", alignSelf:"center", marginLeft:4 }}>{form.rating}/5</span>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.35)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:6 }}>Message *</label>
            <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} rows={4} placeholder="What the customer said..."
              style={{ width:"100%", padding:"10px 12px", borderRadius:9, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:13, resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
          </div>
          <button onClick={handleCreate} disabled={saving}
            style={{ padding:"9px 24px", borderRadius:9, background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            {saving ? "Saving…" : "Save Testimonial"}
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
        {testimonials===null ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</div>
        ) : testimonials.length===0 ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>No testimonials yet. Add your first one above.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                {["Name","Company","Rating","Plan","Active","Featured",""].map(h=>(
                  <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {testimonials.map(t=>(
                <tr key={t.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      {t.avatar ? <img src={t.avatar} style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover" }} alt=""/> :
                        <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#f59e0b,#fbbf24)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700 }}>{t.name?.charAt(0)||"?"}</div>}
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"white" }}>{t.name}</div>
                        {t.role && <div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{t.role}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"12px 14px", fontSize:12, color:"rgba(255,255,255,.5)" }}>{t.company||"—"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:2 }}>
                      {[1,2,3,4,5].map(n=>(
                        <span key={n} style={{ fontSize:14, color:n<=t.rating?STAR_COLORS[n-1]:"rgba(255,255,255,.12)" }}>★</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    {t.planUsed ? <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(99,102,241,.12)", color:"#818cf8", fontSize:11, fontWeight:700 }}>{t.planUsed}</span> : <span style={{ color:"rgba(255,255,255,.2)", fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <button onClick={()=>toggleField(t.id,"active",!t.active)}
                      style={{ width:38, height:22, borderRadius:99, border:"none", cursor:"pointer", position:"relative",
                        background:t.active?"rgba(52,211,153,.3)":"rgba(255,255,255,.08)", transition:"background .2s" }}>
                      <span style={{ position:"absolute", top:3, left:t.active?18:4, width:16, height:16, borderRadius:"50%",
                        background:t.active?"#34d399":"rgba(255,255,255,.3)", transition:"left .2s" }}/>
                    </button>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <button onClick={()=>toggleField(t.id,"featured",!t.featured)}
                      style={{ width:38, height:22, borderRadius:99, border:"none", cursor:"pointer", position:"relative",
                        background:t.featured?"rgba(251,191,36,.3)":"rgba(255,255,255,.08)", transition:"background .2s" }}>
                      <span style={{ position:"absolute", top:3, left:t.featured?18:4, width:16, height:16, borderRadius:"50%",
                        background:t.featured?"#fbbf24":"rgba(255,255,255,.3)", transition:"left .2s" }}/>
                    </button>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <button onClick={()=>deleteOne(t.id)}
                      style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(248,113,113,.3)", background:"rgba(248,113,113,.08)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: LEAD MANAGEMENT
═══════════════════════════════════════════════════════ */
function PageCRM() {
  return (
    <div style={{ padding: 24, fontFamily: "inherit" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: "0 0 4px" }}>CRM Workspace</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>Visitors, leads, and pipeline — full CRM view.</p>
      </div>
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
        <iframe
          src="/admin/crm"
          style={{ width: "100%", height: "calc(100vh - 140px)", border: "none", background: "#060a14" }}
          title="CRM"
        />
      </div>
    </div>
  );
}

function PageLeads() {
  const [leads, setLeads]       = useState<any[]|null>(null);
  const [filter, setFilter]     = useState("all");
  const [editingNote, setEditingNote] = useState<string|null>(null);
  const [noteVal, setNoteVal]   = useState("");

  const STATUS_COLORS: Record<string,string> = {
    new:"#818cf8", contacted:"#fbbf24", qualified:"#34d399", converted:"#6366f1", lost:"#f87171",
  };
  const STATUSES = ["new","contacted","qualified","converted","lost"];

  function adminH(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  function load(status?: string) {
    const q = status&&status!=="all" ? `?status=${status}` : "";
    fetch(`/api/admin/leads${q}`, { headers:adminH() })
      .then(r=>r.json()).then(d=>setLeads(d.leads||[])).catch(()=>setLeads([]));
  }
  useEffect(()=>{ load(filter==="all"?undefined:filter); }, [filter]);

  async function updateStatus(id: string, status: string) {
    setLeads(ls=>(ls||[]).map(l=>l.id===id?{...l,status}:l));
    await fetch("/api/admin/leads",{ method:"PATCH", headers:adminH(true), body:JSON.stringify({id,status}) }).catch(()=>{});
  }

  async function saveNote(id: string) {
    setLeads(ls=>(ls||[]).map(l=>l.id===id?{...l,notes:noteVal}:l));
    setEditingNote(null);
    await fetch("/api/admin/leads",{ method:"PATCH", headers:adminH(true), body:JSON.stringify({id,notes:noteVal}) }).catch(()=>{});
  }

  async function deleteLead(id: string) {
    if (!await confirmToast("Delete this lead?")) return;
    await fetch(`/api/admin/leads?id=${id}`,{ method:"DELETE", headers:adminH() });
    setLeads(ls=>(ls||[]).filter(l=>l.id!==id));
  }

  // Summary stats
  const all = leads||[];
  const stats = STATUSES.map(s=>({ status:s, count:all.filter(l=>l.status===s).length }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Stats bar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10 }}>
        <div style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"white" }}>{all.length}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, marginTop:2 }}>Total Leads</div>
        </div>
        {stats.map(s=>(
          <div key={s.status} style={{ padding:"14px 16px", borderRadius:12, background:"rgba(255,255,255,.03)", border:`1px solid ${STATUS_COLORS[s.status]}22` }}>
            <div style={{ fontSize:22, fontWeight:800, color:STATUS_COLORS[s.status] }}>{s.count}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", fontWeight:600, marginTop:2, textTransform:"capitalize" }}>{s.status}</div>
          </div>
        ))}
      </div>

      {/* Filter buttons */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {["all",...STATUSES].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{ padding:"6px 16px", borderRadius:8, border:`1px solid ${filter===s?(STATUS_COLORS[s]||"rgba(99,102,241,.5)"):"rgba(255,255,255,.08)"}`,
              background:filter===s?"rgba(99,102,241,.12)":"rgba(255,255,255,.03)",
              color:filter===s?(STATUS_COLORS[s]||"#818cf8"):"rgba(255,255,255,.4)",
              fontSize:11, fontWeight:700, cursor:"pointer", textTransform:"capitalize" }}>
            {s==="all"?"All":s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", overflow:"auto" }}>
        {leads===null ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>Loading…</div>
        ) : leads.length===0 ? (
          <div style={{ padding:24, textAlign:"center", color:"rgba(255,255,255,.2)", fontSize:13 }}>No leads found.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:800 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(255,255,255,.07)" }}>
                {["Name","Email","Phone","Company","Source","Status","Date","Notes","Actions"].map(h=>(
                  <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(l=>(
                <tr key={l.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <td style={{ padding:"11px 14px", fontSize:13, fontWeight:600, color:"white", whiteSpace:"nowrap" }}>{l.name}</td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:"rgba(255,255,255,.5)" }}>{l.email}</td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:"rgba(255,255,255,.4)" }}>{l.phone||"—"}</td>
                  <td style={{ padding:"11px 14px", fontSize:12, color:"rgba(255,255,255,.4)" }}>{l.company||"—"}</td>
                  <td style={{ padding:"11px 14px" }}>
                    {l.source ? <span style={{ padding:"2px 8px", borderRadius:6, background:"rgba(255,255,255,.06)", color:"rgba(255,255,255,.5)", fontSize:11 }}>{l.source}</span> : <span style={{ color:"rgba(255,255,255,.2)", fontSize:12 }}>—</span>}
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <select value={l.status} onChange={e=>updateStatus(l.id,e.target.value)}
                      style={{ padding:"4px 8px", borderRadius:7, border:`1px solid ${STATUS_COLORS[l.status]||"rgba(255,255,255,.1)"}44`,
                        background:`${STATUS_COLORS[l.status]||"rgba(255,255,255,.05)"}18`, color:STATUS_COLORS[l.status]||"white",
                        fontSize:11, fontWeight:700, cursor:"pointer", outline:"none" }}>
                      {STATUSES.map(s=><option key={s} value={s} style={{ background:"#0c1030", color:"white", textTransform:"capitalize" }}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding:"11px 14px", fontSize:11, color:"rgba(255,255,255,.3)", whiteSpace:"nowrap" }}>
                    {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding:"11px 14px", minWidth:160 }}>
                    {editingNote===l.id ? (
                      <div style={{ display:"flex", gap:4 }}>
                        <input value={noteVal} onChange={e=>setNoteVal(e.target.value)} autoFocus
                          onBlur={()=>saveNote(l.id)}
                          onKeyDown={e=>{ if(e.key==="Enter") saveNote(l.id); if(e.key==="Escape") setEditingNote(null); }}
                          style={{ flex:1, padding:"4px 8px", borderRadius:6, border:"1px solid rgba(129,140,248,.4)", background:"rgba(255,255,255,.05)", color:"white", fontSize:11, outline:"none", minWidth:100 }}/>
                      </div>
                    ) : (
                      <div onClick={()=>{ setEditingNote(l.id); setNoteVal(l.notes||""); }} style={{ cursor:"text", fontSize:11, color:l.notes?"rgba(255,255,255,.6)":"rgba(255,255,255,.2)", fontStyle:l.notes?"normal":"italic", minHeight:20 }}>
                        {l.notes||"Click to add notes…"}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:"11px 14px" }}>
                    <button onClick={()=>deleteLead(l.id)}
                      style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(248,113,113,.3)", background:"rgba(248,113,113,.08)", color:"#f87171", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: SOCIAL MEDIA MARKETING
═══════════════════════════════════════════════════════ */
type SocialPlatform = "facebook"|"instagram"|"twitter"|"linkedin"|"tiktok"|"youtube";
type SocialPlatSettings = { enabled:boolean; pageUrl:string; pageId?:string; accessToken?:string; igUserId?:string; bearerToken?:string; apiKey?:string; apiSecret?:string; accessTokenSecret?:string; orgId?:string; channelId?:string };
type SocialSettings2 = Record<SocialPlatform, SocialPlatSettings>;
type SocialPostResult = { success:boolean; id?:string; error?:string };
type SocialPostItem = { id:string; createdAt:string; text:string; mediaUrl?:string; platforms:string[]; results:Record<string,SocialPostResult> };

const SOCIAL_PLATFORMS: { id:SocialPlatform; name:string; icon:string; color:string; bg:string; fields:{key:string;label:string;type?:string;placeholder:string;help?:string}[] }[] = [
  { id:"facebook", name:"Facebook", icon:"f", color:"#1877F2", bg:"rgba(24,119,242,.12)", fields:[
    { key:"pageUrl", label:"Page URL", placeholder:"https://facebook.com/yourpage" },
    { key:"pageId", label:"Page ID", placeholder:"1234567890", help:"Found in Facebook Page settings → About" },
    { key:"accessToken", label:"Page Access Token", type:"password", placeholder:"EAAx…", help:"Generate in Meta Developer Console → Graph API Explorer" },
  ]},
  { id:"instagram", name:"Instagram", icon:"", color:"#E1306C", bg:"rgba(225,48,108,.12)", fields:[
    { key:"pageUrl", label:"Profile URL", placeholder:"https://instagram.com/yourhandle" },
    { key:"igUserId", label:"IG User ID", placeholder:"17841400…", help:"Connected Instagram Business Account ID via Facebook" },
    { key:"accessToken", label:"Access Token", type:"password", placeholder:"EAAx…", help:"Same Page Access Token as Facebook" },
  ]},
  { id:"twitter", name:"Twitter / X", icon:"𝕏", color:"#000", bg:"rgba(255,255,255,.06)", fields:[
    { key:"pageUrl", label:"Profile URL", placeholder:"https://twitter.com/yourhandle" },
    { key:"bearerToken", label:"Bearer Token", type:"password", placeholder:"AAAA…", help:"Twitter Developer Portal → Project → Bearer Token" },
    { key:"apiKey", label:"API Key", type:"password", placeholder:"xxxx" },
    { key:"apiSecret", label:"API Secret", type:"password", placeholder:"xxxx" },
    { key:"accessToken", label:"Access Token", type:"password", placeholder:"xxxx" },
    { key:"accessTokenSecret", label:"Access Token Secret", type:"password", placeholder:"xxxx" },
  ]},
  { id:"linkedin", name:"LinkedIn", icon:"in", color:"#0A66C2", bg:"rgba(10,102,194,.12)", fields:[
    { key:"pageUrl", label:"Company Page URL", placeholder:"https://linkedin.com/company/yourco" },
    { key:"orgId", label:"Organization ID", placeholder:"1234567", help:"Found in LinkedIn Company Page URL" },
    { key:"accessToken", label:"Access Token", type:"password", placeholder:"AQVF…" },
  ]},
  { id:"tiktok", name:"TikTok", icon:"♪", color:"#010101", bg:"rgba(255,255,255,.04)", fields:[
    { key:"pageUrl", label:"Profile URL", placeholder:"https://tiktok.com/@yourhandle" },
  ]},
  { id:"youtube", name:"YouTube", icon:"▶", color:"#FF0000", bg:"rgba(255,0,0,.1)", fields:[
    { key:"pageUrl", label:"Channel URL", placeholder:"https://youtube.com/@yourchannel" },
    { key:"channelId", label:"Channel ID", placeholder:"UCxxxxx", help:"Found in YouTube Studio → Settings → Channel" },
  ]},
];
const SOCIAL_DEFAULT: SocialSettings2 = {
  facebook:  { enabled:false, pageUrl:"", pageId:"", accessToken:"" },
  instagram: { enabled:false, pageUrl:"", igUserId:"", accessToken:"" },
  twitter:   { enabled:false, pageUrl:"", bearerToken:"", apiKey:"", apiSecret:"", accessToken:"", accessTokenSecret:"" },
  linkedin:  { enabled:false, pageUrl:"", orgId:"", accessToken:"" },
  tiktok:    { enabled:false, pageUrl:"" },
  youtube:   { enabled:false, pageUrl:"", channelId:"" },
};

function PageSocial() {
  const [socialTab, setSocialTab] = useState<"settings"|"compose"|"history">("settings");
  const [settings, setSettings]   = useState<SocialSettings2>(SOCIAL_DEFAULT);
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);
  const [loading,  setLoading]    = useState(true);
  const [postText,     setPostText]     = useState("");
  const [mediaUrl,     setMediaUrl]     = useState("");
  const [selPlats,     setSelPlats]     = useState<SocialPlatform[]>([]);
  const [posting,      setPosting]      = useState(false);
  const [postResults,  setPostResults]  = useState<Record<string,SocialPostResult>|null>(null);
  const [postError,    setPostError]    = useState("");
  const [posts,        setPosts]        = useState<SocialPostItem[]>([]);
  const [histLoading,  setHistLoading]  = useState(false);

  const hdrs = () => ({ "Content-Type":"application/json", "x-user-role":"ADMIN" });

  useEffect(()=>{
    fetch("/api/admin/social/settings",{headers:hdrs()}).then(r=>r.json()).then(d=>{if(d.settings)setSettings({...SOCIAL_DEFAULT,...d.settings});}).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{ if(socialTab==="history") loadHistory(); },[socialTab]);

  function loadHistory(){
    setHistLoading(true);
    fetch("/api/admin/social/post",{headers:hdrs()}).then(r=>r.json()).then(d=>{if(d.posts)setPosts(d.posts);}).catch(()=>{}).finally(()=>setHistLoading(false));
  }
  function setField(platform:SocialPlatform, field:string, value:string|boolean){
    setSettings(prev=>({...prev,[platform]:{...prev[platform],[field]:value}}));
  }
  async function saveSocial(){
    setSaving(true);
    try{ await fetch("/api/admin/social/settings",{method:"POST",headers:hdrs(),body:JSON.stringify(settings)}); setSaved(true); setTimeout(()=>setSaved(false),3000); }catch{}finally{setSaving(false);}
  }
  async function createPost(){
    if(!postText.trim()){setPostError("Write something before posting.");return;}
    if(!selPlats.length){setPostError("Select at least one platform.");return;}
    setPosting(true); setPostError(""); setPostResults(null);
    try{
      const r=await fetch("/api/admin/social/post",{method:"POST",headers:hdrs(),body:JSON.stringify({text:postText,mediaUrl:mediaUrl||undefined,platforms:selPlats})});
      const d=await r.json();
      if(!r.ok){setPostError(d.error||"Failed");return;}
      setPostResults(d.results); setPostText(""); setMediaUrl("");
    }catch{setPostError("Network error.");}finally{setPosting(false);}
  }
  function togglePlat(id:SocialPlatform){ setSelPlats(prev=>prev.includes(id)?prev.filter(p=>p!==id):[...prev,id]); }

  const inp:React.CSSProperties = { width:"100%", padding:"10px 12px", borderRadius:9, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", color:"white", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" };
  const lbl:React.CSSProperties = { fontSize:11, fontWeight:700, color:"rgba(255,255,255,.4)", textTransform:"uppercase", letterSpacing:".05em", display:"block", marginBottom:6 };
  const card:React.CSSProperties = { borderRadius:16, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", padding:"20px 24px", marginBottom:16 };
  const tabBtn = (active:boolean):React.CSSProperties => ({ padding:"10px 20px", borderRadius:"10px 10px 0 0", border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, background:active?"rgba(99,102,241,.15)":"transparent", color:active?"#a5b4fc":"rgba(255,255,255,.4)", borderBottom:active?"2px solid #6366f1":"2px solid transparent" });
  const btn = (color?:string):React.CSSProperties => ({ padding:"11px 22px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:700, background:color||"linear-gradient(135deg,#6366f1,#4f46e5)", color:"white" });

  return (
    <div>
      {/* Page header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:"white" }}>📣 Social Media Marketing</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)", marginTop:3 }}>Connect accounts, compose posts, and publish to all platforms at once</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {SOCIAL_PLATFORMS.map(p=>{
            const en = settings[p.id]?.enabled;
            return <div key={p.id} style={{ width:30, height:30, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, background:en?p.bg:"rgba(255,255,255,.04)", border:`1px solid ${en?p.color+"40":"rgba(255,255,255,.08)"}`, color:en?p.color:"rgba(255,255,255,.2)" }}>{p.icon}</div>;
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, borderBottom:"1px solid rgba(255,255,255,.07)", marginBottom:24 }}>
        {(["settings","compose","history"] as const).map(t=>(
          <button key={t} style={tabBtn(socialTab===t)} onClick={()=>setSocialTab(t)}>
            {t==="settings"?"⚙ Platform Settings":t==="compose"?"✍ Post Composer":"📋 Post History"}
          </button>
        ))}
      </div>

      {/* ── Settings ── */}
      {socialTab==="settings" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Platform Connections</div>
              <div style={{ fontSize:12.5, color:"rgba(255,255,255,.4)", marginTop:3 }}>Enable platforms and enter API credentials to start posting</div>
            </div>
            <button onClick={saveSocial} disabled={saving} style={btn(saved?"rgba(52,211,153,.2)":undefined)}>{saving?"Saving…":saved?"✓ Saved!":"Save Settings"}</button>
          </div>
          {loading?<div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,.3)" }}>Loading…</div>:SOCIAL_PLATFORMS.map(plat=>(
            <div key={plat.id} style={{ ...card, border:`1px solid ${settings[plat.id]?.enabled?plat.color+"30":"rgba(255,255,255,.07)"}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:settings[plat.id]?.enabled?20:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:plat.bg, border:`1px solid ${plat.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:900, color:plat.color }}>{plat.icon}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:"white" }}>{plat.name}</div>
                    {settings[plat.id]?.pageUrl && <a href={settings[plat.id].pageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:plat.color, textDecoration:"none" }}>{settings[plat.id].pageUrl}</a>}
                  </div>
                </div>
                <div onClick={()=>setField(plat.id,"enabled",!settings[plat.id]?.enabled)} style={{ width:44, height:24, borderRadius:12, cursor:"pointer", position:"relative", background:settings[plat.id]?.enabled?plat.color:"rgba(255,255,255,.1)", transition:"all .2s" }}>
                  <div style={{ position:"absolute", top:3, left:settings[plat.id]?.enabled?23:3, width:18, height:18, borderRadius:"50%", background:"white", transition:"left .2s" }}/>
                </div>
              </div>
              {settings[plat.id]?.enabled && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {plat.fields.map(field=>(
                    <div key={field.key}>
                      <label style={lbl}>{field.label}</label>
                      <input type={field.type||"text"} value={(settings[plat.id] as any)[field.key]||""} onChange={e=>setField(plat.id,field.key,e.target.value)} placeholder={field.placeholder} style={inp}/>
                      {field.help && <div style={{ fontSize:10.5, color:"rgba(255,255,255,.25)", marginTop:4 }}>{field.help}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button onClick={saveSocial} disabled={saving} style={{ ...btn(), marginTop:8, width:"100%", padding:"13px" }}>{saving?"Saving…":saved?"✓ Saved!":"Save All Settings"}</button>
        </>
      )}

      {/* ── Compose ── */}
      {socialTab==="compose" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:24 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:16 }}>Create Post</div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Publish to</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {SOCIAL_PLATFORMS.map(plat=>{
                  const enabled=settings[plat.id]?.enabled; const selected=selPlats.includes(plat.id);
                  return <button key={plat.id} onClick={()=>enabled&&togglePlat(plat.id)} disabled={!enabled} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:9, border:`1.5px solid ${selected?plat.color:"rgba(255,255,255,.1)"}`, background:selected?plat.bg:"rgba(255,255,255,.03)", color:enabled?(selected?plat.color:"rgba(255,255,255,.6)"):"rgba(255,255,255,.2)", cursor:enabled?"pointer":"not-allowed", fontFamily:"inherit", fontSize:12.5, fontWeight:600, opacity:enabled?1:0.4 }}>
                    <span style={{ fontWeight:900, fontSize:13 }}>{plat.icon}</span>{plat.name}{!enabled&&<span style={{ fontSize:10, color:"rgba(255,255,255,.3)" }}>(not connected)</span>}
                  </button>;
                })}
              </div>
              {SOCIAL_PLATFORMS.filter(p=>settings[p.id]?.enabled).length===0 && <div style={{ marginTop:8, fontSize:12, color:"#fbbf24" }}>⚠ No platforms connected. Go to Platform Settings first.</div>}
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Caption / Post Text</label>
              <textarea value={postText} onChange={e=>setPostText(e.target.value)} placeholder="Write your post…" rows={6} style={{ ...inp, resize:"vertical", lineHeight:1.6 }}/>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.25)", marginTop:4 }}>
                <span>Twitter limit: 280 chars</span>
                <span style={{ color:postText.length>280?"#f87171":"rgba(255,255,255,.25)" }}>{postText.length} chars</span>
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Image / Video URL <span style={{ fontWeight:400, textTransform:"none", color:"rgba(255,255,255,.2)" }}>(optional)</span></label>
              <input value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} placeholder="https://yourcdn.com/image.jpg" style={inp}/>
              {mediaUrl && <div style={{ marginTop:8, borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,.1)", maxHeight:200 }}><img src={mediaUrl} alt="Preview" style={{ width:"100%", objectFit:"cover", maxHeight:200 }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/></div>}
            </div>
            {postError && <div style={{ marginBottom:12, padding:"10px 14px", borderRadius:9, background:"rgba(248,113,113,.1)", border:"1px solid rgba(248,113,113,.25)", fontSize:12.5, color:"#f87171" }}>{postError}</div>}
            <button onClick={createPost} disabled={posting||!selPlats.length} style={{ ...btn(), width:"100%", padding:"13px", fontSize:14, opacity:posting||!selPlats.length?0.5:1 }}>{posting?"Posting…":`Post to ${selPlats.length||0} Platform${selPlats.length!==1?"s":""} →`}</button>
            {postResults && (
              <div style={{ marginTop:16, padding:"16px 20px", borderRadius:12, background:"rgba(52,211,153,.06)", border:"1px solid rgba(52,211,153,.2)" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#34d399", marginBottom:12 }}>Post Results</div>
                {Object.entries(postResults).map(([platform,result])=>(
                  <div key={platform} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, fontSize:12.5 }}>
                    <span style={{ fontWeight:700, color:"rgba(255,255,255,.7)", width:80, textTransform:"capitalize" }}>{platform}</span>
                    {result.success?<span style={{ color:"#34d399" }}>✓ Published {result.id?`(ID: ${result.id})`:""}</span>:<span style={{ color:"#f87171" }}> {result.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.6)", marginBottom:12 }}>Preview</div>
            <div style={{ borderRadius:14, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", padding:"16px 18px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"white" }}>F</div>
                <div><div style={{ fontSize:13, fontWeight:700, color:"white" }}>FinovaOS</div><div style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>Just now</div></div>
              </div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,.75)", lineHeight:1.6, whiteSpace:"pre-wrap", marginBottom:mediaUrl?12:0 }}>{postText||<span style={{ color:"rgba(255,255,255,.2)" }}>Your post will appear here…</span>}</div>
              {mediaUrl && <div style={{ borderRadius:10, overflow:"hidden", marginTop:8 }}><img src={mediaUrl} alt="" style={{ width:"100%", objectFit:"cover", maxHeight:240 }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/></div>}
              <div style={{ marginTop:14, paddingTop:12, borderTop:"1px solid rgba(255,255,255,.06)", display:"flex", gap:16, fontSize:12, color:"rgba(255,255,255,.3)" }}><span>👍 Like</span><span>💬 Comment</span><span> Share</span></div>
            </div>
            <div style={{ marginTop:14, borderRadius:12, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", padding:"12px 16px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>Character Limits</div>
              {[{platform:"Twitter/X",limit:280,icon:"𝕏"},{platform:"LinkedIn",limit:3000,icon:"in"},{platform:"Facebook",limit:63206,icon:"f"},{platform:"Instagram",limit:2200,icon:""}].map(({platform,limit,icon})=>(
                <div key={platform} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7, fontSize:12 }}>
                  <span style={{ width:20, fontWeight:800, color:"rgba(255,255,255,.4)", fontSize:11 }}>{icon}</span>
                  <span style={{ flex:1, color:"rgba(255,255,255,.5)" }}>{platform}</span>
                  <span style={{ color:postText.length>limit?"#f87171":postText.length>limit*0.8?"#fbbf24":"#34d399", fontWeight:700 }}>{postText.length}/{limit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {socialTab==="history" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"white" }}>Post History</div>
            <button onClick={loadHistory} style={{ ...btn("rgba(99,102,241,.15)"), border:"1px solid rgba(99,102,241,.3)", color:"#a5b4fc" }}>↻ Refresh</button>
          </div>
          {histLoading?<div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,.3)" }}>Loading…</div>:posts.length===0?
            <div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(255,255,255,.25)", fontSize:13 }}>No posts yet. Use Post Composer to create your first post.</div>:
            posts.map(post=>{
              const allOk=Object.values(post.results||{}).every(r=>r.success); const anyOk=Object.values(post.results||{}).some(r=>r.success);
              return (
                <div key={post.id} style={{ ...card, marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {(post.platforms||[]).map(p=>{ const meta=SOCIAL_PLATFORMS.find(x=>x.id===p); const res=(post.results||{})[p]; return <span key={p} style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:res?.success?`${meta?.color}18`:"rgba(248,113,113,.12)", color:res?.success?meta?.color:"#f87171" }}>{res?.success?"✓":""} {meta?.name||p}</span>; })}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                      <span style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:allOk?"rgba(52,211,153,.1)":anyOk?"rgba(251,191,36,.1)":"rgba(248,113,113,.1)", color:allOk?"#34d399":anyOk?"#fbbf24":"#f87171", fontWeight:700 }}>{allOk?"All Sent":anyOk?"Partial":"Failed"}</span>
                      <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,.7)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{post.text}</div>
                  {post.mediaUrl && <div style={{ marginTop:8, fontSize:12, color:"#818cf8" }}>🖼 <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color:"#818cf8" }}>Media attached</a></div>}
                  {Object.entries(post.results||{}).filter(([,r])=>!r.success).map(([p,r])=><div key={p} style={{ marginTop:6, fontSize:11, color:"#f87171" }}>{p}: {r.error}</div>)}
                </div>
              );
            })
          }
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: SEO SETTINGS
═══════════════════════════════════════════════════════ */
function PageSeo() {
  const DEFAULT_CONFIG = {
    siteTitle: "FinovaOS — Smart Business Accounting",
    metaDescription: "Manage invoices, expenses, payroll, and more with FinovaOS.",
    ogImage: "",
    twitterHandle: "@finova_io",
    googleAnalyticsId: "",
    gscVerification: "",
    pages: {
      "/":         { title:"FinovaOS — Home",     description:"" },
      "/pricing":  { title:"Pricing — FinovaOS",  description:"" },
      "/features": { title:"Features — FinovaOS", description:"" },
      "/blog":     { title:"Blog — FinovaOS",     description:"" },
    },
  };

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{text:string;ok:boolean}|null>(null);

  function adminH(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  useEffect(()=>{
    fetch("/api/admin/settings?key=seo_config", { headers:adminH() })
      .then(r=>r.json())
      .then(d=>{
        if (d.value) { try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(d.value) }); } catch {} }
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method:"POST", headers:adminH(true),
        body: JSON.stringify({ key:"seo_config", value: JSON.stringify(config) }),
      });
      const d = await res.json();
      setMsg({ text: d.success ? "SEO settings saved!" : (d.error||"Error saving"), ok:!!d.success });
    } catch { setMsg({ text:"Request failed", ok:false }); }
    setSaving(false);
    setTimeout(()=>setMsg(null), 3000);
  }

  function updatePage(path: string, field: "title"|"description", value: string) {
    setConfig(c=>({ ...c, pages:{ ...c.pages, [path]:{ ...c.pages[path as keyof typeof c.pages], [field]:value } } }));
  }

  const inputStyle = { width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.04)", color:"white", fontSize:12.5, outline:"none", boxSizing:"border-box" as const };
  const labelStyle = { fontSize:10.5, fontWeight:700 as const, color:"rgba(255,255,255,.35)", textTransform:"uppercase" as const, letterSpacing:".05em", display:"block" as const, marginBottom:5 };

  if (loading) return <div style={{ textAlign:"center", padding:40, color:"rgba(255,255,255,.2)" }}>Loading…</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, maxWidth:900 }}>
      {msg && <div style={{ padding:"10px 14px", borderRadius:9, background:msg.ok?"rgba(52,211,153,.12)":"rgba(248,113,113,.12)", border:`1px solid ${msg.ok?"rgba(52,211,153,.3)":"rgba(248,113,113,.3)"}`, color:msg.ok?"#34d399":"#f87171", fontSize:12 }}>{msg.text}</div>}

      {/* Global defaults */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:22 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:18 }}>Global Defaults</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={labelStyle}>Site Title</label>
            <input value={config.siteTitle} onChange={e=>setConfig(c=>({...c,siteTitle:e.target.value}))} style={inputStyle}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={labelStyle}>Twitter Handle</label>
            <input value={config.twitterHandle} onChange={e=>setConfig(c=>({...c,twitterHandle:e.target.value}))} placeholder="@handle" style={inputStyle}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, gridColumn:"1/-1" }}>
            <label style={labelStyle}>Meta Description</label>
            <textarea value={config.metaDescription} onChange={e=>setConfig(c=>({...c,metaDescription:e.target.value}))} rows={2}
              style={{ ...inputStyle, resize:"vertical" as const }}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={labelStyle}>OG Image URL</label>
            <input value={config.ogImage} onChange={e=>setConfig(c=>({...c,ogImage:e.target.value}))} placeholder="https://..." style={inputStyle}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={labelStyle}>Google Analytics ID</label>
            <input value={config.googleAnalyticsId} onChange={e=>setConfig(c=>({...c,googleAnalyticsId:e.target.value}))} placeholder="G-XXXXXXXXXX" style={inputStyle}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4, gridColumn:"1/-1" }}>
            <label style={labelStyle}>Google Search Console Verification Code</label>
            <input value={config.gscVerification} onChange={e=>setConfig(c=>({...c,gscVerification:e.target.value}))} placeholder="Paste meta content value..." style={inputStyle}/>
          </div>
        </div>
      </div>

      {/* Per-page SEO */}
      <div style={{ background:"rgba(255,255,255,.03)", borderRadius:16, border:"1px solid rgba(255,255,255,.07)", padding:22 }}>
        <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".04em", textTransform:"uppercase", marginBottom:18 }}>Per-Page SEO</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {(Object.keys(config.pages) as (keyof typeof config.pages)[]).map(path=>{
            const pg = config.pages[path];
            return (
              <div key={path} style={{ padding:"16px 18px", borderRadius:12, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#818cf8", fontFamily:"monospace", marginBottom:10 }}>{path}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <label style={labelStyle}>Page Title</label>
                    <input value={pg.title} onChange={e=>updatePage(path,"title",e.target.value)} style={inputStyle}/>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <label style={labelStyle}>Meta Description</label>
                    <input value={pg.description} onChange={e=>updatePage(path,"description",e.target.value)} style={inputStyle}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        style={{ padding:"11px 28px", borderRadius:10, background:saving?"rgba(99,102,241,.3)":"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", alignSelf:"flex-start" }}>
        {saving ? "Saving…" : "💾 Save SEO Settings"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: NEWSLETTER SUBSCRIBERS
═══════════════════════════════════════════════════════ */
function PageNewsletter() {
  function adminH(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  const [items, setItems]   = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [active, setActive] = useState(0);
  const [unsub, setUnsub]   = useState(0);
  const [status, setStatus] = useState("active");
  const [page, setPage]     = useState(1);
  const [loading, setLoad]  = useState(true);
  const [showBroadcast, setShowBcast] = useState(false);
  const [subj, setSubj]     = useState("");
  const [body, setBody]     = useState("");
  const [preview, setPreview] = useState<number|null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent]     = useState<{sent:number;total:number}|null>(null);

  async function load() {
    setLoad(true);
    try {
      const p = new URLSearchParams({ status, page: String(page) });
      const r = await fetch(`/api/admin/newsletter?${p}`, { headers: adminH() });
      const d = await r.json();
      setItems(d.items||[]); setTotal(d.total||0);
      setActive(d.activeCount||0); setUnsub(d.unsubCount||0);
    } finally { setLoad(false); }
  }
  useEffect(()=>{ load(); },[status,page]);

  async function doBroadcast(previewOnly=false) {
    setSending(true);
    const r = await fetch("/api/admin/newsletter",{
      method:"POST", headers:adminH(true),
      body:JSON.stringify({ subject:subj, html:body, preview:previewOnly }),
    });
    const d = await r.json();
    if(previewOnly) setPreview(d.count);
    else setSent({sent:d.sent,total:d.total});
    setSending(false);
  }

  const card = (label:string,val:number,color:string) => (
    <div key={label} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"20px 22px"}}>
      <div style={{fontSize:28,fontWeight:800,color}}>{val}</div>
      <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:4,fontWeight:600}}>{label}</div>
    </div>
  );

  return (
    <div style={{fontFamily:"'Outfit',sans-serif",color:"white",paddingBottom:60}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontSize:24,fontWeight:800}}>Newsletter Subscribers</h1>
          <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,.4)"}}>جن لوگوں نے subscribe کیا ہے</p>
        </div>
        <button onClick={()=>{setShowBcast(true);setSent(null);setPreview(null);}} style={{padding:"10px 22px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontFamily:"inherit",fontSize:13,fontWeight:700,cursor:"pointer"}}>
          📧 Broadcast Email
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        {card("Active",active,"#34d399")}
        {card("Unsubscribed",unsub,"#f87171")}
        {card("Total",active+unsub,"#818cf8")}
      </div>

      <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} style={{background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"8px 14px",color:"white",fontFamily:"inherit",fontSize:13,outline:"none",marginBottom:16}}>
        <option value="active">Active</option>
        <option value="unsubscribed">Unsubscribed</option>
        <option value="all">All</option>
      </select>

      <div style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,.07)"}}>
            {["Email","Naam","Source","Status","Date"].map(h=>(
              <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:".07em"}}>{h.toUpperCase()}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} style={{padding:40,textAlign:"center",color:"rgba(255,255,255,.3)"}}>Loading...</td></tr>
            : items.length===0 ? <tr><td colSpan={5} style={{padding:40,textAlign:"center",color:"rgba(255,255,255,.3)"}}>کوئی subscriber نہیں</td></tr>
            : items.map((s:any)=>(
              <tr key={s.id} style={{borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <td style={{padding:"13px 16px",fontSize:13,fontWeight:600}}>{s.email}</td>
                <td style={{padding:"13px 16px",fontSize:13,color:"rgba(255,255,255,.55)"}}>{s.name||"—"}</td>
                <td style={{padding:"13px 16px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:"rgba(99,102,241,.15)",color:"#a5b4fc"}}>{s.source||"website"}</span></td>
                <td style={{padding:"13px 16px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:s.status==="active"?"rgba(52,211,153,.15)":"rgba(248,113,113,.15)",color:s.status==="active"?"#34d399":"#f87171"}}>{s.status}</span></td>
                <td style={{padding:"13px 16px",fontSize:12,color:"rgba(255,255,255,.4)"}}>{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&setShowBcast(false)}>
          <div style={{background:"#0f1629",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:32,width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:800}}>📧 Broadcast Email</h2>
              <button onClick={()=>setShowBcast(false)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.4)",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {sent ? (
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:48,marginBottom:12}}>✅</div>
                <h3 style={{margin:"0 0 8px",color:"#34d399"}}>Bhej Di Gayi!</h3>
                <p style={{color:"rgba(255,255,255,.5)",fontSize:14}}>{sent.sent}/{sent.total} subscribers ko deliver hua</p>
                <button onClick={()=>setShowBcast(false)} style={{marginTop:16,padding:"9px 24px",borderRadius:10,border:"none",background:"#6366f1",color:"white",fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>Close</button>
              </div>
            ):(
              <>
                <div style={{background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.2)",borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#a5b4fc"}}>
                  📊 {active} active subscribers ko jayegi
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",display:"block",marginBottom:6}}>SUBJECT *</label>
                  <input value={subj} onChange={e=>setSubj(e.target.value)} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"11px 14px",color:"white",fontFamily:"inherit",fontSize:13,outline:"none",boxSizing:"border-box"}} placeholder="Email subject..." />
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",display:"block",marginBottom:6}}>MESSAGE / HTML *</label>
                  <textarea value={body} onChange={e=>setBody(e.target.value)} rows={7} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"11px 14px",color:"white",fontFamily:"inherit",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}} placeholder="Email content (plain text ya HTML)..." />
                </div>
                {preview!==null && <div style={{background:"rgba(251,191,36,.08)",border:"1px solid rgba(251,191,36,.25)",borderRadius:10,padding:"9px 14px",marginBottom:12,fontSize:13,color:"#fbbf24"}}>✅ {preview} subscribers ko jayegi — confirm karein?</div>}
                <div style={{display:"flex",gap:10}}>
                  {preview===null ? (
                    <button onClick={()=>doBroadcast(true)} disabled={!subj||!body||sending} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid rgba(251,191,36,.3)",background:"rgba(251,191,36,.1)",color:"#fbbf24",fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
                      {sending?"Checking...":"Preview Check"}
                    </button>
                  ):(
                    <button onClick={()=>doBroadcast(false)} disabled={sending} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"white",fontFamily:"inherit",fontWeight:700,cursor:"pointer"}}>
                      {sending?"Bhej raha hai...":"✅ Send Karo"}
                    </button>
                  )}
                  <button onClick={()=>setPreview(null)} style={{padding:"10px 18px",borderRadius:10,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"rgba(255,255,255,.5)",fontFamily:"inherit",cursor:"pointer"}}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE: FEEDBACK & COMPLAINTS
═══════════════════════════════════════════════════════ */
function PageFeedback() {
  function adminH(json=false) {
    const uu = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"]="application/json";
    if (uu?.id)   h["x-user-id"]   = uu.id;
    if (uu?.role) h["x-user-role"] = uu.role;
    return h;
  }

  const STATUS_C: Record<string,string> = { open:"#f87171", in_review:"#fbbf24", resolved:"#34d399", closed:"#64748b" };
  const TYPE_C:   Record<string,string> = { complaint:"#f87171", suggestion:"#fbbf24", bug:"#a78bfa", general:"#34d399" };
  const PRI_C:    Record<string,string> = { low:"#64748b", normal:"#38bdf8", high:"#f59e0b", urgent:"#ef4444" };

  const [items, setItems]   = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [stats, setStats]   = useState<any[]>([]);
  const [byType,setByType]  = useState<any[]>([]);
  const [loading,setLoad]   = useState(true);
  const [statusF,setStatusF]= useState("");
  const [typeF,  setTypeF]  = useState("");
  const [page,   setPage]   = useState(1);
  const [sel,    setSel]    = useState<any|null>(null);
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoad(true);
    try {
      const p = new URLSearchParams({ page:String(page) });
      if(statusF) p.set("status",statusF);
      if(typeF)   p.set("type",typeF);
      const r = await fetch(`/api/admin/feedback?${p}`,{headers:adminH()});
      const d = await r.json();
      setItems(d.items||[]); setTotal(d.total||0);
      setStats(d.stats||[]); setByType(d.byType||[]);
    } finally { setLoad(false); }
  }
  useEffect(()=>{ load(); },[statusF,typeF,page]);

  async function updateFb(id:string, patch:any) {
    setSaving(true);
    await fetch("/api/admin/feedback",{method:"POST",headers:adminH(true),body:JSON.stringify({id,...patch})});
    setSaving(false); setSel(null); load();
  }

  const openC    = stats.find((s:any)=>s.status==="open")?._count?.id||0;
  const reviewC  = stats.find((s:any)=>s.status==="in_review")?._count?.id||0;
  const resolvedC= stats.find((s:any)=>s.status==="resolved")?._count?.id||0;

  return (
    <div style={{fontFamily:"'Outfit',sans-serif",color:"white",paddingBottom:60}}>
      <div style={{marginBottom:24}}>
        <h1 style={{margin:"0 0 4px",fontSize:24,fontWeight:800}}>Feedback & Complaints</h1>
        <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,.4)"}}>Users اور visitors کی complaints، suggestions، اور bug reports</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:14,marginBottom:20}}>
        {[{l:"Open",v:openC,c:"#f87171"},{l:"In Review",v:reviewC,c:"#fbbf24"},{l:"Resolved",v:resolvedC,c:"#34d399"},{l:"Total",v:total,c:"#818cf8"}].map(k=>(
          <div key={k.l} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,padding:"18px 20px"}}>
            <div style={{fontSize:26,fontWeight:800,color:k.c}}>{k.v}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginTop:3,fontWeight:600}}>{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
        {byType.map((t:any)=>(
          <span key={t.type} style={{padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,background:`${TYPE_C[t.type]||"#818cf8"}18`,color:TYPE_C[t.type]||"#818cf8"}}>
            {t.type}: {t._count.id}
          </span>
        ))}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        {[
          {val:statusF,set:setStatusF,opts:[{v:"",l:"All Status"},{v:"open",l:"Open"},{v:"in_review",l:"In Review"},{v:"resolved",l:"Resolved"},{v:"closed",l:"Closed"}]},
          {val:typeF,  set:setTypeF,  opts:[{v:"",l:"All Types"},{v:"complaint",l:"Complaint"},{v:"suggestion",l:"Suggestion"},{v:"bug",l:"Bug"},{v:"general",l:"General"}]},
        ].map((s,i)=>(
          <select key={i} value={s.val} onChange={e=>{s.set(e.target.value);setPage(1);}} style={{background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:"8px 14px",color:"white",fontFamily:"inherit",fontSize:13,outline:"none"}}>
            {s.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
      </div>

      <div style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.07)",borderRadius:16,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,.07)"}}>
            {["Type","Subject","From","Priority","Status","Date"].map(h=>(
              <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",letterSpacing:".07em"}}>{h.toUpperCase()}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{padding:40,textAlign:"center",color:"rgba(255,255,255,.3)"}}>Loading...</td></tr>
            : items.length===0 ? <tr><td colSpan={6} style={{padding:40,textAlign:"center",color:"rgba(255,255,255,.3)"}}>کوئی feedback نہیں</td></tr>
            : items.map((fb:any)=>(
              <tr key={fb.id} onClick={()=>{setSel(fb);setNote(fb.adminNote||"");}} style={{borderBottom:"1px solid rgba(255,255,255,.04)",cursor:"pointer",transition:"background .15s"}}
                onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.03)")}
                onMouseLeave={e=>(e.currentTarget.style.background="")}>
                <td style={{padding:"13px 16px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${TYPE_C[fb.type]||"#818cf8"}18`,color:TYPE_C[fb.type]||"#818cf8"}}>{fb.type}</span></td>
                <td style={{padding:"13px 16px",fontSize:13,fontWeight:600,maxWidth:180}}>{fb.subject}</td>
                <td style={{padding:"13px 16px",fontSize:12,color:"rgba(255,255,255,.5)"}}>{fb.name||fb.email||"—"}</td>
                <td style={{padding:"13px 16px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${PRI_C[fb.priority]}18`,color:PRI_C[fb.priority]}}>{fb.priority}</span></td>
                <td style={{padding:"13px 16px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${STATUS_C[fb.status]}18`,color:STATUS_C[fb.status]}}>{fb.status.replace("_"," ")}</span></td>
                <td style={{padding:"13px 16px",fontSize:12,color:"rgba(255,255,255,.4)"}}>{new Date(fb.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {sel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={e=>e.target===e.currentTarget&&setSel(null)}>
          <div style={{background:"#0f1629",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:32,width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                  {[
                    {c:TYPE_C[sel.type],v:sel.type},
                    {c:STATUS_C[sel.status],v:sel.status.replace("_"," ")},
                    {c:PRI_C[sel.priority],v:sel.priority},
                  ].map((b,i)=><span key={i} style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:`${b.c}18`,color:b.c}}>{b.v}</span>)}
                </div>
                <h2 style={{margin:0,fontSize:17,fontWeight:800}}>{sel.subject}</h2>
              </div>
              <button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.4)",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>

            <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:12,padding:16,marginBottom:16}}>
              <p style={{margin:0,fontSize:13,color:"rgba(255,255,255,.7)",lineHeight:1.8}}>{sel.message}</p>
            </div>

            {(sel.name||sel.email) && (
              <div style={{display:"flex",gap:14,marginBottom:16,fontSize:12,color:"rgba(255,255,255,.4)"}}>
                {sel.name&&<span>👤 {sel.name}</span>}
                {sel.email&&<span>✉️ {sel.email}</span>}
                <span>📅 {new Date(sel.createdAt).toLocaleString()}</span>
              </div>
            )}

            <div style={{marginBottom:16}}>
              <label style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.35)",display:"block",marginBottom:6}}>ADMIN NOTE (internal)</label>
              <textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1.5px solid rgba(255,255,255,.1)",borderRadius:10,padding:12,color:"white",fontFamily:"inherit",fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}} placeholder="Internal note..." />
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {[{l:"In Review",s:"in_review",c:"#fbbf24"},{l:"Resolved",s:"resolved",c:"#34d399"},{l:"Close",s:"closed",c:"#64748b"},{l:"Re-open",s:"open",c:"#f87171"}].map(a=>(
                <button key={a.s} onClick={()=>updateFb(sel.id,{status:a.s,adminNote:note})} disabled={saving||sel.status===a.s}
                  style={{padding:"9px",borderRadius:10,border:`1px solid ${a.c}30`,background:`${a.c}15`,color:a.c,fontFamily:"inherit",fontWeight:700,cursor:"pointer",opacity:sel.status===a.s?.35:1}}>
                  {saving?"...":a.l}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,color:"rgba(255,255,255,.35)"}}>Priority:</span>
              {["low","normal","high","urgent"].map(p=>(
                <button key={p} onClick={()=>updateFb(sel.id,{priority:p,adminNote:note})} disabled={saving||sel.priority===p}
                  style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${PRI_C[p]}30`,background:`${PRI_C[p]}15`,color:PRI_C[p],fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer",opacity:sel.priority===p?.35:1}}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN ADMIN PANEL
═══════════════════════════════════════════════════════ */
export default function AdminPanel() {
  const [page,        setPage]        = useState<Page>("dashboard");
  const [avatarOpen,  setAvatarOpen]  = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // ── Team member access control ───────────────────────────────────────────
  const adminUser = getAdminUser();
  const isSuperAdmin: boolean = adminUser.isSuperAdmin !== false; // true if undefined (legacy) or explicitly true
  const allowedPages: string[] | null = isSuperAdmin ? null : (adminUser.allowedPages || []);
  const visibleNav = allowedPages ? NAV.filter(n => allowedPages.includes(n.page) || n.page === "dashboard") : NAV;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  /* ── Live support waiting count (nav badge) ── */
  const [waitingChats, setWaitingChats] = useState(0);
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch("/api/chat/conversations?limit=100");
        const d = await r.json();
        const w = (d.data||[]).filter((c: {status:string}) => c.status === "waiting").length;
        setWaitingChats(w);
      } catch {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  /* ── Notifications state ── */
  const [notifs,      setNotifs]      = useState<Notif[]>([]);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifs.filter(n=>!n.isRead).length;

  /* ── Load notifications from /api/admin/notifications ── */
  const loadNotifs = useCallback(async () => {
    try {
      const u = getAdminUser();
      const h: Record<string,string> = {};
      if (u?.role) h["x-user-role"] = u.role;
      if (u?.id)   h["x-user-id"]   = u.id;
      const res = await fetch("/api/admin/notifications", { headers: h });
      if (!res.ok) return;
      const data = await res.json();
      if (data.notifications) setNotifs(data.notifications as Notif[]);
    } catch {
      // Silently ignore — non-critical
    }
  }, []);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  // Poll notifications every 30s
  useEffect(() => {
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, [loadNotifs]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function getAdminH(json=false): Record<string,string> {
    const u = getAdminUser();
    const h: Record<string,string> = {};
    if (json) h["Content-Type"] = "application/json";
    if (u?.role) h["x-user-role"] = u.role;
    if (u?.id)   h["x-user-id"]   = u.id;
    return h;
  }

  /* ── Mark one as read ── */
  async function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id===id ? {...n, isRead:true} : n));
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: getAdminH(true),
      body: JSON.stringify({ action: "MARK_READ", id }),
    });
  }

  /* ── Mark all read ── */
  async function markAllRead() {
    setNotifs(prev => prev.map(n => ({...n, isRead:true})));
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: getAdminH(true),
      body: JSON.stringify({ action: "MARK_READ", id: "ALL" }),
    });
  }

  /* ── Dismiss / clear one ── */
  async function clearNotif(id: string) {
    setNotifs(prev => prev.filter(n => n.id!==id));
    // No delete API needed - just mark read
    await markRead(id);
  }

  const PAGE_TITLES: Record<Page,string> = {
    dashboard:"Dashboard", companies:"Companies & Users", users:"Users", revenue:"Revenue Analytics",
    geo:"Geo Analytics", usage:"Usage Insights", plans:"Plans & Billing",
    system:"System Health", logs:"Audit Logs", permissions:"Permissions", settings:"Settings",
    profile:"My Profile", tickets:"Support Tickets", broadcasts:"Broadcasts",
    flags:"Feature Flags", apikeys:"API Keys", visitors:"Visitor Analytics",
    updates:"Product Updates", livesupport:"Live Support",
    subscriptions:"Subscriptions", coupons:"Coupon Codes", emaillogs:"Email Logs", referrals:"Referrals",
    teams:"Team Access",
    testimonials:"Testimonials", leads:"Lead Management", seo:"SEO Settings", social:"Social Media",
    business_modules:"Business Modules",
    newsletter:"Newsletter Subscribers", feedback:"Feedback & Complaints",
    crm:"CRM Workspace",
    fraud:"Fraud & Risk Monitor",
  };

  const PAGE_ICONS: Partial<Record<Page,string>> = {
    dashboard:"▣", companies:"⬡", subscriptions:"◈", revenue:"◉", geo:"◎",
    usage:"⬡", visitors:"◈", plans:"◆", business_modules:"⬡", coupons:"◈",
    crm:"◈", referrals:"◉", leads:"◎", broadcasts:"◈", testimonials:"◆", updates:"◉",
    seo:"◎", social:"◈", livesupport:"◉", tickets:"◎", system:"◈", logs:"◆",
    emaillogs:"◉", flags:"◎", apikeys:"◈", permissions:"◆", teams:"◉", settings:"◎",
  };

  const renderPage = () => {
    // Block team members from pages they're not allowed to see
    if (allowedPages && page !== "dashboard" && !allowedPages.includes(page)) {
      return (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:12 }}>
          <div style={{ fontSize:48 }}>🔒</div>
          <div style={{ fontSize:18, fontWeight:700, color:"white" }}>Access Restricted</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,.4)" }}>You don't have permission to view this page.</div>
          <button onClick={()=>setPage("dashboard")} style={{ marginTop:8, padding:"8px 20px", borderRadius:9, background:"rgba(99,102,241,.6)", border:"none", color:"white", fontWeight:700, fontSize:13, cursor:"pointer" }}>Go to Dashboard</button>
        </div>
      );
    }
    switch(page) {
      case "dashboard":   return <PageDashboard setPage={setPage}/>;
      case "companies":   return <PageCompaniesUsers/>;
      case "users":       return <PageCompaniesUsers/>;
      case "revenue":     return <PageRevenue/>;
      case "geo":         return <PageGeo/>;
      case "usage":       return <PageUsage setPage={setPage}/>;
      case "plans":       return <PagePlans/>;
      case "system":      return <PageSystem/>;
      case "logs":        return <PageLogs/>;
      case "permissions":  return <PagePermissions/>;
      case "livesupport":   return <PageLiveSupport/>;
      case "settings":      return <PageSettings/>;
      case "profile":       return <PageProfile setPage={setPage}/>;
      case "updates":       return <PageUpdates/>;
      case "visitors":      return <PageVisitors/>;
      case "tickets":       return <PageTickets/>;
      case "broadcasts":    return <PageBroadcasts/>;
      case "flags":         return <PageFlags/>;
      case "apikeys":       return <PageApiKeys/>;
      case "subscriptions": return <PageSubscriptions/>;
      case "business_modules": return <PageBusinessModules/>;
      case "coupons":       return <PageCoupons/>;
      case "emaillogs":     return <PageEmailLogs/>;
      case "referrals":     return <PageReferrals/>;
      case "teams":         return <PageTeams/>;
      case "testimonials":  return <PageTestimonials/>;
      case "leads":         return <PageLeads/>;
      case "crm":           return <PageCRM/>;
      case "seo":           return <PageSeo/>;
      case "social":        return <PageSocial/>;
      case "newsletter":    return <PageNewsletter/>;
      case "feedback":      return <PageFeedback/>;
    }
  };

  const adminName = (getAdminUser()?.name || "Admin").split(" ")[0];
  const adminEmail = getAdminUser()?.email || "finovaos.app@gmail.com";
  const adminInitial = adminName.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight:"100vh", background:"#060a14", color:"white", fontFamily:"'Outfit','Inter',sans-serif", display:"flex", overflowX:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:.7}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:rgba(99,102,241,.25);border-radius:4px;}
        ::-webkit-scrollbar-thumb:hover{background:rgba(99,102,241,.45);}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        select option{background:#0c1122;color:white;}
        .nav-btn{transition:all .15s ease!important;}
        .nav-btn:hover .nav-label{color:rgba(255,255,255,.9)!important;}
      `}</style>

      {/* ══════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:45 }}
        />
      )}

      <aside style={{
        width: collapsed ? 64 : 256,
        minHeight:"100vh",
        background:"#0a0f1e",
        borderRight:"1px solid rgba(255,255,255,.06)",
        display:"flex", flexDirection:"column",
        transition:"width .25s cubic-bezier(.4,0,.2,1)",
        position:"sticky", top:0, height:"100vh",
        overflowY:"auto", overflowX:"hidden", flexShrink:0, zIndex:40,
        transform: mobileOpen ? "translateX(0)" : undefined,
      }}
      className={mobileOpen ? "max-md:fixed max-md:left-0 max-md:top-0 max-md:bottom-0 max-md:z-50 max-md:w-[82vw] max-md:max-w-[320px]" : "max-md:hidden"}>
        {/* Top glow line */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent 0%,#6366f1 40%,#a78bfa 60%,transparent 100%)",opacity:.6 }}/>

        {/* ── Logo ── */}
        <div style={{
          height:64, display:"flex", alignItems:"center",
          padding: collapsed ? "0" : "0 18px", gap:12,
          borderBottom:"1px solid rgba(255,255,255,.05)",
          flexShrink:0, overflow:"hidden",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width:34, height:34, borderRadius:10, flexShrink:0,
            background:"linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 0 1px rgba(99,102,241,.4), 0 4px 16px rgba(79,70,229,.4)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5" opacity=".75"/>
              <path d="M2 12l10 5 10-5" opacity=".9"/>
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:"white",letterSpacing:"-0.02em",lineHeight:1 }}>FinovaOS</div>
              <div style={{ fontSize:9,color:"rgba(255,255,255,.22)",fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",marginTop:3 }}>Admin Console</div>
            </div>
          )}
        </div>

        {/* ── Grouped Nav ── */}
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto", overflowX:"hidden" }}>
          {NAV_GROUPS.map(group => {
            const groupItems = visibleNav.filter(n => group.pages.includes(n.page));
            if (!groupItems.length) return null;
            return (
              <div key={group.label} style={{ marginBottom:4 }}>
                {!collapsed && (
                  <div style={{ padding:"10px 10px 4px", fontSize:9, fontWeight:800, color:"rgba(255,255,255,.18)", letterSpacing:".12em", textTransform:"uppercase", userSelect:"none" }}>
                    {group.label}
                  </div>
                )}
                {collapsed && <div style={{ height:6 }}/>}
                {groupItems.map(item => {
                  const active = page === item.page;
                  return (
                    <button key={item.page}
                      className="nav-btn"
                      onClick={() => { if (item.page === "fraud") { window.location.href = "/admin/fraud"; return; } setPage(item.page); setMobileOpen(false); }}
                      title={collapsed ? item.label : undefined}
                      style={{
                        display:"flex", alignItems:"center", gap:10,
                        padding: collapsed ? "9px 0" : "8px 10px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        borderRadius:9, border:"none", cursor:"pointer",
                        fontFamily:"inherit", width:"100%", position:"relative",
                        marginBottom:1,
                        background: active
                          ? `linear-gradient(90deg, ${item.color}18 0%, ${item.color}08 100%)`
                          : "transparent",
                        outline: active ? `1px solid ${item.color}22` : "1px solid transparent",
                      }}>
                      {/* Active left bar */}
                      {active && (
                        <div style={{
                          position:"absolute", left:0, top:"12%", bottom:"12%", width:3,
                          borderRadius:"0 3px 3px 0",
                          background:`linear-gradient(180deg, ${item.color} 0%, ${item.color}60 100%)`,
                        }}/>
                      )}
                      {/* Icon bubble */}
                      <div style={{
                        width:28, height:28, borderRadius:8, flexShrink:0,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        background: active ? `${item.color}22` : "rgba(255,255,255,.04)",
                        border: active ? `1px solid ${item.color}30` : "1px solid rgba(255,255,255,.05)",
                        transition:"all .15s",
                      }}>
                        <span style={{ color: active ? item.color : "rgba(255,255,255,.4)", display:"flex", alignItems:"center" }}>
                          {NAV_ICONS[item.page] ?? (
                            <svg width="13" height="13" viewBox="0 0 10 10" fill="currentColor">
                              <rect x="1" y="1" width="8" height="8" rx="1.5"/>
                            </svg>
                          )}
                        </span>
                      </div>
                      {/* Label */}
                      {!collapsed && (
                        <span className="nav-label" style={{
                          fontSize:12.5, fontWeight: active ? 700 : 500,
                          color: active ? item.color : "rgba(255,255,255,.45)",
                          flex:1, textAlign:"left", whiteSpace:"nowrap",
                          overflow:"hidden", textOverflow:"ellipsis",
                          letterSpacing: active ? "0" : "0",
                        }}>
                          {item.label}
                        </span>
                      )}
                      {/* Badges */}
                      {item.badge && !collapsed && (
                        <span style={{ fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:8,background:"rgba(52,211,153,.12)",color:"#34d399",letterSpacing:".04em",border:"1px solid rgba(52,211,153,.18)" }}>{item.badge}</span>
                      )}
                      {item.page==="livesupport" && waitingChats > 0 && !collapsed && (
                        <span style={{ fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:8,background:"rgba(251,191,36,.12)",color:"#fbbf24",border:"1px solid rgba(251,191,36,.2)",animation:"blink 1.5s ease infinite" }}>{waitingChats}</span>
                      )}
                      {item.page==="livesupport" && waitingChats > 0 && collapsed && (
                        <div style={{ position:"absolute",top:5,right:5,width:7,height:7,borderRadius:"50%",background:"#fbbf24",boxShadow:"0 0 5px #fbbf24",animation:"pulse 2s ease infinite" }}/>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

        </nav>

        {/* ── Bottom: User + Collapse ── */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", padding:"10px 8px", flexShrink:0 }}>
          {/* User profile strip */}
          {!collapsed && (
            <div style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
              borderRadius:10, background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.06)", marginBottom:8, cursor:"pointer",
              transition:"background .15s",
            }}
              onClick={() => setPage("profile")}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(99,102,241,.08)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,.03)")}>
              <div style={{ width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"white",flexShrink:0 }}>
                {adminInitial}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,.85)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{adminName}</div>
                <div style={{ fontSize:10,color:"rgba(255,255,255,.25)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>Super Admin</div>
              </div>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#34d399",flexShrink:0,boxShadow:"0 0 5px #34d399",animation:"pulse 3s ease infinite" }}/>
            </div>
          )}
          {/* Collapse button */}
          <button onClick={() => setCollapsed(v=>!v)}
            style={{
              width:"100%", padding:"8px", borderRadius:9,
              border:"1px solid rgba(255,255,255,.06)",
              background:"rgba(255,255,255,.03)",
              color:"rgba(255,255,255,.3)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              transition:"all .15s", fontSize:11, fontWeight:600, fontFamily:"inherit",
            }}
            onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,255,255,.7)";e.currentTarget.style.background="rgba(255,255,255,.06)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,.3)";e.currentTarget.style.background="rgba(255,255,255,.03)";}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform:collapsed?"rotate(180deg)":"none", transition:"transform .25s" }}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════════ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>

        {/* ── Top Header ── */}
        <header style={{
          height:64, flexShrink:0, position:"sticky", top:0, zIndex:30,
          background:"rgba(6,10,20,.9)", backdropFilter:"blur(20px)",
          borderBottom:"1px solid rgba(255,255,255,.05)",
          display:"flex", alignItems:"center", padding:"10px 14px", gap:12, flexWrap:"wrap",
        }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden"
            style={{
              width:38, height:38, borderRadius:10, border:"1px solid rgba(255,255,255,.09)",
              background:"rgba(255,255,255,.04)", color:"rgba(255,255,255,.78)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          {/* Left: breadcrumb + title */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:2 }}>
              <span style={{ fontSize:10,color:"rgba(255,255,255,.18)",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase" }}>FinovaOS</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              <span style={{ fontSize:10,color:"rgba(255,255,255,.35)",fontWeight:600,letterSpacing:".06em",textTransform:"uppercase" }}>{PAGE_TITLES[page]}</span>
            </div>
            <h1 style={{ fontSize:17,fontWeight:800,color:"white",letterSpacing:"-0.02em",lineHeight:1 }}>
              {PAGE_TITLES[page]}
            </h1>
          </div>

          {/* System status pill */}
          <div
            style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:20,background:"rgba(52,211,153,.06)",border:"1px solid rgba(52,211,153,.15)" }}
            className="hidden sm:flex"
          >
            <div style={{ width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px #34d399",animation:"pulse 3s ease infinite" }}/>
            <span style={{ fontSize:10.5,fontWeight:700,color:"#34d399",letterSpacing:".02em" }}>All Systems Operational</span>
          </div>

          {/* Notifications */}
          <div ref={notifRef} style={{ position:"relative" }}>
            <button onClick={() => setNotifOpen(v=>!v)}
              style={{
                position:"relative", width:38, height:38, borderRadius:10, cursor:"pointer",
                background: notifOpen ? "rgba(99,102,241,.2)" : "rgba(255,255,255,.04)",
                border:`1px solid ${notifOpen ? "rgba(99,102,241,.4)" : "rgba(255,255,255,.07)"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all .15s", flexShrink:0,
              }}
              onMouseEnter={e=>{ if(!notifOpen){e.currentTarget.style.background="rgba(255,255,255,.07)";e.currentTarget.style.borderColor="rgba(255,255,255,.12)"; }}}
              onMouseLeave={e=>{ if(!notifOpen){e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.borderColor="rgba(255,255,255,.07)"; }}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={notifOpen?"#a5b4fc":"rgba(255,255,255,.5)"} strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <div style={{ position:"absolute",top:-3,right:-3,minWidth:16,height:16,borderRadius:8,background:"#ef4444",fontSize:8.5,fontWeight:800,color:"white",display:"flex",alignItems:"center",justifyContent:"center",border:"2px solid #060a14",padding:"0 3px" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </div>
              )}
            </button>
            {notifOpen && (
              <NotificationsDropdown notifs={notifs} onMarkRead={markRead} onMarkAllRead={markAllRead} onClear={clearNotif}/>
            )}
          </div>

          {/* Avatar dropdown */}
          <div style={{ position:"relative" }} ref={avatarRef}>
            <button onClick={() => setAvatarOpen(v=>!v)}
              style={{
                display:"flex", alignItems:"center", gap:9, padding:"6px 12px 6px 8px",
                borderRadius:10, cursor:"pointer",
                background: avatarOpen ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)",
                border:`1px solid ${avatarOpen ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.07)"}`,
                transition:"all .15s",
              }}
              onMouseEnter={e=>{ if(!avatarOpen){e.currentTarget.style.background="rgba(255,255,255,.07)"; }}}
              onMouseLeave={e=>{ if(!avatarOpen){e.currentTarget.style.background="rgba(255,255,255,.04)"; }}}>
              <div style={{ width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"white" }}>
                {adminInitial}
              </div>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontSize:12,fontWeight:700,color:"rgba(255,255,255,.85)",lineHeight:1 }}>{adminName}</div>
                <div style={{ fontSize:9.5,color:"rgba(255,255,255,.3)",marginTop:2,letterSpacing:".02em" }}>Super Admin</div>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2.5" strokeLinecap="round" style={{ transition:"transform .2s", transform: avatarOpen ? "rotate(180deg)" : "none" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {avatarOpen && (
              <>
                <div onClick={() => setAvatarOpen(false)} style={{ position:"fixed",inset:0,zIndex:45 }}/>
                <div style={{
                  position:"absolute",top:"calc(100% + 8px)",right:0,width:228,zIndex:50,
                  background:"#0c1122",border:"1px solid rgba(255,255,255,.08)",
                  borderRadius:14,boxShadow:"0 16px 48px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)",
                  animation:"fadeUp .15s ease both", overflow:"hidden",
                }}>
                  <div style={{ padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,.06)",display:"flex",gap:10,alignItems:"center" }}>
                    <div style={{ width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"white",flexShrink:0 }}>{adminInitial}</div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:"white",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{adminName}</div>
                      <div style={{ fontSize:11,color:"rgba(255,255,255,.3)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{adminEmail}</div>
                    </div>
                  </div>
                  <div style={{ padding:"6px" }}>
                    {[
                      { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>, label:"My Profile", action:()=>{ setPage("profile"); setAvatarOpen(false); } },
                      { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>, label:"Settings", action:()=>{ setPage("settings"); setAvatarOpen(false); } },
                      { icon:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label:"Audit Log", action:()=>{ setPage("logs"); setAvatarOpen(false); } },
                    ].map(item=>(
                      <div key={item.label} onClick={item.action}
                        style={{ padding:"9px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderRadius:9,transition:"background .12s",color:"rgba(255,255,255,.6)" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.06)")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <span style={{ flexShrink:0,display:"flex" }}>{item.icon}</span>
                        <span style={{ fontSize:13,fontWeight:500 }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop:"1px solid rgba(255,255,255,.05)", padding:"6px" }}>
                    <div onClick={()=>{ clearCurrentUser(); window.location.href="/admin/login"; }}
                      style={{ padding:"9px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderRadius:9,transition:"background .12s",color:"#f87171" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="rgba(248,113,113,.08)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      <span style={{ fontSize:13,fontWeight:600 }}>Sign Out</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* ── Page Content ── */}
        <main style={{ flex:1, overflowY:"auto", padding:"16px 12px 40px", background:"#060a14" }} className="sm:px-4 sm:py-6 lg:px-7">
          <div style={{ animation:"fadeUp .25s ease both", maxWidth:1420 }}>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}
