import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { safeEncryptField } from "@/lib/fieldEncrypt";

/**
 * Golden demo dataset.
 *
 * Every demo visitor gets their own throwaway Company (see lib/demoSandbox.ts)
 * seeded by this file, so two people can be inside the same business demo at
 * the same time without seeing each other. The data is defined in code rather
 * than copied from a template company because several columns are globally
 * unique — barcode, bank account no, receipt no, voucher no, tax code — and a
 * row-for-row copy would collide the moment a second sandbox existed. Here
 * every such value carries a per-sandbox suffix.
 *
 * Everything is written with explicit ids through createMany, so the whole
 * dataset lands in ~20 round trips instead of ~400.
 */

export const DEMO_BUSINESS_TYPES = [
  "trading",
  "retail",
  "distribution",
  "import_company",
  "clearing_forwarding",
  "wholesale",
] as const;

export type DemoBusinessType = (typeof DEMO_BUSINESS_TYPES)[number];

export function isDemoBusinessType(v: unknown): v is DemoBusinessType {
  return DEMO_BUSINESS_TYPES.includes(String(v || "") as DemoBusinessType);
}

// ── Profile shape ────────────────────────────────────────────────────────────
// Tuples keep the data tables readable at a glance; the engine below expands
// them into rows.

/** [name, city, creditDays, openingReceivable] */
type CustomerRow = [string, string, number, number];
/** [name, city, openingPayable] */
type SupplierRow = [string, string, number];
/** [code, name, unit, purchaseRate, saleRate, openingQty, minStock] */
type ItemRow = [string, string, string, number, number, number, number];
/** [firstName, lastName, designation, department, monthlySalary] */
type EmployeeRow = [string, string, string, string, number];
/** [code, name, city] */
type BranchRow = [string, string, string];
/** [accountCode, name, type, partyType] */
type AccountRow = [string, string, string, string];

interface DemoProfile {
  label: string;
  emoji: string;
  companyName: string;
  /** Sales tax percentage applied on invoices. Services carry a different rate. */
  taxRate: number;
  /** Item category label used on ItemNew.category */
  itemCategory: string;
  branches: BranchRow[];
  customers: CustomerRow[];
  suppliers: SupplierRow[];
  items: ItemRow[];
  employees: EmployeeRow[];
  /** Business-specific expense/income accounts on top of the common chart */
  extraAccounts: AccountRow[];
  /** [description, expenseAccountCode, amount, category] */
  expenses: [string, string, number, string][];
}

// ── Common chart of accounts ────────────────────────────────────────────────
// Codes are referenced by the transaction builders below, so they are stable.
const A = {
  CASH: "1001",
  BANK: "1002",
  RECEIVABLE: "1010",
  STOCK: "1020",
  PAYABLE: "2001",
  TAX_PAYABLE: "2002",
  SALARY_PAYABLE: "2010",
  CAPITAL: "3001",
  SALES: "4001",
  PURCHASES: "5001",
  SALARIES: "5010",
  RENT: "5011",
  UTILITIES: "5012",
  FREIGHT: "5013",
  OFFICE: "5014",
} as const;

const COMMON_ACCOUNTS: AccountRow[] = [
  [A.CASH, "Cash in Hand", "ASSET", "CASH"],
  [A.BANK, "Bank Account — Meezan Bank", "ASSET", "BANKS"],
  [A.RECEIVABLE, "Accounts Receivable", "ASSET", "GENERAL"],
  [A.STOCK, "Stock / Inventory", "ASSET", "STOCK"],
  [A.PAYABLE, "Accounts Payable", "LIABILITY", "LIABILITIES"],
  [A.TAX_PAYABLE, "Sales Tax Payable", "LIABILITY", "LIABILITIES"],
  [A.SALARY_PAYABLE, "Salaries Payable", "LIABILITY", "LIABILITIES"],
  [A.CAPITAL, "Owner's Capital", "EQUITY", "EQUITY"],
  [A.SALES, "Sales Revenue", "INCOME", "INCOME"],
  [A.PURCHASES, "Purchases / Cost of Goods", "EXPENSE", "EXPENSE"],
  [A.SALARIES, "Salaries & Wages", "EXPENSE", "EXPENSE"],
  [A.RENT, "Rent Expense", "EXPENSE", "EXPENSE"],
  [A.UTILITIES, "Utilities Expense", "EXPENSE", "EXPENSE"],
  [A.FREIGHT, "Freight & Transport", "EXPENSE", "EXPENSE"],
  [A.OFFICE, "Office & Misc Expense", "EXPENSE", "EXPENSE"],
];

// ── The six Phase 1 businesses ──────────────────────────────────────────────

