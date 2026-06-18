"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import toast from "react-hot-toast";

type SettingRow = {
  id: string;
  label: string;
  description: string;
  value: boolean;
};

const DEFAULT_SETTINGS: SettingRow[] = [
  { id: "analytics",        label: "Web Analytics",           description: "Track page views, sessions, and user behaviour on your public site.",  value: true  },
  { id: "cookie-banner",    label: "Cookie Consent Banner",   description: "Show GDPR-compliant cookie consent banner to first-time visitors.",    value: true  },
  { id: "seo-meta",         label: "Auto SEO Meta Tags",      description: "Automatically generate canonical, og:image, and twitter card tags.",  value: true  },
  { id: "sitemap",          label: "XML Sitemap",             description: "Generate and serve /sitemap.xml automatically for search engines.",    value: true  },
  { id: "robots",           label: "Robots.txt Control",      description: "Control which pages search engines are allowed to index.",             value: true  },
  { id: "maintenance",      label: "Maintenance Mode",        description: "Put the public website into maintenance mode for all visitors.",       value: false },
  { id: "live-chat",        label: "Live Chat Widget",        description: "Enable the live chat bubble on public-facing pages.",                  value: false },
  { id: "heatmaps",         label: "Heatmaps & Recordings",  description: "Record anonymous user sessions and generate heatmaps for UX insights.", value: false },
];

function adminHdrs(json = false): Record<string, string> {
  const u = getCurrentUser();
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  if (u?.role) h["x-user-role"] = u.role;
  if (u?.id) h["x-user-id"] = u.id;
  return h;
}

