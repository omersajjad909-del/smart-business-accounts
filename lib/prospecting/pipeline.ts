/**
 * The orchestrator.
 *
 * Deliberately not one long "run the campaign" call. Each invocation advances
 * the campaign by one bounded batch and returns, so:
 *   - a serverless function never runs out of wall clock on a 1000-row campaign
 *   - a provider outage costs one batch, not the whole run
 *   - the UI can show real progress instead of a spinner
 *
 * The caller (an admin clicking Run, or the cron job) keeps calling until
 * `complete` comes back true.
 */

import { prisma } from "@/lib/prisma";
import { discoverCompanies, normaliseDomain } from "./discovery";
import { enrichCompany, verifyEmail } from "./enrichment";
import { scoreProspect, toScorable } from "./scoring";
import { draftEmail, renderEmailHtml } from "./drafting";
import { isSuppressed, postalAddress, baseUrl } from "./sending";
import { bandForEmployees } from "./types";
import { isOutreachAllowed } from "./icp";
import type { CampaignBrief, StageResult } from "./types";

const db = prisma as any;

/** How many rows one invocation will touch, per stage. */
const BATCH = {
  discover: 200,
  enrich: 12,   // each one makes several HTTP fetches plus a model call
  score: 20,
  draft: 12,
} as const;

/** Below this score we do not spend a model call writing an email. */
const MIN_SCORE_TO_DRAFT = 55;

async function bumpProgress(campaignId: string, patch: Record<string, number>) {
  const campaign = await db.outreachCampaign.findUnique({
    where: { id: campaignId },
    select: { progress: true },
  });
  const current = (campaign?.progress as Record<string, number>) || {};
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) next[key] = (next[key] || 0) + value;
  await db.outreachCampaign.update({ where: { id: campaignId }, data: { progress: next } });
}

// ─── Stage 1: discover ────────────────────────────────────────────────────────

async function runDiscover(campaign: any): Promise<StageResult> {
  const brief = campaign.brief as CampaignBrief;
  const existing = await db.prospectCompany.count({ where: { campaignId: campaign.id } });
  const remaining = campaign.targetCount - existing;

  if (remaining <= 0) {
    return { stage: "discovering", processed: 0, failed: 0, complete: true, message: `Target of ${campaign.targetCount} companies reached.` };
  }

  const { companies, provider, warnings } = await discoverCompanies(
    brief,
    Math.min(remaining, BATCH.discover),
  );

  let created = 0;
  let skipped = 0;

  for (const company of companies) {
    const domain = normaliseDomain(company.domain);

    if (domain && brief.excludeDomains.includes(domain)) { skipped++; continue; }
    if (!isOutreachAllowed(company.country)) { skipped++; continue; }

    try {
      if (domain) {
        // The unique index is (campaignId, domain); upsert keeps reruns idempotent.
        await db.prospectCompany.upsert({
          where: { campaignId_domain: { campaignId: campaign.id, domain } },
          create: {
            campaignId: campaign.id,
            name: company.name, domain, website: company.website,
            industry: company.industry, country: company.country, city: company.city,
            address: company.address, lat: company.lat, lng: company.lng, phone: company.phone,
            source: company.source, sourceRef: company.sourceRef,
            status: "discovered",
          },
          update: { name: company.name, website: company.website, phone: company.phone },
        });
      } else {
        // No domain means no email path either; keep the row for phone follow-up
        // but it will never reach the drafting stage.
        await db.prospectCompany.create({
          data: {
            campaignId: campaign.id,
            name: company.name, domain: null, website: company.website,
            industry: company.industry, country: company.country, city: company.city,
            address: company.address, lat: company.lat, lng: company.lng, phone: company.phone,
            source: company.source, sourceRef: company.sourceRef,
            status: "skipped", rejectReason: "No website or domain — cannot email.",
          },
        });
      }
      created++;
    } catch {
      skipped++;
    }
  }

  await bumpProgress(campaign.id, { discovered: created });

  const total = existing + created;
  const complete = total >= campaign.targetCount || companies.length === 0;

  return {
    stage: "discovering",
    processed: created,
    failed: skipped,
    complete,
    message: `${provider}: ${created} added (${total}/${campaign.targetCount}).${warnings.length ? " " + warnings.join(" ") : ""}`,
  };
}

// ─── Stage 2: enrich ──────────────────────────────────────────────────────────

