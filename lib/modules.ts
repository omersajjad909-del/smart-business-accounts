export type Module = {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: string;
};

// Canonical module list — IDs use underscores (matches planPermissions.ts + ChoosePlanClient.tsx)
// Prices are user-facing monthly prices
export const MODULES: Module[] = [
  {
    id: "accounting",
    name: "Accounting & Invoicing",
    price: 15,
    description: "Core accounting, sales & purchase invoices, chart of accounts",
    icon: "📊",
  },
  {
    id: "crm",
    name: "CRM & Sales",
    price: 15,
    description: "Manage contacts, leads, and sales pipeline",
    icon: "🎯",
  },
  {
    id: "hr_payroll",
    name: "HR & Payroll",
    price: 20,
    description: "Employee records, attendance, and payroll processing",
    icon: "👥",
  },
  {
    id: "bank_reconciliation",
    name: "Bank Reconciliation",
    price: 10,
    description: "Automatic transaction sync and bank reconciliation",
    icon: "🏦",
  },
  {
    id: "inventory",
    name: "Inventory & Warehouse",
    price: 12,
    description: "Stock management, reorder alerts, and GRN tracking",
    icon: "📦",
  },
  {
    id: "reports",
    name: "Advanced Reports",
    price: 8,
    description: "P&L, Balance Sheet, Cash Flow, and custom report builder",
    icon: "📈",
  },
  {
    id: "multi_branch",
    name: "Multi-Branch Support",
    price: 15,
    description: "Manage multiple locations and consolidated reports",
    icon: "🌍",
  },
  {
    id: "whatsapp",
    name: "WhatsApp & SMS",
    price: 8,
    description: "Automated notifications via WhatsApp and SMS",
    icon: "💬",
  },
  {
    id: "api_access",
    name: "API Access",
    price: 20,
    description: "REST API + Webhooks for custom integrations",
    icon: "⚡",
  },
  {
    id: "tax_filing",
    name: "Tax Filing",
    price: 10,
    description: "Jurisdiction-ready tax reports for 40+ countries",
    icon: "📋",
  },
];

// Base platform fee (infrastructure cost, not charged to users directly)
export const BASE_PLAN_PRICE = 10;

// Helper: get module by ID
export function getModule(id: string): Module | undefined {
  return MODULES.find(m => m.id === id);
}

// Helper: calculate custom plan price from selected module IDs
export function calcCustomPrice(moduleIds: string[]): number {
  return moduleIds.reduce((sum, id) => {
    const m = getModule(id);
    return sum + (m?.price || 0);
  }, 0);
}