export default function WebSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [domain, setDomain] = useState("https://www.finovaos.app");
  const [gtm, setGtm] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/settings", { headers: adminHdrs(), cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          if (d.settings?.appName) setDomain(d.settings.appName);
          if (d.settings?.maintenanceMode !== undefined) {
            setSettings(prev => prev.map(s => s.id === "maintenance" ? { ...s, value: !!d.settings.maintenanceMode } : s));
          }
        }
      } catch {}
      finally { setLoadingSettings(false); }
    })();
  }, []);

  function toggle(id: string) {
    setSettings((prev) => prev.map((s) => s.id === id ? { ...s, value: !s.value } : s));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const maintenanceSetting = settings.find(s => s.id === "maintenance");
      await Promise.all([
        fetch("/api/admin/settings", { method: "POST", headers: adminHdrs(true), body: JSON.stringify({ key: "appName", value: domain }) }),
        fetch("/api/admin/settings", { method: "POST", headers: adminHdrs(true), body: JSON.stringify({ key: "maintenanceMode", value: maintenanceSetting?.value ?? false }) }),
        gtm ? fetch("/api/admin/settings", { method: "POST", headers: adminHdrs(true), body: JSON.stringify({ key: "gtmId", value: gtm }) }) : Promise.resolve(),
      ]);
      toast.success("Settings saved");
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ fontFamily: "'Outfit','DM Sans',sans-serif", color: "var(--text)", paddingBottom: 40 }}>
      <style>{pageStyles}</style>

      <div className="ws-header">
        <div>
          <h1 className="ws-title">Web Settings</h1>
          <p className="ws-subtitle">Configure your public website, domain, analytics integrations, and visibility controls.</p>
        </div>
        <button type="button" className="ws-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* Domain & integrations */}
      <div className="ws-card">
        <h2 className="ws-section-title">Domain &amp; Integrations</h2>
        <div className="ws-field-group">
          <div className="ws-field">
            <label className="ws-label">Primary Domain</label>
            <input
              className="ws-input"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="https://yourdomain.com"
            />
            <span className="ws-hint">The public-facing domain for your FinovaOS workspace.</span>
          </div>
          <div className="ws-field">
            <label className="ws-label">Google Tag Manager ID</label>
            <input
              className="ws-input"
              value={gtm}
              onChange={(e) => setGtm(e.target.value)}
              placeholder="GTM-XXXXXXX"
            />
            <span className="ws-hint">Enter your GTM container ID to load all tracking scripts via GTM.</span>
          </div>
        </div>
      </div>

      {/* Toggle settings */}
      <div className="ws-card">
        <h2 className="ws-section-title">Feature Toggles</h2>
        <div className="ws-toggle-list">
          {settings.map((item, i) => (
            <div key={item.id} className={`ws-toggle-row${i === settings.length - 1 ? " ws-toggle-row--last" : ""}`}>
              <div className="ws-toggle-meta">
                <div className="ws-toggle-label">{item.label}</div>
                <div className="ws-toggle-desc">{item.description}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={item.value}
                className={`ws-switch${item.value ? " ws-switch--on" : ""}`}
                onClick={() => toggle(item.id)}
              >
                <span className="ws-switch-thumb" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Status summary */}
      <div className="ws-card ws-summary-card">
        <h2 className="ws-section-title">Active Features</h2>
        <div className="ws-summary-grid">
          {settings.filter((s) => s.value).map((s) => (
            <div key={s.id} className="ws-summary-chip">
              <span className="ws-chip-dot" />
              {s.label}
            </div>
          ))}
          {settings.filter((s) => s.value).length === 0 && (
            <p className="ws-empty">No features currently enabled.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyles = `
.ws-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px;}
.ws-title{margin:0 0 6px;font-size:24px;font-weight:800;color:var(--text);}
.ws-subtitle{margin:0;font-size:13px;color:var(--text-muted);}
.ws-save-btn{
  padding:11px 20px;border-radius:14px;border:none;cursor:pointer;
  background:linear-gradient(135deg,#6d28d9,#8b5cf6);
  color:#fff;font-size:13px;font-weight:700;
  box-shadow:0 8px 24px rgba(109,40,217,.3);
  transition:opacity .14s;white-space:nowrap;
}
.ws-save-btn:disabled{opacity:.6;cursor:not-allowed;}
.ws-save-btn:hover:not(:disabled){opacity:.88;}
.ws-card{
  background:var(--panel);border:1px solid var(--border);
  border-radius:20px;padding:20px 22px;margin-bottom:16px;
}
.ws-section-title{margin:0 0 18px;font-size:16px;font-weight:700;color:var(--text);}
.ws-field-group{display:grid;gap:16px;}
.ws-field{display:grid;gap:6px;}
.ws-label{font-size:12px;font-weight:700;color:var(--text-soft);letter-spacing:.04em;}
.ws-input{
  padding:11px 14px;border-radius:12px;
  border:1px solid var(--border);background:var(--bg-soft,rgba(255,255,255,.03));
  color:var(--text);font:inherit;font-size:13px;outline:none;
  transition:border-color .14s;
}
.ws-input:focus{border-color:#8b5cf6;}
.ws-hint{font-size:11px;color:var(--text-muted);}
.ws-toggle-list{display:grid;}
.ws-toggle-row{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:16px 0;border-bottom:1px solid var(--border);
}
.ws-toggle-row--last{border-bottom:none;}
.ws-toggle-meta{flex:1;min-width:0;}
.ws-toggle-label{font-size:14px;font-weight:600;color:var(--text);margin-bottom:3px;}
.ws-toggle-desc{font-size:12px;color:var(--text-muted);line-height:1.45;}
.ws-switch{
  position:relative;width:46px;height:26px;border-radius:999px;
  border:none;background:rgba(148,163,184,.2);
  cursor:pointer;flex-shrink:0;transition:background .18s;
}
.ws-switch--on{background:linear-gradient(135deg,#6d28d9,#8b5cf6);}
.ws-switch-thumb{
  position:absolute;top:3px;left:3px;width:20px;height:20px;
  border-radius:50%;background:#fff;transition:transform .18s;
  box-shadow:0 2px 6px rgba(0,0,0,.22);display:block;
}
.ws-switch--on .ws-switch-thumb{transform:translateX(20px);}
.ws-summary-card{}
.ws-summary-grid{display:flex;flex-wrap:wrap;gap:10px;}
.ws-summary-chip{
  display:inline-flex;align-items:center;gap:7px;
  padding:7px 12px;border-radius:999px;
  background:rgba(139,92,246,.14);border:1px solid rgba(139,92,246,.24);
  color:#c4b5fd;font-size:12px;font-weight:600;
}
.ws-chip-dot{width:7px;height:7px;border-radius:50%;background:#8b5cf6;flex-shrink:0;}
.ws-empty{font-size:13px;color:var(--text-muted);margin:0;}
@media(max-width:640px){
  .ws-header{flex-direction:column;align-items:flex-start;}
  .ws-save-btn{width:100%;}
}
`;
