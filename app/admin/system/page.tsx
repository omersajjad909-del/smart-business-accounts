"use client";

import { useEffect, useState } from "react";

export default function AdminSystemPage() {
  const [h, setH] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/system/health", { cache: "no-store" });
        if (r.ok) setH(await r.json());
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold">System Health</h1>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card title="API Errors (24h)" value={h ? h.apiErrors24h : "-"} />
          <Card title="Failed Logins (24h)" value={h ? h.failedLogins24h : "-"} />
          <Card title="Backup Status" value={h ? (h.backupStatus || "-") : "-"} />
          <Card title="Last Backup" value={h ? (h.lastBackupAt ? new Date(h.lastBackupAt).toLocaleString() : "-") : "-"} />
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card title="Queue Failures (24h)" value={h ? h.queueFailures24h : "-"} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white border border-indigo-100 rounded-2xl shadow p-6 min-w-0">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-2 text-3xl sm:text-4xl font-extrabold break-words">{value}</div>
    </div>
  );
}

