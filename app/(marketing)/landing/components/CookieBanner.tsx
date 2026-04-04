"use client";

import { useEffect, useState } from "react";

type Consent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export default function CookieBanner() {
  const [show,       setShow]       = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [prefs,      setPrefs]      = useState<Consent>({ necessary:true, analytics:true, marketing:false });

  useEffect(() => {
    const saved = localStorage.getItem("finova_cookie_consent");
    if (!saved) setTimeout(() => setShow(true), 1500);
  }, []);

  function saveConsent(consent: Consent) {
    localStorage.setItem("finova_cookie_consent", JSON.stringify({ ...consent, savedAt: new Date().toISOString() }));
    if (consent.analytics && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cookie_consent_analytics"));
    }
    setShow(false);
    setShowDetail(false);
  }

  function acceptAll()        { saveConsent({ necessary:true, analytics:true,  marketing:true  }); }
  function acceptNecessary()  { saveConsent({ necessary:true, analytics:false, marketing:false }); }
  function savePreferences()  { saveConsent(prefs); }

  if (!show) return null;

  return (
    <div style={{
      position:"fixed", bottom:24, left:24,
      zIndex:99999,
      width:"calc(100% - 48px)", maxWidth:500,
      background:"rgba(8,12,30,.97)", backdropFilter:"blur(20px)",
      border:"1px solid rgba(99,102,241,.3)",
      borderRadius:18, padding:"20px 22px",
      boxShadow:"0 20px 60px rgba(0,0,0,.65)",
      fontFamily:"'Outfit',sans-serif",
      animation:"cookieSlideUp .4s ease",
      pointerEvents:"all",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
        @keyframes cookieSlideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {!showDetail ? (
        <>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
            <span style={{ fontSize:22, flexShrink:0 }}>🍪</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"white", marginBottom:4 }}>We use cookies</div>
              <p style={{ fontSize:12, color:"rgba(255,255,255,.5)", lineHeight:1.6, margin:0 }}>
                We use cookies to improve your experience, analyse traffic, and personalise content.
              </p>
            </div>
          </div>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button
              type="button"
              onClick={acceptAll}
              style={{ flex:1, minWidth:110, padding:"9px 16px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={acceptNecessary}
              style={{ flex:1, minWidth:110, padding:"9px 16px", borderRadius:10, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"rgba(255,255,255,.7)", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
            >
              Necessary Only
            </button>
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              style={{ padding:"9px 14px", borderRadius:10, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.45)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
            >
              Manage
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"white" }}>Cookie Preferences</div>
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              style={{ background:"none", border:"none", color:"rgba(255,255,255,.35)", fontSize:18, cursor:"pointer", lineHeight:1, padding:4 }}
            >
              ←
            </button>
          </div>

          {([
            { key:"necessary" as const, label:"Necessary",  desc:"Required for login, security and session. Cannot be disabled.", locked:true  },
            { key:"analytics" as const, label:"Analytics",  desc:"Helps us understand how visitors use our site (no personal data).", locked:false },
            { key:"marketing" as const, label:"Marketing",  desc:"Used to show relevant content on other platforms.", locked:false },
          ] as const).map(item => (
            <div key={item.key} style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14, gap:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"white", marginBottom:2 }}>{item.label}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.4)", lineHeight:1.5 }}>{item.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => { if (!item.locked) setPrefs(p => ({ ...p, [item.key]: !p[item.key] })); }}
                style={{
                  position:"relative", width:38, height:22, borderRadius:11, flexShrink:0, marginTop:2,
                  background: prefs[item.key] ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "rgba(255,255,255,.1)",
                  cursor: item.locked ? "not-allowed" : "pointer",
                  opacity: item.locked ? .6 : 1,
                  transition:"background .25s",
                  border:"none", padding:0,
                }}
              >
                <div style={{ position:"absolute", top:3, left: prefs[item.key] ? 18 : 3, width:16, height:16, borderRadius:"50%", background:"white", transition:"left .25s", pointerEvents:"none" }}/>
              </button>
            </div>
          ))}

          <div style={{ display:"flex", gap:8, marginTop:16 }}>
            <button
              type="button"
              onClick={savePreferences}
              style={{ flex:1, padding:"9px", borderRadius:10, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", border:"none", color:"white", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}
            >
              Save Preferences
            </button>
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              style={{ padding:"9px 14px", borderRadius:10, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"rgba(255,255,255,.4)", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}
            >
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
