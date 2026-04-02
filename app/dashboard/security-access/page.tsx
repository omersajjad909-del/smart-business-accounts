"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { QRCodeSVG } from "qrcode.react";

type SecurityPayload = {
  company: {
    name: string;
    plan: string;
    subscriptionStatus: string | null;
    country: string | null;
    baseCurrency: string;
  };
  overview: {
    activeSessions: number;
    activeApiKeys: number;
    ssoEnabled: boolean;
    twoFactorEnforced: boolean;
  };
  sessions: Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
    ip: string;
    userAgent: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
  apiKeys: Array<{
    id: string;
    name: string;
    keyPreview: string;
    status: string;
    createdAt: string;
    lastUsedAt: string | null;
  }>;
  sso: {
    configured: boolean;
    enabled: boolean;
    providerName: string;
    providerType: string;
    domainHint: string;
    updatedAt: string | null;
  };
  authEvents: Array<{
    id: string;
    action: string;
    createdAt: string;
    details: string | null;
    user?: {
      name?: string;
      email?: string;
    } | null;
  }>;
};

function statusPill(active: boolean) {
  return active
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
    : "border-slate-500/20 bg-slate-500/10 text-slate-700";
}

export default function SecurityAccessPage() {
  const [data, setData] = useState<SecurityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2FA state
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState<{ secret: string; otpAuthUrl: string } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMsg, setTwoFAMsg] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableForm, setShowDisableForm] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = getCurrentUser();
        const res = await fetch("/api/security/access", {
          headers: {
            "x-user-id": user?.id || "",
            "x-user-role": user?.role || "",
            "x-company-id": user?.companyId || "",
          },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load security center");
        setData(json);
      } catch (err: any) {
        setError(err?.message || "Failed to load security center");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function start2FASetup() {
    setTwoFALoading(true);
    setTwoFAMsg("");
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setTwoFASetup(d);
    } catch (e: any) {
      setTwoFAMsg(e.message);
    } finally {
      setTwoFALoading(false);
    }
  }

  async function verify2FA() {
    if (!otpCode) return;
    setTwoFALoading(true);
    setTwoFAMsg("");
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setTwoFAEnabled(true);
      setTwoFASetup(null);
      setOtpCode("");
      setTwoFAMsg("2FA enabled successfully!");
    } catch (e: any) {
      setTwoFAMsg(e.message);
    } finally {
      setTwoFALoading(false);
    }
  }

  async function disable2FA() {
    if (!disablePassword) return;
    setTwoFALoading(true);
    setTwoFAMsg("");
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setTwoFAEnabled(false);
      setShowDisableForm(false);
      setDisablePassword("");
      setTwoFAMsg("2FA disabled.");
    } catch (e: any) {
      setTwoFAMsg(e.message);
    } finally {
      setTwoFALoading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-[var(--text-muted)]">Loading security center...</div>;
  }
  if (error || !data) {
    return <div className="p-6 text-sm text-red-600">{error || "Failed to load security center"}</div>;
  }

  return (
    <div className="space-y-6 p-2">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Security & Access</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{data.company.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
              Review active sessions, API credentials, SSO status, and recent authentication events from one place.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg-2)] px-4 py-3 text-sm text-[var(--text-muted)]">
            {data.company.plan} · {data.company.subscriptionStatus || "Unknown"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Active sessions</div>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{data.overview.activeSessions}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Active API keys</div>
          <div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{data.overview.activeApiKeys}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">SSO</div>
          <div className="mt-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(data.overview.ssoEnabled)}`}>
              {data.overview.ssoEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-5">
          <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">2FA enforcement</div>
          <div className="mt-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(data.overview.twoFactorEnforced)}`}>
              {data.overview.twoFactorEnforced ? "Enforced" : "Not configured"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active sessions</h2>
              <a href="/dashboard/users/logs" className="text-sm font-semibold text-[var(--accent)]">
                View logs
              </a>
            </div>
            <div className="space-y-3">
              {data.sessions.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">No active sessions found.</div>
              ) : (
                data.sessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {session.user?.name || "Unknown user"} · {session.user?.role || "User"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">{session.user?.email || "No email"}</div>
                      </div>
                      <div className="text-right text-xs text-[var(--text-muted)]">
                        <div>Started: {new Date(session.createdAt).toLocaleString()}</div>
                        <div>Expires: {new Date(session.expiresAt).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-[var(--text-muted)]">
                      <div>IP: {session.ip || "Unavailable"}</div>
                      <div className="truncate">Device: {session.userAgent || "Unavailable"}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent authentication events</h2>
            <div className="mt-4 space-y-3">
              {data.authEvents.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">No recent auth events found.</div>
              ) : (
                data.authEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="font-medium text-[var(--text-primary)]">{event.action}</div>
                      <div className="text-xs text-[var(--text-muted)]">{new Date(event.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      {event.user?.email || event.user?.name || "System event"}
                    </div>
                    {event.details && <div className="mt-2 text-xs text-[var(--text-muted)]">{event.details}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">SSO status</h2>
              <a href="/dashboard/integrations/sso" className="text-sm font-semibold text-[var(--accent)]">
                Manage
              </a>
            </div>
            <div className="space-y-2 text-sm text-[var(--text-muted)]">
              <p>Configured: {data.sso.configured ? "Yes" : "No"}</p>
              <p>Enabled: {data.sso.enabled ? "Yes" : "No"}</p>
              <p>Provider: {data.sso.providerName || "Not set"}</p>
              <p>Type: {data.sso.providerType || "Not set"}</p>
              <p>Domain: {data.sso.domainHint || "Not set"}</p>
              <p>Last update: {data.sso.updatedAt ? new Date(data.sso.updatedAt).toLocaleString() : "Never"}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">API credentials</h2>
              <a href="/dashboard/integrations/api-access" className="text-sm font-semibold text-[var(--accent)]">
                Manage
              </a>
            </div>
            <div className="space-y-3">
              {data.apiKeys.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">No API keys created.</div>
              ) : (
                data.apiKeys.map((key) => (
                  <div key={key.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel-bg-2)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--text-primary)]">{key.name}</div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(key.status === "active")}`}>
                        {key.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">{key.keyPreview}</div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Two-Factor Authentication Panel */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Two-Factor Authentication</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPill(twoFAEnabled)}`}>
                {twoFAEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {twoFAMsg && (
              <div className={`mb-3 rounded-lg px-3 py-2 text-xs ${twoFAMsg.includes("success") || twoFAMsg.includes("enabled") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {twoFAMsg}
              </div>
            )}

            {!twoFAEnabled && !twoFASetup && (
              <div className="text-sm text-(--text-muted) space-y-3">
                <p>Protect your account with an authenticator app (Google Authenticator, Authy, etc.).</p>
                <button
                  onClick={start2FASetup}
                  disabled={twoFALoading}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {twoFALoading ? "Loading..." : "Set Up 2FA"}
                </button>
              </div>
            )}

            {twoFASetup && !twoFAEnabled && (
              <div className="space-y-4">
                <p className="text-sm text-(--text-muted)">
                  Scan this QR code with your authenticator app:
                </p>
                <div className="flex justify-center bg-white p-4 rounded-xl border">
                  <QRCodeSVG value={twoFASetup.otpAuthUrl} size={160} />
                </div>
                <p className="text-xs text-(--text-muted)">
                  Or enter this secret manually: <code className="bg-gray-100 px-1 rounded text-xs break-all">{twoFASetup.secret}</code>
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={verify2FA}
                    disabled={twoFALoading || otpCode.length !== 6}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {twoFALoading ? "..." : "Verify"}
                  </button>
                </div>
                <button onClick={() => setTwoFASetup(null)} className="text-xs text-gray-400 hover:underline">
                  Cancel
                </button>
              </div>
            )}

            {twoFAEnabled && (
              <div className="text-sm text-(--text-muted) space-y-3">
                <p>Your account is protected with an authenticator app.</p>
                {!showDisableForm ? (
                  <button
                    onClick={() => setShowDisableForm(true)}
                    className="text-red-500 hover:text-red-700 text-sm hover:underline"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Enter your password to disable 2FA:</p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={disablePassword}
                        onChange={(e) => setDisablePassword(e.target.value)}
                        placeholder="Your password"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={disable2FA}
                        disabled={twoFALoading || !disablePassword}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {twoFALoading ? "..." : "Disable"}
                      </button>
                    </div>
                    <button onClick={() => setShowDisableForm(false)} className="text-xs text-gray-400 hover:underline">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-bg)] p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recommended next steps</h2>
            <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
              <li>1. Enable SSO once your provider test completes.</li>
              <li>2. Rotate API keys for old or partner-specific integrations.</li>
              <li>3. Review recent login activity for unusual access patterns.</li>
              <li>4. Enable 2FA above to secure your account with an authenticator app.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
