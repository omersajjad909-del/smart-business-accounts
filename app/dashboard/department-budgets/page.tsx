"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PageHeader, Card } from "@/components/ui/ResponsiveContainer";
import { ResponsiveForm, FormField, FormActions, Input, Button } from "@/components/ui/ResponsiveForm";

type DeptBudget = {
  id: string;
  department: string;
  year: number;
  month: number | null;
  amount: number;
  description?: string | null;
};

export default function DepartmentBudgetsPage() {
  const [items, setItems] = useState<DeptBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    department: "",
    year: new Date().getFullYear(),
    month: "",
    amount: "",
    description: "",
  });

  async function load() {
    const res = await fetch("/api/department-budgets");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      id: editId || undefined,
      department: form.department,
      year: Number(form.year),
      month: form.month ? Number(form.month) : null,
      amount: Number(form.amount),
      description: form.description || null,
    };
    const method = editId ? "PUT" : "POST";
    await fetch("/api/department-budgets", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setForm({ department: "", year: new Date().getFullYear(), month: "", amount: "", description: "" });
    setEditId(null);
    setLoading(false);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/department-budgets?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <ResponsiveContainer>
      <PageHeader title="Department Budgets" description="Allocate budgets by department and period." />
      <Card>
        <ResponsiveForm onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Department">
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required />
            </FormField>
            <FormField label="Year">
              <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
            </FormField>
            <FormField label="Month (optional)">
              <Input type="number" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} />
            </FormField>
            <FormField label="Amount">
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </FormField>
            <FormField label="Description">
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </FormField>
          </div>
          <FormActions>
            <Button type="submit" disabled={loading}>
              {editId ? "Update" : "Create"}
            </Button>
          </FormActions>
        </ResponsiveForm>
      </Card>

      <div className="mt-6 space-y-3">
        {items.map((b) => (
          <Card key={b.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-semibold">
                {b.department} — {b.year}{b.month ? `/${b.month}` : ""} — Rs. {Number(b.amount).toLocaleString()}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{b.description || "No description"}</div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditId(b.id);
                  setForm({
                    department: b.department,
                    year: b.year,
                    month: b.month ? String(b.month) : "",
                    amount: String(b.amount),
                    description: b.description || "",
                  });
                }}
              >
                Edit
              </Button>
              <Button type="button" variant="danger" onClick={() => remove(b.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </ResponsiveContainer>
  );
}
