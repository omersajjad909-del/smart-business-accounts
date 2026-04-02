# Development Guide (Quick Start)

## Setup
- Node 18+
- Install: `npm i`
- Dev: `npm run dev -p 3001`
- Build: `npm run build`
- Lint: `npm run lint`

## Environment
- `.env` for local DB and service keys (never commit real secrets).
- App Router (Next.js 16), Tailwind CSS, Prisma, PostgreSQL.

## Guarded Architecture
- Multi-tenant headers required on non-public APIs:
  - `x-user-id`, `x-user-role`, `x-company-id`
- Proxy injects headers from cookie/user when possible (`proxy.ts`).
- All APIs must filter by `companyId` and check permissions.
- Premium features guarded by `requireEntitlement`.

## Creating an API Route
1. Create file under `app/api/feature/route.ts`.
2. In handler:
   - Resolve company: `const companyId = await resolveCompanyId(req)`
   - Permission check: `apiHasPermission(userId, userRole, PERMISSIONS.X, companyId)`
   - Return arrays consistently.

## Creating a Dashboard Page
1. Add under `app/dashboard/<module>/page.tsx`.
2. Fetch with headers:
   - Always include `x-company-id` (also role/user when needed).
3. Keep browser-only code inside `useEffect` to avoid hydration issues.

## Hydration Pitfalls
- Do not use `window`, `localStorage`, `Date.now()` in render.
- Use `useEffect` for client-only actions.
- If SSR/CSR mismatch is unavoidable, consider disabling SSR for the component.

## Pricing & Plans
- Admin: `/admin/plans` to edit features and pricing.
- Public: `GET /api/public/pricing` for landing/onboarding.
- Frontend reads pricing per billing cycle (monthly/yearly).

## MVP Scope (Phase 1)
- Keep nav minimal (Transactions, Inventory, Core Reports, Settings).
- Hide Payroll, CRM, Fixed Assets, Loans, extended analytics.

## Debugging Checklist
- If a roles/users screen fails, ensure API returns an array.
- If hydration warnings appear on landing/admin:
  - Remove render-time browser calls.
  - Avoid styled-jsx with hashed classes on SSR-critical nodes (prefer global).

## Commands
- Dev: `npm run dev -- -p 3001`
- Build: `npm run build`
- Lint: `npm run lint`

