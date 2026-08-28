const fs=require("fs");

const REF_DECL = `  /**
   * What the line got from the item that was just picked. The picker fires
   * Enter straight after its onChange, before React has committed the new row,
   * so the Enter handler cannot read the rows to find out whether the item
   * already answered the nominated column.
   */
  const lastPickedMeta = useRef<Record<string, any> | null>(null);
`;

function patch(file, opts) {
  let s = fs.readFileSync(file, "utf8");

  // react import
  if (opts.reactImport) {
    if(!s.includes(opts.reactImport)) throw new Error(file + ": react import");
    s = s.replace(opts.reactImport, opts.reactImportNew);
  }

  // ref declaration, right after the anchor
  if(!s.includes(opts.refAnchor)) throw new Error(file + ": ref anchor");
  s = s.replace(opts.refAnchor, opts.refAnchor + "\n" + REF_DECL);

  // record the resolved values wherever an item is picked
  for (const line of opts.metaLines) {
    if(!s.includes(line)) throw new Error(file + ": meta line " + line.trim().slice(0,40));
    s = s.replace(line, line + "\n" + opts.metaIndent + "lastPickedMeta.current = meta;");
  }

  // hand them to the Enter handler
  const before = opts.enterCall;
  if(!s.includes(before)) throw new Error(file + ": enter call");
  s = s.split(before).join(before.replace(/\)\}$/, ", () => lastPickedMeta.current)}"));

  fs.writeFileSync(file, s);
  console.log("patched", file);
}

patch("app/dashboard/grn/page.tsx", {
  reactImport: `import { useEffect, useState } from "react";`,
  reactImportNew: `import { useEffect, useRef, useState } from "react";`,
  refAnchor: `  const { settings: rf, active: rfActive } = useRateFormula("grn");`,
  metaLines: ["      const meta = metaFromItem(rf, item.meta, copy[idx]?.meta, `${item.name || \"\"} ${item.description || \"\"}`);"],
  metaIndent: "      ",
  enterCall: `onKeyDown={rateFormulaEnterHandler(rf, rfActive, idx)}`,
});

patch("app/dashboard/purchase-order/page.tsx", {
  reactImport: `import { useEffect, useState } from "react";`,
  reactImportNew: `import { useEffect, useRef, useState } from "react";`,
  refAnchor: `  const { settings: rf, active: rfActive } = useRateFormula("purchaseOrder");`,
  metaLines: ["                              const meta = metaFromItem(rf, it.meta, copy[i].meta, `${it.name || \"\"} ${it.description || \"\"}`);"],
  metaIndent: "                              ",
  enterCall: `onKeyDown={rateFormulaEnterHandler(rf, rfActive, i)}`,
});

patch("app/dashboard/purchase-invoice/page.tsx", {
  refAnchor: `  const { settings: rf, active: rfActive } = useRateFormula("purchaseInvoice");`,
  metaLines: ["                                          const meta = metaFromItem(rf, (item as any).meta, copy[i].meta, `${item.name || \"\"} ${item.description || \"\"}`);"],
  metaIndent: "                                          ",
  enterCall: `onKeyDown={rateFormulaEnterHandler(rf, rfActive, i)}`,
});
