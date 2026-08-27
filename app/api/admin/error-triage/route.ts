import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { aiConfigured, askJson, clip } from "@/lib/ai/adminAI";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;
const DAY = 86400_000;

/**
 * Error Triage — what is failing in production, grouped, ranked and explained.
 *
 * Two sources, and the distinction matters:
 *
 *   Sentry holds the exceptions. Reading it needs SENTRY_AUTH_TOKEN,
 *   SENTRY_ORG and SENTRY_PROJECT, none of which are set today — only the DSN
 *   is, which is write-only. So the Sentry half is built and dormant, and the
 *   page says exactly which three variables would switch it on rather than
 *   pretending the feature does not exist.
 *
 *   The database holds the operational failures Sentry never sees: an email
 *   that bounced, a payment that failed, a security incident. Those are often
 *   the more expensive ones — a failed invoice email is a customer who does not
 *   know they owe money — and they are available with no extra configuration.
 *
 * Grouping is by normalised message, done in code. Two errors differing only by
 * a UUID or a timestamp are the same error, and a model asked to group them
 * would sometimes decide otherwise, which turns a count into a guess.
 */

type Problem = {
  key: string;
  source: "sentry" | "email" | "billing" | "security" | "system";
  title: string;
  detail: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  /** Distinct customers hit, where that is knowable. */
  affected: number;
};

/** Strip the parts of a message that vary per occurrence. */
function normalise(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}\S*/g, "<time>")
    .replace(/\b\d{5,}\b/g, "<n>")
    .replace(/["'][^"']{40,}["']/g, "<string>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function group(
  rows: Array<{ message: string; at: Date | string; who?: string | null; detail?: string }>,
  source: Problem["source"],
  titlePrefix: string,
): Problem[] {
  const map = new Map<string, Problem & { whoSet: Set<string> }>();

  for (const r of rows) {
    const key = `${source}:${normalise(r.message)}`;
    const at = new Date(r.at).toISOString();
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (at < existing.firstSeen) existing.firstSeen = at;
      if (at > existing.lastSeen) existing.lastSeen = at;
      if (r.who) existing.whoSet.add(r.who);
    } else {
      map.set(key, {
        key,
        source,
        title: `${titlePrefix}${normalise(r.message)}`,
        detail: r.detail || r.message,
        count: 1,
        firstSeen: at,
        lastSeen: at,
        affected: 0,
        whoSet: new Set(r.who ? [r.who] : []),
      });
    }
  }

  return [...map.values()].map(({ whoSet, ...p }) => ({ ...p, affected: whoSet.size }));
}

/** Failures recorded in our own tables. Always available. */
async function loadDatabaseProblems(days: number): Promise<Problem[]> {
  const since = new Date(Date.now() - days * DAY);

  const [emails, subs, incidents, notifications] = await Promise.all([
    db.emailLog.findMany({
      where: { status: "failed", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }).catch(() => []),
    db.subscription.findMany({
      where: { failedPayments: { gt: 0 } },
      select: {
        companyId: true, plan: true, provider: true, status: true,
        failedPayments: true, lastPaymentAttempt: true, updatedAt: true,
      },
      take: 200,
    }).catch(() => []),
    db.securityIncident.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }).catch(() => []),
    db.notification.findMany({
      where: { type: "ERROR", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }).catch(() => []),
  ]);

  const problems: Problem[] = [];

  problems.push(...group(
    emails.map((e: any) => ({
      message: e.error || "Email send failed with no error recorded",
      at: e.createdAt,
      who: e.to,
      detail: `Subject: ${e.subject}\nTo: ${e.to}\nError: ${e.error || "(none recorded)"}`,
    })),
    "email",
    "Email failed — ",
  ));

  problems.push(...group(
    subs.map((s: any) => ({
      message: `${s.provider} payment failing on a ${s.plan} subscription (status ${s.status})`,
      at: s.lastPaymentAttempt || s.updatedAt,
      who: s.companyId,
      detail: `Provider: ${s.provider}\nPlan: ${s.plan}\nSubscription status: ${s.status}\nConsecutive failures: ${s.failedPayments}`,
    })),
    "billing",
    "Billing — ",
  ));

  problems.push(...group(
    incidents.map((i: any) => ({
      message: `${i.severity} ${i.category}: ${i.title}`,
      at: i.detectedAt || i.createdAt,
      // An incident is a single event, not a per-customer one, so its id stands
      // in for "who" — that makes `affected` a distinct-incident count here
      // rather than a customer count, which is the honest reading of the row.
      who: i.id,
      detail: clip(
        [
          `Title: ${i.title}`,
          `Severity: ${i.severity} · Category: ${i.category} · Status: ${i.status}`,
          i.affectedScope ? `Scope: ${i.affectedScope}` : "",
          `Summary: ${i.summary || ""}`,
          i.lastNotifyError ? `Last notify error: ${i.lastNotifyError}` : "",
        ].filter(Boolean).join("\n"),
        1200,
      ),
    })),
    "security",
    "Security — ",
  ));

  problems.push(...group(
    notifications.map((n: any) => ({
      message: n.message || n.title,
      at: n.createdAt,
      who: n.userId,
      detail: `${n.title}\n${n.message}`,
    })),
    "system",
    "System — ",
  ));

  return problems;
}

type SentryState = { configured: boolean; reachable: boolean; note: string };

/**
 * Sentry issues, when the three variables are present.
 *
 * The DSN alone is not enough: it is a write credential. Reading the issue list
 * needs an auth token with `project:read`, which is created in Sentry under
 * Settings → Auth Tokens.
 */
