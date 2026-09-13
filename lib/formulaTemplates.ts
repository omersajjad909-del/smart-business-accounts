// FILE: lib/formulaTemplates.ts
//
// Starter formulas. A blank formula editor is intimidating and teaches nothing,
// so every category ships with a worked example an author can copy and bend to
// their own trade.
//
// These are examples, not product rules. Every constant here — stock sizes, an
// allowance, a density divisor, a wastage percentage — is an *input* the author
// owns. Nothing in lib/formulaEngine.ts knows what a roll or a garment is.

import type { CostingFormula } from "@/lib/formulaEngine";

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
      // Buttons are counted, not guessed at. A flat "Button / Tape — Rs 3"
      // could not answer the two questions a store actually gets asked: how
      // many buttons to issue for the order, and what they came to. So the
      // charge is built the way the roll is — a count per piece against a
      // rate — and the total falls out of it.
      // A bag is fastened one way or the other, never both, so the two are a
      // choice rather than two charges that quietly add up. Button first,
      // which makes it the default.
      { key: "fitting",      label: "Fastening",          options: ["Button", "Tape"], defaultValue: 0, askOnRun: true, group: "Button & Tape" },
      { key: "buttonsPerPc", label: "Buttons per piece",  unit: "pcs", defaultValue: 2, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 0 } },
      { key: "buttonRate",   label: "Rate per button",    unit: "Rs", defaultValue: 1.2, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 0 } },
      { key: "buttonLabour", label: "Labour per button",  unit: "Rs", defaultValue: 0.3, askOnRun: true, group: "Button & Tape", showWhen: { key: "fitting", is: 0 } },
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
      { key: "labour",       label: "Labour",             unit: "Rs", defaultValue: 3, askOnRun: true, group: "Order details" },
      // The odds and ends a quote picks up that have no box of their own — a
      // rupee of printing, two of stitching. Per piece, like labour beside it,
      // and zero by default so it changes nothing until somebody types in it.
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
      { key: "rollInches",  label: "Roll length",     expression: "convert(rollLength, m, in)", unit: "in", group: "Cutting" },
      // Layers is the raw division — how many cut lengths the roll holds. Only
      // whole layers can be cut, so repeats floors it, but the exact figure is
      // shown too: 79.135 and 79 are different answers to different questions,
      // and rounding one into the other silently is how a roll comes up short.
      { key: "layers",      label: "Layers — exact",  expression: "rollInches / cutLength", group: "Cutting" },
      { key: "repeats",     label: "Layers per roll", expression: "floor(layers)", group: "Cutting" },
      { key: "piecesPerRoll", label: "Pieces per roll", expression: "repeats * acrossCount * lengthFactor", unit: "pcs", group: "Cutting" },

      { key: "rollsNeeded", label: "Rolls required",  expression: "orderQty / piecesPerRoll", group: "Rolls" },
      // You can only buy whole rolls, so the fractional part of rollsNeeded is
      // never actually used up — it comes back off the last roll as leftover
      // stock, not scrap.
      { key: "rollsToBuy",     label: "Rolls to buy",         expression: "ceil(rollsNeeded)", group: "Rolls" },
      { key: "leftoverStockM", label: "Leftover into stock",  expression: "(rollsToBuy - rollsNeeded) * rollLength", unit: "m", group: "Rolls" },
      // cutLength already carries the allowance, so it is not added again here.
      { key: "wasteM",      label: "Waste per roll",  expression: "(rollInches - repeats * cutLength) / 39.37", unit: "m", group: "Rolls" },

      // Buttons costed like the roll: a count for the store to issue, a rate
      // against that count, and a total. buttonsNeeded is what actually goes
      // out of the store for the order — the number a flat per-piece charge
      // could never tell anybody.
      // Whichever way the bag is fastened, the other branch has to come out at
      // zero — the boxes behind it are still on the formula and still hold
      // last week's numbers, and a hidden field that keeps charging is the
      // worst kind of costing error: invisible and consistent.
      { key: "buttonsNeeded", label: "Buttons required",    expression: "if(fitting == 0, buttonsPerPc * orderQty, 0)", unit: "pcs", group: "Buttons & Tape" },
      { key: "buttonPerPc",   label: "Button cost per piece", expression: "if(fitting == 0, buttonsPerPc * (buttonRate + buttonLabour), 0)", unit: "Rs", group: "Buttons & Tape" },
      { key: "buttonTotal",   label: "Total button cost",   expression: "buttonPerPc * orderQty", unit: "Rs", group: "Buttons & Tape" },
      // Same shape as the buttons, in the unit tape is actually bought in: the
      // store issues metres, the bag is cut in inches.
      { key: "tapeNeeded",    label: "Tape required",       expression: "if(fitting == 1, convert(tapePerPc * orderQty, in, m), 0)", unit: "m", group: "Buttons & Tape" },
      { key: "tapeCostPerPc", label: "Tape cost per piece", expression: "if(fitting == 1, tapePerPc * tapeRate + tapeLabour, 0)", unit: "Rs", group: "Buttons & Tape" },
      { key: "tapeTotal",     label: "Total tape cost",     expression: "tapeCostPerPc * orderQty", unit: "Rs", group: "Buttons & Tape" },

      // Roll cost is the film and nothing else — what the roll weighs times
      // what the material sells for.
      { key: "rollCost",    label: "Roll cost",       expression: "materialRate * gauge * rollWidth * rollLength / densityDiv", unit: "Rs", group: "Cost" },
      { key: "materialPerPc", label: "Material per piece", expression: "rollCost / piecesPerRoll", unit: "Rs", group: "Cost" },
      { key: "costPerPc",   label: "Cost per piece",  expression: "materialPerPc + labour + buttonPerPc + tapeCostPerPc + others", unit: "Rs", group: "Cost" },
      { key: "orderCost",   label: "Order total",     expression: "costPerPc * orderQty", unit: "Rs", group: "Cost" },
    ],
    outputs: [
      { key: "costPerPc",     label: "Cost per piece",  unit: "Rs",  role: "cost_per_unit", primary: true },
      { key: "piecesPerRoll", label: "Pieces per roll", unit: "pcs", role: "units_per_batch", group: "Cutting" },
      { key: "acrossCount",   label: "Pieces across",   unit: "pcs", group: "Cutting" },
      { key: "rollWidth",     label: "Roll width",      unit: "in", group: "Cutting" },
      { key: "cutLength",     label: "Cut length",      unit: "in", group: "Cutting" },
      // The division and the whole number it becomes, both on the result card:
      // 3,937.01 / 49.75 = 79.135 layers, of which 79 can actually be cut.
      { key: "layers",        label: "Layers — exact",  group: "Cutting" },
      { key: "repeats",       label: "Layers per roll", group: "Cutting" },
      { key: "rollsNeeded",   label: "Rolls required",  group: "Rolls" },
      { key: "rollsToBuy",       label: "Rolls to buy", group: "Rolls" },
      { key: "leftoverStockM",   label: "Leftover → waste stock", unit: "m", group: "Rolls" },
      { key: "wasteM",        label: "Waste per roll",  unit: "m",   role: "waste_qty", group: "Rolls" },
      { key: "buttonsNeeded", label: "Buttons required", unit: "pcs", group: "Buttons & Tape" },
      { key: "buttonPerPc",   label: "Button cost per piece", unit: "Rs", group: "Buttons & Tape" },
      { key: "buttonTotal",   label: "Total button cost", unit: "Rs", group: "Buttons & Tape" },
      { key: "tapeNeeded",    label: "Tape required",    unit: "m", group: "Buttons & Tape" },
      { key: "tapeTotal",     label: "Total tape cost",  unit: "Rs", group: "Buttons & Tape" },
      { key: "rollCost",      label: "Roll cost",       unit: "Rs",  role: "cost_per_batch", group: "Cost" },
      { key: "orderCost",     label: "Order total",     unit: "Rs", group: "Cost" },
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

      { key: "backRate",     label: "Back material rate",   unit: "per mm", defaultValue: 12, askOnRun: true, group: "Back roll" },
      { key: "backGauge",    label: "Back gauge",           unit: "",   defaultValue: 10,   askOnRun: true, group: "Back roll" },
      { key: "backWidths",   label: "Back stock widths",    unit: "in", isList: true, listValue: [48, 50, 52, 54, 56, 58, 60], group: "Back roll" },

      { key: "frontRate",    label: "Front material rate",  unit: "per mm", defaultValue: 15, askOnRun: true, group: "Front roll" },
      { key: "frontGauge",   label: "Front gauge",          unit: "",   defaultValue: 8,    askOnRun: true, group: "Front roll" },
      { key: "frontWidths",  label: "Front stock widths",   unit: "in", isList: true, listValue: [48, 50, 52, 54, 56, 58, 60], group: "Front roll" },

      { key: "rollLength",   label: "Roll length",          unit: "m",  defaultValue: 100, group: "Roll details" },
      { key: "cutMin",       label: "Cutting range — min",  unit: "in", defaultValue: 30, group: "Roll details" },
      { key: "cutMax",       label: "Cutting range — max",  unit: "in", defaultValue: 50, group: "Roll details" },
      { key: "cutAllowance", label: "Allowance per cut",    unit: "in", defaultValue: 0.75, group: "Roll details" },
      { key: "labour",       label: "Labour",               unit: "Rs", defaultValue: 3,  askOnRun: true, group: "Order details" },
      // Per piece, not per roll as in Roll → Pieces: there are two rolls here,
      // so loading it onto either one would charge the bag twice or not at all.
      { key: "buttonTape",   label: "Button / Tape",        unit: "Rs", defaultValue: 0,  askOnRun: true, group: "Order details" },
      // Same catch-all as Roll → Pieces: per bag, zero until it is used.
      { key: "others",       label: "Others",               unit: "Rs", defaultValue: 0,  askOnRun: true, group: "Order details" },
      { key: "orderQty",     label: "Order quantity",       unit: "pcs", defaultValue: 10000, askOnRun: true, group: "Order details" },
    ],
    steps: [
      { key: "rollInches",    label: "Roll length",           expression: "convert(rollLength, m, in)", unit: "in" },

      /* Back panel — 1 width x (1 length + flap) */
      { key: "backAcross",    label: "Back panels across",    expression: "bestFitCount(bagWidth, backWidths)" },
      { key: "backRollWidth", label: "Back roll width used",  expression: "bestFitStock(bagWidth, backWidths)", unit: "in" },
      { key: "backBaseCut",   label: "Back base cut",         expression: "bagLength + flap + guezzet", unit: "in" },
      { key: "backFactor",    label: "Back length multiple",  expression: "scaleToRange(backBaseCut, cutMin, cutMax)" },
      // Allowance inside the cut length, same as Roll → Pieces.
      { key: "backCutLength", label: "Back cut length",       expression: "backBaseCut * backFactor + cutAllowance", unit: "in" },
      { key: "backRepeats",   label: "Back layers per roll",  expression: "floor(rollInches / backCutLength)" },
      { key: "backPerRoll",   label: "Back panels per roll",  expression: "backRepeats * backAcross * backFactor", unit: "pcs" },
      { key: "backRollCost",  label: "Back roll cost",        expression: "backRate * backGauge * backRollWidth * rollLength / densityDiv", unit: "Rs" },
      { key: "backPerPc",     label: "Back cost per bag",     expression: "backRollCost / backPerRoll", unit: "Rs" },

      /* Front panel — 1 width x 1 length, no flap */
      { key: "frontAcross",    label: "Front panels across",    expression: "bestFitCount(bagWidth, frontWidths)" },
      { key: "frontRollWidth", label: "Front roll width used",  expression: "bestFitStock(bagWidth, frontWidths)", unit: "in" },
      { key: "frontBaseCut",   label: "Front base cut",         expression: "bagLength", unit: "in" },
      { key: "frontFactor",    label: "Front length multiple",  expression: "scaleToRange(frontBaseCut, cutMin, cutMax)" },
      { key: "frontCutLength", label: "Front cut length",       expression: "frontBaseCut * frontFactor + cutAllowance", unit: "in" },
      { key: "frontRepeats",   label: "Front layers per roll",  expression: "floor(rollInches / frontCutLength)" },
      { key: "frontPerRoll",   label: "Front panels per roll",  expression: "frontRepeats * frontAcross * frontFactor", unit: "pcs" },
      { key: "frontRollCost",  label: "Front roll cost",        expression: "frontRate * frontGauge * frontRollWidth * rollLength / densityDiv", unit: "Rs" },
      { key: "frontPerPc",     label: "Front cost per bag",     expression: "frontRollCost / frontPerRoll", unit: "Rs" },

      /* The bag */
      { key: "materialPerPc", label: "Material per bag",  expression: "backPerPc + frontPerPc", unit: "Rs" },
      { key: "costPerPc",     label: "Cost per bag",      expression: "materialPerPc + labour + buttonTape + others", unit: "Rs" },
      { key: "backRolls",     label: "Back rolls required",  expression: "orderQty / backPerRoll" },
      { key: "frontRolls",    label: "Front rolls required", expression: "orderQty / frontPerRoll" },
      { key: "backWasteM",    label: "Back waste per roll",  expression: "(rollInches - backRepeats * backCutLength) / 39.37", unit: "m" },
      { key: "frontWasteM",   label: "Front waste per roll", expression: "(rollInches - frontRepeats * frontCutLength) / 39.37", unit: "m" },
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
