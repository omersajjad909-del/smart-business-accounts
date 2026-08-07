/**
 * Google Sheets Sync API
 *
 * The integration works via Google Sheets API using a service account.
 * Company configures: spreadsheet ID + service account JSON key.
 *
 * GET  /api/automation/sheets              — get config
 * PUT  /api/automation/sheets              — save config { spreadsheetId, serviceAccountJson, sheetName }
 * POST /api/automation/sheets              — append a row { sheetName?, values: string[] }
 * POST /api/automation/sheets?action=sync_contacts — sync all customers/contacts to sheet
 * POST /api/automation/sheets?action=sync_invoices — sync sales invoices to sheet
 * POST /api/automation/sheets?action=sync_inventory — sync inventory items to sheet
 * GET  /api/automation/sheets?action=read  — read rows from sheet
 */

import { NextRequest, NextResponse } from "next/server";
import { getAutomationCompanyId } from "@/lib/automationHelpers";
import { prisma } from "@/lib/prisma";



async function getSheetsConfig(companyId: string): Promise<{ spreadsheetId: string; serviceAccountJson: string; sheetName: string } | null> {
  try {
    const log = await prisma.activityLog.findFirst({
      where: { action: "SHEETS_CONFIG", companyId },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    });
    return log?.details ? JSON.parse(log.details) : null;
  } catch { return null; }
}

// ─── Google Sheets API helper using JWT ─────────────────────────────────────
async function getSheetsAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
  })).toString("base64url");

  // Sign with private key using Web Crypto
  const pemKey = sa.private_key.replace(/\\n/g, "\n");
  const keyData = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Buffer.from(keyData, "base64");
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    Buffer.from(`${header}.${claim}`)
  );
  const sig = Buffer.from(sigBytes).toString("base64url");
  const jwt = `${header}.${claim}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function appendToSheet(spreadsheetId: string, sheetName: string, values: string[][], accessToken: string) {
  const range = encodeURIComponent(`${sheetName}!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Sheets append failed");
  }
  return res.json();
}

async function readFromSheet(spreadsheetId: string, sheetName: string, accessToken: string) {
  const range = encodeURIComponent(`${sheetName}!A1:Z1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Sheets read failed");
  }
  const data = await res.json();
  return data.values || [];
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "read") {
      const cfg = await getSheetsConfig(companyId);
      if (!cfg?.spreadsheetId || !cfg?.serviceAccountJson) {
        return NextResponse.json({ error: "Google Sheets not configured" }, { status: 400 });
      }
      const sheetName = searchParams.get("sheet") || cfg.sheetName || "Sheet1";
      const token = await getSheetsAccessToken(cfg.serviceAccountJson);
      const rows = await readFromSheet(cfg.spreadsheetId, sheetName, token);
      return NextResponse.json({ rows });
    }

    // Return masked config
    const cfg = await getSheetsConfig(companyId);
    if (!cfg) return NextResponse.json({ configured: false });
    return NextResponse.json({
      configured: true,
      spreadsheetId: cfg.spreadsheetId,
      sheetName: cfg.sheetName,
      hasServiceAccount: Boolean(cfg.serviceAccountJson),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── PUT — save config ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { spreadsheetId, serviceAccountJson, sheetName = "Sheet1" } = body;

    if (!spreadsheetId) return NextResponse.json({ error: "spreadsheetId required" }, { status: 400 });

    await prisma.activityLog.create({
      data: {
        action: "SHEETS_CONFIG",
        companyId,
        details: JSON.stringify({ spreadsheetId, serviceAccountJson: serviceAccountJson || "", sheetName }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// ─── POST — append row or sync ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const companyId = await getAutomationCompanyId(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cfg = await getSheetsConfig(companyId);
    if (!cfg?.spreadsheetId || !cfg?.serviceAccountJson) {
      return NextResponse.json({ error: "Google Sheets not configured" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const accessToken = await getSheetsAccessToken(cfg.serviceAccountJson);

    if (action === "sync_invoices") {
      // Sync sales invoices — operational business data, not marketing.
      const invoices = await prisma.salesInvoice.findMany({
        where: { companyId },
        select: { invoiceNo: true, date: true, dueDate: true, total: true, customer: { select: { name: true } } },
        take: 1000,
        orderBy: { date: "desc" },
      }).catch(() => [] as any[]);

      const sheetName = searchParams.get("sheet") || "Invoices";
      const header = ["Invoice #", "Date", "Due Date", "Customer", "Total"];
      const values = [
        header,
        ...invoices.map((inv) => [
          inv.invoiceNo,
          new Date(inv.date).toLocaleDateString(),
          inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "",
          inv.customer?.name || "",
          String(inv.total),
        ]),
      ];

      await appendToSheet(cfg.spreadsheetId, sheetName, values, accessToken);
      return NextResponse.json({ success: true, synced: invoices.length });
    }

    if (action === "sync_inventory") {
      // Sync inventory items — operational business data, not marketing.
      const items = await prisma.itemNew.findMany({
        where: { companyId },
        select: { name: true, sku: true, quantity: true, minStock: true, unitPrice: true },
        take: 1000,
        orderBy: { name: "asc" },
      }).catch(() => [] as any[]);

      const sheetName = searchParams.get("sheet") || "Inventory";
      const header = ["Item", "SKU", "Quantity", "Reorder Level", "Unit Price"];
      const values = [
        header,
        ...items.map((it: any) => [it.name || "", it.sku || "", String(it.quantity ?? ""), String(it.minStock ?? ""), String(it.unitPrice ?? "")]),
      ];

      await appendToSheet(cfg.spreadsheetId, sheetName, values, accessToken);
      return NextResponse.json({ success: true, synced: items.length });
    }

    if (action === "sync_contacts") {
      // Sync customers from DB
      const customers = await prisma.contact.findMany({
        where: { companyId },
        select: { name: true, email: true, phone: true, createdAt: true },
        take: 1000,
        orderBy: { createdAt: "desc" },
      }).catch(() => [] as { name: string; email: string | null; phone: string | null; createdAt: Date }[]);

      const sheetName = searchParams.get("sheet") || "Contacts";
      const header = ["Name", "Email", "Phone", "Created At"];
      const values = [
        header,
        ...customers.map((c: any) => [c.name || "", c.email || "", c.phone || "", new Date(c.createdAt).toLocaleString()]),
      ];

      await appendToSheet(cfg.spreadsheetId, sheetName, values, accessToken);
      return NextResponse.json({ success: true, synced: customers.length });
    }

    // Append custom row
    const body = await req.json();
    const { values, sheetName } = body;
    if (!values?.length) return NextResponse.json({ error: "values required" }, { status: 400 });

    await appendToSheet(
      cfg.spreadsheetId,
      sheetName || cfg.sheetName || "Sheet1",
      Array.isArray(values[0]) ? values : [values],
      accessToken
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