async function loadSentryProblems(days: number): Promise<{ problems: Problem[]; state: SentryState }> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const host = process.env.SENTRY_HOST || "https://sentry.io";

  if (!token || !org || !project) {
    return {
      problems: [],
      state: {
        configured: false,
        reachable: false,
        note: "Sentry is receiving errors (the DSN is set) but this page cannot read them back. " +
          "That needs SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT. The DSN is write-only.",
      },
    };
  }

  const statsPeriod = days <= 1 ? "24h" : days <= 7 ? "7d" : "14d";
  const url = `${host}/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/` +
    `?statsPeriod=${statsPeriod}&query=is:unresolved&limit=50`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        problems: [],
        state: {
          configured: true, reachable: false,
          note: `Sentry refused the request (${res.status}). ${clip(body, 200)}`,
        },
      };
    }

    const issues = (await res.json()) as any[];
    const problems: Problem[] = issues.map((i) => ({
      key: `sentry:${i.id}`,
      source: "sentry" as const,
      title: `${i.metadata?.type || i.title || "Error"}${i.culprit ? ` in ${i.culprit}` : ""}`,
      detail: [
        i.metadata?.value || i.title || "",
        i.culprit ? `Location: ${i.culprit}` : "",
        i.permalink ? `Sentry: ${i.permalink}` : "",
      ].filter(Boolean).join("\n"),
      count: Number(i.count) || 1,
      firstSeen: i.firstSeen || new Date().toISOString(),
      lastSeen: i.lastSeen || new Date().toISOString(),
      affected: Number(i.userCount) || 0,
    }));

    return {
      problems,
      state: { configured: true, reachable: true, note: `${problems.length} unresolved issue(s) from Sentry.` },
    };
  } catch (err) {
    return {
      problems: [],
      state: {
        configured: true, reachable: false,
        note: `Could not reach Sentry: ${err instanceof Error ? err.message : "unknown error"}`,
      },
    };
  }
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const days = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 7));
    const [dbProblems, sentry] = await Promise.all([
      loadDatabaseProblems(days),
      loadSentryProblems(days),
    ]);

    const problems = [...sentry.problems, ...dbProblems]
      .sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1));

    return NextResponse.json({
      aiConfigured: aiConfigured(),
      days,
      sentry: sentry.state,
      problems,
      summary: {
        distinct: problems.length,
        occurrences: problems.reduce((s, p) => s + p.count, 0),
        customersAffected: problems.reduce((s, p) => s + p.affected, 0),
        bySource: problems.reduce<Record<string, number>>((acc, p) => {
          acc[p.source] = (acc[p.source] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    console.error("[error-triage] GET failed:", err);
    return NextResponse.json({ error: "Could not read the failure log" }, { status: 500 });
  }
}

type Verdict = {
  key: string;
  severity: "critical" | "high" | "medium" | "low" | "noise";
  plainEnglish: string;
  likelyCause: string;
  suggestedFix: string;
  customerImpact: string;
};

const TRIAGE_SYSTEM = `
You triage production failures for FinovaOS, a Next.js and Prisma accounting
platform on Postgres, billing through Lemon Squeezy and Safepay, email through a
transactional provider.

For each problem you are given, return an object with:
  key            the key exactly as given
  severity       critical | high | medium | low | noise
  plainEnglish   one sentence, what is broken, no jargon
  likelyCause    one or two sentences. If you cannot tell, say so — do not
                 invent a stack trace or name a file you were not shown.
  suggestedFix   the concrete next step. "Reproduce it by..." is a valid answer
                 when the cause is genuinely unclear.
  customerImpact one sentence on what a customer experiences. If nobody is
                 affected, say that.

Severity is about money and trust, not stack depth:
- critical: a customer cannot work, is billed wrongly, or sees another
  customer's data.
- high: a customer is blocked on one feature, or is not receiving email they
  need — an unsent invoice email is high, because they do not know they owe.
- medium: degraded but recoverable.
- low: cosmetic or self-healing.
- noise: a bot, a scan, an expected timeout. Say so plainly; the operator needs
  permission to ignore things.

Return a JSON array of these objects and nothing else.
`;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  if (!aiConfigured()) {
    return NextResponse.json({ error: "No AI provider configured" }, { status: 503 });
  }

  try {
    const { days = 7 } = (await req.json().catch(() => ({}))) as { days?: number };
    const window = Math.min(30, Math.max(1, Number(days) || 7));

    const [dbProblems, sentry] = await Promise.all([
      loadDatabaseProblems(window),
      loadSentryProblems(window),
    ]);
    const problems = [...sentry.problems, ...dbProblems]
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    if (!problems.length) {
      return NextResponse.json({ verdicts: [], note: "Nothing is failing in this window." });
    }

    const payload = problems.map((p) => [
      `--- key: ${p.key}`,
      `source: ${p.source}`,
      `occurrences: ${p.count}, distinct subjects affected: ${p.affected}`,
      `first seen: ${p.firstSeen}, last seen: ${p.lastSeen}`,
      `title: ${p.title}`,
      `detail: ${clip(p.detail, 700)}`,
    ].join("\n")).join("\n\n");

    const verdicts = await askJson<Verdict[]>(TRIAGE_SYSTEM, payload, 3000);
    if (!Array.isArray(verdicts)) {
      return NextResponse.json({ error: "The model did not return a usable result. Try again." }, { status: 502 });
    }

    const known = new Set(problems.map((p) => p.key));
    return NextResponse.json({
      verdicts: verdicts.filter((v) => v && known.has(v.key)),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[error-triage] POST failed:", err);
    return NextResponse.json({ error: "Triage could not be completed" }, { status: 500 });
  }
}
