"use client";

import { useEffect, useState } from "react";

type StockRow = {
  itemId: string;
  name: string;
  qty: number;
};

export default function InventoryPage() {
  const [stock, setStock] = useState<StockRow[]>([]);

  useEffect(() => {
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(setStock);
  }, []);

  return (
    <div className="max-w-3xl overflow-x-auto">
      <h1 className="text-2xl font-semibold mb-4">Inventory</h1>

      <table className="w-full border-collapse border min-w-[500px]">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2 text-left">Item</th>
            <th className="border px-3 py-2 text-right">Stock Qty</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((s) => (
            <tr key={s.itemId}>
              <td className="border px-3 py-2">{s.name}</td>
              <td className="border px-3 py-2 text-right">{s.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
