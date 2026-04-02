# Project Tarteeb (Architecture & Conventions)

This document gives a clean, production-focused structure for the entire system.

## 1) High-Level Modules
- Marketing Website: `app/landing` (+ admin landing)
- Onboarding: `app/onboarding` (choose-plan, signup, checklist)
- SaaS App (Dashboard): `app/dashboard` (transactions, inventory, reports, settings)
- APIs: `app/api/**` by domain (accounting, billing, reports, users, etc.)
- Core Lib: `lib/**` (auth, permissions, subscription guard, tenant, prisma)
- Middleware: `middleware/**` + `proxy.ts` (headers, guards)

## 2) Multi-Tenancy & Security
- Every DB table has `companyId`; APIs must filter by `companyId`.
- Headers injected: `x-user-id`, `x-user-role`, `x-company-id` (see `proxy.ts`).
- Non‑public APIs without `x-company-id` → 400.
- Subscription guard enforces plan entitlements per company (`lib/subscriptionGuard.ts`).
- RBAC via `lib/permissions.ts` + `lib/apiPermission.ts`.

## 3) Authentication
- Cookie-based HTTP-only session.
- `POST /api/auth/login` writes `Session` and `sb_auth` cookie.
- Do not use `localStorage` for auth; only for non-sensitive UX state.

## 4) API Conventions
- All mutating endpoints:
  - Validate headers (`x-user-id`, `x-user-role`, `x-company-id`).
  - Check permission with `apiHasPermission(...)`.
  - Guard plan features with `requireEntitlement(req, featureKey)` when premium.
- All list/detail endpoints:
  - Always filter by `companyId`.
  - Return arrays consistently; wrap to `{ rows: [] }` only if necessary and documented.

## 5) UI Structure (Dashboard)
- Navigation groups (collapsed by default):
  - Transactions
  - Inventory
  - Reports (Financial + Inventory)
  - Settings
  - Admin Settings (Users, Companies, Backup)
- Keep MVP menu minimal; hide advanced modules (Payroll, CRM, Fixed Assets, Loans, deep analytics).

## 6) Pricing & Plans
- Admin-configurable plan features + pricing: `/admin/plans` saves to ActivityLog (PLAN_CONFIG).
- Public pricing for marketing and onboarding: `GET /api/public/pricing`.
- Frontend reads prices dynamically in landing, choose-plan, signup.

## 7) Frontend Hydration Discipline
- Never use `window`/`localStorage` in render path. Use `useEffect`.
- If server/client markup differs (e.g., time), prefer:
  - Run on client only via `useEffect`, or
  - Disable SSR on component, or
  - `suppressHydrationWarning` (last resort).
- Avoid scoped styled-jsx hashing mismatches on SSR critical sections; prefer global CSS or Tailwind.

## 8) Coding Conventions
- TypeScript strict: avoid `any` where possible.
- All fetches to internal APIs include `x-company-id` (and role/user when needed).
- Keep components focused; move business logic to `lib/**`.
- No console secrets. Never log tokens/PII.

## 9) Folder Pointers
- Marketing:
  - `app/landing/page.tsx`
  - `app/landing/admin/page.tsx`
- Onboarding:
  - `app/onboarding/choose-plan/page.tsx`
  - `app/onboarding/signup/[plan]/page.tsx`
  - `app/onboarding/checklist/page.tsx`
- Dashboard:
  - `app/dashboard/layout.tsx` (nav & guards)
  - `app/dashboard/**` (pages grouped by domain)
- APIs:
  - `app/api/**` per domain (sales-invoice, purchase-invoice, reports, users, admin)
- Guards:
  - `proxy.ts`, `middleware/*`, `lib/subscriptionGuard.ts`, `lib/permissions.ts`, `lib/apiPermission.ts`, `lib/tenant.ts`

## 10) Quality Gates
- Lint: `npm run lint`
- Build: `npm run build`
- Manual smoke checks:
  - Landing → Pricing dynamic
  - Choose Plan → plan-specific signup
  - Dashboard core flows (Sales, Purchase, Reports)
  - Bank Reconciliation guided steps

