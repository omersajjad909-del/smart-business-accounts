"use client";
import { useEffect, useState } from "react";
import SimpleChart from "@/components/SimpleChart";
import { getCurrentUser } from "@/lib/auth";

export default function AdminRevenuePage() {
  const [data, setData] = useState<{ mrrSeries: { label: string; value: number }[]; planDistribution: { starter: number; pro: number; enterprise: number } } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const u = getCurrentUser();
        const headers: Record<string, string> = {};
        if (u?.role) headers["x-user-role"] = u.role;
        if (u?.id) headers["x-user-id"] = u.id;
        if (u?.companyId) headers["x-company-id"] = u.companyId;
        const r = await fetch("/api/admin/web/revenue", { cache: "no-store", headers, credentials: "include" as any });
        if (r.ok) setData(await r.json());
        else setData({ mrrSeries: [], planDistribution: { starter: 0, pro: 0, enterprise: 0 } });
      } catch { setData({ mrrSeries: [], planDistribution: { starter: 0, pro: 0, enterprise: 0 } }); }
    })();
  }, []);

  const planBars = data
    ? [
        { label: "Starter", value: data.planDistribution.starter, color: "#64748b" },
        { label: "Pro", value: data.planDistribution.pro, color: "#6366f1" },
        { label: "Enterprise", value: data.planDistribution.enterprise, color: "#0ea5e9" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-extrabold">Revenue Analytics</h1>
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="bg-white border border-indigo-100 rounded-2xl shadow">
            <SimpleChart title="MRR Growth (last 6 months)" data={data?.mrrSeries || []} type="line" height={220} />
          </div>
          <div className="bg-white border border-indigo-100 rounded-2xl shadow">
            <SimpleChart title="Plan Distribution (Active)" data={planBars} type="bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