async function runEnrich(campaign: any): Promise<StageResult> {
  const rows = await db.prospectCompany.findMany({
    where: { campaignId: campaign.id, status: "discovered" },
    take: BATCH.enrich,
    orderBy: { createdAt: "asc" },
  });

  if (!rows.length) {
    return { stage: "enriching", processed: 0, failed: 0, complete: true, message: "All companies enriched." };
  }

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const enrichment = await enrichCompany({
        name: row.name, domain: row.domain, website: row.website, industry: row.industry,
        country: row.country, city: row.city, address: row.address, lat: row.lat, lng: row.lng,
        phone: row.phone, source: row.source, sourceRef: row.sourceRef,
        raw: (row.enrichment as Record<string, unknown>) || {},
      });

      await db.prospectCompany.update({
        where: { id: row.id },
        data: {
          employeeCount: enrichment.employeeCount,
          employeeBand: enrichment.employeeBand ?? bandForEmployees(enrichment.employeeCount),
          warehouseCount: enrichment.warehouseCount,
          locationCount: enrichment.locationCount,
          branches: enrichment.branches.length ? enrichment.branches : undefined,
          revenueBand: enrichment.revenueBand,
          currentSoftware: enrichment.currentSoftware,
          enrichment: { notes: enrichment.notes, ...enrichment.raw },
          enrichedAt: new Date(),
          status: "enriched",
        },
      });

      for (const [index, contact] of enrichment.contacts.entries()) {
        const suppressed = await isSuppressed(contact.email);
        if (suppressed) continue;
        const verifyStatus = await verifyEmail(contact.email);
        await db.prospectContact.create({
          data: {
            prospectId: row.id,
            name: contact.name, title: contact.title,
            email: contact.email.toLowerCase(), phone: contact.phone, linkedin: contact.linkedin,
            isPrimary: index === 0,
            verifyStatus,
            verifiedAt: verifyStatus === "unverified" ? null : new Date(),
          },
        }).catch(() => { /* duplicate contact, ignore */ });
      }

      done++;
    } catch {
      failed++;
      await db.prospectCompany.update({
        where: { id: row.id },
        data: { status: "enriched", enrichedAt: new Date(), enrichment: { error: "Enrichment failed" } },
      }).catch(() => {});
    }
  }

  await bumpProgress(campaign.id, { enriched: done });
  const left = await db.prospectCompany.count({ where: { campaignId: campaign.id, status: "discovered" } });

  return {
    stage: "enriching",
    processed: done, failed,
    complete: left === 0,
    message: `Enriched ${done}, ${left} remaining.`,
  };
}

// ─── Stage 3: score ───────────────────────────────────────────────────────────

async function runScore(campaign: any): Promise<StageResult> {
  const rows = await db.prospectCompany.findMany({
    where: { campaignId: campaign.id, status: "enriched" },
    take: BATCH.score,
    orderBy: { createdAt: "asc" },
    include: { contacts: { select: { email: true, title: true, verifyStatus: true } } },
  });

  if (!rows.length) {
    return { stage: "scoring", processed: 0, failed: 0, complete: true, message: "All companies scored." };
  }

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const enrichment = (row.enrichment as { notes?: string | null }) || {};
      const result = await scoreProspect(
        toScorable(row, { notes: enrichment.notes ?? null } as any),
      );

      await db.prospectCompany.update({
        where: { id: row.id },
        data: {
          score: result.score,
          tier: result.tier,
          scoreBreakdown: result.breakdown,
          scoreReason: result.reason,
          scoredAt: new Date(),
          status: "scored",
        },
      });
      done++;
    } catch {
      failed++;
      await db.prospectCompany.update({
        where: { id: row.id },
        data: { status: "scored", score: 0, tier: "D", scoreReason: "Scoring failed.", scoredAt: new Date() },
      }).catch(() => {});
    }
  }

  await bumpProgress(campaign.id, { scored: done });
  const left = await db.prospectCompany.count({ where: { campaignId: campaign.id, status: "enriched" } });

  return { stage: "scoring", processed: done, failed, complete: left === 0, message: `Scored ${done}, ${left} remaining.` };
}

// ─── Stage 4: draft ───────────────────────────────────────────────────────────

