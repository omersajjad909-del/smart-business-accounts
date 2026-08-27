import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askJson, clip } from "@/lib/ai/adminAI";
import { brandContext, checkForbiddenClaims } from "@/lib/ai/productBrief";
import { deleteAiAsset, listAiAssets, saveAiAsset } from "@/lib/ai/aiStore";
import { loadCompanySignals } from "@/lib/ai/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;

/**
 * Case Study Generator — a case study built from what a customer actually did.
 *
 * The rule this page is designed around: a quotation is never generated. Not
 * as a suggestion, not as a placeholder that reads like a real sentence, not
 * "something like this". The marketing site has already had invented
 * testimonials removed once — two named people who did not exist, credited with
 * earnings from a program that had never paid anyone — and the affiliate page
 * still carries the comment explaining why they went. Generating a plausible
 * quotation is how that happens again.
 *
 * So the draft carries a QUOTE SLOT: the point in the story where a customer
 * sentence belongs, with the question to ask them to get it. Real quotes come
 * from one place only — a Testimonial or a Feedback row where the customer
 * ticked publishConsent — and those are attached here, unedited, and offered to
 * the draft as material.
 *
 * Everything numeric comes from the database. The model is told the figures and
 * forbidden from producing any others.
 */

type Candidate = {
  companyId: string;
  name: string;
  businessType: string;
  country: string | null;
  plan: string;
  monthsActive: number;
  invoicesTotal: number;
  vouchersTotal: number;
  itemCount: number;
  accountCount: number;
  userCount: number;
  branchCount: number;
  employeeCount: number;
  /** Quotes this customer has already consented to publish. */
  consentedQuotes: Array<{ id: string; source: string; text: string; name: string | null; role: string | null; rating: number | null }>;
  /** Why this customer would or would not make a good case study. */
  strength: number;
};

async function loadCandidates(): Promise<Candidate[]> {
  const signals = await loadCompanySignals();
  if (!signals.length) return [];

  const ids = signals.map((s) => s.companyId);
  const scope = { companyId: { in: ids } };

  const [invTotals, vouTotals, testimonials, feedback] = await Promise.all([
    db.salesInvoice.groupBy({ by: ["companyId"], where: { ...scope, deletedAt: null }, _count: { _all: true } }).catch(() => []),
    db.voucher.groupBy({ by: ["companyId"], where: { ...scope, deletedAt: null }, _count: { _all: true } }).catch(() => []),
    // Only PUBLISHED testimonials count as consented. A PENDING one is a
    // submission nobody has agreed to show.
    db.testimonial.findMany({
      where: { companyId: { in: ids }, status: "PUBLISHED" },
      select: { id: true, companyId: true, message: true, name: true, role: true, rating: true },
      take: 200,
    }).catch(() => []),
    db.feedback.findMany({
      where: { companyId: { in: ids }, publishConsent: true },
      select: { id: true, companyId: true, subject: true, message: true, name: true, role: true, rating: true },
      take: 200,
    }).catch(() => []),
  ]);

  const countOf = (rows: any[], id: string) => rows.find((r: any) => r.companyId === id)?._count?._all ?? 0;

  return signals.map((s): Candidate => {
    const invoicesTotal = countOf(invTotals, s.companyId);
    const vouchersTotal = countOf(vouTotals, s.companyId);
    const monthsActive = Math.max(0, Math.floor(s.ageDays / 30));

    const consentedQuotes = [
      ...testimonials.filter((t: any) => t.companyId === s.companyId).map((t: any) => ({
        id: t.id, source: "testimonial", text: t.message, name: t.name ?? null, role: t.role ?? null, rating: t.rating ?? null,
      })),
      ...feedback.filter((f: any) => f.companyId === s.companyId).map((f: any) => ({
        id: f.id, source: "review", text: `${f.subject}\n${f.message}`.trim(), name: f.name ?? null, role: f.role ?? null, rating: f.rating ?? null,
      })),
    ];

    // A case study needs a story, and a story needs volume and time. This is a
    // rough sum, capped, purely to sort the list.
    const strength = Math.min(100,
      Math.min(invoicesTotal, 300) / 3 +
      Math.min(monthsActive, 12) * 3 +
      (consentedQuotes.length ? 20 : 0) +
      (s.branchCount > 1 ? 8 : 0) +
      (s.employeeCount > 0 ? 5 : 0));

    return {
      companyId: s.companyId,
      name: s.name,
      businessType: s.businessType,
      country: s.country,
      plan: s.billedPlan || s.plan,
      monthsActive,
      invoicesTotal,
      vouchersTotal,
      itemCount: s.itemCount,
      accountCount: s.accountCount,
      userCount: s.userCount,
      branchCount: s.branchCount,
      employeeCount: s.employeeCount,
      consentedQuotes,
      strength: Math.round(strength),
    };
  }).sort((a, b) => b.strength - a.strength);
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const [candidates, saved] = await Promise.all([
      loadCandidates(),
      listAiAssets<CaseStudy>("case-study", 60),
    ]);

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      candidates,
      saved: saved.map((s) => ({ id: s.id, key: s.key, title: s.title, createdAt: s.createdAt, data: s.data })),
    });
  } catch (err) {
    console.error("[case-study-generator] GET failed:", err);
    return NextResponse.json({ error: "Could not load candidates" }, { status: 500 });
  }
}

