"use client";

import { useEffect, useState } from "react";

type StockItem = {
  id: string;
  name: string;
  description?: string;
  availableQty: number;
  avgRate?: number;
};

export default function StockReportPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/stock-available-for-sale")
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.description && i.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalStockQty = filtered.reduce((acc, item) => acc + (item.availableQty || 0), 0);
  const _totalStockValue = filtered.reduce((acc, item) => acc + ((item.availableQty || 0) * (item.avgRate || 0)), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Stock Report</h1>
          <p className="text-sm text-gray-500">Current available stock levels</p>
        </div>
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="text-gray-500 text-sm font-medium">Total Items</div>
          <div className="text-2xl font-bold text-blue-600">{filtered.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="text-gray-500 text-sm font-medium">Total Quantity</div>
          <div className="text-2xl font-bold text-green-600">{totalStockQty.toLocaleString()}</div>
        </div>
        {/* Optional: Value Card if rate is available */}
        {/* <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <div className="text-gray-500 text-sm font-medium">Total Value (Approx)</div>
          <div className="text-2xl font-bold text-purple-600">{totalStockValue.toLocaleString()}</div>
        </div> */}
      </div>

      <div className="bg-white border rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Item Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Description</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Available Qty</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Loading stock data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No items found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-gray-500">{item.description || "-"}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700">
                      {item.availableQty}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.availableQty <= 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Out of Stock
                        </span>
                      ) : item.availableQty < 10 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
