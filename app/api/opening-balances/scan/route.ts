import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { aiUrl } from "@/lib/aiGateway";
import { resolveCompanyId } from "@/lib/tenant";
import { consumeTrialQuota } from "@/lib/trialLimits";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// A photographed khata page rarely has more than a few dozen lines; the account
// list is what makes the model's matching possible, so it is capped to keep the
// prompt bounded on companies with a very large chart.
const MAX_ACCOUNTS_IN_PROMPT = 600;

interface ScannedRow {
  rawName: string;
  nameRoman?: string | null;
  narration?: string | null;
  debit: number;
  credit: number;
  accountId?: string | null;
  confidence?: number;
}

async function geminiVision(base64: string, mimeType: string, prompt: string): Promise<string> {
  const res = await fetch(
    aiUrl(
      "google-ai-studio",
      `v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Cut off before the platform's own 60s limit, which answers with a
      // non-JSON error page; a timeout here falls through to OpenAI or a clean error.
      signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8000, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini Vision error ${res.status}`);
  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function openAiVision(base64: string, mimeType: string, prompt: string): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` };
  if (process.env.OPENAI_PROJECT) headers["OpenAI-Project"] = process.env.OPENAI_PROJECT;
  if (process.env.OPENAI_ORG) headers["OpenAI-Organization"] = process.env.OPENAI_ORG;
  const res = await fetch(aiUrl("openai", "chat/completions", "https://api.openai.com/v1/chat/completions"), {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(40_000),
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" } },
      ] }],
      max_tokens: 4000,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI Vision error ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content || "{}";
}

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? Math.abs(v) : 0;
  const n = parseFloat(String(v ?? "").replace(/[,\s]/g, "").replace(/[()]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : 0;
};

export async function POST(req: NextRequest) {
  const role = req.headers.get("x-user-role")?.toUpperCase();
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can import opening balances" }, { status: 403 });
  }
  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return NextResponse.json({ error: "No vision AI key configured (GEMINI_API_KEY or OPENAI_API_KEY)" }, { status: 500 });
  }

  const companyId = await resolveCompanyId(req);
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  try {
    // Paid per image, same as receipt scanning.
    const quota = await consumeTrialQuota(companyId, "AI");
    if (!quota.ok) return NextResponse.json({ error: quota.message }, { status: 402 });

    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const accounts = await prisma.account.findMany({
      where: { companyId, deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
      take: MAX_ACCOUNTS_IN_PROMPT,
    });
    const accountList = accounts.map(a => `${a.id}|${a.code}|${a.name}`).join("\n");

    const prompt = `You read a photographed page from a handwritten or printed ledger / khata register kept by a Pakistani business. The text may be Urdu script (Nastaliq), Roman Urdu, English, or a mix. Read ONLY the page that is fully in frame (a photo may also show part of the facing page - ignore it).

First decide what kind of page it is:

A) "party_ledger" - the page is ONE party's account: a heading like "کھاتہ بنام <party>" ("account in the name of"), then many dated lines (date, detail, debit, credit, running balance). This is the usual khata page.
B) "balance_list" - the page is a LIST of different parties, one line each with a single balance.

Column meanings on a khata page (Urdu headings, right to left): تاریخ = date, تفصیل = detail, صفحہ = page no, نام or بنام = DEBIT, جمع = CREDIT, بقایا = running BALANCE, and a narrow column "جمع یا نام" says whether the balance is credit (جمع) or debit (نام). "وصول" in the detail means money received (a credit). "Nill" / "Nil" / "نل" means zero.
In a customer's khata a debit (نام) means the party owes the business.

