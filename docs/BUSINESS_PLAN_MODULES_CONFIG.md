# Business Plan Module Configuration Guide

## Current System Overview

The `/admin/plans` → "Pages & Modules" tab controls which dashboard pages each **business type** can access per **plan** (STARTER/PRO/ENTERPRISE).

### How It Works

1. **Core Pages** — Features with `businessLabel: "Core (all businesses)"` 
   - Appear in EVERY business type (CRM, HR Payroll, Bank Reconciliation, Reports, etc.)
   - These are already synchronized across all business types
   - One plan setting applies to all businesses

2. **AI Intelligence Features** — Features with `businessLabel: "AI Intelligence"`
   - 24 AI pages appear in EVERY business type
   - Already synchronized globally
   - One plan setting = all businesses get/lose them together

3. **Business-Specific Pages** — Each business type (Trading, Manufacturing, Retail, etc.)
   - Trading has: Trading Overview, Order Desk, Procurement, Stock Control, Analytics, etc.
   - Manufacturing has: Manufacturing Overview, BOM, Production Orders, Quality Control, etc.
   - These are configured SEPARATELY per business type

---

## What's Already Shared Between Trading & Manufacturing

These features appear in BOTH Trading and Manufacturing, so they're configured together:

### ✅ Already Synchronized (Core Pages)
- **Sales Invoice** — appears in both
- **Purchase Invoice** — appears in both
- **Purchase Order (PO)** — appears in both
- **Quotation** — appears in both
- **Delivery Challan** — appears in both
- **Sale Return** — appears in both
- **Bank Reconciliation** — appears in both
- **Chart of Accounts** — appears in both
- **Inventory Items** — appears in both
- **Stock Rates** — appears in both
- **CRM** — appears in both
- **HR & Payroll** — appears in both
- **Reports (Financial & Inventory)** — appears in both
- **Expense Vouchers** — appears in both
- **Advance Payments** — appears in both
- **Petty Cash** — appears in both
- **Journal Vouchers** — appears in both

### ✅ Already Synchronized (AI Features)
- All 24 AI Intelligence tabs appear in both (AI Assistant, AI Analytics, etc.)

---

## What's UNIQUE To Each Business

### 🏪 Unique to Trading (DO NOT SYNCHRONIZE)
- **Trading Overview** — Dashboard home for Trading
- **Order Desk** — Trading-specific order management
- **Procurement** — Trading procurement workflow
- **Stock Control** — Trading inventory control
- **Outstandings** — Trading receivables/payables tracking
- **Dispatch Board** — Trading delivery management
- **Conversion Center** — Trading unit conversions
- **Trading Analytics** — Trading KPIs and insights

### 🏭 Unique to Manufacturing (DO NOT SYNCHRONIZE)
- **Manufacturing Overview** — Dashboard home for Manufacturing
- **Bill of Materials (BOM)** — Manufacturing product recipes
- **Production Orders** — Manufacturing work planning
- **Work Orders** — Manufacturing execution
- **Raw Materials** — Manufacturing input inventory
- **Finished Goods** — Manufacturing output inventory
- **Quality Control** — Manufacturing QC checks

---

## Configuration Strategy

### The Problem You're Facing
Manually managing plan on/off for each business type is tedious because:
- Trading has 40+ features
- Manufacturing has 40+ features
- ~20+ are shared
- Having to toggle each one per plan × per business type = 120+ clicks

### The Solution

**Since shared modules are already synchronized in the "Core" group**, you need to:

1. **For the auto-managed features** (Core + AI):
   - Configure them ONCE in `/admin/plans` → "Pages & Modules"
   - Pick ANY business type (they all use the same config)
   - Set which plans get each module
   - The setting applies to ALL business types automatically

2. **For Trading/Manufacturing unique features**:
   - Select "Trading" business type
   - Toggle: Order Desk, Procurement, Stock Control, Outstandings, Dispatch, Analytics
   - Set which plans get each
   - Select "Manufacturing" business type
   - Toggle: BOM, Production Orders, Work Orders, Quality Control
   - Set which plans get each

---

## Step-by-Step Instructions

### Setup 1: Configure Shared Modules (Core Pages)

