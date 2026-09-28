// FILE: lib/formulaTemplates.ts
//
// Starter formulas. A blank formula editor is intimidating and teaches nothing,
// so every category ships with a worked example an author can copy and bend to
// their own trade.
//
// These are examples, not product rules. Every constant here — stock sizes, an
// allowance, a density divisor, a wastage percentage — is an *input* the author
// owns. Nothing in lib/formulaEngine.ts knows what a roll or a garment is.

import type { CostingFormula, FormulaInput, FormulaStep, FormulaOutput } from "@/lib/formulaEngine";

export const FORMULA_CATEGORIES = [
  "Packaging",
  "Textile & Garments",
  "Printing",
  "Wood & Furniture",
  "Metal & Fabrication",
  "Food & Beverage",
  "Plastics & Moulding",
  "General",
] as const;

export type FormulaTemplate = CostingFormula & { templateId: string; summary: string };

/* ───────────────────── Fastening (Button / Tape / Kunda / Zip) ─────────────────────
   Shared by every bag template, so a single bag and a two-panel bag are
   fastened, costed and issued from the store the same way. */

const FASTENING_INPUTS: FormulaInput[] = [
  // Buttons are counted, not guessed at. A flat "Button / Tape — Rs 3"
  // could not answer the two questions a store actually gets asked: how
  // many buttons to issue for the order, and what they came to. So the
  // charge is built the way the roll is — a count per piece against a
  // rate — and the total falls out of it.
  // A bag is fastened one way or the other, never both, so the two are a
  // choice rather than two charges that quietly add up. Button first,
  // which makes it the default.
  { key: "fitting",      label: "Fastening",          options: ["Button", "Tape", "Kunda", "Zip"], defaultValue: 0, askOnRun: true, group: "Button & Tape" },
  { key: "buttonsPerPc", label: "Buttons per piece",  unit: "pcs", defaultValue: 2, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 0 } },
  { key: "buttonRate",   label: "Rate per button",    unit: "Rs", defaultValue: 1.2, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 0 } },
  // Per piece, not per button — same as the tape branch below. Fitting a
  // bag is one operation whether it takes two buttons or four, and 0.6 a
  // bag is a figure a costing clerk can check against a wage; 0.3 a button
  // is one they have to multiply first. Comes to the same money.
  { key: "buttonLabour", label: "Labour per piece",   unit: "Rs", defaultValue: 0.6, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 0 } },
  // Tape is not counted, it is measured — three inches a bag, bought by
  // the metre. So it gets a length and a rate rather than a count and a
  // rate, and the sheet converts between them instead of the operator.
  // Three boxes either way, and the same three questions in the same
  // order: how much per piece, what it costs, what it costs to fit. Only
  // the unit moves — buttons are counted, tape is measured.
  { key: "tapePerPc",    label: "Tape per piece",     unit: "in", defaultValue: 3, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 1 } },
  { key: "tapeRate",     label: "Rate per inch",      unit: "Rs", defaultValue: 0.25, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 1 } },
  // Per piece, not per inch: taping a bag is one operation whatever length
  // of tape it takes, so it is added once rather than multiplied by the
  // length. The box above it is the one that scales with inches.
  { key: "tapeLabour",   label: "Labour per piece",   unit: "Rs", defaultValue: 0.5, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 1 } },
  // A kunda is counted like a button — so many a bag, bought by the piece.
  { key: "kundaPerPc",   label: "Kunda per piece",    unit: "pcs", defaultValue: 1, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 2 } },
  { key: "kundaRate",    label: "Rate per kunda",     unit: "Rs", defaultValue: 2, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 2 } },
  { key: "kundaLabour",  label: "Labour per piece",   unit: "Rs", defaultValue: 0.5, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 2 } },
  // A zip is measured like tape — so many inches a bag, priced by the inch.
  { key: "zipPerPc",     label: "Zip per piece",      unit: "in", defaultValue: 10, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 3 } },
  { key: "zipRate",      label: "Rate per inch",      unit: "Rs", defaultValue: 0.5, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 3 } },
  { key: "zipLabour",    label: "Labour per piece",   unit: "Rs", defaultValue: 1, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 3 } },
];

const FASTENING_STEPS: FormulaStep[] = [
  // Buttons costed like the roll: a count for the store to issue, a rate
  // against that count, and a total. buttonsNeeded is what actually goes
  // out of the store for the order — the number a flat per-piece charge
  // could never tell anybody.
  // Whichever way the bag is fastened, the other branch has to come out at
  // zero — the boxes behind it are still on the formula and still hold
  // last week's numbers, and a hidden field that keeps charging is the
  // worst kind of costing error: invisible and consistent.
  // The if() keeps the unpicked branch out of the money; showWhen keeps it
  // off the paper and off the result card. Both are needed: the steps have
  // to evaluate either way, because every step below reads them.
  // What the store issues, which is the only part of this the floor acts
  // on — grouped, so it prints, and branched, so a buttoned bag does not
  // carry a tape line reading zero. The money beside it is ungrouped: the
  // working sheet is a cutting instruction, and what the job costs is the
  // quoter's business, on the cost sheet.
  { key: "buttonsNeeded", label: "Buttons required",    expression: "if(fitting == 0, buttonsPerPc * orderQty, 0)", unit: "pcs", group: "Buttons & Tape", showWhen: { key: "fitting", is: 0 } },
  { key: "buttonPerPc",   label: "Button cost per piece", expression: "if(fitting == 0, buttonsPerPc * buttonRate + buttonLabour, 0)", unit: "Rs", showWhen: { key: "fitting", is: 0 } },
  { key: "buttonTotal",   label: "Total button cost",   expression: "buttonPerPc * orderQty", unit: "Rs", showWhen: { key: "fitting", is: 0 } },
  // Same shape as the buttons, in the unit tape is actually bought in: the
  // store issues metres, the bag is cut in inches.
  { key: "tapeNeeded",    label: "Tape required",       expression: "if(fitting == 1, convert(tapePerPc * orderQty, in, m), 0)", unit: "m", group: "Buttons & Tape", showWhen: { key: "fitting", is: 1 } },
  { key: "tapeCostPerPc", label: "Tape cost per piece", expression: "if(fitting == 1, tapePerPc * tapeRate + tapeLabour, 0)", unit: "Rs", showWhen: { key: "fitting", is: 1 } },
  { key: "tapeTotal",     label: "Total tape cost",     expression: "tapeCostPerPc * orderQty", unit: "Rs", showWhen: { key: "fitting", is: 1 } },
  // Kunda counted like buttons, zip measured like tape.
  { key: "kundasNeeded",   label: "Kunda required",       expression: "if(fitting == 2, kundaPerPc * orderQty, 0)", unit: "pcs", group: "Buttons & Tape", showWhen: { key: "fitting", is: 2 } },
  { key: "kundaCostPerPc", label: "Kunda cost per piece", expression: "if(fitting == 2, kundaPerPc * kundaRate + kundaLabour, 0)", unit: "Rs", showWhen: { key: "fitting", is: 2 } },
  { key: "kundaTotal",     label: "Total kunda cost",     expression: "kundaCostPerPc * orderQty", unit: "Rs", showWhen: { key: "fitting", is: 2 } },
  { key: "zipNeeded",      label: "Zip required",         expression: "if(fitting == 3, convert(zipPerPc * orderQty, in, m), 0)", unit: "m", group: "Buttons & Tape", showWhen: { key: "fitting", is: 3 } },
  { key: "zipCostPerPc",   label: "Zip cost per piece",   expression: "if(fitting == 3, zipPerPc * zipRate + zipLabour, 0)", unit: "Rs", showWhen: { key: "fitting", is: 3 } },
  { key: "zipTotal",       label: "Total zip cost",       expression: "zipCostPerPc * orderQty", unit: "Rs", showWhen: { key: "fitting", is: 3 } },
];

