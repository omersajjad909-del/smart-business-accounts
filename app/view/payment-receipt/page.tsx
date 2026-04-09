import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PrintButton from "@/components/PrintButton";

export default async function PublicPaymentReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ id: string }>;
}) {
  const { id } = await searchParams;

  if (!id) return <div>Invalid Receipt ID</div>;

  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id },
    include: {
      party: true,
      company: true,
      branch: true,
    },
  });

  if (!receipt) return notFound();

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-10 flex flex-col items-center">
      <div className="mb-6 w-full max-w-4xl flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="bg-white p-10 shadow-lg max-w-4xl w-full mx-auto text-black print:shadow-none print:p-0">
        <div className="flex justify-between border-b-4 border-black pb-4 mb-6">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter">{receipt.company?.name || "FinovaOS"}</h1>
            <p className="text-[10px] font-bold uppercase tracking-[3px] text-gray-600">
              Payment Receipt
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black uppercase underline">Receipt Voucher</h2>
            <p className="text-sm font-bold mt-1">REC #: {receipt.receiptNo}</p>
            <p className="text-sm">Date: {new Date(receipt.date).toLocaleDateString()}</p>
            <p className="text-sm">Mode: {receipt.paymentMode}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Received From</p>
            <p className="text-xl font-black uppercase">{receipt.party?.name || "Walk-in Customer"}</p>
            {receipt.party?.code ? <p className="text-sm mt-1">Code: {receipt.party.code}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-gray-400">Branch / Status</p>
            <p className="text-base font-bold uppercase">{receipt.branch?.name || "Main Branch"}</p>
            <p className="text-sm mt-1">Status: {receipt.status}</p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse border border-black">
          <tbody>
            <tr className="border border-black">
              <td className="p-3 border border-black font-bold uppercase bg-gray-50 w-1/3">Receipt Number</td>
              <td className="p-3 border border-black">{receipt.receiptNo}</td>
            </tr>
            <tr className="border border-black">
              <td className="p-3 border border-black font-bold uppercase bg-gray-50">Payment Date</td>
              <td className="p-3 border border-black">{new Date(receipt.date).toLocaleDateString()}</td>
            </tr>
            <tr className="border border-black">
              <td className="p-3 border border-black font-bold uppercase bg-gray-50">Amount Received</td>
              <td className="p-3 border border-black text-2xl font-black">{Number(receipt.amount).toLocaleString()}</td>
            </tr>
            <tr className="border border-black">
              <td className="p-3 border border-black font-bold uppercase bg-gray-50">Payment Mode</td>
              <td className="p-3 border border-black">{receipt.paymentMode}</td>
            </tr>
            <tr className="border border-black">
              <td className="p-3 border border-black font-bold uppercase bg-gray-50">Reference No</td>
              <td className="p-3 border border-black">{receipt.referenceNo || "-"}</td>
            </tr>
            <tr className="border border-black">
              <td className="p-3 border border-black font-bold uppercase bg-gray-50">Narration</td>
              <td className="p-3 border border-black whitespace-pre-wrap">{receipt.narration || "-"}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-16 flex justify-between px-10">
          <div className="text-center w-48 border-t-2 border-black pt-1 text-[10px] font-bold uppercase">
            Received By
          </div>
          <div className="text-center w-48 border-t-2 border-black pt-1 text-[10px] font-bold uppercase">
            Authorized Sign
          </div>
        </div>
      </div>
    </div>
  );
}
