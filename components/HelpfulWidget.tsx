"use client";

import { useState } from "react";

/**
 * "Was this article helpful?" control for /help/[slug].
 *
 * This used to be two <a href="?helpful=yes|no"> links. Googlebot follows
 * anchors, so every help article ended up with three crawlable URLs that
 * served byte-identical content — which is exactly what Search Console
 * reported as "Duplicate without user-selected canonical". Buttons with local
 * state keep the interaction and leave the URL alone, so the duplicates stop
 * being created at the source.
 */
export default function HelpfulWidget() {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);

  const base: React.CSSProperties = {
    padding: "8px 18px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity .18s ease",
  };

  return (
    <div style={{ borderRadius:16, padding:"20px 22px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", marginBottom:32, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
      <span style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,.45)" }}>
        {answer === null ? "Was this article helpful?" : "Thanks for the feedback."}
      </span>

      {answer === null ? (
        <div style={{ display:"flex", gap:8 }}>
          <button
            type="button"
            onClick={() => setAnswer("yes")}
            aria-label="Yes, this article was helpful"
            style={{ ...base, background:"rgba(52,211,153,.08)", border:"1.5px solid rgba(52,211,153,.25)", color:"#34d399" }}
          >
            👍 Yes
          </button>
          <button
            type="button"
            onClick={() => setAnswer("no")}
            aria-label="No, this article was not helpful"
            style={{ ...base, background:"rgba(248,113,113,.08)", border:"1.5px solid rgba(248,113,113,.2)", color:"#f87171" }}
          >
            👎 No
          </button>
        </div>
      ) : (
        <span style={{ fontSize:13, fontWeight:600, color: answer === "yes" ? "#34d399" : "#f87171" }}>
          {answer === "yes" ? "👍 Glad it helped" : "👎 We'll improve this article"}
        </span>
      )}
    </div>
  );
}
