/**
 * Daily "Founder Brief" — a separate email from the per-company business
 * numbers report (lib/dailyReport.ts). Where that one is live tenant data,
 * everything here is either a real live check (rates, SSL, GitHub repo
 * state) or a pre-written, evergreen rotation — never a model asked to
 * invent "today's news," since a cron with no live web search would just be
 * hallucinating specific facts and dates with nothing to catch it.
 */

import tls from "node:tls";
import { prisma } from "@/lib/prisma";
import { sendEmail, emailBase } from "@/lib/email";
import { getMarketRates } from "@/lib/marketRates";

const KARACHI_TZ = "Asia/Karachi";
function localDate(d: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // YYYY-MM-DD
}

const REPO_OWNER = "omersajjad909-del";
const REPO_NAME = "smart-business-accounts";
const APP_HOST = "finovaos.app";
const RECIPIENT = "omersajjad909@gmail.com";

// ─── Live checks ────────────────────────────────────────────────────────────

async function fetchJson(url: string, timeoutMs = 8000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json", "User-Agent": "finovaos-founder-brief" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function checkReachable(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status?: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, method: "GET", redirect: "follow" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

function checkSslExpiry(host: string, timeoutMs = 8000): Promise<{ daysRemaining: number; validTo: string } | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert?.valid_to) return resolve(null);
        const validTo = new Date(cert.valid_to);
        const daysRemaining = Math.round((validTo.getTime() - Date.now()) / 86_400_000);
        resolve({ daysRemaining, validTo: validTo.toISOString().slice(0, 10) });
      },
    );
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

export type GithubAudit = {
  branchProtected: boolean | null; // null = couldn't determine
  openIssues: number | null;
  openPRs: number | null;
  recentCommitCount: number;
  repeatedMessage: { text: string; count: number } | null;
};

async function auditGithubRepo(): Promise<GithubAudit> {
  const base = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
  const [protection, pulls, issues, commits] = await Promise.all([
    fetch(`${base}/branches/main/protection`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "finovaos-founder-brief" },
    }).then((r) => r.status).catch(() => null),
    fetchJson(`${base}/pulls?state=open&per_page=1`),
    fetchJson(`${base}/issues?state=open&per_page=50`),
    fetchJson(`${base}/commits?per_page=30`),
  ]);

  const openPRs = Array.isArray(pulls) ? pulls.length : null; // per_page=1 only tells us >=1 vs 0 reliably via Link header in a fuller impl; good enough as a signal
  const openIssuesOnly = Array.isArray(issues) ? issues.filter((i: any) => !i.pull_request).length : null;

  let repeatedMessage: GithubAudit["repeatedMessage"] = null;
  if (Array.isArray(commits)) {
    const counts = new Map<string, number>();
    for (const c of commits) {
      const msg = String(c?.commit?.message || "").split("\n")[0].trim();
      if (!msg) continue;
      counts.set(msg, (counts.get(msg) || 0) + 1);
    }
    let top: [string, number] | null = null;
    for (const entry of counts) if (!top || entry[1] > top[1]) top = entry;
    if (top && top[1] >= 3) repeatedMessage = { text: top[0], count: top[1] };
  }

  return {
    branchProtected: protection === 200 ? true : protection === 404 ? false : null,
    openIssues: openIssuesOnly,
    openPRs,
    recentCommitCount: Array.isArray(commits) ? commits.length : 0,
    repeatedMessage,
  };
}

// ─── Evergreen rotating content ─────────────────────────────────────────────
// Picked by day-of-year so the email varies day to day without inventing facts.

const BUSINESS_PROBLEMS = [
  "Most SMEs still run bookkeeping on Excel or a paper register, so nobody actually knows the real cash position until month-end — by then, late payments and supplier bills have already piled up and decisions get made on gut feel instead of data.",
  "A huge share of small trading businesses discover they're overdue on receivables only when a supplier chases them for payment — by then the cash gap is already a crisis, not a warning.",
  "One-person accounting teams are the single point of failure in most SMEs: if that person is sick or leaves, nobody else can answer 'what do we owe, and what's owed to us?' for weeks.",
  "Inventory that isn't tracked in real time quietly becomes dead stock — businesses keep reordering items they already have too much of, and run out of the ones that actually sell.",
  "Manual invoicing means pricing mistakes and missed tax fields go unnoticed until a customer disputes an invoice or a tax filing gets rejected — automation catches both before they go out the door.",
];

