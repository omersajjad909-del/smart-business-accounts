"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getCurrentUser } from "@/lib/auth";
import type { OperatorAction, OperatorDecision, OperatorPayload } from "@/lib/businessOperator";

const shell = {
  bg: "#0a1026",
  panel: "rgba(16, 24, 54, 0.88)",
  panelSoft: "rgba(20, 29, 64, 0.72)",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.14)",
  text: "rgba(255,255,255,0.95)",
  soft: "rgba(226,232,240,0.72)",
  dim: "rgba(148,163,184,0.72)",
  blue: "#5ea2ff",
  cyan: "#4de3d6",
  glow: "rgba(94,162,255,0.24)",
};

function priorityTone(priority: string) {
  switch (priority) {
    case "urgent":
      return { bg: "rgba(239,68,68,.14)", border: "rgba(248,113,113,.34)", color: "#fda4af" };
    case "high":
      return { bg: "rgba(245,158,11,.14)", border: "rgba(251,191,36,.34)", color: "#fde68a" };
    case "medium":
      return { bg: "rgba(59,130,246,.14)", border: "rgba(96,165,250,.34)", color: "#93c5fd" };
    default:
      return { bg: "rgba(34,197,94,.14)", border: "rgba(74,222,128,.34)", color: "#86efac" };
  }
}

function money(value: number, currency: string) {
  return `${currency} ${Math.round(value || 0).toLocaleString("en-PK")}`;
}

function StatCard({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)), ${shell.panel}`,
        border: `1px solid ${shell.line}`,
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 18px 42px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto auto 0",
          width: 120,
          height: 120,
          background: `radial-gradient(circle, ${accent}33 0%, transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ fontSize: 11, color: shell.dim, textTransform: "uppercase", letterSpacing: ".14em", fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 14, fontSize: 30, fontWeight: 900, letterSpacing: "-0.04em", color: shell.text }}>{value}</div>
      <div style={{ marginTop: 10, fontSize: 13, color: shell.soft, lineHeight: 1.65 }}>{note}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: shell.blue, textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 800 }}>{eyebrow}</div>
      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: shell.text, letterSpacing: "-0.03em" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 14, color: shell.soft, lineHeight: 1.65 }}>{note}</div>
    </div>
  );
}