/** What fastening adds to one piece, whichever way it is fastened — the other branches are zero. */
const FASTENING_COST = "buttonPerPc + tapeCostPerPc + kundaCostPerPc + zipCostPerPc";

/** Per-piece rows for the cost breakdown. */
const FASTENING_BREAKDOWN: FormulaOutput[] = [
  { key: "buttonPerPc",    label: "Button per piece", unit: "Rs", group: "Cost breakdown", showWhen: { key: "fitting", is: 0 } },
  { key: "tapeCostPerPc",  label: "Tape per piece",   unit: "Rs", group: "Cost breakdown", showWhen: { key: "fitting", is: 1 } },
  { key: "kundaCostPerPc", label: "Kunda per piece",  unit: "Rs", group: "Cost breakdown", showWhen: { key: "fitting", is: 2 } },
  { key: "zipCostPerPc",   label: "Zip per piece",    unit: "Rs", group: "Cost breakdown", showWhen: { key: "fitting", is: 3 } },
];

const FASTENING_OUTPUTS: FormulaOutput[] = [
  // Marked as consumables, so a job work challan opens with a line for
  // them already counted — 20,000 buttons against 10,000 bags — instead of
  // the store being asked to multiply it out by hand.
  { key: "buttonsNeeded", label: "Buttons required", unit: "pcs", role: "consumable_qty", group: "Buttons & Tape", showWhen: { key: "fitting", is: 0 } },
  { key: "buttonTotal",   label: "Total button cost", unit: "Rs", group: "Buttons & Tape", showWhen: { key: "fitting", is: 0 } },
  { key: "tapeNeeded",    label: "Tape required",    unit: "m", role: "consumable_qty", group: "Buttons & Tape", showWhen: { key: "fitting", is: 1 } },
  { key: "tapeTotal",     label: "Total tape cost",  unit: "Rs", group: "Buttons & Tape", showWhen: { key: "fitting", is: 1 } },
  { key: "kundasNeeded",  label: "Kunda required",   unit: "pcs", role: "consumable_qty", group: "Buttons & Tape", showWhen: { key: "fitting", is: 2 } },
  { key: "kundaTotal",    label: "Total kunda cost", unit: "Rs", group: "Buttons & Tape", showWhen: { key: "fitting", is: 2 } },
  { key: "zipNeeded",     label: "Zip required",     unit: "m", role: "consumable_qty", group: "Buttons & Tape", showWhen: { key: "fitting", is: 3 } },
  { key: "zipTotal",      label: "Total zip cost",   unit: "Rs", group: "Buttons & Tape", showWhen: { key: "fitting", is: 3 } },
];

/** Printing on the bag — per piece, zero until a job is printed. */
const PRINT_INPUT: FormulaInput = { key: "printCost", label: "Print", unit: "Rs", defaultValue: 0, askOnRun: true, group: "Order details" };

