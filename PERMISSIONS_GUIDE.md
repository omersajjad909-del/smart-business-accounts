# 🔐 Permissions System - Complete Guide

## ⚡ QUICK FIX - Setup All Permissions

```bash
npm run permissions:setup
```

Ye command automatically:
- ✅ All roles ke liye permissions setup karega
- ✅ ADMIN ke liye sab permissions
- ✅ ACCOUNTANT ke liye accounting + reports permissions
- ✅ VIEWER ke liye read-only permissions

---

## 📋 Available Permissions

### 1. Dashboard & Admin
- `VIEW_DASHBOARD` - Dashboard access
- `VIEW_LOGS` - Activity logs
- `MANAGE_USERS` - User management
- `MANAGE_ROLES` - Role management
- `VIEW_AUDIT_LOG` - Audit trail

### 2. Accounts Module
- `VIEW_ACCOUNTS` - View chart of accounts
- `CREATE_ACCOUNTS` - Create new accounts
- `CREATE_CPV` - Cash Payment Voucher
- `CREATE_CRV` - Cash Receipt Voucher

### 3. Catalog/Items
- `VIEW_CATALOG` - View items catalog
- `CREATE_ITEMS` - Add new items
- `CREATE_STOCK_RATE` - Manage stock rates

### 4. Sales & Distribution
- `CREATE_QUOTATION` - Create quotations
- `CREATE_DELIVERY_CHALLAN` - Create delivery challans
- `CREATE_SALES_INVOICE` - Create sales invoices
- `CREATE_SALE_RETURN` - Process sale returns

### 5. Inventory/Purchases
- `VIEW_INVENTORY` - View inventory
- `CREATE_PURCHASE_ORDER` - Create PO
- `CREATE_PURCHASE_INVOICE` - Create purchase invoice
- `CREATE_OUTWARD` - Create outward entry

### 6. Financial Reports
- `VIEW_FINANCIAL_REPORTS` - Access financial reports
- `VIEW_REPORTS` - General reports access
- `VIEW_AGEING_REPORT` - Customer ageing
- `VIEW_LEDGER_REPORT` - Account ledger
- `VIEW_TRIAL_BALANCE_REPORT` - Trial balance
- `VIEW_PROFIT_LOSS_REPORT` - P&L statement
- `VIEW_BALANCE_SHEET_REPORT` - Balance sheet

### 7. Inventory Reports
- `VIEW_INVENTORY_REPORTS` - Inventory reports access
- `VIEW_INWARD` - Inward register
- `VIEW_OUTWARD` - Outward register
- `VIEW_SALES_REPORT` - Sales analysis
- `VIEW_STOCK_LEDGER` - Stock ledger
- `VIEW_STOCK_SUMMARY` - Stock summary
- `VIEW_LOW_STOCK` - Low stock alerts
- `VIEW_LOCATION` - Location-wise stock

### 8. Banking & Payments
- `BANK_RECONCILIATION` - Bank reconciliation
- `PAYMENT_RECEIPTS` - Payment receipts
- `EXPENSE_VOUCHERS` - Expense vouchers
- `TAX_CONFIGURATION` - Tax settings

### 9. HR & Payroll
- `VIEW_HR_PAYROLL` - HR & Payroll module

### 10. CRM
- `VIEW_CRM` - CRM module access

### 11. Settings
- `VIEW_SETTINGS` - System settings

### 12. Advanced Features
- `BUDGET_PLANNING` - Budget management
- `RECURRING_TRANSACTIONS` - Recurring entries
- `FINANCIAL_YEAR` - Financial year management
- `BACKUP_RESTORE` - Backup & restore
- `EMAIL_SETTINGS` - Email configuration

---

## 🎯 Role-Based Permissions

### ADMIN Role
- ✅ **ALL PERMISSIONS** (Full Access)
- Total: 66+ permissions
- Access to everything in the system

### ACCOUNTANT Role
- ✅ Dashboard & Basic Features
- ✅ Full Accounts Module
- ✅ Catalog Management
- ✅ Sales & Distribution
- ✅ Inventory Management
- ✅ All Reports (Financial + Inventory)
- ✅ Banking & Payments
- ✅ Budget & Financial Year
- ❌ User Management
- ❌ Role Management
- ❌ System Settings (limited)

**Total: ~50 permissions**

### VIEWER Role
- ✅ Dashboard
- ✅ View Accounts (read-only)
- ✅ View Catalog (read-only)
- ✅ View Inventory (read-only)
- ✅ All Reports (read-only)
- ✅ View HR/Payroll (read-only)
- ✅ View CRM (read-only)
- ❌ Create/Edit/Delete anything
- ❌ User Management
- ❌ System Settings

**Total: ~25 permissions**

---

## 🔧 Setup Commands

### 1. Setup All Permissions (Recommended)
```bash
npm run permissions:setup
```

### 2. Manual Setup via Seed
```bash
npm run seed
```

### 3. Reset Everything
```bash
npm run db:reset
```

