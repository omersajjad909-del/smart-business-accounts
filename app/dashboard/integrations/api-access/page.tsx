"use client";
import { confirmToast, alertToast } from "@/lib/toast-feedback";

import { useEffect, useMemo, useState } from "react";

type ApiKeyRecord = {
  id: string;
  name: string;
  keyPreview: string;
  last4: string;
  status: "active" | "revoked";
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

type CreatedKey = {
  id: string;
  name: string;
  rawKey: string;
  keyPreview: string;
  createdAt: string;
} | null;

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

export default function ApiAccessPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [name, setName] = useState("Production Key");
  const [createdKey, setCreatedKey] = useState<CreatedKey>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/api-keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load API keys");
      setKeys(Array.isArray(data?.keys) ? data.keys : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load API keys");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  async function createKey() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CREATE", name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create API key");
      setCreatedKey(data.key || null);
      setName("Production Key");
      await loadKeys();
    } catch (err: any) {
      setError(err?.message || "Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(keyId: string) {
    if (!await confirmToast("Revoke this API key? Existing integrations using it will stop working.")) return;
    setRevokingId(keyId);
    setError(null);
    try {
      const res = await fetch("/api/integrations/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVOKE", keyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to revoke API key");
      await loadKeys();
    } catch (err: any) {
      setError(err?.message || "Failed to revoke API key");
    } finally {
      setRevokingId(null);
    }
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Clipboard copy failed");
    }
  }

  const sampleCurl = useMemo(() => {
    const key = createdKey?.rawKey || "finova_live_your_api_key_here";
    return `curl -X GET "${typeof window !== "undefined" ? window.location.origin : "https://finovaos.app"}/api/external/company" \\\n  -H "x-api-key: ${key}"`;
  }, [createdKey]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">API Access</div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Manage company API keys</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Generate company-scoped API keys for external integrations. Each key can call the FinovaOS API using
              `x-api-key` or a bearer token.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            Active keys: {keys.filter((key) => key.status === "active").length}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Create new key</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Use separate keys for production, staging, or partner-specific integrations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production Key"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
            <button
              onClick={createKey}
              disabled={creating || !name.trim()}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create key"}
            </button>
          </div>

          {createdKey && (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-sm font-semibold text-amber-700">Copy this key now</div>
              <p className="mt-1 text-xs text-amber-700/80">
                For security, the full key is only shown once after creation.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto rounded-xl bg-black/70 px-4 py-3 text-xs text-emerald-300">
                  {createdKey.rawKey}
                </code>
                <button
                  onClick={() => copy(createdKey.rawKey, createdKey.id)}
                  className="rounded-xl border border-amber-500/30 bg-white px-4 py-3 text-sm font-semibold text-amber-700"
                >
                  {copied === createdKey.id ? "Copied" : "Copy key"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quick start</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            The first available API endpoint returns your company profile for integration testing.
          </p>
          <div className="mt-4 rounded-xl bg-[var(--panel-bg-2)] p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Example
            </div>
            <pre className="overflow-x-auto text-xs text-[var(--text-primary)]">{sampleCurl}</pre>
          </div>
          <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
            <p>Endpoint: <code>/api/external/company</code></p>
            <p>Headers: <code>x-api-key: YOUR_KEY</code> or <code>Authorization: Bearer YOUR_KEY</code></p>
            <p>Returns: company name, code, country, base currency, plan, and subscription status.</p>
          </div>
          <a
            href="/developers/api"
            className="mt-4 inline-flex rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-700"
          >
            Open full API docs
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your API keys</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Revoke any key that should no longer access your data.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">No API keys created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Key</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Last used</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-4 font-medium text-[var(--text-primary)]">{key.name}</td>
                    <td className="px-3 py-4">
                      <code className="rounded-lg bg-[var(--panel-bg-2)] px-3 py-2 text-xs text-[var(--text-primary)]">
                        {key.keyPreview}
                      </code>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          key.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-red-500/10 text-red-700"
                        }`}
                      >
                        {key.status}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-[var(--text-muted)]">{formatDate(key.createdAt)}</td>
                    <td className="px-3 py-4 text-[var(--text-muted)]">{formatDate(key.lastUsedAt)}</td>
                    <td className="px-3 py-4 text-right">
                      {key.status === "active" ? (
                        <button
                          onClick={() => revokeKey(key.id)}
                          disabled={revokingId === key.id}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {revokingId === key.id ? "Revoking..." : "Revoke"}
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">{formatDate(key.revokedAt)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
