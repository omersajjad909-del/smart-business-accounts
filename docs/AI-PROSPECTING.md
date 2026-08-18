# AI Prospecting

Outbound client acquisition for FinovaOS itself. Platform-level, not tenant-scoped —
these rows belong to FinovaOS the vendor, not to any company using FinovaOS.

**Console:** `/admin/prospecting` (Admin → Marketing → AI Prospecting)

## The pipeline

```
  admin types a brief in plain language
            │
            ▼
  1 DISCOVER   Google Places / Apollo → ProspectCompany rows
  2 ENRICH     website scrape + Hunter → staff, warehouses, branches, contacts
  3 SCORE      70 deterministic + 30 AI → 0-100, tier A/B/C/D
  4 DRAFT      one personalised email per prospect → OutreachEmail
            │
            ▼
  5 REVIEW  ◄── HARD STOP. The pipeline never crosses this line by itself.
            │   An admin approves, edits, or rejects every single email.
            ▼
  6 SEND       cron, throttled, capped, suppression-checked
  7 TRACK      unsubscribe / bounce / reply → OutreachEvent
```

Each stage writes its result to the database and returns. `POST .../run` advances
one batch. A failure at stage 4 never costs you stages 1–3.

## Why discovery is not done by the AI

Asked for "500 trading companies in Karachi", a language model produces 500
plausible names with plausible emails, most of which do not exist. Sending to
them bounces, and bounce rate is what gets a sending domain blacklisted.

So the model never invents a company. It only:

- extracts facts from a web page **we fetched** (`lib/prospecting/enrichment.ts`)
- judges those facts against the ICP, for 30 of 100 points (`scoring.ts`)
- writes the copy (`drafting.ts`)

Discovery is always a real directory API (`discovery.ts`).

## Scoring

70 points are deterministic, so the same facts always give the same number:

| Component       | Max | What earns it |
|-----------------|-----|---------------|
| `fit`           | 20  | Business type vs. `ICP_TIERS` in `icp.ts` |
| `size`          | 15  | 11–50 staff is the sweet spot; <3 and >500 score low |
| `multiLocation` | 15  | 3+ warehouses or 5+ locations is the sharpest wedge |
| `softwareGap`   | 10  | Excel/manual = 10, an incumbent ERP = 1 |
| `reachability`  | 10  | Verified address (+6) for a named decision maker (+4) |
| `aiJudgement`   | 30  | The model's read of their actual pain, from their own words |

Tiers: **A** ≥ 80, **B** ≥ 60, **C** ≥ 40, **D** below. Anything under 55 is never
drafted — no point spending a model call on it.

To change who we target, edit `ICP_TIERS` and `INDUSTRY_PAIN` in
`lib/prospecting/icp.ts`. Both the scorer and the drafter read from there.

## Guardrails

These exist because the failure each one prevents is expensive and slow to undo.

- **Nothing sends without approval.** `sendApprovedBatch` only ever reads rows
  with `status === "approved"`, which only a human sets.
- **Master switch.** `OUTREACH_SENDING_ENABLED` defaults to false. Until it is
  `true`, the cron job is a no-op.
- **Two caps.** `OUTREACH_GLOBAL_DAILY_CAP` across everything, plus a per-campaign
  `dailyCap`. The send rate is cron frequency × `OUTREACH_PER_RUN`, so it cannot
  be accelerated by clicking harder.
- **Placeholder domains are refused.** `.invalid`, `.test`, `example.com` and
  friends are rejected by `isSendableAddress`, so sample data can never be mailed.
- **Suppression list.** Unsubscribes, bounces, complaints, and anyone who is
  already a FinovaOS user (checked against the `User` table).
- **No free trial, enforced twice.** The prompt forbids it and
  `containsBannedOffer` rejects the draft anyway — in the pipeline and again when
  an admin edits the copy in review.
- **One-click unsubscribe** in every email footer, plus the real postal address.
  `/api/public/outreach-unsubscribe` works without a login on the first request
  and cancels every queued email to that address across all campaigns.
- **Country allow-list.** `ALLOWED_OUTREACH_COUNTRIES` excludes the EU and UK on
  purpose — PECR and GDPR make unsolicited B2B email there a real liability.

## Setup

### 1. Migrate

```bash
npx prisma migrate dev --name ai-prospecting
```

Adds `OutreachCampaign`, `ProspectCompany`, `ProspectContact`, `OutreachEmail`,
`OutreachEvent`, `OutreachSuppression`.

### 2. Environment

Everything is optional; the console shows what is missing. With nothing set, the
pipeline still runs end to end on placeholder data.

