import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { loadTrialActivity } from "@/lib/trialMetrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const db = prisma as any;

type Stage = { key: string; label: string; count: number; basis: string };

/**
 * The outbound funnel, counted from real rows only: discovered -> reachable ->
 * contacted -> replied -> lead -> demo -> trial -> activated -> paid.
 *
 * The first five come straight from the prospecting tables. Demo, trial and
 * paid are matched to FinovaOS accounts by EMAIL ADDRESS (a prospect's contact
 * email or its lead's email) and only count an account created after we found
 * the company. A prospect who signs up under a different address is invisible
 * here — so these three are a floor, not a ceiling, and the response says so.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;

  try {
    const campaignId = req.nextUrl.searchParams.get("campaignId");

    const prospects = await db.prospectCompany.findMany({
      where: campaignId ? { campaignId } : {},
      take: 5000,
      select: {
        id: true, status: true, phone: true, leadId: true, createdAt: true,
        contacts: { select: { email: true } },
        emails: { select: { status: true, sentAt: true } },
      },
    });

    const leadIds = [...new Set(prospects.map((p: any) => p.leadId).filter(Boolean))] as string[];
    const leads: Array<{ id: string; email: string | null; status: string }> = leadIds.length
      ? await db.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, email: true, status: true } })
      : [];
    const leadById = new Map(leads.map((l) => [l.id, l]));

    // Every address we can link a prospect to a signup by.
    const emailsOf = (p: any): string[] => {
      const set = new Set<string>(p.contacts.map((c: any) => String(c.email).toLowerCase()));
      const leadEmail = p.leadId ? leadById.get(p.leadId)?.email : null;
      if (leadEmail) set.add(leadEmail.toLowerCase());
      return [...set];
    };
    const allEmails = [...new Set(prospects.flatMap(emailsOf))];

    const [users, bookings] = allEmails.length
      ? await Promise.all([
          db.user.findMany({
            where: { email: { in: allEmails } },
            select: {
              email: true,
              defaultCompany: {
                select: { id: true, createdAt: true, trialStartedAt: true, subscriptionStatus: true, trialEndsAt: true },
              },
            },
          }),
          db.demoBooking.findMany({
            where: { email: { in: allEmails } },
            select: { email: true, createdAt: true, status: true },
          }),
        ])
      : [[], []];

    const userByEmail = new Map<string, any>(users.map((u: any) => [String(u.email).toLowerCase(), u]));
    const bookingsByEmail = new Map<string, any[]>();
    for (const b of bookings) {
      const key = String(b.email).toLowerCase();
      bookingsByEmail.set(key, [...(bookingsByEmail.get(key) || []), b]);
    }

    const companyIds = [...new Set(users.map((u: any) => u.defaultCompany?.id).filter(Boolean))] as string[];
    const activity = companyIds.length ? await loadTrialActivity(companyIds) : new Map();

    const counts = {
      discovered: 0, reachable: 0, contacted: 0, replied: 0, lead: 0,
      demo: 0, trial: 0, activated: 0, paid: 0,
    };

    for (const p of prospects) {
      counts.discovered++;
      if (p.phone || p.contacts.length) counts.reachable++;

      const sentEmail = p.emails.some((e: any) => e.sentAt);
      if (sentEmail || ["contacted", "replied", "lost", "opted_out"].includes(p.status)) counts.contacted++;
      if (p.status === "replied" || p.emails.some((e: any) => e.status === "replied")) counts.replied++;
      if (p.leadId) counts.lead++;

      const addresses = emailsOf(p);
      const found = new Date(p.createdAt).getTime();

      const leadStatus = p.leadId ? leadById.get(p.leadId)?.status : null;
      const demoBooked =
        ["demo", "proposal", "converted"].includes(String(leadStatus)) ||
        addresses.some((a) => (bookingsByEmail.get(a) || []).some((b) => new Date(b.createdAt).getTime() >= found));
      if (demoBooked) counts.demo++;

      // Only an account created after we found the company counts as ours.
      const company = addresses
        .map((a) => userByEmail.get(a)?.defaultCompany)
        .find((c: any) => c && new Date(c.createdAt).getTime() >= found);
      if (company) {
        if (company.trialStartedAt) counts.trial++;
        if (activity.get(company.id)?.activated) counts.activated++;
        if (String(company.subscriptionStatus || "").toUpperCase() === "ACTIVE") counts.paid++;
      }
    }

    const stages: Stage[] = [
      { key: "discovered", label: "Discovered", count: counts.discovered, basis: "Companies found by discovery." },
      { key: "reachable", label: "Reachable", count: counts.reachable, basis: "Has an email or a phone number." },
      { key: "contacted", label: "Contacted", count: counts.contacted, basis: "An email was sent, or a call / WhatsApp was logged." },
      { key: "replied", label: "Replied", count: counts.replied, basis: "Marked as replied (by you), or an email marked replied." },
      { key: "lead", label: "Lead", count: counts.lead, basis: "Handed to the Leads page with \"Interested\"." },
      { key: "demo", label: "Demo", count: counts.demo, basis: "Lead is at demo/proposal/converted, or a demo was booked with a matching email." },
      { key: "trial", label: "Trial", count: counts.trial, basis: "A FinovaOS account with a matching email, created after discovery, that started a trial." },
      { key: "activated", label: "Activated", count: counts.activated, basis: "That account recorded an invoice or payment." },
      { key: "paid", label: "Paid", count: counts.paid, basis: "That account's subscription is ACTIVE." },
    ];

    return NextResponse.json({
      stages,
      scope: campaignId ? "campaign" : "all campaigns",
      truncated: prospects.length >= 5000,
      caveat:
        "Demo, trial, activated and paid are matched by email address, so they are a minimum: a company that signs up with a different address is not counted.",
    });
  } catch (e: any) {
    console.error("[prospecting/funnel] failed:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
