"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type ApprovalItem = {
  id: string;
  type: string;
  invoiceNo?: string;
  poNo?: string;
  quotationNo?: string;
  challanNo?: string;
  voucherNo?: string;
  receiptNo?: string;
  total?: number;
  totalAmount?: number;
  amount?: number;
  date: string;
};

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  async function loadApprovals() {
    const user = getCurrentUser();
    if (!user) return;
    setLoading(true);
    const res = await fetch("/api/approvals", {
      headers: {
        "x-user-id": user.id,
        "x-user-role": user.role,
        "x-company-id": user.companyId || "",
      },
    });
    if (!res.ok) {
      setItems([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    const list = [
      ...(data.sales || []),
      ...(data.purchases || []),
      ...(data.payments || []),
      ...(data.expenses || []),
      ...(data.orders || []),
      ...(data.quotations || []),
      ...(data.challans || []),
    ];
    setItems(list);
    setLoading(false);
  }

  async function updateStatus(id: string, type: string, status: "APPROVED" | "REJECTED") {
    const user = getCurrentUser();
    if (!user) return;
    await fetch("/api/approvals", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": user.id,
        "x-user-role": user.role,
        "x-company-id": user.companyId || "",
      },
      body: JSON.stringify({
        id,
        type,
        status,
        remarks: remarks[id] || "",
      }),
    });
    await loadApprovals();
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadApprovals();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return <div className="p-6">Loading approvals...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-2xl font-bold">Approvals</h1>
        <button
          onClick={loadApprovals}
          className="bg-gray-900 text-white px-4 py-2 rounded text-sm"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 && (
        <div className="bg-white border rounded p-6 text-gray-500">
          No pending approvals.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-white border rounded p-4 space-y-3">
            <div className="text-xs text-gray-500 uppercase">{item.type}</div>
            <div className="text-lg font-semibold">
              {item.invoiceNo || item.poNo || item.quotationNo || item.challanNo || item.voucherNo || item.receiptNo || item.id}
            </div>
            <div className="text-sm text-gray-600">
              Date: {new Date(item.date).toLocaleDateString()}
            </div>
            <div className="text-sm font-bold">
              Amount: {(item.total ?? item.totalAmount ?? item.amount ?? 0).toLocaleString()}
            </div>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Remarks (optional)"
              value={remarks[item.id] || ""}
              onChange={(e) => setRemarks((prev) => ({ ...prev, [item.id]: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus(item.id, item.type, "APPROVED")}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm"
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus(item.id, item.type, "REJECTED")}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