const FOUNDER_LEARNINGS = [
  "The most expensive mistake in early-stage B2B SaaS isn't building new features — it's keeping features alive that no customer actually uses. Every feature is an ongoing cost in support tickets, future bugs, and onboarding complexity. Once a week, look at actual usage and ask: is this still earning its keep? Fewer, heavily-used features beat many lightly-used ones.",
  "Founders tend to price based on their own cost-plus math, not on what the customer's alternative actually costs them (a spreadsheet, an accountant's time, a missed deadline). Price against the alternative, not against your effort.",
  "Churn almost never shows up as a single dramatic event — it shows up as declining usage weeks before the cancellation. The customers worth calling are the ones who've gone quiet, not the ones who've already cancelled.",
  "A feature request from your biggest customer is data about one account, not a roadmap. Three unrelated customers asking for the same thing independently is a much stronger signal than one loud one.",
  "Support tickets are free market research. The same question asked five times isn't five support tickets — it's one missing feature or one confusing screen.",
];

const MARKET_WATCH = [
  "FBR's e-invoicing / POS integration push keeps expanding to more sectors — worth checking fbr.gov.pk periodically for whether your sector's compliance deadline has moved.",
  "International accounting competitors (QuickBooks, Zoho Books, Xero) revise pricing periodically — a quarterly check on their current plans keeps your own positioning honest.",
  "Pakistan's minimum-tax regime has been widening to cover more business categories over the past few cycles — worth a periodic check with your tax advisor on whether that now applies to you.",
  "Buyers increasingly compare software not just on price but on local compliance support (FBR-ready invoicing, PKR pricing) — that's a real differentiator against international tools that treat Pakistan as an afterthought.",
];

function pickForToday<T>(arr: T[]): T {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return arr[dayOfYear % arr.length];
}

// ─── Assembly ────────────────────────────────────────────────────────────────

export type FounderBrief = {
  date: string;
  rates: Awaited<ReturnType<typeof getMarketRates>>;
  businessProblem: string;
  founderLearning: string;
  marketWatch: string;
  github: GithubAudit;
  statusReachable: { ok: boolean; status?: number };
  testimonialsReachable: { ok: boolean; status?: number };
  ssl: { daysRemaining: number; validTo: string } | null;
};

export async function buildFounderBrief(): Promise<FounderBrief> {
  const [rates, github, statusReachable, testimonialsReachable, ssl] = await Promise.all([
    getMarketRates(),
    auditGithubRepo(),
    checkReachable(`https://${APP_HOST}/status`),
    checkReachable(`https://${APP_HOST}/testimonials`),
    checkSslExpiry(APP_HOST),
  ]);

  return {
    date: new Date().toISOString().slice(0, 10),
    rates,
    businessProblem: pickForToday(BUSINESS_PROBLEMS),
    founderLearning: pickForToday(FOUNDER_LEARNINGS),
    marketWatch: pickForToday(MARKET_WATCH),
    github,
    statusReachable,
    testimonialsReachable,
    ssl,
  };
}

function githubFindings(g: GithubAudit): string[] {
  const out: string[] = [];
  if (g.branchProtected === false) {
    out.push("main branch has no branch protection set up — anyone with write access can push directly, with no required PR review.");
  }
  if (g.repeatedMessage) {
    out.push(`${g.repeatedMessage.count} of the last ${g.recentCommitCount} commits share the exact message "${g.repeatedMessage.text}" — specific, change-describing commit messages would make future debugging and changelogs much easier.`);
  }
  if (g.openIssues === 0 && g.openPRs === 0) {
    out.push("0 open issues and 0 open PRs right now — if small bugs/ideas aren't tracked anywhere, they tend to stay invisible and get forgotten.");
  }
  return out;
}

