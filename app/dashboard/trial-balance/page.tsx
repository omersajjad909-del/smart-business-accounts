"use client";

import { useEffect, useState } from "react";

type Row = {
  name: string;
  debit: number;
  credit: number;
};

export default function TrialBalance() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/trial-balance")
      .then((r) => r.json())
      .then(setRows);
  }, []);

  const totalDebit = rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">Trial Balance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Summary of debit and credit balances
        </p>
      </div>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 whitespace-nowrap">Account</th>
              <th className="text-right px-4 py-2 whitespace-nowrap">Debit</th>
              <th className="text-right px-4 py-2 whitespace-nowrap">Credit</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="border-b last:border-b-0 hover:bg-gray-50"
              >
                <td className="px-4 py-2 whitespace-nowrap">{r.name}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {r.debit > 0 ? r.debit.toFixed(2) : ""}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {r.credit > 0 ? r.credit.toFixed(2) : ""}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-gray-100 border-t">
            <tr className="font-semibold">
              <td className="px-4 py-2">Total</td>
              <td className="px-4 py-2 text-right">
                {totalDebit.toFixed(2)}
              </td>
              <td className="px-4 py-2 text-right">
                {totalCredit.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {totalDebit !== totalCredit && (
        <div className="text-sm text-red-600">
          ⚠ Trial balance is not matching
        </div>
      )}
    </div>
  );
}
