"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type LocationRow = {
  location: string;
  itemName: string;
  unit: string;
  qty: number;
};

export default function LocationStockPage() {
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLocationStock();
  }, []);

  async function loadLocationStock() {
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch("/api/reports/stock/location", {
        headers: { "x-user-role": user?.role || "ADMIN" }
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 📂 لوکیشن کے حساب سے ڈیٹا کو گروپ کرنا
  const locations = [...new Set(rows.map(r => r.location))];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-bold">
      <div className="border-b-4 border-black pb-4 flex justify-between items-center">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Location-wise Inventory</h1>
        <button onClick={() => window.print()} className="bg-black text-white px-6 py-2 text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:hidden">
          Print Report
        </button>
      </div>

      {loading ? (
        <div className="p-20 text-center animate-bounce uppercase">Scanning Locations...</div>
      ) : rows.length === 0 ? (
        <div className="p-20 text-center text-gray-400 uppercase border-2 border-dashed border-black">No stock found in any location.</div>
      ) : (
        <div className="space-y-8">
          {locations.map(loc => (
            <div key={loc} className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              {/* لوکیشن ہیڈر */}
              <div className="bg-black text-white p-3 uppercase font-black flex justify-between items-center">
                <span>📍 Location: {loc}</span>
                <span className="text-[10px] bg-gray-700 px-2 py-1 italic">Warehouse Record</span>
              </div>
              
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black uppercase text-[10px]">
                    <th className="p-3 text-left border-r border-black">Item Name</th>
                    <th className="p-3 text-left border-r border-black">Unit</th>
                    <th className="p-3 text-right">Available Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.filter(r => r.location === loc).map((r, i) => (
                    <tr key={i} className="hover:bg-yellow-50">
                      <td className="p-3 border-r border-gray-300 uppercase">{r.itemName}</td>
                      <td className="p-3 border-r border-gray-300 italic text-gray-500">{r.unit}</td>
                      <td className={`p-3 text-right font-black text-lg ${r.qty < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {r.qty.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}