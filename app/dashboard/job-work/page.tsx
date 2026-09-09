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
        setStatus({ enabled: false, reason: "Status load nahi hua", summary: { workers: 0, openChallans: 0, closedChallans: 0, receipts: 0 } });
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
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Job Work — Thekedar</h1>
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
            Demo aur real companies is module ko nahi dekhtin — na koi entry banti hai, na koi account.
            Test workspace mein OK ho jaye, phir yahan se aage kholenge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "17px 16px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Job Work — Thekedar</h1>
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
          Rolls thekedar ko bhejein, pcs wapas lein. Maal aap ka asset rehta hai — ye sale nahi hai.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {([
          ["issue", `Issue Challan`],
          ["receive", `Receive (${pendingChallans.length})`],
          ["ledger", `Stock at Thekedar`],
          ["workers", `Thekedars (${workers.length})`],
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
    if (!form.name.trim()) return setMsg({ kind: "err", text: "Thekedar ka naam chahiye" });
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
      setMsg({ kind: "ok", text: "Thekedar add ho gaya — uska payable account bhi ban gaya." });
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
        title="Naya thekedar"
        sub="Code stock location banata hai (JW:CODE) aur baad mein badla nahi ja sakta. Har thekedar ka apna payable account banta hai."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          <div>
            <label style={label}>Naam</label>
            <input style={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Thekedar A" />
          </div>
          <div>
            <label style={label}>Code</label>
            <input style={input} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="THEKA" />
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
            {busy ? "Saving…" : "Add thekedar"}
          </button>
        </div>
      </Section>

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={th}>Naam</th>
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
                  Abhi koi thekedar nahi. Upar se add karein.
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
    if (!workerId) return setMsg({ kind: "err", text: "Thekedar chunein" });
    if (!payload.length) return setMsg({ kind: "err", text: "Kam se kam ek material line chahiye" });

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
        text: `${r.challanNo} ban gaya — Rs ${money(r.totalValue)} ka maal ${r.jobLocation} par transfer hua. Voucher ${r.voucherNo || "—"}. Koi sale nahi bani.`,
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
          PEHLA QADAM
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Abhi koi thekedar add nahi hua</div>
        <p style={{ fontSize: 13.5, color: dim, margin: "0 0 16px", maxWidth: 620, lineHeight: 1.6 }}>
          Challan banane se pehle kam se kam ek thekedar chahiye. Uske code se hi uski stock location
          (<span style={{ color: teal }}>JW:CODE</span>) aur uska payable account banta hai — dono khud ban jate hain,
          aap ko alag se kuch nahi banana.
        </p>
        <button style={btn()} onClick={onGoToWorkers}>
          Thekedar add karein →
        </button>
      </div>
    );
  }

  return (
    <>
      <Section
        title="Material thekedar ko bhejein"
        sub="Ye challan sale nahi hai — na customer banta hai, na sales figure hilta hai. Sirf stock ki location badalti hai."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={label}>Thekedar</label>
            <select style={input} value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              <option value="">— chunein —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Kahan se</label>
            <input style={input} value={sourceLocation} onChange={(e) => setSourceLocation(e.target.value)} />
          </div>
          <div>
            <label style={label}>Kya banega (finished item)</label>
            <select style={input} value={finishedItemId} onChange={(e) => setFinishedItemId(e.target.value)}>
              <option value="">— chunein —</option>
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
              style={input}
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
              title="Standard consumption per finished piece — wastage recovery ke liye. Khali chhor dein to wastage check nahi hoga."
              value={l.standardPerPc}
              onChange={(e) => setLines(lines.map((x, i) => (i === idx ? { ...x, standardPerPc: e.target.value } : x)))}
            />
            <button
              style={{ ...btn(false), padding: "8px 12px" }}
              onClick={() => setLines(lines.length > 1 ? lines.filter((_, i) => i !== idx) : lines)}
              title="Line hatayein"
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: dim, marginTop: 4 }}>
          <b>std / pc</b> khali chhor dein to wastage ka hisaab nahi hoga — ek hi material aur koi recovery na ho to yahi theek hai.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button style={btn(false)} onClick={() => setLines([...lines, { itemId: "", qty: "", standardPerPc: "" }])}>
            + Line
          </button>
          <button style={btn()} disabled={busy} onClick={submit}>
            {busy ? "Posting…" : "Issue challan banayein"}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={label}>Notes</label>
          <input style={input} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Section>

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <div style={{ padding: "14px 18px 0", fontSize: 15, fontWeight: 700 }}>Sab challans</div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780, marginTop: 10 }}>
          <thead>
            <tr>
              <th style={th}>Challan</th>
              <th style={th}>Date</th>
              <th style={th}>Thekedar</th>
              <th style={th}>Banega</th>
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
                  Abhi koi challan nahi.
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
  const [priced, setPriced] = useState<Priced | null>(null);

  const challan = challans.find((c) => c.id === challanId) || null;

  useEffect(() => {
    setPriced(null);
    setReturns({});
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
    const params = new URLSearchParams({ challanId, goodQty: String(Number(goodQty)) });
    if (returned.length) params.set("returned", JSON.stringify(returned));
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
  }, [challanId, goodQty, freight, jobCharges, returns]);

  const submit = async () => {
    if (!challanId) return setMsg({ kind: "err", text: "Challan chunein" });
    if (!(Number(goodQty) > 0)) return setMsg({ kind: "err", text: "Kitne pcs mile? qty daalein" });
    setBusy(true);
    try {
      const returned = Object.entries(returns)
        .map(([itemId, v]) => ({ itemId, qty: Number(v) }))
        .filter((r) => r.qty > 0);
      const r = await post("/api/job-work/receipts", {
        challanId,
        goodQty: Number(goodQty),
        returned,
        freight: Number(freight) || 0,
        ...(jobCharges !== "" ? { jobCharges: Number(jobCharges) } : {}),
      });
      setMsg({
        kind: "ok",
        text: `${r.receiptNo} post ho gaya — ${r.goodQty} pcs @ Rs ${money(r.unitCost)}/pc stock mein aaye. Thekedar ko dena: Rs ${money(r.netPayable)}. Challan ab "${r.challanStatus}".`,
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
      <Section title="Thekedar se maal wapas lein" sub="Material consume, finished goods stock mein, aur thekedar ka payable — teeno ek hi document se.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
          <div>
            <label style={label}>Challan</label>
            <select style={input} value={challanId} onChange={(e) => setChallanId(e.target.value)}>
              <option value="">— chunein —</option>
              {challans.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.challanNo} · {c.workerName} · {c.finishedItemName || "?"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Good pcs mile</label>
            <input style={input} type="number" value={goodQty} onChange={(e) => setGoodQty(e.target.value)} placeholder="10000" />
          </div>
          <div>
            <label style={label}>Job charges (khali = rate × pcs)</label>
            <input style={input} type="number" step="0.01" value={jobCharges} onChange={(e) => setJobCharges(e.target.value)} placeholder={challan ? money(challan.ratePerPc * (Number(goodQty) || 0)) : ""} />
          </div>
          <div>
            <label style={label}>Freight (dono taraf)</label>
            <input style={input} type="number" step="0.01" value={freight} onChange={(e) => setFreight(e.target.value)} placeholder="1800" />
          </div>
        </div>

        {challan && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: dim, textTransform: "uppercase", marginBottom: 8 }}>
              Thekedar ke paas balance — jo wapas aaya wo likhein, baqi consume maan liya jayega
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th style={th}>Material</th>
                    <th style={{ ...th, textAlign: "right" }}>Issued</th>
                    <th style={{ ...th, textAlign: "right" }}>Balance</th>
                    <th style={{ ...th, textAlign: "right" }}>Std / pc</th>
                    <th style={{ ...th, width: 130 }}>Wapas aaya</th>
                  </tr>
                </thead>
                <tbody>
                  {challan.lines.map((l) => {
                    const balance = l.issuedQty - l.consumedQty - l.returnedQty;
                    return (
                      <tr key={l.itemId}>
                        <td style={td}>{l.itemName}</td>
                        <td style={tdNum}>
                          {qty(l.issuedQty)} {l.unit}
                        </td>
                        <td style={{ ...tdNum, color: teal }}>
                          {qty(balance)} {l.unit}
                        </td>
                        <td style={{ ...tdNum, color: dim }}>{l.standardPerPc ? qty(l.standardPerPc) : "—"}</td>
                        <td style={td}>
                          <input
                            style={{ ...input, padding: "6px 9px" }}
                            type="number"
                            step="0.001"
                            value={returns[l.itemId] || ""}
                            onChange={(e) => setReturns({ ...returns, [l.itemId]: e.target.value })}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button style={btn()} disabled={busy || !priced} onClick={submit}>
            {busy ? "Posting…" : "Receipt post karein"}
          </button>
        </div>
      </Section>

      {priced && (
        <Section title="Is receipt ki lagat" sub="Post karne se pehle — yehi asli per-pc cost hai.">
          {priced.shortages.length > 0 && (
            <div style={{ color: red, fontSize: 13, marginBottom: 12 }}>
              {priced.shortages.map((s) => `${s.itemName}: maang ${qty(s.asked)}${s.unit}, balance ${qty(s.balance)}${s.unit}`).join(" · ")}
            </div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
              <tbody>
                {[
                  ["Material consume", priced.materialCost],
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
                  <td style={{ ...td, fontWeight: 700 }}>Thekedar ko dena hai</td>
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
          Ye aap ka current asset hai, thekedar ka nahi. Balance sheet par account <b style={{ color: "#fff" }}>1204 Stock at Job Worker</b> se milna chahiye.
        </div>
      </div>

      {ledger.workers.length === 0 && (
        <div style={{ ...card, color: dim, fontSize: 13 }}>Abhi kisi thekedar ke paas maal nahi.</div>
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
