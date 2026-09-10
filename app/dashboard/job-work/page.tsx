"use client";

/**
 * Job Work (Thekedar) — issue material, take pieces back, see what is lying out.
 *
 * Internal test workspaces only. The page asks /api/job-work/status first and
 * renders a locked panel everywhere else, so a real company never sees a form
 * that would fail on submit.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";
const dim = "rgba(255,255,255,.45)";
const teal = "#5eead4";
const amber = "#fbbf24";
const red = "#f87171";

type Status = {
  enabled: boolean;
  reason: string;
  summary: { workers: number; openChallans: number; closedChallans: number; receipts: number };
};
type Worker = {
  id: string;
  name: string;
  code: string;
  jobLocation: string;
  phone: string;
  defaultRatePerPc: number;
  allowedWastagePct: number;
  status: string;
};
type Item = { id: string; name: string; unit: string; category: string };
type ChallanLine = {
  itemId: string;
  itemName: string;
  unit: string;
  issuedQty: number;
  unitCost: number;
  standardPerPc?: number;
  consumedQty: number;
  returnedQty: number;
};
type Challan = {
  id: string;
  challanNo: string;
  status: string;
  date: string;
  workerName: string;
  workerCode: string;
  sourceLocation: string;
  jobLocation: string;
  finishedItemId: string;
  finishedItemName: string;
  expectedQty: number;
  receivedQty: number;
  ratePerPc: number;
  allowedWastagePct: number;
  lines: ChallanLine[];
  balanceValue: number;
};
type Priced = {
  goodQty: number;
  consumed: { itemName: string; unit: string; qty: number; value: number }[];
  returned: { itemName: string; unit: string; qty: number; value: number }[];
  materialCost: number;
  wastage: {
    itemName: string;
    unit: string;
    standardQty: number;
    actualQty: number;
    wastageQty: number;
    allowedQty: number;
    excessQty: number;
    recovery: number;
  }[];
  jobCharges: number;
  wastageRecovery: number;
  netPayable: number;
  freight: number;
  totalCost: number;
  unitCost: number;
  shortages: { itemName: string; asked: number; balance: number; unit: string }[];
};
type LedgerWorker = {
  workerId: string;
  workerName: string;
  workerCode: string;
  jobLocation: string;
  balanceValue: number;
  openChallans: number;
  items: {
    itemId: string;
    itemName: string;
    unit: string;
    issuedQty: number;
    consumedQty: number;
    returnedQty: number;
    balanceQty: number;
    unitCost: number;
    balanceValue: number;
  }[];
};

const money = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n: number) => Number(Number(n || 0).toFixed(4)).toLocaleString();

async function getJson<T>(url: string): Promise<T | { error: string }> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return (await r.json()) as T;
  } catch {
    return { error: "Network error" };
  }
}

export default function JobWorkPage() {
  const { isMobile } = useResponsive();
  const [status, setStatus] = useState<Status | null>(null);
  const [tab, setTab] = useState<"issue" | "receive" | "ledger" | "workers">("issue");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [ledger, setLedger] = useState<{ workers: LedgerWorker[]; totalValue: number }>({
    workers: [],
    totalValue: 0,
  });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [w, c, l] = await Promise.all([
      getJson<Worker[]>("/api/job-work/workers"),
      getJson<Challan[]>("/api/job-work/challans"),
      getJson<{ workers: LedgerWorker[]; totalValue: number }>("/api/job-work/ledger"),
    ]);
    if (Array.isArray(w)) setWorkers(w);
    if (Array.isArray(c)) setChallans(c);
    if (l && "workers" in l) setLedger(l);
    const s = await getJson<Status>("/api/job-work/status");
    if (s && "enabled" in s) setStatus(s);
  }, []);

  useEffect(() => {
    (async () => {
      const s = await getJson<Status>("/api/job-work/status");
      if (!s || !("enabled" in s)) {
        setStatus({ enabled: false, reason: "Could not load status", summary: { workers: 0, openChallans: 0, closedChallans: 0, receipts: 0 } });
        return;
      }
      setStatus(s);
      if (!s.enabled) return;
      const it = await getJson<Item[]>("/api/items-new");
      if (Array.isArray(it)) setItems(it);
      await refresh();
    })();
  }, [refresh]);

  const pendingChallans = useMemo(
    () => challans.filter((c) => c.status !== "closed"),
    [challans],
  );

  if (!status) {
    return (
      <div style={{ padding: 32, fontFamily: ff, color: dim }}>Loading…</div>
    );
  }

  if (!status.enabled) {
    return (
      <div style={{ padding: isMobile ? "17px 16px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Job Work</h1>
        <div
          style={{
            marginTop: 20,
            maxWidth: 620,
            border: `1px solid ${border}`,
            borderLeft: `3px solid ${amber}`,
            background: bg,
            borderRadius: 12,
            padding: 22,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: amber, letterSpacing: 1, marginBottom: 10 }}>
            UNDER TEST
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,.75)" }}>
            {status.reason}
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: dim }}>
            Demo and live companies cannot see this module — no entries are written and no accounts are created.
            Once it is signed off in a test workspace, it will be opened up from here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "17px 16px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Job Work</h1>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1,
              color: amber,
              border: `1px solid ${amber}`,
              borderRadius: 4,
              padding: "3px 7px",
            }}
          >
            TEST WORKSPACE
          </span>
        </div>
        <p style={{ fontSize: 13, color: dim, margin: "6px 0 0" }}>
          Send material out to a job worker and take finished pieces back. The material stays your asset — this is not a sale.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {([
          ["issue", `Issue Challan`],
          ["receive", `Receive (${pendingChallans.length})`],
          ["ledger", `Stock at Job Worker`],
          ["workers", `Job Workers (${workers.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: `1px solid ${tab === key ? teal : border}`,
              background: tab === key ? "rgba(94,234,212,.10)" : bg,
              color: tab === key ? teal : "#93c5fd",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: ff,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 16,
            padding: "11px 14px",
            borderRadius: 10,
            border: `1px solid ${msg.kind === "ok" ? teal : red}`,
            background: msg.kind === "ok" ? "rgba(94,234,212,.08)" : "rgba(248,113,113,.08)",
            color: msg.kind === "ok" ? teal : red,
            fontSize: 13,
          }}
        >
          {msg.text}
        </div>
      )}

      {tab === "workers" && (
        <WorkersTab workers={workers} busy={busy} setBusy={setBusy} setMsg={setMsg} refresh={refresh} />
      )}
      {tab === "issue" && (
        <IssueTab
          onGoToWorkers={() => setTab("workers")}
          workers={workers}
          items={items}
          challans={challans}
          busy={busy}
          setBusy={setBusy}
          setMsg={setMsg}
          refresh={refresh}
        />
      )}
      {tab === "receive" && (
        <ReceiveTab
          challans={pendingChallans}
          busy={busy}
          setBusy={setBusy}
          setMsg={setMsg}
          refresh={refresh}
        />
      )}
      {tab === "ledger" && <LedgerTab ledger={ledger} />}
    </div>
  );
}

/* ─────────────────────────── shared bits ─────────────────────────── */

