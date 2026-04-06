"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import toast from "react-hot-toast";

import { useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  distributionBg,
  distributionBorder,
  distributionFont,
  findRouteById,
  mapDistributionRoutes,
  todayIso,
} from "../_shared";

type Customer = {
  id: string;
  name: string;
  code?: string;
};

type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNo: string;
};

type CollectionForm = {
  customerId: string;
  customerName: string;
  routeId: string;
  invoiceRef: string;
  amount: number;
  paymentMode: "CASH" | "CHEQUE" | "BANK_TRANSFER";
  bankAccountId: string;
  referenceNo: string;
  date: string;
  narration: string;
};

const emptyForm: CollectionForm = {
  customerId: "",
  customerName: "",
  routeId: "",
  invoiceRef: "",
  amount: 0,
  paymentMode: "CASH",
  bankAccountId: "",
  referenceNo: "",
  date: todayIso(),
  narration: "",
};

export default function DistributionCollectionsPage() {
  const user = getCurrentUser();
  const collectionRecords = useBusinessRecords("distribution_collection");
  const routeRecords = useBusinessRecords("distribution_route");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CollectionForm>(emptyForm);
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState("");

  const routes = useMemo(() => mapDistributionRoutes(routeRecords.records).filter((route) => route.status === "active"), [routeRecords.records]);
  const collections = useMemo(() => collectionRecords.records.map((record) => ({
    id: record.id,
    customerName: String(record.data?.customerName || record.title || ""),
    customerId: String(record.data?.customerId || ""),
    routeName: String(record.data?.routeName || ""),
    invoiceRef: String(record.data?.invoiceRef || ""),
    paymentMode: String(record.data?.paymentMode || "CASH"),
    receiptNo: String(record.data?.receiptNo || ""),
    amount: record.amount || 0,
    date: record.date?.split("T")[0] || "",
    status: record.status || "pending",
    referenceNo: String(record.data?.referenceNo || ""),
  })), [collectionRecords.records]);

  const totalCollected = collections.reduce((sum, row) => sum + row.amount, 0);
  const settledAmount = collections.filter((row) => row.status === "reconciled").reduce((sum, row) => sum + row.amount, 0);

  useEffect(() => {
    const headers = {
      "x-user-role": user?.role || "ADMIN",
      "x-user-id": user?.id || "",
      "x-company-id": user?.companyId || "",
    };

    fetch("/api/accounts", { headers })
      .then((response) => response.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCustomers(list.filter((account: { id: string; name: string; partyType?: string }) => account.partyType === "CUSTOMER" || !account.partyType));
      })
      .catch(() => setCustomers([]));

    fetch("/api/bank-accounts", { headers })
      .then((response) => response.json())
      .then((data) => setBankAccounts(Array.isArray(data) ? data : []))
      .catch(() => setBankAccounts([]));
  }, [user?.companyId, user?.id, user?.role]);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  function syncCustomer(customerId: string) {
    const customer = customers.find((entry) => entry.id === customerId);
    setForm((prev) => ({
      ...prev,
      customerId,
      customerName: customer?.name || "",
    }));
  }

  function syncRoute(routeId: string) {
    const route = findRouteById(routes, routeId);
    setForm((prev) => ({
      ...prev,
      routeId,
      narration: prev.narration || `Collection from ${prev.customerName || "customer"} via ${route?.name || "distribution route"}`,
    }));
  }

  function editCollection(row: (typeof collections)[number]) {
    if (row.status === "reconciled") {
      toast("Reconciled collections are locked to preserve ledger consistency.");
      return;
    }
    const route = routes.find((entry) => entry.name === row.routeName);
    setEditingId(row.id);
    setForm({
      customerId: row.customerId,
      customerName: row.customerName,
      routeId: route?.id || "",
      invoiceRef: row.invoiceRef,
      amount: row.amount,
      paymentMode: row.paymentMode as CollectionForm["paymentMode"],
      bankAccountId: "",
      referenceNo: row.referenceNo,
      date: row.date || todayIso(),
      narration: `Collection from ${row.customerName}`,
    });
    setShowModal(true);
  }

  async function reconcileCollection(row: (typeof collections)[number]) {
    if (row.status === "reconciled") return;
    if (!await confirmToast(`Mark collection for ${row.customerName} as reconciled?`)) return;
    await collectionRecords.update(row.id, { status: "reconciled" });
  }

  async function removeCollection(row: (typeof collections)[number]) {
    if (row.status === "reconciled") {
      toast.success("Reconciled collections cannot be deleted.");
      return;
    }
    if (!await confirmToast(`Delete collection for ${row.customerName}?`)) return;
    await collectionRecords.remove(row.id);
  }

  async function save() {
    if (!form.customerId || !form.customerName.trim()) {
      setFormError("Customer selection is required.");
      return;
    }
    if (!form.routeId) {
      setFormError("Route selection is required.");
      return;
    }
    if (!form.date) {
      setFormError("Collection date is required.");
      return;
    }
    if (form.amount <= 0) {
      setFormError("Collection amount must be greater than zero.");
      return;
    }
    if (form.paymentMode !== "CASH" && !form.bankAccountId && posting) {
      setFormError("Bank account is required when posting non-cash collection.");
      return;
    }
    setFormError("");

    const route = findRouteById(routes, form.routeId);
    let receiptNo = "";

    if (posting) {
      const response = await fetch("/api/payment-receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": user?.companyId || "",
          "x-user-role": user?.role || "ADMIN",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          date: form.date,
          amount: form.amount,
          paymentMode: form.paymentMode,
          partyId: form.customerId,
          bankAccountId: form.paymentMode === "CASH" ? undefined : form.bankAccountId || undefined,
          referenceNo: form.referenceNo || undefined,
          narration: form.narration || `Collection received from ${form.customerName}`,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.error || "Failed to post payment receipt");
        return;
      }
      receiptNo = String(data?.receiptNo || "");
    }

    const payload = {
      title: form.customerName,
      status: posting ? "reconciled" : "pending",
      amount: form.amount,
      date: form.date,
      data: {
        customerId: form.customerId,
        customerName: form.customerName,
        routeId: form.routeId,
        routeName: route?.name || "",
        invoiceRef: form.invoiceRef,
        paymentMode: form.paymentMode,
        referenceNo: form.referenceNo,
        receiptNo,
        narration: form.narration,
      },
    };

    if (editingId) {
      await collectionRecords.update(editingId, payload);
    } else {
      await collectionRecords.create(payload);
    }

    closeModal();
    setPosting(false);
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: distributionFont, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Distribution Collections</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", margin: 0 }}>
            Record field recoveries and reconcile them into payment receipts when needed.
          </p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Add Collection
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Entries", value: collections.length, color: "#f97316" },
          { label: "Total Collected", value: `Rs. ${totalCollected.toLocaleString()}`, color: "#34d399" },
          { label: "Reconciled", value: `Rs. ${settledAmount.toLocaleString()}`, color: "#38bdf8" },
        ].map((card) => (
          <div key={card.label} style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Customer", "Route", "Invoice Ref", "Mode", "Amount", "Receipt", "Date", "Status", "Actions"].map((header) => (
                <th key={header} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,.5)", borderBottom: `1px solid ${distributionBorder}`, fontWeight: 600 }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {collections.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontWeight: 700 }}>{row.customerName}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{row.routeName || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 13 }}>{row.invoiceRef || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{row.paymentMode}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", color: "#34d399", fontWeight: 700 }}>Rs. {row.amount.toLocaleString()}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{row.receiptNo || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 12 }}>{row.date || "-"}</td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ display: "inline-block", background: row.status === "reconciled" ? "rgba(52,211,153,.15)" : "rgba(245,158,11,.15)", color: row.status === "reconciled" ? "#34d399" : "#f59e0b", borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>
                    {row.status}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", gap: 8 }}>
                  <button onClick={() => editCollection(row)} style={{ padding: "6px 10px", background: "rgba(99,102,241,.16)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Edit
                  </button>
                  {row.status !== "reconciled" && (
                    <button onClick={() => void reconcileCollection(row)} style={{ padding: "6px 10px", background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      Mark Reconciled
                    </button>
                  )}
                  <button onClick={() => void removeCollection(row)} style={{ padding: "6px 10px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!collectionRecords.loading && collections.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,.25)" }}>
                  No distribution collections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#161b27", border: `1px solid ${distributionBorder}`, borderRadius: 16, padding: 32, width: 580, fontFamily: distributionFont }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Collection" : "Add Collection"}</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Customer</label>
                <select value={form.customerId} onChange={(event) => syncCustomer(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Route</label>
                <select value={form.routeId} onChange={(event) => syncRoute(event.target.value)} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
                  <option value="">Select route</option>
                  {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Invoice Ref</label>
                <input type="text" value={form.invoiceRef} onChange={(event) => setForm((prev) => ({ ...prev, invoiceRef: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Date</label>
                <input type="date" value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Amount</label>
                <input type="number" min={0} value={form.amount} onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Payment Mode</label>
                <select value={form.paymentMode} onChange={(event) => setForm((prev) => ({ ...prev, paymentMode: event.target.value as CollectionForm["paymentMode"] }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              {form.paymentMode !== "CASH" && (
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Bank Account</label>
                  <select value={form.bankAccountId} onChange={(event) => setForm((prev) => ({ ...prev, bankAccountId: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }}>
                    <option value="">Select bank</option>
                    {bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.bankName} - {account.accountName}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Reference No</label>
                <input type="text" value={form.referenceNo} onChange={(event) => setForm((prev) => ({ ...prev, referenceNo: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Narration</label>
                <input type="text" value={form.narration} onChange={(event) => setForm((prev) => ({ ...prev, narration: event.target.value }))} style={{ width: "100%", background: distributionBg, border: `1px solid ${distributionBorder}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14 }} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, fontSize: 13, color: "rgba(255,255,255,.7)" }}>
              <input type="checkbox" checked={posting} onChange={(event) => setPosting(event.target.checked)} />
              Post this collection into Payment Receipts for ledger impact
            </label>
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Save Collection
              </button>
              <button onClick={closeModal} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${distributionBorder}`, borderRadius: 8, color: "rgba(255,255,255,.6)", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
