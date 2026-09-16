"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useBusinessRecords } from "@/lib/useBusinessRecords";
import {
  formatRate,
  mapBomRecord,
  mapProductionOrderRecord,
  loadManufacturingItems,
  type ManufacturingBom,
  type ManufacturingItem,
  type BomLineInput,
  type ProductionRunQuote,
  quoteBomRun,
} from "../_shared";
import { useResponsive } from "@/hooks/useResponsive";
import toast from "react-hot-toast";

const ff = "'Outfit','Inter',sans-serif";
const bg = "rgba(255,255,255,0.03)";
const border = "rgba(255,255,255,0.07)";

const inputStyle: React.CSSProperties = {
  width: "100%", background: bg, border: `1px solid ${border}`,
  borderRadius: 8, padding: "9px 12px", color: "#fff", boxSizing: "border-box",
};

const qtyLabel: React.CSSProperties = {
  display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6,
};
const qtyInput: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 9,
  background: "rgba(255,255,255,.05)", border: `1px solid ${border}`,
  color: "#fff", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box",
};

type LabourRow = { labourId: string; operation: string; qty: string; rate: string };

type LineDraft = {
  itemId: string;
  qty: string;
  /**
   * Roll, sheet, fabric — material where the unused part of the last unit is
   * still material. A run needing 12.66 rolls takes 13 off the rack and the
   * balance is held as an open piece for the next order, instead of being
   * buried in the cost of this batch. Off for anything discrete: two thirds
   * of a screw is scrap, not stock.
   */
  divisible: boolean;
  /**
   * What the costing formula expected on this line — "Buttons required —
   * 1,580 pcs". Only the quantity crosses over; which item of your own stock
   * that is, the formula has no way of knowing, so the note stands beside the
   * picker until somebody chooses.
   */
  note?: string;
};

