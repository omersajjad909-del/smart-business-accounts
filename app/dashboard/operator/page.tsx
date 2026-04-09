"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import type { OperatorPayload, OperatorAction, OperatorDecision } from "@/lib/businessOperator";

const surface = "#141c3a";
const line = "rgba(255,255,255,0.08)";
const soft = "rgba(255,255,255,0.62)";
const dim = "rgba(255,255,255,0.38)";

function priorityTone(priority: string) {
  switch (priority) {
    case "urgent":
      return { bg: "rgba(239,68,68,.14)", border: "rgba(239,68,68,.35)", color: "#fda4af" };
    case "high":
      return { bg: "rgba(245,158,11,.14)", border: "rgba(245,158,11,.35)", color: "#fcd34d" };
    case "medium":
      return { bg: "rgba(59,130,246,.14)", border: "rgba(59,130,246,.35)", color: "#93c5fd" };
    default:
      return { bg: "rgba(34,197,94,.14)", border: "rgba(34,197,94,.35)", color: "#86efac" };
  }
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div style={{ background: surface, border: `1px solid ${line}`, borderRadius: 18, padding: 18 }}>
      <div style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-.03em" }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 13, color: soft }}>{note}</div>
    </div>
  );
}

export default function BusinessOperatorPage() {
  const [data, setData] = useState<OperatorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueingId, setQueueingId] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser() as any;
    const companyId = user?.companyId || user?.user?.companyId;
    const userId = user?.id || user?.user?.id;
    const role = user?.role || user?.user?.role || "USER";

    if (!companyId) {
      setLoading(false);
      return;
    }

    fetch("/api/ai/operator", {
      headers: {
        "x-company-id": companyId,
        "x-user-id": userId || "",
        "x-user-role": role,
      },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load operator");
        setData(json);
      })
      .catch((error) => {
        toast.error(error?.message || "Unable to load Business Operator");
      })
      .finally(() => setLoading(false));
  }, []);

  async function queueAction(action: OperatorAction | OperatorDecision) {
    const user = getCurrentUser() as any;
    const companyId = user?.companyId || user?.user?.companyId;
    const userId = user?.id || user?.user?.id;
    const role = user?.role || user?.user?.role || "USER";
    if (!companyId) {
      toast.error("Company session not found.");
      return;
    }

    try {
      setQueueingId(action.id);
      const res = await fetch("/api/ai/operator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": companyId,
          "x-user-id": userId || "",
          "x-user-role": role,
        },
        body: JSON.stringify({
          actionId: action.id,
          title: action.title,
          description: "Review this item from the operator queue and complete it from the linked workspace.",
          href: "href" in action ? action.href : "/dashboard/operator",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to queue action");
      toast.success(json?.message || "Action queued");
    } catch (error: any) {
      toast.error(error?.message || "Unable to queue action");
    } finally {
      setQueueingId(null);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: "white" }}>Loading Business Operator...</div>;
  }

  if (!data) {
    return (
      <div style={{ padding: 24, color: "white" }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>FinovaOS Business Operator</div>
        <div style={{ marginTop: 10, color: soft }}>We could not load your operator workspace right now.</div>
      </div>
    );
  }

  const currency = data.company.currency;

  return (
    <div style={{ padding: 24, color: "white", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: "#8aa1ff", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700 }}>
            FinovaOS Business Operator
          </div>
          <div style={{ marginTop: 8, fontSize: 34, fontWeight: 900, letterSpacing: "-.04em" }}>
            Today&apos;s Decisions for {data.company.name}
          </div>
          <div style={{ marginTop: 10, maxWidth: 820, color: soft, fontSize: 15, lineHeight: 1.7 }}>
            This operator view watches cash, inventory, documents, and active business records for your {data.company.businessLabel.toLowerCase()} workflow,
            then ranks what needs attention first.
          </div>
        </div>
        <div style={{ minWidth: 260, background: "linear-gradient(135deg,#1a2550,#101938)", border: `1px solid ${line}`, borderRadius: 20, padding: 18 }}>
          <div style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: ".08em" }}>Operator Health</div>
          <div style={{ marginTop: 10, fontSize: 40, fontWeight: 900 }}>{data.overview.healthScore}/100</div>
          <div style={{ marginTop: 8, fontSize: 13, color: soft }}>
            Plan: {data.company.plan} · Generated {new Date(data.generatedAt).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 14, marginTop: 22 }}>
        <StatCard label="Cash Position" value={`${currency} ${Math.round(data.overview.cashPosition).toLocaleString("en-PK")}`} note={`${currency} ${Math.round(data.overview.overdueReceivables).toLocaleString("en-PK")} overdue receivables`} />
        <StatCard label="Inventory Pressure" value={String(data.overview.lowStockItems)} note={`${data.overview.goodsReceivedPendingInvoice} GRN receipt(s) waiting for invoice`} />
        <StatCard label="Operational Queue" value={String(data.overview.openBusinessRecords)} note={`${data.overview.openPurchaseOrders} active purchase orders in flow`} />
        <StatCard label="Month Momentum" value={`${data.overview.revenueChange >= 0 ? "+" : ""}${data.overview.revenueChange}%`} note={`Profit ${data.overview.profitChange >= 0 ? "+" : ""}${data.overview.profitChange}% vs last month`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr .95fr", gap: 18, marginTop: 22, alignItems: "start" }}>
        <section style={{ background: surface, border: `1px solid ${line}`, borderRadius: 22, overflow: "hidden" }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${line}`, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Today&apos;s Decisions</div>
              <div style={{ marginTop: 6, color: soft, fontSize: 14 }}>These are the highest-impact actions your business should not ignore today.</div>
            </div>
            <div style={{ fontSize: 13, color: dim }}>{data.todaysDecisions.length} ranked items</div>
          </div>
          <div style={{ padding: 16, display: "grid", gap: 14 }}>
            {data.todaysDecisions.map((decision) => {
              const tone = priorityTone(decision.priority);
              return (
                <div key={decision.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${line}`, borderRadius: 18, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        {decision.priority}
                      </div>
                      <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800 }}>{decision.title}</div>
                      <div style={{ marginTop: 10, fontSize: 14, color: soft, lineHeight: 1.7 }}>{decision.reason}</div>
                      <div style={{ marginTop: 10, fontSize: 14, color: "rgba(191,219,254,.95)" }}>
                        <strong>Action:</strong> {decision.action}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13, color: dim }}>
                        Impact: {decision.impact} · Source: {decision.source}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {decision.href ? (
                        <Link href={decision.href} style={{ textDecoration: "none", background: "#2563eb", color: "white", padding: "10px 14px", borderRadius: 12, fontWeight: 700 }}>
                          Open
                        </Link>
                      ) : null}
                      <button
                        onClick={() => queueAction(decision)}
                        disabled={queueingId === decision.id}
                        style={{ background: "transparent", color: "white", padding: "10px 14px", borderRadius: 12, fontWeight: 700, border: `1px solid ${line}`, cursor: "pointer" }}
                      >
                        {queueingId === decision.id ? "Queueing..." : "Queue"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div style={{ display: "grid", gap: 18 }}>
          <section style={{ background: surface, border: `1px solid ${line}`, borderRadius: 22, padding: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Detected Problems</div>
            <div style={{ marginTop: 6, color: soft, fontSize: 14 }}>Live operational and financial issues currently on watch.</div>
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {data.detectedProblems.slice(0, 5).map((problem, index) => {
                const tone = priorityTone(problem.severity === "critical" ? "urgent" : problem.severity === "warning" ? "high" : "medium");
                return (
                  <div key={`${problem.title}-${index}`} style={{ borderRadius: 16, padding: 14, background: tone.bg, border: `1px solid ${tone.border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: tone.color }}>{problem.title}</div>
                    <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,.82)", lineHeight: 1.6 }}>{problem.description}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: soft }}>{problem.action}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={{ background: surface, border: `1px solid ${line}`, borderRadius: 22, padding: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Business Playbook</div>
            <div style={{ marginTop: 6, color: soft, fontSize: 14 }}>Operator routine tailored for your {data.company.businessLabel.toLowerCase()} business.</div>
            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
              {data.playbook.map((playbook) => (
                <div key={playbook.title} style={{ borderRadius: 16, border: `1px solid ${line}`, padding: 16, background: "rgba(255,255,255,.02)" }}>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{playbook.title}</div>
                  <div style={{ marginTop: 8, fontSize: 14, color: soft, lineHeight: 1.7 }}>{playbook.summary}</div>
                  <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                    {playbook.steps.map((step) => (
                      <div key={step.label} style={{ borderLeft: "3px solid rgba(96,165,250,.7)", paddingLeft: 12 }}>
                        <div style={{ fontWeight: 700 }}>{step.label}</div>
                        <div style={{ marginTop: 5, fontSize: 13, color: soft, lineHeight: 1.6 }}>{step.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 22 }}>
        <section style={{ background: surface, border: `1px solid ${line}`, borderRadius: 22, padding: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Recommended Actions</div>
          <div style={{ marginTop: 6, color: soft, fontSize: 14 }}>Operator-suggested actions you can review and run today.</div>
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {data.recommendedActions.map((action) => {
              const tone = priorityTone(action.priority);
              return (
                <div key={action.id} style={{ borderRadius: 16, border: `1px solid ${line}`, padding: 16, background: "rgba(255,255,255,.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
                    <div>
                      <div style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        {action.priority}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 17, fontWeight: 800 }}>{action.title}</div>
                    </div>
                    <div style={{ fontSize: 12, color: dim }}>{action.automationLevel}</div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 14, color: soft, lineHeight: 1.7 }}>{action.description}</div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    {action.href ? (
                      <Link href={action.href} style={{ textDecoration: "none", padding: "9px 12px", borderRadius: 12, background: "#2563eb", color: "white", fontWeight: 700 }}>
                        {action.actionLabel}
                      </Link>
                    ) : null}
                    <button
                      onClick={() => queueAction(action)}
                      disabled={queueingId === action.id || action.state === "watch"}
                      style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${line}`, background: "transparent", color: "white", fontWeight: 700, cursor: action.state === "watch" ? "not-allowed" : "pointer", opacity: action.state === "watch" ? 0.6 : 1 }}
                    >
                      {queueingId === action.id ? "Queueing..." : "Queue"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ background: surface, border: `1px solid ${line}`, borderRadius: 22, padding: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Auto-Run Suggestions</div>
          <div style={{ marginTop: 6, color: soft, fontSize: 14 }}>Lightweight operator automations that are safe to enable next.</div>
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {data.autoRunSuggestions.map((action) => {
              const tone = priorityTone(action.priority);
              return (
                <div key={action.id} style={{ borderRadius: 16, padding: 16, background: tone.bg, border: `1px solid ${tone.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{action.title}</div>
                    <div style={{ fontSize: 11, color: tone.color, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      {action.automationLevel}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,.82)", lineHeight: 1.7 }}>{action.description}</div>
                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    {action.href ? (
                      <Link href={action.href} style={{ textDecoration: "none", padding: "9px 12px", borderRadius: 12, background: "rgba(255,255,255,.1)", color: "white", fontWeight: 700 }}>
                        {action.actionLabel}
                      </Link>
                    ) : null}
                    <button
                      onClick={() => queueAction(action)}
                      disabled={queueingId === action.id || action.state === "watch"}
                      style={{ padding: "9px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.18)", background: "transparent", color: "white", fontWeight: 700, cursor: action.state === "watch" ? "not-allowed" : "pointer", opacity: action.state === "watch" ? 0.6 : 1 }}
                    >
                      {queueingId === action.id ? "Queueing..." : "Enable"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