const PROFILES: Record<DemoBusinessType, DemoProfile> = {
  trading: {
    label: "Trading",
    emoji: "🛒",
    companyName: "Al-Noor Trading Co.",
    taxRate: 18,
    itemCategory: "TRADING",
    branches: [["MAIN", "Main Office — Lahore", "Lahore"]],
    customers: [
      ["Hassan Hardware Store", "Lahore", 30, 185000],
      ["Bilal Electronics", "Karachi", 15, 92000],
      ["Khan Traders", "Faisalabad", 45, 0],
      ["Sadiq & Sons", "Multan", 30, 47500],
    ],
    suppliers: [
      ["Pak Steel Mills Ltd", "Karachi", 320000],
      ["United Imports (Pvt) Ltd", "Lahore", 0],
      ["Metro Industrial Supplies", "Gujranwala", 78000],
    ],
    items: [
      ["ITM-001", 'Steel Pipe 2" — 20ft', "PCS", 3200, 4100, 180, 40],
      ["ITM-002", "Copper Wire 1.5mm — 100m Roll", "ROLL", 8500, 10800, 45, 15],
      ["ITM-003", "PVC Sheet 4x8 ft", "SHEET", 1450, 1950, 220, 50],
      ["ITM-004", "Ball Bearing 6205", "PCS", 380, 550, 640, 100],
      ["ITM-005", 'Angle Iron 1.5" — 20ft', "PCS", 2100, 2750, 95, 30],
      ["ITM-006", "Cement Bag 50kg", "BAG", 1180, 1350, 300, 80],
      ["ITM-007", "Enamel Paint 20L Bucket", "BUCKET", 6800, 8500, 28, 10],
      ["ITM-008", "Hand Tool Set — 42pc", "SET", 4200, 5900, 12, 15],
    ],
    employees: [
      ["Imran", "Sheikh", "Sales Manager", "Sales", 145000],
      ["Fatima", "Riaz", "Accountant", "Finance", 110000],
      ["Adnan", "Malik", "Warehouse Supervisor", "Operations", 78000],
      ["Zainab", "Ahmed", "Sales Executive", "Sales", 65000],
      ["Rashid", "Ali", "Delivery Driver", "Logistics", 48000],
    ],
    extraAccounts: [["5020", "Godown Rent & Storage", "EXPENSE", "EXPENSE"]],
    expenses: [
      ["Godown rent — current month", "5020", 85000, "OTHER"],
      ["Electricity bill — LESCO", A.UTILITIES, 42500, "UTILITIES"],
      ["Delivery fuel & toll", A.FREIGHT, 28000, "TRAVEL"],
      ["Office stationery & printing", A.OFFICE, 12400, "SUPPLIES"],
    ],
  },

  retail: {
    label: "Retail & Multi-Store",
    emoji: "🏪",
    companyName: "SmartMart Retail (Multi-Store)",
    taxRate: 18,
    itemCategory: "TRADING",
    branches: [
      ["ST01", "Gulberg Store", "Lahore"],
      ["ST02", "DHA Phase 5 Store", "Lahore"],
      ["ST03", "Johar Town Store", "Lahore"],
    ],
    customers: [
      ["Walk-in Customer", "Lahore", 0, 0],
      ["Cafe Bella (Corporate)", "Lahore", 15, 68000],
      ["Ahmed Raza — Loyalty Gold", "Lahore", 0, 0],
      ["Zameer Catering Services", "Lahore", 30, 124000],
    ],
    suppliers: [
      ["Unilever Pakistan Distributor", "Lahore", 410000],
      ["Nestlé Pakistan Ltd", "Lahore", 0],
      ["Fresh Foods Wholesale", "Kasur", 96000],
    ],
    items: [
      ["SKU-1001", "Cooking Oil 5L Bottle", "BTL", 2450, 2790, 320, 60],
      ["SKU-1002", "Basmati Rice 5kg Bag", "BAG", 1850, 2250, 260, 50],
      ["SKU-1003", "Refined Sugar 1kg", "PKT", 148, 175, 900, 200],
      ["SKU-1004", "Tea Pack 950g", "PKT", 1420, 1680, 180, 40],
      ["SKU-1005", "Beauty Soap Bar 120g", "PCS", 118, 155, 1400, 300],
      ["SKU-1006", "Shampoo 400ml", "BTL", 620, 790, 240, 50],
      ["SKU-1007", "Biscuits Family Pack", "PKT", 210, 265, 760, 150],
      ["SKU-1008", "UHT Milk 1L", "PKT", 245, 285, 480, 120],
      ["SKU-1009", "Washing Detergent 1kg", "PKT", 385, 470, 340, 80],
      ["SKU-1010", "Soft Drink 1.5L", "BTL", 165, 210, 620, 150],
    ],
    employees: [
      ["Saad", "Hussain", "Store Manager", "Operations", 125000],
      ["Ayesha", "Nawaz", "Head Cashier", "Sales", 62000],
      ["Bilal", "Tariq", "Cashier", "Sales", 48000],
      ["Hina", "Sultan", "Floor Supervisor", "Operations", 58000],
      ["Kamran", "Javed", "Inventory Clerk", "Operations", 52000],
    ],
    extraAccounts: [
      ["5021", "Store Rent — All Outlets", "EXPENSE", "EXPENSE"],
      ["5022", "POS & Card Machine Charges", "EXPENSE", "EXPENSE"],
    ],
    expenses: [
      ["Store rent — 3 outlets", "5021", 480000, "OTHER"],
      ["Card machine settlement charges", "5022", 34800, "OTHER"],
      ["Electricity — all outlets", A.UTILITIES, 186000, "UTILITIES"],
      ["Shopping bags & packaging", A.OFFICE, 41000, "SUPPLIES"],
    ],
  },

  distribution: {
    label: "Distribution",
    emoji: "🚚",
    companyName: "Fast Track Distribution",
    taxRate: 18,
    itemCategory: "TRADING",
    branches: [
      ["DEP1", "Central Depot — Lahore", "Lahore"],
      ["DEP2", "Regional Depot — Sialkot", "Sialkot"],
    ],
    customers: [
      ["Ali General Store", "Lahore", 15, 78000],
      ["Madina Mart", "Sheikhupura", 15, 45000],
      ["Corner Shop — Model Town", "Lahore", 7, 0],
      ["City Superstore", "Sialkot", 30, 210000],
    ],
    suppliers: [
      ["Nestlé Pakistan Ltd", "Lahore", 640000],
      ["Colgate Palmolive Pakistan", "Karachi", 0],
      ["Tapal Tea (Pvt) Ltd", "Karachi", 155000],
    ],
    items: [
      ["FMC-101", "Milk Pack 250ml — Case of 27", "CASE", 4850, 5450, 220, 50],
      ["FMC-102", "Juice 200ml — Case of 24", "CASE", 3180, 3690, 180, 40],
      ["FMC-103", "Toothpaste 100g — Case of 48", "CASE", 8640, 9950, 90, 25],
      ["FMC-104", "Tea 190g — Case of 24", "CASE", 7200, 8250, 110, 30],
      ["FMC-105", "Bath Soap — Case of 72", "CASE", 8100, 9400, 140, 35],
      ["FMC-106", "Mineral Water 1.5L — Case of 12", "CASE", 780, 960, 400, 100],
      ["FMC-107", "Instant Noodles — Case of 60", "CASE", 3900, 4620, 165, 40],
      ["FMC-108", "Cooking Oil 1L — Case of 12", "CASE", 5760, 6540, 130, 30],
    ],
    employees: [
      ["Usman", "Ghani", "Distribution Manager", "Operations", 138000],
      ["Waqar", "Ahmed", "Route Sales Officer", "Sales", 62000],
      ["Naveed", "Iqbal", "Route Sales Officer", "Sales", 62000],
      ["Shahid", "Mehmood", "Van Driver", "Logistics", 45000],
      ["Sana", "Khalid", "Order Booker", "Sales", 55000],
    ],
    extraAccounts: [
      ["5023", "Vehicle Fuel & Maintenance", "EXPENSE", "EXPENSE"],
      ["5024", "Route Commission & Incentives", "EXPENSE", "EXPENSE"],
    ],
    expenses: [
      ["Van fuel — all routes", "5023", 168000, "TRAVEL"],
      ["Route sales commission", "5024", 92000, "OTHER"],
      ["Depot electricity & cold storage", A.UTILITIES, 74000, "UTILITIES"],
      ["Crates & loading supplies", A.OFFICE, 22500, "SUPPLIES"],
    ],
  },

  import_company: {
    label: "Import / Export",
    emoji: "🚢",
    companyName: "Global Link Import & Export",
    taxRate: 18,
    itemCategory: "TRADING",
    branches: [["HO", "Head Office — Karachi", "Karachi"]],
    customers: [
      ["Gulf Trading LLC (Dubai)", "Dubai", 45, 890000],
      ["Pak Distributors Ltd", "Karachi", 30, 265000],
      ["Sunrise Enterprises", "Lahore", 30, 0],
      ["Al-Habib Traders", "Karachi", 15, 118000],
    ],
    suppliers: [
      ["Ningbo Electronics Co. (China)", "Ningbo", 1450000],
      ["Shenzhen Hardware Group", "Shenzhen", 0],
      ["Emirates Steel Trading", "Dubai", 380000],
    ],
    items: [
      ["IMP-201", "LED Panel Light 36W — Carton of 20", "CTN", 42000, 54000, 85, 20],
      ["IMP-202", "Solar Inverter 3KW", "PCS", 88000, 112000, 34, 10],
      ["IMP-203", "Stainless Steel Coil 304", "TON", 640000, 748000, 18, 5],
      ["IMP-204", "Ceramic Tiles 60x60 — Box of 4", "BOX", 3400, 4450, 260, 60],
      ["IMP-205", "Auto Spare Parts Kit", "SET", 26500, 34800, 72, 20],
      ["IMP-206", "Industrial Bearing Set", "SET", 15800, 20900, 120, 30],
    ],
    employees: [
      ["Faisal", "Qureshi", "Import Manager", "Operations", 185000],
      ["Nida", "Aslam", "Documentation Officer", "Operations", 88000],
      ["Tariq", "Mehmood", "Accountant", "Finance", 125000],
      ["Junaid", "Farooq", "Logistics Coordinator", "Logistics", 78000],
      ["Maria", "Yousuf", "Export Sales Executive", "Sales", 92000],
    ],
    extraAccounts: [
      ["5030", "Customs Duty & Taxes", "EXPENSE", "EXPENSE"],
      ["5031", "Clearing & Forwarding Charges", "EXPENSE", "EXPENSE"],
      ["5032", "LC & Bank Charges", "EXPENSE", "EXPENSE"],
      ["5033", "Ocean Freight — Inward", "EXPENSE", "EXPENSE"],
    ],
    expenses: [
      ["Customs duty — consignment KHI-4417", "5030", 685000, "OTHER"],
      ["Clearing agent charges — 2 containers", "5031", 145000, "OTHER"],
      ["LC establishment & bank charges", "5032", 96000, "OTHER"],
      ["Ocean freight — Shanghai to Karachi", "5033", 420000, "TRAVEL"],
    ],
  },

  clearing_forwarding: {
    label: "Clearing & Forwarding",
    emoji: "🛃",
    companyName: "Prime Clearing & Forwarding",
    taxRate: 16, // Services carry provincial sales tax on services
    itemCategory: "SERVICE",
    branches: [["KHI", "Port Office — Karachi", "Karachi"]],
    customers: [
      ["Global Link Import & Export", "Karachi", 30, 340000],
      ["Textile Exporters Pvt Ltd", "Faisalabad", 30, 185000],
      ["Auto Parts Importers", "Lahore", 15, 0],
      ["Pharma Supplies Co.", "Karachi", 45, 96000],
    ],
    suppliers: [
      ["Karachi Port Trust", "Karachi", 280000],
      ["Maersk Line Agencies", "Karachi", 0],
      ["Highway Container Transport", "Karachi", 165000],
    ],
    items: [
      ["SVC-301", "Customs Clearance — 20ft Container", "JOB", 18000, 32000, 0, 0],
      ["SVC-302", "Customs Clearance — 40ft Container", "JOB", 26000, 48000, 0, 0],
      ["SVC-303", "Documentation & GD Filing", "JOB", 4500, 9500, 0, 0],
      ["SVC-304", "Terminal Handling Coordination", "JOB", 12000, 19500, 0, 0],
      ["SVC-305", "Inland Transport — Port to Warehouse", "TRIP", 22000, 34000, 0, 0],
      ["SVC-306", "Container Detention Handling", "JOB", 8000, 14500, 0, 0],
    ],
    employees: [
      ["Shoaib", "Akhtar", "Chief Clearing Agent", "Operations", 165000],
      ["Rabia", "Hameed", "Documentation Officer", "Operations", 85000],
      ["Nasir", "Ali", "Port Coordinator", "Operations", 72000],
      ["Hamza", "Siddiqui", "Accountant", "Finance", 105000],
      ["Iqbal", "Hussain", "Container Driver", "Logistics", 52000],
    ],
    extraAccounts: [
      ["4002", "Service Income — Clearance", "INCOME", "INCOME"],
      ["5034", "Port & Terminal Charges", "EXPENSE", "EXPENSE"],
      ["5035", "Container Transport Cost", "EXPENSE", "EXPENSE"],
    ],
    expenses: [
      ["Port & terminal handling charges", "5034", 385000, "OTHER"],
      ["Container transport — 14 trips", "5035", 246000, "TRAVEL"],
      ["Office rent — port area", A.RENT, 125000, "OTHER"],
      ["Courier & documentation costs", A.OFFICE, 38500, "SUPPLIES"],
    ],
  },

  wholesale: {
    label: "Wholesale",
    emoji: "📦",
    companyName: "Mega Wholesale Depot",
    taxRate: 18,
    itemCategory: "TRADING",
    branches: [
      ["WH1", "Main Warehouse — Lahore", "Lahore"],
      ["WH2", "Overflow Warehouse", "Lahore"],
    ],
    customers: [
      ["Rehman Dealers Network", "Lahore", 30, 425000],
      ["Shahzad Wholesale Point", "Gujranwala", 30, 168000],
      ["New Sabzi Mandi Traders", "Multan", 15, 0],
      ["Punjab Retail Chain", "Faisalabad", 45, 312000],
    ],
    suppliers: [
      ["Ittehad Manufacturing", "Faisalabad", 780000],
      ["Crescent Textile Mills", "Faisalabad", 0],
      ["Pak Plastic Industries", "Lahore", 224000],
    ],
    items: [
      ["WHL-401", "Cotton Fabric — 100m Roll", "ROLL", 24500, 28900, 140, 30],
      ["WHL-402", "Plastic Container 5L — Bundle of 50", "BUNDLE", 8750, 10600, 210, 50],
      ["WHL-403", "Towel Set — Carton of 40", "CTN", 18400, 22800, 95, 25],
      ["WHL-404", "Bedsheet Double — Carton of 20", "CTN", 32000, 39500, 68, 20],
      ["WHL-405", "Disposable Cups — Carton of 2000", "CTN", 6200, 7900, 320, 80],
      ["WHL-406", "Steel Utensil Set — Carton of 12", "CTN", 21600, 26400, 74, 20],
      ["WHL-407", "Blanket Winter — Bale of 10", "BALE", 42000, 51000, 45, 12],
    ],
    employees: [
      ["Arshad", "Mahmood", "Dealer Sales Manager", "Sales", 152000],
      ["Rizwan", "Haider", "Warehouse Incharge", "Operations", 88000],
      ["Sobia", "Anwar", "Accountant", "Finance", 108000],
      ["Ghulam", "Abbas", "Loading Supervisor", "Operations", 55000],
      ["Danish", "Raza", "Order Clerk", "Sales", 50000],
    ],
    extraAccounts: [
      ["5025", "Warehouse Rent & Storage", "EXPENSE", "EXPENSE"],
      ["5026", "Loading & Labour Charges", "EXPENSE", "EXPENSE"],
    ],
    expenses: [
      ["Warehouse rent — 2 units", "5025", 320000, "OTHER"],
      ["Loading labour — monthly", "5026", 148000, "OTHER"],
      ["Warehouse electricity", A.UTILITIES, 68000, "UTILITIES"],
      ["Packing material & straps", A.OFFICE, 34000, "SUPPLIES"],
    ],
  },
};

