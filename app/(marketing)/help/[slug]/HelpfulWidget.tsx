"use client";

import { useState } from "react";

/** "Was this article helpful?" — local UI state only, never a URL. */
export default function HelpfulWidget() {
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);

  if (choice) {
    return (
      <div style={{ borderRadius:16, padding:"20px 22px", background:"rgba(var(--ink),.03)", border:"1px solid rgba(var(--ink),.07)", marginBottom:32 }}>
        <span style={{ fontSize:14, fontWeight:600, color:"rgba(var(--ink),var(--ta-45, .45))" }}>
          {choice === "yes" ? "Glad it helped! 🙌" : "Thanks — we'll work on making this clearer."}
        </span>
      </div>
    );
  }

  return (
    <div style={{ borderRadius:16, padding:"20px 22px", background:"rgba(var(--ink),.03)", border:"1px solid rgba(var(--ink),.07)", marginBottom:32, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
      <span style={{ fontSize:14, fontWeight:600, color:"rgba(var(--ink),var(--ta-45, .45))" }}>Was this article helpful?</span>
      <div style={{ display:"flex", gap:8 }}>
        <button
          type="button"
          onClick={() => setChoice("yes")}
          style={{ padding:"8px 18px", borderRadius:10, background:"rgba(52,211,153,.08)", border:"1.5px solid rgba(52,211,153,.25)", color:"var(--tx-34d399, #34d399)", fontSize:13, fontWeight:600, cursor:"pointer" }}
        >
          👍 Yes
        </button>
        <button
          type="button"
          onClick={() => setChoice("no")}
          style={{ padding:"8px 18px", borderRadius:10, background:"rgba(248,113,113,.08)", border:"1.5px solid rgba(248,113,113,.2)", color:"var(--tx-f87171, #f87171)", fontSize:13, fontWeight:600, cursor:"pointer" }}
        >
          👎 No
        </button>
      </div>
    </div>
  );
}
