"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Sync from URL to input
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== query) {
      setQuery(q);
    } else if (!q && query) {
      setQuery("");
    }
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Debounce search and URL update
    const timeoutId = setTimeout(() => {
      // Update URL
      if (query !== (searchParams.get("q") || "")) {
        const params = new URLSearchParams(searchParams.toString());
        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }
        router.replace(`${pathname}?${params.toString()}`);
      }

      // Perform global search
      // If we are on a list page, we might want to skip the global dropdown and just let the page filter
      const isListPage = pathname?.includes("/sales-invoice") || 
                         pathname?.includes("/quotation") ||
                         pathname?.includes("/delivery-challan") ||
                         pathname?.includes("/purchase-invoice");

      if (query.length >= 2 && !isListPage) {
        performSearch();
      } else {
        setResults(null);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  async function performSearch() {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { "x-user-role": user?.role || "ADMIN" },
      });
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleResultClick(url: string) {
    setShowResults(false);
    setQuery("");
    router.push(url);
  }

  const allResults = results
    ? [
        ...(results.accounts || []),
        ...(results.items || []),
        ...(results.salesInvoices || []),
        ...(results.purchaseInvoices || []),
        ...(results.vouchers || []),
      ]
    : [];

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && allResults.length > 0) {
              e.preventDefault();
              // Navigate to first result
              handleResultClick(allResults[0].url);
            }
          }}
          placeholder="Search accounts, items, invoices..."
          className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute left-3 top-2.5 text-gray-400">🔍</div>
        {loading && (
          <div className="absolute right-3 top-2.5">
            <span className="animate-spin">⏳</span>
          </div>
        )}
      </div>

      {showResults && allResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.accounts && results.accounts.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1">
                Accounts
              </div>
              {results.accounts.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.items && results.items.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1">
                Items
              </div>
              {results.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.salesInvoices && results.salesInvoices.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1">
                Sales Invoices
              </div>
              {results.salesInvoices.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.purchaseInvoices && results.purchaseInvoices.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1">
                Purchase Invoices
              </div>
              {results.purchaseInvoices.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.vouchers && results.vouchers.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-gray-500 uppercase px-2 py-1">
                Vouchers
              </div>
              {results.vouchers.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showResults && query.length >= 2 && !loading && allResults.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-gray-500">
          No results found
        </div>
      )}
    </div>
  );
}
