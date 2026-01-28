import { prisma } from "@/lib/prisma";
import BarcodeWrapper from "@/components/BarcodeWrapper";
import QRCodeWrapper from "@/components/QRCodeWrapper";
import { notFound } from "next/navigation";

export default async function PublicPurchaseInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = await searchParams;

  if (!id) return <div>Invalid Invoice ID</div>;

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: { item: true },
      },
      taxConfig: true,
    },
  });

  if (!invoice) return notFound();

  // Calculations
  const itemTotal = invoice.items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  
  let taxAmount = 0;
  if (invoice.taxConfig) {
    taxAmount = (itemTotal * invoice.taxConfig.taxRate) / 100;
  }

  // If freight was added, it would be the remaining amount in total
  // total = itemTotal + taxAmount + freight
  // So freight = total - itemTotal - taxAmount
  const freight = invoice.total - itemTotal - taxAmount;

  const netTotal = invoice.total;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-10 flex flex-col items-center">
        {/* Print Button */}
        <div className="mb-6 w-full max-w-4xl flex justify-end print:hidden">
            <button 
                className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 font-bold"
                onClick={() => window.print()}
            >
                🖨️ Print / Save as PDF
            </button>
        </div>

      <div className="invoice-print bg-white p-10 shadow-lg max-w-4xl w-full mx-auto text-black print:shadow-none print:p-0">
        <div className="flex justify-between border-b-4 border-black pb-4 mb-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter">US TRADERS</h1>
            <p className="text-[10px] font-bold uppercase tracking-[3px] text-gray-600">
              Industrial Goods & Services
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase underline">Purchase Invoice</h2>
            <p className="text-sm font-bold mt-1">INV #: {invoice.invoiceNo}</p>
            <p className="text-sm">Date: {new Date(invoice.date).toLocaleDateString()}</p>
            
            <div className="flex flex-col items-end gap-2 mt-2">
                <div className="text-center">
                    <BarcodeWrapper value={invoice.invoiceNo} width={1.5} height={40} fontSize={14} displayValue={false} />
                    <span className="text-[10px] font-bold">INV ID: {invoice.invoiceNo}</span>
                </div>
                {origin && (
                    <div className="flex flex-col items-center mt-1 border-t pt-1">
                        <QRCodeWrapper value={`${origin}/view/purchase-invoice?id=${invoice.id}`} size={60} />
                        <span className="text-[8px] font-bold mt-1 bg-black text-white px-1">SCAN FOR ONLINE BILL</span>
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-[10px] uppercase font-bold text-gray-400">Vendor / Supplier:</p>
          <p className="text-xl font-black uppercase">{invoice.supplier.name}</p>
          {/* Location removed as it is not in the schema for PurchaseInvoice based on my read, wait, let me check Read output again. 
              Ah, location is NOT in PurchaseInvoice model in schema Read output (lines 107-126). 
              But I used it in previous code: invoice.location. 
              Let's check schema again. */}
        </div>

        <table className="w-full text-sm border-collapse border border-black">
          <thead>
            <tr className="bg-black text-white border border-black uppercase text-[10px]">
              <th className="p-2 border border-black text-center w-12">Sr.</th>
              <th className="p-2 border border-black text-left">Description of Items</th>
              <th className="p-2 border border-black text-center w-24">Qty</th>
              <th className="p-2 border border-black text-center w-32">Rate</th>
              <th className="p-2 border border-black text-right w-36">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((r, i) => (
              <tr key={i} className="border border-black font-bold">
                <td className="p-3 border border-black text-center">{i + 1}</td>
                <td className="p-3 border border-black">
                  <div className="uppercase">{r.item.name}</div>
                  {r.item.description && (
                    <div className="text-[10px] font-normal leading-tight lowercase text-gray-600">
                      {r.item.description}
                    </div>
                  )}
                </td>
                <td className="p-3 border border-black text-center">{r.qty}</td>
                <td className="p-3 border border-black text-center">
                  {Number(r.rate).toLocaleString()}
                </td>
                <td className="p-3 border border-black text-right font-mono">
                  {(Number(r.qty) * Number(r.rate)).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-72 space-y-1">
            <div className="flex justify-between text-[11px] font-bold border-b border-black pb-1">
              <span>SUB-TOTAL:</span>
              <span>{itemTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold border-b border-black pb-1">
              <span>FREIGHT:</span>
              <span>{Math.max(0, freight).toLocaleString()}</span>
            </div>
            {invoice.taxConfig && (
              <div className="flex justify-between text-[11px] font-bold border-b border-black pb-1">
                <span>
                  {invoice.taxConfig.taxType.toUpperCase()} ({invoice.taxConfig.taxRate}%):
                </span>
                <span>{taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-black border-t-2 border-black pt-1 bg-gray-50 p-2">
              <span>NET:</span>
              <span>{netTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-32 flex justify-between px-10">
          <div className="text-center w-48 border-t-2 border-black pt-1 text-[10px] font-bold uppercase">
            Prepared By
          </div>
          <div className="text-center w-48 border-t-2 border-black pt-1 text-[10px] font-bold uppercase">
            Authorized Sign
          </div>
        </div>
      </div>
      
        {/* Footer for Online View */}
        <div className="mt-8 text-gray-500 text-xs print:hidden">
            <p>This is a generated invoice view.</p>
        </div>
        
        {/* Print Button Script */}
        <script dangerouslySetInnerHTML={{__html: `
            document.querySelector('button').addEventListener('click', () => window.print());
        `}} />
    </div>
  );
}
