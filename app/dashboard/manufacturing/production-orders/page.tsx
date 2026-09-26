"use client";

import toast from "react-hot-toast";

import { useEffect, useMemo, useState } from "react";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  mapBomRecord, mapFinishedGoodsRecord, mapProductionOrderRecord, mapWorkOrderRecord,
  quoteProductionRun, type ProductionRunQuote,
} from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(var(--ink),0.03)";
const border = "rgba(var(--ink),0.07)";
const statusColor: Record<string, string> = { planned: "#818cf8", in_progress: "#f59e0b", running: "#f59e0b", completed: "#22c55e", cancelled: "#6b7280" };

type ProductionOrder = ReturnType<typeof mapProductionOrderRecord>;

type Labour = { id: string; name: string; code: string; ratePerUnit: number };
type LabourRow = { labourId: string; operation: string; qty: string; rate: string };

export default function ProductionOrdersPage() {
  const { isMobile } = useResponsive();
  const orderStore = useBusinessRecords("production_order");
  const bomStore = useBusinessRecords("bom");
  const goodsStore = useBusinessRecords("finished_good_batch");
  const workStore = useBusinessRecords("work_order");
  /* Every piece-rate row ever posted against a run. Each one names the job it
     was for and how many pieces it covered, which between them is the only
     record of how far each operation has got on an order. */
  const labourStore = useBusinessRecords("labour_entry");
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  // Completion dialog — priced before anything is written.
  const [runOrder, setRunOrder] = useState<ProductionOrder | null>(null);
  const [runQty, setRunQty] = useState(1);
  const [runQuote, setRunQuote] = useState<ProductionRunQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [allowShort, setAllowShort] = useState(false);
  // Who actually made this run's pieces — posts to their own payable instead
  // of the flat "Factory Labour" line the BOM estimates with.
  const [labourList, setLabourList] = useState<Labour[]>([]);
  const [labourRows, setLabourRows] = useState<LabourRow[]>([]);
  // Which warehouse the run consumes from. A run pinned to MAIN while the
  // rolls were received into SHOP reported a shortage with the material in
  // the building, so it is now picked here and priced against that store.
  const [runLocation, setRunLocation] = useState("MAIN");
  // The day the pieces were actually made — defaults to today but stays
  // editable so a run entered late still lands on the shift that made it.
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({
    product: "",
    bomId: "",
    quantity: 1,
    plannedDate: new Date().toISOString().slice(0, 10),
    assignedTo: "",
    notes: "",
    location: "MAIN",
  });

  const orders = useMemo(() => orderStore.records.map(mapProductionOrderRecord), [orderStore.records]);
  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const finishedGoods = useMemo(() => goodsStore.records.map(mapFinishedGoodsRecord), [goodsStore.records]);
  const workOrders = useMemo(() => workStore.records.map(mapWorkOrderRecord), [workStore.records]);

  /**
   * How far each job has got, per order.
   *
   * An order is not one operation. The same 10,000 bags are sealed by one
   * person and buttoned by another, and those two jobs do not keep pace — a
   * day that seals 8,000 and buttons 7,000 is an ordinary day. The order's own
   * `completed` count is the finished figure, which is the slower of them; it
   * cannot say that 1,000 bags are already sealed and only need buttons.
   *
   * Tomorrow's operator has to know that, or those 1,000 get sealed twice and
   * somebody gets paid twice for doing it once. The labour rows already record
   * it honestly — each worker was paid for the pieces they actually did — so
   * this reads them back per job rather than asking anyone to log it again.
   */
  const jobsByOrder = useMemo(() => {
    const byOrder = new Map<string, Map<string, number>>();
    for (const record of labourStore.records) {
      const orderKey = record.refId || "";
      if (!orderKey) continue;
      const data = record.data as { operation?: unknown; qty?: unknown };
      const qty = Number(data?.qty) || 0;
      if (qty <= 0) continue;
      const job = String(data?.operation || "").trim() || "Unnamed job";
      const jobs = byOrder.get(orderKey) ?? new Map<string, number>();
      // Several people on one job add up: three cutters doing 3,000 each have
      // cut 9,000 pieces between them.
      jobs.set(job, (jobs.get(job) || 0) + qty);
      byOrder.set(orderKey, jobs);
    }
    return byOrder;
  }, [labourStore.records]);

  useEffect(() => {
    fetch("/api/manufacturing/labour", { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => setLabourList(Array.isArray(list) ? list : []))
      .catch(() => setLabourList([]));
  }, []);

  const labourTotal = useMemo(
    () => labourRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0),
    [labourRows],
  );

  /**
   * The dialog asks for two different quantities and they are easy to confuse:
   * "Units finished in this run" is what the order gets credited with, while a
   * worker row is only the pieces that worker was paid for. Entering the day's
   * output against one worker and leaving the run at the order's full remainder
   * books the whole order as made while paying for part of it — the order
   * closes and the unmade pieces are never produced again. So the pieces have
   * to add up to the run.
   *
   * They add up *per job*, not across the whole list. The same bags pass
   * through several hands on the way out — cut and sealed by two people, then
   * buttoned by two more, then cleaned and packed — and every one of those
   * hands is paid for all 10,000 pieces. Summing every row against the run was
   * why that could not be recorded: four rows of 5,000 on a 10,000 run read as
   * 20,000 and locked the button, which pushed the whole trade into inventing a
   * half-finished item and a second production order for what is one order and
   * one product. Each job is checked on its own now; rows with no job named are
   * one group between them, which is exactly the old behaviour.
   */
  const labourPieces = useMemo(() => {
    const rows = labourRows.filter((r) => r.labourId && Number(r.qty) > 0);
    if (!rows.length) return null;
    const byOperation = new Map<string, number>();
    for (const row of rows) {
      const key = row.operation.trim() || "Labour";
      byOperation.set(key, (byOperation.get(key) || 0) + Number(row.qty));
    }
    const groups = Array.from(byOperation, ([operation, total]) => ({ operation, total }));
    return {
      groups,
      over: groups.filter((g) => g.total > runQty),
      under: groups.filter((g) => g.total < runQty),
      /** Only one job on this run — the "set the run to what was made" shortcut still makes sense. */
      soleTotal: groups.length === 1 ? groups[0].total : null,
      /**
       * Rows with a worker and pieces but no job typed.
       *
       * Two of them fall into the same group and are added together, which
       * reads as one job paid twice over. That is how a sealer on 2,000 and a
       * button hand on 3,000 came out as "5,000 pieces" against a run of
       * 3,000: the screen could not tell they were different jobs, because
       * nobody had said so.
       *
       * It looks like it has been said — the workers are called "Ahmad sealer"
       * and "Ali Button" — but a worker's name is who they are, not what this
       * row is for. The same person does a different job tomorrow.
       */
      unnamed: rows.filter((r) => !r.operation.trim()).length,
    };
  }, [labourRows, runQty]);

  /* Ambiguous rather than wrong, and blocked for that reason: two blank job
     names could be one job split between two people, or two jobs on the same
     pieces, and those need completely different totals. The screen cannot
     guess, and guessing wrong either double-pays a job or closes an order
     that was never made. One word in the box settles it. */
  const jobNamesMissing = (labourPieces?.unnamed ?? 0) > 1;

  /**
   * A job's pieces no longer have to equal the run.
   *
   * That rule was written for an order made start to finish in one go, and it
   * is wrong for every other kind. Jobs run at different speeds and carry over
   * between days, which is the whole point of part-made stock:
   *
   *   under the run — sealing 2,000 on a run that finishes 3,000 is right when
   *     1,000 of today's pieces were sealed in an earlier run and only needed
   *     buttons today. They keep the work already done on them.
   *
   *   over the run — sealing 8,000 on a run that finishes 3,000 is right too.
   *     The extra 5,000 are sealed and waiting for the next job.
   *
   * Both were blocked, so the one pattern this screen exists to handle could
   * not be entered at all. They are now said out loud and left to the operator,
   * who can see the floor and knows which of the two it is. The danger the
   * block was there for — the day's output typed against a worker while the
   * run is left at the order's whole balance — is still called out, in the
   * warning below, naming the consequence.
   */
  const labourBlocked = jobNamesMissing;

  /**
   * The jobs this company has actually paid for before, offered as you type.
   * Every trade names its own steps, so nothing is hardcoded — the list builds
   * itself out of the runs already completed.
   */
  const operationSuggestions = useMemo(() => {
    const seen = new Set<string>();
    for (const record of orderStore.records) {
      const last = (record.data as { lastRunLabour?: { operation?: unknown }[] } | undefined)?.lastRunLabour;
      if (!Array.isArray(last)) continue;
      for (const assignment of last) {
        const operation = String(assignment?.operation || "").trim();
        if (operation) seen.add(operation);
      }
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [orderStore.records]);

  function addLabourRow() {
    setLabourRows((rows) => [...rows, { labourId: "", operation: "", qty: "", rate: "" }]);
  }

  function setLabourRow(index: number, patch: Partial<LabourRow>) {
    setLabourRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeLabourRow(index: number) {
    setLabourRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function save() {
    if (!form.product.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!form.bomId) {
      setFormError("Linked BOM is required.");
      return;
    }
    if (form.quantity <= 0) {
      setFormError("Quantity must be greater than zero.");
      return;
    }
    if (!form.plannedDate) {
      setFormError("Planned date is required.");
      return;
    }
    setFormError("");
    const selectedBom = boms.find((item) => item.id === form.bomId) || boms.find((item) => item.product === form.product);
    await orderStore.create({
      title: form.product,
      status: "planned",
      date: form.plannedDate,
      data: {
        orderId: `PO-${String(orders.length + 1).padStart(4, "0")}`,
        quantity: form.quantity,
        completed: 0,
        assignedTo: form.assignedTo,
        notes: form.notes,
        bomId: selectedBom?.id || "",
        bomVersion: selectedBom?.version || "",
        location: form.location,
      },
    });
    setShowModal(false);
    setForm({
      product: "",
      bomId: "",
      quantity: 1,
      plannedDate: new Date().toISOString().slice(0, 10),
      assignedTo: "",
      notes: "",
      location: "MAIN",
    });
    setFormError("");
  }

  async function startOrder(orderId: string) {
    await orderStore.update(orderId, { status: "in_progress" });
  }

  /**
   * Completing an order used to just flip a status and write a finished-goods
   * row — no material left stock and nothing reached the ledger. Now it opens a
   * costed preview first; the server does the consuming and posting.
   */
  async function openCompleteDialog(order: ProductionOrder) {
    const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
    if (linkedWorkOrders.some((item) => item.status !== "completed")) {
      toast("Complete linked work orders before finishing this production order.");
      return;
    }
    const remaining = Math.max(order.quantity - order.completed, 1);
    setRunOrder(order);
    setRunQty(remaining);
    setRunDate(new Date().toISOString().slice(0, 10));
    setRunError("");
    setRunQuote(null);
    setLabourRows([]);
    setQuoting(true);
    // Let the server pick the warehouse first — it knows the one the order
    // was raised against, which is the one the operator meant.
    const quote = await quoteProductionRun(order.id, remaining);
    setQuoting(false);
    if (!quote) { setRunError("Could not reach the server."); return; }
    if (quote.error) { setRunError(quote.error); return; }
    setRunLocation(quote.location || "MAIN");
    setRunQuote(quote);
  }

  async function requote(qty: number, location = runLocation) {
    if (!runOrder || qty <= 0) return;
    setQuoting(true);
    const quote = await quoteProductionRun(runOrder.id, qty, location);
    setQuoting(false);
    if (quote && !quote.error) setRunQuote(quote);
  }

  async function confirmRun() {
    if (!runOrder) return;
    setRunning(true);
    setRunError("");
    try {
      const labourAssignments = labourRows
        .filter((r) => r.labourId && Number(r.qty) > 0 && Number(r.rate) >= 0)
        .map((r) => ({ labourId: r.labourId, qty: Number(r.qty), rate: Number(r.rate), operation: r.operation.trim() }));
      const res = await fetch("/api/manufacturing/production-orders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionOrderId: runOrder.id,
          producedQty: runQty,
          allowNegativeStock: allowShort,
          location: runLocation,
          date: runDate,
          ...(labourAssignments.length ? { labourAssignments } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not complete the run.");
      toast.success(
        `${body.producedQty} units received · batch ${body.batchNo} · Rs. ${Math.round(body.totalCost).toLocaleString()} to Finished Goods`,
      );
      // The part-roll that survived is the whole point of the change — say so,
      // or the operator will still think it was thrown away.
      const kept = (body.remnantsCreated ?? []) as { itemName: string; qty: number; unit: string }[];
      if (kept.length) {
        toast(
          `Kept as open stock: ${kept.map((r) => `${Number(r.qty).toFixed(2)}${r.unit} ${r.itemName}`).join(", ")}`,
          { icon: "♻️" },
        );
      }
      setRunOrder(null);
      setRunQuote(null);
      await Promise.all([orderStore.refetch?.(), goodsStore.refetch?.()]);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Could not complete the run.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "var(--ink-solid, #fff)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Production Orders</h1>
          <p style={{ fontSize: 13, color: "rgba(var(--ink),.42)", margin: 0 }}>Issue shop-floor production based on BOMs and push completed orders into finished goods.</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New Order
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Orders", value: orders.length, color: "var(--tx-f97316, #f97316)" },
          { label: "Planned", value: orders.filter((item) => item.status === "planned").length, color: "var(--tx-818cf8, #818cf8)" },
          { label: "In Progress", value: orders.filter((item) => item.status === "in_progress" || item.status === "running").length, color: "var(--tx-f59e0b, #f59e0b)" },
          { label: "Completed To FG", value: orders.filter((item) => item.status === "completed").length, color: "var(--tx-22c55e, #22c55e)" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(var(--ink),.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((order) => {
          const linkedBom = boms.find((item) => item.id === order.bomId) || boms.find((item) => item.product === order.product);
          const progress = order.quantity > 0 ? Math.round((order.completed / order.quantity) * 100) : 0;
          // What is still owed on the order. The bar alone is easy to misread at
          // a glance; the count says plainly that the order is not finished.
          const remaining = Math.max(order.quantity - order.completed, 0);
          const fgCreated = finishedGoods.some((item) => item.productionOrderId === order.orderId);
          const linkedWorkOrders = workOrders.filter((item) => item.linkedProductionOrderId === order.orderId);
          const incompleteWorkOrders = linkedWorkOrders.filter((item) => item.status !== "completed").length;
          // Slowest job first: the one holding the order up is the one to read.
          const jobs = [...(jobsByOrder.get(order.id) ?? new Map<string, number>())].sort((a, b) => a[1] - b[1]);
          // Jobs the order still owes pieces on. While any of these exist the
          // run posting deliberately leaves the order open, whatever the
          // finished count says.
          const jobsBehind = jobs.filter(([, qty]) => qty < order.quantity);
          return (
            <div key={order.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{order.product}</div>
                  <div style={{ fontSize: 12, color: "rgba(var(--ink),.42)", marginTop: 4 }}>
                    {order.orderId} • BOM {linkedBom?.version || order.bomVersion || "Not linked"} • Qty {order.completed.toLocaleString()}/{order.quantity.toLocaleString()}
                    {remaining > 0 && order.status !== "cancelled" && (
                      <span style={{ color: "var(--tx-fbbf24, #fbbf24)", fontWeight: 700 }}> • {remaining.toLocaleString()} left to make</span>
                    )}
                    {/* The count is met and the order is still open, which
                        looks stuck until it says why: a job has not been done
                        on every piece yet, so the order is held to carry it. */}
                    {remaining === 0 && jobsBehind.length > 0 && order.status !== "cancelled" && (
                      <span style={{ color: "var(--tx-fbbf24, #fbbf24)", fontWeight: 700 }}>
                        {" "}• all {order.quantity.toLocaleString()} made, but{" "}
                        {jobsBehind.map((j) => `${j[0]} is short ${(order.quantity - j[1]).toLocaleString()}`).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: statusColor[order.status] || "var(--tx-94a3b8, #94a3b8)" }}>{order.status.replace("_", " ").toUpperCase()}</div>
              </div>
              <div style={{ fontSize: 12, color: "rgba(var(--ink),.5)", marginBottom: 10 }}>
                Due {order.plannedDate || "Not set"} • Assigned {order.assignedTo || "Unassigned"} • {fgCreated ? "Finished goods batch created" : "FG pending"} • Work orders open {incompleteWorkOrders}
              </div>

              {/* Where each job has got to, which the finished count cannot
                  say. A job standing ahead of the finished figure is pieces
                  already part-made: they do not need that job doing again, and
                  nobody should be paid for it twice. */}
              {jobs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px", marginBottom: 12 }}>
                  {jobs.map(([job, qty]) => {
                    const ahead = qty - order.completed;
                    return (
                      <span
                        key={job}
                        title={ahead > 0
                          ? `${ahead.toLocaleString()} pieces have had ${job} done but are not finished yet — they do not need it again`
                          : `${job} has kept up with the finished count`}
                        style={{
                          display: "inline-flex", alignItems: "baseline", gap: 6,
                          padding: "4px 10px", borderRadius: 999, fontSize: 11.5,
                          background: ahead > 0 ? "rgba(56,189,248,.1)" : "rgba(var(--ink),.04)",
                          border: `1px solid ${ahead > 0 ? "rgba(56,189,248,.28)" : border}`,
                          color: "rgba(var(--ink),.65)",
                        }}
                      >
                        {job}
                        <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink-solid, #fff)" }}>
                          {qty.toLocaleString()}/{order.quantity.toLocaleString()}
                        </span>
                        {ahead > 0 && (
                          <span style={{ color: "var(--tx-7dd3fc, #7dd3fc)", fontWeight: 700 }}>+{ahead.toLocaleString()} part-made</span>
                        )}
                        {/* Behind the order, not merely behind the finished
                            count: these are pieces the order still owes this
                            job, and the reason it has not closed. */}
                        {qty < order.quantity && (
                          <span style={{ color: "var(--tx-fbbf24, #fbbf24)", fontWeight: 700 }}>
                            {(order.quantity - qty).toLocaleString()} still to do
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
              <div style={{ background: "rgba(var(--ink),.08)", height: 6, borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${progress}%`, height: "100%", background: statusColor[order.status] || "#94a3b8" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {order.status === "planned" && (
                  <button onClick={() => startOrder(order.id)} style={{ padding: "7px 14px", background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Start
                  </button>
                )}
                {(order.status === "in_progress" || order.status === "running") && (
                  <button onClick={() => openCompleteDialog(order)} style={{ padding: "7px 14px", background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)", color: "#22c55e", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {/* Not "Run remaining 41,000" any more. On an order that
                        takes a week that reads as an instruction to make the
                        whole balance in one go, which is the opposite of what
                        the dialog behind it is for. The balance is already on
                        the line above; this button only has to open the day's
                        entry. */}
                    {order.completed > 0 && remaining > 0
                      ? "Record today's production →"
                      : "Record production →"}
                  </button>
                )}
                {order.status !== "completed" && order.status !== "cancelled" && (
                  <button onClick={() => orderStore.update(order.id, { status: "cancelled" })} style={{ padding: "7px 14px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.25)", color: "var(--tx-ef4444, #ef4444)", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!orderStore.loading && orders.length === 0 && (
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(var(--ink),.28)" }}>
            No production orders yet.
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 540, fontFamily: ff }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>New Production Order</h2>
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Product</label>
                <input list="manufacturing-boms" value={form.product} onChange={(e) => setForm((current) => ({ ...current, product: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
                <datalist id="manufacturing-boms">
                  {boms.map((item) => <option key={item.id} value={item.product} />)}
                </datalist>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Linked BOM</label>
                <select value={form.bomId} onChange={(e) => {
                  const selectedBom = boms.find((item) => item.id === e.target.value);
                  setForm((current) => ({ ...current, bomId: e.target.value, product: selectedBom?.product || current.product }));
                }} style={{ width: "100%", background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "var(--ink-solid, #fff)" }}>
                  <option value="">Select BOM</option>
                  {boms.map((item) => <option key={item.id} value={item.id}>{item.product} • {item.version}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={(e) => setForm((current) => ({ ...current, quantity: Number(e.target.value) }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Planned Date</label>
                <input type="date" value={form.plannedDate} onChange={(e) => setForm((current) => ({ ...current, plannedDate: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Consume from</label>
                <select value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} style={{ width: "100%", background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "var(--ink-solid, #fff)" }}>
                  <option value="MAIN">Main</option>
                  <option value="SHOP">Shop</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Assigned To</label>
                <input value={form.assignedTo} onChange={(e) => setForm((current) => ({ ...current, assignedTo: e.target.value }))} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box" }} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} rows={4} style={{ width: "100%", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box", resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} style={{ flex: 1, padding: "11px 0", background: "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create Order</button>
              <button onClick={() => setShowModal(false)} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(var(--ink),.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Record production ──
          Shows exactly what will leave stock, what it costs and where the money
          lands, before anything is written. */}
      {runOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 16, padding: 28, width: 620, maxHeight: "90vh", overflowY: "auto", fontFamily: ff }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Record production</h2>
            <div style={{ fontSize: 12.5, color: "rgba(var(--ink),.42)", marginBottom: 18 }}>
              {runOrder.orderId} · {runOrder.product} · {runOrder.completed}/{runOrder.quantity} done
            </div>

            {runError && (
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>{runError}</div>
            )}

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                {/* Named the same thing the Make dialog names it. It is the
                    same question — how many came off the floor today — and
                    calling it "Units finished in this run" on one screen and
                    "Finished today" on the other read as two different
                    mechanisms, which is why an order spread over a week looked
                    like something the system could not do. */}
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Finished today</label>
                <input
                  type="number" min={1} value={runQty}
                  onChange={(e) => setRunQty(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={(e) => requote(Math.max(1, Number(e.target.value) || 1))}
                  // The box opens on the whole balance, which is right on the
                  // last day and wrong on every other one. Selecting it means
                  // the real figure is typed over the top in one go, instead of
                  // backspacing five digits every morning for a week.
                  onFocus={(e) => e.currentTarget.select()}
                  style={{ width: 180, height: 38, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#fff", boxSizing: "border-box" }}
                />
                {/* Say what happens to the rest, so a short day is not typed in
                    as a full one — and say it in a way that covers an order
                    running for a week, not just one that slips a day. */}
                <div style={{ fontSize: 11, color: "rgba(var(--ink),.35)", marginTop: 6, width: 180, lineHeight: 1.6 }}>
                  {runOrder.completed > 0
                    ? `${runOrder.completed.toLocaleString()} done, ${Math.max(runOrder.quantity - runOrder.completed, 0).toLocaleString()} left of ${runOrder.quantity.toLocaleString()}.`
                    : `Order is for ${runOrder.quantity.toLocaleString()}.`}{" "}
                  Enter only what was finished today. The rest stays on this
                  order and you come back to it tomorrow — as many days as it
                  takes.
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Consume from</label>
                <select
                  value={runLocation}
                  onChange={(e) => { setRunLocation(e.target.value); requote(runQty, e.target.value); }}
                  style={{ width: 180, height: 38, background: "var(--dk-161b27, #161b27)", border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "var(--ink-solid, #fff)", boxSizing: "border-box" }}
                >
                  {[...new Set([runLocation, ...(runQuote?.availableLocations ?? [])])].map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(var(--ink),.45)", marginBottom: 6 }}>Production date</label>
                <input
                  type="date" value={runDate}
                  onChange={(e) => setRunDate(e.target.value)}
                  style={{ width: 180, height: 38, background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#fff", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {quoting && <div style={{ fontSize: 13, color: "rgba(var(--ink),.4)", padding: "12px 0" }}>Costing this run…</div>}

            {runQuote && !quoting && (
              <>
                <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(var(--ink),.03)" }}>
                        {["Material", "Needs", "Open stock", "Off the rack", "Cost"].map((h, i) => (
                          <th key={h} style={{ padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "rgba(var(--ink),.4)", textTransform: "uppercase", letterSpacing: ".05em", textAlign: i === 0 ? "left" : "right" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runQuote.lines.map((line) => {
                        const short = line.availableQty < line.requiredQty;
                        return (
                          <tr key={line.itemId} style={{ borderTop: `1px solid ${border}` }}>
                            <td style={{ padding: "10px 14px", fontSize: 12.5 }}>
                              {line.itemName}
                              {line.leftoverQty > 0 && (
                                <div style={{ fontSize: 11, color: "var(--tx-34d399, #34d399)", marginTop: 3 }}>
                                  {line.leftoverQty.toFixed(2)}{line.unit} stays as open stock
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: "rgba(var(--ink),.62)" }}>{line.exactQty.toFixed(2)}{line.unit}</td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: line.fromRemnantQty > 0 ? "var(--tx-34d399, #34d399)" : "rgba(var(--ink),.25)" }}>
                              {line.fromRemnantQty > 0 ? `${line.fromRemnantQty.toFixed(2)}${line.unit}` : "—"}
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", fontWeight: 700 }}>
                              {line.requiredQty}{line.unit}
                              <div style={{ fontSize: 11, fontWeight: 400, color: short ? "var(--tx-fca5a5, #fca5a5)" : "rgba(var(--ink),.35)", marginTop: 3 }}>
                                have {line.availableQty}{line.unit}
                              </div>
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 12.5, textAlign: "right", color: "rgba(var(--ink),.62)" }}>Rs. {Math.round(line.lineCost).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {runQuote.shortages.length > 0 && (
                  <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.26)" }}>
                    <div style={{ fontSize: 12.5, color: "var(--tx-fca5a5, #fca5a5)", fontWeight: 700, marginBottom: 6 }}>Not enough material in {runLocation} for {runQuote.shortages.length} item(s)</div>
                    {runQuote.shortages.some((l) => (l.elsewhere?.length ?? 0) > 0) && (
                      <div style={{ fontSize: 12, color: "rgba(var(--ink),.6)", marginBottom: 8, lineHeight: 1.7 }}>
                        {runQuote.shortages.filter((l) => (l.elsewhere?.length ?? 0) > 0).map((l) => (
                          <div key={l.itemId}>
                            {l.itemName} is in{" "}
                            {l.elsewhere!.map((e) => `${e.location} (${e.qty}${l.unit})`).join(", ")}
                            {" "}— switch “Consume from” instead of producing short.
                          </div>
                        ))}
                      </div>
                    )}
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(var(--ink),.55)", cursor: "pointer" }}>
                      <input type="checkbox" checked={allowShort} onChange={(e) => setAllowShort(e.target.checked)} />
                      Produce anyway — stock will go negative until the purchase is entered
                    </label>
                  </div>
                )}

                <div style={{ border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Labour for this run</span>
                    {labourTotal > 0 && (
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--tx-22c55e, #22c55e)" }}>Rs. {Math.round(labourTotal).toLocaleString()}</span>
                    )}
                  </div>
                  {!labourList.length && (
                    <div style={{ fontSize: 12, color: "rgba(var(--ink),.35)", marginBottom: 8 }}>
                      No labour added yet — add one on the <a href="/dashboard/manufacturing/labour" style={{ color: "var(--tx-fb923c, #fb923c)", fontWeight: 700 }}>Labour</a> page.
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {labourRows.map((row, index) => (
                      <div key={index} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 84px 92px 28px", gap: 8, alignItems: "center" }}>
                        <select
                          value={row.labourId}
                          onChange={(e) => {
                            const picked = labourList.find((l) => l.id === e.target.value);
                            setLabourRow(index, { labourId: e.target.value, rate: picked ? String(picked.ratePerUnit) : row.rate });
                          }}
                          style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12.5 }}
                        >
                          <option value="">— Worker —</option>
                          {labourList.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        {/* Marked red when it is the empty box that is holding
                            the run up. The message below says what is wrong;
                            this says which box to type in. */}
                        <input
                          list="production-operations"
                          placeholder="Job — e.g. Button"
                          value={row.operation}
                          onChange={(e) => setLabourRow(index, { operation: e.target.value })}
                          style={{
                            background: bg, borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12.5,
                            border: `1px solid ${jobNamesMissing && row.labourId && !row.operation.trim() ? "rgba(239,68,68,.55)" : border}`,
                          }}
                        />
                        <input type="number" min={0} step="any" placeholder="Pcs" value={row.qty} onChange={(e) => setLabourRow(index, { qty: e.target.value })} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12.5 }} />
                        {/* Rate is the last thing typed on a row, so Enter here
                            means "done, next worker". It used to mean "delete
                            this row": the next thing in the tab order was the
                            × button, and Enter on a focused button presses it.
                            A keystroke that finishes a row should not be one
                            keystroke away from destroying it. */}
                        <input
                          type="number" min={0} step="any" placeholder="Rate/pc" value={row.rate}
                          onChange={(e) => setLabourRow(index, { rate: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" || e.shiftKey) return;
                            e.preventDefault();
                            document.getElementById("po-add-worker")?.focus();
                          }}
                          style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12.5 }}
                        />
                        {/* Out of the tab order entirely. Deleting a row is a
                            decision, taken with a deliberate click; it has no
                            business being somewhere the keyboard lands on the
                            way past. */}
                        <button onClick={() => removeLabourRow(index)} tabIndex={-1} title="Remove" style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(var(--ink),.45)", cursor: "pointer", padding: "7px 0", gridColumn: isMobile ? "1 / -1" : "auto" }}>×</button>
                      </div>
                    ))}
                  </div>
                  <datalist id="production-operations">
                    {operationSuggestions.map((operation) => <option key={operation} value={operation} />)}
                  </datalist>
                  <button id="po-add-worker" onClick={addLabourRow} style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(var(--ink),.05)", border: `1px solid ${border}`, color: "rgba(var(--ink),.65)", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                    + Add worker
                  </button>
                  <div style={{ fontSize: 11, color: "rgba(var(--ink),.32)", marginTop: 8, lineHeight: 1.7 }}>
                    Assigning workers here charges what&apos;s actually owed to each of them instead of the BOM&apos;s flat labour estimate below.
                    Name the job each row is for — cutting, button, packing. With more than one worker it is required, because
                    rows with no job named are counted as one job. Jobs need not match each other or the run: one can run ahead
                    and leave pieces part-made for the next run, and one can run behind because its pieces were done in an
                    earlier one. Each worker is paid for the pieces on their own row.
                  </div>
                </div>

                {/* Said before the arithmetic message, because when the job
                    names are missing the arithmetic message is misleading: it
                    reports a 5,000 that nobody entered and asks for it to be
                    lowered, when the rows were right all along and only the
                    job names were missing. */}
                {jobNamesMissing && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, color: "var(--tx-fca5a5, #fca5a5)", fontWeight: 700, marginBottom: 5 }}>
                      Name the job on each row — the boxes marked in red
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(var(--ink),.5)", lineHeight: 1.7 }}>
                      Rows with no job named are counted as one job and added together, so their pieces come
                      out as {(labourPieces?.groups.find((g) => g.operation === "Labour")?.total ?? 0).toLocaleString()} instead
                      of standing on their own. The worker&apos;s name does not settle it — the same person does a
                      different job tomorrow. Type what this row is for: sealing, button, packing.
                    </div>
                  </div>
                )}

                {/* A job's pieces disagree with the run — say so before the order closes. */}
                {/* A job behind the run. Normal when those pieces had that job
                    done in an earlier run — and the one real danger on this
                    screen when they did not, so the consequence is named
                    rather than the entry refused. */}
                {!jobNamesMissing && labourPieces && labourPieces.under.length > 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.3)", marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, color: "var(--tx-fbbf24, #fbbf24)", fontWeight: 700, marginBottom: 5 }}>
                      This run finishes {runQty.toLocaleString()} pieces, but {labourPieces.under.map((g) => `${g.operation} is paid for ${g.total.toLocaleString()}`).join("; ")}
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(var(--ink),.5)", lineHeight: 1.7 }}>
                      That is right if the rest of today&apos;s pieces already had that job done in an earlier run —
                      they keep the work done on them and only needed finishing.
                      {" "}If they did not, {runQty.toLocaleString()} is more than was really made: it goes into finished
                      goods and is charged to this order
                      {runOrder.quantity > 0 && runQty >= runOrder.quantity - runOrder.completed
                        ? ", which closes it — the balance could never be produced against it again"
                        : ""}.
                      {" "}Add the workers who did the rest of that job, or lower the run.
                    </div>
                    {labourPieces.soleTotal != null && (
                      <button
                        onClick={() => { setRunQty(labourPieces.soleTotal as number); requote(labourPieces.soleTotal as number); }}
                        style={{ marginTop: 9, padding: "6px 12px", borderRadius: 8, background: "rgba(251,191,36,.16)", border: "1px solid rgba(251,191,36,.4)", color: "#fcd34d", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
                      >
                        Set run to {labourPieces.soleTotal.toLocaleString()}
                      </button>
                    )}
                  </div>
                )}

                {/* A job ahead of the run — pieces worked on today that finish
                    later. Not a problem at all: this is part-made stock, and
                    saying so is the whole reason the operator can trust the
                    difference is not lost. */}
                {!jobNamesMissing && labourPieces && labourPieces.over.length > 0 && (
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(56,189,248,.08)", border: "1px solid rgba(56,189,248,.25)", marginBottom: 14, fontSize: 12, color: "rgba(var(--ink),.6)", lineHeight: 1.7 }}>
                    {labourPieces.over.map((g) => `${g.operation} is paid for ${g.total.toLocaleString()} but only ${runQty.toLocaleString()} finish today, so ${(g.total - runQty).toLocaleString()} stay part-made`).join("; ")}.
                    {" "}They keep the work done on them and finish in a later run — nothing is lost and nobody is paid twice.
                  </div>
                )}

                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.22)", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, color: "rgba(var(--ink),.5)" }}>Total cost of this run</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "var(--tx-22c55e, #22c55e)" }}>Rs. {Math.round(labourRows.length ? runQuote.totalCost - runQuote.labourCost + labourTotal : runQuote.totalCost).toLocaleString()}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(var(--ink),.42)" }}>
                    <span>Material</span><span>Rs. {Math.round(runQuote.materialCost).toLocaleString()}</span>
                  </div>
                  {runQuote.labourCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(var(--ink),.42)" }}>
                      <span>Labour {labourRows.length ? "(assigned above)" : "(BOM estimate)"}</span>
                      <span>Rs. {Math.round(labourRows.length ? labourTotal : runQuote.labourCost).toLocaleString()}</span>
                    </div>
                  )}
                  {runQuote.overheadCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(var(--ink),.42)" }}>
                      <span>Overhead</span><span>Rs. {Math.round(runQuote.overheadCost).toLocaleString()}</span>
                    </div>
                  )}
                  {runQuote.remnantUsedCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--tx-34d399, #34d399)" }}>
                      <span>…of which from open stock</span><span>Rs. {Math.round(runQuote.remnantUsedCost).toLocaleString()}</span>
                    </div>
                  )}
                  {runQuote.remnantCreatedCost > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--tx-34d399, #34d399)" }}>
                      <span>Kept back as open stock</span><span>Rs. {Math.round(runQuote.remnantCreatedCost).toLocaleString()}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(var(--ink),.55)", fontWeight: 700, marginTop: 6 }}>
                    <span>Per unit</span><span>Rs. {runQuote.unitCost.toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: "rgba(var(--ink),.35)", lineHeight: 1.7, marginBottom: 16 }}>
                  Dr Work In Progress → Cr Stock/Inventory, then Dr Finished Goods → Cr Work In Progress.
                  Whole units leave {runLocation}; anything left of the last one moves to Material Remnants
                  instead of being charged to this batch. {runQty} × {runOrder.product} arrives at cost.
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={confirmRun}
                disabled={running || quoting || !runQuote || labourBlocked || (runQuote.shortages.length > 0 && !allowShort)}
                style={{
                  flex: 1, padding: "11px 0", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700,
                  background: running || !runQuote || labourBlocked || (runQuote.shortages.length > 0 && !allowShort) ? "rgba(34,197,94,.35)" : "#22c55e",
                  cursor: running || !runQuote ? "not-allowed" : "pointer",
                }}
              >
                {running ? "Recording…" : "Confirm production"}
              </button>
              <button onClick={() => { setRunOrder(null); setRunQuote(null); setAllowShort(false); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(var(--ink),.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
