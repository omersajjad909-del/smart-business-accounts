"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const Barcode = dynamic(() => import("react-barcode"), { 
  ssr: false,
  loading: () => <p>Loading Barcode...</p>
});
import { QRCodeSVG } from "qrcode.react";

export default function PurchasePrint() {
  const params = useSearchParams();
  const id = params.get("id");
  const [data, setData] = useState<any>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    if (!id) return;
    fetch(`/api/purchase-invoice?id=${id}`)
      .then(r => r.json())
      .then(setData);
  }, [id]);

  if (!data) return null;

  return (
    <div className="p-10 text-sm print:p-0">
      <h2 className="text-xl font-bold text-center mb-4">
        PURCHASE INVOICE
      </h2>

      <div className="flex justify-between mb-4 items-start">
        <div>
            <div className="font-bold">Supplier: {data.supplier.name}</div>
        </div>
        <div className="text-right flex flex-col items-end">
            <div>Date: {new Date(data.date).toLocaleDateString()}</div>
            <div className="font-bold">Invoice #: {data.invoiceNo}</div>
            {data.invoiceNo && (
                <div className="mt-1 flex flex-col items-end gap-2">
                    <Barcode value={data.invoiceNo} width={1.5} height={40} fontSize={10} displayValue={false} />
                    {origin && (
                        <div className="flex flex-col items-center">
                            <QRCodeSVG value={`${origin}/dashboard/purchase-invoice?id=${data.invoiceNo}`} size={50} />
                            <span className="text-[8px] font-bold mt-1">SCAN FOR BILL</span>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((i: any) => (
            <tr key={i.id}>
              <td>{i.item.name}</td>
              <td>{i.qty}</td>
              <td>{i.rate}</td>
              <td>{i.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right mt-4 font-bold">
        Total: {data.total}
      </div>

      <button
        onClick={() => window.print()}
        className="mt-6 print:hidden border px-4 py-2"
      >
        Print
      </button>
    </div>
  );
}
