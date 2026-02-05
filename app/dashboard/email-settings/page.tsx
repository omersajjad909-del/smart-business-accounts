"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

export default function EmailSettingsPage() {
  const user = getCurrentUser();
  const canAccess = hasPermission(user, PERMISSIONS.EMAIL_SETTINGS);

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load from localStorage (in production, this should be from API/database)
    const saved = localStorage.getItem("emailConfig");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setSmtpHost(config.host || "smtp.gmail.com");
        setSmtpPort(config.port || "587");
        setSmtpUser(config.user || "");
        setSmtpPass(config.pass || "");
        setSmtpFrom(config.from || "");
        setSmtpSecure(config.secure || false);
      } catch (e) {
        console.error("Failed to load email config:", e);
      }
    } else {
      // Default values
      setSmtpHost("smtp.gmail.com");
      setSmtpPort("587");
      setSmtpSecure(false);
    }
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
    } catch (_error) {
      setTestResult({
        success: false,
        message: "Failed to test email configuration",
      });
    } finally {
      setTesting(false);
    }
  }

  function saveConfig() {
    const config = {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
      secure: smtpSecure,
    };
    localStorage.setItem("emailConfig", JSON.stringify(config));
    alert("Configuration saved! Note: In production, configure these in .env file.");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Email Configuration</h1>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Important:</strong> For production, configure email settings in the <code>.env</code> file:
        </p>
        <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-x-auto">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ustraders.com`}
        </pre>
      </div>

      <div className="bg-white border rounded p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">SMTP Host</label>
          <input
            type="text"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
            className="border p-2 w-full"
            placeholder="smtp.gmail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">SMTP Port</label>
          <input
            type="text"
            value={smtpPort}
            onChange={(e) => setSmtpPort(e.target.value)}
            className="border p-2 w-full"
            placeholder="587"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">SMTP User (Email)</label>
          <input
            type="email"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            className="border p-2 w-full"
            placeholder="your-email@gmail.com"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">SMTP Password (App Password)</label>
          <input
            type="password"
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
            className="border p-2 w-full"
            placeholder="Your app password"
          />
          <p className="text-xs text-gray-500 mt-1">
            For Gmail, use App Password (not your regular password)
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">From Email</label>
          <input
            type="email"
            value={smtpFrom}
            onChange={(e) => setSmtpFrom(e.target.value)}
            className="border p-2 w-full"
            placeholder="noreply@ustraders.com"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
            />
            <span className="text-sm font-bold">Use Secure Connection (SSL/TLS)</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Check for port 465, uncheck for port 587
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <button
            onClick={saveConfig}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            Save Configuration
          </button>
          <button
            onClick={testEmail}
            disabled={testing}
            className="bg-green-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
          >
            {testing ? "Testing..." : "Test Email"}
          </button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded ${
              testResult.success
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <p className="font-bold">{testResult.success ? "✅" : "❌"}</p>
            <p>{testResult.message}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-bold mb-2">Gmail Setup Instructions:</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Enable 2-Step Verification on your Google account</li>
            <li>Go to Google Account &rarr; Security &rarr; App Passwords</li>
            <li>Generate a new App Password for &quot;Mail&quot;</li>
            <li>Use that App Password in SMTP Password field</li>
            <li>Set SMTP Host: smtp.gmail.com</li>
            <li>Set SMTP Port: 587 (or 465 for SSL)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

