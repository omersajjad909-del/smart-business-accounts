"use client";

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
    if (q && q !== query) setQuery(q);
    else if (!q && query) setQuery("");
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
        if (query) params.set("q", query);
        else params.delete("q");
        router.replace(`${pathname}?${params.toString()}`);
      }
      if (query.length >= 2) performSearch();
      else { setResults(null); setShowResults(false); setError(null); }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  async function performSearch() {
    setLoading(true);
    setError(null);
    try {
      const user = getCurrentUser();
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "ADMIN",
          "x-company-id": user?.companyId || "",
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
    } catch {
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

  const allResults = results ? [
    ...(results.accounts || []),
    ...(results.items || []),
    ...(results.salesInvoices || []),
    ...(results.purchaseInvoices || []),
    ...(results.vouchers || []),
  ] : [];

  const sections = results ? [
    { label: "Accounts", items: results.accounts || [] },
    { label: "Items", items: results.items || [] },
    { label: "Sales Invoices", items: results.salesInvoices || [] },
    { label: "Purchase Invoices", items: results.purchaseInvoices || [] },
    { label: "Vouchers", items: results.vouchers || [] },
  ].filter(s => s.items.length > 0) : [];

  return (
    <div ref={searchRef} style={{ position: "relative", width: "100%", maxWidth: 420 }}>
      {/* Input */}
      <div style={{ position: "relative" }}>
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (allResults.length > 0) handleResultClick(allResults[0].url);
            }
            if (e.key === "Escape") setShowResults(false);
          }}
          placeholder="Search accounts, items, invoices..."
          style={{
            width: "100%", padding: "8px 12px 8px 36px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 9, fontSize: 13,
            color: "rgba(255,255,255,0.8)",
            outline: "none", boxSizing: "border-box",
            transition: "border-color .15s",
          }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        />
        {loading && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <div style={{ width: 14, height: 14, border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .7s linear infinite" }}/>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showResults && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 200,
          background: "#0e1120", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          maxHeight: 400, overflowY: "auto",
        }}>
          {error && (
            <div style={{ padding: "14px 16px", fontSize: 13, color: "#f87171", textAlign: "center" }}>{error}</div>
          )}

          {!error && sections.length === 0 && !loading && query.length >= 2 && (
            <div style={{ padding: "20px 16px", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              No results for &quot;{query}&quot;
            </div>
          )}

          {sections.map((section, si) => (
            <div key={si}>
              {si > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 12px" }}/>}
              <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                {section.label}
              </div>
              {section.items.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleResultClick(item.url)}
                  style={{ padding: "9px 14px", cursor: "pointer", transition: "background .1s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{item.title}</div>
                  {item.subtitle && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{item.subtitle}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
