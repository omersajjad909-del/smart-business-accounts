import { readFileSync, writeFileSync } from "node:fs";

const file = "lib/businessModules.ts";
const lines = readFileSync(file, "utf8").split("\n");

const NEW = {
  205: `    modules: [...coreModulesFor("trading"), "delivery_order","order_desk","trading_analytics"],`,
  237: `    modules: [...coreModulesFor("manufacturing"), "bom","production_orders","work_orders","raw_materials"],`,
  277: `    modules: [...coreModulesFor("investor"), "investor_parties","investor_capital","investor_grades","investor_lots","investor_production","investor_settlements","investor_statement","investor_reports"],`,
  308: `    modules: [...coreModulesFor("distribution"), "delivery_order","routes","delivery_tracking","van_sales","stock_on_van","collections","trip_sheet","distribution_analytics"],`,
  340: `    modules: [...coreModulesFor("wholesale"), "delivery_order","credit_limits"],`,
  370: `    modules: [...coreModulesFor("retail"), "pos","loyalty_points","product_catalog","stock_transfer","branch_reports","online_store_sync","supplier_portal"],`,
  1508: `    modules: [...coreModulesFor("import_company"), "landed_cost","shipments","containers","freight","customs_clearance","lc_management","hs_codes","import_costing","export_rebate","commercial_invoice","packing_list","cert_of_origin","export_docs","trade_analytics","export_performance"],`,
  1546: `    modules: [...coreModulesFor("clearing_forwarding"), "cnf_jobs","shipments","containers","freight","customs_clearance","lc_management","trade_analytics"],`,
  1719: `    modules: [...coreModulesFor("travel"), "travel_bookings","visa_processing","travel_settlements"],`,
};

let changed = 0;
for (const [ln, replacement] of Object.entries(NEW)) {
  const i = Number(ln) - 1;
  if (!/^    modules: \[\.\.\.CORE/.test(lines[i])) {
    console.error(`ABORT: line ${ln} is not a CORE modules line:\n  ${lines[i].slice(0, 80)}`);
    process.exit(1);
  }
  lines[i] = replacement;
  changed++;
}
writeFileSync(file, lines.join("\n"));
console.log(`rewrote ${changed} module lists`);
