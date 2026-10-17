import toast from "react-hot-toast";
import { itemGroupKey, itemMetaWithName, itemSpecRole } from "@/lib/rateFormula";
import type { RateFormulaSettings } from "@/lib/rateFormula";

type CatalogueItem = {
  id: string; name: string; code?: string; unit?: string; description?: string | null;
  barcode?: string; purchaseRate?: number; category?: string; meta?: unknown;
  stockIn?: number; stockOut?: number; stockBal?: number;
};

/**
 * Stock is held per item, and a PHR is a different item: 647 at 30 PHR and 647
 * at 32 PHR are two catalogue rows (647-30, 647-32), which is how the import
 * files them and what the sales picker lists. Purchase-side pickers show one
 * row per product, so a line is saved against whichever row was picked — typing
 * 32 on a line picked as 647-30 would put the 32 PHR rolls into the 30 PHR
 * stock.
 *
 * For each line this finds the catalogue row at the PHR the operator typed,
 * creating it (a copy of the picked item, name and code carrying the new PHR)
 * when it does not exist. The result is aligned with `lines`: the row to use,
 * or null to leave the line as it is. The whole result is null, after a toast,
 * when a row could not be created, so nothing half-saves.
 */
export async function resolvePhrVariants(
  rf: RateFormulaSettings,
  catalogue: CatalogueItem[],
  lines: Array<{ itemId: string; meta?: Record<string, any> }>,
  headers: Record<string, string>,
): Promise<{ targets: Array<CatalogueItem | null>; created: CatalogueItem[] } | null> {
  const phrKey = rf.fields.find((f) => itemSpecRole(f) === "phr")?.key;
  const targets: Array<CatalogueItem | null> = lines.map(() => null);
  const created: CatalogueItem[] = [];
  if (!phrKey) return { targets, created };

  const groupOf = itemGroupKey(rf);
  const known = (it: CatalogueItem) => itemMetaWithName(rf, it.meta, `${it.name || ""} ${it.description || ""}`);
  const phrOf = (it: CatalogueItem): number | null => {
    const v = known(it)[phrKey];
    const n = Number(v);
    return v === "" || v === undefined || !Number.isFinite(n) || n === 0 ? null : n;
  };
  const all = [...catalogue];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const typed = Number(line.meta?.[phrKey]);
    const picked = all.find((it) => it.id === line.itemId);
    if (!picked || !Number.isFinite(typed) || typed <= 0 || phrOf(picked) === typed) continue;

    const key = groupOf(picked as any);
    let target = all.find((it) => groupOf(it as any) === key && phrOf(it) === typed);
    if (!target) {
      const oldPhr = phrOf(picked);
      const base = String(picked.code || "");
      const suffix = oldPhr ? `-${oldPhr}` : "";
      const code = !base ? "" : suffix && base.endsWith(suffix) ? `${base.slice(0, -suffix.length)}-${typed}` : `${base}-${typed}`;
      const tag = `PHR${typed}`;
      const phrRe = /\bPHR\s*\d+(?:\.\d+)?/i;
      const name = phrRe.test(picked.name) ? picked.name.replace(phrRe, tag) : `${picked.name} ${tag}`;
      try {
        const res = await fetch("/api/items-new", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            code, name, unit: picked.unit || "", category: picked.category || "TRADING",
            purchaseRate: picked.purchaseRate ?? 0, description: picked.description || "",
            meta: { ...known(picked), [phrKey]: typed },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Could not create item");
        target = {
          id: data.id, name: data.name, barcode: data.barcode || "", purchaseRate: data.purchaseRate ?? 0, unit: data.unit || "",
          code: data.code || "", description: data.description || "", meta: data.meta ?? null, category: data.category,
          stockIn: 0, stockOut: 0, stockBal: 0,
        };
        all.push(target);
        created.push(target);
      } catch (e: any) {
        toast.error(`PHR ${typed} item for ${picked.name} could not be created: ${e.message}`);
        return null;
      }
    }
    targets[li] = target;
  }
  if (created.length) toast.success(`New item${created.length > 1 ? "s" : ""} created: ${created.map((c) => c.code).join(", ")}`);
  return { targets, created };
}
