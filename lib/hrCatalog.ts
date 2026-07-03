// Shared HR data — used on Employees form and Team invite form.
// Both are datalists (suggestions), so users can also type their own values.

export const DEPARTMENTS = [
  "ACCOUNTS", "ADMINISTRATION", "CUSTOMER SERVICE", "DESIGN", "EXECUTIVE",
  "FINANCE", "GATE", "GODOWN", "HR", "IT", "LEGAL", "LOGISTICS",
  "MAINTENANCE", "MARKETING", "OPERATIONS", "PRODUCTION", "PURCHASE",
  "QUALITY CONTROL", "R&D", "SALES", "SECURITY", "WAREHOUSE",
];

export const DESIGNATIONS = [
  // Executive / Leadership
  "Chairman", "CEO", "COO", "CFO", "CTO", "Managing Director", "Director",
  "General Manager", "VP", "Senior Manager", "Manager", "Assistant Manager",
  // Individual contributors
  "Team Lead", "Supervisor", "Senior Executive", "Executive", "Officer",
  "Assistant", "Coordinator", "Analyst", "Senior Analyst", "Consultant",
  // Finance / Accounts
  "Chief Accountant", "Senior Accountant", "Accountant", "Cashier", "Auditor",
  // Sales / Marketing
  "Sales Manager", "Sales Executive", "Sales Officer", "Marketing Manager",
  "Marketing Executive", "Business Development Manager", "Account Manager",
  // HR
  "HR Manager", "HR Executive", "Recruiter",
  // IT / Engineering
  "IT Manager", "Software Engineer", "Senior Software Engineer", "Developer",
  "System Administrator", "Network Engineer", "Designer",
  // Operations / Warehouse
  "Warehouse Manager", "Store Keeper", "Inventory Officer", "Production Manager",
  "Quality Manager",
  // Support / Ground
  "Receptionist", "Driver", "Security Guard", "Office Boy", "Peon",
  "Trainee", "Intern",
];

/** Display formatter — keeps acronyms upper-case, title-cases the rest. */
export function fmtDept(d: string): string {
  const acronyms = new Set(["HR", "IT", "R&D", "CEO", "CFO", "CTO", "COO", "VP"]);
  const up = d.trim().toUpperCase();
  if (acronyms.has(up)) return up;
  return d.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
