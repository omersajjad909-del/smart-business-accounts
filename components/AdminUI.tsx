export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
      {subtitle ? <div className="text-sm text-slate-400">{subtitle}</div> : null}
    </div>
  );
}

export function Section({ title, children, actions }: { title: string; children: any; actions?: any }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 text-slate-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="text-sm font-semibold">{title}</div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, trend }: { label: string; value: any; trend?: number }) {
  const sign = typeof trend === "number" ? (trend >= 0 ? `+${Math.round(trend)}%` : `${Math.round(trend)}%`) : "";
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-100">{value}</div>
      {typeof trend === "number" ? (
        <div className={`mt-1 text-xs font-semibold ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{sign}</div>
      ) : null}
    </div>
  );
}
