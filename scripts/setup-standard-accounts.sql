-- Professional Accounting System - Standard Chart of Accounts
-- یہ script تمام ضروری accounts کو setup کر دے گا

-- ==================== ASSETS (اثاثے) ====================
INSERT INTO "Account" (id, code, name, type, "partyType", "createdAt")
VALUES
-- Cash Accounts
(gen_random_uuid(), 'CASH001', 'Cash in Hand', 'ASSET', NULL, NOW()),
(gen_random_uuid(), 'BANK001', 'Bank Account - Main', 'ASSET', 'BANKS', NOW()),
(gen_random_uuid(), 'BANK002', 'Bank Account - Savings', 'ASSET', 'BANKS', NOW()),

-- Receivables
(gen_random_uuid(), 'AR001', 'Accounts Receivable', 'ASSET', NULL, NOW()),

-- Inventory
(gen_random_uuid(), 'INV001', 'Stock/Inventory', 'ASSET', NULL, NOW()),

-- Fixed Assets
(gen_random_uuid(), 'FA001', 'Building', 'ASSET', NULL, NOW()),
(gen_random_uuid(), 'FA002', 'Machinery & Equipment', 'ASSET', NULL, NOW()),
(gen_random_uuid(), 'FA003', 'Furniture & Fixtures', 'ASSET', NULL, NOW()),
(gen_random_uuid(), 'FA004', 'Vehicles', 'ASSET', NULL, NOW()),
(gen_random_uuid(), 'FA005', 'Accumulated Depreciation - Building', 'ASSET', NULL, NOW()),
(gen_random_uuid(), 'FA006', 'Accumulated Depreciation - Machinery', 'ASSET', NULL, NOW()),

-- ==================== LIABILITIES (ذمہ داریاں) ====================
(gen_random_uuid(), 'AP001', 'Accounts Payable', 'LIABILITY', NULL, NOW()),
(gen_random_uuid(), 'LOAN001', 'Bank Loan', 'LIABILITY', NULL, NOW()),
(gen_random_uuid(), 'LOAN002', 'Short Term Loan', 'LIABILITY', NULL, NOW()),
(gen_random_uuid(), 'TAX001', 'Sales Tax Payable', 'LIABILITY', NULL, NOW()),
(gen_random_uuid(), 'TAX002', 'Income Tax Payable', 'LIABILITY', NULL, NOW()),

-- ==================== EQUITY (رأس مال) ====================
(gen_random_uuid(), 'EQUITY001', 'Opening Balance', 'EQUITY', NULL, NOW()),
(gen_random_uuid(), 'EQUITY002', 'Capital/Owner Equity', 'EQUITY', NULL, NOW()),
(gen_random_uuid(), 'EQUITY003', 'Retained Earnings', 'EQUITY', NULL, NOW()),

-- ==================== INCOME (آمدنی) ====================
(gen_random_uuid(), 'SALES001', 'Sales Revenue', 'INCOME', NULL, NOW()),
(gen_random_uuid(), 'SALES002', 'Service Income', 'INCOME', NULL, NOW()),
(gen_random_uuid(), 'SALES003', 'Interest Income', 'INCOME', NULL, NOW()),
(gen_random_uuid(), 'SALES004', 'Other Income', 'INCOME', NULL, NOW()),

-- ==================== EXPENSES (اخراجات) ====================
(gen_random_uuid(), 'EXP001', 'Purchase', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP002', 'Salary & Wages', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP003', 'Rent Expense', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP004', 'Utilities (Electricity, Water, Gas)', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP005', 'Freight & Transportation', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP006', 'Office Supplies & Expenses', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP007', 'Maintenance & Repair', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP008', 'Depreciation Expense', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP009', 'Insurance', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP010', 'Travel & Conveyance', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP011', 'Telephone & Internet', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP012', 'Interest Expense', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP013', 'Bank Charges', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP014', 'Advertising & Marketing', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP015', 'Professional Fees', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'EXP016', 'Miscellaneous Expense', 'EXPENSE', NULL, NOW()),

-- ==================== CONTRA ACCOUNTS (منفی) ====================
(gen_random_uuid(), 'CONTRA001', 'Sales Return', 'INCOME', NULL, NOW()),
(gen_random_uuid(), 'CONTRA002', 'Purchase Return', 'EXPENSE', NULL, NOW()),
(gen_random_uuid(), 'CONTRA003', 'Sales Discount', 'INCOME', NULL, NOW()),
(gen_random_uuid(), 'CONTRA004', 'Purchase Discount', 'EXPENSE', NULL, NOW());

-- یہ commands run کرنے سے پہلے DATABASE میں duplicates نہیں ہونی چاہئیں
-- اگر duplicates ہوں تو delete کریں۔