const card: React.CSSProperties = {
  border: `1px solid ${border}`,
  background: bg,
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.6,
  color: dim,
  textTransform: "uppercase",
  marginBottom: 5,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 8,
  border: `1px solid ${border}`,
  background: "rgba(0,0,0,.25)",
  color: "#fff",
  fontSize: 13,
  fontFamily: ff,
  outline: "none",
  boxSizing: "border-box",
};
const selectInput: React.CSSProperties = {
  ...input,
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingRight: 30,
  backgroundImage: `linear-gradient(45deg, transparent 50%, ${dim} 50%), linear-gradient(135deg, ${dim} 50%, transparent 50%)`,
  backgroundPosition: "calc(100% - 18px) center, calc(100% - 13px) center",
  backgroundSize: "5px 5px, 5px 5px",
  backgroundRepeat: "no-repeat",
};
const btn = (primary = true): React.CSSProperties => ({
  padding: "10px 18px",
  borderRadius: 9,
  border: `1px solid ${primary ? teal : border}`,
  background: primary ? "rgba(94,234,212,.12)" : bg,
  color: primary ? teal : "#93c5fd",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: ff,
});
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: dim,
  borderBottom: `1px solid ${border}`,
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "9px 10px",
  fontSize: 13,
  borderBottom: `1px solid ${border}`,
  verticalAlign: "top",
};
const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

