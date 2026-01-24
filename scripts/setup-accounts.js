// Standard Chart of Accounts Setup
// یہ script اپنے آپ تمام ضروری accounts کو setup کر دیتا ہے

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupStandardAccounts() {
  const accounts = [
    // ASSETS (اثاثے)
    { code: 'CASH001', name: 'Cash in Hand', type: 'ASSET' },
    { code: 'BANK001', name: 'Bank Account - Main', type: 'ASSET', partyType: 'BANKS' },
    { code: 'BANK002', name: 'Bank Account - Savings', type: 'ASSET', partyType: 'BANKS' },
    { code: 'AR001', name: 'Accounts Receivable', type: 'ASSET' },
    { code: 'INV001', name: 'Stock/Inventory', type: 'ASSET' },
    { code: 'FA001', name: 'Building', type: 'ASSET' },
    { code: 'FA002', name: 'Machinery & Equipment', type: 'ASSET' },
    { code: 'FA003', name: 'Furniture & Fixtures', type: 'ASSET' },
    { code: 'FA004', name: 'Vehicles', type: 'ASSET' },
    { code: 'FA005', name: 'Accumulated Depreciation - Building', type: 'ASSET' },
    { code: 'FA006', name: 'Accumulated Depreciation - Machinery', type: 'ASSET' },

    // LIABILITIES (ذمہ داریاں)
    { code: 'AP001', name: 'Accounts Payable', type: 'LIABILITY' },
    { code: 'LOAN001', name: 'Bank Loan', type: 'LIABILITY' },
    { code: 'LOAN002', name: 'Short Term Loan', type: 'LIABILITY' },
    { code: 'TAX001', name: 'Sales Tax Payable', type: 'LIABILITY' },
    { code: 'TAX002', name: 'Income Tax Payable', type: 'LIABILITY' },

    // EQUITY (رأس مال)
    { code: 'EQUITY001', name: 'Opening Balance', type: 'EQUITY' },
    { code: 'EQUITY002', name: 'Capital/Owner Equity', type: 'EQUITY' },
    { code: 'EQUITY003', name: 'Retained Earnings', type: 'EQUITY' },

    // INCOME (آمدنی)
    { code: 'SALES001', name: 'Sales Revenue', type: 'INCOME' },
    { code: 'SALES002', name: 'Service Income', type: 'INCOME' },
    { code: 'SALES003', name: 'Interest Income', type: 'INCOME' },
    { code: 'SALES004', name: 'Other Income', type: 'INCOME' },

    // EXPENSES (اخراجات)
    { code: 'EXP001', name: 'Purchase', type: 'EXPENSE' },
    { code: 'EXP002', name: 'Salary & Wages', type: 'EXPENSE' },
    { code: 'EXP003', name: 'Rent Expense', type: 'EXPENSE' },
    { code: 'EXP004', name: 'Utilities (Electricity, Water, Gas)', type: 'EXPENSE' },
    { code: 'EXP005', name: 'Freight & Transportation', type: 'EXPENSE' },
    { code: 'EXP006', name: 'Office Supplies & Expenses', type: 'EXPENSE' },
    { code: 'EXP007', name: 'Maintenance & Repair', type: 'EXPENSE' },
    { code: 'EXP008', name: 'Depreciation Expense', type: 'EXPENSE' },
    { code: 'EXP009', name: 'Insurance', type: 'EXPENSE' },
    { code: 'EXP010', name: 'Travel & Conveyance', type: 'EXPENSE' },
    { code: 'EXP011', name: 'Telephone & Internet', type: 'EXPENSE' },
    { code: 'EXP012', name: 'Interest Expense', type: 'EXPENSE' },
    { code: 'EXP013', name: 'Bank Charges', type: 'EXPENSE' },
    { code: 'EXP014', name: 'Advertising & Marketing', type: 'EXPENSE' },
    { code: 'EXP015', name: 'Professional Fees', type: 'EXPENSE' },
    { code: 'EXP016', name: 'Miscellaneous Expense', type: 'EXPENSE' },

    // CONTRA ACCOUNTS (منفی)
    { code: 'CONTRA001', name: 'Sales Return', type: 'INCOME' },
    { code: 'CONTRA002', name: 'Purchase Return', type: 'EXPENSE' },
    { code: 'CONTRA003', name: 'Sales Discount', type: 'INCOME' },
    { code: 'CONTRA004', name: 'Purchase Discount', type: 'EXPENSE' },
  ];

  console.log('🔄 Setting up Standard Chart of Accounts...');

  for (const acc of accounts) {
    const existing = await prisma.account.findFirst({
      where: { code: acc.code },
    });

    if (existing) {
      console.log(`✅ Already exists: ${acc.name}`);
    } else {
      await prisma.account.create({
        data: acc,
      });
      console.log(`✨ Created: ${acc.name}`);
    }
  }

  console.log('\n✅ Standard Chart of Accounts setup complete!');
  await prisma.$disconnect();
}

setupStandardAccounts().catch(e => {
  console.error('❌ Error:', e);
  process.exit(1);
});