type CaseStudy = {
  companyId: string;
  companyName: string;
  headline: string;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  /** Figures used, each traced to where it came from. */
  metricsUsed: Array<{ label: string; value: string; source: string }>;
  /** Where a customer sentence belongs, and what to ask to get it. */
  quoteSlots: Array<{ placement: string; askThem: string }>;
  /** Real quotes attached, verbatim. Never generated. */
  realQuotes: Array<{ id: string; source: string; text: string; name: string | null; role: string | null }>;
  /** What has to happen before this is published. */
  beforePublishing: string[];
  flags: string[];
  createdAt: string;
};

const STUDY_SYSTEM = `
${brandContext()}

You draft a customer case study for FinovaOS from real usage figures.

THE ONE RULE THAT MATTERS MORE THAN THE REST:
Never write a quotation. Not attributed, not unattributed, not as an example,
not as a placeholder that reads like a sentence someone said. If the story wants
a customer voice at a point, put an entry in quoteSlots describing where it goes
and the question to ask the customer to get it. Any sentence in quotation marks
that was not given to you is a fabricated testimonial.

The same applies to numbers. Use only the figures you are given. Do not compute
a percentage improvement, a time saved, or a cost reduction — none of that was
measured, and a made-up "40% faster" is the claim that gets a marketing page
taken apart.

Return one JSON object:
  headline        one line, specific, names the business type and the concrete
                  thing. No superlatives.
  summary         two or three sentences a reader could stop after.
  sections        four to six { heading, body }. The arc is: what the business
                  is, how they worked before, what they set up in FinovaOS, what
                  is different now. Where you would want evidence you do not
                  have, say plainly what is not known rather than filling it.
  metricsUsed     every figure you used, as { label, value, source }. source is
                  where it came from, copied from the data you were given.
  quoteSlots      two to four { placement, askThem }. placement is where in the
                  study a customer sentence belongs. askThem is the question to
                  put to the customer — specific enough that the answer is
                  usable, open enough that it is theirs.
  beforePublishing  the list of things that must be true before this goes live:
                  customer permission to be named, quotes obtained, figures
                  confirmed with them. Be concrete.

Voice: the customer is the subject of the story, not FinovaOS. Write what they
do, and where the software appears, describe what it replaced.
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { companyId, notes, useQuoteIds } = (await req.json().catch(() => ({}))) as {
      companyId?: string; notes?: string; useQuoteIds?: string[];
    };
    if (!companyId) return NextResponse.json({ error: "companyId is required" }, { status: 400 });

    const candidates = await loadCandidates();
    const c = candidates.find((x) => x.companyId === companyId);
    if (!c) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const chosenQuotes = c.consentedQuotes.filter((q) => !useQuoteIds?.length || useQuoteIds.includes(q.id));

    const metrics = [
      { label: "Months on FinovaOS", value: String(c.monthsActive), source: "Company record" },
      { label: "Invoices raised", value: String(c.invoicesTotal), source: "Sales invoices" },
      { label: "Vouchers posted", value: String(c.vouchersTotal), source: "Vouchers" },
      { label: "Stock items", value: String(c.itemCount), source: "Item master" },
      { label: "Ledger accounts", value: String(c.accountCount), source: "Chart of accounts" },
      { label: "Users", value: String(c.userCount), source: "Company users" },
      { label: "Branches", value: String(c.branchCount), source: "Branches" },
      { label: "Employees on payroll", value: String(c.employeeCount), source: "Employee records" },
    ];

    const study = await askJson<Omit<CaseStudy, "companyId" | "companyName" | "realQuotes" | "flags" | "createdAt">>(
      STUDY_SYSTEM,
      [
        `Customer: ${c.name}`,
        `Business type: ${c.businessType}`,
        `Country: ${c.country || "unknown"}`,
        `Plan: ${c.plan}`,
        ``,
        `Figures from the database — these are the only numbers you may use:`,
        ...metrics.map((m) => `  ${m.label}: ${m.value}  (source: ${m.source})`),
        ``,
        chosenQuotes.length
          ? `Quotes this customer has already consented to publish. You may refer to what they said, but reproduce a quotation only if it is one of these, word for word:\n${chosenQuotes.map((q) => `  [${q.id}] ${clip(q.text, 500)}`).join("\n")}`
          : `This customer has given no consented quotation. Every customer voice in the story must be a quoteSlot.`,
        ``,
        notes ? `What the founder knows about this customer:\n${String(notes).slice(0, 1500)}` : "",
      ].filter(Boolean).join("\n"),
      3400,
    );

    if (!study || !Array.isArray(study.sections)) {
      return NextResponse.json({ error: "The model did not return a usable draft. Try again." }, { status: 502 });
    }

    const allText = [
      study.headline, study.summary,
      ...(study.sections || []).map((s) => `${s.heading} ${s.body}`),
    ].join("\n");

    const flags = checkForbiddenClaims(allText);

    // The backstop for the rule above: any quotation mark pair containing a
    // sentence, in text that was not one of the consented quotes, is reported.
    // The check is deliberately noisy — a false positive costs a glance.
    const quoted = allText.match(/[""][^""]{25,}[""]|"[^"]{25,}"/g) || [];
    const consentedText = chosenQuotes.map((q) => q.text.toLowerCase());
    for (const q of quoted) {
      const inner = q.slice(1, -1).toLowerCase();
      if (!consentedText.some((t) => t.includes(inner.slice(0, 40)))) {
        flags.push(`Contains a quotation that no customer supplied: ${q.slice(0, 90)}`);
      }
    }

    const result: CaseStudy = {
      companyId,
      companyName: c.name,
      headline: study.headline || "",
      summary: study.summary || "",
      sections: study.sections,
      metricsUsed: study.metricsUsed || metrics,
      quoteSlots: study.quoteSlots || [],
      realQuotes: chosenQuotes.map((q) => ({ id: q.id, source: q.source, text: q.text, name: q.name, role: q.role })),
      beforePublishing: study.beforePublishing || [],
      flags,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ study: result });
  } catch (err) {
    console.error("[case-study-generator] POST failed:", err);
    return NextResponse.json({ error: "The case study could not be drafted" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const { study } = (await req.json().catch(() => ({}))) as { study?: CaseStudy };
    if (!study?.companyId) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });

    const saved = await saveAiAsset({
      kind: "case-study",
      key: study.companyId,
      title: study.headline || study.companyName,
      data: study,
      admin: { id: admin.id, email: admin.email },
    });
    return NextResponse.json({ id: saved.id });
  } catch (err) {
    console.error("[case-study-generator] PUT failed:", err);
    return NextResponse.json({ error: "Could not save the draft" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  return NextResponse.json({ removed: await deleteAiAsset(id) });
}
