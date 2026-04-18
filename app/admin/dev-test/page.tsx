"use client";
import { useEffect, useState } from "react";
import { BUSINESS_PHASE_CONFIG } from "@/lib/businessModules";

const PLANS = [
  { id: "STARTER",    label: "Starter",    color: "#818cf8", emoji: "🚀" },
  { id: "PRO",        label: "Professional", color: "#34d399", emoji: "⚡" },
  { id: "ENTERPRISE", label: "Enterprise", color: "#fbbf24", emoji: "🏆" },
  { id: "CUSTOM",     label: "Custom",     color: "#f472b6", emoji: "🎛️" },
];

interface TestStatus {
  isTestMode: boolean;
  testBusinessType: string | null;
  testPlan: string | null;
  testCompanyId: string | null;
}

interface BizEntry {
  id: string;
  label: string;
  emoji: string;
  phase: number;
  category: string;
  status: string;
}

export default function DevTestPage() {
  const [status, setStatus]           = useState<TestStatus | null>(null);
  const [selectedBiz, setSelectedBiz] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("STARTER");
  const [launching, setLaunching]     = useState(false);
  const [clearing, setClearing]       = useState(false);
  const [clearMsg, setClearMsg]       = useState("");
  const [search, setSearch]           = useState("");
  const [filterPhase, setFilterPhase] = useState<number | null>(null);
  const [liveTypes, setLiveTypes]     = useState<Record<string, boolean>>({});

  // Build biz list from BUSINESS_PHASE_CONFIG
  const bizList: BizEntry[] = Object.entries(BUSINESS_PHASE_CONFIG).map(([id, cfg]) => ({
    id,
    label: (cfg as any).label,
    emoji: (cfg as any).emoji || "🏢",
    phase: (cfg as any).phase,
    category: (cfg as any).category,
    status: (cfg as any).status,
  }));

  useEffect(() => {
    fetch("/api/admin/dev-test/status")
      .then(r => r.json())
      .then(d => {
        setStatus(d);
        if (d.testBusinessType) setSelectedBiz(d.testBusinessType);
        if (d.testPlan)         setSelectedPlan(d.testPlan.toUpperCase());
      })
      .catch(() => {});

    fetch("/api/public/business-types")
      .then(r => r.json())
      .then(d => {
        const map: Record<string, boolean> = {};
        (d.types || []).forEach((t: { id: string; isLive: boolean }) => { map[t.id] = t.isLive; });
        setLiveTypes(map);
      })
      .catch(() => {});
  }, []);

  const filtered = bizList.filter(b => {
    if (filterPhase && b.phase !== filterPhase) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.label.toLowerCase().includes(q) || b.category.toLowerCase().includes(q);
    }
    return true;
  });

  async function launch() {
    if (!selectedBiz) { alert("Select a business type first"); return; }
    setLaunching(true);
    try {
      const r = await fetch("/api/admin/dev-test/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: selectedBiz, plan: selectedPlan }),
      });
      if (!r.ok) { const d = await r.json(); alert(d.error || "Launch failed"); setLaunching(false); return; }
      window.location.href = "/dashboard";
    } catch { setLaunching(false); }
  }

  async function clearData() {
    if (!confirm("DELETE all test data? Company settings stay, all transactions/records will be gone. Cannot undo.")) return;
    setClearing(true);
    setClearMsg("");
    try {
      const r = await fetch("/api/admin/dev-test/clear", { method: "POST" });
      if (r.ok) {
        setClearMsg("All test data cleared successfully.");
      } else {
        const d = await r.json();
        setClearMsg("Error: " + (d.error || "Clear failed"));
      }
    } catch { setClearMsg("Network error"); }
    setClearing(false);
  }

  const PHASE_COLORS: Record<number, string> = {
    1: "#34d399", 2: "#818cf8", 3: "#fbbf24", 4: "#f87171",
  };

  return (
    <div style={{ padding: "32px 28px", maxWidth: 1100, color: "white", fontFamily: "'Outfit','Inter',sans-serif" }}>
      <style>{`
        .biz-card { border-radius:12px; padding:14px; cursor:pointer; transition:all .18s; border:2px solid rgba(255,255,255,.07); background:rgba(255,255,255,.02); }
        .biz-card:hover { border-color:rgba(255,255,255,.18); background:rgba(255,255,255,.05); transform:translateY(-1px); }
        .biz-card.selected { border-color: var(--sel-color); background: var(--sel-bg); box-shadow: 0 0 20px var(--sel-glow); }
        .plan-btn { border-radius:10px; padding:10px 18px; cursor:pointer; border:2px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); color:rgba(255,255,255,.5); font-family:inherit; font-size:13px; font-weight:700; transition:all .18s; }
        .plan-btn:hover { border-color:rgba(255,255,255,.25); color:rgba(255,255,255,.8); }
        .plan-btn.active { color:white; }
        input[type=text]::placeholder { color:rgba(255,255,255,.25); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <div style={{ fontSize:28 }}>🧪</div>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:0 }}>Dev Test Mode</h1>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.4)", margin:0 }}>
              Launch any business type + plan combination — real session, real data, zero signup flow
            </p>
          </div>
        </div>
      </div>

      {/* Current test session info */}
      {status?.isTestMode && (
        <div style={{ padding:"14px 18px", borderRadius:12, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.25)", marginBottom:28, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <span style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", boxShadow:"0 0 8px rgba(52,211,153,.8)", flexShrink:0, display:"inline-block" }}/>
          <div>
            <span style={{ fontSize:13, fontWeight:700, color:"#6ee7b7" }}>Test session active — </span>
            <span style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>{status.testBusinessType} / {status.testPlan}</span>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:10 }}>
            <button
              onClick={clearData}
              disabled={clearing}
              style={{ padding:"7px 16px", borderRadius:8, border:"1px solid rgba(248,113,113,.4)", background:"rgba(248,113,113,.1)", color:"#f87171", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
            >
              {clearing ? "Clearing…" : "🗑 Clear All Data"}
            </button>
            <a href="/dashboard" style={{ padding:"7px 16px", borderRadius:8, border:"1px solid rgba(52,211,153,.3)", background:"rgba(52,211,153,.1)", color:"#34d399", fontSize:12, fontWeight:700, textDecoration:"none", display:"flex", alignItems:"center" }}>
              Open Dashboard →
            </a>
          </div>
        </div>
      )}

      {clearMsg && (
        <div style={{ padding:"10px 16px", borderRadius:10, background: clearMsg.startsWith("Error") ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)", border:`1px solid ${clearMsg.startsWith("Error") ? "rgba(248,113,113,.3)" : "rgba(52,211,153,.3)"}`, color: clearMsg.startsWith("Error") ? "#f87171" : "#6ee7b7", fontSize:13, fontWeight:600, marginBottom:20 }}>
          {clearMsg}
        </div>
      )}

      {/* Plan selector */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase", color:"rgba(255,255,255,.3)", marginBottom:10 }}>
          Select Plan
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {PLANS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`plan-btn${selectedPlan === p.id ? " active" : ""}`}
              style={{ borderColor: selectedPlan === p.id ? p.color : undefined, color: selectedPlan === p.id ? p.color : undefined, background: selectedPlan === p.id ? `${p.color}15` : undefined }}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Phase filter */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <input
          type="text"
          placeholder="Search business type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, maxWidth:320, padding:"9px 14px", borderRadius:10, border:"1.5px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.05)", color:"white", fontSize:13, fontFamily:"inherit", outline:"none" }}
        />
        <div style={{ display:"flex", gap:8 }}>
          {[null,1,2,3,4].map(ph => (
            <button
              key={ph ?? "all"}
              onClick={() => setFilterPhase(ph)}
              style={{ padding:"7px 14px", borderRadius:100, fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:`1px solid ${filterPhase === ph ? (ph ? PHASE_COLORS[ph] : "white") : "rgba(255,255,255,.12)"}`, background: filterPhase === ph ? `${ph ? PHASE_COLORS[ph] : "white"}18` : "transparent", color: filterPhase === ph ? (ph ? PHASE_COLORS[ph] : "white") : "rgba(255,255,255,.4)", transition:"all .15s" }}
            >
              {ph === null ? "All" : `Phase ${ph}`}
            </button>
          ))}
        </div>
        <span style={{ fontSize:12, color:"rgba(255,255,255,.3)", marginLeft:4 }}>{filtered.length} types</span>
      </div>

      {/* Business type grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10, marginBottom:32 }}>
        {filtered.map(b => {
          const isSelected = selectedBiz === b.id;
          const phaseColor = PHASE_COLORS[b.phase] || "#818cf8";
          const isLive = liveTypes[b.id] === true;
          return (
            <div
              key={b.id}
              className={`biz-card${isSelected ? " selected" : ""}`}
              onClick={() => setSelectedBiz(b.id)}
              style={{
                "--sel-color": phaseColor,
                "--sel-bg": `${phaseColor}12`,
                "--sel-glow": `${phaseColor}25`,
              } as React.CSSProperties}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <span style={{ fontSize:22 }}>{b.emoji}</span>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                  <span style={{ fontSize:9, fontWeight:700, letterSpacing:".05em", textTransform:"uppercase", color: phaseColor, opacity:.7 }}>Ph {b.phase}</span>
                  {isLive && <span style={{ width:6, height:6, borderRadius:"50%", background:"#34d399", boxShadow:"0 0 6px rgba(52,211,153,.8)", display:"block" }}/>}
                </div>
              </div>
              <div style={{ fontSize:12.5, fontWeight:700, color: isSelected ? "white" : "rgba(255,255,255,.75)", marginBottom:3, lineHeight:1.3 }}>{b.label}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".05em" }}>{b.category}</div>
              {isSelected && (
                <div style={{ marginTop:8, fontSize:10, color:phaseColor, fontWeight:700 }}>✓ Selected</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Launch button */}
      <div style={{ position:"sticky", bottom:20, display:"flex", justifyContent:"center", pointerEvents:"none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, background:"rgba(8,12,30,.9)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,.1)", borderRadius:16, padding:"14px 24px", pointerEvents:"auto" }}>
          {selectedBiz ? (
            <span style={{ fontSize:13, color:"rgba(255,255,255,.5)" }}>
              {bizList.find(b => b.id === selectedBiz)?.emoji} {bizList.find(b => b.id === selectedBiz)?.label} &nbsp;·&nbsp; {PLANS.find(p => p.id === selectedPlan)?.emoji} {PLANS.find(p => p.id === selectedPlan)?.label}
            </span>
          ) : (
            <span style={{ fontSize:13, color:"rgba(255,255,255,.3)" }}>Select a business type above</span>
          )}
          <button
            onClick={launch}
            disabled={!selectedBiz || launching}
            style={{
              padding:"11px 28px", borderRadius:10, border:"none", cursor: !selectedBiz || launching ? "not-allowed" : "pointer",
              background: !selectedBiz ? "rgba(255,255,255,.08)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
              color: !selectedBiz ? "rgba(255,255,255,.3)" : "white",
              fontSize:13.5, fontWeight:700, fontFamily:"inherit", transition:"all .2s",
              boxShadow: selectedBiz ? "0 6px 24px rgba(99,102,241,.4)" : "none",
            }}
          >
            {launching ? "Launching…" : "▶ Launch Test Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
