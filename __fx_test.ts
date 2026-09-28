import { runFormula } from "@/lib/formulaEngine";
import { FORMULA_TEMPLATES, upgradeSavedFormula } from "@/lib/formulaTemplates";
const t = FORMULA_TEMPLATES.find((x) => x.templateId === "zipper-bag")!;
const show = (tag: string, over: any = {}) => {
  const r: any = runFormula(t as any, over);
  if (!r.ok) { console.log(tag, "ERROR", r.error); return; }
  const v = r.values, f = (n: any) => (+n).toFixed(3).replace(/\.?0+$/, "");
  console.log(`\n== ${tag}`);
  console.log("zip slip   :", f(v.zipSlipWidth), "x", f(v.zipSlipBaseCut), "| cut", f(v.zipSlipCutLength), "| factor", v.zipSlipFactor, "| across", v.zipSlipAcross, "on", v.zipSlipRollWidth, "| per roll", v.zipSlipPerRoll, "| /bag", f(v.zipSlipPerPc));
  console.log("back patti :", f(v.backStripWidth), "x", f(v.backStripBaseCut), "| cut", f(v.backStripCutLength), "| factor", v.backStripFactor, "| across", v.backStripAcross, "on", v.backStripRollWidth, "| per roll", v.backStripPerRoll, "| /bag", f(v.backStripPerPc));
  console.log("piping     :", f(v.pipingWidth ?? 1.5), "x", f(v.pipingBaseCut), "| cut", f(v.pipingCutLength), "| factor", v.pipingFactor, "| across", v.pipingAcross, "on", v.pipingRollWidth, "| per roll", v.pipingPerRoll, "| /bag", f(v.pipingPerPc));
  console.log("zip        :", f(v.zipLength), "in | per bundle", v.zipPerBundle, "| /bag", f(v.zipPerPc), "| bundles", f(v.zipBundles));
  console.log("material", f(v.materialPerPc), "| cost per bag", f(v.costPerPc));
};
show("diary 22 x 22 x 7");
show("diary + bundle Rs 1000", { zipBundleRate: 1000 });
show("20 (w) x 24 (l) x 7", { bagWidth: 20, bagLength: 24 });
console.log("\nupgrade leaves it alone:", upgradeSavedFormula(t) === t);
