"use client";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useResponsive } from "@/hooks/useResponsive";

type LowStockRow = {
  itemId: string;
  itemName: string;
  description: string;
  stockQty: number;
  minStock: number;
  unit: string;
};

export default function LowStockPage() {
  const { isMobile } = useResponsive();
  const [rows, setRows] = useState<LowStockRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadLowStock(); }, []);

  async function loadLowStock() {
    setLoading(true);
    const user = getCurrentUser();
    try {
      const res = await fetch("/api/reports/stock/low", {
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5" style={{ fontFamily: "'Outfit','DM Sans',sans-serif" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Red dot indicator */}
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Low stock alert
          </h1>
          {!loading && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-medium border border-red-100 dark:border-red-900">
              {rows.length} {rows.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>

        <button
          onClick={loadLowStock}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 4v5h5M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 9a9 9 0 0 1 15-6.7M20 15a9 9 0 0 1-15 6.7" strokeLinecap="round" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 dark:text-gray-500 tracking-wide uppercase">Item</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400 dark:text-gray-500 tracking-wide uppercase">Current stock</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400 dark:text-gray-500 tracking-wide uppercase">Min. level</th>
              <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400 dark:text-gray-500 tracking-wide uppercase">Required</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              /* Loading skeleton */
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                  <td className="px-4 py-3.5">
                    <div className="h-3.5 w-36 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-1.5" />
                    <div className="h-2.5 w-24 bg-gray-50 dark:bg-gray-800/60 rounded animate-pulse" />
                  </td>
                  <td className="px-4 py-3.5 text-right"><div className="h-3.5 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse ml-auto" /></td>
                  <td className="px-4 py-3.5 text-right"><div className="h-3.5 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse ml-auto" /></td>
                  <td className="px-4 py-3.5 text-right"><div className="h-6 w-14 bg-gray-100 dark:bg-gray-800 rounded animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-green-600 dark:text-green-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-green-300 dark:text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    All items are sufficiently stocked
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const required = r.minStock - r.stockQty;
                return (
                  <tr
                    key={r.itemId ?? i}
                    className="border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Item name + description */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900 dark:text-white text-sm leading-snug">
                        {r.itemName}
                      </div>
                      {r.description && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                          {r.description}
                        </div>
                      )}
                    </td>

                    {/* Current stock — red */}
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <span className="text-sm font-medium text-red-500 dark:text-red-400">
                        {r.stockQty}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        {r.unit}
                      </span>
                    </td>

                    {/* Min level — muted */}
                    <td className="px-4 py-3.5 text-right tabular-nums text-sm text-gray-500 dark:text-gray-400">
                      {r.minStock}
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                        {r.unit}
                      </span>
                    </td>

                    {/* Required badge */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[52px] px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 tabular-nums">
                        {required > 0 ? `+${required}` : "⚠"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}