export const FORMULA_TEMPLATES: FormulaTemplate[] = [
  /* ───────────────────────── Packaging ───────────────────────── */
  {
    templateId: "roll-to-piece",
    name: "Roll → Pieces (film / laminate bags)",
    category: "Packaging",
    version: 1,
    summary:
      "Pieces nested across a roll's width and repeated along its length. Costs the roll by weight, then divides down to one piece.",
    description:
      "For anything cut from a roll: PVC and PE bags, laminate pouches, sleeves. Change the stock widths to match your supplier — the weight divisor sits under Advanced.",
    // Grouped the way an operator reads a job card: what the bag is, what it is
    // cut from, and how many are wanted. The engine ignores `group` entirely.
    inputs: [
      { key: "pieceWidth",   label: "Width",        unit: "in", defaultValue: 11.5, askOnRun: true, group: "Bag details" },
      { key: "pieceLength",  label: "Length",       unit: "in", defaultValue: 11,   askOnRun: true, group: "Bag details" },
      // Side/bottom gusset. Defaults to 0 so a plain flat bag costs exactly
      // what it did before this input existed — only jobs that actually have a
      // gusset are affected.
      { key: "guezzet",       label: "Guezzet",             unit: "in", defaultValue: 0,    askOnRun: true, group: "Bag details" },
      { key: "flap",         label: "Flap / seal",        unit: "in", defaultValue: 2.5,  askOnRun: true, group: "Bag details" },
      { key: "gauge",        label: "Gauge / thickness",  unit: "",   defaultValue: 10,   askOnRun: true, group: "Roll details" },
      { key: "materialRate", label: "Material rate",      unit: "per mm", defaultValue: 12.0, askOnRun: true, group: "Roll details" },
      { key: "rollLength",   label: "Roll length",        unit: "m",  defaultValue: 100, group: "Roll details" },
      { key: "stockWidths",  label: "Stock widths sold",  unit: "in", isList: true, listValue: [48, 50, 52, 54, 56, 58, 60], group: "Roll details" },
      { key: "cutMin",       label: "Cutting range — min", unit: "in", defaultValue: 30, group: "Roll details" },
      { key: "cutMax",       label: "Cutting range — max", unit: "in", defaultValue: 50, group: "Roll details" },
      { key: "cutAllowance", label: "Allowance per cut",  unit: "in", defaultValue: 0.75, group: "Roll details" },
      ...FASTENING_INPUTS,
      { key: "labour",       label: "Labour",             unit: "Rs", defaultValue: 3, askOnRun: true, group: "Order details" },
      // The odds and ends a quote picks up that have no box of their own — a
      // rupee of printing, two of stitching. Per piece, like labour beside it,
      // and zero by default so it changes nothing until somebody types in it.
      PRINT_INPUT,
      { key: "others",       label: "Others",             unit: "Rs", defaultValue: 0, askOnRun: true, group: "Order details" },
      { key: "orderQty",     label: "Order quantity",     unit: "pcs", defaultValue: 10000, askOnRun: true, group: "Order details" },
    ],
    /* Grouped the way the cutting floor reads the job: what comes off the
       width, what comes off the length, then rolls, then buttons, and the
       money last. The groups only shape the working sheet — steps still run
       top to bottom, so the order here is the order of calculation. */
    steps: [
      { key: "acrossCount", label: "Pieces across",   expression: "bestFitCount(pieceWidth, stockWidths)", unit: "pcs", group: "Cutting" },
      { key: "rollWidth",   label: "Roll width used", expression: "bestFitStock(pieceWidth, stockWidths)", unit: "in", group: "Cutting" },
      // Gusset joins the length + flap sum and nothing else — every step below
      // reads baseCut, so they pick it up without being touched.
      { key: "baseCut",     label: "Base cut length", expression: "pieceLength * 2 + flap + guezzet", unit: "in", group: "Cutting" },
      { key: "lengthFactor",label: "Length multiple", expression: "scaleToRange(baseCut, cutMin, cutMax)", group: "Cutting" },
      // The allowance belongs here, not further down. It is blade and grip on
      // every cut the machine makes, so the length actually cut is the panel
      // plus the allowance — 24.5 x 2 + 0.75 = 49.75in, not 49. It used to be
      // added inside the repeats division instead, which worked out to the
      // same number of pieces but printed a cut length nobody could measure
      // against the machine.
      { key: "cutLength",   label: "Cut length",      expression: "baseCut * lengthFactor + cutAllowance", unit: "in", group: "Cutting" },
      // Ungrouped, so it stays off the working sheet: nobody at the machine
      // measures a roll in inches. The metres they do measure it in print in
      // the Rolls band below.
      { key: "rollInches",  label: "Roll length (inches)", expression: "convert(rollLength, m, in)", unit: "in" },
      // Layers is the raw division — how many cut lengths the roll holds. Only
      // whole layers can be cut, so repeats floors it. The exact figure is
      // working rather than an instruction, so it is ungrouped too and stays
      // on screen instead of on the paper; the floor cuts whole layers.
      { key: "layers",      label: "Layers — exact",  expression: "rollInches / cutLength" },
      { key: "repeats",     label: "Layers per roll", expression: "floor(layers)", group: "Cutting" },
      { key: "piecesPerRoll", label: "Pieces per roll", expression: "repeats * acrossCount * lengthFactor", unit: "pcs", group: "Cutting" },

      // The roll as the store issues it and the floor loads it — metres, the
      // number typed into the formula, not the inches the maths ran on.
      { key: "rollLengthM", label: "Roll length",     expression: "rollLength", unit: "m", group: "Rolls" },
      { key: "rollsNeeded", label: "Rolls required",  expression: "orderQty / piecesPerRoll", group: "Rolls" },
      // You can only buy whole rolls, so the fractional part of rollsNeeded is
      // never actually used up — it comes back off the last roll as leftover
      // stock, not scrap.
      { key: "rollsToBuy",     label: "Rolls to buy",         expression: "ceil(rollsNeeded)", group: "Rolls" },
      { key: "leftoverStockM", label: "Leftover into stock",  expression: "(rollsToBuy - rollsNeeded) * rollLength", unit: "m", group: "Rolls" },
      // cutLength already carries the allowance, so it is not added again here.
      { key: "wasteM",      label: "Waste per roll",  expression: "(rollInches - repeats * cutLength) / 39.37", unit: "m", group: "Rolls" },

      ...FASTENING_STEPS,

      // Roll cost is the film and nothing else — what the roll weighs times
      // what the material sells for.
      // All ungrouped: money never reaches the working sheet. That sheet goes
      // to whoever cuts the job, and a cutting instruction carrying the order
      // total is a rate sheet handed to the shop floor by accident. The cost
      // sheet is the one that carries it, and it goes to whoever quotes.
      { key: "rollCost",    label: "Roll cost",       expression: "materialRate * gauge * rollWidth * rollLength / densityDiv", unit: "Rs" },
      { key: "materialPerPc", label: "Material per piece", expression: "rollCost / piecesPerRoll", unit: "Rs" },
      { key: "costPerPc",   label: "Cost per piece",  expression: `materialPerPc + labour + ${FASTENING_COST} + printCost + others`, unit: "Rs" },
      { key: "orderCost",   label: "Order total",     expression: "costPerPc * orderQty", unit: "Rs" },
    ],
    /* Money first. The cost sheet prints these in the order they are written
       and it goes to whoever quotes, so the order total has no business
       sitting below a roll width. "Layers — exact" is gone: 79.14 is working,
       and the result card carries enough without it. */
    outputs: [
      { key: "costPerPc",     label: "Cost per piece",  unit: "Rs",  role: "cost_per_unit", primary: true },
      { key: "orderQty",      label: "Order quantity",  unit: "pcs", group: "Order" },
      // "at cost", said outright. The headline on the slip is the quoted rate
      // with profit on it, and profit is decided per quote on the run screen
      // rather than inside the formula — so this total is the cost total, and
      // a slip that let someone multiply the quoted rate by the quantity and
      // land on a different number would be worse than one that says so.
      { key: "orderCost",     label: "Order total at cost", unit: "Rs", group: "Order" },
      { key: "materialPerPc", label: "Material per piece", unit: "Rs", group: "Cost breakdown" },
      ...FASTENING_BREAKDOWN,
      { key: "labour",        label: "Labour per piece", unit: "Rs", group: "Cost breakdown" },
      { key: "printCost",     label: "Print per piece",  unit: "Rs", group: "Cost breakdown" },
      { key: "others",        label: "Others per piece", unit: "Rs", group: "Cost breakdown" },
      { key: "rollCost",      label: "Roll cost",       unit: "Rs",  role: "cost_per_batch", group: "Cost breakdown" },
      { key: "piecesPerRoll", label: "Pieces per roll", unit: "pcs", role: "units_per_batch", group: "Cutting" },
      { key: "acrossCount",   label: "Pieces across",   unit: "pcs", group: "Cutting" },
      { key: "rollWidth",     label: "Roll width",      unit: "in", group: "Cutting" },
      { key: "cutLength",     label: "Cut length",      unit: "in", group: "Cutting" },
      { key: "repeats",       label: "Layers per roll", group: "Cutting" },
      { key: "rollsNeeded",   label: "Rolls required",  group: "Rolls" },
      { key: "rollsToBuy",       label: "Rolls to buy", group: "Rolls" },
      { key: "leftoverStockM",   label: "Leftover → waste stock", unit: "m", group: "Rolls" },
      { key: "wasteM",        label: "Waste per roll",  unit: "m",   role: "waste_qty", group: "Rolls" },
      ...FASTENING_OUTPUTS,
    ],
  },

  {
    templateId: "two-panel-bag",
    name: "Two-panel bag (different front & back material)",
    category: "Packaging",
    version: 1,
    summary:
      "A bag whose two faces come off two different rolls — frosty front, PVC back. Each face is costed on its own roll, then the two per-piece costs are added.",
    description:
      "Use this instead of Roll → Pieces when the front and back are not the same film. Roll → Pieces cuts one panel of 'length x 2' out of a single roll; here the back is cut at length + flap from its own roll and the front at length from another, each with its own rate, gauge and stock widths.",
    inputs: [
      { key: "bagWidth",     label: "Bag width",            unit: "in", defaultValue: 12,   askOnRun: true, group: "Bag details" },
      { key: "bagLength",    label: "Bag length",           unit: "in", defaultValue: 15,   askOnRun: true, group: "Bag details" },
      { key: "flap",         label: "Flap / seal (back only)", unit: "in", defaultValue: 2.5, askOnRun: true, group: "Bag details" },
      // Gusset rides on the back panel, the same way it rides on the base cut
      // in Roll → Pieces. Zero by default so a plain two-panel bag is unaffected.
      { key: "guezzet",      label: "Guezzet (back only)",  unit: "in", defaultValue: 0,    askOnRun: true, group: "Bag details" },

      // Each roll carries its own length and cutting setup: PVC comes in 100 m
      // or 50 m rolls while frosty is always 50 m, so one shared roll length
      // costs one of the two faces wrongly.
      //
      // Either film can be bought at a flat price per roll (frosty, 12 gauge,
      // 60" — Rs 8,000) rather than worked out from a rate. The rate is the
      // default; anything above zero in a roll's fixed rate is that roll's cost
      // outright, and the material rate steps aside. Gauge stays open — it is
      // still the film being bought, fixed price or not.
      { key: "backRate",     label: "Back material rate",   unit: "per mm", defaultValue: 12, askOnRun: true, group: "Back roll", disabledWhenSet: "backFixedRate" },
      { key: "backGauge",    label: "Back gauge",           unit: "",   defaultValue: 10,   askOnRun: true, group: "Back roll" },
      { key: "backWidths",   label: "Back stock widths",    unit: "in", isList: true, listValue: [48, 50, 52, 54, 56, 58, 60], group: "Back roll" },
      { key: "backFixedRate", label: "Fixed rate (per roll)", unit: "Rs", defaultValue: 0, askOnRun: true, group: "Back roll" },
      { key: "backRollLength",   label: "Roll length",         unit: "m",  defaultValue: 100, askOnRun: true, group: "Back roll" },
      { key: "backCutMin",       label: "Cutting range — min", unit: "in", defaultValue: 30, group: "Back roll" },
      { key: "backCutMax",       label: "Cutting range — max", unit: "in", defaultValue: 50, group: "Back roll" },
      { key: "backCutAllowance", label: "Allowance per cut",   unit: "in", defaultValue: 0.75, group: "Back roll" },

      { key: "frontRate",    label: "Front material rate",  unit: "per mm", defaultValue: 15, askOnRun: true, group: "Front roll", disabledWhenSet: "frontFixedRate" },
      { key: "frontGauge",   label: "Front gauge",          unit: "",   defaultValue: 8,    askOnRun: true, group: "Front roll" },
      { key: "frontWidths",  label: "Front stock widths",   unit: "in", isList: true, listValue: [48, 50, 52, 54, 56, 58, 60], group: "Front roll" },
      { key: "frontFixedRate", label: "Fixed rate (per roll)", unit: "Rs", defaultValue: 0, askOnRun: true, group: "Front roll" },
      { key: "frontRollLength",   label: "Roll length",         unit: "m",  defaultValue: 50, askOnRun: true, group: "Front roll" },
      { key: "frontCutMin",       label: "Cutting range — min", unit: "in", defaultValue: 30, group: "Front roll" },
      { key: "frontCutMax",       label: "Cutting range — max", unit: "in", defaultValue: 50, group: "Front roll" },
      { key: "frontCutAllowance", label: "Allowance per cut",   unit: "in", defaultValue: 0.75, group: "Front roll" },

      // Fastened exactly as a single bag is, once per bag — the two rolls
      // have nothing to do with it.
      ...FASTENING_INPUTS,
      { key: "labour",       label: "Labour",               unit: "Rs", defaultValue: 3,  askOnRun: true, group: "Order details" },
      PRINT_INPUT,
      // Same catch-all as Roll → Pieces: per bag, zero until it is used.
      { key: "others",       label: "Others",               unit: "Rs", defaultValue: 0,  askOnRun: true, group: "Order details" },
      { key: "orderQty",     label: "Order quantity",       unit: "pcs", defaultValue: 10000, askOnRun: true, group: "Order details" },
    ],
    steps: [

      /* Back panel — 1 width x (1 length + flap) */
      { key: "backRollInches", label: "Back roll length",     expression: "convert(backRollLength, m, in)", unit: "in" },
      { key: "backAcross",    label: "Back panels across",    expression: "bestFitCount(bagWidth, backWidths)" },
      { key: "backRollWidth", label: "Back roll width used",  expression: "bestFitStock(bagWidth, backWidths)", unit: "in" },
      { key: "backBaseCut",   label: "Back base cut",         expression: "bagLength + flap + guezzet", unit: "in" },
      { key: "backFactor",    label: "Back length multiple",  expression: "scaleToRange(backBaseCut, backCutMin, backCutMax)" },
      // Allowance inside the cut length, same as Roll → Pieces.
      { key: "backCutLength", label: "Back cut length",       expression: "backBaseCut * backFactor + backCutAllowance", unit: "in" },
      { key: "backRepeats",   label: "Back layers per roll",  expression: "floor(backRollInches / backCutLength)" },
      { key: "backPerRoll",   label: "Back panels per roll",  expression: "backRepeats * backAcross * backFactor", unit: "pcs" },
      { key: "backRollCost",  label: "Back roll cost",        expression: "if(backFixedRate > 0, backFixedRate, backRate * backGauge * backRollWidth * backRollLength / densityDiv)", unit: "Rs" },
      { key: "backPerPc",     label: "Back cost per bag",     expression: "backRollCost / backPerRoll", unit: "Rs" },

      /* Front panel — 1 width x 1 length, no flap */
      { key: "frontRollInches", label: "Front roll length",   expression: "convert(frontRollLength, m, in)", unit: "in" },
      { key: "frontAcross",    label: "Front panels across",    expression: "bestFitCount(bagWidth, frontWidths)" },
      { key: "frontRollWidth", label: "Front roll width used",  expression: "bestFitStock(bagWidth, frontWidths)", unit: "in" },
      { key: "frontBaseCut",   label: "Front base cut",         expression: "bagLength", unit: "in" },
      { key: "frontFactor",    label: "Front length multiple",  expression: "scaleToRange(frontBaseCut, frontCutMin, frontCutMax)" },
      { key: "frontCutLength", label: "Front cut length",       expression: "frontBaseCut * frontFactor + frontCutAllowance", unit: "in" },
      { key: "frontRepeats",   label: "Front layers per roll",  expression: "floor(frontRollInches / frontCutLength)" },
      { key: "frontPerRoll",   label: "Front panels per roll",  expression: "frontRepeats * frontAcross * frontFactor", unit: "pcs" },
      { key: "frontRollCost",  label: "Front roll cost",        expression: "if(frontFixedRate > 0, frontFixedRate, frontRate * frontGauge * frontRollWidth * frontRollLength / densityDiv)", unit: "Rs" },
      { key: "frontPerPc",     label: "Front cost per bag",     expression: "frontRollCost / frontPerRoll", unit: "Rs" },

      ...FASTENING_STEPS,

      /* The bag */
      { key: "materialPerPc", label: "Material per bag",  expression: "backPerPc + frontPerPc", unit: "Rs" },
      { key: "costPerPc",     label: "Cost per bag",      expression: `materialPerPc + labour + ${FASTENING_COST} + printCost + others`, unit: "Rs" },
      { key: "backRolls",     label: "Back rolls required",  expression: "orderQty / backPerRoll" },
      { key: "frontRolls",    label: "Front rolls required", expression: "orderQty / frontPerRoll" },
      { key: "backWasteM",    label: "Back waste per roll",  expression: "(backRollInches - backRepeats * backCutLength) / 39.37", unit: "m" },
      { key: "frontWasteM",   label: "Front waste per roll", expression: "(frontRollInches - frontRepeats * frontCutLength) / 39.37", unit: "m" },
      { key: "orderCost",     label: "Order total",       expression: "costPerPc * orderQty", unit: "Rs" },
    ],
    outputs: [
      { key: "costPerPc",    label: "Cost per bag",         unit: "Rs",  role: "cost_per_unit", primary: true },
      { key: "backPerPc",    label: "Back cost per bag",    unit: "Rs" },
      { key: "frontPerPc",   label: "Front cost per bag",   unit: "Rs" },
      { key: "backPerRoll",  label: "Back panels per roll", unit: "pcs", role: "units_per_batch" },
      { key: "frontPerRoll", label: "Front panels per roll", unit: "pcs" },
      { key: "backCutLength",  label: "Back cut length",    unit: "in" },
      { key: "frontCutLength", label: "Front cut length",   unit: "in" },
      { key: "backRollCost", label: "Back roll cost",       unit: "Rs",  role: "cost_per_batch" },
      { key: "backRolls",    label: "Back rolls required" },
      { key: "frontRolls",   label: "Front rolls required" },
      { key: "backWasteM",   label: "Back waste per roll",  unit: "m",   role: "waste_qty" },
      { key: "orderCost",    label: "Order total",          unit: "Rs" },
      ...FASTENING_BREAKDOWN,
      { key: "printCost",    label: "Print per bag",        unit: "Rs" },
      ...FASTENING_OUTPUTS,
    ],
  },

  /* ─────────────────────── Textile & Garments ─────────────────────── */
  {
    templateId: "garment-fabric",
    name: "Garment fabric consumption",
    category: "Textile & Garments",
    version: 1,
    summary: "Fabric per garment from marker length and width, plus wastage, trims and stitching.",
    description: "Adjust the wastage percentage to your own marker efficiency.",
    inputs: [
      { key: "markerLength", label: "Marker length per garment", unit: "in", defaultValue: 62, askOnRun: true, group: "Garment details" },
      { key: "garmentsWide", label: "Garments across marker",    unit: "",   defaultValue: 2, askOnRun: true, group: "Garment details" },
      { key: "fabricWidth",  label: "Fabric width",              unit: "in", defaultValue: 58, group: "Fabric details" },
      { key: "fabricRate",   label: "Fabric rate",               unit: "per m", defaultValue: 320, askOnRun: true, group: "Fabric details" },
      { key: "wastagePct",   label: "Cutting wastage",           unit: "%",  defaultValue: 8, group: "Fabric details" },
      { key: "trims",        label: "Trims per garment",         unit: "Rs", defaultValue: 45, askOnRun: true, group: "Order details" },
      { key: "stitching",    label: "Stitching per garment",     unit: "Rs", defaultValue: 120, askOnRun: true, group: "Order details" },
      { key: "orderQty",     label: "Order quantity",            unit: "pcs", defaultValue: 500, askOnRun: true, group: "Order details" },
    ],
    steps: [
      { key: "netLength",  label: "Net fabric per garment",   expression: "markerLength / garmentsWide", unit: "in" },
      { key: "grossLength",label: "With wastage",             expression: "addPct(netLength, wastagePct)", unit: "in" },
      { key: "metres",     label: "Fabric per garment",       expression: "convert(grossLength, in, m)", unit: "m" },
      { key: "fabricCost", label: "Fabric cost per garment",  expression: "metres * fabricRate", unit: "Rs" },
      { key: "costPerPc",  label: "Cost per garment",         expression: "fabricCost + trims + stitching", unit: "Rs" },
      { key: "orderCost",  label: "Order total",              expression: "costPerPc * orderQty", unit: "Rs" },
      { key: "fabricNeeded", label: "Fabric required",        expression: "metres * orderQty", unit: "m" },
    ],
    outputs: [
      { key: "costPerPc",    label: "Cost per garment", unit: "Rs", role: "cost_per_unit", primary: true },
      { key: "metres",       label: "Fabric per garment", unit: "m", role: "material_qty" },
      { key: "fabricCost",   label: "Fabric cost",      unit: "Rs" },
      { key: "fabricNeeded", label: "Fabric required",  unit: "m" },
      { key: "orderCost",    label: "Order total",      unit: "Rs" },
    ],
  },

  /* ───────────────────────────── Printing ─────────────────────────── */
  {
    templateId: "sheet-imposition",
    name: "Sheet imposition (cards, labels, cartons)",
    category: "Printing",
    version: 1,
    summary: "Ups per parent sheet in both grain directions, plus makeready waste and ink.",
    inputs: [
      { key: "pieceW",      label: "Width",         unit: "in", defaultValue: 3.5, askOnRun: true, group: "Piece details" },
      { key: "pieceH",      label: "Piece height",        unit: "in", defaultValue: 2,   askOnRun: true, group: "Piece details" },
      { key: "sheetW",      label: "Parent sheet width",  unit: "in", defaultValue: 25, group: "Sheet details" },
      { key: "sheetH",      label: "Parent sheet height", unit: "in", defaultValue: 36, group: "Sheet details" },
      { key: "sheetRate",   label: "Rate per sheet",      unit: "Rs", defaultValue: 14, askOnRun: true, group: "Sheet details" },
      { key: "makeready",   label: "Makeready sheets",    unit: "sheets", defaultValue: 150, group: "Press details" },
      { key: "inkPerSheet", label: "Ink & plate per sheet", unit: "Rs", defaultValue: 2.5, group: "Press details" },
      { key: "orderQty",    label: "Order quantity",      unit: "pcs", defaultValue: 5000, askOnRun: true, group: "Order details" },
    ],
    steps: [
      { key: "upsA",       label: "Ups — grain long",  expression: "fitCount(pieceW, sheetW) * fitCount(pieceH, sheetH)" },
      { key: "upsB",       label: "Ups — grain short", expression: "fitCount(pieceH, sheetW) * fitCount(pieceW, sheetH)" },
      { key: "ups",        label: "Ups per sheet",     expression: "max(upsA, upsB)" },
      { key: "sheetsNeeded", label: "Sheets required", expression: "ceil(orderQty / ups) + makeready", unit: "sheets" },
      { key: "paperCost",  label: "Paper cost",        expression: "sheetsNeeded * sheetRate", unit: "Rs" },
      { key: "inkCost",    label: "Ink & plates",      expression: "sheetsNeeded * inkPerSheet", unit: "Rs" },
      { key: "orderCost",  label: "Order total",       expression: "paperCost + inkCost", unit: "Rs" },
      { key: "costPerPc",  label: "Cost per piece",    expression: "orderCost / orderQty", unit: "Rs" },
    ],
    outputs: [
      { key: "costPerPc",    label: "Cost per piece",  unit: "Rs", role: "cost_per_unit", primary: true },
      { key: "ups",          label: "Ups per sheet",   role: "units_per_batch" },
      { key: "sheetsNeeded", label: "Sheets required", unit: "sheets", role: "material_qty" },
      { key: "orderCost",    label: "Order total",     unit: "Rs" },
    ],
  },

  /* ─────────────────────── Wood & Furniture ───────────────────────── */
  {
    templateId: "panel-cutting",
    name: "Panel cutting (board → parts)",
    category: "Wood & Furniture",
    version: 1,
    summary: "Parts cut from a standard board allowing for saw kerf, plus edge banding.",
    inputs: [
      { key: "partW",     label: "Part width",     unit: "in", defaultValue: 18, askOnRun: true, group: "Part details" },
      { key: "partH",     label: "Part height",    unit: "in", defaultValue: 24, askOnRun: true, group: "Part details" },
      { key: "boardW",    label: "Board width",    unit: "in", defaultValue: 48, group: "Board details" },
      { key: "boardH",    label: "Board height",   unit: "in", defaultValue: 96, group: "Board details" },
      { key: "kerf",      label: "Saw kerf",       unit: "in", defaultValue: 0.125, group: "Board details" },
      { key: "boardRate", label: "Rate per board", unit: "Rs", defaultValue: 4200, askOnRun: true, group: "Board details" },
      { key: "edgeRate",  label: "Edge banding",   unit: "per m", defaultValue: 35, group: "Rates" },
      { key: "labour",    label: "Labour per part", unit: "Rs", defaultValue: 60, askOnRun: true, group: "Rates" },
    ],
    steps: [
      { key: "acrossW",    label: "Parts across",    expression: "fitCount(partW + kerf, boardW)" },
      { key: "acrossH",    label: "Parts down",      expression: "fitCount(partH + kerf, boardH)" },
      { key: "perBoard",   label: "Parts per board", expression: "acrossW * acrossH" },
      { key: "materialPerPart", label: "Board cost per part", expression: "boardRate / perBoard", unit: "Rs" },
      { key: "edgeMetres", label: "Edge per part",   expression: "convert((partW + partH) * 2, in, m)", unit: "m" },
      { key: "edgeCost",   label: "Edge cost",       expression: "edgeMetres * edgeRate", unit: "Rs" },
      { key: "costPerPart",label: "Cost per part",   expression: "materialPerPart + edgeCost + labour", unit: "Rs" },
    ],
    outputs: [
      { key: "costPerPart", label: "Cost per part",   unit: "Rs", role: "cost_per_unit", primary: true },
      { key: "perBoard",    label: "Parts per board", role: "units_per_batch" },
      { key: "materialPerPart", label: "Board cost per part", unit: "Rs" },
    ],
  },

  /* ───────────────────── Metal & Fabrication ──────────────────────── */
  {
    templateId: "sheet-metal-blanks",
    name: "Sheet metal blanks",
    category: "Metal & Fabrication",
    version: 1,
    summary: "Blanks nested on a sheet priced by weight, with scrap recovery.",
    inputs: [
      { key: "blankW",    label: "Blank width",        unit: "mm", defaultValue: 120, askOnRun: true, group: "Blank details" },
      { key: "blankH",    label: "Blank height",       unit: "mm", defaultValue: 80,  askOnRun: true, group: "Blank details" },
      { key: "thickness", label: "Thickness",          unit: "mm", defaultValue: 1.2, askOnRun: true, group: "Blank details" },
      { key: "sheetW",    label: "Sheet width",        unit: "mm", defaultValue: 1220, group: "Sheet details" },
      { key: "sheetH",    label: "Sheet height",       unit: "mm", defaultValue: 2440, group: "Sheet details" },
      { key: "metalRate", label: "Metal rate",         unit: "per kg", defaultValue: 340, askOnRun: true, group: "Sheet details" },
      { key: "scrapRate", label: "Scrap recovery",     unit: "per kg", defaultValue: 90, group: "Sheet details" },
      { key: "density",   label: "Density",            unit: "g/cm³", defaultValue: 7.85, group: "Sheet details" },
      { key: "labour",    label: "Labour per blank",   unit: "Rs", defaultValue: 12, askOnRun: true, group: "Rates" },
    ],
    steps: [
      { key: "across",     label: "Blanks across",   expression: "fitCount(blankW, sheetW)" },
      { key: "down",       label: "Blanks down",     expression: "fitCount(blankH, sheetH)" },
      { key: "perSheet",   label: "Blanks per sheet",expression: "across * down" },
      { key: "sheetKg",    label: "Sheet weight",    expression: "sheetW * sheetH * thickness * density / 1000000", unit: "kg" },
      { key: "sheetCost",  label: "Sheet cost",      expression: "sheetKg * metalRate", unit: "Rs" },
      { key: "usedArea",   label: "Used area",       expression: "perSheet * blankW * blankH" },
      { key: "scrapKg",    label: "Scrap weight",    expression: "(sheetW * sheetH - usedArea) * thickness * density / 1000000", unit: "kg" },
      { key: "scrapValue", label: "Scrap value",     expression: "scrapKg * scrapRate", unit: "Rs" },
      { key: "netSheet",   label: "Net sheet cost",  expression: "sheetCost - scrapValue", unit: "Rs" },
      { key: "costPerBlank", label: "Cost per blank",expression: "netSheet / perSheet + labour", unit: "Rs" },
    ],
    outputs: [
      { key: "costPerBlank", label: "Cost per blank",   unit: "Rs", role: "cost_per_unit", primary: true },
      { key: "perSheet",     label: "Blanks per sheet", role: "units_per_batch" },
      { key: "scrapKg",      label: "Scrap per sheet",  unit: "kg", role: "waste_qty" },
      { key: "netSheet",     label: "Net sheet cost",   unit: "Rs", role: "cost_per_batch" },
    ],
  },

  /* ────────────────────── Food & Beverage ─────────────────────────── */
  {
    templateId: "recipe-batch",
    name: "Recipe batch yield",
    category: "Food & Beverage",
    version: 1,
    summary: "Batch cost against finished yield after cooking loss, down to one pack.",
    inputs: [
      { key: "batchInputKg", label: "Raw input per batch", unit: "kg", defaultValue: 100, askOnRun: true, group: "Batch details" },
      { key: "inputRate",    label: "Raw material rate",   unit: "per kg", defaultValue: 210, askOnRun: true, group: "Batch details" },
      { key: "yieldPct",     label: "Yield after loss",    unit: "%", defaultValue: 82, group: "Batch details" },
      { key: "packSize",     label: "Pack size",           unit: "kg", defaultValue: 0.5, askOnRun: true, group: "Pack details" },
      { key: "packCost",     label: "Packaging per pack",  unit: "Rs", defaultValue: 18, group: "Pack details" },
      { key: "batchLabour",  label: "Labour per batch",    unit: "Rs", defaultValue: 3500, askOnRun: true, group: "Batch costs" },
      { key: "batchOverhead",label: "Overhead per batch",  unit: "Rs", defaultValue: 2200, group: "Batch costs" },
    ],
    steps: [
      { key: "outputKg",   label: "Finished output",   expression: "batchInputKg * yieldPct / 100", unit: "kg" },
      { key: "packs",      label: "Packs per batch",   expression: "floor(outputKg / packSize)" },
      { key: "materialCost", label: "Material cost",   expression: "batchInputKg * inputRate", unit: "Rs" },
      { key: "batchCost",  label: "Batch cost",        expression: "materialCost + batchLabour + batchOverhead + packs * packCost", unit: "Rs" },
      { key: "costPerPack",label: "Cost per pack",     expression: "batchCost / packs", unit: "Rs" },
      { key: "lossKg",     label: "Process loss",      expression: "batchInputKg - outputKg", unit: "kg" },
    ],
    outputs: [
      { key: "costPerPack", label: "Cost per pack",  unit: "Rs", role: "cost_per_unit", primary: true },
      { key: "packs",       label: "Packs per batch", role: "units_per_batch" },
      { key: "batchCost",   label: "Batch cost",     unit: "Rs", role: "cost_per_batch" },
      { key: "lossKg",      label: "Process loss",   unit: "kg", role: "waste_qty" },
    ],
  },

  /* ──────────────────── Plastics & Moulding ───────────────────────── */
  {
    templateId: "injection-moulding",
    name: "Injection moulding shot cost",
    category: "Plastics & Moulding",
    version: 1,
    summary: "Cost per moulded part from shot weight, cavities and machine hour rate.",
    inputs: [
      { key: "partWeightG", label: "Part weight",        unit: "g", defaultValue: 24, askOnRun: true, group: "Part & mould" },
      { key: "cavities",    label: "Cavities in mould",  unit: "",  defaultValue: 4, askOnRun: true, group: "Part & mould" },
      { key: "runnerG",     label: "Runner per shot",    unit: "g", defaultValue: 12, group: "Part & mould" },
      { key: "resinRate",   label: "Resin rate",         unit: "per kg", defaultValue: 265, askOnRun: true, group: "Material" },
      { key: "cycleSec",    label: "Cycle time",         unit: "sec", defaultValue: 28, askOnRun: true, group: "Machine" },
      { key: "machineRate", label: "Machine hour rate",  unit: "per hr", defaultValue: 900, group: "Machine" },
      { key: "rejectPct",   label: "Reject rate",        unit: "%", defaultValue: 3, group: "Machine" },
    ],
    steps: [
      { key: "shotG",       label: "Shot weight",        expression: "partWeightG * cavities + runnerG", unit: "g" },
      { key: "resinPerPart",label: "Resin per part",     expression: "shotG / cavities / 1000", unit: "kg" },
      { key: "resinCost",   label: "Resin cost",         expression: "resinPerPart * resinRate", unit: "Rs" },
      { key: "machinePerPart", label: "Machine cost",    expression: "cycleSec / 3600 * machineRate / cavities", unit: "Rs" },
      { key: "grossCost",   label: "Cost before rejects",expression: "resinCost + machinePerPart", unit: "Rs" },
      { key: "costPerPart", label: "Cost per part",      expression: "addPct(grossCost, rejectPct)", unit: "Rs" },
      { key: "partsPerHour",label: "Parts per hour",     expression: "floor(3600 / cycleSec * cavities)" },
    ],
    outputs: [
      { key: "costPerPart",  label: "Cost per part",  unit: "Rs", role: "cost_per_unit", primary: true },
      { key: "partsPerHour", label: "Parts per hour" },
      { key: "resinPerPart", label: "Resin per part", unit: "kg", role: "material_qty" },
    ],
  },

  /* ───────────────────────────── General ──────────────────────────── */
  {
    templateId: "simple-markup",
    name: "Material + labour + overhead",
    category: "General",
    version: 1,
    summary: "The plainest costing there is. A good starting point for a new formula.",
    inputs: [
      { key: "materialCost", label: "Material cost per unit", unit: "Rs", defaultValue: 100, askOnRun: true },
      { key: "labour",       label: "Labour per unit",        unit: "Rs", defaultValue: 25, askOnRun: true },
      { key: "overheadPct",  label: "Overhead",               unit: "%",  defaultValue: 15 },
      { key: "marginPct",    label: "Target margin",          unit: "%",  defaultValue: 30, askOnRun: true },
    ],
    steps: [
      { key: "overhead",  label: "Overhead",       expression: "pct(materialCost + labour, overheadPct)", unit: "Rs" },
      { key: "costPerPc", label: "Cost per unit",  expression: "materialCost + labour + overhead", unit: "Rs" },
      { key: "sellPrice", label: "Selling price",  expression: "costPerPc / (1 - marginPct / 100)", unit: "Rs" },
      { key: "profit",    label: "Profit per unit",expression: "sellPrice - costPerPc", unit: "Rs" },
    ],
    outputs: [
      { key: "costPerPc", label: "Cost per unit",   unit: "Rs", role: "cost_per_unit", primary: true },
      { key: "sellPrice", label: "Selling price",   unit: "Rs" },
      { key: "profit",    label: "Profit per unit", unit: "Rs" },
    ],
  },
];