export function getDemoProfile(businessType: DemoBusinessType): DemoProfile {
  return PROFILES[businessType];
}

export function listDemoBusinesses() {
  return DEMO_BUSINESS_TYPES.map((id) => ({
    id,
    label: PROFILES[id].label,
    emoji: PROFILES[id].emoji,
    companyName: PROFILES[id].companyName,
  }));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const day = 24 * 60 * 60 * 1000;

/** Midnight-aligned date N days back, so seeded data never drifts by run time. */
function daysAgo(n: number): Date {
  const d = new Date(Date.now() - n * day);
  d.setHours(10, 0, 0, 0);
  return d;
}

function monthKey(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Deterministic pseudo-random in [0,1) so a sandbox is reproducible per index. */
function jitter(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

interface LedgerRow {
  id: string;
  companyId: string;
  accountId: string;
  voucherId?: string | null;
  invoiceId?: string | null;
  debit: number;
  credit: number;
  description: string;
  date: Date;
}

// ── The seeder ──────────────────────────────────────────────────────────────

export interface DemoSeedResult {
  accounts: number;
  items: number;
  salesInvoices: number;
  purchaseInvoices: number;
  employees: number;
  ledgerEntries: number;
  balanced: boolean;
}

export async function seedDemoCompany(
  companyId: string,
  businessType: DemoBusinessType,
): Promise<DemoSeedResult> {
  const p = PROFILES[businessType];
  // Globally-unique columns (barcode, accountNo, receiptNo, voucherNo, taxCode)
  // must not collide between concurrent sandboxes.
  const tag = companyId.replace(/-/g, "").slice(0, 8).toUpperCase();

  // Nothing is written until the very end: every id is generated up front and
  // the whole dataset goes out as one transaction. Against a remote database
  // that turns ~25 sequential round trips into one, which is the difference
  // between a demo that opens in seconds and one people give up on. It also
  // means a failure leaves no half-built company behind.
  const branchIds: string[] = [];
  const branchRows = p.branches.map(([code, name, city]) => {
    const id = randomUUID();
    branchIds.push(id);
    return { id, companyId, code, name, city, isActive: true };
  });
  const mainBranch = branchIds[0];
  const branchFor = (i: number) => branchIds[i % branchIds.length];

  // ── Chart of accounts ─────────────────────────────────────────────────
  const accountId: Record<string, string> = {};
  const coaRows = [...COMMON_ACCOUNTS, ...p.extraAccounts].map(
    ([code, name, type, partyType]) => {
      const id = randomUUID();
      accountId[code] = id;
      return {
        id,
        companyId,
        code,
        name,
        type,
        partyType,
        openDate: daysAgo(120),
      };
    },
  );

  // ── Parties ───────────────────────────────────────────────────────────
  const customers = p.customers.map(([name, city, creditDays, openDebit], i) => ({
    id: randomUUID(),
    companyId,
    code: `C-${String(i + 1).padStart(3, "0")}`,
    name,
    type: "ASSET",
    partyType: "CUSTOMER",
    city,
    phone: safeEncryptField(`0300-${1000000 + i * 111111}`),
    openDate: daysAgo(120),
    openDebit,
    openCredit: 0,
    creditDays,
    creditLimit: Math.max(250000, openDebit * 3),
  }));

  const suppliers = p.suppliers.map(([name, city, openCredit], i) => ({
    id: randomUUID(),
    companyId,
    code: `S-${String(i + 1).padStart(3, "0")}`,
    name,
    type: "LIABILITY",
    partyType: "SUPPLIER",
    city,
    phone: safeEncryptField(`0321-${2000000 + i * 111111}`),
    openDate: daysAgo(120),
    openDebit: 0,
    openCredit,
    creditDays: 30,
    creditLimit: 0,
  }));

  const accountRows = [...coaRows, ...customers, ...suppliers];

  // ── Items ─────────────────────────────────────────────────────────────
  const items = p.items.map(
    ([code, name, unit, purchaseRate, rate, openingQty, minStock]) => ({
      id: randomUUID(),
      companyId,
      code,
      name,
      unit,
      category: p.itemCategory,
      rate,
      purchaseRate,
      taxRate: p.taxRate,
      minStock,
      // Barcode is globally unique — never emit a bare SKU here.
      barcode: `${tag}-${code}`,
      description: null,
      openingQty,
    }),
  );

  const itemRows = items.map(({ openingQty: _ignored, ...row }) => row);

  const stockRateRows = items.map((it) => ({
    id: randomUUID(),
    companyId,
    itemId: it.id,
    rate: it.purchaseRate,
    date: daysAgo(120),
  }));

  // ── Tax configuration ─────────────────────────────────────────────────
  const taxConfigId = randomUUID();
  const taxRow = {
    id: taxConfigId,
    companyId,
    taxType: p.itemCategory === "SERVICE" ? "SALES_TAX" : "GST",
    taxCode: `${p.itemCategory === "SERVICE" ? "PST" : "GST"}-${p.taxRate}-${tag}`,
    taxRate: p.taxRate,
    description: `${p.taxRate}% ${p.itemCategory === "SERVICE" ? "sales tax on services" : "general sales tax"}`,
    isActive: true,
  };

  // ── Bank account ──────────────────────────────────────────────────────
  const openingBank = 2_400_000;
  const bankAccountId = randomUUID();
  const bankRow = {
    id: bankAccountId,
    companyId,
    // Globally unique column — carries the sandbox tag.
    accountNo: `PK36MEZN00${tag}`,
    bankName: "Meezan Bank",
    accountName: `${p.companyName} — Current Account`,
    accountId: accountId[A.BANK],
    balance: openingBank,
  };

  // ── Ledger accumulator ────────────────────────────────────────────────
  const ledger: LedgerRow[] = [];
  const post = (
    accCode: string | { id: string },
    debit: number,
    credit: number,
    description: string,
    date: Date,
    links: { voucherId?: string; invoiceId?: string } = {},
  ) => {
    const accId = typeof accCode === "string" ? accountId[accCode] : accCode.id;
    ledger.push({
      id: randomUUID(),
      companyId,
      accountId: accId,
      debit: round2(debit),
      credit: round2(credit),
      description,
      date,
      voucherId: links.voucherId ?? null,
      invoiceId: links.invoiceId ?? null,
    });
  };

  // ── Opening position ──────────────────────────────────────────────────
  const openingStock = items.reduce((s, it) => s + it.openingQty * it.purchaseRate, 0);
  const openingCash = 450_000;
  const openingReceivable = customers.reduce((s, c) => s + c.openDebit, 0);
  const openingPayable = suppliers.reduce((s, c) => s + c.openCredit, 0);
  const openingDate = daysAgo(120);

  post(A.CASH, openingCash, 0, "Opening balance", openingDate);
  post(A.BANK, openingBank, 0, "Opening balance", openingDate);
  post(A.STOCK, openingStock, 0, "Opening stock", openingDate);
  for (const c of customers) {
    if (c.openDebit > 0) post({ id: c.id }, c.openDebit, 0, `Opening balance — ${c.name}`, openingDate);
  }
  for (const s of suppliers) {
    if (s.openCredit > 0) post({ id: s.id }, 0, s.openCredit, `Opening balance — ${s.name}`, openingDate);
  }
  post(
    A.CAPITAL,
    0,
    openingCash + openingBank + openingStock + openingReceivable - openingPayable,
    "Owner's capital introduced",
    openingDate,
  );

  // Opening stock as inventory movement so stock reports have a starting point.
  const inventoryTxns: any[] = items
    .filter((it) => it.openingQty > 0)
    .map((it) => ({
      id: randomUUID(),
      companyId,
      type: "PURCHASE",
      date: openingDate,
      itemId: it.id,
      qty: it.openingQty,
      rate: it.purchaseRate,
      amount: it.openingQty * it.purchaseRate,
      location: "MAIN",
      partyId: null,
    }));

  // ── Purchases ─────────────────────────────────────────────────────────
  // Six invoices across the last ~100 days, each 2-3 lines, all posted.
  const purchaseInvoices: any[] = [];
  const purchaseItems: any[] = [];
  const purchaseOrders: any[] = [];
  const purchaseOrderItems: any[] = [];
  const grns: any[] = [];
  const grnItems: any[] = [];

  // A service business buys the same lines it sells (port charges, transport)
  // but holds no stock, so it still needs purchase lines — the earlier filter
  // left that list empty and the seed blew up on the first purchase.
  const stocked = p.itemCategory !== "SERVICE";

  for (let i = 0; i < 6; i++) {
    const supplier = suppliers[i % suppliers.length];
    const date = daysAgo(100 - i * 15);
    const lineCount = 2 + (i % 2);
    const invId = randomUUID();
    let net = 0;

    for (let l = 0; l < lineCount; l++) {
      const it = items[(i * 3 + l) % items.length];
      // Purchase volume is deliberately kept below sales volume — a demo that
      // opens on a loss-making P&L is not a demo anyone wants to see.
      const qty = Math.max(6, Math.round(12 + jitter(i * 10 + l) * 15));
      const amount = qty * it.purchaseRate;
      net += amount;
      purchaseItems.push({
        id: randomUUID(),
        invoiceId: invId,
        itemId: it.id,
        qty,
        rate: it.purchaseRate,
        amount,
        discountPercent: 0,
        taxPercent: p.taxRate,
      });
      if (stocked) {
        inventoryTxns.push({
          id: randomUUID(),
          companyId,
          type: "PURCHASE",
          date,
          itemId: it.id,
          qty,
          rate: it.purchaseRate,
          amount,
          location: "MAIN",
          partyId: supplier.id,
        });
      }
    }

    const tax = round2((net * p.taxRate) / 100);
    const total = round2(net + tax);

    purchaseInvoices.push({
      id: invId,
      companyId,
      branchId: branchFor(i),
      invoiceNo: `PI-${String(1001 + i)}`,
      date,
      dueDate: new Date(date.getTime() + 30 * day),
      supplierId: supplier.id,
      total,
      taxConfigId,
      approvalStatus: "APPROVED",
      approvedAt: date,
      paymentTerms: "30 days",
      notes: "Goods received in full",
    });

    post(A.PURCHASES, net, 0, `Purchase PI-${1001 + i}`, date, { invoiceId: invId });
    post(A.TAX_PAYABLE, tax, 0, `Input tax PI-${1001 + i}`, date, { invoiceId: invId });
    post({ id: supplier.id }, 0, total, `Purchase PI-${1001 + i}`, date, { invoiceId: invId });

    // First two purchases carry a PO + GRN so those pages are populated too.
    if (i < 2) {
      const poId = randomUUID();
      purchaseOrders.push({
        id: poId,
        companyId,
        branchId: mainBranch,
        poNo: `PO-${String(501 + i)}`,
        date: new Date(date.getTime() - 5 * day),
        dueDate: date,
        remarks: "Regular replenishment order",
        status: "COMPLETED",
        approvalStatus: "APPROVED",
        supplierId: supplier.id,
      });
      const grnId = randomUUID();
      grns.push({
        id: grnId,
        companyId,
        branchId: mainBranch,
        grnNo: `GRN-${String(301 + i)}`,
        date,
        poId,
        supplierId: supplier.id,
        status: "RECEIVED",
        remarks: "Received against PO",
      });
      for (const line of purchaseItems.filter((x) => x.invoiceId === invId)) {
        purchaseOrderItems.push({
          id: randomUUID(),
          poId,
          itemId: line.itemId,
          qty: line.qty,
          rate: line.rate,
          invoicedQty: line.qty,
          discountPercent: 0,
          taxPercent: p.taxRate,
        });
        grnItems.push({
          id: randomUUID(),
          grnId,
          itemId: line.itemId,
          orderedQty: line.qty,
          receivedQty: line.qty,
          rate: line.rate,
          amount: line.amount,
        });
      }
    }
  }

  // ── Sales ─────────────────────────────────────────────────────────────
  // Ten invoices across the last ~80 days. A few are left unpaid and past
  // their credit days so the ageing report and overdue KPI are non-zero.
  const salesInvoices: any[] = [];
  const salesItems: any[] = [];
  const quotations: any[] = [];
  const quotationItems: any[] = [];

  for (let i = 0; i < 10; i++) {
    const customer = customers[i % customers.length];
    const date = daysAgo(80 - i * 8);
    const lineCount = 2 + (i % 3);
    const invId = randomUUID();
    let net = 0;

    for (let l = 0; l < lineCount; l++) {
      const it = items[(i * 2 + l) % items.length];
      const qty = Math.max(3, Math.round(6 + jitter(i * 7 + l) * 13));
      const amount = qty * it.rate;
      net += amount;
      salesItems.push({
        id: randomUUID(),
        invoiceId: invId,
        itemId: it.id,
        qty,
        rate: it.rate,
        amount,
        discountPercent: 0,
        taxPercent: p.taxRate,
      });
      if (stocked) {
        inventoryTxns.push({
          id: randomUUID(),
          companyId,
          type: "SALE",
          date,
          itemId: it.id,
          qty,
          rate: it.rate,
          amount,
          location: "MAIN",
          partyId: customer.id,
        });
      }
    }

    const tax = round2((net * p.taxRate) / 100);
    const total = round2(net + tax);

    salesInvoices.push({
      id: invId,
      companyId,
      branchId: branchFor(i),
      invoiceNo: `SI-${String(2001 + i)}`,
      date,
      dueDate: new Date(date.getTime() + customer.creditDays * day),
      customerId: customer.id,
      total,
      taxConfigId,
      approvalStatus: "APPROVED",
      approvedAt: date,
      paymentMethod: customer.creditDays === 0 ? "CASH" : "CREDIT",
      paymentTerms: customer.creditDays === 0 ? "Cash on delivery" : `${customer.creditDays} days`,
      location: "MAIN",
    });

    post({ id: customer.id }, total, 0, `Sales SI-${2001 + i}`, date, { invoiceId: invId });
    post(
      p.itemCategory === "SERVICE" && accountId["4002"] ? "4002" : A.SALES,
      0,
      net,
      `Sales SI-${2001 + i}`,
      date,
      { invoiceId: invId },
    );
    post(A.TAX_PAYABLE, 0, tax, `Output tax SI-${2001 + i}`, date, { invoiceId: invId });

    // Two open quotations so the quotation page is not empty.
    if (i < 2) {
      const qId = randomUUID();
      const qItem = items[i % items.length];
      const qQty = 12 + i * 6;
      quotations.push({
        id: qId,
        companyId,
        branchId: mainBranch,
        quotationNo: `QT-${String(101 + i)}`,
        date: daysAgo(12 - i * 5),
        total: round2(qQty * qItem.rate * (1 + p.taxRate / 100)),
        remarks: "Awaiting customer confirmation",
        validUntil: new Date(Date.now() + 15 * day),
        status: "SENT",
        approvalStatus: "PENDING",
        customerId: customer.id,
      });
      quotationItems.push({
        id: randomUUID(),
        quotationId: qId,
        itemId: qItem.id,
        qty: qQty,
        rate: qItem.rate,
        amount: qQty * qItem.rate,
      });
    }
  }

  // ── Receipts against sales ────────────────────────────────────────────
  const vouchers: any[] = [];
  const voucherEntries: any[] = [];
  const receipts: any[] = [];

  for (let i = 0; i < 5; i++) {
    const inv = salesInvoices[i];
    const customer = customers.find((c) => c.id === inv.customerId)!;
    const date = new Date(inv.date.getTime() + 10 * day);
    const amount = round2(inv.total * (i % 2 === 0 ? 1 : 0.6));
    const intoBank = i % 2 === 0;
    const cashCode = intoBank ? A.BANK : A.CASH;

    const voucherId = randomUUID();
    vouchers.push({
      id: voucherId,
      companyId,
      branchId: mainBranch,
      voucherNo: `CRV-${String(701 + i)}`,
      type: "CRV",
      date,
      narration: `Receipt against ${inv.invoiceNo} — ${customer.name}`,
    });
    voucherEntries.push(
      { id: randomUUID(), companyId, voucherId, accountId: accountId[cashCode], amount },
      { id: randomUUID(), companyId, voucherId, accountId: customer.id, amount: -amount },
    );

    receipts.push({
      id: randomUUID(),
      companyId,
      branchId: mainBranch,
      // Globally unique column.
      receiptNo: `RCP-${tag}-${String(801 + i)}`,
      date,
      amount,
      paymentMode: intoBank ? "BANK_TRANSFER" : "CASH",
      partyId: customer.id,
      referenceNo: inv.invoiceNo,
      narration: `Payment received against ${inv.invoiceNo}`,
      status: "POSTED",
      approvalStatus: "APPROVED",
      approvedAt: date,
      voucherId,
    });

    post(cashCode, amount, 0, `Receipt ${inv.invoiceNo}`, date, { voucherId });
    post({ id: customer.id }, 0, amount, `Receipt ${inv.invoiceNo}`, date, { voucherId });
  }

  // ── Payments to suppliers ─────────────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    const pi = purchaseInvoices[i];
    const supplier = suppliers.find((s) => s.id === pi.supplierId)!;
    const date = new Date(pi.date.getTime() + 20 * day);
    const amount = round2(pi.total * 0.75);
    const voucherId = randomUUID();

    vouchers.push({
      id: voucherId,
      companyId,
      branchId: mainBranch,
      voucherNo: `CPV-${String(901 + i)}`,
      type: "CPV",
      date,
      narration: `Payment against ${pi.invoiceNo} — ${supplier.name}`,
    });
    voucherEntries.push(
      { id: randomUUID(), companyId, voucherId, accountId: supplier.id, amount },
      { id: randomUUID(), companyId, voucherId, accountId: accountId[A.BANK], amount: -amount },
    );

    post({ id: supplier.id }, amount, 0, `Payment ${pi.invoiceNo}`, date, { voucherId });
    post(A.BANK, 0, amount, `Payment ${pi.invoiceNo}`, date, { voucherId });
  }

  // ── Expenses ──────────────────────────────────────────────────────────
  const expenseVouchers: any[] = [];
  const expenseItems: any[] = [];

  p.expenses.forEach(([description, accCode, amount, category], i) => {
    const evId = randomUUID();
    const date = daysAgo(25 - i * 5);
    expenseVouchers.push({
      id: evId,
      companyId,
      branchId: mainBranch,
      // Globally unique column.
      voucherNo: `EXP-${tag}-${String(601 + i)}`,
      date,
      description,
      totalAmount: amount,
      approvalStatus: "APPROVED",
      expenseAccountId: accountId[accCode] || accountId[A.OFFICE],
      paymentAccountId: accountId[i % 2 === 0 ? A.BANK : A.CASH],
    });
    expenseItems.push({
      id: randomUUID(),
      expenseVoucherId: evId,
      description,
      amount,
      category,
    });
    post(accCode in accountId ? accCode : A.OFFICE, amount, 0, description, date);
    post(i % 2 === 0 ? A.BANK : A.CASH, 0, amount, description, date);
  });

  // ── HR: employees, attendance, payroll ────────────────────────────────
  const employees = p.employees.map(([firstName, lastName, designations, department, salary], i) => ({
    id: randomUUID(),
    companyId,
    employeeId: `EMP-${String(101 + i)}`,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.finovaos.app`,
    phone: `0333-${3000000 + i * 111111}`,
    designations,
    department,
    dateOfJoining: daysAgo(400 + i * 90),
    salary,
    salaryFrequency: "MONTHLY",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    isActive: true,
  }));

  // Attendance for the last 21 calendar days, weekends skipped.
  const attendance: any[] = [];
  for (let d = 1; d <= 21; d++) {
    const date = daysAgo(d);
    const dow = date.getDay();
    if (dow === 0) continue; // Sunday off
    employees.forEach((emp, ei) => {
      const roll = jitter(d * 31 + ei);
      const status = roll > 0.94 ? "ABSENT" : roll > 0.88 ? "LATE" : roll > 0.85 ? "LEAVE" : "PRESENT";
      const checkIn = new Date(date);
      checkIn.setHours(9, status === "LATE" ? 35 : 5, 0, 0);
      const checkOut = new Date(date);
      checkOut.setHours(18, 10, 0, 0);
      attendance.push({
        id: randomUUID(),
        companyId,
        employeeId: emp.id,
        date,
        status,
        checkIn: status === "ABSENT" || status === "LEAVE" ? null : checkIn,
        checkOut: status === "ABSENT" || status === "LEAVE" ? null : checkOut,
      });
    });
  }

  // Last month paid, current month still pending — so the payroll screen has
  // something to run as well as something to look at.
  const payroll: any[] = [];
  const advances: any[] = [];
  const lastMonth = monthKey(1);
  const thisMonth = monthKey(0);
  let paidPayrollTotal = 0;

  employees.forEach((emp, i) => {
    const allowances = round2(emp.salary * 0.12);
    const deductions = round2(emp.salary * 0.05);
    const net = round2(emp.salary + allowances - deductions);
    paidPayrollTotal += net;

    payroll.push({
      id: randomUUID(),
      companyId,
      employeeId: emp.id,
      monthYear: lastMonth,
      baseSalary: emp.salary,
      allowances,
      deductions,
      netSalary: net,
      paidAmount: net,
      paymentStatus: "PAID",
      paymentDate: daysAgo(28),
      remarks: "Salary transferred to bank",
    });
    payroll.push({
      id: randomUUID(),
      companyId,
      employeeId: emp.id,
      monthYear: thisMonth,
      baseSalary: emp.salary,
      allowances,
      deductions,
      netSalary: net,
      paidAmount: 0,
      paymentStatus: "PENDING",
      remarks: null,
    });

    if (i < 2) {
      advances.push({
        id: randomUUID(),
        companyId,
        employeeId: emp.id,
        amount: round2(emp.salary * 0.25),
        date: daysAgo(12 + i * 3),
        monthYear: thisMonth,
        status: "PENDING",
        remarks: "Advance against current month salary",
      });
    }
  });

  post(A.SALARIES, paidPayrollTotal, 0, `Payroll ${lastMonth}`, daysAgo(28));
  post(A.BANK, 0, paidPayrollTotal, `Payroll ${lastMonth}`, daysAgo(28));

  // ── CRM contacts ──────────────────────────────────────────────────────
  const contacts = [
    ...customers.map((c, i) => ({
      id: randomUUID(),
      companyId,
      branchId: mainBranch,
      name: `${c.name} — Purchase Desk`,
      email: `contact${i + 1}@demo.finovaos.app`,
      phone: `0300-${4000000 + i * 111111}`,
      companyName: c.name,
      position: "Purchase Manager",
      type: "CUSTOMER",
      accountId: c.id,
      isActive: true,
    })),
    ...suppliers.map((s, i) => ({
      id: randomUUID(),
      companyId,
      branchId: mainBranch,
      name: `${s.name} — Sales Desk`,
      email: `supplier${i + 1}@demo.finovaos.app`,
      phone: `0321-${5000000 + i * 111111}`,
      companyName: s.name,
      position: "Key Account Manager",
      type: "SUPPLIER",
      accountId: s.id,
      isActive: true,
    })),
  ];

  // ── Bank statement lines for reconciliation ───────────────────────────
  const bankStatements = receipts
    .filter((r) => r.paymentMode === "BANK_TRANSFER")
    .map((r, i) => ({
      id: randomUUID(),
      companyId,
      bankAccountId,
      statementNo: `STM-${String(401 + i)}`,
      date: r.date,
      amount: r.amount,
      description: `Inward transfer — ${r.narration}`,
      referenceNo: r.referenceNo,
      isReconciled: i === 0,
    }));

  // Bank balance must agree with what the ledger says about it, otherwise the
  // dashboard's cash tile contradicts the bank ledger on the very first click.
  const bankMovement = round2(
    ledger
      .filter((l) => l.accountId === accountId[A.BANK])
      .reduce((s, l) => s + l.debit - l.credit, 0),
  );
  bankRow.balance = bankMovement;

  // ── Write everything, in FK order, as one batch ───────────────────────
  await prisma.$transaction([
    prisma.branch.createMany({ data: branchRows }),
    prisma.account.createMany({ data: accountRows }),
    prisma.itemNew.createMany({ data: itemRows }),
    prisma.stockRate.createMany({ data: stockRateRows }),
    prisma.taxConfiguration.create({ data: taxRow }),
    prisma.bankAccount.create({ data: bankRow }),
    prisma.purchaseOrder.createMany({ data: purchaseOrders }),
    prisma.purchaseOrderItem.createMany({ data: purchaseOrderItems }),
    prisma.purchaseInvoice.createMany({ data: purchaseInvoices }),
    prisma.purchaseInvoiceItem.createMany({ data: purchaseItems }),
    prisma.goodsReceiptNote.createMany({ data: grns }),
    prisma.goodsReceiptNoteItem.createMany({ data: grnItems }),
    prisma.salesInvoice.createMany({ data: salesInvoices }),
    prisma.salesInvoiceItem.createMany({ data: salesItems }),
    prisma.quotation.createMany({ data: quotations }),
    prisma.quotationItem.createMany({ data: quotationItems }),
    prisma.inventoryTxn.createMany({ data: inventoryTxns }),
    prisma.voucher.createMany({ data: vouchers }),
    prisma.voucherEntry.createMany({ data: voucherEntries }),
    prisma.paymentReceipt.createMany({ data: receipts }),
    prisma.expenseVoucher.createMany({ data: expenseVouchers }),
    prisma.expenseItem.createMany({ data: expenseItems }),
    prisma.employee.createMany({ data: employees }),
    prisma.attendance.createMany({ data: attendance }),
    prisma.payroll.createMany({ data: payroll }),
    prisma.advanceSalary.createMany({ data: advances }),
    prisma.contact.createMany({ data: contacts }),
    prisma.bankStatement.createMany({ data: bankStatements }),
    prisma.ledgerEntry.createMany({ data: ledger }),
  ]);

  const totalDebit = round2(ledger.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(ledger.reduce((s, l) => s + l.credit, 0));

  return {
    accounts: coaRows.length + customers.length + suppliers.length,
    items: items.length,
    salesInvoices: salesInvoices.length,
    purchaseInvoices: purchaseInvoices.length,
    employees: employees.length,
    ledgerEntries: ledger.length,
    balanced: Math.abs(totalDebit - totalCredit) < 1,
  };
}
