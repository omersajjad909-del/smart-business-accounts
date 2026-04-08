"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GymControlCenter,
  fetchJson,
  gymBg,
  gymBorder,
  gymFont,
  gymMuted,
} from "../_shared";

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

function Metric({ title, value, note, color }: { title: string; value: string; note: string; color: string }) {
  return (
    <div style={{ background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ fontSize: 12, color: gymMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: gymMuted, marginTop: 6 }}>{note}</div>
    </div>
  );
}

export default function GymAnalyticsPage() {
  const [data, setData] = useState(emptyState);

  useEffect(() => {
    fetchJson("/api/gym/control-center", emptyState).then(setData);
  }, []);

  const { summary, memberships, classes, trainers } = data;
  const expiredMembers = memberships.filter((member) => member.status === "Expired").length;

  const planMix = useMemo(() => {
    const planMixMap = new Map<string, number>();
    memberships.forEach((member) => {
      planMixMap.set(member.plan, (planMixMap.get(member.plan) || 0) + 1);
    });
    return [...planMixMap.entries()].sort((a, b) => b[1] - a[1]);
  }, [memberships]);

  const classLoad = useMemo(() => {
    return [...classes]
      .map((gymClass) => ({
        ...gymClass,
        pct: gymClass.capacity ? Math.round((gymClass.enrolled / gymClass.capacity) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [classes]);

  const trainerLoad = useMemo(() => {
    return [...trainers].sort((a, b) => b.activeClients - a.activeClients).slice(0, 5);
  }, [trainers]);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", color: "#fff", fontFamily: gymFont }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "#86efac", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>Gym Analytics</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: "0 0 10px" }}>Membership health, class demand, aur trainer utilization</h1>
        <p style={{ margin: 0, fontSize: 14, color: gymMuted, maxWidth: 760 }}>
          Fitness business ko fast reading dene ke liye revenue, renewal pressure, occupancy, aur staff load ko ek jagah compare karein.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 14, marginBottom: 24 }}>
        <Metric title="Paid Revenue" value={`Rs. ${summary.paidRevenue.toLocaleString()}`} note="Paid memberships only" color="#34d399" />
        <Metric title="Active Members" value={String(summary.activeMembers)} note={`${expiredMembers} memberships expired`} color="#60a5fa" />
        <Metric title="Payment Risk" value={String(summary.overdueMembers)} note="Pending fee follow-ups" color="#f87171" />
        <Metric title="Trainer Utilization" value={`${summary.trainerUtilization}`} note="Average active clients per trainer" color="#f59e0b" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#34d399", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Membership Plan Mix</div>
          <div style={{ display: "grid", gap: 12 }}>
            {planMix.length === 0 ? (
              <div style={{ color: gymMuted, fontSize: 13 }}>Plan mix show karne ke liye memberships add karein.</div>
            ) : planMix.map(([plan, count]) => {
              const pct = memberships.length ? Math.max(10, Math.round((count / memberships.length) * 100)) : 10;
              return (
                <div key={plan}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{plan}</span>
                    <span style={{ fontSize: 12, color: gymMuted }}>{count} members</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.05)", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#22c55e,#38bdf8)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 20, padding: 22 }}>
          <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Top Class Occupancy</div>
          <div style={{ display: "grid", gap: 10 }}>
            {classLoad.length === 0 ? (
              <div style={{ color: gymMuted, fontSize: 13 }}>Class occupancy show karne ke liye schedule build karein.</div>
            ) : classLoad.map((gymClass) => (
              <div key={gymClass.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{gymClass.name}</div>
                  <div style={{ fontSize: 12, color: gymMuted }}>{gymClass.enrolled}/{gymClass.capacity} seats filled</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: gymClass.pct >= 90 ? "#f87171" : gymClass.pct >= 70 ? "#fbbf24" : "#34d399" }}>{gymClass.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, background: gymBg, border: `1px solid ${gymBorder}`, borderRadius: 20, padding: 22 }}>
        <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 800, marginBottom: 16, textTransform: "uppercase", letterSpacing: ".07em" }}>Trainer Load Board</div>
        <div style={{ display: "grid", gap: 10 }}>
          {trainerLoad.length === 0 ? (
            <div style={{ color: gymMuted, fontSize: 13 }}>Trainer load show karne ke liye trainers add karein.</div>
          ) : trainerLoad.map((trainer) => (
            <div key={trainer.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 14, padding: "12px 14px" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{trainer.name}</div>
                <div style={{ fontSize: 12, color: gymMuted }}>{trainer.specialization}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#34d399" }}>{trainer.activeClients} clients</div>
                <div style={{ fontSize: 12, color: gymMuted }}>Rs. {trainer.salary.toLocaleString()} salary</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
