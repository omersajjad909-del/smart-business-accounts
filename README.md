# Smart Business Accounts 💼

A comprehensive accounting and business management system built with Next.js, Prisma, and PostgreSQL.

## 🚀 Features

- 📊 **Complete Accounting System** - Chart of Accounts, Vouchers (CPV/CRV/JV)
- 🏦 **Banking & Payments** - Bank reconciliation, Payment receipts, Expense management
- 📦 **Inventory Management** - Stock tracking, Purchase orders, Sales invoices
- 💰 **Tax Management** - GST/VAT configuration, Tax reporting
- 👥 **CRM Module** - Contact management, Opportunities, Interactions
- 🕐 **HR & Attendance** - Employee management, Payroll, Attendance tracking
- 📈 **Advanced Reporting** - Balance Sheet, P&L, Trial Balance, Ledger, Ageing reports
- 💱 **Multi-Currency Support**
- 🔄 **Recurring Transactions**
- 📊 **Budget Management**
- 🔐 **Role-based Access Control** - Admin, Accountant, Viewer roles
- 🌍 **Urdu/English Support**

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

## ⚡ Quick Start (Local Development)

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd smart-business-accounts
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Database

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/smart_accounts"
```

### 4. Run migrations & seed

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed default data (creates admin user)
npm run seed
```

### 5. Start development server

```bash
npm run dev
```

Visit `http://localhost:3000` and login with:
- **Email:** `admin@local.com`
- **Password:** `us786`

## 🌐 Vercel Deployment

For detailed deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Quick Deployment Steps:

1. **Setup Database**
   - Use Vercel Postgres, Supabase, or Neon
   - Copy connection string

2. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI (if not installed)
   npm i -g vercel

   # Deploy
   vercel
   ```

3. **Set Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add: `DATABASE_URL=your_postgres_connection_string`

4. **Run Migrations**
   ```bash
   # After first deployment
   npx prisma migrate deploy
   npm run seed
   ```

## 📁 Project Structure

```
smart-business-accounts/
├── app/
│   ├── api/              # API routes
│   └── dashboard/        # Dashboard pages
├── components/           # React components
├── lib/                  # Utilities & helpers
│   └── prisma.ts        # Centralized Prisma client
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── migrations/      # Database migrations
│   └── seed.js          # Seed data
└── public/              # Static files
```

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run seed         # Seed database with default data
npm run db:studio    # Open Prisma Studio (database GUI)
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma Client
```

## 🗄️ Database Schema

The system includes the following main modules:

- **Accounting** - Account, Voucher, VoucherEntry
- **Inventory** - ItemNew, InventoryTxn, StockRate
- **Sales** - SalesInvoice, Quotation, DeliveryChallan, SaleReturn
- **Purchase** - PurchaseOrder, PurchaseInvoice
- **Banking** - BankAccount, BankStatement, BankReconciliation, PaymentReceipt
- **HR** - Employee, Attendance, Leave, Payroll, AdvanceSalary
- **CRM** - Contact, Interaction, Opportunity
- **Tax** - TaxConfiguration, TaxAccount, InvoiceTax
- **Users** - User, UserPermission, RolePermission, ActivityLog

## 🔐 Default Roles & Permissions

### ADMIN
- Full system access
- User management
- All CRUD operations

### ACCOUNTANT
- View accounts
- Create vouchers (CPV/CRV)
- View reports
- Limited user operations

### VIEWER
- View-only access
- Reports access
- No create/update/delete

## 🛠️ Troubleshooting

### "Users not found" error
```bash
npx prisma migrate deploy
npm run seed
```

### Prisma Client errors
```bash
npx prisma generate
```

### Database connection issues
- Verify `DATABASE_URL` in environment variables
- Check database is accessible
- Ensure SSL mode is correct for production

## 📞 Support

For issues or questions:
1. Check [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Review Vercel deployment logs
3. Verify environment variables
4. Check database connection

## 🙏 Credits

Developed with ❤️ for small and medium businesses

---

**Tech Stack:** Next.js 16 • React 18 • Prisma 6 • PostgreSQL • TailwindCSS • TypeScript
