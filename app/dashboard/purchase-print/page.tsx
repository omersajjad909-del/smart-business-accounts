"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PurchasePrint() {
  const params = useSearchParams();
  const id = params.get("id");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
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

      <div className="flex justify-between mb-4">
        <div>Supplier: {data.supplier.name}</div>
        <div>Date: {data.date}</div>
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