function BOMPageInner() {
  const { isMobile } = useResponsive();
  const params = useSearchParams();
  const bomStore = useBusinessRecords("bom");
  const productionStore = useBusinessRecords("production_order");

  const [rawMaterials, setRawMaterials] = useState<ManufacturingItem[]>([]);
  const [finishedItems, setFinishedItems] = useState<ManufacturingItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ finishedItemId: "", version: "v1.0", yieldUnits: 1, labourPerBatch: 0, overheadPerBatch: 0 });
  const [lines, setLines] = useState<LineDraft[]>([{ itemId: "", qty: "", divisible: false }]);
  /** The BOM being edited, or "" while a new one is being drafted. */
  const [editingId, setEditingId] = useState("");
  /**
   * Set when this draft arrived from the Costing page's "Create BOM" button —
   * carries the units/labour it already worked out, and gets stamped onto the
   * saved BOM so a batch cost can be traced back to the formula run. Cleared
   * by resetForm()/startEdit() so it never leaks onto an unrelated BOM.
   */
  const [formulaMeta, setFormulaMeta] = useState<{ id: string; name: string; version: number } | null>(null);
  /* The formula's non-labour charge — buttons, tape, a bought-in part — is
     deliberately not held in state any more. It was only ever here to be
     announced in a banner, and it arrives as a seeded material line below
     regardless. It is still never written into Overhead: Overhead per batch
     stays a manual field the operator types themselves. */

  // Deep-linked from Costing → "Create BOM →". The formula already knows the
  // units per batch and the conversion cost; only the finished product and
  // the materials it consumes are still the operator's to pick, because the
  // formula has no idea which real inventory items they map to.
  useEffect(() => {
    const formulaId = params.get("formulaId");
    if (!formulaId) return;
    const yieldUnits = Number(params.get("yieldUnits"));
    const labourPerBatch = Number(params.get("labourPerBatch"));
    setForm((c) => ({
      ...c,
      version: params.get("version") || c.version,
      yieldUnits: Number.isFinite(yieldUnits) && yieldUnits > 0 ? yieldUnits : c.yieldUnits,
      labourPerBatch: Number.isFinite(labourPerBatch) && labourPerBatch >= 0 ? labourPerBatch : c.labourPerBatch,
      // Overhead per batch is left untouched here — it stays whatever the
      // operator types, never auto-filled from the formula.
    }));

    /* A line per consumable the formula named, quantity already worked out for
       one batch. Read defensively — a query string is the one input here
       nobody validates on the way in, and a malformed one should seed no lines
       rather than a line with NaN in the quantity box. */
    try {
      const raw = JSON.parse(params.get("consumables") || "[]");
      const seeded: LineDraft[] = (Array.isArray(raw) ? raw : []).flatMap((c) => {
        const perBatch = Number(c?.perBatch);
        if (!Number.isFinite(perBatch) || perBatch <= 0) return [];
        const label = String(c?.label || "Material");
        const unit = c?.unit ? ` ${String(c.unit)}` : "";
        return [{
          itemId: "",
          qty: String(perBatch),
          // Buttons and the like are discrete; a roll is not, and neither is
          // set here on the formula's word — see `divisible`.
          divisible: false,
          note: `${label} — ${perBatch.toLocaleString()}${unit} per batch`,
        }];
      });
      if (seeded.length) setLines((prev) => [...prev, ...seeded]);
    } catch { /* nothing seeded */ }
    setFormulaMeta({
      id: formulaId,
      name: params.get("formulaName") || "",
      version: Number(params.get("formulaVersion")) || 1,
    });
    setShowModal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boms = useMemo(() => bomStore.records.map(mapBomRecord), [bomStore.records]);
  const orders = useMemo(() => productionStore.records.map(mapProductionOrderRecord), [productionStore.records]);
  const itemsById = useMemo(
    () => new Map([...rawMaterials, ...finishedItems].map((i) => [i.id, i])),
    [rawMaterials, finishedItems],
  );

  /* Materials at or below their reorder level. The same flag the stock panel
     and the material chips already colour red with — counted once at the top
     so the answer is visible before anybody scrolls looking for red. */
  const lowMaterials = useMemo(
    () => rawMaterials.filter((m) => m.isLow).length,
    [rawMaterials],
  );

  useEffect(() => {
    // Trading goods too: a button, a zip, a bought-in fitting is consumed by a
    // batch exactly like raw material, and stocking it as a trading good is the
    // normal way to file a part you buy finished.
    loadManufacturingItems(["RAW_MATERIAL", "TRADING"]).then(setRawMaterials);
    loadManufacturingItems("FINISHED").then(setFinishedItems);
  }, []);

  // Cost is derived from what the materials actually cost, not typed in. A BOM
  // whose cost is a guess cannot tell a factory owner their per-unit cost, which
  // is the only question they open this screen to answer.
  const draftCost = useMemo(() => {
    let total = 0;
    for (const line of lines) {
      const item = itemsById.get(line.itemId);
      const qty = Number(line.qty);
      if (!item || !Number.isFinite(qty) || qty <= 0) continue;
      total += qty * item.unitCost;
    }
    const yieldUnits = form.yieldUnits > 0 ? form.yieldUnits : 1;
    // Conversion cost counts too — a bag costs the roll plus the labour and
    // machine time that turned the roll into a bag.
    const conversion = (Number(form.labourPerBatch) || 0) + (Number(form.overheadPerBatch) || 0);
    const batchCost = total + conversion;
    return { materialCost: total, conversion, batchCost, unitCost: batchCost / yieldUnits };
  }, [lines, itemsById, form.yieldUnits, form.labourPerBatch, form.overheadPerBatch]);

  function setLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function resetForm() {
    setForm({ finishedItemId: "", version: "v1.0", yieldUnits: 1, labourPerBatch: 0, overheadPerBatch: 0 });
    setLines([{ itemId: "", qty: "", divisible: false }]);
    setEditingId("");
    setFormulaMeta(null);
    setFormError("");
  }

  function startNew() {
    resetForm();
    setShowModal(true);
  }

  /**
   * Reopen a saved BOM in the same form that built it.
   *
   * Everything is loaded back, including the quantities — the material list is
   * where a wrong figure hides, and until now the only way to correct one was
   * to build the whole BOM again. That is how the two "Simple Bag (48)" rows
   * appeared: one at 13 rolls, one at 16, with nothing saying which is current.
   */
  function startEdit(bom: ManufacturingBom) {
    setEditingId(bom.id);
    setForm({
      finishedItemId: bom.finishedItemId,
      version: bom.version || "v1.0",
      yieldUnits: bom.yieldUnits || 1,
      labourPerBatch: Number(bom.labourPerBatch) || 0,
      overheadPerBatch: Number(bom.overheadPerBatch) || 0,
    });
    setLines(
      bom.lines.length
        ? bom.lines.map((l) => ({ itemId: l.itemId, qty: String(l.qty), divisible: l.divisible === true }))
        : [{ itemId: "", qty: "", divisible: false }],
    );
    setFormulaMeta(bom.formulaId ? { id: bom.formulaId, name: bom.formulaName || "", version: bom.formulaVersion || 1 } : null);
    setFormError("");
    setShowModal(true);
  }

  /* ── Make this ──────────────────────────────────────────────────────────
     Raising an order, starting it and posting it are three screens and two
     gates, and for most runs they carry no information: the job is simply
     made. This does all three behind one confirm, against a quote taken
     before anything is raised — so what is on screen is what will be
     consumed, and backing out leaves nothing behind.

     Production Orders is untouched and still the way to plan a job, assign
     it, and come back to it in stages. */
  const [makeBom, setMakeBom] = useState<ManufacturingBom | null>(null);
  /* Two quantities, because they are two different facts.
     
     The order is what the customer asked for; today is what actually came off
     the floor. They part company the moment a job runs over more than one day,
     which is the normal case when the operations move at different speeds —
     buttons go on fast, sealing is slow, and an evening ends with neither
     finished. Posting the order size as though it were done puts finished
     goods into stock that nobody has made yet. */
  const [makeOrderQty, setMakeOrderQty] = useState("");
  const [makeQty, setMakeQty] = useState("");
  const [makeQuote, setMakeQuote] = useState<ProductionRunQuote | null>(null);
  const [makeBusy, setMakeBusy] = useState(false);
  const [makeError, setMakeError] = useState("");
  const [makeShort, setMakeShort] = useState(false);

  /* Who did the work, and what they are owed for it.
     
     Without this the run still costs the labour — it falls back to the BOM's
     per-batch figure — but the credit goes to one lump "Factory Labour"
     expense head. Nobody is owed anything in the books and nobody can be paid
     from it. Naming the workers here credits each one's own payable account
     instead, the same way a job work receipt credits the thekedar. */
  const [labourList, setLabourList] = useState<{ id: string; name: string; ratePerUnit: number }[]>([]);
  const [labourRows, setLabourRows] = useState<LabourRow[]>([]);

  useEffect(() => {
    fetch("/api/manufacturing/labour", { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => setLabourList(Array.isArray(list) ? list : []))
      .catch(() => setLabourList([]));
  }, []);

  const setLabourRow = (index: number, patch: Partial<LabourRow>) =>
    setLabourRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const labourTotal = labourRows.reduce(
    (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.rate) || 0),
    0,
  );

  /* A worker named with no pieces or no rate. Left to go through it would
     count as an assignment worth nothing, replace the BOM's estimate with it,
     and post a run whose labour cost is zero and whose worker is owed nothing.
     Stopped here and said out loud instead. */
  const incompleteLabour = labourRows.some(
    (r) => r.labourId && !(Number(r.qty) > 0 && Number(r.rate) > 0),
  );

  const orderQtyNum = Math.floor(Number(makeOrderQty)) || 0;
  const todayQtyNum = Math.floor(Number(makeQty)) || 0;
  const partial = orderQtyNum > 0 && todayQtyNum > 0 && todayQtyNum < orderQtyNum;
  const pendingQty = Math.max(orderQtyNum - todayQtyNum, 0);

  /**
   * Pieces done today, per job.
   *
   * One run is not one operation. A bag is sealed and then buttoned, by
   * different people working at different speeds, and on any given day those
   * two numbers are simply not the same — 8,000 sealed and 7,000 buttoned is
   * an ordinary day, not an error.
   *
   * The finished count is the slowest of the jobs, because a bag that has been
   * sealed but not buttoned is not a bag anyone can ship. The difference is
   * part-made stock, and it finishes first thing tomorrow.
   *
   * The labour rows already carry the honest per-job figure — each worker is
   * paid for what they actually did — so nothing new has to be typed. This
   * only reads them back and says what they imply, which is the one thing the
   * screen was leaving the operator to work out in their head.
   */
  const jobsToday = useMemo(() => {
    const by = new Map<string, number>();
    for (const row of labourRows) {
      const qty = Number(row.qty) || 0;
      if (!row.labourId || qty <= 0) continue;
      const job = row.operation.trim() || "Unnamed job";
      // Two people on the same job add up — three cutters doing 3,000 each
      // have cut 9,000 pieces between them, not done the job three times.
      by.set(job, (by.get(job) || 0) + qty);
    }
    return [...by.entries()].sort((a, b) => a[1] - b[1]);
  }, [labourRows]);

  const slowestJob = jobsToday.length ? jobsToday[0][1] : 0;
  const fastestJob = jobsToday.length ? jobsToday[jobsToday.length - 1][1] : 0;
  /* Only worth saying when the jobs actually disagree. One job, or every job
     on the same number, and the finished count is not in question. */
  const jobsDisagree = jobsToday.length > 1 && slowestJob < fastestJob;

  function openMake(bom: ManufacturingBom) {
    setMakeBom(bom);
    setMakeOrderQty(String(bom.yieldUnits || 1));
    setMakeQty(String(bom.yieldUnits || 1));
    setMakeQuote(null);
    setMakeError("");
    setMakeShort(false);
    setLabourRows([]);
  }

  function closeMake() {
    setMakeBom(null);
    setMakeQuote(null);
    setMakeError("");
  }

  // Re-priced as the quantity changes, so the figures never belong to a
  // number the operator has already typed over.
  useEffect(() => {
    if (!makeBom) return;
    const qty = Number(makeQty);
    if (!Number.isFinite(qty) || qty <= 0) { setMakeQuote(null); return; }
    let live = true;
    const id = setTimeout(async () => {
      const quote = await quoteBomRun(makeBom.id, Math.floor(qty));
      if (!live) return;
      if (!quote) { setMakeError("Could not reach the server."); setMakeQuote(null); return; }
      setMakeError(quote.error || "");
      setMakeQuote(quote.error ? null : quote);
    }, 250);
    return () => { live = false; clearTimeout(id); };
  }, [makeBom, makeQty]);

  async function confirmMake() {
    if (!makeBom || !makeQuote) return;
    const qty = todayQtyNum;
    const orderQty = Math.max(orderQtyNum, qty);
    if (qty <= 0) { setMakeError("How many were finished today?"); return; }

    const assignments = labourRows
      // rate > 0, not >= 0. A named worker at zero used to count as a real
      // assignment and replace the BOM's estimate with nothing — the run then
      // posted with no labour cost at all and the worker was owed nothing,
      // which is not what naming somebody means. Incomplete rows are caught
      // before this, so nothing is silently dropped either.
      .filter((r) => r.labourId && Number(r.qty) > 0 && Number(r.rate) > 0)
      .map((r) => ({
        labourId: r.labourId,
        qty: Number(r.qty),
        rate: Number(r.rate),
        operation: r.operation.trim(),
      }));

    setMakeBusy(true);
    setMakeError("");
    try {
      // The order is raised first because the posting path is built around one
      // — it is what the finished goods batch and the WIP entry are traced
      // back to. It is simply not left for the operator to do by hand.
      /* The order is what was asked for, not what came off the floor today.
         Posting them as the same number is what put finished goods into stock
         that nobody had made yet; keeping them apart is what lets the posting
         leave the order `running` with a balance to carry into tomorrow. */
      const order = await productionStore.create({
        title: makeBom.product,
        status: "in_progress",
        date: new Date().toISOString().slice(0, 10),
        data: {
          orderId: `PO-${String(orders.length + 1).padStart(4, "0")}`,
          quantity: orderQty,
          completed: 0,
          bomId: makeBom.id,
          bomVersion: makeBom.version || "",
          location: makeQuote.location || "MAIN",
          notes: "Raised from the BOM",
        },
      });

      const res = await fetch("/api/manufacturing/production-orders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionOrderId: order.id,
          producedQty: qty,
          allowNegativeStock: makeShort,
          location: makeQuote.location || "MAIN",
          date: new Date().toISOString().slice(0, 10),
          // Named workers replace the BOM's labour estimate entirely — they
          // are what was actually agreed to pay.
          ...(assignments.length ? { labourAssignments: assignments } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Could not post the run.");

      const kept = (body.remnantsCreated ?? []) as { itemName: string; qty: number; unit: string }[];
      toast.success(
        `${body.producedQty} × ${makeBom.product} made · batch ${body.batchNo} · Rs. ${Math.round(body.totalCost).toLocaleString()} to Finished Goods`,
      );
      // Where the rest of the job now lives, said at the moment it becomes true.
      if (orderQty > qty) {
        toast(
          `${(orderQty - qty).toLocaleString()} still to make — the order is open on Production Orders`,
          { icon: "📋", duration: 6000 },
        );
      }
      if (kept.length) {
        toast(`Kept as open stock: ${kept.map((r) => `${Number(r.qty).toFixed(2)}${r.unit} ${r.itemName}`).join(", ")}`, { icon: "♻️" });
      }
      closeMake();
      await Promise.all([productionStore.refetch?.(), bomStore.refetch?.()]);
      loadManufacturingItems(["RAW_MATERIAL", "TRADING"]).then(setRawMaterials);
    } catch (e) {
      // The order is left standing on purpose: it was raised, and if the
      // posting failed the operator needs to see it on Production Orders
      // rather than wonder where it went.
      setMakeError(e instanceof Error ? e.message : "Could not post the run.");
    } finally {
      setMakeBusy(false);
    }
  }

  async function removeBom(bom: { id: string; product: string }, linkedOrders: number) {
    // A BOM that production orders were costed against is not junk to be thrown
    // away — deleting it leaves those orders pointing at nothing.
    const warning = linkedOrders > 0
      ? `${bom.product} is used by ${linkedOrders} production order${linkedOrders > 1 ? "s" : ""}. Deleting it leaves them without the recipe they were costed from.\n\nDelete anyway?`
      : `Delete the BOM for ${bom.product}?`;
    if (!window.confirm(warning)) return;
    try {
      await bomStore.remove(bom.id);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not delete the BOM.");
    }
  }

  async function save() {
    const finished = itemsById.get(form.finishedItemId);
    if (!finished) { setFormError("Pick the finished product this BOM makes."); return; }
    if (form.yieldUnits <= 0) { setFormError("Yield must be greater than zero."); return; }

    const cleaned: BomLineInput[] = [];
    for (const line of lines) {
      const qty = Number(line.qty);
      if (!line.itemId) continue;
      if (!Number.isFinite(qty) || qty <= 0) {
        setFormError("Every material line needs a quantity greater than zero.");
        return;
      }
      cleaned.push({ itemId: line.itemId, qty, divisible: line.divisible });
    }
    if (!cleaned.length) { setFormError("Add at least one material."); return; }

    setFormError("");
    setSaving(true);
    const payload = {
      title: finished.name,
      status: "active",
      amount: draftCost.unitCost,
      data: {
          version: form.version.trim() || "v1.0",
          yield: form.yieldUnits,
          finishedItemId: finished.id,
          lines: cleaned,
          labourPerBatch: Number(form.labourPerBatch) || 0,
          overheadPerBatch: Number(form.overheadPerBatch) || 0,
        // Kept so older readers and the control centre still render a
        // material summary without having to resolve item ids.
        materials: cleaned.map((l) => itemsById.get(l.itemId)?.name).filter(Boolean).join(", "),
        // Traceability back to the formula run this BOM's units/labour came from.
        ...(formulaMeta
          ? { formulaId: formulaMeta.id, formulaName: formulaMeta.name, formulaVersion: formulaMeta.version }
          : {}),
      },
    };

    try {
      // Editing corrects the BOM in place rather than adding another one. A new
      // record per correction is what leaves two rows for the same product with
      // no way to tell which the factory is actually working to.
      if (editingId) {
        await bomStore.update(editingId, payload);
      } else {
        await bomStore.create(payload);
      }
      setShowModal(false);
      resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save the BOM.");
    } finally {
      setSaving(false);
    }
  }

  const noItems = rawMaterials.length === 0 && finishedItems.length === 0;

  return (
    <div style={{ padding: isMobile ? "15px 14px" : "28px 32px", fontFamily: ff, color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 26, gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Bill of Materials</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.42)", margin: 0 }}>
            What each finished product consumes, and how many one batch makes.
          </p>
        </div>
        <button onClick={startNew} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#f97316", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + New BOM
        </button>
      </div>

      {noItems && (
        <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(249,115,22,.09)", border: "1px solid rgba(249,115,22,.25)", fontSize: 13, color: "rgba(255,255,255,.62)" }}>
          No inventory items yet. Add your raw materials and finished products on the{" "}
          <a href="/dashboard/manufacturing/raw-materials" style={{ color: "#fb923c", fontWeight: 700 }}>Raw Materials</a>{" "}
          page first — a BOM consumes real stock, so it needs real items.
        </div>
      )}

      {/* The fourth card used to be Average Unit Cost — the mean of a bag and
          a box, which is neither, and money on a screen that is not about
          money. In its place, the one number that decides whether any of these
          BOMs can actually be run today: how many of the materials they
          consume have fallen to their reorder level. Amber only when there is
          something to act on; a zero here is good news and reads as such. */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total BOMs", value: boms.length, color: "#f97316" },
          { label: "Products In Production", value: new Set(orders.map((o) => o.product)).size, color: "#38bdf8" },
          { label: "Raw Materials", value: rawMaterials.length, color: "#22c55e" },
          { label: "Materials Low On Stock", value: lowMaterials, color: lowMaterials ? "#f59e0b" : "#22c55e" },
        ].map((card) => (
          <div key={card.label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "18px 20px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr .8fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {boms.map((bom) => {
            const linkedOrders = orders.filter((o) => o.product === bom.product).length;
            // What the finished goods are counted in — PCS, KG, whatever the
            // item was set up as. "units" only when the item has gone.
            const yieldUnit = itemsById.get(bom.finishedItemId)?.unit || "units";
            return (
              <div key={bom.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: isMobile ? "12px 10px" : "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{bom.product}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.42)", marginTop: 4 }}>
                      Version {bom.version} • Linked orders {linkedOrders}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {/* The batch size, where the unit cost used to be. What a
                        BOM is asked at a glance is "how many does one run of
                        this make" — the cost is a figure for the costing
                        screen, and up here it only competed with the name of
                        the product for attention. Yield also stops repeating
                        itself: it was in the line above as well. */}
                    <div style={{ color: "#38bdf8", fontSize: 15, fontWeight: 800 }}>{bom.yieldUnits.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{yieldUnit} per batch</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 9, justifyContent: "flex-end" }}>
                      {/* The whole run from here: raise the order, start it and
                          post it in one confirm. The Production Orders screen
                          is still there for a job somebody plans, assigns and
                          comes back to — this is for the far commoner case
                          where the order is simply made. */}
                      <button onClick={() => openMake(bom)}
                        style={{ padding: "4px 13px", borderRadius: 7, border: "1px solid rgba(34,197,94,.4)", background: "rgba(34,197,94,.12)", color: "#4ade80", fontFamily: "inherit", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>
                        Make
                      </button>
                      <button onClick={() => startEdit(bom)}
                        style={{ padding: "4px 11px", borderRadius: 7, border: `1px solid ${border}`, background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.75)", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={() => removeBom(bom, linkedOrders)}
                        style={{ padding: "4px 11px", borderRadius: 7, border: "1px solid rgba(239,68,68,.35)", background: "rgba(239,68,68,.08)", color: "#fca5a5", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                {bom.lines.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {bom.lines.map((line) => {
                      const item = itemsById.get(line.itemId);
                      const low = item?.isLow;
                      return (
                        <span key={`${bom.id}-${line.itemId}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: low ? "rgba(239,68,68,.12)" : "rgba(34,197,94,.12)", color: low ? "#fca5a5" : "#22c55e", borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 600 }}>
                          {item?.name ?? "(deleted item)"} × {line.qty}{item?.unit ?? ""}
                          {low ? <span style={{ color: "#ef4444" }}>Low</span> : null}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  // Pre-existing BOMs stored materials as free text with no
                  // quantities, so they cannot drive a production run yet.
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>{bom.materials.join(", ") || "No materials listed"}</span>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(249,115,22,.14)", border: "1px solid rgba(249,115,22,.3)", color: "#fb923c", fontSize: 11, fontWeight: 700 }}>
                      Needs quantities before it can be produced
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {!bomStore.loading && boms.length === 0 && (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 36, textAlign: "center", color: "rgba(255,255,255,.28)" }}>
              No BOMs defined yet.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Raw materials in stock</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rawMaterials.length ? rawMaterials.slice(0, 10).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "rgba(255,255,255,.62)" }}>{item.name}</span>
                  <span style={{ color: item.isLow ? "#fca5a5" : "#38bdf8", fontWeight: 700 }}>
                    {item.currentStock}{item.unit} · Rs. {formatRate(item.unitCost)}
                  </span>
                </div>
              )) : <div style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>No raw materials yet.</div>}
            </div>
          </div>

          <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Flow</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>
              1. Add raw materials and finished products as inventory items.
              <br />2. Build a BOM — pick the product and what a batch consumes.
              <br />3. Raise a production order against the BOM.
              <br />4. Complete the run: material leaves stock, finished goods arrive, WIP posts to the ledger.
            </div>
          </div>
        </div>
      </div>

      {/* ── Make this ── */}
      {makeBom && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div style={{ background: "#10131a", border: `1px solid ${border}`, borderRadius: 16, padding: isMobile ? 16 : 24, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Make {makeBom.product}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 16 }}>
              Raises the order, consumes the material and posts the finished goods — all on confirm.
              Nothing is written until then.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div>
                <label style={qtyLabel}>The order — how many {makeBom.product}?</label>
                <input
                  type="number" min={1} step={1} value={makeOrderQty} autoFocus
                  onChange={(e) => {
                    const next = e.target.value;
                    setMakeOrderQty(next);
                    // Most jobs finish in one go, so today follows the order
                    // until somebody says otherwise.
                    if (!partial) setMakeQty(next);
                  }}
                  style={qtyInput}
                />
              </div>
              <div>
                <label style={qtyLabel}>Finished today</label>
                <input
                  type="number" min={1} step={1} value={makeQty}
                  onChange={(e) => setMakeQty(e.target.value)}
                  style={{ ...qtyInput, borderColor: partial ? "rgba(251,191,36,.45)" : border }}
                />
              </div>
            </div>

            {/* Said plainly, because posting an order size as though it were
                made is how finished goods nobody has produced get into stock. */}
            <div style={{ fontSize: 11.5, color: partial ? "#fbbf24" : "rgba(255,255,255,.32)", marginTop: 6, lineHeight: 1.6 }}>
              {partial
                ? `${pendingQty.toLocaleString()} left over — the order stays open on Production Orders, and tomorrow's run carries on from there with its own labour.`
                : "The whole order is finished in this run. Making only part of it today? Put that in “Finished today”."}
            </div>

            {makeError && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>
                {makeError}
              </div>
            )}

            {/* What it will actually take off the rack, priced before anything
                is raised. A confirm against figures nobody was shown is how a
                run consumes material the store did not expect to lose. */}
            {makeQuote && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 8 }}>
                  Material this takes — from {makeQuote.location || "MAIN"}
                </div>
                {makeQuote.lines.map((line) => {
                  const short = makeQuote.shortages.some((s) => s.itemId === line.itemId);
                  // requiredQty, not qty: `qty` is what the BOM says one batch
                  // takes, and showing it against an order of ten thousand
                  // reads as though the run consumes a single roll.
                  return (
                    <div key={line.itemId} style={{ padding: "5px 0", fontSize: 12.5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, color: short ? "#fca5a5" : "rgba(255,255,255,.75)" }}>
                        <span>{line.itemName}{short ? ` — only ${line.availableQty.toLocaleString()}${line.unit} in stock` : ""}</span>
                        <span style={{ fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap", fontWeight: 700 }}>
                          {line.requiredQty.toLocaleString()} {line.unit}
                        </span>
                      </div>
                      {/* The exact figure under the whole one, so 15.82 rolls
                          taken as 16 does not look like a rounding nobody
                          agreed to — and the part that survives says so. */}
                      {(line.exactQty !== line.requiredQty || line.leftoverQty > 0 || line.fromRemnantQty > 0) && (
                        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.35)", marginTop: 1 }}>
                          {line.exactQty !== line.requiredQty && `needs ${line.exactQty.toFixed(2)}${line.unit}`}
                          {line.fromRemnantQty > 0 && ` · ${line.fromRemnantQty.toFixed(2)}${line.unit} from open stock`}
                          {line.leftoverQty > 0 && ` · ${line.leftoverQty.toFixed(2)}${line.unit} stays as open stock`}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.5)" }}>Goes to Finished Goods</span>
                  {/* Named workers replace the BOM's labour figure, so the
                      total has to follow them or the number on screen is not
                      the number that posts. */}
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#22c55e", fontFamily: "ui-monospace, monospace" }}>
                    Rs. {Math.round(
                      labourRows.length
                        ? makeQuote.totalCost - makeQuote.labourCost + labourTotal
                        : makeQuote.totalCost,
                    ).toLocaleString()}
                  </span>
                </div>

                {makeQuote.shortages.length > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "#fbbf24", cursor: "pointer" }}>
                    <input type="checkbox" checked={makeShort} onChange={(e) => setMakeShort(e.target.checked)} />
                    Make it anyway — the short material will show as negative stock
                  </label>
                )}

                {/* Who did the work. Leave it empty and the labour is still
                    costed, from the BOM — but it lands in one "Factory Labour"
                    head and nobody is owed anything by name. Name them and
                    each gets a payable of their own, to be paid off through
                    CPV like any other creditor. */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", color: "rgba(255,255,255,.4)" }}>
                      Labour on this run
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.32)" }}>
                      {labourRows.length
                        ? `Rs. ${Math.round(labourTotal).toLocaleString()} — replaces the BOM estimate`
                        : `BOM estimate Rs. ${Math.round(makeQuote.labourCost).toLocaleString()} — nobody owed by name`}
                    </span>
                  </div>

                  {labourList.length === 0 ? (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)" }}>
                      No workers added yet — add them on the{" "}
                      <a href="/dashboard/manufacturing/labour" style={{ color: "#fb923c", fontWeight: 700 }}>Labour</a> page.
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {labourRows.map((row, index) => (
                          <div key={index} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1.2fr 1fr 72px 80px 28px", gap: 6, alignItems: "center" }}>
                            <select value={row.labourId}
                              onChange={(e) => {
                                const picked = labourList.find((l) => l.id === e.target.value);
                                setLabourRow(index, { labourId: e.target.value, rate: picked ? String(picked.ratePerUnit) : row.rate });
                              }}
                              style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 9px", color: "#fff", fontSize: 12.5, fontFamily: "inherit" }}>
                              <option value="">— Worker —</option>
                              {labourList.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <input placeholder="Job — e.g. Button" value={row.operation}
                              onChange={(e) => setLabourRow(index, { operation: e.target.value })}
                              style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 9px", color: "#fff", fontSize: 12.5, fontFamily: "inherit" }} />
                            <input type="number" min={0} step="any" placeholder="Pcs" value={row.qty}
                              onChange={(e) => setLabourRow(index, { qty: e.target.value })}
                              style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 9px", color: "#fff", fontSize: 12.5, fontFamily: "inherit" }} />
                            {/* Enter on the last box of a row means "next
                                worker", not "delete this row" — which is what
                                it meant while the × button was the next thing
                                in the tab order. */}
                            <input type="number" min={0} step="any" placeholder="Rate/pc" value={row.rate}
                              onChange={(e) => setLabourRow(index, { rate: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter" || e.shiftKey) return;
                                e.preventDefault();
                                document.getElementById("bom-add-worker")?.focus();
                              }}
                              style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 9px", color: "#fff", fontSize: 12.5, fontFamily: "inherit" }} />
                            {/* Out of the tab order: removing a row is a
                                deliberate click, not something the keyboard
                                should pass through. */}
                            <button onClick={() => setLabourRows((rows) => rows.filter((_, i) => i !== index))} tabIndex={-1} title="Remove"
                              style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.45)", cursor: "pointer", padding: "7px 0", gridColumn: isMobile ? "1 / -1" : "auto" }}>×</button>
                          </div>
                        ))}
                      </div>
                      {incompleteLabour && (
                        <div style={{ marginTop: 8, fontSize: 11.5, color: "#fbbf24" }}>
                          A worker is named with no pieces or no rate. Fill both in, or take the row out —
                          left as it is, the run would post with no labour cost and nobody owed.
                        </div>
                      )}

                      {/* The jobs finished different amounts today, which is
                          normal and which the single "Finished today" box
                          cannot say on its own. Rather than leaving the
                          operator to work out which number goes in it, the
                          rows they have already filled in are read back and
                          the answer is offered. */}
                      {jobsDisagree && (
                        <div style={{ marginTop: 12, padding: "11px 13px", borderRadius: 10, background: "rgba(56,189,248,.07)", border: "1px solid rgba(56,189,248,.24)" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 8 }}>
                            {jobsToday.map(([job, qty]) => (
                              <span key={job} style={{ fontSize: 12, color: "rgba(255,255,255,.72)" }}>
                                {job}{" "}
                                <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: qty === slowestJob ? "#38bdf8" : "rgba(255,255,255,.55)" }}>
                                  {qty.toLocaleString()}
                                </span>
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: 11.5, lineHeight: 1.65, color: "rgba(255,255,255,.55)" }}>
                            A piece is finished only once every job is done on it, so{" "}
                            <strong style={{ color: "#38bdf8" }}>{slowestJob.toLocaleString()}</strong> are
                            finished today. The other {(fastestJob - slowestJob).toLocaleString()} are
                            part-made — they keep the work already done on them and finish first thing in
                            the next run. Everyone above is paid for what they did either way.
                          </div>
                          {todayQtyNum !== slowestJob && (
                            <button
                              onClick={() => setMakeQty(String(slowestJob))}
                              style={{ marginTop: 9, padding: "6px 12px", borderRadius: 8, background: "rgba(56,189,248,.14)", border: "1px solid rgba(56,189,248,.35)", color: "#7dd3fc", fontSize: 11.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
                            >
                              Set “Finished today” to {slowestJob.toLocaleString()}
                            </button>
                          )}
                        </div>
                      )}
                      <button
                        id="bom-add-worker"
                        onClick={() => setLabourRows((rows) => [...rows, { labourId: "", operation: "", qty: makeQty, rate: "" }])}
                        style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
                        + Worker
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                onClick={confirmMake}
                disabled={makeBusy || !makeQuote || incompleteLabour || (makeQuote.shortages.length > 0 && !makeShort)}
                style={{
                  flex: 1, padding: "11px 0", border: "none", borderRadius: 8, color: "#fff",
                  fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                  background: makeBusy || !makeQuote || incompleteLabour || (makeQuote.shortages.length > 0 && !makeShort) ? "rgba(34,197,94,.4)" : "#22c55e",
                  cursor: makeBusy || !makeQuote ? "not-allowed" : "pointer",
                }}
              >
                {makeBusy
                  ? "Making…"
                  : makeQuote
                    ? `Make ${todayQtyNum.toLocaleString()}${partial ? ` of ${orderQtyNum.toLocaleString()}` : ""}`
                    : "Pricing…"}
              </button>
              <button onClick={closeMake} disabled={makeBusy}
                style={{ padding: "11px 20px", background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", fontSize: 14, fontFamily: "inherit", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#161b27", border: `1px solid ${border}`, borderRadius: 16, padding: 30, width: 580, maxHeight: "90vh", overflowY: "auto", fontFamily: ff }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 700 }}>{editingId ? "Edit Bill of Materials" : "New Bill of Materials"}</h2>
            {/* No explanatory banners here. The dialog arrives filled in, and
                the fields say what they are; two paragraphs above them only
                delayed the person who could already see that. The charge the
                formula names still arrives as its own material line below,
                with the quantity worked out and a note saying what it is —
                which is the instruction, in the place where it is carried out. */}
            {formError && <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.28)", color: "#fca5a5", fontSize: 12 }}>{formError}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Finished Product</label>
                <select value={form.finishedItemId} onChange={(e) => setForm((c) => ({ ...c, finishedItemId: e.target.value }))} style={inputStyle}>
                  <option value="">— Select a finished product —</option>
                  {finishedItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Version</label>
                <input value={form.version} onChange={(e) => setForm((c) => ({ ...c, version: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Units per batch</label>
                <input type="number" min={1} value={form.yieldUnits} onChange={(e) => setForm((c) => ({ ...c, yieldUnits: Number(e.target.value) }))} style={inputStyle} />
              </div>
            </div>

            {/* Conversion cost. Leaving these at 0 values finished goods at
                material cost alone, which understates what a batch really cost. */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Labour per batch</label>
                <input type="number" min={0} step="any" value={form.labourPerBatch}
                  onChange={(e) => setForm((c) => ({ ...c, labourPerBatch: Number(e.target.value) }))}
                  placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 6 }}>Overhead per batch</label>
                <input type="number" min={0} step="any" value={form.overheadPerBatch}
                  onChange={(e) => setForm((c) => ({ ...c, overheadPerBatch: Number(e.target.value) }))}
                  placeholder="0" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              {/* The batch size, said here rather than only in the box further
                  up. A quantity is typed against a basis, and when the basis is
                  three fields away the number gets typed against whatever the
                  operator happens to be thinking in — which is per piece, and
                  which is how a batch of 1,264 buttons gets entered as 2. */}
              <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 8 }}>
                Materials consumed per batch
                {form.yieldUnits > 0 && (
                  <span style={{ color: "rgba(255,255,255,.75)", fontWeight: 700 }}>
                    {" "}of {form.yieldUnits.toLocaleString()}
                    {finishedItems.find((f) => f.id === form.finishedItemId)?.name
                      ? ` × ${finishedItems.find((f) => f.id === form.finishedItemId)!.name}`
                      : " units"}
                  </span>
                )}
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {lines.map((line, index) => {
                  const item = itemsById.get(line.itemId);
                  const qty = Number(line.qty) || 0;
                  return (
                    <div key={index}>
                    {/* What the formula expected here. The quantity is filled
                        in; the item is not, because only the operator knows
                        which of their own stock it means. */}
                    {line.note && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.42)", marginBottom: 4 }}>{line.note}</div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 96px 32px", gap: 8, alignItems: "center" }}>
                      <select value={line.itemId} onChange={(e) => setLine(index, { itemId: e.target.value })} style={inputStyle}>
                        <option value="">— Material —</option>
                        {/* The unit, not the stock on hand. The number in the
                            name was a running balance read at the moment the
                            list rendered — stale by the time a batch is made,
                            and never what this dialog is deciding. The unit
                            stays because the box beside it is a quantity and
                            the operator has to know 1 means one roll. */}
                        {rawMaterials.map((m) => <option key={m.id} value={m.id}>{m.name}{m.unit ? ` (${m.unit})` : ""}</option>)}
                      </select>
                      <input type="number" min={0} step="any" placeholder="Qty" value={line.qty} onChange={(e) => setLine(index, { qty: e.target.value })} style={inputStyle} />
                      {/* The same quantity read the other way, and deliberately
                          no money. A batch figure can only be checked against a
                          batch nobody counts; the per-piece number beside it is
                          the one an operator knows by heart, so a wrong entry
                          shows itself here rather than in a run three days
                          later. A rupee figure next to it checks nothing — the
                          operator did not choose the rate and cannot correct
                          it, so it only invites them to doubt a number that is
                          not theirs to doubt. */}
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", textAlign: "right", lineHeight: 1.35 }}>
                        {qty > 0 && form.yieldUnits > 0 ? (
                          <div>
                            {(() => {
                              const perUnit = qty / form.yieldUnits;
                              // Four decimals for a roll, none for a button —
                              // "0.0016" and "2" are both the honest answer.
                              const shown = perUnit >= 1
                                ? Math.round(perUnit * 100) / 100
                                : Math.round(perUnit * 1e4) / 1e4;
                              return `${shown.toLocaleString()}${item?.unit ? ` ${item.unit}` : ""} per unit`;
                            })()}
                          </div>
                        ) : (
                          <div style={{ color: "rgba(255,255,255,.25)" }}>—</div>
                        )}
                      </div>
                      <button
                        onClick={() => setLines((c) => (c.length === 1 ? [{ itemId: "", qty: "", divisible: false }] : c.filter((_, i) => i !== index)))}
                        title="Remove line"
                        style={{ background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.45)", cursor: "pointer", padding: "8px 0" }}
                      >×</button>
                      <label style={{ gridColumn: "span 4", display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "rgba(255,255,255,.45)", cursor: "pointer", margin: "-2px 0 4px" }}>
                        <input type="checkbox" checked={line.divisible} onChange={(e) => setLine(index, { divisible: e.target.checked })} />
                        Roll / sheet material — keep the part-used {item?.unit || "unit"} as open stock for the next run
                      </label>
                    </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setLines((c) => [...c, { itemId: "", qty: "", divisible: false }])} style={{ marginTop: 10, padding: "7px 14px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: `1px solid ${border}`, color: "rgba(255,255,255,.65)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                + Add material
              </button>
            </div>

            {/* No cost panel here, on purpose.

                This screen is a recipe: which materials, how much of each, per
                batch of how many. The cost of that recipe is arithmetic we do
                from rates the operator did not set and cannot change from this
                dialog, so a figure here answers a question nobody is asking at
                this moment and quietly invites a different one — "is Rs. 24
                right?" — that the person filling in a recipe has no way to
                settle. It was also the loudest thing on the dialog, which made
                the costing look like the point of the screen.

                The cost is still calculated and still saved with the BOM
                (`amount` on the payload below); it is read where it belongs, on
                the BOM list and in the costed run. */}

            <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
              <button onClick={save} disabled={saving} style={{ flex: 1, padding: "11px 0", background: saving ? "rgba(249,115,22,.5)" : "#f97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : editingId ? "Save Changes" : "Create BOM"}
              </button>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: "11px 24px", background: "transparent", border: `1px solid ${border}`, borderRadius: 8, color: "rgba(255,255,255,.65)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BOMPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "rgba(255,255,255,.35)", fontFamily: ff }}>Loading…</div>}>
      <BOMPageInner />
    </Suspense>
  );
}
