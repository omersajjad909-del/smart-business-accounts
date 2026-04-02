/**
 * useBusinessRecords — universal hook for all business-type specific pages.
 * Connects hospital, salon, gym, real-estate, law-firm, IT, etc. to real DB.
 *
 * Usage:
 *   const { records, loading, create, update, remove } = useBusinessRecords("patient");
 */

import { useState, useEffect, useCallback } from "react";

export interface BusinessRecord {
  id: string;
  category: string;
  subCategory?: string | null;
  title: string;
  status: string;
  refId?: string | null;
  data: Record<string, unknown>;
  amount?: number | null;
  date?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UseBusinessRecordsOptions {
  subCategory?: string;
  status?: string;
  refId?: string;
  search?: string;
  autoFetch?: boolean;  // default true
}

export function useBusinessRecords(category: string, options: UseBusinessRecordsOptions = {}) {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = useCallback((extra: Record<string, string> = {}) => {
    const params = new URLSearchParams({ category });
    if (options.subCategory) params.set("subCategory", options.subCategory);
    if (options.status)      params.set("status",      options.status);
    if (options.refId)       params.set("refId",        options.refId);
    if (options.search)      params.set("search",       options.search);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return `/api/business-records?${params}`;
  }, [category, options.subCategory, options.status, options.refId, options.search]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRecords(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    if (options.autoFetch !== false) fetch_();
  }, [fetch_, options.autoFetch]);

  /** Create a new record. Pass all business-specific fields inside `data`. */
  const create = useCallback(async (payload: {
    title: string;
    data: Record<string, unknown>;
    subCategory?: string;
    status?: string;
    refId?: string;
    amount?: number;
    date?: string;
  }): Promise<BusinessRecord> => {
    const res = await fetch("/api/business-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, ...payload }),
    });
    if (!res.ok) throw new Error(await res.text());
    const record: BusinessRecord = await res.json();
    setRecords(prev => [record, ...prev]);
    return record;
  }, [category]);

  /** Update a record by id. */
  const update = useCallback(async (id: string, changes: {
    title?: string;
    status?: string;
    data?: Record<string, unknown>;
    amount?: number | null;
    date?: string | null;
  }): Promise<BusinessRecord> => {
    // If updating data, merge with existing to avoid wiping fields
    const existing = records.find(r => r.id === id);
    const mergedData = changes.data && existing
      ? { ...existing.data, ...changes.data }
      : changes.data;

    const res = await fetch("/api/business-records", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes, ...(mergedData ? { data: mergedData } : {}) }),
    });
    if (!res.ok) throw new Error(await res.text());
    const record: BusinessRecord = await res.json();
    setRecords(prev => prev.map(r => r.id === id ? record : r));
    return record;
  }, [records]);

  /** Delete a record by id. */
  const remove = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/business-records?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  /** Change status of a record (shortcut for update). */
  const setStatus = useCallback((id: string, status: string) => update(id, { status }), [update]);

  return { records, loading, error, refetch: fetch_, create, update, remove, setStatus };
}
