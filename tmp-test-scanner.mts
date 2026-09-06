import fs from "node:fs";

const envText = fs.readFileSync(".env", "utf8");
for (const line of envText.split("\n")) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!match) continue;
  const key = match[1];
  let val = match[2];
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!(key in process.env)) process.env[key] = val;
}

const { scanAndStore } = await import("./lib/prospecting/marketScanner");
const result = await scanAndStore();
console.log("RESULT:", JSON.stringify(result, null, 2));
process.exit(0);