Return ONLY JSON of this shape:
{
  "pageType": "party_ledger" | "balance_list",

  "partyName": "party_ledger only: the name in the heading, in its ORIGINAL script",
  "partyNameRoman": "the same name in Roman letters, or null",
  "accountId": "party_ledger only: id of the matching account in the list below, or null",
  "broughtForward": { "amount": number, "side": "debit" | "credit" | null } or null,   // an opening line that has only a balance and no debit/credit amount
  "entries": [ { "date": "as written", "detail": "as written", "debit": number, "credit": number, "balance": number or null } ],   // balance: the number written in the بقایا column on THAT line; 0 when it says Nill; null only if unreadable
  "closing": { "amount": number, "side": "debit" | "credit" | null },   // the LAST balance written on the page; amount 0 when it says Nill

  "rows": [ { "rawName": "...", "nameRoman": "... or null", "narration": "... or null", "debit": number, "credit": number, "accountId": "id or null", "confidence": number } ],   // balance_list only

  "notes": "anything the user should check, or null"
}

Rules:
- For party_ledger fill partyName, entries, closing (and broughtForward when present); leave rows empty. List EVERY written line from the top line to the very bottom line in page order - do not stop early and do not skip lines; the last balance on the page is on the bottom-most written line, not in the middle. Each line's balance should equal the previous balance plus its debit or minus its credit - use that to double-check how you read each number. debit/credit are the amounts in the نام / جمع columns; a line has one of them, the other is 0. balance is the running balance written on that line.
- For balance_list fill rows only: one per line, skipping headings and totals. Debit = the party owes the business, credit = the business owes the party; if there is no marker put it in debit and say so in notes.
- Read Urdu/Eastern digits (۰۱۲۳۴۵۶۷۸۹) as normal numbers. Remove commas. Never guess an unreadable amount: use 0 and say so in notes.
- accountId: choose only when the page name and an account clearly refer to the same party, even across scripts or spellings. Otherwise null. Never invent an id.

