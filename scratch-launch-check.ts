import fs from "fs";
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
import { getSiteStatus } from "@/lib/siteStatus";

(async () => {
  const s = await getSiteStatus();
  console.log("getSiteStatus() against live DB:", s);
  console.log(s.live ? "PASS — site stays LIVE (no siteLive row yet)" : "FAIL — site would go dark!");
  process.exit(0);
})();