type Setter = {
  busy: boolean;
  setBusy: (b: boolean) => void;
  setMsg: (m: { kind: "ok" | "err"; text: string } | null) => void;
  refresh: () => Promise<void>;
};

async function post(url: string, body: unknown, method = "POST") {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
  return j;
}

/* ─────────────────────────── Thekedars ─────────────────────────── */

function WorkersTab({ workers, setBusy, busy, setMsg, refresh }: Setter & { workers: Worker[] }) {
  const [form, setForm] = useState({ name: "", code: "", phone: "", defaultRatePerPc: "", allowedWastagePct: "" });

  const submit = async () => {
    if (!form.name.trim()) return setMsg({ kind: "err", text: "Job worker name is required" });
    setBusy(true);
    try {
      await post("/api/job-work/workers", {
        name: form.name.trim(),
        code: form.code.trim() || form.name.trim(),
        phone: form.phone.trim(),
        defaultRatePerPc: Number(form.defaultRatePerPc) || 0,
        allowedWastagePct: Number(form.allowedWastagePct) || 0,
      });
      setForm({ name: "", code: "", phone: "", defaultRatePerPc: "", allowedWastagePct: "" });
      setMsg({ kind: "ok", text: "Job worker added — a payable account was created for them." });
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section
        title="New job worker"
        sub="The code becomes the stock location (JW:CODE) and cannot be changed later. Each job worker gets their own payable account."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          <div>
            <label style={label}>Name</label>
            <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Stitching" />
          </div>
          <div>
            <label style={label}>Code</label>
            <input style={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Contract" />
          </div>
          <div>
            <label style={label}>Phone</label>
            <input style={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label style={label}>Rate / pc</label>
            <input style={input} type="number" step="0.01" value={form.defaultRatePerPc} onChange={(e) => setForm({ ...form, defaultRatePerPc: e.target.value })} placeholder="2.50" />
          </div>
          <div>
            <label style={label}>Allowed wastage %</label>
            <input style={input} type="number" step="0.01" value={form.allowedWastagePct} onChange={(e) => setForm({ ...form, allowedWastagePct: e.target.value })} placeholder="3" />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button style={btn()} disabled={busy} onClick={submit}>
            {busy ? "Saving…" : "Add job worker"}
          </button>
        </div>
      </Section>

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Code</th>
              <th style={th}>Stock location</th>
              <th style={th}>Phone</th>
              <th style={{ ...th, textAlign: "right" }}>Rate / pc</th>
              <th style={{ ...th, textAlign: "right" }}>Allowed wastage</th>
            </tr>
          </thead>
          <tbody>
            {workers.length === 0 && (
              <tr>
                <td style={{ ...td, color: dim }} colSpan={6}>
                  No job workers yet. Add one above.
                </td>
              </tr>
            )}
            {workers.map((w) => (
              <tr key={w.id}>
                <td style={td}>{w.name}</td>
                <td style={{ ...td, color: dim }}>{w.code}</td>
                <td style={{ ...td, color: teal, fontSize: 12 }}>{w.jobLocation}</td>
                <td style={{ ...td, color: dim }}>{w.phone || "—"}</td>
                <td style={tdNum}>{w.defaultRatePerPc ? money(w.defaultRatePerPc) : "—"}</td>
                <td style={tdNum}>{w.allowedWastagePct ? `${w.allowedWastagePct}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─────────────────────────── Issue ─────────────────────────── */

type DraftLine = { itemId: string; qty: string; standardPerPc: string };

function IssueTab({
  workers,
  items,
  challans,
  busy,
  setBusy,
  setMsg,
  refresh,
  onGoToWorkers,
}: Setter & { workers: Worker[]; items: Item[]; challans: Challan[]; onGoToWorkers: () => void }) {
  const [workerId, setWorkerId] = useState("");
  const [finishedItemId, setFinishedItemId] = useState("");
  const [sourceLocation, setSourceLocation] = useState("MAIN");
  const [expectedQty, setExpectedQty] = useState("");
  const [ratePerPc, setRatePerPc] = useState("");
  const [allowedWastagePct, setAllowedWastagePct] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ itemId: "", qty: "", standardPerPc: "" }]);

  const worker = workers.find((w) => w.id === workerId);
  useEffect(() => {
    if (!worker) return;
    setRatePerPc((r) => r || (worker.defaultRatePerPc ? String(worker.defaultRatePerPc) : ""));
    setAllowedWastagePct((a) => a || (worker.allowedWastagePct ? String(worker.allowedWastagePct) : ""));
  }, [worker]);

  const raw = items.filter((i) => i.category === "RAW_MATERIAL" || i.category === "TRADING");
  const finished = items.filter((i) => i.category === "FINISHED" || i.category === "TRADING");

  const submit = async () => {
    const payload = lines
      .map((l) => ({ itemId: l.itemId, qty: Number(l.qty), standardPerPc: Number(l.standardPerPc) }))
      .filter((l) => l.itemId && l.qty > 0);
    if (!workerId) return setMsg({ kind: "err", text: "Select a job worker" });
    if (!payload.length) return setMsg({ kind: "err", text: "At least one material line is required" });

    setBusy(true);
    try {
      const r = await post("/api/job-work/challans", {
        workerId,
        finishedItemId,
        sourceLocation,
        expectedQty: Number(expectedQty) || 0,
        ratePerPc: Number(ratePerPc) || 0,
        allowedWastagePct: Number(allowedWastagePct) || 0,
        notes,
        lines: payload,
      });
      setMsg({
        kind: "ok",
        text: `${r.challanNo} created — Rs ${money(r.totalValue)} of material moved to ${r.jobLocation}. Voucher ${r.voucherNo || "—"}. No sale was recorded.`,
      });
      setLines([{ itemId: "", qty: "", standardPerPc: "" }]);
      setExpectedQty("");
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  // Landing on a form whose first dropdown is empty, with nothing saying where
  // the entries come from, is a dead end — so say it, and hand over the button.
  if (!workers.length) {
    return (
      <div style={{ ...card, borderLeft: `3px solid ${amber}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: amber, marginBottom: 10 }}>
          FIRST STEP
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No job worker has been added yet</div>
        <p style={{ fontSize: 13.5, color: dim, margin: "0 0 16px", maxWidth: 620, lineHeight: 1.6 }}>
          At least one job worker is needed before a challan can be raised. Their code becomes both their stock
          location (<span style={{ color: teal }}>JW:CODE</span>) and their payable account — both are created for you,
          so there is nothing to set up separately.
        </p>
        <button style={btn()} onClick={onGoToWorkers}>
          Add a job worker →
        </button>
      </div>
    );
  }

  return (
    <>
      <Section
        title="Send material to a job worker"
        sub="This challan is not a sale — no customer is involved and the sales figure does not move. Only the stock location changes."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={label}>Job worker</label>
            <select style={selectInput} value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              <option value="">— select —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>From (your godown)</label>
            <input style={input} value={sourceLocation} onChange={(e) => setSourceLocation(e.target.value)} />
            <div style={{ fontSize: 11, color: dim, marginTop: 4, lineHeight: 1.45 }}>
              Your own store. The job worker&apos;s location is not something you create —
              {worker ? <span style={{ color: teal }}> {worker.jobLocation}</span> : " JW:CODE"} is made for you.
            </div>
          </div>
          <div>
            <label style={label}>What will be made (finished item)</label>
            <select style={selectInput} value={finishedItemId} onChange={(e) => setFinishedItemId(e.target.value)}>
              <option value="">— select —</option>
              {finished.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Expected pcs</label>
            <input style={input} type="number" value={expectedQty} onChange={(e) => setExpectedQty(e.target.value)} placeholder="10000" />
          </div>
          <div>
            <label style={label}>Rate / pc</label>
            <input style={input} type="number" step="0.01" value={ratePerPc} onChange={(e) => setRatePerPc(e.target.value)} placeholder="2.50" />
          </div>
          <div>
            <label style={label}>Allowed wastage %</label>
            <input style={input} type="number" step="0.01" value={allowedWastagePct} onChange={(e) => setAllowedWastagePct(e.target.value)} placeholder="3" />
          </div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: dim, textTransform: "uppercase", marginBottom: 8 }}>
          Material lines
        </div>
        {lines.map((l, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginBottom: 9 }}>
            <select
              style={selectInput}
              value={l.itemId}
              onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, itemId: e.target.value } : x)))}
            >
              <option value="">— material —</option>
              {raw.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
            <input
              style={input}
              type="number"
              step="0.001"
              placeholder="qty"
              value={l.qty}
              onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
            />
            <input
              style={input}
              type="number"
              step="0.0001"
              placeholder="std / pc"
              title="Standard consumption per finished piece, used for wastage recovery. Leave blank and wastage is not checked."
              value={l.standardPerPc}
              onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, standardPerPc: e.target.value } : x)))}
            />
            <button
              style={{ ...btn(false), padding: "8px 12px" }}
              onClick={() => setLines(lines.length > 1 ? lines.filter((_, i) => i !== idx) : lines)}
              title="Remove line"
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: dim, marginTop: 4 }}>
          Leave <b>std / pc</b> blank and wastage is not calculated — which is the right answer for a single material with no recovery agreed.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button style={btn(false)} onClick={() => setLines([...lines, { itemId: "", qty: "", standardPerPc: "" }])}>
            + Line
          </button>
          <button style={btn()} disabled={busy} onClick={submit}>
            {busy ? "Posting…" : "Create issue challan"}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={label}>Notes</label>
          <input style={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Section>

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "14px 18px 0", fontSize: 15, fontWeight: 700 }}>All challans</div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780, marginTop: 10 }}>
          <thead>
            <tr>
              <th style={th}>Challan</th>
              <th style={th}>Date</th>
              <th style={th}>Job worker</th>
              <th style={th}>Will make</th>
              <th style={{ ...th, textAlign: "right" }}>Expected</th>
              <th style={{ ...th, textAlign: "right" }}>Received</th>
              <th style={{ ...th, textAlign: "right" }}>Balance value</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {challans.length === 0 && (
              <tr>
                <td style={{ ...td, color: dim }} colSpan={8}>
                  No challans yet.
                </td>
              </tr>
            )}
            {challans.map((c) => (
              <tr key={c.id}>
                <td style={{ ...td, color: teal }}>{c.challanNo}</td>
                <td style={{ ...td, color: dim }}>{c.date}</td>
                <td style={td}>{c.workerName}</td>
                <td style={{ ...td, color: dim }}>{c.finishedItemName || "—"}</td>
                <td style={tdNum}>{c.expectedQty || "—"}</td>
                <td style={tdNum}>{c.receivedQty || 0}</td>
                <td style={tdNum}>{money(c.balanceValue)}</td>
                <td style={{ ...td, color: c.status === "closed" ? dim : amber, fontSize: 12, fontWeight: 700 }}>
                  {c.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─────────────────────────── Receive ─────────────────────────── */

function ReceiveTab({ challans, busy, setBusy, setMsg, refresh }: Setter & { challans: Challan[] }) {
  const [challanId, setChallanId] = useState("");
  const [goodQty, setGoodQty] = useState("");
  const [freight, setFreight] = useState("");
  const [jobCharges, setJobCharges] = useState("");
  const [returns, setReturns] = useState<Record<string, string>>({});
  // Blank means "use the standard" — see priceJobWorkReceipt. Kept separate
  // from returns because the two answer different questions: what was burnt,
  // and what physically came back.
  const [consumes, setConsumes] = useState<Record<string, string>>({});
  const [priced, setPriced] = useState<Priced | null>(null);

  const challan = challans.find((c) => c.id === challanId) || null;

  useEffect(() => {
    setPriced(null);
    setReturns({});
    setConsumes({});
    setGoodQty("");
    setJobCharges("");
  }, [challanId]);

  // Live pricing: the per-piece cost and the wastage recovery are exactly the
  // two numbers somebody needs to see before committing, not after.
  useEffect(() => {
    if (!challanId || !(Number(goodQty) > 0)) {
      setPriced(null);
      return;
    }
    const returned = Object.entries(returns)
      .map(([itemId, v]) => ({ itemId, qty: Number(v) }))
      .filter((r) => r.qty > 0);
    const consumed = Object.entries(consumes)
      .filter(([, v]) => String(v).trim() !== "")
      .map(([itemId, v]) => ({ itemId, qty: Number(v) }))
      .filter((c) => Number.isFinite(c.qty) && c.qty >= 0);
    const params = new URLSearchParams({ challanId, goodQty: String(Number(goodQty)) });
    if (returned.length) params.set("returned", JSON.stringify(returned));
    if (consumed.length) params.set("consumed", JSON.stringify(consumed));
    if (Number(freight) > 0) params.set("freight", String(Number(freight)));
    if (jobCharges !== "" && Number(jobCharges) >= 0) params.set("jobCharges", String(Number(jobCharges)));

    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await getJson<Priced & { error?: string }>(`/api/job-work/receipts?${params.toString()}`);
      if (cancelled) return;
      setPriced(r && !("error" in r && r.error) ? (r as Priced) : null);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [challanId, goodQty, freight, jobCharges, returns, consumes]);

  const submit = async () => {
    if (!challanId) return setMsg({ kind: "err", text: "Select a challan" });
    if (!(Number(goodQty) > 0)) return setMsg({ kind: "err", text: "Enter how many good pieces were received" });
    setBusy(true);
    try {
      const returned = Object.entries(returns)
        .map(([itemId, v]) => ({ itemId, qty: Number(v) }))
        .filter((r) => r.qty > 0);
      const consumed = Object.entries(consumes)
        .filter(([, v]) => String(v).trim() !== "")
        .map(([itemId, v]) => ({ itemId, qty: Number(v) }))
        .filter((c) => Number.isFinite(c.qty) && c.qty >= 0);
      const r = await post("/api/job-work/receipts", {
        challanId,
        goodQty: Number(goodQty),
        returned,
        ...(consumed.length ? { consumed } : {}),
        freight: Number(freight) || 0,
        ...(jobCharges !== "" ? { jobCharges: Number(jobCharges) } : {}),
      });
      setMsg({
        kind: "ok",
        text: `${r.receiptNo} posted — ${r.goodQty} pcs @ Rs ${money(r.unitCost)}/pc received into stock. Payable to job worker: Rs ${money(r.netPayable)}. Challan is now "${r.challanStatus}".`,
      });
      setChallanId("");
      await refresh();
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section title="Take finished pieces back" sub="Material consumed, finished goods into stock, and the job worker's payable — all from one document.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          <div>
            <label style={label}>Challan</label>
            <select style={selectInput} value={challanId} onChange={(e) => setChallanId(e.target.value)}>
              <option value="">— select —</option>
              {challans.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.challanNo} · {c.workerName} · {c.finishedItemName || "?"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Good pcs received</label>
            <input style={input} type="number" value={goodQty} onChange={(e) => setGoodQty(e.target.value)} placeholder="10000" />
          </div>
          <div>
            <label style={label}>Job charges (blank = rate × pcs)</label>
            <input style={input} type="number" step="0.01" value={jobCharges} onChange={(e) => setJobCharges(e.target.value)} placeholder={challan ? money(challan.ratePerPc * (Number(goodQty) || 0)) : ""} />
          </div>
          <div>
            <label style={label}>Freight (both ways)</label>
            <input style={input} type="number" step="0.01" value={freight} onChange={(e) => setFreight(e.target.value)} placeholder="1800" />
          </div>
        </div>

        {challan && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: dim, textTransform: "uppercase", marginBottom: 8 }}>
              Material held by the job worker
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
                <thead>
                  <tr>
                    <th style={th}>Material</th>
                    <th style={{ ...th, textAlign: "right" }}>Issued</th>
                    <th style={{ ...th, textAlign: "right" }}>Balance</th>
                    <th style={{ ...th, textAlign: "right" }}>Standard</th>
                    <th style={{ ...th, width: 120 }}>Consumed</th>
                    <th style={{ ...th, width: 120 }}>Returned</th>
                    <th style={{ ...th, textAlign: "right" }}>Still with worker</th>
                  </tr>
                </thead>
                <tbody>
                  {challan.lines.map((l) => {
                    const balance = l.issuedQty - l.consumedQty - l.returnedQty;
                    // The standard for the pieces being received now — what the
                    // job *should* have taken, and what Consumed defaults to.
                    const std = l.standardPerPc && Number(goodQty) > 0
                      ? l.standardPerPc * Number(goodQty)
                      : null;
                    const ret = Number(returns[l.itemId]) || 0;
                    const con = consumes[l.itemId] !== undefined && consumes[l.itemId] !== ""
                      ? Number(consumes[l.itemId]) || 0
                      : std !== null
                        ? Math.min(std, Math.max(0, balance - ret))
                        : Math.max(0, balance - ret);
                    const left = balance - con - ret;
                    return (
                      <tr key={l.itemId}>
                        <td style={td}>{l.itemName}</td>
                        <td style={tdNum}>
                          {qty(l.issuedQty)} {l.unit}
                        </td>
                        <td style={{ ...tdNum, color: teal }}>
                          {qty(balance)} {l.unit}
                        </td>
                        <td style={{ ...tdNum, color: dim }}>{std !== null ? qty(std) : "—"}</td>
                        <td style={td}>
                          <input
                            style={{ ...input, padding: "6px 9px" }}
                            type="number"
                            step="0.001"
                            value={consumes[l.itemId] ?? ""}
                            onChange={(e) => setConsumes({ ...consumes, [l.itemId]: e.target.value })}
                            placeholder={std !== null ? qty(std) : qty(Math.max(0, balance - ret))}
                            title="Actually burnt making these pieces. Leave blank to use the standard."
                          />
                        </td>
                        <td style={td}>
                          <input
                            style={{ ...input, padding: "6px 9px" }}
                            type="number"
                            step="0.001"
                            value={returns[l.itemId] || ""}
                            onChange={(e) => setReturns({ ...returns, [l.itemId]: e.target.value })}
                            placeholder="0"
                            title="Good material physically coming back to your godown now."
                          />
                        </td>
                        <td style={{ ...tdNum, color: left > 1e-6 ? amber : dim }}>
                          {qty(left)} {l.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: dim, marginTop: 8, lineHeight: 1.55, maxWidth: 760 }}>
              A part-used roll is <b style={{ color: "#fff" }}>not wastage</b>. Send 13 rolls for a job needing 12.5 and
              the half roll is still good material: leave it out of <b style={{ color: "#fff" }}>Consumed</b> and it
              either comes back (put it in <b style={{ color: "#fff" }}>Returned</b>) or stays on the worker&apos;s floor
              for the next order, where it keeps showing under <b style={{ color: "#fff" }}>Still with worker</b>.
              Only what is genuinely burnt above the standard counts as wastage and gets charged back.
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button style={btn()} disabled={busy || !priced} onClick={submit}>
            {busy ? "Posting…" : "Post receipt"}
          </button>
        </div>
      </Section>

      {priced && (
        <Section title="What this receipt costs" sub="Shown before posting — this is the real per-piece cost.">
          {priced.shortages.length > 0 && (
            <div style={{ color: red, fontSize: 13, marginBottom: 12 }}>
              {priced.shortages.map((s) => `${s.itemName}: asked for ${qty(s.asked)}${s.unit}, balance ${qty(s.balance)}${s.unit}`).join(" · ")}
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
              <tbody>
                {[
                  ["Material consumed", priced.materialCost],
                  ["Job charges", priced.jobCharges],
                  ["Wastage recovery", -priced.wastageRecovery],
                  ["Freight", priced.freight],
                ].map(([k, v]) => (
                  <tr key={k as string}>
                    <td style={td}>{k as string}</td>
                    <td style={{ ...tdNum, color: (v as number) < 0 ? red : "#fff" }}>
                      {(v as number) < 0 ? `(${money(Math.abs(v as number))})` : money(v as number)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, fontWeight: 700 }}>Total cost — {priced.goodQty} pcs</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: teal }}>{money(priced.totalCost)}</td>
                </tr>
                <tr>
                  <td style={{ ...td, fontWeight: 700 }}>Per pc</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: teal }}>{money(priced.unitCost)}</td>
                </tr>
                <tr>
                  <td style={{ ...td, fontWeight: 700 }}>Payable to job worker</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: amber }}>{money(priced.netPayable)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {priced.wastage.length > 0 && (
            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: dim, textTransform: "uppercase", marginBottom: 8 }}>
                Wastage
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                <thead>
                  <tr>
                    <th style={th}>Material</th>
                    <th style={{ ...th, textAlign: "right" }}>Standard</th>
                    <th style={{ ...th, textAlign: "right" }}>Actual</th>
                    <th style={{ ...th, textAlign: "right" }}>Wastage</th>
                    <th style={{ ...th, textAlign: "right" }}>Allowed</th>
                    <th style={{ ...th, textAlign: "right" }}>Excess</th>
                    <th style={{ ...th, textAlign: "right" }}>Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {priced.wastage.map((w) => (
                    <tr key={w.itemName}>
                      <td style={td}>{w.itemName}</td>
                      <td style={tdNum}>{qty(w.standardQty)}</td>
                      <td style={tdNum}>{qty(w.actualQty)}</td>
                      <td style={tdNum}>{qty(w.wastageQty)}</td>
                      <td style={tdNum}>{qty(w.allowedQty)}</td>
                      <td style={{ ...tdNum, color: w.excessQty > 0 ? red : dim }}>{qty(w.excessQty)}</td>
                      <td style={{ ...tdNum, color: w.recovery > 0 ? red : dim }}>{money(w.recovery)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}
    </>
  );
}

/* ─────────────────────────── Ledger ─────────────────────────── */

function LedgerTab({ ledger }: { ledger: { workers: LedgerWorker[]; totalValue: number } }) {
  return (
    <>
      <div style={{ ...card, display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: dim, textTransform: "uppercase" }}>
            Stock at Job Worker
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: teal, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
            Rs {money(ledger.totalValue)}
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: dim, maxWidth: 460, lineHeight: 1.55 }}>
          This is your current asset, not the job worker&apos;s. It should agree with account <b style={{ color: "#fff" }}>1204 Stock at Job Worker</b> on the balance sheet.
        </div>
      </div>

      {ledger.workers.length === 0 && (
        <div style={{ ...card, color: dim, fontSize: 13 }}>No material is lying with any job worker.</div>
      )}

      {ledger.workers.map((w) => (
        <div key={w.workerId} style={{ ...card, padding: 0 }}>
          <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{w.workerName}</div>
              <div style={{ fontSize: 11.5, color: dim, marginTop: 2 }}>
                {w.jobLocation} · {w.openChallans} open challan
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: teal, fontVariantNumeric: "tabular-nums" }}>
              Rs {money(w.balanceValue)}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={th}>Material</th>
                  <th style={{ ...th, textAlign: "right" }}>Issued</th>
                  <th style={{ ...th, textAlign: "right" }}>Consumed</th>
                  <th style={{ ...th, textAlign: "right" }}>Returned</th>
                  <th style={{ ...th, textAlign: "right" }}>Balance</th>
                  <th style={{ ...th, textAlign: "right" }}>Rate</th>
                  <th style={{ ...th, textAlign: "right" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {w.items.map((r) => (
                  <tr key={r.itemId}>
                    <td style={td}>{r.itemName}</td>
                    <td style={tdNum}>{qty(r.issuedQty)}</td>
                    <td style={tdNum}>{qty(r.consumedQty)}</td>
                    <td style={tdNum}>{qty(r.returnedQty)}</td>
                    <td style={{ ...tdNum, color: r.balanceQty > 0 ? teal : dim }}>
                      {qty(r.balanceQty)} {r.unit}
                    </td>
                    <td style={{ ...tdNum, color: dim }}>{money(r.unitCost)}</td>
                    <td style={tdNum}>{money(r.balanceValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