export function getTemplate(id: string): FormulaTemplate | undefined {
  return FORMULA_TEMPLATES.find((t) => t.templateId === id);
}

/* ─────────────────────── Saved-formula upgrades ─────────────────────── */

/**
 * A formula is saved as a copy of its template, so a template learning
 * something new never reaches the copies already in use. This carries each
 * roll's fixed per-roll rate into Two-panel bag copies made before it existed
 * — only where that roll's cost is still the template's own expression, so a
 * step an author has rewritten is never touched.
 */
export function upgradeSavedFormula<T extends Pick<CostingFormula, "inputs" | "steps" | "outputs">>(f: T): T {
  const rolls = splitRollDetails(ungreyGauge((["back", "front"] as const).reduce(addFixedRollRate, f)));
  return addPrint(addKundaZip(addTwoPanelFastening(rolls)));
}

type Upgradable = Pick<CostingFormula, "inputs" | "steps" | "outputs">;

/** Gauge was briefly greyed with the rate under a fixed price; only the rate is. */
function ungreyGauge<T extends Upgradable>(f: T): T {
  const stuck = (i: FormulaInput) => (i.key === "backGauge" || i.key === "frontGauge") && !!i.disabledWhenSet;
  if (!f.inputs.some(stuck)) return f;
  return { ...f, inputs: f.inputs.map((i) => { if (!stuck(i)) return i; const { disabledWhenSet: _, ...rest } = i; return rest; }) };
}
const reads = (expr: string, key: string) => new RegExp(`\\b${key}\\b`).test(expr);
const clone = <X,>(rows: X[]): X[] => rows.map((r) => JSON.parse(JSON.stringify(r)));