export function formatFounderBriefHtml(b: FounderBrief): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const head = (t: string) =>
    `<h3 style="margin:22px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#b45309">${esc(t)}</h3>`;

  const r = b.rates;
  const rateLine = (label: string, value: string | null) => (value ? `<div>${esc(label)}: <b>${esc(value)}</b></div>` : "");
  const ratesBlock = `
    ${rateLine("Gold", r.gold ? `$${Math.round(r.gold).toLocaleString("en-US")}/oz` : null)}
    ${rateLine("USD/PKR", r.usdPkr ? r.usdPkr.toFixed(1) : null)}
    ${rateLine("Brent Oil", r.brentOil ? `$${r.brentOil.toFixed(1)}/bbl` : null)}
    ${rateLine("WTI Oil", r.wtiOil ? `$${r.wtiOil.toFixed(1)}/bbl` : null)}
  `;

  const findings = githubFindings(b.github);
  const githubBlock = findings.length
    ? `<ul style="margin:4px 0;padding-left:20px;color:#555">${findings.map((f) => `<li style="margin-bottom:6px">${esc(f)}</li>`).join("")}</ul>`
    : `<p style="margin:0;color:#555">No notable issues found in this check.</p>`;

  const opsLines = [
    `Status page (${APP_HOST}/status): ${b.statusReachable.ok ? "reachable" : "not reachable in this check"}`,
    `Testimonials page: ${b.testimonialsReachable.ok ? "reachable" : "not reachable in this check"}`,
    b.ssl
      ? `SSL certificate: expires ${b.ssl.validTo} (${b.ssl.daysRemaining} days left)${b.ssl.daysRemaining <= 30 ? " ⚠️ renew soon" : ""}`
      : `SSL certificate: could not be checked`,
  ];

  const body = `
    <p style="margin:0 0 4px;color:#555">Founder Daily Brief — <b>${esc(b.date)}</b></p>
    ${head("Rates")}
    <div style="color:#333">${ratesBlock}</div>
    ${head("Today's business problem")}
    <p style="margin:0;color:#555">${esc(b.businessProblem)}</p>
    ${head("Repo health check (GitHub)")}
    ${githubBlock}
    ${head("Product & ops status")}
    <div style="color:#555">${opsLines.map((l) => `<div style="margin-bottom:4px">${esc(l)}</div>`).join("")}</div>
    ${head("Market & competition watch")}
    <p style="margin:0;color:#555">${esc(b.marketWatch)}</p>
    ${head("Founder learning")}
    <p style="margin:0;color:#555">${esc(b.founderLearning)}</p>
    ${head("Go deeper")}
    <p style="margin:0;color:#555">Connect Sentry, Vercel, Stripe, GA/PostHog and Semrush/Ahrefs at <a href="https://claude.ai/customize/connectors">claude.ai/customize/connectors</a> for error monitoring, deploy status, revenue, traffic and SEO automation.</p>
  `;
  return emailBase({ companyName: "FinovaOS", badgeText: "Founder Brief", badgeColor: "#b45309", content: body });
}

/**
 * One send per local day, tracked via ActivityLog (no dedicated table) —
 * mirrors runDailyReportForCompany's own-day gating so an extra cron tick
 * never double-sends.
 */
export async function sendFounderBrief(opts: { force?: boolean } = {}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  if (!opts.force) {
    const last = await prisma.activityLog.findFirst({
      where: { action: "FOUNDER_BRIEF_SENT", companyId: null },
      orderBy: { createdAt: "desc" },
    });
    if (last && localDate(last.createdAt, KARACHI_TZ) === localDate(new Date(), KARACHI_TZ)) {
      return { ok: false, skipped: "already-sent-today" };
    }
  }

  const brief = await buildFounderBrief();
  const res = await sendEmail({
    to: RECIPIENT,
    subject: `📊 Founder Daily Brief — ${brief.date}`,
    html: formatFounderBriefHtml(brief),
  });
  if (res.success) {
    await prisma.activityLog.create({ data: { action: "FOUNDER_BRIEF_SENT", details: JSON.stringify({ date: brief.date }) } }).catch(() => {});
  }
  return { ok: res.success, error: res.error };
}