```
1. Go to /admin/plans
2. Click "Pages & Modules" tab
3. Click "Select Business Type" dropdown
4. Choose "trading" or "manufacturing" (doesn't matter, they use same config)
5. Look for these groups:
   ✓ "Core (all businesses)" section
   ✓ "AI Intelligence" section
6. For each module in Core:
   - Decide which plans get it (STARTER/PRO/ENTERPRISE)
   - Typical setup:
     * STARTER: Basic modules only (Sales, Purchase, Bank Recon)
     * PRO: Add Payroll, CRM, Advanced Reports
     * ENTERPRISE: Everything
7. Click "Save" once
```

**Example Core Module Assignments:**

| Module | STARTER | PRO | ENTERPRISE |
|--------|---------|-----|-----------|
| Sales Invoice | ✅ | ✅ | ✅ |
| Purchase Invoice | ✅ | ✅ | ✅ |
| Purchase Order | ✅ | ✅ | ✅ |
| Bank Reconciliation | ❌ | ✅ | ✅ |
| CRM | ❌ | ✅ | ✅ |
| HR & Payroll | ❌ | ✅ | ✅ |
| Advanced Reports | ❌ | ✅ | ✅ |
| All AI Tools | ❌ | ✅ | ✅ |

### Setup 2: Configure Trading-Only Features

```
1. Business Type: Select "trading"
2. Look for "Trading" section with these items:
   - Trading Overview
   - Order Desk
   - Procurement
   - Stock Control
   - Outstandings
   - Dispatch Board
   - Conversion Center
   - Trading Analytics

3. Set each:
   STARTER: Overview only (✅ Overview, rest ❌)
   PRO: Overview + Order Desk + Stock Control (✅ Overview, Desk, Stock)
   ENTERPRISE: Everything (✅ all 8)

4. Click "Save"
```

### Setup 3: Configure Manufacturing-Only Features

```
1. Business Type: Select "manufacturing"
2. Look for "Manufacturing" section with these items:
   - Manufacturing Overview
   - Bill of Materials (BOM)
   - Production Orders
   - Work Orders
   - Raw Materials
   - Finished Goods
   - Quality Control

3. Set each:
   STARTER: Overview only (✅ Overview, rest ❌)
   PRO: Overview + BOM + Production (✅ Overview, BOM, Production Orders)
   ENTERPRISE: Everything (✅ all 7)

4. Click "Save"
```

---

## Verification Checklist

After configuration, verify:

- [ ] Core modules (CRM, Payroll, Reports) have same plan assignment for all business types
- [ ] AI tools have same plan assignment for all business types
- [ ] Trading unique features only appear in Trading
- [ ] Manufacturing unique features only appear in Manufacturing
- [ ] STARTER users in any business see basic modules
- [ ] PRO users see advanced analytics and integrations
- [ ] ENTERPRISE users see everything

---

## Why This Approach Works

✅ **Shared modules already synchronized** — Core and AI features use one global config

✅ **Less manual work** — Only 20-30 unique features need per-type configuration

✅ **Consistent experience** — A PRO customer sees the same features regardless of business type

✅ **Scalable** — Easy to add new business types without reconfiguring all core modules

---

## Advanced: If You Want to Auto-Generate This

If you want to programmatically sync, create a script that:

```typescript
// Pseudocode
const tradingFeatures = dashboardFeaturesForBusinessType("trading");
const manufacturingFeatures = dashboardFeaturesForBusinessType("manufacturing");

const sharedFeatures = tradingFeatures.filter(f =>
  f.core || 
  CROSS_BUSINESS_FEATURE_LABELS.has(f.businessLabel)
);

// These share the same plan config automatically
// No additional sync needed!
```

The system already does this through the `core` and `CROSS_BUSINESS_FEATURE_LABELS` flags.

---

## Questions?

- **"Which modules should STARTER get?"** → Look at `/app/api/admin/plan-config/route.ts` → `DEFAULT_PLAN_HIGHLIGHTS`
- **"Can I give Payroll to STARTER?"** → Yes, just toggle it on in Plans → Pages & Modules
- **"Do I need to sync manually?"** → Shared modules are automatic. Only toggle unique features per type.
