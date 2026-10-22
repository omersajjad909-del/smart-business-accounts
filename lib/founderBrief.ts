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

// ─── Evergreen rotating content (Urdu) ──────────────────────────────────────
// Picked by day-of-year so the email varies day to day without inventing facts.

const BUSINESS_PROBLEMS = [
  "زیادہ تر چھوٹے اور درمیانے کاروبار (SMEs) اب بھی اپنی بہی کھاتہ داری (bookkeeping) کے لیے Excel شیٹس یا رجسٹر پر انحصار کرتے ہیں، جس کی وجہ سے مہینے کے آخر تک یہ پتا ہی نہیں چلتا کہ اصل کیش پوزیشن کیا ہے۔ نتیجتاً late payments اور supplier کے bills اکٹھے ہو جاتے ہیں، اور founder کو فیصلے گٹ فیلنگ پر لینے پڑتے ہیں، ڈیٹا پر نہیں۔",
  "بہت سے چھوٹے trading کاروبار کو یہ پتا ہی اس وقت چلتا ہے کہ receivables overdue ہو چکے ہیں جب کوئی supplier خود پیسوں کا تقاضا کرے — اس وقت تک cash gap ایک warning نہیں رہتا، بحران بن جاتا ہے۔",
  "ایک آدمی کی اکاؤنٹنگ ٹیم چھوٹے کاروبار کا single point of failure ہوتی ہے — اگر وہ شخص بیمار ہو جائے یا نوکری چھوڑ دے، تو ہفتوں تک کسی کو یہ جواب نہیں مل پاتا کہ 'ہم پر کتنا واجب ہے، اور ہمارا کتنا واجب ہے۔'",
  "جو inventory real-time میں ٹریک نہیں ہوتی وہ خاموشی سے dead stock بن جاتی ہے — کاروبار ان آئٹمز کو دوبارہ آرڈر کرتے رہتے ہیں جو پہلے ہی زیادہ ہیں، اور وہ آئٹمز ختم ہو جاتے ہیں جو اصل میں بکتے ہیں۔",
  "مینوئل invoicing کی وجہ سے pricing کی غلطیاں اور چھوٹے tax fields نظر انداز ہو جاتے ہیں — اور مسئلہ تب پتا چلتا ہے جب کوئی customer invoice پر dispute کرے یا tax filing reject ہو جائے۔ Automation یہ دونوں مسئلے بل جانے سے پہلے پکڑ لیتی ہے۔",
];

const FOUNDER_LEARNINGS = [
  "early-stage B2B SaaS میں سب سے مہنگی غلطی نئے features بنانا نہیں، بلکہ ایسے features کو زندہ رکھنا ہے جن کا کوئی customer اصل میں استعمال نہیں کر رہا۔ ہر feature ایک ongoing لاگت ہے — support tickets، future bugs، اور onboarding کی پیچیدگی کی صورت میں۔ ہفتے میں ایک بار analytics دیکھ کر پوچھیں: 'کیا یہ feature ابھی بھی اپنی لاگت کے قابل ہے؟'",
  "Founders اکثر اپنی قیمت اپنی لاگت کے حساب سے رکھتے ہیں، نہ کہ اس حساب سے کہ customer کا alternative (ایک spreadsheet، accountant کا وقت، یا ایک missed deadline) اصل میں کتنا مہنگا پڑتا ہے۔ قیمت alternative کے مقابلے میں رکھیں، اپنی کوشش کے مقابلے میں نہیں۔",
  "Churn کبھی ایک اچانک واقعہ نہیں ہوتا — یہ کینسلیشن سے ہفتوں پہلے گرتے ہوئے usage کی صورت میں ظاہر ہوتا ہے۔ جن customers کو کال کرنی چاہیے وہ ہیں جو خاموش ہو گئے ہیں، نہ کہ وہ جو پہلے ہی چھوڑ چکے۔",
  "آپ کے سب سے بڑے customer کی feature request صرف ایک اکاؤنٹ کا ڈیٹا ہے، roadmap نہیں۔ تین مختلف، غیر متعلقہ customers کا الگ الگ ایک ہی چیز مانگنا ایک اکیلے بلند آواز customer سے کہیں زیادہ مضبوط signal ہے۔",
  "Support tickets مفت market research ہیں۔ ایک ہی سوال پانچ بار پوچھا جانا پانچ support tickets نہیں — ایک missing feature یا ایک confusing screen ہے۔",
];

