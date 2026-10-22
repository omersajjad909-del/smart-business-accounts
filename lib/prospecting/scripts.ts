/**
 * Call and WhatsApp scripts for prospects we can reach by phone but not by
 * email. A person reads or sends these — nothing here contacts anyone.
 *
 * WhatsApp's own policy does not allow automated cold messaging without prior
 * opt-in, so the message is written for a human to send from their own phone,
 * one at a time, and always carries an easy way to say no.
 */

import { generateProspectingText } from "./ai";
import { FINOVA_PITCH } from "./icp";
import { containsBannedOffer } from "./drafting";

export type ScriptChannel = "call" | "whatsapp";
export type ScriptLanguage = "en" | "ur" | "roman_ur";

const LANGUAGE_NAMES: Record<ScriptLanguage, string> = {
  en: "English",
  ur: "Urdu (Urdu script)",
  roman_ur: "Roman Urdu (Urdu written in Latin letters, the way people text in Pakistan)",
};

export type ScriptProspect = {
  name: string;
  city: string | null;
  country: string | null;
  industry: string | null;
  website: string | null;
  notes: string | null;
  reviewCount: number | null;
};

export async function generateOutreachScript(
  prospect: ScriptProspect,
  channel: ScriptChannel,
  language: ScriptLanguage,
  senderName: string,
): Promise<string> {
  const shape =
    channel === "whatsapp"
      ? `A first WhatsApp message, 60 words or fewer, plain text, no emojis spam (one at most). Say who you are, why you are writing to THIS business, one concrete benefit, and ask whether they would like a short demo. End with a polite line saying they can reply STOP and you will not message again.`
      : `A phone call script with these labelled parts: Opening (10 seconds, who you are, ask if it is a good time), Why I'm calling (one sentence tied to their business), 3 short Discovery questions, Value line (one sentence), 3 Objection replies (already use Excel / too busy / not interested), Close (ask for a 15-minute demo or a WhatsApp number for details).`;

  const prompt = `You write sales scripts for FinovaOS. A human will use this; it is not sent automatically.

${FINOVA_PITCH}

PROSPECT
Business: ${prospect.name}
Location: ${[prospect.city, prospect.country].filter(Boolean).join(", ") || "unknown"}
Business type: ${prospect.industry || "unknown"}
Website: ${prospect.website || "none"}
Google Maps reviews: ${prospect.reviewCount ?? "unknown"}
What we know about them: ${prospect.notes || "nothing beyond the listing above"}

WRITE: ${shape}
Language: ${LANGUAGE_NAMES[language]}
Sender: ${senderName}

Rules:
- Use only facts above. Never invent a number, a client, a result or something you "noticed" about them.
- Never say the product is free forever. The real offer is a 14-day free trial, no credit card required.
- Do not claim to know their problems; ask. Be respectful and short.
- Output only the script, no preface and no markdown fences.`;

  const text = (await generateProspectingText(prompt, 700)).trim();
  if (!text) throw new Error("The model returned an empty script.");

  const banned = containsBannedOffer(text);
  if (banned) throw new Error(`The script promised "${banned}". Regenerate it.`);
  return text;
}
