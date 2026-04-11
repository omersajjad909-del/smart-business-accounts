"use client";
import { confirmToast } from "@/lib/toast-feedback";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import { getCurrentUser } from "@/lib/auth";

// ─── Design tokens ───────────────────────────────────────────────────────────
const ff = "'Outfit','Inter',sans-serif";
const accent = "#6366f1";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#fbbf24",
  CONFIRMED: "#10b981",
  DELIVERED: "#6366f1",
  CANCELLED: "#f87171",
};

const STATUS_TABS = ["All", "PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"];

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  itemId?: string;
  name: string;
  qty: number;
  unitPrice: number;
}

interface SalesOrder {
  id: string;
  orderNo: string;
  customerId?: string;
  customerName: string;
  date: string;
  amount: number;
  status: string;
  items?: LineItem[];
  notes?: string;
}

const EMPTY_FORM = {
  customerId: "",
  customerName: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  items: [{ itemId: "", name: "", qty: 1, unitPrice: 0 }] as LineItem[],
};

// ─── Helper ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SalesOrderPage() {
  const router = useRouter();
  const { records, loading, create, setStatus, remove } = useBusinessRecords("sales_order");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Saved customers + items
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [itemList,  setItemList]  = useState<{ id: string; name: string; salePrice?: number }[]>([]);

  useEffect(() => {
    const u = getCurrentUser();
    const h: Record<string, string> = {};
    if (u?.id)        h["x-user-id"]    = u.id;
    if (u?.role)      h["x-user-role"]  = u.role;
    if (u?.companyId) h["x-company-id"] = u.companyId;

    fetch("/api/accounts", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const list = Array.isArray(d) ? d : d.accounts || [];
        setCustomers(list.filter((a: any) => a.partyType === "CUSTOMER").map((a: any) => ({ id: a.id, name: a.name })));
      }).catch(() => {});

    fetch("/api/stock-available-for-sale", { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setItemList(list.map((i: any) => ({ id: i.id, name: i.name, salePrice: i.salePrice ?? i.rate ?? 0 })));
      }).catch(() => {});
  }, []);

  // Map raw records → typed orders
  const orders: SalesOrder[] = useMemo(
    () =>
      records.map((r) => ({
        id: r.id,
        orderNo: (r.data?.orderNo as string) || r.title.split(" · ")[0] || r.title,
        customerId: (r.data?.customerId as string) || "",
        customerName: (r.data?.customerName as string) || r.title,
        date: r.date ? r.date.slice(0, 10) : "",
        amount: r.amount ?? 0,
        status: (r.status || "PENDING").toUpperCase(),
        items: (r.data?.items as LineItem[]) || [],
        notes: (r.data?.notes as string) || "",
      })),
    [records]
  );

  // KPIs
  const total = orders.length;
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const confirmed = orders.filter((o) => o.status === "CONFIRMED").length;
  const delivered = orders.filter((o) => o.status === "DELIVERED").length;

  // Filtering
  const filtered = orders.filter((o) => {
    const matchTab = activeTab === "All" || o.status === activeTab;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.orderNo.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  // ── Form helpers ──
  function resetForm() {
    setForm({ ...EMPTY_FORM, items: [{ name: "", qty: 1, unitPrice: 0 }] });
    setFormError("");
  }

  function openModal() {
    resetForm();
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    resetForm();
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setForm((prev) => {
      const items = prev.items.map((it, i) =>
        i === index ? { ...it, [field]: field === "name" ? value : Number(value) } : it
      );
      return { ...prev, items };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { name: "", qty: 1, unitPrice: 0 }] }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  const lineTotal = form.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  async function handleSubmit() {
    setFormError("");
    if (!form.customerName.trim()) return setFormError("Customer name is required.");
    if (!form.date) return setFormError("Date is required.");
    if (form.items.some((i) => !i.name.trim())) return setFormError("All item names are required.");
    if (form.items.some((i) => i.qty <= 0)) return setFormError("Quantity must be greater than zero.");
    if (form.items.some((i) => i.unitPrice < 0)) return setFormError("Unit price cannot be negative.");

    setSaving(true);
    try {
      // Sequential SO number: SO-000001 format
      const existingNums = orders.map(o => {
        const m = o.orderNo.match(/SO-(\d+)/i);
        return m ? parseInt(m[1]) : 0;
      });
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      const orderNo = "SO-" + String(nextNum).padStart(6, "0");
      const title = orderNo + " · " + form.customerName.trim();
      await create({
        title,
        status: "PENDING",
        amount: lineTotal,
        date: form.date,
        data: {
          orderNo,
          customerId: form.customerId || "",
          customerName: form.customerName.trim(),
          items: form.items,
          notes: form.notes,
          date: form.date,
        },
      });
      closeModal();
    } catch (err) {
      setFormError(String(err));
    } finally {
      setSaving(false);
    }
  }

  // ── Status action helpers ──
  async function handleConfirm(id: string) {
    await setStatus(id, "CONFIRMED");
  }
  async function handleDeliver(id: string) {
    await setStatus(id, "DELIVERED");
  }
  async function handleCancel(id: string) {
    await setStatus(id, "CANCELLED");
  }
  async function handleDelete(id: string) {
    if (await confirmToast("Delete this sales order?")) await remove(id);
  }

  function createInvoiceFromSO(order: SalesOrder) {
    // Store SO data in sessionStorage for Sales Invoice to pick up
    sessionStorage.setItem("draft_invoice_from_so", JSON.stringify({
      soId: order.id,
      soNo: order.orderNo,
      customerId: order.customerId || "",
      customerName: order.customerName,
      date: order.date,
      items: order.items || [],
      notes: order.notes || "",
      amount: order.amount,
    }));
    router.push("/dashboard/sales-invoice");
  }

  // ── Styles ──
  const panelStyle: React.CSSProperties = {
    background: "var(--panel-bg)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 20,
    fontFamily: ff,
  };

  const kpiStyle: React.CSSProperties = {
    ...panelStyle,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 12px",
    color: "var(--text-primary)",
    fontFamily: ff,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    background: accent,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "9px 20px",
    cursor: "pointer",
    fontFamily: ff,
    fontWeight: 600,
    fontSize: 14,
  };

  const btnGhost: React.CSSProperties = {
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "7px 16px",
    cursor: "pointer",
    fontFamily: ff,
    fontSize: 13,
  };

  return (
    <div
      style={{
        padding: 28,
        fontFamily: ff,
        color: "var(--text-primary)",
        background: "var(--app-bg)",
        minHeight: "100vh",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Sales Orders</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
            Manage and track customer sales orders
          </p>
        </div>
        <button style={btnPrimary} onClick={openModal}>
          + New Order
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Orders", value: total, color: accent },
          { label: "Pending", value: pending, color: STATUS_COLORS.PENDING },
          { label: "Confirmed", value: confirmed, color: STATUS_COLORS.CONFIRMED },
          { label: "Delivered", value: delivered, color: STATUS_COLORS.DELIVERED },
        ].map((kpi) => (
          <div key={kpi.label} style={kpiStyle}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
              {kpi.label}
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* ── Search + Tab filters ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, maxWidth: 280 }}
          placeholder="Search by order no or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid var(--border)",
                cursor: "pointer",
                fontFamily: ff,
                fontSize: 13,
                fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? accent : "transparent",
                color: activeTab === tab ? "#fff" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            No sales orders found.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: ff }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Order No", "Customer", "Date", "Amount", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: h === "Amount" ? "right" : "left",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")
                  }
                >
                  <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 600, color: accent }}>
                    {order.orderNo}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 14 }}>{order.customerName}</td>
                  <td style={{ padding: "13px 16px", fontSize: 14, color: "var(--text-muted)" }}>
                    {order.date || "—"}
                  </td>
                  <td style={{ padding: "13px 16px", fontSize: 14, textAlign: "right", fontWeight: 600 }}>
                    {fmt(order.amount)}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        background: (STATUS_COLORS[order.status] || "#888") + "22",
                        color: STATUS_COLORS[order.status] || "#888",
                        border: `1px solid ${STATUS_COLORS[order.status] || "#888"}44`,
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {order.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleConfirm(order.id)}
                            style={{
                              ...btnGhost,
                              color: STATUS_COLORS.CONFIRMED,
                              borderColor: STATUS_COLORS.CONFIRMED + "55",
                              padding: "4px 10px",
                              fontSize: 12,
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleCancel(order.id)}
                            style={{
                              ...btnGhost,
                              color: STATUS_COLORS.CANCELLED,
                              borderColor: STATUS_COLORS.CANCELLED + "55",
                              padding: "4px 10px",
                              fontSize: 12,
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {order.status === "CONFIRMED" && (
                        <>
                          <button
                            onClick={() => handleDeliver(order.id)}
                            style={{
                              ...btnGhost,
                              color: STATUS_COLORS.DELIVERED,
                              borderColor: STATUS_COLORS.DELIVERED + "55",
                              padding: "4px 10px",
                              fontSize: 12,
                            }}
                          >
                            Mark Delivered
                          </button>
                          <button
                            onClick={() => createInvoiceFromSO(order)}
                            style={{
                              ...btnGhost,
                              color: "#34d399",
                              borderColor: "#34d39955",
                              padding: "4px 10px",
                              fontSize: 12,
                            }}
                          >
                            + Invoice
                          </button>
                        </>
                      )}
                      {order.status === "DELIVERED" && (
                        <button
                          onClick={() => createInvoiceFromSO(order)}
                          style={{
                            ...btnGhost,
                            color: "#34d399",
                            borderColor: "#34d39955",
                            padding: "4px 10px",
                            fontSize: 12,
                          }}
                        >
                          + Invoice
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(order.id)}
                        title="Delete"
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#f87171",
                          fontSize: 16,
                          lineHeight: 1,
                          padding: "2px 6px",
                          borderRadius: 6,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── New Order Modal ── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            style={{
              background: "var(--panel-bg)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 28,
              fontFamily: ff,
              color: "var(--text-primary)",
            }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>New Sales Order</h2>
              <button
                onClick={closeModal}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: 22,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {/* Customer name + date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                  Customer Name *
                </label>
                <select
                  style={inputStyle}
                  value={form.customerId || form.customerName}
                  onChange={(e) => {
                    const selected = customers.find(c => c.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      customerId: selected?.id || "",
                      customerName: selected?.name || e.target.value,
                    }));
                  }}
                >
                  <option value="">— Select Customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                  Date *
                </label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
            </div>

            {/* Line items */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Line Items</span>
                <button
                  onClick={addItem}
                  style={{
                    ...btnGhost,
                    padding: "5px 12px",
                    fontSize: 12,
                    color: accent,
                    borderColor: accent + "55",
                  }}
                >
                  + Add Item
                </button>
              </div>

              {/* Items table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 110px 90px 32px",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                {["Item Name", "Qty", "Unit Price", "Total", ""].map((h) => (
                  <span key={h} style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                    {h}
                  </span>
                ))}
              </div>

              {form.items.map((item, idx) => {
                const total = item.qty * item.unitPrice;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 110px 90px 32px",
                      gap: 8,
                      marginBottom: 8,
                      alignItems: "center",
                    }}
                  >
                    <select
                      style={inputStyle}
                      value={item.itemId || item.name}
                      onChange={(e) => {
                        const selected = itemList.find(i => i.id === e.target.value);
                        setForm(prev => {
                          const items = prev.items.map((it, i) => i === idx
                            ? { ...it, itemId: selected?.id || "", name: selected?.name || e.target.value, unitPrice: selected?.salePrice ?? it.unitPrice }
                            : it
                          );
                          return { ...prev, items };
                        });
                      }}
                    >
                      <option value="">— Select Item —</option>
                      {itemList.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      style={{ ...inputStyle, textAlign: "right" }}
                      value={item.qty}
                      onChange={(e) => updateItem(idx, "qty", e.target.value)}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      style={{ ...inputStyle, textAlign: "right" }}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                    />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        textAlign: "right",
                        padding: "0 4px",
                      }}
                    >
                      {fmt(total)}
                    </span>
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length === 1}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: form.items.length === 1 ? "not-allowed" : "pointer",
                        color: form.items.length === 1 ? "var(--text-muted)" : "#f87171",
                        fontSize: 18,
                        lineHeight: 1,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>
                Notes
              </label>
              <textarea
                style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                placeholder="Optional notes for this order…"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Total display */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                background: "rgba(99,102,241,0.08)",
                borderRadius: 10,
                border: "1px solid " + accent + "33",
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Order Total</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: accent }}>{fmt(lineTotal)}</span>
            </div>

            {/* Error */}
            {formError && (
              <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12, margin: "0 0 12px" }}>{formError}</p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={btnGhost} onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }} onClick={handleSubmit} disabled={saving}>
                {saving ? "Creating…" : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
