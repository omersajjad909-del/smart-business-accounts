import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NICHE_MAP: Record<string, string> = {
  trading:        "traders and trading businesses who manage stock and buy/sell goods",
  import_export:  "import/export businesses handling international suppliers and multi-currency transactions",
  wholesale:      "wholesalers managing bulk inventory and distributor networks",
  distributor:    "distributors managing dealer/retailer networks and route-based sales",
  all_business:   "small and medium business owners who manage accounts, inventory and invoicing",
};

const REGION_TARGETING: Record<string, string> = {
  global:     "Worldwide. Target: Small Business Owners, Entrepreneurs, Business Managers. Age 28-55.",
  pakistan:   "Pakistan. Target: Vyapari, Wholesale Dealer, Trader, Shop Owner, Business Person. Age 25-55. Cities: Karachi, Lahore, Faisalabad, Islamabad, Sialkot, Gujranwala.",
  uae:        "UAE, Saudi Arabia, Qatar. Target: Business Owner, Entrepreneur, SME Manager. South Asian diaspora. Age 28-50.",
  uk_us:      "UK and USA. Target: Small Business Owner, Accountant, Operations Manager. Age 30-55.",
  south_asia: "Pakistan, India, Bangladesh. Target: Business Owner, Trader, Wholesaler. Age 25-55.",
};

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role") || "";
    if (role.toUpperCase() !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { niche = "trading", budget = 50, region = "global", objective = "conversions" } = await req.json();

    const nicheDesc    = NICHE_MAP[niche]    || NICHE_MAP.all_business;
    const regionTarget = REGION_TARGETING[region] || REGION_TARGETING.global;
    const monthlyBudget = Number(budget);
    const dailyBudget   = (monthlyBudget / 30).toFixed(2);

    const prompt = `You are a Facebook/Instagram ads expert for FinovaOS — a cloud-based business management software (accounting, inventory, invoicing, reports).

Target audience: ${nicheDesc}
Region & targeting: ${regionTarget}
Monthly budget: $${monthlyBudget} (~$${dailyBudget}/day)
Campaign objective: ${objective}

Generate 3 different ad sets. Each should target a different awareness level:
1. Cold audience (never heard of FinovaOS) — pain-point focused
2. Warm audience (visited website, engaged with social) — feature/benefit focused
3. Hot audience (lookalike of existing customers) — direct offer focused

For each ad set, provide:
- A scroll-stopping headline (under 40 chars)
- Primary text (the main ad copy, 3-5 sentences, conversational, no "free trial")
- CTA button text
- Detailed Facebook/Instagram targeting parameters
- Daily budget recommendation
- Estimated reach per day
- Campaign objective

IMPORTANT: NO free trial mention. FinovaOS is a paid product starting at $49/month.

Respond with a JSON array of exactly 3 objects:
[
  {
    "objective": "Cold Audience | Warm Retargeting | Lookalike",
    "headline": "...",
    "primaryText": "...",
    "cta": "Learn More|Sign Up|Get Started|Contact Us",
    "targeting": "detailed targeting instructions for Facebook Ads Manager",
    "dailyBudget": "$X.XX/day",
    "estimatedReach": "X,000-Y,000 people/day"
  }
]

Return ONLY the JSON array, no other text.`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as any).text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "AI returned invalid format" }, { status: 500 });

    const ads = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ ads });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
