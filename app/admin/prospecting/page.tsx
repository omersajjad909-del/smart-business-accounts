"use client";

/**
 * AI Prospecting — the console for FinovaOS's own outbound client acquisition.
 *
 * Deliberately built around the review queue rather than the campaign list:
 * the campaign is a background process, but the approve/reject decision is the
 * part a human actually does, so it gets the screen.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

type Readiness = {
  discoveryProvider: string;
  availableProviders: string[];
  usingSampleData: boolean;
  emailVerification: boolean;
  contactFinder: boolean;
  aiConfigured: boolean;
  sendingEnabled: boolean;
  globalDailyCap: number;
  postalAddressSet: boolean;
  postalAddress: string;
};

type Campaign = {
  id: string;
  name: string;
  command: string;
  status: string;
  targetCount: number;
  dailyCap: number;
  summary: string;
  lastError: string | null;
  progress: Record<string, number> | null;
  prospectCounts: Record<string, number>;
  emailCounts: Record<string, number>;
  createdAt: string;
};

type Prospect = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  employeeCount: number | null;
  warehouseCount: number | null;
  locationCount: number | null;
  currentSoftware: string | null;
  score: number | null;
  tier: string | null;
  scoreBreakdown: Record<string, number> | null;
  scoreReason: string | null;
  source: string;
};

type OutreachEmail = {
  id: string;
  subject: string;
  bodyText: string;
  toEmail: string;
  toName: string | null;
  status: string;
  language: string;
  editedByHuman: boolean;
  rejectReason: string | null;
  sendBlocked: string | null;
  prospect: Prospect;
};

const STAGE_ORDER = ["draft", "discovering", "enriching", "scoring", "drafting", "review", "sending", "done"];

const api = (path: string, init?: RequestInit) =>
  fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include" as RequestCredentials,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

export default function AdminProspectingPage() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emails, setEmails] = useState<OutreachEmail[] | null>(null);
  const [queueStatus, setQueueStatus] = useState("pending_review");
  const [tierFilter, setTierFilter] = useState("all");

  const [command, setCommand] = useState("");
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [editing, setEditing] = useState<Record<string, { subject: string; bodyText: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const selected = useMemo(
    () => campaigns?.find((c) => c.id === selectedId) || null,
    [campaigns, selectedId],
  );

  const loadCampaigns = useCallback(async () => {
    try {
      const r = await api("/api/admin/prospecting/campaigns");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not load campaigns");
      setReadiness(data.readiness);
      setCampaigns(data.campaigns || []);
      setSelectedId((current) => current || data.campaigns?.[0]?.id || null);
    } catch (e: any) {
      setCampaigns([]);
      setNotice({ kind: "err", text: e.message });
    }
  }, []);

  const loadQueue = useCallback(async () => {
    if (!selectedId) return setEmails([]);
    try {
      const params = new URLSearchParams({ campaignId: selectedId, status: queueStatus, tier: tierFilter, take: "50" });
      const r = await api(`/api/admin/prospecting/review?${params}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not load the review queue");
      setEmails(data.emails || []);
    } catch (e: any) {
      setEmails([]);
      setNotice({ kind: "err", text: e.message });
    }
  }, [selectedId, queueStatus, tierFilter]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function createCampaign() {
    if (command.trim().length < 5) {
      return setNotice({ kind: "err", text: "Describe the run in a sentence first." });
    }
    setCreating(true);
    setNotice(null);
    try {
      const r = await api("/api/admin/prospecting/campaigns", {
        method: "POST",
        body: JSON.stringify({ command }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not create the campaign");
      setCommand("");
      setSelectedId(data.campaign.id);
      setNotice({ kind: "ok", text: `Campaign created — ${data.campaign.summary}. Press Run to start discovery.` });
      await loadCampaigns();
    } catch (e: any) {
      setNotice({ kind: "err", text: e.message });
    } finally {
      setCreating(false);
    }
  }

  async function runBatches(batches: number) {
    if (!selectedId) return;
    setRunning(true);
    setNotice(null);
    try {
      const r = await api(`/api/admin/prospecting/campaigns/${selectedId}/run`, {
        method: "POST",
        body: JSON.stringify({ batches }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "The run failed");
      setNotice({ kind: "ok", text: data.message });
      await Promise.all([loadCampaigns(), loadQueue()]);
    } catch (e: any) {
      setNotice({ kind: "err", text: e.message });
    } finally {
      setRunning(false);
    }
  }

  async function setCampaignStatus(status: string) {
    if (!selectedId) return;
    try {
      const r = await api(`/api/admin/prospecting/campaigns/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not change the status");
      setNotice({ kind: "ok", text: `Campaign is now "${status}".` });
      await loadCampaigns();
    } catch (e: any) {
      setNotice({ kind: "err", text: e.message });
    }
  }

  async function decide(email: OutreachEmail, action: "approve" | "reject" | "save") {
    setBusyId(email.id);
    setNotice(null);
    try {
      const edit = editing[email.id];
      const r = await api("/api/admin/prospecting/review", {
        method: "PATCH",
        body: JSON.stringify({
          id: email.id,
          action,
          ...(edit ? { subject: edit.subject, bodyText: edit.bodyText } : {}),
          ...(action === "reject" ? { reason: "Rejected in review" } : {}),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not save that");
      setEditing((prev) => {
        const next = { ...prev };
        delete next[email.id];
        return next;
      });
      await Promise.all([loadQueue(), loadCampaigns()]);
    } catch (e: any) {
      setNotice({ kind: "err", text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  async function bulk(action: "approve" | "reject", tier: string) {
    if (!selectedId) return;
    const label = tier === "all" ? "every pending email" : `all tier ${tier} emails`;
    if (!window.confirm(`${action === "approve" ? "Approve" : "Reject"} ${label} in this campaign?`)) return;

    try {
      const r = await api("/api/admin/prospecting/review", {
        method: "POST",
        body: JSON.stringify({
          campaignId: selectedId,
          action,
          ...(tier === "all" ? { minScore: 0 } : { tier }),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Bulk action failed");
      setNotice({ kind: "ok", text: data.message });
      await Promise.all([loadQueue(), loadCampaigns()]);
    } catch (e: any) {
      setNotice({ kind: "err", text: e.message });
    }
  }

  const counts = selected?.prospectCounts || {};
  const emailCounts = selected?.emailCounts || {};
  const cards = [
    { label: "Discovered", value: Object.values(counts).reduce((a, b) => a + b, 0), tone: "blue" },
    { label: "Awaiting review", value: emailCounts.pending_review || 0, tone: "orange" },
    { label: "Approved", value: emailCounts.approved || 0, tone: "purple" },
    { label: "Sent", value: emailCounts.sent || 0, tone: "green" },
  ];

  return (
    <div className="prospect-page">
      <style>{styles}</style>

      <div className="page-head">
        <div>
          <h1>AI Prospecting</h1>
          <p>Find companies, score them against the FinovaOS ICP, draft the outreach — then approve every email by hand before it goes anywhere.</p>
        </div>
      </div>

      {readiness && <ReadinessBar readiness={readiness} />}

      {notice && <div className={`notice notice-${notice.kind}`}>{notice.text}</div>}

      <section className="panel">
        <h2>New campaign</h2>
        <p className="hint">Write it the way you would say it. English, Urdu or Roman Urdu all work.</p>
        <textarea
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          rows={3}
          placeholder="e.g. Karachi aur Lahore ki 300 trading aur wholesale companies dhoondo jinke 2 se zyada warehouses hain, email Roman Urdu mein likho"
        />
        <div className="row">
          <button className="btn btn-primary" onClick={createCampaign} disabled={creating}>
            {creating ? "Reading your brief..." : "Create campaign"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <select value={selectedId || ""} onChange={(e) => setSelectedId(e.target.value || null)}>
            {!campaigns?.length && <option value="">No campaigns yet</option>}
            {campaigns?.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.status}</option>
            ))}
          </select>

          {selected && (
            <>
              <button className="btn" onClick={() => runBatches(1)} disabled={running}>
                {running ? "Working..." : "Run one batch"}
              </button>
              <button className="btn" onClick={() => runBatches(5)} disabled={running}>Run 5 batches</button>
              {selected.status === "review" && (
                <button className="btn btn-green" onClick={() => setCampaignStatus("sending")}>Open the tap (start sending)</button>
              )}
              {["discovering", "enriching", "scoring", "drafting", "review", "sending"].includes(selected.status) && (
                <button className="btn" onClick={() => setCampaignStatus("paused")}>Pause</button>
              )}
              {selected.status === "paused" && (
                <button className="btn" onClick={() => setCampaignStatus("review")}>Resume</button>
              )}
            </>
          )}
        </div>

        {selected && (
          <>
            <div className="stage-track">
              {STAGE_ORDER.map((stage) => {
                const index = STAGE_ORDER.indexOf(selected.status);
                const here = STAGE_ORDER.indexOf(stage);
                const state = here < index ? "done" : here === index ? "current" : "todo";
                return <span key={stage} className={`stage stage-${state}`}>{stage}</span>;
              })}
            </div>
            <p className="hint">{selected.summary} · target {selected.targetCount} · cap {selected.dailyCap}/day</p>
            {selected.lastError && <div className="notice notice-err">{selected.lastError}</div>}
          </>
        )}

        <div className="cards-grid">
          {cards.map((card) => (
            <article key={card.label} className={`info-card tone-${card.tone}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="toolbar">
          <h2 className="grow">Review queue</h2>
          <select value={queueStatus} onChange={(e) => setQueueStatus(e.target.value)}>
            <option value="pending_review">Awaiting review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="sent">Sent</option>
            <option value="all">All</option>
          </select>
          <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option value="all">All tiers</option>
            <option value="A">Tier A (80+)</option>
            <option value="B">Tier B (60-79)</option>
            <option value="C">Tier C (40-59)</option>
          </select>
          {queueStatus === "pending_review" && (
            <>
              <button className="btn btn-green" onClick={() => bulk("approve", "A")}>Approve all tier A</button>
              <button className="btn" onClick={() => bulk("reject", "C")}>Reject all tier C</button>
            </>
          )}
        </div>

        {!emails ? (
          <div className="empty-state">Loading...</div>
        ) : emails.length === 0 ? (
          <div className="empty-state">
            Nothing here. Run the campaign through discovery, enrichment, scoring and drafting first — drafted emails land in this queue.
          </div>
        ) : (
          <div className="queue">
            {emails.map((email) => {
              const edit = editing[email.id];
              const subject = edit?.subject ?? email.subject;
              const bodyText = edit?.bodyText ?? email.bodyText;
              const p = email.prospect;

              return (
                <article key={email.id} className="email-card">
                  <header>
                    <div>
                      <strong>{p.name}</strong>
                      <span>
                        {[p.industry, p.city, p.country].filter(Boolean).join(" · ")}
                        {p.website && <> · <a href={p.website} target="_blank" rel="noreferrer noopener">website</a></>}
                      </span>
                    </div>
                    <div className="score-block">
                      <span className={`tier tier-${p.tier || "D"}`}>{p.tier || "?"}</span>
                      <strong>{p.score ?? "-"}</strong>
                    </div>
                  </header>

                  <div className="facts">
                    <Fact label="Staff" value={p.employeeCount} />
                    <Fact label="Warehouses" value={p.warehouseCount} />
                    <Fact label="Locations" value={p.locationCount} />
                    <Fact label="Uses" value={p.currentSoftware} />
                    <Fact label="Source" value={p.source} />
                  </div>

                  {p.scoreBreakdown && (
                    <div className="breakdown">
                      {Object.entries(p.scoreBreakdown).map(([key, value]) => (
                        <span key={key}>{key}: <b>{value}</b></span>
                      ))}
                    </div>
                  )}
                  {p.scoreReason && <p className="reason">{p.scoreReason}</p>}

                  {email.sendBlocked && <div className="notice notice-err">{email.sendBlocked}</div>}

                  <label className="field">
                    <span>To</span>
                    <input value={`${email.toName ? `${email.toName} ` : ""}<${email.toEmail}>`} readOnly />
                  </label>

                  <label className="field">
                    <span>Subject</span>
                    <input
                      value={subject}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [email.id]: { subject: e.target.value, bodyText } }))}
                    />
                  </label>

                  <label className="field">
                    <span>Body</span>
                    <textarea
                      rows={9}
                      value={bodyText}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [email.id]: { subject, bodyText: e.target.value } }))}
                    />
                  </label>

                  <footer>
                    <span className={`badge badge-${email.status === "approved" ? "green" : email.status === "rejected" ? "slate" : "orange"}`}>
                      {email.status}{email.editedByHuman ? " · edited" : ""}
                    </span>
                    <div className="row">
                      {edit && (
                        <button className="btn" onClick={() => decide(email, "save")} disabled={busyId === email.id}>Save edit</button>
                      )}
                      <button className="btn" onClick={() => decide(email, "reject")} disabled={busyId === email.id}>Reject</button>
                      <button className="btn btn-green" onClick={() => decide(email, "approve")} disabled={busyId === email.id || Boolean(email.sendBlocked)}>
                        {edit ? "Save & approve" : "Approve"}
                      </button>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number | null }) {
  return (
    <span className="fact">
      {label}: <b>{value ?? "—"}</b>
    </span>
  );
}

function ReadinessBar({ readiness }: { readiness: Readiness }) {
  const items = [
    { ok: !readiness.usingSampleData, label: `Discovery: ${readiness.discoveryProvider}`, fix: "Set GOOGLE_PLACES_API_KEY or APOLLO_API_KEY for real companies" },
    { ok: readiness.aiConfigured, label: "AI scoring & drafting", fix: "Set ANTHROPIC_API_KEY or OPENAI_API_KEY" },
    { ok: readiness.contactFinder, label: "Contact finder", fix: "Set HUNTER_API_KEY to get named decision makers" },
    { ok: readiness.emailVerification, label: "Email verification", fix: "Set ZEROBOUNCE_API_KEY — unverified addresses stay blocked" },
    { ok: readiness.postalAddressSet, label: "Postal address", fix: "Set OUTREACH_POSTAL_ADDRESS — legally required in the footer" },
    { ok: readiness.sendingEnabled, label: `Sending (cap ${readiness.globalDailyCap}/day)`, fix: "Set OUTREACH_SENDING_ENABLED=true when the domain is warmed" },
  ];

  return (
    <section className="panel readiness">
      <h2>Setup status</h2>
      <div className="readiness-grid">
        {items.map((item) => (
          <div key={item.label} className={`ready ${item.ok ? "ready-ok" : "ready-missing"}`}>
            <strong>{item.ok ? "✓" : "○"} {item.label}</strong>
            {!item.ok && <span>{item.fix}</span>}
          </div>
        ))}
      </div>
      {readiness.usingSampleData && (
        <div className="notice notice-err">
          No discovery API is configured. Campaigns will run end to end on placeholder companies with .invalid domains so you can see the flow — the sender refuses to mail them.
        </div>
      )}
    </section>
  );
}

const styles = `
.prospect-page{display:grid;gap:18px}
.page-head h1{margin:0;font-size:34px;font-weight:800;letter-spacing:-.05em}
.page-head p{margin:6px 0 0;color:rgba(203,213,225,.72);font-size:14px;max-width:760px}
.panel,.info-card,.email-card{border-radius:22px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg, rgba(19,27,46,.98), rgba(15,22,39,.96));box-shadow:0 24px 70px rgba(3,6,18,.22)}
.panel{padding:18px}
.panel h2{margin:0 0 4px;font-size:16px;font-weight:700}
.hint{margin:0 0 12px;color:rgba(148,163,184,.72);font-size:12.5px}
.grow{flex:1}
.cards-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:16px}
.info-card{padding:18px}
.info-card span{color:rgba(203,213,225,.72);font-size:13px}
.info-card strong{display:block;margin-top:10px;font-size:34px;line-height:1}
.tone-purple strong{color:#c4b5fd}.tone-orange strong{color:#fdba74}.tone-green strong{color:#86efac}.tone-blue strong{color:#93c5fd}
.toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
input,select,textarea{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:11px 13px;color:white;font:inherit;width:100%}
textarea{resize:vertical;line-height:1.55}
.toolbar select{width:auto;min-width:180px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 15px;color:#e2e8f0;font:inherit;font-weight:600;cursor:pointer;white-space:nowrap}
.btn:hover:not(:disabled){background:rgba(255,255,255,.1)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.btn-primary{background:linear-gradient(135deg,#7c3aed,#4f46e5);border-color:transparent;color:white}
.btn-green{background:rgba(34,197,94,.18);border-color:rgba(34,197,94,.3);color:#86efac}
.notice{margin:12px 0 0;padding:12px 14px;border-radius:14px;font-size:13px;line-height:1.55}
.notice-ok{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#bbf7d0}
.notice-err{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);color:#fecaca}
.readiness-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}
.ready{padding:11px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.08);font-size:12.5px;display:grid;gap:4px}
.ready-ok{background:rgba(34,197,94,.08);color:#bbf7d0}
.ready-missing{background:rgba(251,146,60,.08);color:#fed7aa}
.ready span{color:rgba(203,213,225,.6);font-size:11.5px;line-height:1.45}
.stage-track{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}
.stage{padding:5px 11px;border-radius:999px;font-size:11px;font-weight:700;text-transform:capitalize}
.stage-done{background:rgba(34,197,94,.16);color:#86efac}
.stage-current{background:rgba(124,58,237,.24);color:#d8ccff}
.stage-todo{background:rgba(148,163,184,.1);color:rgba(148,163,184,.6)}
.empty-state{padding:26px 6px;color:rgba(148,163,184,.72);font-size:13px;line-height:1.6}
.queue{display:grid;gap:16px}
.email-card{padding:18px;display:grid;gap:12px}
.email-card header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.email-card header strong{display:block;font-size:15px}
.email-card header span{display:block;margin-top:4px;color:rgba(148,163,184,.72);font-size:12px}
.email-card a{color:#93c5fd}
.score-block{display:flex;align-items:center;gap:10px}
.score-block strong{font-size:26px;line-height:1}
.tier{width:26px;height:26px;display:grid;place-items:center;border-radius:9px;font-size:12px;font-weight:800}
.tier-A{background:rgba(34,197,94,.2);color:#86efac}
.tier-B{background:rgba(124,58,237,.2);color:#d8ccff}
.tier-C{background:rgba(251,146,60,.18);color:#fdba74}
.tier-D{background:rgba(148,163,184,.16);color:#cbd5e1}
.facts,.breakdown{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:rgba(148,163,184,.75)}
.facts b,.breakdown b{color:#e2e8f0;font-weight:600}
.breakdown{padding-top:2px;font-size:11.5px;opacity:.85}
.reason{margin:0;font-size:12.5px;color:rgba(203,213,225,.8);font-style:italic;line-height:1.55}
.field{display:grid;gap:5px}
.field>span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:rgba(148,163,184,.72)}
.field input[readonly]{color:rgba(203,213,225,.65)}
.email-card footer{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.email-card footer .row{margin-top:0}
.badge{display:inline-flex;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:700;text-transform:capitalize}
.badge-orange{background:rgba(251,146,60,.16);color:#fdba74}
.badge-green{background:rgba(34,197,94,.16);color:#86efac}
.badge-slate{background:rgba(148,163,184,.16);color:#cbd5e1}
@media (max-width: 1100px){.cards-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.readiness-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width: 640px){
  .page-head h1{font-size:26px}
  .cards-grid,.readiness-grid{grid-template-columns:1fr}
  .panel,.info-card,.email-card{border-radius:18px;padding:14px}
  .toolbar select,.btn{width:100%}
  .email-card header{flex-direction:column}
}
`;
