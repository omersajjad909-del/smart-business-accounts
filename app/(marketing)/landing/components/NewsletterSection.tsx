"use client";

import { useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function subscribe() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "landing" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe.");
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Subscription failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{
      background: "linear-gradient(180deg,#070a1e 0%,#060818 100%)",
      padding: "90px 24px",
      fontFamily: "'Outfit',sans-serif",
      position: "relative",
      overflow: "hidden",
      borderTop: "1px solid rgba(255,255,255,.06)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        @keyframes nl-orb{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-16px)}}
        @keyframes nl-pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4)}70%{box-shadow:0 0 0 8px rgba(99,102,241,0)}}
        @keyframes nl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes nl-check{0%{stroke-dashoffset:20}100%{stroke-dashoffset:0}}

        .nl-input:focus{
          outline:none;
          border-color:rgba(99,102,241,.6) !important;
          box-shadow:0 0 0 3px rgba(99,102,241,.12);
        }
        .nl-btn:hover:not(:disabled){
          transform:translateY(-2px);
          box-shadow:0 8px 28px rgba(99,102,241,.55) !important;
        }
        .nl-benefit:hover{
          background:rgba(99,102,241,.08) !important;
          border-color:rgba(99,102,241,.25) !important;
        }
        .nl-stat:hover{
          background:rgba(255,255,255,.06) !important;
        }

        @media(max-width:860px){
          .nl-grid{grid-template-columns:1fr !important;}
          .nl-left{text-align:center !important;}
          .nl-left-badge{justify-content:center !important;}
          .nl-benefits{justify-content:center !important;}
          .nl-stats-row{justify-content:center !important;}
        }
        @media(max-width:480px){
          .nl-form-row{flex-direction:column !important;}
          .nl-btn{width:100% !important; justify-content:center !important;}
          .nl-stats-row{gap:16px !important;}
        }
      `}</style>

      {/* Background */}
      <div aria-hidden style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(99,102,241,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
        <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", top:-160, left:-120, animation:"nl-orb 18s ease-in-out infinite", background:"radial-gradient(circle,rgba(99,102,241,.12),transparent 65%)" }}/>
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", bottom:-100, right:-60, animation:"nl-orb 22s ease-in-out infinite reverse", background:"radial-gradient(circle,rgba(109,40,217,.09),transparent 65%)" }}/>
        <div style={{ position:"absolute", top:0, left:"8%", right:"8%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.3),transparent)" }}/>
        <div style={{ position:"absolute", bottom:0, left:"8%", right:"8%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.12),transparent)" }}/>
      </div>

      <div style={{ maxWidth:1100, margin:"0 auto", position:"relative" }}>
        <div className="nl-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:72, alignItems:"center" }}>

          {/* ── LEFT ── */}
          <div className="nl-left" style={{ display:"flex", flexDirection:"column", gap:0 }}>

            {/* Badge */}
            <div className="nl-left-badge" style={{ display:"flex", marginBottom:22 }}>
              <div style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"6px 14px", borderRadius:100,
                background:"rgba(99,102,241,.1)", border:"1.5px solid rgba(99,102,241,.22)",
              }}>
                {/* Mail icon */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <polyline points="2,4 12,13 22,4"/>
                </svg>
                <span style={{ fontSize:11, fontWeight:700, color:"#a5b4fc", letterSpacing:".08em" }}>NEWSLETTER</span>
              </div>
            </div>

            {/* Headline */}
            <h2 style={{
              fontFamily:"'Outfit',sans-serif",
              fontSize:"clamp(28px,3.5vw,44px)",
              fontWeight:900, lineHeight:1.12,
              letterSpacing:"-1.5px", color:"white",
              marginBottom:16, marginTop:0,
            }}>
              Stay ahead with{" "}
              <span style={{
                background:"linear-gradient(135deg,#818cf8,#a78bfa,#60a5fa)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>
                Finova updates
              </span>
            </h2>

            <p style={{
              fontSize:16, color:"rgba(255,255,255,.45)",
              lineHeight:1.8, marginBottom:32, marginTop:0,
              maxWidth:420,
            }}>
              Product launches, trading tips, limited-time offers, and the latest features — delivered straight to your inbox. No spam, ever.
            </p>

            {/* Benefits */}
            <div className="nl-benefits" style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:0 }}>
              {[
                { icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                ), label:"Feature releases & product updates", color:"#34d399" },
                { icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ), label:"Exclusive offers & early access deals", color:"#fbbf24" },
                { icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ), label:"Weekly tips for trading businesses", color:"#818cf8" },
                { icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                ), label:"AI insights & finance guides", color:"#a78bfa" },
              ].map(({ icon, label, color }, i) => (
                <div key={i} className="nl-benefit" style={{
                  display:"inline-flex", alignItems:"center", gap:12,
                  padding:"10px 14px", borderRadius:11,
                  background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)",
                  transition:"all .2s", cursor:"default",
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:8, flexShrink:0,
                    background:`${color}18`, border:`1px solid ${color}30`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {icon}
                  </div>
                  <span style={{ fontSize:13, color:"rgba(255,255,255,.6)", fontWeight:500 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>

            {/* Card */}
            <div style={{
              borderRadius:24,
              background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.09)",
              backdropFilter:"blur(24px)",
              boxShadow:"0 32px 80px rgba(0,0,0,.4), 0 0 0 1px rgba(99,102,241,.08), inset 0 1px 0 rgba(255,255,255,.05)",
              padding:"36px 32px",
              animation:"nl-float 7s ease-in-out infinite",
              position:"relative",
              overflow:"hidden",
            }}>
              {/* Card glow top */}
              <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,.5),transparent)" }}/>
              {/* Inner glow */}
              <div style={{ position:"absolute", top:-60, left:"50%", transform:"translateX(-50%)", width:260, height:120, background:"radial-gradient(ellipse,rgba(99,102,241,.12),transparent 70%)", pointerEvents:"none" }}/>

              {/* Envelope icon big */}
              <div style={{
                width:52, height:52, borderRadius:14, marginBottom:24,
                background:"linear-gradient(135deg,rgba(99,102,241,.2),rgba(124,58,237,.15))",
                border:"1px solid rgba(99,102,241,.3)",
                display:"flex", alignItems:"center", justifyContent:"center",
                position:"relative",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <polyline points="2,4 12,13 22,4"/>
                </svg>
                {/* Pulse dot */}
                <div style={{
                  position:"absolute", top:-3, right:-3,
                  width:12, height:12, borderRadius:"50%", background:"#10b981",
                  animation:"nl-pulse 2.5s infinite",
                }}/>
              </div>

              <div style={{ fontSize:22, fontWeight:800, color:"white", letterSpacing:"-0.5px", marginBottom:8, lineHeight:1.2 }}>
                Join 5,000+ business owners
              </div>
              <p style={{ fontSize:14, color:"rgba(255,255,255,.4)", lineHeight:1.7, marginBottom:28, marginTop:0 }}>
                Get product updates and growth tips delivered weekly. Unsubscribe anytime.
              </p>

              {done ? (
                <div style={{
                  display:"flex", alignItems:"center", gap:14,
                  padding:"20px 22px", borderRadius:16,
                  background:"rgba(52,211,153,.08)", border:"1.5px solid rgba(52,211,153,.22)",
                }}>
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#34d399" }}>You are subscribed!</div>
                    <div style={{ fontSize:13, color:"rgba(255,255,255,.45)", marginTop:3 }}>
                      Check your inbox — first update is on its way.
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Email input */}
                  <div style={{ position:"relative", marginBottom:12 }}>
                    <div style={{
                      position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                      pointerEvents:"none",
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <polyline points="2,4 12,13 22,4"/>
                      </svg>
                    </div>
                    <input
                      className="nl-input"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && subscribe()}
                      style={{
                        width:"100%",
                        padding:"14px 16px 14px 42px",
                        borderRadius:12,
                        border:"1.5px solid rgba(255,255,255,.1)",
                        background:"rgba(255,255,255,.04)",
                        color:"white",
                        fontFamily:"'Outfit',sans-serif",
                        fontSize:14,
                        outline:"none",
                        transition:"all .2s",
                      }}
                    />
                  </div>

                  {/* Subscribe button */}
                  <button
                    className="nl-btn"
                    onClick={subscribe}
                    disabled={loading}
                    style={{
                      width:"100%",
                      display:"inline-flex", alignItems:"center", gap:8,
                      padding:"14px 24px", borderRadius:12,
                      border:"none",
                      background: loading ? "rgba(99,102,241,.4)" : "linear-gradient(135deg,#6366f1 0%,#5b21b6 100%)",
                      color:"white",
                      fontFamily:"'Outfit',sans-serif",
                      fontSize:15, fontWeight:700,
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow:"0 4px 20px rgba(99,102,241,.35)",
                      transition:"all .22s",
                    }}
                  >
                    {loading ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation:"spin 1s linear infinite" }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                        Subscribing...
                      </>
                    ) : (
                      <>
                        Subscribe — It's Free
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                        </svg>
                      </>
                    )}
                  </button>

                  {error && (
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p style={{ margin:0, fontSize:13, color:"#f87171" }}>{error}</p>
                    </div>
                  )}

                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:14 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,.22)" }}>No spam. Unsubscribe anytime. Your data is safe.</span>
                  </div>
                </div>
              )}

              {/* Stats row */}
              <div className="nl-stats-row" style={{
                display:"flex", gap:0,
                marginTop:28,
                borderTop:"1px solid rgba(255,255,255,.07)",
                paddingTop:24,
              }}>
                {[
                  { icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  ), val:"5,000+", label:"Subscribers", color:"#818cf8" },
                  { icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <polyline points="2,4 12,13 22,4"/>
                    </svg>
                  ), val:"Weekly", label:"Delivery", color:"#34d399" },
                  { icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ), val:"Zero", label:"Spam", color:"#fbbf24" },
                ].map(({ icon, val, label, color }, i) => (
                  <div key={label} className="nl-stat" style={{
                    flex:1, textAlign:"center",
                    padding:"10px 8px", borderRadius:10,
                    transition:"background .2s", cursor:"default",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,.06)" : "none",
                  }}>
                    <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}>{icon}</div>
                    <div style={{ fontSize:17, fontWeight:800, color, letterSpacing:"-0.3px" }}>{val}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:600, marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social proof under card */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:16, justifyContent:"center" }}>
              <div style={{ display:"flex" }}>
                {["#6366f1","#8b5cf6","#06b6d4","#10b981"].map((c, i) => (
                  <div key={i} style={{
                    width:24, height:24, borderRadius:"50%",
                    background:`linear-gradient(135deg,${c},${c}88)`,
                    border:"2px solid #060818",
                    marginLeft: i === 0 ? 0 : -7,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9, fontWeight:800, color:"white",
                    position:"relative", zIndex:4-i,
                  }}>
                    {["T","A","R","F"][i]}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:2 }}>
                {[...Array(5)].map((_,i) => (
                  <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="#fbbf24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
              </div>
              <span style={{ fontSize:12, color:"rgba(255,255,255,.3)" }}>
                <span style={{ color:"rgba(255,255,255,.6)", fontWeight:600 }}>4.9/5</span> from 2,400+ reviews
              </span>
            </div>
          </div>

        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </section>
  );
}