/**
 * Two-panel copies carried one flat "Button / Tape" rupee box. They get the
 * same fastening section a single bag has. The flat box goes only while it
 * is zero — a figure someone has typed in stays and keeps being charged.
 */
function addTwoPanelFastening<T extends Upgradable>(f: T): T {
  if (!f.inputs.some((i) => i.key === "backRate") || !f.inputs.some((i) => i.key === "frontRate")) return f;
  if (f.inputs.some((i) => i.key === "fitting")) return f;
  const costIdx = f.steps.findIndex((s) => s.key === "costPerPc");
  if (costIdx < 0 || !f.inputs.some((i) => i.key === "orderQty")) return f;

  const flat = f.inputs.find((i) => i.key === "buttonTape");
  const onlyInCost = !f.steps.some((s, idx) => idx !== costIdx && reads(s.expression, "buttonTape"));
  const dropFlat = !!flat && !flat.defaultValue && onlyInCost && reads(f.steps[costIdx].expression, "buttonTape");

  const inputs = dropFlat ? f.inputs.filter((i) => i.key !== "buttonTape") : [...f.inputs];
  const labourAt = inputs.findIndex((i) => i.key === "labour");
  // Button is the default choice, and the template's example button would
  // quietly add Rs 3 to every saved quote. The flat box they had was zero, so
  // the button starts at zero too — the operator types in their own.
  const fastening = clone(FASTENING_INPUTS).map((i) =>
    flat && !flat.defaultValue && (i.key === "buttonsPerPc" || i.key === "buttonLabour") ? { ...i, defaultValue: 0 } : i);
  inputs.splice(labourAt < 0 ? inputs.length : labourAt, 0, ...fastening);

  const steps = [...f.steps];
  const cost = steps[costIdx];
  steps[costIdx] = {
    ...cost,
    expression: dropFlat
      ? cost.expression.replace(/\bbuttonTape\b/, FASTENING_COST)
      : `${cost.expression} + ${FASTENING_COST}`,
  };
  steps.splice(costIdx, 0, ...clone(FASTENING_STEPS));

  const have = new Set(f.outputs.map((o) => o.key));
  const outputs = [...f.outputs, ...clone([...FASTENING_BREAKDOWN, ...FASTENING_OUTPUTS]).filter((o) => !have.has(o.key))];
  return { ...f, inputs, steps, outputs };
}

