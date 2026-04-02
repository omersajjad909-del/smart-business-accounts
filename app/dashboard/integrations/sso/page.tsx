"use client";

import { useEffect, useState } from "react";

type SsoConfig = {
  enabled: boolean;
  providerType: "SAML" | "OIDC";
  providerName: string;
  domainHint: string;
  issuer: string;
  entryPoint: string;
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  callbackUrl: string;
  logoutUrl: string;
  certificate: string;
  updatedAt?: string;
};

const EMPTY_CONFIG: SsoConfig = {
  enabled: false,
  providerType: "SAML",
  providerName: "",
  domainHint: "",
  issuer: "",
  entryPoint: "",
  clientId: "",
  clientSecret: "",
  tokenEndpoint: "",
  userInfoEndpoint: "",
  callbackUrl: "",
  logoutUrl: "",
  certificate: "",
};

export default function SsoSettingsPage() {
  const [config, setConfig] = useState<SsoConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadConfig() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/sso");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load SSO settings");
      setConfig({ ...EMPTY_CONFIG, ...(data?.config || {}) });
    } catch (err: any) {
      setError(err?.message || "Failed to load SSO settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  function update<K extends keyof SsoConfig>(key: K, value: SsoConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/integrations/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save SSO settings");
      setConfig({ ...EMPTY_CONFIG, ...(data?.config || {}) });
      setMessage("SSO configuration saved.");
    } catch (err: any) {
      setError(err?.message || "Failed to save SSO settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Single Sign-On</div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">SSO configuration</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Configure your identity provider details for SAML or OIDC sign-in. This first version stores your company
          configuration and activation state so your IT team can manage SSO readiness from the dashboard.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
          {loading ? (
            <div className="py-10 text-sm text-[var(--text-muted)]">Loading SSO settings...</div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Enable enterprise sign-in</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Turn this on once your IdP details are ready for rollout.
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm font-medium text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => update("enabled", e.target.checked)}
                  />
                  {config.enabled ? "Enabled" : "Disabled"}
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Provider type</label>
                  <select
                    value={config.providerType}
                    onChange={(e) => update("providerType", e.target.value === "OIDC" ? "OIDC" : "SAML")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  >
                    <option value="SAML">SAML</option>
                    <option value="OIDC">OIDC</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Provider name</label>
                  <input
                    value={config.providerName}
                    onChange={(e) => update("providerName", e.target.value)}
                    placeholder="Microsoft Entra ID"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Domain hint</label>
                  <input
                    value={config.domainHint}
                    onChange={(e) => update("domainHint", e.target.value)}
                    placeholder="company.com"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Client ID / Entity ID</label>
                  <input
                    value={config.clientId}
                    onChange={(e) => update("clientId", e.target.value)}
                    placeholder="finova-enterprise-client"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Issuer</label>
                  <input
                    value={config.issuer}
                    onChange={(e) => update("issuer", e.target.value)}
                    placeholder="https://login.microsoftonline.com/tenant-id/"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Entry point / Login URL</label>
                  <input
                    value={config.entryPoint}
                    onChange={(e) => update("entryPoint", e.target.value)}
                    placeholder="https://idp.example.com/sso/login"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Token endpoint</label>
                  <input
                    value={config.tokenEndpoint}
                    onChange={(e) => update("tokenEndpoint", e.target.value)}
                    placeholder="https://idp.example.com/oauth2/token"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">User info endpoint</label>
                  <input
                    value={config.userInfoEndpoint}
                    onChange={(e) => update("userInfoEndpoint", e.target.value)}
                    placeholder="https://idp.example.com/oauth2/userinfo"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Callback URL</label>
                  <input
                    value={config.callbackUrl}
                    onChange={(e) => update("callbackUrl", e.target.value)}
                    placeholder="https://finovaos.app/sso?company=YOUR_COMPANY_ID"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Logout URL</label>
                  <input
                    value={config.logoutUrl}
                    onChange={(e) => update("logoutUrl", e.target.value)}
                    placeholder="https://idp.example.com/logout"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Client secret</label>
                  <input
                    type="password"
                    value={config.clientSecret}
                    onChange={(e) => update("clientSecret", e.target.value)}
                    placeholder="Optional for public clients"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Signing certificate / public key</label>
                  <textarea
                    value={config.certificate}
                    onChange={(e) => update("certificate", e.target.value)}
                    rows={8}
                    placeholder="-----BEGIN CERTIFICATE-----"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {(message || error) && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    error
                      ? "border border-red-500/20 bg-red-500/10 text-red-700"
                      : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                  }`}
                >
                  {error || message}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save SSO settings"}
                </button>
                {config.updatedAt && (
                  <div className="text-xs text-[var(--text-muted)]">
                    Last updated: {new Date(config.updatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Rollout checklist</h2>
            <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
              <li>1. Choose your identity provider and protocol.</li>
              <li>2. Ask IT for issuer, login URL, callback URL, and signing certificate.</li>
              <li>3. Save the config here and verify the allowed company domain.</li>
              <li>4. Enable SSO once testing is complete for your organization.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Current scope</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              OIDC sign-in flow is now wired using this saved configuration. Generic SAML handshake can be added next
              on top of the same admin setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
