# Quick Start: Sync Trading & Manufacturing Modules

## TL;DR

Your shared modules (CRM, Payroll, Reports, invoicing, etc.) are **already auto-synced** across all business types. You only need to manually configure **unique modules** (Trading Overview vs Manufacturing Overview, etc.).

---

## What Just Got Added

### 1. **Configuration Guide**
📄 File: `docs/BUSINESS_PLAN_MODULES_CONFIG.md`
- Explains what's shared vs unique
- Step-by-step setup instructions
- Examples and templates

### 2. **Analysis Tool** (New API Endpoint)
🔍 Endpoint: `GET /api/admin/analyze-plan-modules`
- Shows current plan assignments for Trading & Manufacturing
- Highlights mismatches
- Provides sync recommendations

**Usage:**
```bash
# In browser console or Postman
curl "http://localhost:3000/api/admin/analyze-plan-modules"
```

Output shows:
- ✅ Synced features (plan assignments match)
- ⚠️  Unsynced features (assignments differ)
- 🏪 Unique to Trading
- 🏭 Unique to Manufacturing

### 3. **Auto-Sync Tool** (POST to same endpoint)
⚙️ Endpoint: `POST /api/admin/analyze-plan-modules?action=sync-shared`
- One-click sync of shared modules from Trading → Manufacturing
- Or use `?sourceType=manufacturing` to go the other way

**Usage:**
```bash
# Sync Trading's plan assignments to Manufacturing
curl -X POST "http://localhost:3000/api/admin/analyze-plan-modules?action=sync-shared"
```

---

## The Three Steps to Setup

### Step 1: Understand What's Shared
Run: `GET /api/admin/analyze-plan-modules`

This tells you exactly which modules are currently mismatched.

### Step 2: Sync Shared Modules (Optional - If Mismatched)
Run: `POST /api/admin/analyze-plan-modules?action=sync-shared`

This copies plan assignments from Trading to Manufacturing for all shared modules.

### Step 3: Manually Configure Unique Modules
1. Go to `/admin/plans` → "Pages & Modules"
2. Select "Trading" → toggle Trading-only features
3. Select "Manufacturing" → toggle Manufacturing-only features
4. Save

---

## Example Workflow

### Before (Mismatched)
```
Trading:
  - CRM: ✅ PRO, ENTERPRISE  (not in STARTER)
  - Payroll: ✅ PRO, ENTERPRISE

Manufacturing:
  - CRM: ✅ STARTER, PRO, ENTERPRISE  (in all plans!)
  - Payroll: ✅ STARTER, PRO, ENTERPRISE
```

### Run Sync
```bash
POST /api/admin/analyze-plan-modules?action=sync-shared
```

### After (Synced)
```
Both Trading & Manufacturing:
  - CRM: ✅ PRO, ENTERPRISE  (not in STARTER)
  - Payroll: ✅ PRO, ENTERPRISE
  
✓ Now consistent!
```

---

## What Each Module Should Get

### Core Modules (Synced Automatically)

| Module | STARTER | PRO | ENTERPRISE |
|--------|---------|-----|-----------|
| **Invoicing** | ✅ | ✅ | ✅ |
| Sales Invoice | ✅ | ✅ | ✅ |
| Purchase Invoice | ✅ | ✅ | ✅ |
| Purchase Order | ✅ | ✅ | ✅ |
| Quotation | ✅ | ✅ | ✅ |
| **Accounting** | ✅ | ✅ | ✅ |
| Chart of Accounts | ✅ | ✅ | ✅ |
| Bank Reconciliation | ❌ | ✅ | ✅ |
| Expense Vouchers | ✅ | ✅ | ✅ |
| Journal Vouchers | ✅ | ✅ | ✅ |
| **Inventory** | ✅ | ✅ | ✅ |
| Inventory Items | ✅ | ✅ | ✅ |
| Stock Rates | ✅ | ✅ | ✅ |
| **People** | ❌ | ✅ | ✅ |
| CRM | ❌ | ✅ | ✅ |
| HR & Payroll | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | ✅ | ✅ |
| Financial Reports | ❌ | ✅ | ✅ |
| Inventory Reports | ❌ | ✅ | ✅ |
| **AI** | ❌ | ✅ | ✅ |
| All 24 AI Tools | ❌ | ✅ | ✅ |

### Trading-Only Modules

| Module | STARTER | PRO | ENTERPRISE |
|--------|---------|-----|-----------|
| **Trading Control** | | | |
| Trading Overview | ✅ | ✅ | ✅ |
| Order Desk | ❌ | ✅ | ✅ |
| Procurement | ❌ | ✅ | ✅ |
| Stock Control | ❌ | ✅ | ✅ |
| Outstandings | ❌ | ✅ | ✅ |
| Dispatch Board | ❌ | ✅ | ✅ |
| Trading Analytics | ❌ | ✅ | ✅ |

### Manufacturing-Only Modules

| Module | STARTER | PRO | ENTERPRISE |
|--------|---------|-----|-----------|
| **Manufacturing** | | | |
| Manufacturing Overview | ✅ | ✅ | ✅ |
| BOM | ❌ | ✅ | ✅ |
| Production Orders | ❌ | ✅ | ✅ |
| Work Orders | ❌ | ✅ | ✅ |
| Raw Materials | ❌ | ✅ | ✅ |
| Quality Control | ❌ | ✅ | ✅ |

---

## Checklist

After setting up:

- [ ] Ran `GET /api/admin/analyze-plan-modules` to see current state
- [ ] If mismatched, ran `POST /api/admin/analyze-plan-modules?action=sync-shared` to sync
- [ ] Went to `/admin/plans` → "Pages & Modules"
- [ ] Configured Trading-specific modules (Order Desk, Procurement, etc.)
- [ ] Configured Manufacturing-specific modules (BOM, Production Orders, etc.)
- [ ] Verified all plans have correct modules
- [ ] Tested as STARTER/PRO/ENTERPRISE user to confirm access

---

## Advanced: Custom Syncing

If you want to sync FROM Manufacturing TO Trading instead:

```bash
POST /api/admin/analyze-plan-modules?action=sync-shared&sourceType=manufacturing
```

Or manually:

1. Go to `/admin/plans` → "Pages & Modules"
2. Select "manufacturing" business type
3. Copy down which plans have each shared module (CRM, Payroll, etc.)
4. Select "trading" business type
5. Apply the same settings
6. Save

---

## Still Confused?

The golden rule:
- **Shared modules** = Configure once, applies everywhere
- **Unique modules** = Configure per business type separately

That's it! 🎯