function DecisionCard({
  decision,
  queueingId,
  onQueue,
}: {
  decision: OperatorDecision;
  queueingId: string | null;
  onQueue: (action: OperatorDecision) => void;
}) {
  const tone = priorityTone(decision.priority);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)), ${shell.panelSoft}`,
        border: `1px solid ${shell.line}`,
        borderRadius: 24,
        padding: 22,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 150,
          height: 150,
          background: `radial-gradient(circle, ${tone.color}22 0%, transparent 68%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 11px",
              borderRadius: 999,
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              color: tone.color,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            {decision.priority}
          </div>
          <div style={{ marginTop: 14, fontSize: 24, fontWeight: 900, color: shell.text, letterSpacing: "-0.03em" }}>{decision.title}</div>
          <div style={{ marginTop: 12, fontSize: 14, color: shell.soft, lineHeight: 1.75 }}>{decision.reason}</div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 16, background: "rgba(94,162,255,0.08)", border: `1px solid rgba(94,162,255,0.18)` }}>
            <div style={{ fontSize: 11, color: shell.dim, textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700 }}>Next Action</div>
            <div style={{ marginTop: 8, fontSize: 14, color: shell.text, lineHeight: 1.7 }}>{decision.action}</div>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, color: shell.dim, fontSize: 12 }}>
            <span>Impact: {decision.impact}</span>
            <span>Source: {decision.source}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 140 }}>
          {decision.href ? (
            <Link prefetch={false}
              href={decision.href}
              style={{
                textDecoration: "none",
                padding: "12px 14px",
                borderRadius: 14,
                background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                color: "white",
                fontWeight: 800,
                textAlign: "center",
                boxShadow: `0 12px 28px ${shell.glow}`,
              }}
            >
              Open Workspace
            </Link>
          ) : null}
          <button
            onClick={() => onQueue(decision)}
            disabled={queueingId === decision.id}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.02)",
              color: "white",
              fontWeight: 800,
              border: `1px solid ${shell.lineStrong}`,
              cursor: "pointer",
            }}
          >
            {queueingId === decision.id ? "Queueing..." : "Queue Action"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  queueingId,
  buttonLabel,
  onQueue,
}: {
  action: OperatorAction;
  queueingId: string | null;
  buttonLabel: string;
  onQueue: (action: OperatorAction) => void;
}) {
  const tone = priorityTone(action.priority);
  const watchOnly = action.state === "watch";

  return (
    <div
      style={{
        background: `linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.012)), ${shell.panelSoft}`,
        border: `1px solid ${shell.line}`,
        borderRadius: 22,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              padding: "4px 10px",
              borderRadius: 999,
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              color: tone.color,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            {action.priority}
          </div>
          <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800, color: shell.text }}>{action.title}</div>
        </div>
        <div style={{ fontSize: 11, color: shell.dim, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>{action.automationLevel}</div>
      </div>
      <div style={{ marginTop: 10, fontSize: 14, color: shell.soft, lineHeight: 1.7 }}>{action.description}</div>
      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {action.href ? (
          <Link prefetch={false}
            href={action.href}
            style={{
              textDecoration: "none",
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(94,162,255,0.12)",
              border: "1px solid rgba(94,162,255,0.2)",
              color: "white",
              fontWeight: 700,
            }}
          >
            {action.actionLabel}
          </Link>
        ) : null}
        <button
          onClick={() => onQueue(action)}
          disabled={queueingId === action.id || watchOnly}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            background: watchOnly ? "rgba(255,255,255,0.04)" : "transparent",
            border: `1px solid ${shell.lineStrong}`,
            color: "white",
            fontWeight: 700,
            cursor: watchOnly ? "not-allowed" : "pointer",
            opacity: watchOnly ? 0.5 : 1,
          }}
        >
          {queueingId === action.id ? "Queueing..." : buttonLabel}
        </button>
      </div>
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
    return (
      <div style={{ minHeight: "70vh", padding: 24, color: "white" }}>
        <div
          style={{
            borderRadius: 28,
            border: `1px solid ${shell.line}`,
            background: `linear-gradient(180deg, rgba(94,162,255,0.08), rgba(12,18,41,0.96))`,
            padding: 28,
          }}
        >
          <div style={{ fontSize: 12, color: shell.blue, textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 800 }}>
            FinovaOS Business Operator
          </div>
          <div style={{ marginTop: 14, fontSize: 30, fontWeight: 900 }}>Loading your operator workspace...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: "70vh", padding: 24, color: "white" }}>
        <div
          style={{
            borderRadius: 28,
            border: `1px solid ${shell.line}`,
            background: shell.panel,
            padding: 28,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 900 }}>FinovaOS Business Operator</div>
          <div style={{ marginTop: 10, color: shell.soft }}>We could not load your operator workspace right now.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        fontFamily: "'Outfit','Inter',sans-serif",
        background:
          "radial-gradient(circle at top left, rgba(77,227,214,0.08), transparent 22%), radial-gradient(circle at top right, rgba(94,162,255,0.12), transparent 26%)",
      }}
    >
      <style>{`
        .operator-grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
        .operator-main-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(320px,.95fr);gap:18px;align-items:start}
        .operator-bottom-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .operator-shell-card{background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012)),rgba(16,24,54,.88);border:1px solid rgba(255,255,255,.08);border-radius:28px;box-shadow:0 24px 60px rgba(0,0,0,.24)}
        @media (max-width: 1180px){
          .operator-grid-4{grid-template-columns:repeat(2,minmax(0,1fr))}
          .operator-main-grid,.operator-bottom-grid{grid-template-columns:1fr}
        }
        @media (max-width: 720px){
          .operator-grid-4{grid-template-columns:1fr}
        }
      `}</style>

      <div
        className="operator-shell-card"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 28,
          background:
            "linear-gradient(135deg, rgba(14,24,58,.96), rgba(10,16,38,.96) 54%, rgba(10,16,38,.88)), radial-gradient(circle at top right, rgba(94,162,255,.22), transparent 30%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(94,162,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(94,162,255,.05) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "linear-gradient(180deg, rgba(255,255,255,.5), transparent)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "7px 14px", borderRadius: 999, background: "rgba(94,162,255,.12)", border: "1px solid rgba(94,162,255,.2)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: shell.cyan, boxShadow: "0 0 14px rgba(77,227,214,.65)" }} />
              <span style={{ fontSize: 11, color: "#bfdbfe", textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 800 }}>
                FinovaOS Business Operator
              </span>
            </div>
            <div style={{ marginTop: 18, fontSize: "clamp(32px,4vw,54px)", lineHeight: 1.02, fontWeight: 900, letterSpacing: "-.06em", maxWidth: 880 }}>
              Today&apos;s decisions for {data.company.name}
            </div>
            <div style={{ marginTop: 16, maxWidth: 820, fontSize: 15, lineHeight: 1.8, color: shell.soft }}>
              A live operating layer for your {data.company.businessLabel.toLowerCase()} business. It watches cash, inventory, pending documents, and active
              workflows, then turns them into ranked actions instead of passive dashboards.
            </div>
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10 }}>
              <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${shell.line}`, fontSize: 13, color: shell.soft }}>
                Business Type: <strong style={{ color: shell.text }}>{data.company.businessLabel}</strong>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${shell.line}`, fontSize: 13, color: shell.soft }}>
                Plan: <strong style={{ color: shell.text }}>{data.company.plan}</strong>
              </div>
              <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${shell.line}`, fontSize: 13, color: shell.soft }}>
                Generated: <strong style={{ color: shell.text }}>{new Date(data.generatedAt).toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              width: 300,
              maxWidth: "100%",
              borderRadius: 24,
              padding: 22,
              background: "linear-gradient(180deg, rgba(94,162,255,.12), rgba(255,255,255,.03))",
              border: "1px solid rgba(94,162,255,.18)",
              boxShadow: `0 24px 50px ${shell.glow}`,
            }}
          >
            <div style={{ fontSize: 12, color: shell.dim, textTransform: "uppercase", letterSpacing: ".16em", fontWeight: 700 }}>Operator Health</div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{data.overview.healthScore}</div>
              <div style={{ fontSize: 18, color: shell.soft }}>/100</div>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, color: shell.soft, lineHeight: 1.7 }}>
              Revenue {data.overview.revenueChange >= 0 ? "+" : ""}
              {data.overview.revenueChange}% vs last month, with {money(data.overview.overdueReceivables, data.company.currency)} overdue.
            </div>
            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: shell.soft, fontSize: 13 }}>
                <span>Cash Position</span>
                <strong style={{ color: shell.text }}>{money(data.overview.cashPosition, data.company.currency)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: shell.soft, fontSize: 13 }}>
                <span>Pending GRN Billing</span>
                <strong style={{ color: shell.text }}>{data.overview.goodsReceivedPendingInvoice}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: shell.soft, fontSize: 13 }}>
                <span>Low Stock Watch</span>
                <strong style={{ color: shell.text }}>{data.overview.lowStockItems}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="operator-grid-4" style={{ marginTop: 18 }}>
        <StatCard label="Cash Position" value={money(data.overview.cashPosition, data.company.currency)} note={`${money(data.overview.overdueReceivables, data.company.currency)} overdue receivables need attention`} accent="#5ea2ff" />
        <StatCard label="Inventory Pressure" value={String(data.overview.lowStockItems)} note={`${data.overview.goodsReceivedPendingInvoice} GRN receipt(s) waiting for supplier invoice`} accent="#4de3d6" />
        <StatCard label="Operational Queue" value={String(data.overview.openBusinessRecords)} note={`${data.overview.openPurchaseOrders} active purchase orders still moving in flow`} accent="#f59e0b" />
        <StatCard label="Month Momentum" value={`${data.overview.revenueChange >= 0 ? "+" : ""}${data.overview.revenueChange}%`} note={`Profit ${data.overview.profitChange >= 0 ? "+" : ""}${data.overview.profitChange}% vs last month`} accent="#8b5cf6" />
      </div>

      <div className="operator-main-grid" style={{ marginTop: 18 }}>
        <section className="operator-shell-card" style={{ padding: 20 }}>
          <SectionTitle
            eyebrow="Execution Queue"
            title="Today's Decisions"
            note="The most important actions your business should take today, ranked by urgency and impact."
          />
          <div style={{ display: "grid", gap: 14 }}>
            {data.todaysDecisions.map((decision) => (
              <DecisionCard key={decision.id} decision={decision} queueingId={queueingId} onQueue={queueAction} />
            ))}
          </div>
        </section>

        <div style={{ display: "grid", gap: 18 }}>
          <section className="operator-shell-card" style={{ padding: 20 }}>
            <SectionTitle
              eyebrow="Live Watch"
              title="Detected Problems"
              note="Signals pulled from your actual data, surfaced as operator-ready issues."
            />
            <div style={{ display: "grid", gap: 12 }}>
              {data.detectedProblems.slice(0, 5).map((problem, index) => {
                const tone = priorityTone(problem.severity === "critical" ? "urgent" : problem.severity === "warning" ? "high" : "medium");
                return (
                  <div
                    key={`${problem.title}-${index}`}
                    style={{
                      borderRadius: 18,
                      padding: 16,
                      background: tone.bg,
                      border: `1px solid ${tone.border}`,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: tone.color }}>{problem.title}</div>
                    <div style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,.86)", lineHeight: 1.65 }}>{problem.description}</div>
                    <div style={{ marginTop: 10, fontSize: 12, color: shell.soft }}>{problem.action}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="operator-shell-card" style={{ padding: 20 }}>
            <SectionTitle
              eyebrow="Business Rhythm"
              title="Operator Playbook"
              note={`A practical operating routine for your ${data.company.businessLabel.toLowerCase()} setup.`}
            />
            <div style={{ display: "grid", gap: 14 }}>
              {data.playbook.map((playbook) => (
                <div
                  key={playbook.title}
                  style={{
                    borderRadius: 22,
                    padding: 18,
                    background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.012))",
                    border: `1px solid ${shell.line}`,
                  }}
                >
                  <div style={{ fontSize: 19, fontWeight: 800, color: shell.text }}>{playbook.title}</div>
                  <div style={{ marginTop: 8, fontSize: 14, color: shell.soft, lineHeight: 1.7 }}>{playbook.summary}</div>
                  <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                    {playbook.steps.map((step, index) => (
                      <div key={step.label} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 12, alignItems: "start" }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "rgba(94,162,255,.12)",
                            border: "1px solid rgba(94,162,255,.22)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#bfdbfe",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: shell.text }}>{step.label}</div>
                          <div style={{ marginTop: 5, fontSize: 13, color: shell.soft, lineHeight: 1.65 }}>{step.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="operator-bottom-grid" style={{ marginTop: 18 }}>
        <section className="operator-shell-card" style={{ padding: 20 }}>
          <SectionTitle
            eyebrow="Action Layer"
            title="Recommended Actions"
            note="Suggested next steps you can review, open, or queue right away."
          />
          <div style={{ display: "grid", gap: 12 }}>
            {data.recommendedActions.map((action) => (
              <ActionCard key={action.id} action={action} queueingId={queueingId} buttonLabel="Queue Action" onQueue={queueAction} />
            ))}
          </div>
        </section>

        <section className="operator-shell-card" style={{ padding: 20 }}>
          <SectionTitle
            eyebrow="Automation Layer"
            title="Auto-Run Suggestions"
            note="Safe automation starters that can become your daily operating assistant."
          />
          <div style={{ display: "grid", gap: 12 }}>
            {data.autoRunSuggestions.map((action) => (
              <ActionCard key={action.id} action={action} queueingId={queueingId} buttonLabel="Enable Flow" onQueue={queueAction} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
