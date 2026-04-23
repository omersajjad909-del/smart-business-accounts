"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type Column<T> = {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
};

type AdminMasterDataPageProps<T> = {
  title: string;
  subtitle: string;
  endpoint: string;
  metricLabel: string;
  emptyTitle: string;
  emptyHint: string;
  columns: Column<T>[];
};

function getHeaders() {
  const user = getCurrentUser();
  return {
    "Content-Type": "application/json",
    "x-user-id": user?.id || "",
    "x-user-role": user?.role || "",
    "x-company-id": user?.companyId || "",
  };
}

export default function AdminMasterDataPage<T>({
  title,
  subtitle,
  endpoint,
  metricLabel,
  emptyTitle,
  emptyHint,
  columns,
}: AdminMasterDataPageProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(endpoint, {
          credentials: "include",
          headers: getHeaders(),
          cache: "no-store",
        });
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load this section.");
        }

        if (!active) return;
        setItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load this section.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [endpoint]);

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "white", paddingBottom: 40 }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 800 }}>{title}</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.46)" }}>{subtitle}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "20px 22px" }}>
          <div style={{ fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.38)", fontWeight: 700 }}>
            {metricLabel}
          </div>
          <div style={{ marginTop: 8, fontSize: 34, fontWeight: 800, color: "#a78bfa" }}>
            {loading ? "..." : items.length}
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,.34)",
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: 42, textAlign: "center", color: "rgba(255,255,255,.38)" }}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: 42, textAlign: "center", color: "#fda4af" }}>
                    {error}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: 42, textAlign: "center" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.7)" }}>{emptyTitle}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,.4)" }}>{emptyHint}</div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: index === items.length - 1 ? "none" : "1px solid rgba(255,255,255,.05)" }}>
                    {columns.map((column) => (
                      <td key={column.key} style={{ padding: "15px 16px", fontSize: 13, color: "rgba(255,255,255,.82)" }}>
                        {column.render(item)}
                      </td>
                    ))}
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