async function runDraft(campaign: any): Promise<StageResult> {
  const brief = campaign.brief as CampaignBrief;

  const rows = await db.prospectCompany.findMany({
    where: { campaignId: campaign.id, status: "scored" },
    take: BATCH.draft,
    orderBy: { score: "desc" },
    include: { contacts: { orderBy: { isPrimary: "desc" } } },
  });

  if (!rows.length) {
    return { stage: "drafting", processed: 0, failed: 0, complete: true, message: "All emails drafted." };
  }

  const senderName = process.env.OUTREACH_SENDER_NAME || "Umer Sajjad";
  const senderTitle = process.env.OUTREACH_SENDER_TITLE || "Founder";

  let done = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of rows) {
    // Below the bar, or no way to reach them — park it, do not pay for a draft.
    const contact = row.contacts.find((c: any) => c.verifyStatus !== "invalid") || null;
    if ((row.score ?? 0) < MIN_SCORE_TO_DRAFT || !contact) {
      await db.prospectCompany.update({
        where: { id: row.id },
        data: {
          status: "skipped",
          rejectReason: !contact
            ? "No usable contact email found."
            : `Score ${row.score} is below the ${MIN_SCORE_TO_DRAFT} drafting threshold.`,
        },
      });
      skipped++;
      continue;
    }

    try {
      const enrichment = (row.enrichment as { notes?: string | null }) || {};
      const draft = await draftEmail({
        prospect: toScorable(row, { notes: enrichment.notes ?? null } as any),
        brief,
        contactName: contact.name,
        contactTitle: contact.title,
        senderName,
        senderTitle,
        step: 1,
      });

      const email = await db.outreachEmail.create({
        data: {
          campaignId: campaign.id,
          prospectId: row.id,
          contactId: contact.id,
          step: 1,
          toEmail: contact.email,
          toName: contact.name,
          subject: draft.subject,
          bodyText: draft.bodyText,
          bodyHtml: "", // filled below, once we know the unsubscribe token
          language: brief.language,
          aiModel: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
          generatedAt: new Date(),
          status: "pending_review",
        },
      });

      await db.outreachEmail.update({
        where: { id: email.id },
        data: {
          bodyHtml: renderEmailHtml({
            bodyText: draft.bodyText,
            unsubToken: email.unsubToken,
            senderName, senderTitle,
            postalAddress: postalAddress(),
            baseUrl: baseUrl(),
            rtl: brief.language === "ur" || brief.language === "ar",
          }),
        },
      });

      await db.prospectCompany.update({
        where: { id: row.id },
        data: { status: "pending_review" },
      });
      done++;
    } catch (error) {
      failed++;
      await db.prospectCompany.update({
        where: { id: row.id },
        data: {
          status: "skipped",
          rejectReason: error instanceof Error ? error.message.slice(0, 240) : "Drafting failed.",
        },
      }).catch(() => {});
    }
  }

  await bumpProgress(campaign.id, { drafted: done });
  const left = await db.prospectCompany.count({ where: { campaignId: campaign.id, status: "scored" } });

  return {
    stage: "drafting",
    processed: done,
    failed: failed + skipped,
    complete: left === 0,
    message: `Drafted ${done}, skipped ${skipped}, ${left} remaining.`,
  };
}

// ─── Driver ───────────────────────────────────────────────────────────────────

const NEXT_STATUS: Record<string, string> = {
  discovering: "enriching",
  enriching: "scoring",
  scoring: "drafting",
  drafting: "review",
};

/**
 * Advances one campaign by one batch.
 *
 * Stops dead at "review": the pipeline will never move a campaign into
 * "sending" on its own. Only an admin approving emails does that.
 */
export async function advanceCampaign(campaignId: string): Promise<StageResult & { status: string }> {
  const campaign = await db.outreachCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found.");

  if (campaign.status === "paused") {
    return { stage: "review", processed: 0, failed: 0, complete: true, message: "Campaign is paused.", status: campaign.status };
  }
  if (["review", "sending", "done", "failed"].includes(campaign.status)) {
    return { stage: "review", processed: 0, failed: 0, complete: true, message: `Campaign is in "${campaign.status}" — the pipeline has nothing left to do.`, status: campaign.status };
  }

  // A campaign still in draft starts here.
  const status = campaign.status === "draft" ? "discovering" : campaign.status;
  if (campaign.status === "draft") {
    await db.outreachCampaign.update({
      where: { id: campaignId },
      data: { status: "discovering", startedAt: new Date() },
    });
  }

  let result: StageResult;
  try {
    result =
      status === "discovering" ? await runDiscover({ ...campaign, status })
      : status === "enriching" ? await runEnrich(campaign)
      : status === "scoring" ? await runScore(campaign)
      : await runDraft(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline stage failed.";
    await db.outreachCampaign.update({
      where: { id: campaignId },
      data: { status: "failed", lastError: message },
    });
    throw error;
  }

  let nextStatus = status;
  if (result.complete) {
    nextStatus = NEXT_STATUS[status] || "review";
    await db.outreachCampaign.update({
      where: { id: campaignId },
      data: {
        status: nextStatus,
        lastError: null,
        ...(nextStatus === "review" ? { completedAt: new Date() } : {}),
      },
    });
  }

  return { ...result, status: nextStatus };
}
