"use client";

import { useState, useMemo } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";

/* ─── types ─── */
interface LineItem {
  name: string;
  qty: number;
  unitPrice: number;
}

interface PORecord {
  id: string;
  poNo: string;
  supplierName: string;
  date: string;
  amount: number;
  status: string;
  notes: string;
  items: LineItem[];
  raw: ReturnType<typeof useBusinessRecords>["records"][number];
}

/* ─── constants ─── */
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  PENDING_APPROVAL: "#f59e0b",
  APPROVED: "#10b981",
  REJECTED: "#f87171",
  ORDERED: "#6366f1",
  RECEIVED: "#a5b4fc",
};

const ACCENT = "#f59e0b";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── sub-components ─── */
function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: "var(--panel-bg)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "20px 24px",
        flex: "1 1 160px",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#6b7280";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        background: color + "22",
        color,
        border: `1px solid ${color}55`,
        whiteSpace: "nowrap",
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ─── Reject Modal ─── */
function RejectModal({
  po,
  onConfirm,
  onCancel,
}: {
  po: PORecord;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 28,
          width: "100%",
          maxWidth: 460,
          fontFamily: "'Outfit','Inter',sans-serif",
        }}
      >
        <h3 style={{ margin: "0 0 6px", color: "var(--text-primary)", fontSize: 18 }}>
          Reject Purchase Order
        </h3>
        <p style={{ margin: "0 0 18px", color: "var(--text-muted)", fontSize: 14 }}>
          {po.poNo} — {po.supplierName}
        </p>
        <label style={{ display: "block", marginBottom: 8, color: "var(--text-muted)", fontSize: 13 }}>
          Rejection Reason <span style={{ color: "#f87171" }}>*</span>
        </label>
        <textarea
          rows={4}
          placeholder="Enter reason for rejection…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{
            width: "100%",
            resize: "vertical",
            background: "var(--app-bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-primary)",
            fontSize: 14,
            padding: "10px 12px",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onCancel} style={btnStyle("var(--border)", "var(--text-muted)")}>
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            style={{
              ...btnStyle("#f87171", "#fff"),
              opacity: reason.trim() ? 1 : 0.5,
              cursor: reason.trim() ? "pointer" : "not-allowed",
            }}
          >
            Confirm Reject
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── New PO Modal ─── */
function NewPOModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: {
    poNo: string;
    supplierName: string;
    date: string;
    notes: string;
    items: LineItem[];
  }) => void;
}) {
  const [supplierName, setSupplierName] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", qty: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  const addItem = () => setItems((prev) => [...prev, { name: "", qty: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));

  const handleSubmit = async () => {
    if (!supplierName.trim()) return;
    setSubmitting(true);
    const poNo = "PO-" + Date.now().toString().slice(-6);
    onCreate({ poNo, supplierName: supplierName.trim(), date, notes, items });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "var(--panel-bg)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 28,
          width: "100%",
          maxWidth: 640,
          fontFamily: "'Outfit','Inter',sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)", fontSize: 20 }}>New Purchase Order</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Supplier Name <span style={{ color: "#f87171" }}>*</span></label>
            <input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Acme Supplies Ltd."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Line items */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Line Items</label>
            <button onClick={addItem} style={btnStyle(ACCENT + "22", ACCENT)}>+ Add Item</button>
          </div>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--app-bg)" }}>
                  {["Item", "Qty", "Unit Price", "Total", ""].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px" }}>
                      <input
                        value={it.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                        placeholder="Item name"
                        style={{ ...inputStyle, margin: 0, padding: "4px 8px" }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", width: 70 }}>
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                        style={{ ...inputStyle, margin: 0, padding: "4px 8px", width: "100%" }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", width: 110 }}>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={it.unitPrice}
                        onChange={(e) => updateItem(idx, "unitPrice", Number(e.target.value))}
                        style={{ ...inputStyle, margin: 0, padding: "4px 8px", width: "100%" }}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", color: "var(--text-primary)", fontWeight: 600, width: 90 }}>
                      {fmt(it.qty * it.unitPrice)}
                    </td>
                    <td style={{ padding: "6px 8px", width: 32, textAlign: "center" }}>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(idx)}
                          style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: "right", marginTop: 8, color: "var(--text-primary)", fontSize: 14, fontWeight: 700 }}>
            Total: {fmt(totalAmount)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnStyle("var(--border)", "var(--text-muted)")}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !supplierName.trim()}
            style={{
              ...btnStyle(ACCENT, "#000"),
              opacity: submitting || !supplierName.trim() ? 0.5 : 1,
              cursor: submitting || !supplierName.trim() ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {submitting ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── shared style helpers ─── */
function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: bg,
    color,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Outfit','Inter',sans-serif",
    whiteSpace: "nowrap" as const,
  };
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--text-muted)",
  marginBottom: 5,
  fontWeight: 600,
  letterSpacing: "0.03em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--app-bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 14,
  padding: "9px 12px",
  fontFamily: "'Outfit','Inter',sans-serif",
  boxSizing: "border-box",
};

