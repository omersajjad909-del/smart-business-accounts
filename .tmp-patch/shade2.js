const fs=require("fs");
const p="lib/rateFormula.ts";
let s=fs.readFileSync(p,"utf8");

const a = `    if (f.kind === "text") {
      out[f.key] = String(hit.value).slice(0, RATE_FORMULA_TEXT_MAX);
    } else {`;
if(!s.includes(a)) throw new Error("anchor");
s = s.replace(a, `    // A shade is always a label — "White", "15-L" — whatever the column was
    // declared as. Putting it through Number() because someone set the column
    // to numeric is how it ended up blank on every line.
    if (f.kind === "text" || role === "shade") {
      out[f.key] = String(hit.value).slice(0, RATE_FORMULA_TEXT_MAX);
    } else {`);

fs.writeFileSync(p,s);
console.log("ok");