---

## 🎨 Permission Checking (For Developers)

### In Component (Client-Side)
```typescript
import { hasPermission } from "@/lib/hasPermission";
import { getCurrentUser } from "@/lib/auth";

function MyComponent() {
  const user = getCurrentUser();
  
  // Single permission
  const canCreate = hasPermission(user, "CREATE_ACCOUNTS");
  
  // Any permission
  const canAccess = hasAnyPermission(user, [
    "VIEW_ACCOUNTS",
    "CREATE_ACCOUNTS"
  ]);
  
  // All permissions
  const hasFullAccess = hasAllPermissions(user, [
    "VIEW_ACCOUNTS",
    "CREATE_ACCOUNTS",
    "VIEW_LEDGER_REPORT"
  ]);
  
  return (
    <div>
      {canCreate && <button>Create Account</button>}
    </div>
  );
}
```

### In API Route (Server-Side)
```typescript
import { apiHasPermission } from "@/lib/apiPermission";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  const userRole = req.headers.get("x-user-role");
  
  const hasPermission = await apiHasPermission(
    userId,
    userRole,
    "CREATE_ACCOUNTS"
  );
  
  if (!hasPermission) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  // Your logic here
}
```

### Using requirePermission Helper
```typescript
import { requirePermission } from "@/lib/requirePermission";

export async function POST(req: NextRequest) {
  const forbidden = await requirePermission(req, "CREATE_ACCOUNTS");
  if (forbidden) return forbidden;
  
  // Your logic here - user has permission
}
```

---

## 🔄 How Permissions Work

### Priority Order:
1. **ADMIN Role** → Automatic all permissions
2. **User-Specific Permissions** → Override role permissions
3. **Role-Based Permissions** → Default for role

### Example:
```
User: John Doe
Role: VIEWER (normally read-only)
User-Specific Permission: CREATE_ACCOUNTS

Result: John can view (from VIEWER role) AND create accounts (user-specific)
```

---

## 🛠️ Managing User Permissions

### Via Dashboard (Admin Panel)
1. Go to **Admin → Users**
2. Click on user
3. **Manage Permissions** tab
4. Check/uncheck specific permissions
5. Save

### Via API
```typescript
// Add user-specific permission
await prisma.userPermission.create({
  data: {
    userId: "user-id",
    permission: "CREATE_ACCOUNTS"
  }
});

// Remove permission
await prisma.userPermission.delete({
  where: {
    userId_permission: {
      userId: "user-id",
      permission: "CREATE_ACCOUNTS"
    }
  }
});
```

---

## 📊 Permission Tables

### RolePermission Table
Stores default permissions for each role:
```sql
SELECT * FROM "RolePermission" WHERE role = 'ACCOUNTANT';
```

### UserPermission Table
Stores user-specific permission overrides:
```sql
SELECT * FROM "UserPermission" WHERE "userId" = 'some-user-id';
```

---

## 🐛 Troubleshooting

### Issue: User can't access feature
**Check:**
1. User role → Is it correct?
2. Role permissions → Does role have required permission?
3. User-specific permissions → Any blocking permissions?
4. Feature code → Is permission check correct?

**Debug:**
```bash
# Check user's permissions
npm run user:list

# Check role permissions
npm run db:studio
# Navigate to RolePermission table
```

### Issue: ADMIN can't do something
**Solution:** ADMIN should bypass all permission checks. Check code:
```typescript
if (user.role === "ADMIN") return true; // Should be at top
```

### Issue: Permissions not working after setup
**Solution:**
```bash
# Re-run setup
npm run permissions:setup

# Verify in database
npm run db:studio
```

---

## 🔐 Security Best Practices

1. **Always check permissions** in API routes
2. **Don't trust client-side** checks alone
3. **Use server-side validation** for critical operations
4. **Log permission denials** for audit
5. **Review permissions regularly**

---

## 📝 Adding New Permissions

### 1. Update lib/permissions.ts
```typescript
export const PERMISSIONS = {
  // ... existing
  MY_NEW_PERMISSION: "MY_NEW_PERMISSION",
};
```

### 2. Update scripts/setup-permissions.js
```javascript
const ROLE_PERMISSIONS = {
  ADMIN: [..., "MY_NEW_PERMISSION"],
  ACCOUNTANT: [...], // Add if needed
  VIEWER: [...], // Add if needed
};
```

### 3. Run Setup
```bash
npm run permissions:setup
```

### 4. Use in Code
```typescript
if (hasPermission(user, "MY_NEW_PERMISSION")) {
  // Feature code
}
```

---

## 🎯 Quick Commands Reference

```bash
# Setup all permissions
npm run permissions:setup

# View current permissions
npm run db:studio

# List all users with roles
npm run user:list

# Create new user with specific role
npm run user:create "Name" "email@test.com" "pass" "ACCOUNTANT"

# Reset and re-setup everything
npm run db:reset
```

---

**Made with ❤️ | Complete permissions system ready!** ✅
