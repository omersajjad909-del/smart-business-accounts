"use client";

import toast from "react-hot-toast";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

export default function EmailSettingsPage() {
  const user = getCurrentUser();
  const canAccess = hasPermission(user, PERMISSIONS.EMAIL_SETTINGS);

  const [enabled, setEnabled] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [fromName, setFromName] = useState("FinovaOS");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/company/comms-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const config = data?.email;
        if (!config) return;
        setEnabled(Boolean(config.enabled));
        setSmtpHost(config.host || "smtp.gmail.com");
        setSmtpPort(String(config.port || 587));
        setSmtpUser(config.user || "");
        setSmtpPass(config.pass || "");
        setSmtpFrom(config.from || "");
        setFromName(config.fromName || "FinovaOS");
        setSmtpSecure(Boolean(config.secure));
      })
      .catch(() => {});
  }, []);

  if (!canAccess) {
    return <div className="p-6 text-red-600">Access Denied</div>;
  }

  async function testEmail() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/email/test", {
        headers: {
          "x-user-role": user?.role || "",
          "x-user-id": user?.id || "",
        },
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Failed to test email configuration" });
    } finally {
      setTesting(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/company/comms-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: {
            enabled,
            host: smtpHost,
            port: Number(smtpPort || 587),
            user: smtpUser,
            pass: smtpPass,
            from: smtpFrom,
            fromName,
            secure: smtpSecure,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save email configuration");
      }

      toast.success("Email configuration saved securely for this company.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save email configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Configuration</h1>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Important:</strong> Company email credentials encrypted company storage me save hongi.
          Global <code>.env</code> sirf fallback ya system-level transport ke liye rakhein.
        </p>
      </div>

      <div className="bg-white border rounded p-6 space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="text-sm font-bold">Enable company-specific SMTP</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">SMTP Host</label>
          <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="border p-2 w-full" placeholder="smtp.gmail.com" />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">SMTP Port</label>
          <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="border p-2 w-full" placeholder="587" />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">SMTP User</label>
          <input type="email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="border p-2 w-full" placeholder="finance@yourcompany.com" />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">SMTP Password / App Password</label>
          <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="border p-2 w-full" placeholder="Your app password" />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">From Email</label>
          <input type="email" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} className="border p-2 w-full" placeholder="noreply@yourcompany.com" />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">From Name</label>
          <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} className="border p-2 w-full" placeholder="Your Company" />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
            <span className="text-sm font-bold">Use secure connection (SSL/TLS)</span>
          </label>
        </div>

        <div className="flex gap-2 pt-4">
          <button onClick={saveConfig} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400">
            {saving ? "Saving..." : "Save Configuration"}
          </button>
          <button onClick={testEmail} disabled={testing} className="bg-green-600 text-white px-6 py-2 rounded disabled:bg-gray-400">
            {testing ? "Testing..." : "Test Email"}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded ${testResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            <p className="font-bold">{testResult.success ? "Success" : "Failed"}</p>
            <p>{testResult.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
