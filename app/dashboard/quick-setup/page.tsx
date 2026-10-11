"use client";

/**
 * Quick setup — a new customer types who they sell to, who they buy from and
 * what they sell, and it all exists a moment later. No waiting for staff.
 */

import Link from "next/link";
import { useState } from "react";

type ItemRow = { name: string; unit: string; rate: string; purchaseRate: string };
const blankItem = (): ItemRow => ({ name: "", unit: "pcs", rate: "", purchaseRate: "" });

const box = {
  padding: "22px 24px", borderRadius: 16, marginBottom: 18,
  background: "rgba(var(--ink),.03)", border: "1px solid rgba(var(--ink),.09)",
} as const;
const input = {
  width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 14, fontFamily: "inherit",
  background: "transparent", color: "inherit", border: "1px solid rgba(var(--ink),.18)",
} as const;
const label = { fontSize: 13, fontWeight: 700, marginBottom: 4, display: "block" } as const;
const hint = { fontSize: 12, opacity: 0.6, marginBottom: 8 } as const;

export default function QuickSetupPage() {
  const [customers, setCustomers] = useState("");
  const [suppliers, setSuppliers] = useState("");
  const [items, setItems] = useState<ItemRow[]>([blankItem(), blankItem(), blankItem()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ customers: number; suppliers: number; items: number; skipped: number } | null>(null);

  const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((cur) => cur.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const filledItems = items.filter((r) => r.name.trim());
  const nothing = !lines(customers).length && !lines(suppliers).length && !filledItems.length;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/company/quick-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customers: lines(customers), suppliers: lines(suppliers), items: filledItems }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Something went wrong. Please try again.");
      setDone(j);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const made = done.customers + done.suppliers + done.items;
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ ...box, borderColor: "rgba(5,150,105,.4)", background: "rgba(5,150,105,.08)" }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>You are set up.</div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>
            {made === 0
              ? "Everything you entered already existed, so nothing was added."
              : `Added ${done.customers} customer${done.customers === 1 ? "" : "s"}, ${done.suppliers} supplier${done.suppliers === 1 ? "" : "s"} and ${done.items} product${done.items === 1 ? "" : "s"}.`}
            {done.skipped > 0 ? ` ${done.skipped} already existed and were skipped.` : ""}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <Link href="/dashboard/sales-invoice" style={{ padding: "10px 18px", borderRadius: 10, background: "#059669", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              Create your first invoice
            </Link>
            <Link href="/dashboard/accounts" style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(var(--ink),.2)", fontWeight: 600, fontSize: 14, textDecoration: "none", color: "inherit" }}>
              See my accounts
            </Link>
            <button type="button" onClick={() => setDone(null)} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(var(--ink),.2)", background: "transparent", fontWeight: 600, fontSize: 14, color: "inherit", cursor: "pointer" }}>
              Add more
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 16px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px" }}>Set up your business in 2 minutes</h1>
      <p style={{ fontSize: 14, opacity: 0.7, lineHeight: 1.6, margin: "0 0 22px" }}>
        Type the names you already work with. They are created the moment you press the button, and your chart of accounts is set up for you. Every field is optional and you can add more later.
      </p>

      <div style={box}>
        <label style={label}>Your customers</label>
        <div style={hint}>One name per line.</div>
        <textarea rows={4} value={customers} onChange={(e) => setCustomers(e.target.value)} style={{ ...input, resize: "vertical" }} placeholder={"Ali Traders\nKhan Brothers"} />
      </div>

      <div style={box}>
        <label style={label}>Your suppliers</label>
        <div style={hint}>The people you buy from. One name per line.</div>
        <textarea rows={4} value={suppliers} onChange={(e) => setSuppliers(e.target.value)} style={{ ...input, resize: "vertical" }} placeholder={"Zahid Wholesale\nAl Noor Suppliers"} />
      </div>

      <div style={box}>
        <label style={label}>Your products or services</label>
        <div style={hint}>Name, unit, selling price and what it costs you.</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>
          <span>Name</span><span>Unit</span><span>Sale price</span><span>Cost price</span>
        </div>
        {items.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
            <input style={input} value={r.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="e.g. Basmati rice 5kg" />
            <input style={input} value={r.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
            <input style={input} inputMode="decimal" value={r.rate} onChange={(e) => setItem(i, { rate: e.target.value })} />
            <input style={input} inputMode="decimal" value={r.purchaseRate} onChange={(e) => setItem(i, { purchaseRate: e.target.value })} />
          </div>
        ))}
        <button type="button" onClick={() => setItems((c) => [...c, blankItem()])} style={{ fontSize: 13, background: "none", border: "none", color: "inherit", textDecoration: "underline", cursor: "pointer", padding: 0 }}>
          + Add another product
        </button>
      </div>

      {error && <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", fontSize: 13, marginBottom: 14 }}>{error}</div>}

      <button
        type="button" onClick={submit} disabled={busy || nothing}
        style={{ padding: "13px 26px", borderRadius: 12, border: "none", background: "#059669", color: "white", fontWeight: 800, fontSize: 15, cursor: busy || nothing ? "default" : "pointer", opacity: busy || nothing ? 0.5 : 1 }}
      >
        {busy ? "Setting up…" : "Set up my business"}
      </button>
      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 10 }}>
        You can change or delete anything later from Accounts and Items.
      </div>
    </div>
  );
}
