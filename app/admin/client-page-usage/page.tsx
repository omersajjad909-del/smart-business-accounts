"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser } from "@/lib/auth";

type PageRow = { companyId: string; company: string; companyNo: number; country: string | null; plan: string; page: string; views: number; users: number; lastViewed: string | null };
type CompanyRow = { id: string; companyNo: number; name: string; country: string | null; plan: string; views: number; users: number; pages: number };
type Payload = { rows: PageRow[]; companies: CompanyRow[] };

function title(path: string) {
  if (path === "/dashboard") return "Dashboard home";
  return path.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean)
    .map((part) => part === "[id]" ? "Record detail" : part.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(" / ") || "Dashboard home";
}

function date(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function ClientPageUsagePage() {
  const [days, setDays] = useState(30);
  const [companyId, setCompanyId] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const user = getCurrentUser();
    const headers: Record<string, string> = {};
    if (user?.role) headers["x-user-role"] = user.role;
    if (user?.id) headers["x-user-id"] = user.id;
    if (user?.companyId) headers["x-company-id"] = user.companyId;
    const params = new URLSearchParams({ days: String(days) });
    if (companyId) params.set("companyId", companyId);
    try {
      const response = await fetch(`/api/admin/client-page-usage?${params}`, { headers, credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Could not load usage report");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load usage report");
    } finally { setLoading(false); }
  }, [days, companyId]);

  useEffect(() => { void load(); }, [load]);

  const topPages = useMemo(() => {
    const aggregate = new Map<string, { page: string; views: number; companies: Set<string>; users: number; lastViewed: string | null }>();
    for (const row of data?.rows || []) {
      const item = aggregate.get(row.page) || { page: row.page, views: 0, companies: new Set<string>(), users: 0, lastViewed: null };
      item.views += row.views;
      item.users += row.users;
      item.companies.add(row.companyId);
      if (row.lastViewed && (!item.lastViewed || row.lastViewed > item.lastViewed)) item.lastViewed = row.lastViewed;
      aggregate.set(row.page, item);
    }
    return [...aggregate.values()].sort((a, b) => b.views - a.views);
  }, [data]);

  const selectedCompany = data?.companies.find((company) => company.id === companyId);
  const totalViews = selectedCompany ? selectedCompany.views : data?.companies.reduce((sum, company) => sum + company.views, 0) || 0;
  const uniqueUsers = selectedCompany ? selectedCompany.users : data?.companies.reduce((sum, company) => sum + company.users, 0) || 0;
  const activeCompanies = selectedCompany ? 1 : data?.companies.length || 0;

  return (
    <main className="cpu-page">
      <style>{styles}</style>
      <header className="cpu-header">
        <div><div className="cpu-kicker">PRODUCT ANALYTICS</div><h1>Client Page Usage</h1><p>See which dashboard pages each client’s team is using.</p></div>
        <div className="cpu-filters">
          <label>Period<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label>
          <label>Company<select value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">All companies</option>{data?.companies.map((company) => <option value={company.id} key={company.id}>{company.name} · #{company.companyNo}</option>)}</select></label>
          <button type="button" onClick={() => void load()} aria-label="Refresh report">↻</button>
        </div>
      </header>

      <section className="cpu-stats">
        <Stat label="Page views" value={totalViews.toLocaleString()} note={`Last ${days} days`} tone="blue" />
        <Stat label="Active companies" value={activeCompanies.toLocaleString()} note="Viewed at least one page" tone="green" />
        <Stat label="Client users" value={uniqueUsers.toLocaleString()} note="Across tracked page usage" tone="purple" />
        <Stat label="Pages used" value={(selectedCompany?.pages ?? topPages.length).toLocaleString()} note="Distinct dashboard pages" tone="amber" />
      </section>

      {error ? <div className="cpu-message error">{error}</div> : null}
      {!error && !loading && !data?.rows.length ? <div className="cpu-message"><strong>No page usage recorded yet.</strong><span>Page tracking starts when clients visit after deployment and have analytics consent enabled. Earlier visits are not available.</span></div> : null}

      <section className="cpu-card">
        <div className="cpu-card-head"><div><h2>{companyId ? "Pages used by this company" : "Most-used pages"}</h2><p>{companyId ? selectedCompany?.name || "Selected company" : "Ranked across client companies"}</p></div><span className="cpu-period">{days} DAY WINDOW</span></div>
        <div className="cpu-table-wrap"><table><thead><tr><th>Page</th>{!companyId && <th>Company</th>}<th>Views</th><th>Users</th>{!companyId && <th>Companies</th>}<th>Last viewed</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={companyId ? 4 : 6} className="cpu-empty">Loading usage data…</td></tr> : companyId ? (data?.rows.filter((row) => row.companyId === companyId).sort((a, b) => b.views - a.views) || []).map((row) => <tr key={`${row.companyId}-${row.page}`}><td><span className="cpu-page-name">{title(row.page)}</span><small>{row.page}</small></td><td>{row.views.toLocaleString()}</td><td>{row.users.toLocaleString()}</td><td>{date(row.lastViewed)}</td></tr>) : topPages.map((row) => <tr key={row.page}><td><span className="cpu-page-name">{title(row.page)}</span><small>{row.page}</small></td><td>{row.companies.size === 1 ? data?.companies.find((company) => company.id === [...row.companies][0])?.name : `${row.companies.size} companies`}</td><td>{row.views.toLocaleString()}</td><td>{row.users.toLocaleString()}</td><td>{row.companies.size}</td><td>{date(row.lastViewed)}</td></tr>)}
          {!loading && !error && companyId && data?.rows.filter((row) => row.companyId === companyId).length === 0 && <tr><td colSpan={4} className="cpu-empty">No page views for this company in the selected period.</td></tr>}
          {!loading && !error && !companyId && topPages.length === 0 && data?.rows.length === 0 && <tr><td colSpan={6} className="cpu-empty">No data for this period.</td></tr>}</tbody></table></div>
      </section>
      <p className="cpu-footnote">Page names and view counts only are recorded. This report does not capture form contents, financial data, or keystrokes. Analytics consent is required.</p>
    </main>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone: string }) {
  return <article className={`cpu-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

const styles = `
.cpu-page{color:#edf2ff;padding:8px 0 60px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.cpu-header{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin:4px 0 24px}.cpu-kicker{font-size:10px;letter-spacing:.15em;font-weight:800;color:#5eead4;margin-bottom:8px}.cpu-header h1{font-size:26px;margin:0;font-weight:800;letter-spacing:-.03em}.cpu-header p,.cpu-card-head p{margin:6px 0 0;color:#8794b3;font-size:13px}.cpu-filters{display:flex;align-items:flex-end;gap:10px}.cpu-filters label{font-size:10px;color:#93a0bd;display:flex;flex-direction:column;gap:5px;font-weight:700}.cpu-filters select{height:38px;min-width:140px;background:#101a32;color:#e8edfa;border:1px solid #263653;border-radius:9px;padding:0 11px;font-size:12px}.cpu-filters button{width:38px;height:38px;color:#67e8d2;background:#12313c;border:1px solid #176171;border-radius:9px;font-size:19px;cursor:pointer}.cpu-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.cpu-stat{background:#10182c;border:1px solid #202d46;border-radius:13px;padding:17px 18px;display:flex;flex-direction:column;gap:7px}.cpu-stat span{color:#9aa7c2;font-size:11px;font-weight:700}.cpu-stat strong{font-size:26px;line-height:1.1;color:#75bfff}.cpu-stat small{font-size:10px;color:#65718e}.cpu-stat.green strong{color:#48d9ae}.cpu-stat.purple strong{color:#b3a0ff}.cpu-stat.amber strong{color:#f6c35f}.cpu-card{background:#0f172a;border:1px solid #202d46;border-radius:14px;overflow:hidden}.cpu-card-head{padding:18px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #202d46}.cpu-card-head h2{font-size:15px;margin:0}.cpu-period{font-size:9px;font-weight:800;letter-spacing:.1em;color:#65d9ca;background:#10313a;padding:6px 9px;border-radius:20px}.cpu-table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left}th{font-size:9px;letter-spacing:.1em;color:#7785a4;padding:12px 18px;background:#131d33}td{padding:13px 18px;border-top:1px solid rgba(255,255,255,.055);font-size:12px;color:#c6d0e4;white-space:nowrap}tbody tr:hover{background:rgba(255,255,255,.025)}td small{display:block;color:#65718e;font-size:10px;margin-top:3px}.cpu-page-name{font-weight:700;color:#edf2ff}.cpu-empty{text-align:center;padding:32px;color:#8491ae}.cpu-message{margin:14px 0;padding:16px 18px;border:1px solid #344363;background:#111b32;border-radius:12px;color:#dbe5fa;display:flex;flex-direction:column;gap:5px;font-size:13px}.cpu-message span,.cpu-footnote{color:#8290ad;font-size:11px}.cpu-message.error{border-color:#7f3643;color:#ffb4bd}.cpu-footnote{margin-top:12px}@media(max-width:850px){.cpu-header{align-items:stretch;flex-direction:column}.cpu-filters{flex-wrap:wrap}.cpu-filters label{flex:1}.cpu-filters select{width:100%;min-width:0}.cpu-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}`;
