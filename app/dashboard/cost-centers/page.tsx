"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, PageHeader, Card } from "@/components/ui/ResponsiveContainer";
import { ResponsiveForm, FormField, FormActions, Input, Button } from "@/components/ui/ResponsiveForm";

type CostCenter = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export default function CostCentersPage() {
  const [items, setItems] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", isActive: true });

  async function load() {
    const res = await fetch("/api/cost-centers");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const method = editId ? "PUT" : "POST";
    const payload = editId ? { ...form, id: editId } : form;
    await fetch("/api/cost-centers", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setForm({ code: "", name: "", isActive: true });
    setEditId(null);
    setLoading(false);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/cost-centers?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <ResponsiveContainer>
      <PageHeader title="Cost Centers" description="Tag transactions by cost center." />
      <Card>
        <ResponsiveForm onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Code">
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </FormField>
            <FormField label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </FormField>
            <FormField label="Active">
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--panel-bg-2)] text-[var(--text-primary)] p-2"
                value={form.isActive ? "yes" : "no"}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === "yes" })}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
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
        {items.map((c) => (
          <Card key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-semibold">{c.code} — {c.name}</div>
              <div className="text-xs text-[var(--text-muted)]">{c.isActive ? "Active" : "Inactive"}</div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditId(c.id);
                  setForm({ code: c.code, name: c.name, isActive: c.isActive });
                }}
              >
                Edit
              </Button>
              <Button type="button" variant="danger" onClick={() => remove(c.id)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </ResponsiveContainer>
  );
}