/** Button / Tape choices written before Kunda and Zip existed get both. */
function addKundaZip<T extends Upgradable>(f: T): T {
  const fitting = f.inputs.find((i) => i.key === "fitting");
  if (!fitting?.options || fitting.options.length !== 2) return f;
  const costIdx = f.steps.findIndex((s) => s.key === "costPerPc");
  if (costIdx < 0 || !reads(f.steps[costIdx].expression, "tapeCostPerPc")) return f;
  if (f.inputs.some((i) => i.key === "kundaPerPc" || i.key === "zipPerPc")) return f;

  const isNew = (k: string) => k.startsWith("kunda") || k.startsWith("zip");
  const inputs = f.inputs.map((i) => (i.key === "fitting" ? { ...i, options: [...fitting.options!, "Kunda", "Zip"] } : i));
  let lastIn = inputs.findIndex((i) => i.key === "fitting");
  inputs.forEach((i, idx) => { if (i.showWhen?.key === "fitting") lastIn = idx; });
  inputs.splice(lastIn + 1, 0, ...clone(FASTENING_INPUTS.filter((i) => isNew(i.key)))
    .map((i) => ({ ...i, ...(fitting.group ? { group: fitting.group } : {}) })));

  const steps = f.steps.map((s) =>
    s.key === "costPerPc"
      ? { ...s, expression: s.expression.replace(/\btapeCostPerPc\b/, "tapeCostPerPc + kundaCostPerPc + zipCostPerPc") }
      : s);
  let lastStep = -1;
  steps.forEach((s, idx) => { if (s.showWhen?.key === "fitting") lastStep = idx; });
  steps.splice(Math.min(lastStep < 0 ? costIdx : lastStep + 1, costIdx), 0, ...clone(FASTENING_STEPS.filter((s) => isNew(s.key))));

  const outputs = [...f.outputs];
  const after = (key: string, rows: FormulaOutput[]) => {
    const at = outputs.findIndex((o) => o.key === key);
    outputs.splice(at < 0 ? outputs.length : at + 1, 0, ...clone(rows));
  };
  if (outputs.some((o) => o.key === "tapeCostPerPc")) after("tapeCostPerPc", FASTENING_BREAKDOWN.filter((o) => isNew(o.key)));
  after("tapeTotal", FASTENING_OUTPUTS.filter((o) => isNew(o.key)));
  return { ...f, inputs, steps, outputs };
}