const MARKET_WATCH: string[][] = [
  [
    "FBR کا e-invoicing / POS integration والا framework مزید sectors تک بڑھ رہا ہے — periodically fbr.gov.pk چیک کریں کہ آپ کے sector کی deadline تو نہیں بدلی۔",
    "Tax year کے لیے corporate income tax rate اور minimum tax regime وقتاً فوقتاً بدلتے رہتے ہیں — اپنے tax advisor سے سال میں ایک بار ضرور کنفرم کر لیں۔",
  ],
  [
    "International accounting competitors (QuickBooks, Zoho Books, Xero) وقتاً فوقتاً اپنی pricing بدلتے ہیں — ہر quarter ان کے current plans چیک کرنا اپنی positioning کو honest رکھتا ہے۔",
    "Buyers اب صرف قیمت نہیں بلکہ local compliance support (FBR-ready invoicing، PKR pricing) بھی دیکھ کر فیصلہ کرتے ہیں — یہ ان international tools کے مقابلے میں ایک حقیقی فرق ہے جو Pakistan کو afterthought سمجھتے ہیں۔",
  ],
  [
    "Pakistan کا minimum-tax regime پچھلے کچھ عرصے میں مزید business categories تک پھیلا ہے — چیک کر لیں کہ کہیں یہ اب آپ پر بھی لاگو تو نہیں ہوتا۔",
    "FBR کے نئے notifications کے تحت invoice issue ہونے کے بعد محدود وقت میں ہی correction ممکن ہوتا ہے، اس کے بعد صرف Commissioner کی منظوری سے — اپنی invoicing workflow اس حساب سے رکھیں۔",
  ],
];

function pickForToday<T>(arr: T[]): T {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return arr[dayOfYear % arr.length];
}

// 1 troy oz = 31.1034768g, 1 tola = 11.6638038g.
const GRAMS_PER_OZ = 31.1034768;
const GRAMS_PER_TOLA = 11.6638038;

// ─── Assembly ────────────────────────────────────────────────────────────────

