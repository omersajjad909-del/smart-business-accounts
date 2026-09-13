import { runFormula, inputVisible } from "./lib/formulaEngine";
import { FORMULA_TEMPLATES } from "./lib/formulaTemplates";
for (const t of FORMULA_TEMPLATES) {
  const r = runFormula(t);
  const bad = r.steps.filter((s) => s.error).map((s) => `${s.key}: ${s.error}`);
  if (!r.ok || bad.length) console.log(`ERR ${t.templateId}: ${bad.join(" | ")}`);
}
console.log("all templates ok\n");
const roll = FORMULA_TEMPLATES.find(t => t.templateId === "roll-to-piece")!;
for (const pick of [0, 1]) {
  const r = runFormula(roll, { fitting: pick });
  const shown = roll.inputs.filter(i => (i.group ?? "") === "Button & Tape" && inputVisible(i, r.values));
  console.log(`=== ${roll.inputs.find(i=>i.key==="fitting")!.options![pick]} — ${shown.length} boxes ===`);
  for (const i of shown) console.log(`   ${i.label.padEnd(20)} ${String(i.defaultValue).padStart(5)} ${i.unit ?? ""}`);
  console.log(`   -> button/pc ${r.values.buttonPerPc}  tape/pc ${r.values.tapeCostPerPc}  cost/pc ${r.values.costPerPc}`);
  console.log(`   -> buttons required ${r.values.buttonsNeeded}  tape required ${r.values.tapeNeeded} m\n`);
}
