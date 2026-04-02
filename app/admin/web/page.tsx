"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Section, StatCard } from "@/components/AdminUI";
import { getCurrentUser } from "@/lib/auth";

export default function WebAdminDashboard() {
  const [m, setM] = useState<{ logins24h:number; users30d:number; companies7d:number } | null>(null);
  const [f, setF] = useState<{ mrr:number; arr:number; active:{starter:number;pro:number;enterprise:number} } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;
        const r = await fetch("/api/admin/web/metrics", { cache: "no-store", headers, credentials: "include" as any });
        if (r.ok) setM(await r.json());
      } catch {}
      try {
        const u = getCurrentUser();
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;
        const x = await fetch("/api/admin/web/finance", { cache: "no-store", headers, credentials: "include" as any });
        if (x.ok) setF(await x.json());
      } catch {}
    })();
  }, []);
  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader title="Website Dashboard" />
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard label="Logins (24h)" value={m ? m.logins24h : "—"} />
          <StatCard label="Active Users (30d)" value={m ? m.users30d : "—"} />
          <StatCard label="Companies Created (7d)" value={m ? m.companies7d : "—"} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <StatCard label="MRR (est.)" value={f ? `$${f.mrr.toFixed(0)}` : "—"} />
          <StatCard label="ARR (est.)" value={f ? `$${f.arr.toFixed(0)}` : "—"} />
          <StatCard label="Active Paid Companies" value={f ? f.active.pro + f.active.enterprise : "—"} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Section title="Website Users">
            <Link href="/admin/web/users" className="text-indigo-600 underline text-sm">Open latest logins</Link>
          </Section>
          <Section title="Plans & Features">
            <Link href="/admin/plans" className="text-indigo-600 underline text-sm">Configure Starter / Pro / Enterprise</Link>
          </Section>
          <Section title="📣 Social Media Marketing">
            <Link href="/admin/social" className="text-indigo-600 underline text-sm">Manage social accounts & posts</Link>
            <p className="text-xs text-gray-400 mt-1">Connect Facebook, Instagram, Twitter, LinkedIn and post to all platforms at once.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}
