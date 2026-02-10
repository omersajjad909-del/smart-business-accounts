﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
    const timeoutId = setTimeout(() => {
      if (query !== (searchParams.get("q") || "")) {
        const params = new URLSearchParams(searchParams.toString());
        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }
        router.replace(`${pathname}?${params.toString()}`);
      }

      if (query.length >= 2) {
        performSearch();
      } else {
        setResults(null);
        setShowResults(false);
        setError(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  async function performSearch() {
    setLoading(true);
    setError(null);
    try {
      const user = getCurrentUser();
      const companyId = user?.companyId || "";
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "ADMIN",
          "x-company-id": companyId,
        },
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        setError(data?.error || "Search failed");
        setResults(null);
        setShowResults(true);
        return null;
      }
      setResults(data);
      setShowResults(true);
      return data;
    } catch (e) {
      console.error("Search error:", e);
      setError("Search failed");
      setResults(null);
      setShowResults(true);
      return null;
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
            if (e.key === "Enter") {
              e.preventDefault();
              const invoicePattern = /^(SI|PI)-\d+$/i;
              if (invoicePattern.test(query)) {
                (async () => {
                  const data = await performSearch();
                  const merged = data
                    ? [
                        ...(data.accounts || []),
                        ...(data.items || []),
                        ...(data.salesInvoices || []),
                        ...(data.purchaseInvoices || []),
                        ...(data.vouchers || []),
                      ]
                    : [];
                  if (merged.length > 0) {
                    handleResultClick(merged[0].url);
                  }
                })();
              } else if (allResults.length > 0) {
                handleResultClick(allResults[0].url);
              }
            }
          }}
          placeholder="Search accounts, items, invoices..."
          className="w-full px-4 py-2 pl-10 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] bg-[var(--panel-bg-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <div className="absolute left-3 top-2.5 text-[var(--text-muted)]">🔍</div>
        {loading && (
          <div className="absolute right-3 top-2.5">
            <span className="animate-spin">⏳</span>
          </div>
        )}
      </div>

      {showResults && error && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg p-4 text-center text-[var(--danger)]">
          {error}
        </div>
      )}

      {showResults && allResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.accounts && results.accounts.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase px-2 py-1">Accounts</div>
              {results.accounts.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-[var(--card-bg-2)] cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.items && results.items.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase px-2 py-1">Items</div>
              {results.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-[var(--card-bg-2)] cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.salesInvoices && results.salesInvoices.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase px-2 py-1">Sales Invoices</div>
              {results.salesInvoices.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-[var(--card-bg-2)] cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.purchaseInvoices && results.purchaseInvoices.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase px-2 py-1">Purchase Invoices</div>
              {results.purchaseInvoices.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-[var(--card-bg-2)] cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {results.vouchers && results.vouchers.length > 0 && (
            <div className="p-2 border-t">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase px-2 py-1">Vouchers</div>
              {results.vouchers.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  className="px-3 py-2 hover:bg-[var(--card-bg-2)] cursor-pointer rounded"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{item.subtitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showResults && query.length >= 2 && !loading && allResults.length === 0 && !error && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg p-4 text-center text-[var(--text-muted)]">
          No results found
        </div>
      )}
    </div>
  );
}