/** A Print box beside Others, added into the cost the same way. */
function addPrint<T extends Upgradable>(f: T): T {
  if (f.inputs.some((i) => i.key === "printCost")) return f;
  const others = f.inputs.find((i) => i.key === "others");
  const costIdx = f.steps.findIndex((s) => s.key === "costPerPc");
  if (!others || costIdx < 0 || !reads(f.steps[costIdx].expression, "others")) return f;
  // Only the bag templates — a formula of some other trade that happens to
  // have an "others" box is not asked about printing.
  if (!f.inputs.some((i) => i.key === "stockWidths" || i.key === "backWidths")) return f;

  const inputs = [...f.inputs];
  inputs.splice(inputs.indexOf(others), 0, { ...PRINT_INPUT, ...(others.group ? { group: others.group } : {}) });
  const steps = f.steps.map((s, idx) =>
    idx === costIdx ? { ...s, expression: s.expression.replace(/\bothers\b/, "printCost + others") } : s);
  const outputs = [...f.outputs];
  const oAt = outputs.findIndex((o) => o.key === "others");
  if (oAt >= 0) outputs.splice(oAt, 0, { key: "printCost", label: "Print per piece", unit: "Rs", ...(outputs[oAt].group ? { group: outputs[oAt].group } : {}) });
  return { ...f, inputs, steps, outputs };
}

