"use client";
import { useState } from "react";
import { ResponsiveContainer, PageHeader, Card } from "@/components/ui/ResponsiveContainer";
import { ResponsiveForm, FormActions, Input, Button } from "@/components/ui/ResponsiveForm";

export default function OpeningBalancesImportPage() {
  const [csv, setCsv] = useState("code,debit,credit\nCASH001,10000,0\nAP001,0,2500");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState<{ updated: number; skipped: number; errors?: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/opening-balances/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, date }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveContainer>
      <PageHeader title="Opening Balances Import" description="Upload CSV to set opening balances for accounts." />
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-xs text-slate-500">Download template and paste CSV below</div>
          <div className="flex gap-3">
            <a href="/api/opening-balances/template" className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Download Template</a>
            <a href="/api/accounts?format=csv" className="px-3 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-700 text-sm font-semibold">Download Accounts (CSV)</a>
            <a href="/dashboard/accounts" className="px-3 py-2 rounded-lg border border-indigo-200 bg-white text-indigo-700 text-sm font-semibold">Open Accounts</a>
          </div>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded">{error}</div>}
        {result && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 text-sm rounded">
            Updated: {result.updated} • Skipped: {result.skipped}
            {result.errors && result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">View errors</summary>
                <ul className="mt-2 list-disc ml-5 text-xs">
                  {result.errors.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              </details>
            )}
          </div>
        )}
        <ResponsiveForm onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Opening Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">CSV Template</label>
              <div className="text-xs text-slate-500 mt-1">Columns: code,debit,credit</div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">CSV Data</label>
            <textarea
              className="mt-1 w-full h-40 rounded-lg border border-indigo-200 bg-indigo-50/30 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </div>
          <FormActions>
            <Button type="submit" disabled={loading}>{loading ? "Importing..." : "Import Opening Balances"}</Button>
          </FormActions>
        </ResponsiveForm>
      </Card>
    </ResponsiveContainer>
  );
}
