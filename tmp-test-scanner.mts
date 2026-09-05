import { scanAndStore } from "./lib/prospecting/marketScanner";

const result = await scanAndStore();
console.log(JSON.stringify(result, null, 2));
process.exit(0);