export type FounderBrief = {
  date: string;
  rates: Awaited<ReturnType<typeof getMarketRates>>;
  businessProblem: string;
  founderLearning: string;
  marketWatch: string[];
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

/** Prose explaining what was found, plus 2-3 concrete numbered actions — only for findings that actually hold. */
function githubSection(g: GithubAudit): { intro: string; actions: string[] } {
  const actions: string[] = [];
  const noticed: string[] = [];

  if (g.branchProtected === false) {
    noticed.push("main branch پر کوئی branch protection سیٹ نہیں ہے — یعنی write access رکھنے والا کوئی بھی شخص بغیر کسی required PR review کے براہِ راست main میں push کر سکتا ہے۔");
    actions.push("main branch پر branch protection آن کریں (required PR review کے ساتھ) — چاہے آپ خود ہی review کریں، ہر تبدیلی ایک PR سے گزرے گی تو accidental regressions پکڑنا آسان ہو جائے گا۔");
  }
  if (g.repeatedMessage) {
    noticed.push(`حالیہ ${g.recentCommitCount} commits میں سے ${g.repeatedMessage.count} کا بالکل ایک جیسا message ہے: "${g.repeatedMessage.text}" — یہ pattern بار بار نظر آ رہا ہے۔`);
    actions.push("Commit messages کو change-specific بنائیں — generic پیغام repeat ہونے سے future debugging اور changelog مشکل ہو جاتا ہے۔");
  }
  if (g.openIssues === 0 && g.openPRs === 0) {
    noticed.push("فی الحال 0 open issues اور 0 open PRs ہیں۔");
    actions.push("چھوٹے bugs/features بھی GitHub Issues میں لکھنا شروع کریں تاکہ کام invisible نہ رہے اور priorities واضح رہیں۔");
  }

  if (!noticed.length) {
    return { intro: "اس چیک میں کوئی قابلِ ذکر مسئلہ نظر نہیں آیا۔", actions: [] };
  }
  return { intro: noticed.join(" "), actions };
}

function gramsToTola(usdPerOz: number, usdPkr: number): number {
  const pkrPerOz = usdPerOz * usdPkr;
  const pkrPerGram = pkrPerOz / GRAMS_PER_OZ;
  return pkrPerGram * GRAMS_PER_TOLA;
}

export function formatFounderBriefHtml(b: FounderBrief): string {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const head = (t: string) =>
    `<h3 dir="rtl" style="margin:22px 0 6px;font-size:13px;letter-spacing:.02em;color:#b45309;text-align:right">${esc(t)}</h3>`;
  const p = (html: string) => `<p dir="rtl" style="margin:0 0 6px;color:#444;text-align:right;line-height:1.9">${html}</p>`;

  const r = b.rates;
  const goldTola = r.gold && r.usdPkr ? gramsToTola(r.gold, r.usdPkr) : null;
  const ratesLines: string[] = [];
  if (goldTola) {
    ratesLines.push(`🥇 <b>سونا (Pakistan):</b> آج 24 قیراط سونا تقریباً <b>${Math.round(goldTola).toLocaleString("en-US")} روپے</b> فی تولہ کے قریب ہے (international spot rate سے approximate — مقامی مارکیٹ ریٹ میں چند ہزار روپے کا فرق ممکن ہے)۔`);
  }
  if (r.usdPkr) {
    ratesLines.push(`💵 <b>USD/PKR:</b> تقریباً <b>${r.usdPkr.toFixed(1)} روپے</b> فی ڈالر (ایک عمومی market rate — interbank اور open market ریٹ میں چھوٹا فرق ہو سکتا ہے)۔`);
  }
  if (r.brentOil || r.wtiOil) {
    const parts = [
      r.brentOil ? `Brent crude تقریباً <b>${r.brentOil.toFixed(1)} امریکی ڈالر</b> فی بیرل` : "",
      r.wtiOil ? `WTI crude تقریباً <b>${r.wtiOil.toFixed(1)} امریکی ڈالر</b> فی بیرل` : "",
    ].filter(Boolean).join("، اور ");
    ratesLines.push(`🛢️ <b>آئل (Oil):</b> ${parts} کی سطح پر ہے۔`);
  }
  const ratesBlock = ratesLines.length
    ? ratesLines.map((l) => p(l)).join("") + p(`<span style="font-size:12px;color:#999">نوٹ: یہ تمام figures approximate اور latest-available ہیں، لائیو مارکیٹ ریٹ میں معمولی فرق ممکن ہے۔</span>`)
    : p("آج ریٹس fetch نہیں ہو سکے — اگلی برِیف میں دوبارہ کوشش ہوگی۔");

  const gh = githubSection(b.github);
  const githubActionsHtml = gh.actions.length
    ? `<div dir="rtl" style="text-align:right">${gh.actions.map((a, i) => p(`${["1️⃣", "2️⃣", "3️⃣", "4️⃣"][i] || "•"} ${esc(a)}`)).join("")}</div>`
    : "";

  const opsNote = (ok: boolean, label: string) =>
    ok
      ? `✅ ${label} فیچ ہو گیا۔`
      : `⚠️ ${label} اس چیک میں fetch نہیں ہو سکا — یہ environment کی کسی محدودیت (جیسے egress proxy) کی وجہ سے بھی ہو سکتا ہے، لازمی real outage نہیں۔`;

  const sslLine = b.ssl
    ? `🔒 <b>SSL Certificate:</b> ${APP_HOST} کا SSL certificate <b>${b.ssl.validTo}</b> کو expire ہو رہا ہے، یعنی آج سے تقریباً <b>${b.ssl.daysRemaining} دن</b> باقی ہیں۔${b.ssl.daysRemaining <= 30 ? " ⚠️ یہ 30 دن کی حد کے قریب ہے، renewal جلد چیک/schedule کر لیں۔" : ""}`
    : `🔒 <b>SSL Certificate:</b> اس چیک میں expiry تاریخ معلوم نہیں ہو سکی۔`;

  const marketWatchBlock = b.marketWatch.map((line) => p(`• ${esc(line)}`)).join("");

  const body = `
    <div dir="rtl" style="text-align:right;direction:rtl">
    ${p(`<b>${esc(b.date)}</b>`)}
    ${head("ریٹس (Rates)")}
    ${ratesBlock}
    ${head("آج کا بزنس مسئلہ")}
    ${p(esc(b.businessProblem))}
    ${head("بانی کا آج کا فوکس (GitHub ریپو کا جائزہ)")}
    ${p(esc(gh.intro))}
    ${githubActionsHtml}
    ${head("پراڈکٹ اور آپریشنز کی صورتحال")}
    ${p(opsNote(b.statusReachable.ok, `Status page (${APP_HOST}/status)`))}
    ${p(sslLine)}
    ${head("گروتھ چیک")}
    ${p(opsNote(b.testimonialsReachable.ok, `Testimonials page (${APP_HOST}/testimonials)`) + " اسی طرح waitlist/signup کے numbers کا کوئی اندازہ نہیں لگایا جا رہا — ان کی درست رپورٹنگ کے لیے Supabase یا کوئی analytics tool connect کرنا ہوگا۔")}
    ${head("مارکیٹ اور مقابلت پر نظر")}
    ${marketWatchBlock}
    ${head("💡 آج کا فاؤنڈر لرننگ")}
    ${p(esc(b.founderLearning))}
    ${head("🔌 مزید آٹومیشن")}
    ${p(`پوری automation (error monitoring, deploy status, revenue, traffic, SEO rankings) unlock کرنے کے لیے <a href="https://claude.ai/customize/connectors">claude.ai/customize/connectors</a> پر connect کریں: Sentry, Vercel, Stripe, Google Analytics (یا PostHog), Semrush/Ahrefs۔`)}
    </div>
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
