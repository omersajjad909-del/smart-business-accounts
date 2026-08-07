import { generateInvoicePdf } from './lib/invoicePdf';

const data = {
  invoiceNumber: 'INV-2026-001',
  invoiceDate: '01-01-2026',
  dueDate: '10-01-2026',
  companyName: 'FinovaOS',
  companyAddress: 'Test address',
  companyPhone: '+92 300 1234567',
  companyEmail: 'support@finovaos.app',
  customerName: 'Test Customer',
  customerAddress: 'Customer address',
  customerPhone: '03001234567',
  items: [{ name: 'Pro subscription', qty: 1, rate: 99, amount: 99 }],
  subtotal: 99,
  tax: 0,
  discount: 0,
  total: 99,
  currency: 'USD',
  notes: 'Test notes',
  status: 'PAID',
};

async function run() {
  try {
    const pdf = await generateInvoicePdf(data);
    console.log('SUCCESS', pdf.length);
  } catch (err) {
    console.error('ERR', err);
    if (err instanceof Error) console.error(err.stack);
    process.exit(1);
  }
}

run();
