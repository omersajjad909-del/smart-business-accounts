import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NICHE_CONTEXT: Record<string, string> = {
  trading:        "trading businesses — buying and selling goods, managing stock, tracking purchases and sales",
  import_export:  "import/export businesses — dealing with international suppliers, customs, forex, multi-currency invoicing",
  wholesale:      "wholesalers — bulk purchasing, distributor management, credit terms, large inventory",
  distributor:    "distributors — managing dealers/retailers, route tracking, consignment, recovery management",
  retail:         "retail shops — point of sale, daily cash, stock alerts, customer accounts",
  manufacturing:  "manufacturers — raw material tracking, production orders, finished goods, costing",
  services:       "service businesses — client billing, recurring invoices, project tracking",
};

const POST_TYPES = [
  "pain_point",
  "feature_spotlight",
  "roi_numbers",
  "before_after",
  "problem_solution",
  "cta",
  "business_tip",
];

const BEST_TIMES: Record<string, string> = {
  facebook:  "Wed/Thu 12–3 PM or 7–9 PM",
  instagram: "Mon/Fri 11 AM–1 PM",
  linkedin:  "Tue/Wed 8–10 AM",
  all:       "Tue–Thu 12–2 PM",
};

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role") || "";
    if (role.toUpperCase() !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { niche = "trading", lang = "english", count = 7, platform = "all" } = await req.json();
    const nicheDesc  = NICHE_CONTEXT[niche] || NICHE_CONTEXT.trading;
    const postCount  = Math.min(Number(count), 14);
    const langInstr  = lang === "urdu"    ? "Write in Urdu script (proper Urdu, not Roman Urdu)."
                     : lang === "both"    ? "Write alternating English and Roman Urdu (mix both languages)."
                     : "Write in clear professional English.";

    const prompt = `You are a marketing expert for FinovaOS — a cloud-based business accounting and management software designed for ${nicheDesc}.

Generate exactly ${postCount} social media posts for FinovaOS targeting ${nicheDesc}.

${langInstr}

FinovaOS features relevant to this niche: invoicing, inventory management, purchase orders, expense tracking, financial reports (P&L, balance sheet), multi-currency support, WhatsApp notifications, multi-branch management, payroll, CRM.

Pricing: Starter $49/mo, Pro $99/mo, Enterprise $249/mo. NO FREE TRIAL. Direct paid subscription.

For each post use these types in this order (cycle if needed): ${POST_TYPES.join(", ")}.

Respond with a JSON array of exactly ${postCount} objects:
[
  {
    "platform": "${platform === "all" ? "all" : platform}",
    "type": "pain_point|feature_spotlight|roi_numbers|before_after|problem_solution|cta|business_tip",
    "text": "the post text (2-5 sentences, punchy, no emojis overload, max 3 emojis)",
    "hashtags": "#FinovaOS #BusinessSoftware #[NicheTag] ...",
    "bestTime": "best posting time"
  }
]

Rules:
- Each post must feel authentic, not salesy
- Pain point posts: highlight a real problem ${nicheDesc} face (manual errors, Excel chaos, lost invoices, cash flow confusion)
- Feature posts: one specific feature with a concrete benefit
- ROI posts: use numbers (save 3 hours/day, reduce errors by 80%, etc.)
- CTA: "Visit finovaos.app" or "Get started today"
- No "free trial" — never mention trial
- Keep posts under 250 characters for Instagram, LinkedIn can be longer
- Return ONLY the JSON array, no other text`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as any).text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "AI returned invalid format" }, { status: 500 });

    const posts = JSON.parse(jsonMatch[0]).map((p: any) => ({
      ...p,
      bestTime: p.bestTime || BEST_TIMES[platform] || BEST_TIMES.all,
    }));

    return NextResponse.json({ posts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
