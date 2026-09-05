/**
 * Stage 4 — writing the email.
 *
 * One email per prospect, built around a fact we actually found about that
 * company. Anything that could be swapped for another company's name is not
 * personalisation, and it reads as a blast.
 *
 * Hard product rule, enforced both in the prompt and by a post-check below:
 * FinovaOS has no free trial. The ask is always a walkthrough or a demo call.
 */

import { generateProspectingText } from "./ai";
import { FINOVA_PITCH, painFor } from "./icp";
import type { CampaignBrief, DraftedEmail } from "./types";
import type { ScorableProspect } from "./scoring";

const LANGUAGE_INSTRUCTION: Record<CampaignBrief["language"], string> = {
  en: "Write in clear professional English. Short sentences. No corporate filler.",
  ur: "Write entirely in proper Urdu script. Respectful, business-appropriate register.",
  roman_ur:
    "Write in Roman Urdu — Urdu words spelled with English letters, the way Pakistani business owners actually message each other. Keep product and accounting terms in English.",
  ar: "Write entirely in Modern Standard Arabic, business register.",
};

const TONE_INSTRUCTION: Record<CampaignBrief["tone"], string> = {
  professional: "Formal and respectful — one business owner writing to another.",
  friendly: "Warm and conversational, but never chummy with a stranger.",
  direct: "Blunt and short. Lead with the problem, close with the ask. No warm-up.",
};

/** Phrases that would make the email a lie about our own pricing. */
const BANNED_PHRASES = [
  "free trial", "trial period", "try it free", "14-day", "30-day free",
  "no credit card", "muft trial", "free for 14", "free for 30",
];

export function containsBannedOffer(text: string): string | null {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.find((phrase) => lower.includes(phrase)) || null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps the plain-text body in the minimum markup a cold email can legally and
 * safely carry: no images, no tracking pixel by default, a real postal address
 * and a working one-click unsubscribe. Image-heavy HTML is itself a spam
 * signal, so the template stays deliberately plain.
 */
export function renderEmailHtml(opts: {
  bodyText: string;
  unsubToken: string;
  senderName: string;
  senderTitle: string;
  postalAddress: string;
  baseUrl: string;
  rtl?: boolean;
}): string {
  const paragraphs = opts.bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const unsubUrl = `${opts.baseUrl.replace(/\/$/, "")}/api/public/outreach-unsubscribe?token=${opts.unsubToken}`;
  const dir = opts.rtl ? ' dir="rtl"' : "";

  return `<div${dir} style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:560px">
${paragraphs}
<p style="margin:22px 0 0;color:#374151">${escapeHtml(opts.senderName)}<br><span style="color:#6b7280">${escapeHtml(opts.senderTitle)} · FinovaOS</span></p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:26px 0 12px">
<p style="margin:0;font-size:12px;color:#9ca3af">
${escapeHtml(opts.postalAddress)}<br>
You received this because your business appeared in a public business directory.
<a href="${unsubUrl}" style="color:#6b7280">Unsubscribe</a> and we will not contact you again.
</p>
</div>`;
}

export type DraftInput = {
  prospect: ScorableProspect;
  brief: CampaignBrief;
  contactName: string | null;
  contactTitle: string | null;
  senderName: string;
  senderTitle: string;
  /** 1 = first touch, 2 and 3 are the follow-ups in the sequence. */
  step: number;
};

function stepInstruction(step: number): string {
  if (step <= 1) {
    return "This is the FIRST email. They have never heard of us. Earn the reply, do not ask for a meeting slot yet — ask if it is worth a look.";
  }
  if (step === 2) {
    return "This is a FOLLOW-UP after no reply to the first email. Maximum 60 words. Do not repeat the original pitch. Add one new, specific, useful point and make it easy to say no.";
  }
  return "This is the FINAL email in the sequence. Maximum 40 words. Politely close the loop, leave the door open, do not guilt them.";
}

export async function draftEmail(input: DraftInput): Promise<DraftedEmail> {
  const { prospect, brief, step } = input;

  const facts = [
    prospect.city ? `Based in ${prospect.city}${prospect.country ? `, ${prospect.country}` : ""}` : null,
    prospect.employeeCount ? `About ${prospect.employeeCount} staff` : null,
    prospect.warehouseCount ? `${prospect.warehouseCount} warehouse(s)` : null,
    prospect.locationCount && prospect.locationCount > 1 ? `${prospect.locationCount} locations` : null,
    prospect.currentSoftware ? `Appears to use: ${prospect.currentSoftware}` : null,
    prospect.notes ? `From their website: ${prospect.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `Write one cold outreach email for FinovaOS.

${FINOVA_PITCH}

RECIPIENT
Company: ${prospect.name}
Industry: ${prospect.industry || "unknown"}
Contact: ${input.contactName || "unknown — do not invent a name, open without one"}${input.contactTitle ? ` (${input.contactTitle})` : ""}
What we know:
${facts || "Very little beyond the company name and industry."}

The pain businesses like this usually have:
${painFor(prospect.industry)}

${brief.valueAngle ? `Lead with this angle: ${brief.valueAngle}` : ""}

LANGUAGE: ${LANGUAGE_INSTRUCTION[brief.language]}
TONE: ${TONE_INSTRUCTION[brief.tone]}
SEQUENCE: ${stepInstruction(step)}

HARD RULES
- ABSOLUTELY NO free trial, no trial period, no "try it free", no "no credit card needed". FinovaOS is paid from day one. The only ask is a short walkthrough or demo call.
- Under 130 words for the body of a first email. Follow-ups shorter still.
- Open with something true about THIS company, not about us. If we know nothing specific, open with the industry-specific pain, never with "I hope this email finds you well".
- No bullet lists, no bold, no emoji, no exclamation marks. Plain sentences.
- Do not claim we are already working with their competitors or name customers we cannot prove.
- Do not state a discount, a price other than "starts at $49/month", or a deadline.
- Sign-off is handled separately — end at the call to action, do not write a signature.
- Subject line: under 55 characters, lowercase or sentence case, no clickbait, no "Re:" trick, no company name in ALL CAPS.

Return ONLY this JSON, no prose, no markdown fence:
{
  "subject": "the subject line",
  "bodyText": "the email body, plain text, blank line between paragraphs",
  "personalisationHook": "the one specific fact about this company you used"
}`;

  const raw = await generateProspectingText(prompt, 1200);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model did not return a JSON email draft.");

  const parsed = JSON.parse(match[0]) as Record<string, unknown>;
  const subject = String(parsed.subject || "").trim().slice(0, 120);
  const bodyText = String(parsed.bodyText || "").trim();

  if (!subject || !bodyText) throw new Error("Draft was missing a subject or a body.");

  // Belt and braces: the prompt forbids it, but a wrong promise about pricing
  // is the kind of thing that must never reach the review queue looking clean.
  const banned = containsBannedOffer(`${subject}\n${bodyText}`);
  if (banned) {
    throw new Error(`Draft promised "${banned}" — FinovaOS has no free trial. Regenerate.`);
  }

  return {
    subject,
    bodyText,
    personalisationHook: parsed.personalisationHook
      ? String(parsed.personalisationHook).slice(0, 240)
      : "none",
  };
}