const SHARED_ROLL_KEYS = ["rollLength", "cutMin", "cutMax", "cutAllowance"] as const;
const rollKey = (side: "back" | "front", k: string) => side + k[0].toUpperCase() + k.slice(1);

/**
 * Two-panel copies made while both faces shared one Roll details block get
 * a length and cutting setup of their own on each roll. Each side starts on
 * the value the shared box held, so a saved quote works out exactly as it did
 * until someone changes it. Only the back… and front… steps are rewritten;
 * the shared inputs go only once nothing reads them any more.
 */
function splitRollDetails<T extends Pick<CostingFormula, "inputs" | "steps" | "outputs">>(f: T): T {
  if (!f.inputs.some((i) => i.key === "backRate") || !f.inputs.some((i) => i.key === "frontRate")) return f;
  if (f.inputs.some((i) => i.key === "backRollLength" || i.key === "frontRollLength")) return f;
  if (!f.inputs.some((i) => i.key === "rollLength")) return f;

  const tpl = FORMULA_TEMPLATES.find((t) => t.templateId === "two-panel-bag")!;
  let inputs = [...f.inputs];
  for (const side of ["back", "front"] as const) {
    const rows = SHARED_ROLL_KEYS.flatMap((k) => {
      const shared = f.inputs.find((i) => i.key === k);
      const row = tpl.inputs.find((i) => i.key === rollKey(side, k));
      if (!shared || !row) return [];
      return [{ ...row, defaultValue: shared.defaultValue ?? row.defaultValue }];
    });
    const rate = inputs.find((i) => i.key === `${side}Rate`)!;
    let at = inputs.length;
    inputs.forEach((i, idx) => { if ((i.group ?? "") === (rate.group ?? "")) at = idx + 1; });
    inputs.splice(at, 0, ...rows.map((r) => ({ ...r, ...(rate.group ? { group: rate.group } : {}) })));
  }

  const rename = (expr: string, side: "back" | "front") =>
    ["rollInches", ...SHARED_ROLL_KEYS].reduce(
      (e, k) => (inputs.some((i) => i.key === rollKey(side, k)) || k === "rollInches"
        ? e.replace(new RegExp(`\\b${k}\\b`, "g"), rollKey(side, k))
        : e),
      expr,
    );
  const steps = f.steps.map((s) => {
    const side = s.key.startsWith("back") ? "back" : s.key.startsWith("front") ? "front" : null;
    return side ? { ...s, expression: rename(s.expression, side) } : s;
  });
  // The one shared "roll length in inches" step becomes one per roll.
  const ri = steps.findIndex((s) => s.key === "rollInches");
  if (ri >= 0 && !steps.some((s, idx) => idx !== ri && /\brollInches\b/.test(s.expression))) {
    const lengthStep = (side: "back" | "front") => tpl.steps.find((s) => s.key === `${side}RollInches`)!;
    steps.splice(ri, 1);
    const firstOf = (side: string) => steps.findIndex((s) => s.key.startsWith(side));
    for (const side of ["back", "front"] as const) {
      const at = firstOf(side);
      steps.splice(at < 0 ? steps.length : at, 0, { ...lengthStep(side) });
    }
  } else if (ri >= 0) {
    // Something else still reads the shared step — keep it, add the two beside it.
    steps.splice(ri + 1, 0, ...(["back", "front"] as const).map((side) => ({ ...tpl.steps.find((s) => s.key === `${side}RollInches`)! })));
  }

  const stillRead = (k: string) => steps.some((s) => new RegExp(`\\b${k}\\b`).test(s.expression));
  inputs = inputs.filter((i) => !(SHARED_ROLL_KEYS as readonly string[]).includes(i.key) || stillRead(i.key));
  return { ...f, inputs, steps };
}

function addFixedRollRate<T extends Pick<CostingFormula, "inputs" | "steps" | "outputs">>(f: T, side: "back" | "front"): T {
  const rateKey = `${side}Rate`, fixedKey = `${side}FixedRate`, costKey = `${side}RollCost`;
  const oldCost = `${side}Rate * ${side}Gauge * ${side}RollWidth * rollLength / densityDiv`;
  if (f.inputs.some((i) => i.key === fixedKey)) return f;
  if (!f.inputs.some((i) => i.key === rateKey)) return f;
  const step = f.steps.find((s) => s.key === costKey);
  if (!step || step.expression.replace(/\s+/g, " ").trim() !== oldCost) return f;

  const tpl = FORMULA_TEMPLATES.find((t) => t.templateId === "two-panel-bag")!;
  const fixedInput = tpl.inputs.find((i) => i.key === fixedKey)!;
  const inputs = f.inputs.map((i) => (i.key === rateKey ? { ...i, disabledWhenSet: fixedKey } : i));
  // Sits at the bottom of that roll's own block, whatever it is called there.
  const rateRow = inputs.find((i) => i.key === rateKey)!;
  let at = inputs.length;
  inputs.forEach((i, idx) => { if ((i.group ?? "") === (rateRow.group ?? "")) at = idx + 1; });
  inputs.splice(at, 0, { ...fixedInput, ...(rateRow.group ? { group: rateRow.group } : {}) });

  const steps = f.steps.map((s) =>
    s.key === costKey ? { ...s, expression: `if(${fixedKey} > 0, ${fixedKey}, ${oldCost})` } : s,
  );
  return { ...f, inputs, steps };
}