Accounts (id|code|name):
${accountList || "(no accounts yet)"}`;

    let raw = "{}";
    if (GEMINI_API_KEY) {
      try { raw = await geminiVision(base64, mimeType, prompt); }
      catch (e) { console.warn("Ledger scan: Gemini failed, trying OpenAI", e); raw = "{}"; }
    }
    if ((raw === "{}" || !raw) && OPENAI_API_KEY) raw = await openAiVision(base64, mimeType, prompt);

    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch { return NextResponse.json({ error: "Could not read the page. Try a clearer, well-lit photo." }, { status: 422 }); }

    const validIds = new Set(accounts.map(a => a.id));
    const notes: string[] = parsed.notes ? [String(parsed.notes)] : [];
    const safeId = (v: unknown) => (v && validIds.has(String(v)) ? String(v) : null);
    let rows: ScannedRow[] = [];

    if (parsed.pageType === "party_ledger") {
      // One party, many lines. What goes into opening balances is that party's
      // closing balance — never one row per line, which is how every line used
      // to land as a separate debit.
      const entries: Array<{ date: string; detail: string; debit: number; credit: number; balance: number | null }> =
        (Array.isArray(parsed.entries) ? parsed.entries : []).map((e: any) => ({
          date: String(e?.date ?? "").trim(),
          detail: String(e?.detail ?? "").trim(),
          debit: toNumber(e?.debit),
          credit: toNumber(e?.credit),
          // null means unreadable; 0 means the page says Nill. They are not the same.
          balance: e?.balance === null || e?.balance === undefined || e?.balance === "" ? null : toNumber(e.balance),
        }));
      const bfAmt = toNumber(parsed.broughtForward?.amount);
      const bfSigned = parsed.broughtForward?.side === "credit" ? -bfAmt : bfAmt;
      const computed = bfSigned + entries.reduce((n, e) => n + e.debit - e.credit, 0);

      // Every line's written balance has to follow from the one before it. Where it
      // does not, a number on that line (or the one above) was misread — handwriting
      // reads wrong by a digit far more often than it adds up wrong, so this finds
      // the line to look at instead of leaving the user with a bare total.
      const broken: string[] = [];
      let prev: number | null = parsed.broughtForward ? Math.abs(bfAmt) : null;
      entries.forEach((e, i) => {
        if (prev !== null && e.balance !== null) {
          const expected = Math.abs(prev + e.debit - e.credit);
          if (Math.abs(expected - e.balance) > 1) {
            broken.push(`line ${i + 1}${e.date ? ` (${e.date})` : ""}: ${prev} ${e.debit ? `+ ${e.debit}` : `- ${e.credit}`} should be ${expected}, page reads ${e.balance}`);
          }
        }
        if (e.balance !== null) prev = e.balance;
      });
      if (broken.length) {
        notes.push(`These lines do not add up - check them against the page: ${broken.slice(0, 3).join("; ")}${broken.length > 3 ? `; and ${broken.length - 3} more` : ""}.`);
      }

      // The last line's own balance is the closing figure; fall back to the
      // model's separate "closing", then to the running total.
      const last = entries[entries.length - 1];
      const written =
        last && last.balance !== null ? last.balance
        : parsed.closing && parsed.closing.amount != null ? toNumber(parsed.closing.amount)
        : Math.abs(computed);
      const lastLabel = last?.date ? `, last entry ${last.date}` : "";

      if (!broken.length && Math.abs(Math.abs(computed) - written) > 1 && entries.length) {
        notes.push(`The entries add up to ${Math.abs(computed).toFixed(2)} ${computed >= 0 ? "Dr" : "Cr"} but the last balance reads ${written.toFixed(2)} - please check both.`);
      }
      const side: "debit" | "credit" =
        Math.abs(Math.abs(computed) - written) <= 1 && computed !== 0 ? (computed > 0 ? "debit" : "credit")
        : parsed.closing?.side === "credit" ? "credit"
        : parsed.closing?.side === "debit" ? "debit"
        : last && last.credit > last.debit ? "credit" : "debit";

      // Every line of the page becomes its own row, with its own debit and credit,
      // so the user checks the page against the screen line by line instead of
      // typing it. The opening balance itself is one figure per account, so rows
      // of the same account are combined when saved (see the review screen).
      const name = String(parsed.partyName ?? "").trim();
      if (name) {
        const roman = parsed.partyNameRoman ? String(parsed.partyNameRoman).trim() : null;
        const accountId = safeId(parsed.accountId);
        const mk = (debit: number, credit: number, narration: string): ScannedRow => ({ rawName: name, nameRoman: roman, narration, debit, credit, accountId });
        if (parsed.broughtForward && bfAmt > 0) {
          rows.push(mk(bfSigned > 0 ? bfAmt : 0, bfSigned < 0 ? bfAmt : 0, "Balance brought forward"));
        }
        for (const e of entries) {
          if (e.debit || e.credit) rows.push(mk(e.debit, e.credit, [e.date, e.detail].filter(Boolean).join(" · ")));
        }
        if (!rows.length) notes.push(`No debit or credit amounts could be read for "${name}".`);
        else if (written === 0) notes.push(`"${name}" ends at Nil - the lines below add up to nothing, so nothing is left owing.`);
      }
    } else {
      rows = (Array.isArray(parsed.rows) ? parsed.rows : [])
        .map((r: any) => ({
          rawName: String(r?.rawName ?? "").trim(),
          nameRoman: r?.nameRoman ? String(r.nameRoman).trim() : null,
          narration: r?.narration ? String(r.narration).trim() : null,
          debit: toNumber(r?.debit),
          credit: toNumber(r?.credit),
          // The model can return an id that is not in the list; drop it rather
          // than let an unverified id reach the import.
          accountId: safeId(r?.accountId),
          confidence: typeof r?.confidence === "number" ? r.confidence : undefined,
        }))
        .filter((r: ScannedRow) => r.rawName && (r.debit || r.credit));
    }

    return NextResponse.json({ rows, notes: notes.length ? notes.join(" | ") : null });
  } catch (e: any) {
    const timedOut = e?.name === "TimeoutError" || e?.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "Reading the photo took too long. Try again with a clearer, closer shot." : (e.message || "Scan failed") }, { status: timedOut ? 504 : 500 });
  }
}
