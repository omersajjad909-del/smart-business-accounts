"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  GymControlCenter,
  fetchJson,
  gymBg,
  gymBorder,
  gymFont,
  gymMuted,
  gymStatusColor,
} from "./_shared";

const emptyState: GymControlCenter = {
  summary: {
    members: 0,
    activeMembers: 0,
    expiringMembers: 0,
    expiredMembers: 0,
    classes: 0,
    openClasses: 0,
    cancelledClasses: 0,
    trainers: 0,
    activeTrainers: 0,
    paidRevenue: 0,
    overdueMembers: 0,
    occupancyRate: 0,
    trainerUtilization: 0,
  },
  memberships: [],
  classes: [],
  trainers: [],
};

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div style={{ background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: gymMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}

export default function GymOverviewPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/gym/control-center", emptyState).then(setData);
  }, []);

  const { summary, classes, trainers } = data;
  const topClasses = [...classes].sort((a, b) => b.enrolled - a.enrolled).slice(0, 4);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: gymFont }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, color: "#86efac", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Gym / Fitness</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Owner Fitness Desk</h1>
        <p style={{ margin: 0, fontSize: 14, color: gymMuted, maxWidth: 760 }}>
          Membership renewals, trainer utilization, class occupancy, aur fitness revenue ko ek hi command center se manage karein.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 14, marginBottom: 26 }}>
        <StatCard label="Active Members" value={summary.activeMembers} tone="#34d399" />
        <StatCard label="Expiring Soon" value={summary.expiringMembers} tone="#fbbf24" />
        <StatCard label="Open Classes" value={summary.openClasses} tone="#60a5fa" />
        <StatCard label="Active Trainers" value={summary.activeTrainers} tone="#a78bfa" />
        <StatCard label="Paid Revenue" value={`Rs. ${summary.paidRevenue.toLocaleString()}`} tone="#f97316" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "linear-gradient(135deg, rgba(34,197,94,.12), rgba(59,130,246,.1))", border: `1px solid ${gymBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#bbf7d0", fontWeight: 800, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".07em" }}>Business Flow</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}>
            {[
              { title: "Sell Membership", body: "Plan choose karein, member onboard karein, payment status track karein." },
              { title: "Assign Trainers", body: "Specialization aur active client load ke mutabiq staff manage karein." },
              { title: "Run Classes", body: "Time slots, instructor schedule, aur seat occupancy monitor karein." },
              { title: "Review Revenue", body: "Renewals, member mix, aur class demand ka operational reading dekhein." },
            ].map((step, index) => (
              <div key={step.title} style={{ background: "rgba(8,12,30,.36)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(134,239,172,.16)", color: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{index + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.62)", lineHeight: 1.55 }}>{step.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 20, padding: 24 }}>
          <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>Quick Actions</div>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { href: "/dashboard/gym/memberships", label: "Open Membership Desk", hint: "Plans, renewals, and payment tracking" },
              { href: "/dashboard/gym/classes", label: "Manage Class Schedule", hint: "Time slots, occupancy, and status" },
              { href: "/dashboard/gym/trainers", label: "Review Trainers", hint: "Team capacity and specialization" },
              { href: "/dashboard/gym/analytics", label: "See Gym Analytics", hint: "Revenue, utilization, and risk reading" },
              { href: "/dashboard/payment-receipts", label: "Payment Follow-up", hint: "Member receipts and collections" },
            ].map((item) => (
              <Link prefetch={false} key={item.href} href={item.href} style={{ textDecoration: "none", color: "#fff", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: gymMuted }}>{item.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Occupancy Classes</div>
          <div style={{ display: "grid", gap: 10 }}>
            {topClasses.length === 0 ? (
              <div style={{ color: gymMuted, fontSize: 13 }}>Abhi classes add nahi hui. Schedule build hone par yahan top occupancy classes dikhengi.</div>
            ) : topClasses.map((gymClass) => (
              <div key={gymClass.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{gymClass.name}</div>
                  <div style={{ fontSize: 12, color: gymMuted }}>{gymClass.days} · {gymClass.time}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: gymStatusColor(gymClass.status) }}>{gymClass.enrolled}/{gymClass.capacity}</div>
                  <div style={{ fontSize: 12, color: gymMuted }}>{gymClass.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Operational Reading</div>
          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Class occupancy", value: `${summary.occupancyRate}% seats engaged`, tone: "#60a5fa" },
              { label: "Renewal pressure", value: `${summary.expiringMembers} memberships need follow-up`, tone: "#fbbf24" },
              { label: "Trainer load", value: `${trainers.reduce((sum, trainer) => sum + trainer.activeClients, 0)} active clients handled`, tone: "#34d399" },
              { label: "Off-duty staff", value: `${trainers.filter((trainer) => trainer.status === "Off Duty").length} trainers unavailable`, tone: "#f97316" },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "14px 16px" }}>
                <span style={{ fontSize: 13, color: gymMuted }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: row.tone }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