/* ─── Approval Card ─── */
function ApprovalCard({
  po,
  onApprove,
  onReject,
}: {
  po: PORecord;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      style={{
        background: "var(--panel-bg)",
        border: `1px solid ${ACCENT}44`,
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: "'Outfit','Inter',sans-serif",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          padding: "16px 20px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{po.poNo}</span>
            <StatusBadge status={po.status} />
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
            {po.supplierName || <em>No supplier</em>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>{fmt(po.amount)}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{po.date || "—"}</div>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 18, userSelect: "none" }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px" }}>
          {/* Line items */}
          {po.items && po.items.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, letterSpacing: "0.04em" }}>
                LINE ITEMS
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--app-bg)" }}>
                      {["Item", "Qty", "Unit Price", "Total"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "8px 12px",
                            textAlign: h === "Item" ? "left" : "right",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((it, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "9px 12px", color: "var(--text-primary)" }}>{it.name}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text-muted)" }}>{it.qty}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", color: "var(--text-muted)" }}>{fmt(it.unitPrice)}</td>
                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>
                          {fmt(it.qty * it.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `2px solid ${ACCENT}55` }}>
                      <td colSpan={3} style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "var(--text-muted)", fontSize: 12 }}>
                        TOTAL
                      </td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: ACCENT, fontSize: 15 }}>
                        {fmt(po.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {po.notes && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 4, letterSpacing: "0.04em" }}>NOTES</div>
              <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", background: "var(--app-bg)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)" }}>
                {po.notes}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              style={{ ...btnStyle("#f8717122", "#f87171"), border: "1px solid #f8717155" }}
            >
              ✕ Reject
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              style={{ ...btnStyle("#10b98122", "#10b981"), border: "1px solid #10b98155" }}
            >
              ✓ Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */
