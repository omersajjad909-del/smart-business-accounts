# Super Admin Dashboard — Design Spec (Production-Grade)

This is the SaaS Owner Control Center for the Accounting & Financial Management platform. The design focuses on revenue, growth, geo-intelligence, and system health.

## 1) Folder Structure (Admin Module)

- app/
  - admin/ (existing)
    - web/ (Super Admin console)
      - page.tsx               # Overview (SaaS Health + Finance KPIs)
      - users/page.tsx         # Website Users (latest login per user)
    - plans/page.tsx           # Plan pricing + plan-permissions
  - api/
    - admin/
      - web/
        - metrics/route.ts     # Core KPIs (logins, active users, new companies)
        - finance/route.ts     # MRR/ARR, active paid by plan
        - sessions/route.ts    # Latest session per user (site-wide)
      - companies/…            # Company management (existing)
      - plan-config/…          # Pricing + plan permissions (existing)

Future expansion (scaffold later):
- app/admin/geo/page.tsx
- app/admin/revenue/page.tsx
- app/admin/companies/page.tsx
- app/admin/usage/page.tsx
- app/admin/flags/page.tsx
- app/admin/system/page.tsx
- app/admin/logs/page.tsx

## 2) Database Schema Additions (Prisma)

Add or ensure:

```prisma
model LoginLog {
  id        String   @id @default(cuid())
  userId    String?
  companyId String?
  ip        String?
  country   String?  // ISO-2
  city      String?
  ua        String?
  createdAt DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id])
  company   Company? @relation(fields: [companyId], references: [id])
  @@index([createdAt])
  @@index([country])
}

model FeatureFlag {
  id        String   @id @default(cuid())
  companyId String
  key       String
  enabled   Boolean  @default(false)
  updatedAt DateTime @updatedAt
  @@unique([companyId, key])
}

model RevenueMetric {          // optional precompute
  id        String   @id @default(cuid())
  ym        String   // YYYY-MM
  plan      String
  mrr       Float    @default(0)
  churnPct  Float    @default(0)
  createdAt DateTime @default(now())
  @@unique([ym, plan])
}

model Company {
  id                  String    @id @default(cuid())
  name                String
  country             String?   // ISO-2
  plan                String?   // STARTER | PRO | ENTERPRISE
  subscriptionStatus  String?   // ACTIVE | INACTIVE | TRIALING
  stripeCustomerId    String?
  stripeSubscriptionId String?
  currentPeriodEnd    DateTime?
  createdAt           DateTime  @default(now())
  // … existing relations
}
```

## 3) API Routes Structure (Server)

- GET /api/admin/web/metrics
  - logins24h, users30d, companies7d
- GET /api/admin/web/finance
  - mrr, arr, active by plan, uses company plan + pricing
- GET /api/admin/web/sessions
  - latest session per user (distinct userId) for site
- GET /api/admin/companies            # existing pattern
- POST /api/admin/companies/actions
  - { suspend | extendTrial | upgrade | downgrade | toggleFeature | cancelSubscription }
- GET /api/admin/geo/countries
  - usage by country: companies, active users, revenue
- GET /api/admin/usage/top-active
  - Top 10 most active companies
- GET /api/admin/usage/at-risk
  - Companies with no login in 14 days
- GET /api/admin/system/health
  - apiErrors24h, failedLogins, backupStatus, lastBackupAt, queueFailures
- GET /api/admin/logs
  - Search audit logs: by company/user/action/date/country; pagination

All /api/admin/* endpoints require role=ADMIN (super admin). Responses are cache: "no-store".

## 4) Geo Tracking Logic

- On each successful login, write LoginLog with { userId, companyId, ip, ua, timestamp }.
- Geo lookup:
  - Extract IP from x-forwarded-for (first public IP).
  - Call a geo service (MaxMind Lite or IP API) behind a simple wrapper with in-memory/LRU cache (6h TTL).
  - Persist country (ISO-2) and city into LoginLog.
- Country for company:
  - Capture at signup. Keep in Company.country.

## 5) Revenue Aggregation Logic

- Plans/pricing:
  - Admin can define pricing in plan-config (already present)
  - Finance API computes:
    - Active paid by plan (Company with subscriptionStatus=ACTIVE)
    - MRR = Σ active(plan_count × plan_pricing.monthly)
    - ARR = MRR × 12
- Churn:
  - “Churn This Month” = (# subscriptions ACTIVE last month but not ACTIVE this month) ÷ (# ACTIVE last month)
  - Use Stripe webhook events to update Company.subscriptionStatus and currentPeriodEnd.
- Upgrades/Downgrades:
  - Compare plan changes in ActivityLog (action: PLAN_CHANGE) or Stripe webhook metadata.

## 6) Admin Dashboard Layout Structure (UI)

Sidebar (collapsible):
- Overview, Revenue, Companies, Geo Analytics, Usage, Feature Flags, Logs, System Health, Settings

Overview (top KPI cards):
- Total Companies, Active Subscriptions, Trial Companies, MRR, Failed Payments, Active Users (24h), Churn This Month, New Signups (30d)

Revenue:
- MRR growth (line)
- Plan distribution (donut)
- Upgrade/downgrade trend (bar)
- Churn % (sparkline)
- Annual vs Monthly ratio (stacked bar)

Companies (data table):
- Columns: Company, Country, Plan, Status, StripeID, CurrentPeriodEnd, Users, Branches, Last Login
- Row actions: Suspend, Extend Trial, Upgrade/Downgrade, Toggle Feature, Cancel

Geo Analytics:
- Heatmap world map by active users & companies
- Top countries table (Companies, Active users, MRR)
- Signup growth by country (bar)

Usage:
- Top 10 Most Active Companies
- At-Risk Companies (no login ≥14d)
- High Invoice Volume Companies
- Storage usage (MB / GB)

Feature Flags (per company):
- Toggle: multiCurrency, payroll, crm, fixedAssets, advancedReports, inventoryProAnalytics

System Health:
- API error count (24h), Failed logins, Backup status, Last DB backup, Queue/job failures

Logs:
- Audit Log Viewer with filters (date range, action, company, country)

## 7) Charting Strategy

- Use a minimal, dependency-light approach initially (custom SVG/SimpleChart for bars/lines).
- For advanced charts (donut/heatmap), add a single chart lib (e.g., Chart.js via react-chartjs-2) when needed.
- All charts fed by `/api/admin/web/*` or dedicated endpoints; avoid client-side heavy joins.

## 8) Access Control Middleware

- Proxy-based guard (implemented): redirect unauthenticated to /login.
- For /admin routes: enforce x-user-role=ADMIN in proxy or per endpoint.
- Do not rely on client-side checks for Super Admin.

## 9) Performance Considerations

- All admin APIs `cache: "no-store"` but use DB indexes: createdAt, country, plan, subscriptionStatus.
- Avoid N+1: prefer aggregates/groupBy.
- Precompute monthly metrics into `RevenueMetric` via a nightly cron (optional) for MRR growth.
- Add limits & pagination for company/log tables.
- CDN for map tiles (if using a map library).

## 10) Deployment Considerations

- Stripe webhook configured with signing secret.
- Environment vars for GEO provider and Stripe.
- Daily backup job; expose last backup timestamp in System Health.
- Read-only fallbacks for analytics if external providers fail.

## Implementation Notes

- Current repo already includes:
  - Plan-config (pricing) storage (ActivityLog)
  - Stripe webhook to keep company subscription in sync
  - Admin endpoints for web metrics and sessions
- Next step: scaffold the remaining pages under app/admin/* and add corresponding routes incrementally.