| Variable | Purpose | Cost |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | Discovery — best coverage for PK/Gulf SMEs | ~$32 / 1000 searches, $200/mo free credit |
| `APOLLO_API_KEY` | Discovery + employee counts | from ~$49/mo |
| `HUNTER_API_KEY` | Named decision makers | from ~$34/mo |
| `ZEROBOUNCE_API_KEY` | Deliverability check | ~$0.004–0.008/email |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | Scoring + drafting (already set) | ~$10 / 1000 prospects |
| `OUTREACH_SENDER_NAME` / `_TITLE` | Signature block | — |
| `OUTREACH_POSTAL_ADDRESS` | **Legally required** in the footer | — |
| `OUTREACH_SENDING_ENABLED` | Master switch, default false | — |
| `OUTREACH_GLOBAL_DAILY_CAP` | Ceiling across all campaigns | — |
| `OUTREACH_PER_RUN` | Emails per cron invocation | — |

### 3. Sending domain — do this before turning sending on

Do **not** send cold email from `finovaos.app`. It carries your login OTPs,
invoices and billing receipts; a spam complaint against it takes those down too.
Also note Resend's terms do not permit cold outreach, so the existing
`RESEND_API_KEY` path is for transactional mail only.

1. Register a separate domain, e.g. `finovaos-outreach.com`.
2. Set SPF, DKIM and DMARC on it.
3. Warm it for 2–3 weeks: 5 emails/day, rising to 40.
4. Point `SMTP_*` at a provider that allows cold outreach (Instantly, Smartlead,
   or your own Amazon SES) and set `OUTREACH_SENDING_ENABLED=true`.

### 4. Cron

Add at cron-job.org, alongside the existing jobs:

```
URL:      https://<host>/api/cron/prospecting-send
Schedule: hourly, weekdays, 04:00–13:00 UTC (09:00–18:00 PKT)
Header:   Authorization: Bearer <CRON_SECRET>
```

With `OUTREACH_PER_RUN=2` that is 20 emails a day — the right starting rate for a
freshly warmed domain.

## Daily use

1. **Create a campaign.** Type the brief in English, Urdu or Roman Urdu.
   `parseCommandToBrief` turns it into industries, countries, cities, size band,
   target count, language and tone; every field is re-validated against our own
   vocabularies afterwards.
2. **Run batches.** "Run 5 batches" walks discover → enrich → score → draft and
   stops at review. Big campaigns need several clicks; that is deliberate,
   because each batch costs money.
3. **Review.** Each card shows the company, its facts, the score breakdown and
   the AI's one-line reason, above the editable email. Approve, edit and approve,
   or reject. "Approve all tier A" is there once you trust the scoring.
4. **Open the tap.** Move the campaign to `sending`. The cron does the rest at
   the capped rate.

## Files

| Path | Role |
|---|---|
| `lib/prospecting/types.ts` | Shared shapes, tier thresholds |
| `lib/prospecting/icp.ts` | Who we sell to, and the pain per industry |
| `lib/prospecting/brief.ts` | Free text → structured brief, with a keyword fallback |
| `lib/prospecting/discovery.ts` | Places / Apollo / sample providers |
| `lib/prospecting/enrichment.ts` | Website scrape, contact finder, email verify |
| `lib/prospecting/scoring.ts` | 70 deterministic + 30 AI |
| `lib/prospecting/drafting.ts` | Email copy + the compliant HTML wrapper |
| `lib/prospecting/sending.ts` | Every send guard, cap and suppression check |
| `lib/prospecting/pipeline.ts` | Batch orchestrator |
| `app/admin/prospecting/page.tsx` | The console |
| `app/api/admin/prospecting/*` | Campaign CRUD, run, review queue |
| `app/api/cron/prospecting-send` | Throttled sender |
| `app/api/public/outreach-unsubscribe` | One-click unsubscribe |

## What is not built yet

- **Follow-up sequence.** `OutreachEmail.step` and the step-2/step-3 prompts in
  `drafting.ts` exist, but nothing generates them yet. Wire a cron that drafts
  step 2 for anything sent 3+ days ago with no reply.
- **Reply and bounce detection.** `OutreachEvent` accepts `reply` and `bounce`
  but nothing writes them. Needs an inbound webhook from the sending provider.
- **Auto-convert to `Lead`.** `ProspectCompany.leadId` is there for it; on a
  reply, create the `Lead` row and link it.
- **Open tracking.** Deliberately omitted — a tracking pixel is a spam signal and
  is worth less than the deliverability it costs on a young domain.