export default function PurchaseOrderApprovalPage() {
  const { records, loading, create, setStatus, remove } = useBusinessRecords("purchase_order");

  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [showNewPO, setShowNewPO] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<PORecord | null>(null);

  /* normalise records */
  const pos: PORecord[] = useMemo(
    () =>
      records.map((r) => ({
        id: r.id,
        poNo: (r.data.poNo as string) || r.title.split(" · ")[0],
        supplierName: (r.data.supplierName as string) || "",
        date: (r.data.date as string) || r.date || "",
        amount: r.amount || 0,
        status: r.status || "DRAFT",
        notes: (r.data.notes as string) || "",
        items: (r.data.items as LineItem[]) || [],
        raw: r,
      })),
    [records]
  );

  const todayStr = today();

  const pendingPos = useMemo(() => pos.filter((p) => p.status === "PENDING_APPROVAL"), [pos]);
  const approvedToday = useMemo(
    () => pos.filter((p) => p.status === "APPROVED" && p.date === todayStr).length,
    [pos, todayStr]
  );
  const rejectedToday = useMemo(
    () => pos.filter((p) => p.status === "REJECTED" && p.date === todayStr).length,
    [pos, todayStr]
  );

  /* handlers */
  const handleApprove = (id: string) => setStatus(id, "APPROVED");

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    await setStatus(rejectTarget.id, "REJECTED");
    // optionally store reason via update — setStatus is a shortcut; we just update status here
    setRejectTarget(null);
  };

  const handleCreate = async (payload: {
    poNo: string;
    supplierName: string;
    date: string;
    notes: string;
    items: LineItem[];
  }) => {
    const amount = payload.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    await create({
      title: `${payload.poNo} · ${payload.supplierName}`,
      status: "DRAFT",
      amount,
      date: payload.date,
      data: {
        poNo: payload.poNo,
        supplierName: payload.supplierName,
        items: payload.items,
        notes: payload.notes,
        date: payload.date,
      },
    });
    setShowNewPO(false);
  };

  /* ── render ── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--app-bg)",
        fontFamily: "'Outfit','Inter',sans-serif",
        color: "var(--text-primary)",
        padding: "32px 28px",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Purchase Order Approvals
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>
            Review and approve pending purchase orders
          </p>
        </div>
        <button
          onClick={() => setShowNewPO(true)}
          style={{
            ...btnStyle(ACCENT, "#000"),
            fontSize: 14,
            padding: "10px 20px",
            fontWeight: 700,
          }}
        >
          + New PO
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 28 }}>
        <KpiCard label="Pending Approval" value={pendingPos.length} color={ACCENT} />
        <KpiCard label="Approved Today" value={approvedToday} color="#10b981" />
        <KpiCard label="Rejected Today" value={rejectedToday} color="#f87171" />
        <KpiCard label="Total Orders" value={pos.length} color="#a5b4fc" />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        {([["pending", "Pending Approval"], ["all", "All Orders"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === key ? `2px solid ${ACCENT}` : "2px solid transparent",
              color: activeTab === key ? ACCENT : "var(--text-muted)",
              fontSize: 14,
              fontWeight: activeTab === key ? 700 : 500,
              padding: "10px 20px",
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: -1,
              transition: "color 0.15s",
            }}
          >
            {label}
            {key === "pending" && pendingPos.length > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  background: ACCENT,
                  color: "#000",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 7px",
                }}
              >
                {pendingPos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 16 }}>
          Loading purchase orders…
        </div>
      ) : activeTab === "pending" ? (
        /* ── Pending Approval queue ── */
        <div>
          {pendingPos.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 0",
                color: "var(--text-muted)",
                border: "1px dashed var(--border)",
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No pending approvals</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>All purchase orders have been reviewed.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {pendingPos.map((po) => (
                <ApprovalCard
                  key={po.id}
                  po={po}
                  onApprove={() => handleApprove(po.id)}
                  onReject={() => setRejectTarget(po)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── All Orders table ── */
        <div style={{ background: "var(--panel-bg)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {pos.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
              No purchase orders yet. Click + New PO to create one.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "var(--app-bg)", borderBottom: "1px solid var(--border)" }}>
                    {["PO No", "Supplier", "Date", "Amount", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "11px 16px",
                          textAlign: h === "Amount" || h === "Actions" ? "right" : "left",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                          fontSize: 12,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr
                      key={po.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{po.poNo}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{po.supplierName || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{po.date || "—"}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>
                        {fmt(po.amount)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <StatusBadge status={po.status} />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          {po.status === "DRAFT" && (
                            <button
                              onClick={() => setStatus(po.id, "PENDING_APPROVAL")}
                              style={{
                                ...btnStyle(ACCENT + "22", ACCENT),
                                border: `1px solid ${ACCENT}55`,
                                fontSize: 12,
                                padding: "5px 12px",
                              }}
                            >
                              Submit for Approval
                            </button>
                          )}
                          {po.status === "DRAFT" && (
                            <button
                              onClick={() => remove(po.id)}
                              style={{
                                ...btnStyle("#f8717122", "#f87171"),
                                border: "1px solid #f8717155",
                                fontSize: 12,
                                padding: "5px 10px",
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <RejectModal
          po={rejectTarget}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* ── New PO Modal ── */}
      {showNewPO && (
        <NewPOModal
          onClose={() => setShowNewPO(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
