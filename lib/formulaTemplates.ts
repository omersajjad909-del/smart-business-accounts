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
      "For anything cut from a roll: PVC and PE bags, laminate pouches, sleeves. Change the stock widths and the density divisor to match your supplier.",
    inputs: [
      { key: "pieceWidth",   label: "Piece width",        unit: "in", defaultValue: 11.5, askOnRun: true },
      { key: "pieceLength",  label: "Piece length",       unit: "in", defaultValue: 11,   askOnRun: true },
      // Side/bottom gusset. Defaults to 0 so a plain flat bag costs exactly
      // what it did before this input existed — only jobs that actually have a
      // gusset are affected.
      { key: "guezzet",       label: "Guezzet",             unit: "in", defaultValue: 0,    askOnRun: true },
      { key: "flap",         label: "Flap / seal",        unit: "in", defaultValue: 2.5,  askOnRun: true },
      { key: "gauge",        label: "Gauge / thickness",  unit: "",   defaultValue: 10,   askOnRun: true },
      { key: "materialRate", label: "Material rate",      unit: "per mm", defaultValue: 12.0, askOnRun: true },
      { key: "rollLength",   label: "Roll length",        unit: "m",  defaultValue: 100 },
      { key: "stockWidths",  label: "Stock widths sold",  unit: "in", isList: true, listValue: [48, 50, 52, 54, 56, 58, 60] },
      { key: "cutMin",       label: "Cutting range — min", unit: "in", defaultValue: 30 },
      { key: "cutMax",       label: "Cutting range — max", unit: "in", defaultValue: 50 },
      { key: "cutAllowance", label: "Allowance per cut",  unit: "in", defaultValue: 0.75 },
      { key: "densityDiv",   label: "Weight divisor",     unit: "",   defaultValue: 54 },
      { key: "labour",       label: "Labour per piece",   unit: "Rs", defaultValue: 3, askOnRun: true },
      { key: "orderQty",     label: "Order quantity",     unit: "pcs", defaultValue: 10000, askOnRun: true },
    ],
    steps: [
      { key: "acrossCount", label: "Pieces across",   expression: "bestFitCount(pieceWidth, stockWidths)" },
      { key: "rollWidth",   label: "Roll width used", expression: "bestFitStock(pieceWidth, stockWidths)", unit: "in" },
      // Gusset joins the length + flap sum and nothing else — every step below
      // reads baseCut, so they pick it up without being touched.
      { key: "baseCut",     label: "Base cut length", expression: "pieceLength * 2 + flap + guezzet", unit: "in" },
      { key: "lengthFactor",label: "Length multiple", expression: "scaleToRange(baseCut, cutMin, cutMax)" },
      { key: "cutLength",   label: "Cut length",      expression: "baseCut * lengthFactor", unit: "in" },
      { key: "rollInches",  label: "Roll length",     expression: "convert(rollLength, m, in)", unit: "in" },
      { key: "repeats",     label: "Repeats per roll",expression: "floor(rollInches / (cutLength + cutAllowance))" },
      { key: "piecesPerRoll", label: "Pieces per roll", expression: "repeats * acrossCount * lengthFactor", unit: "pcs" },
      { key: "rollCost",    label: "Roll cost",       expression: "materialRate * gauge * rollWidth * rollLength / densityDiv", unit: "Rs" },
      { key: "materialPerPc", label: "Material per piece", expression: "rollCost / piecesPerRoll", unit: "Rs" },
      { key: "costPerPc",   label: "Cost per piece",  expression: "materialPerPc + labour", unit: "Rs" },
      { key: "rollsNeeded", label: "Rolls required",  expression: "orderQty / piecesPerRoll" },
      { key: "wasteM",      label: "Waste per roll",  expression: "(rollInches - repeats * (cutLength + cutAllowance)) / 39.37", unit: "m" },
      { key: "orderCost",   label: "Order total",     expression: "costPerPc * orderQty", unit: "Rs" },
    ],
    outputs: [
      { key: "costPerPc",     label: "Cost per piece",  unit: "Rs",  role: "cost_per_unit", primary: true },
      { key: "piecesPerRoll", label: "Pieces per roll", unit: "pcs", role: "units_per_batch" },
      { key: "rollWidth",     label: "Roll width",      unit: "in" },
      { key: "cutLength",     label: "Cut length",      unit: "in" },
      { key: "rollCost",      label: "Roll cost",       unit: "Rs",  role: "cost_per_batch" },
      { key: "rollsNeeded",   label: "Rolls required" },
      { key: "wasteM",        label: "Waste per roll",  unit: "m",   role: "waste_qty" },
      { key: "orderCost",     label: "Order total",     unit: "Rs" },
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
      { key: "markerLength", label: "Marker length per garment", unit: "in", defaultValue: 62, askOnRun: true },
      { key: "fabricWidth",  label: "Fabric width",              unit: "in", defaultValue: 58 },
      { key: "garmentsWide", label: "Garments across marker",    unit: "",   defaultValue: 2, askOnRun: true },
      { key: "fabricRate",   label: "Fabric rate",               unit: "per m", defaultValue: 320, askOnRun: true },
      { key: "wastagePct",   label: "Cutting wastage",           unit: "%",  defaultValue: 8 },
      { key: "trims",        label: "Trims per garment",         unit: "Rs", defaultValue: 45, askOnRun: true },
      { key: "stitching",    label: "Stitching per garment",     unit: "Rs", defaultValue: 120, askOnRun: true },
      { key: "orderQty",     label: "Order quantity",            unit: "pcs", defaultValue: 500, askOnRun: true },
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
      { key: "pieceW",      label: "Piece width",         unit: "in", defaultValue: 3.5, askOnRun: true },
      { key: "pieceH",      label: "Piece height",        unit: "in", defaultValue: 2,   askOnRun: true },
      { key: "sheetW",      label: "Parent sheet width",  unit: "in", defaultValue: 25 },
      { key: "sheetH",      label: "Parent sheet height", unit: "in", defaultValue: 36 },
      { key: "sheetRate",   label: "Rate per sheet",      unit: "Rs", defaultValue: 14, askOnRun: true },
      { key: "makeready",   label: "Makeready sheets",    unit: "sheets", defaultValue: 150 },
      { key: "inkPerSheet", label: "Ink & plate per sheet", unit: "Rs", defaultValue: 2.5 },
      { key: "orderQty",    label: "Order quantity",      unit: "pcs", defaultValue: 5000, askOnRun: true },
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
      { key: "partW",     label: "Part width",     unit: "in", defaultValue: 18, askOnRun: true },
      { key: "partH",     label: "Part height",    unit: "in", defaultValue: 24, askOnRun: true },
      { key: "boardW",    label: "Board width",    unit: "in", defaultValue: 48 },
      { key: "boardH",    label: "Board height",   unit: "in", defaultValue: 96 },
      { key: "kerf",      label: "Saw kerf",       unit: "in", defaultValue: 0.125 },
      { key: "boardRate", label: "Rate per board", unit: "Rs", defaultValue: 4200, askOnRun: true },
      { key: "edgeRate",  label: "Edge banding",   unit: "per m", defaultValue: 35 },
      { key: "labour",    label: "Labour per part", unit: "Rs", defaultValue: 60, askOnRun: true },
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
      { key: "blankW",    label: "Blank width",        unit: "mm", defaultValue: 120, askOnRun: true },
      { key: "blankH",    label: "Blank height",       unit: "mm", defaultValue: 80,  askOnRun: true },
      { key: "sheetW",    label: "Sheet width",        unit: "mm", defaultValue: 1220 },
      { key: "sheetH",    label: "Sheet height",       unit: "mm", defaultValue: 2440 },
      { key: "thickness", label: "Thickness",          unit: "mm", defaultValue: 1.2, askOnRun: true },
      { key: "density",   label: "Density",            unit: "g/cm³", defaultValue: 7.85 },
      { key: "metalRate", label: "Metal rate",         unit: "per kg", defaultValue: 340, askOnRun: true },
      { key: "scrapRate", label: "Scrap recovery",     unit: "per kg", defaultValue: 90 },
      { key: "labour",    label: "Labour per blank",   unit: "Rs", defaultValue: 12, askOnRun: true },
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
      { key: "batchInputKg", label: "Raw input per batch", unit: "kg", defaultValue: 100, askOnRun: true },
      { key: "inputRate",    label: "Raw material rate",   unit: "per kg", defaultValue: 210, askOnRun: true },
      { key: "yieldPct",     label: "Yield after loss",    unit: "%", defaultValue: 82 },
      { key: "packSize",     label: "Pack size",           unit: "kg", defaultValue: 0.5, askOnRun: true },
      { key: "packCost",     label: "Packaging per pack",  unit: "Rs", defaultValue: 18 },
      { key: "batchLabour",  label: "Labour per batch",    unit: "Rs", defaultValue: 3500, askOnRun: true },
      { key: "batchOverhead",label: "Overhead per batch",  unit: "Rs", defaultValue: 2200 },
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
      { key: "partWeightG", label: "Part weight",        unit: "g", defaultValue: 24, askOnRun: true },
      { key: "cavities",    label: "Cavities in mould",  unit: "",  defaultValue: 4, askOnRun: true },
      { key: "runnerG",     label: "Runner per shot",    unit: "g", defaultValue: 12 },
      { key: "resinRate",   label: "Resin rate",         unit: "per kg", defaultValue: 265, askOnRun: true },
      { key: "cycleSec",    label: "Cycle time",         unit: "sec", defaultValue: 28, askOnRun: true },
      { key: "machineRate", label: "Machine hour rate",  unit: "per hr", defaultValue: 900 },
      { key: "rejectPct",   label: "Reject rate",        unit: "%", defaultValue: 3 },
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
