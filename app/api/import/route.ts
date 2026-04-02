import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/tenant";

// Supported sources and their column mappings
const COLUMN_MAPS: Record<string, Record<string, Record<string, string>>> = {
  quickbooks: {
    accounts: { Name: "name", Type: "type", Description: "description", Balance: "openDebit" },
    contacts: { "Customer Name": "name", Email: "email", Phone: "phone", City: "city" },
    items: { Name: "name", SKU: "code", Price: "rate", Unit: "unit" },
  },
  xero: {
    accounts: { "Account Name": "name", "Account Type": "type", Description: "description" },
    contacts: { "Contact Name": "name", "Email Address": "email", Phone: "phone", City: "city" },
    items: { "Item Code": "code", Description: "name", "Unit Price": "rate" },
  },
  sage: {
    accounts: { "Account Name": "name", "Account Type": "type", Balance: "openDebit" },
    contacts: { Name: "name", Email: "email", Telephone: "phone", Town: "city" },
    items: { "Item Name": "name", "Item Code": "code", "Selling Price": "rate" },
  },
  tally: {
    accounts: { "Ledger Name": "name", Group: "type", "Opening Balance": "openDebit" },
    contacts: { Name: "name", Email: "email", Phone: "phone", City: "city" },
    items: { Name: "name", "Part No": "code", Rate: "rate", Unit: "unit" },
  },
  csv: {
    accounts: { name: "name", type: "type", openDebit: "openDebit" },
    contacts: { name: "name", email: "email", phone: "phone", city: "city" },
    items: { name: "name", code: "code", rate: "rate", unit: "unit" },
  },
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] || ""));
    return row;
  });
}

function mapRow(
  row: Record<string, string>,
  colMap: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [srcKey, destKey] of Object.entries(colMap)) {
    if (row[srcKey] !== undefined) mapped[destKey] = row[srcKey];
  }
  return mapped;
}

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const formData = await req.formData();
  const source = (formData.get("source") as string)?.toLowerCase() || "csv";
  const dataType = (formData.get("dataType") as string)?.toLowerCase() || "accounts";
  const file = formData.get("file") as File | null;
  const rawJson = formData.get("data") as string | null;

  let rows: Record<string, string>[] = [];

  if (file) {
    const text = await file.text();
    rows = parseCSV(text);
  } else if (rawJson) {
    rows = JSON.parse(rawJson);
  } else {
    return NextResponse.json({ error: "No file or data provided" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Empty file or no data rows" }, { status: 400 });
  }

  const colMap = COLUMN_MAPS[source]?.[dataType] || COLUMN_MAPS.csv[dataType] || {};
  const mapped = rows.map((r) => mapRow(r, colMap));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  if (dataType === "accounts") {
    for (const row of mapped) {
      if (!row.name) { skipped++; continue; }
      try {
        const existing = await prisma.account.findFirst({ where: { companyId, name: row.name } });
        if (existing) { skipped++; continue; }

        const typeMap: Record<string, string> = {
          "Accounts Receivable": "DEBTOR", "Accounts Payable": "CREDITOR",
          "Bank": "BANK", "Cash": "CASH", "Asset": "ASSET",
          "Liability": "LIABILITY", "Equity": "EQUITY",
          "Income": "INCOME", "Expense": "EXPENSE", "DEBTOR": "DEBTOR",
        };
        const accountType = typeMap[row.type] || "EXPENSE";
        const code = `IMP-${Date.now()}-${imported}`;

        await prisma.account.create({
          data: {
            companyId, code, name: row.name, type: accountType,
            openDebit: parseFloat(row.openDebit || "0") || 0,
          },
        });
        imported++;
      } catch (e: any) {
        errors.push(`Account "${row.name}": ${e.message}`);
      }
    }
  } else if (dataType === "contacts") {
    for (const row of mapped) {
      if (!row.name) { skipped++; continue; }
      try {
        const existing = await prisma.account.findFirst({ where: { companyId, name: row.name } });
        if (existing) { skipped++; continue; }

        await prisma.account.create({
          data: {
            companyId,
            code: `CONT-${Date.now()}-${imported}`,
            name: row.name,
            type: "DEBTOR",
            email: row.email || null,
            phone: row.phone || null,
            city: row.city || null,
          },
        });
        imported++;
      } catch (e: any) {
        errors.push(`Contact "${row.name}": ${e.message}`);
      }
    }
  } else if (dataType === "items") {
    for (const row of mapped) {
      if (!row.name) { skipped++; continue; }
      try {
        const code = row.code || `ITEM-${Date.now()}-${imported}`;
        const existing = await prisma.itemNew.findFirst({ where: { companyId, name: row.name } });
        if (existing) { skipped++; continue; }

        await prisma.itemNew.create({
          data: {
            companyId, code, name: row.name,
            unit: row.unit || "PCS",
            rate: parseFloat(row.rate || "0") || 0,
          },
        });
        imported++;
      } catch (e: any) {
        errors.push(`Item "${row.name}": ${e.message}`);
      }
    }
  } else {
    return NextResponse.json({ error: `Unsupported data type: ${dataType}` }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    source,
    dataType,
    total: rows.length,
    imported,
    skipped,
    errors: errors.slice(0, 10),
  });
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    sources: ["quickbooks", "xero", "sage", "tally", "csv"],
    dataTypes: ["accounts", "contacts", "items"],
    columnMaps: COLUMN_MAPS,
  });
}
