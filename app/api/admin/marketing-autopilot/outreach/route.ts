import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const NICHE_PAIN: Record<string, string> = {
  trading:       "Traders often struggle with: tracking multiple purchases and sales, managing stock manually in Excel, losing track of payments from customers, calculating profit per item, reconciling accounts at month end.",
  import_export: "Import/export businesses struggle with: multi-currency invoicing, tracking shipments, managing supplier payments in foreign currency, customs documentation, calculating landed costs.",
  wholesale:     "Wholesalers struggle with: managing hundreds of SKUs, tracking credit given to retailers, following up on outstanding payments, generating price lists, managing returns.",
  distributor:   "Distributors struggle with: route management, tracking salesman performance, recovery of outstanding payments, managing dealer accounts, dispatch planning.",
  retailer:      "Retailers struggle with: daily cash reconciliation, stock running out unexpectedly, tracking customer credit, managing multiple suppliers, generating sales reports.",
  manufacturer:  "Manufacturers struggle with: raw material tracking, production costing, finished goods inventory, work-in-progress tracking, BOM management.",
};

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role") || "";
    if (role.toUpperCase() !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { niche = "trading", channel = "whatsapp", lang = "urdu", tone = "professional" } = await req.json();

    const painPoints = NICHE_PAIN[niche] || NICHE_PAIN.trading;
    const channels   = channel === "both" ? ["whatsapp", "email"] : [channel];

    const langMap: Record<string, string> = {
      urdu:        "proper Urdu script (اردو)",
      english:     "professional English",
      roman_urdu:  "Roman Urdu (Urdu words written in English letters, e.g. 'Aap ka hisaab kitaab...')",
    };

    const toneMap: Record<string, string> = {
      professional: "formal and respectful — like one professional addressing another",
      friendly:     "warm and conversational — like a helpful acquaintance",
      direct:       "bold and to the point — no fluff, just value and call to action",
    };

    const scripts: any[] = [];

    for (const ch of channels) {
      const isWhatsApp = ch === "whatsapp";

      const prompt = `You are writing cold outreach messages for FinovaOS — a business accounting and management software.

Target: ${niche} business owners
Channel: ${isWhatsApp ? "WhatsApp message" : "Cold email"}
Language: ${langMap[lang] || langMap.english}
Tone: ${toneMap[tone] || toneMap.professional}

Pain points these businesses face:
${painPoints}

FinovaOS solves these problems with: smart invoicing, inventory management, expense tracking, financial reports, multi-currency support, WhatsApp notifications, and more. Pricing starts at $49/month.

IMPORTANT: NO free trial. Do NOT offer trial. Instead, offer to show them how it works (demo/conversation).

Write:
1. Initial outreach message
2. Follow-up message (if no reply in 3 days)
3. Best time to send
4. One practical tip for Pakistan/South Asia market

${isWhatsApp ? "WhatsApp rules: Keep under 300 words, use line breaks for readability, feel personal not corporate, start with a greeting." : "Email rules: Subject line + body. Keep body under 200 words. Professional but warm. No attachments mentioned."}

Respond as a JSON object:
{
  "channel": "${ch}",
  ${!isWhatsApp ? '"subject": "compelling email subject line",' : ""}
  "body": "the main message",
  "followUp": "3-day follow-up message",
  "bestTime": "best time to send",
  "tipPK": "one practical tip for sending this in Pakistan/South Asia context"
}

Return ONLY the JSON object, no other text.`;

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (response.content[0] as any).text.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { scripts.push(JSON.parse(jsonMatch[0])); } catch { /* skip malformed */ }
      }
    }

    return NextResponse.json({ scripts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
