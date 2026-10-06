"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ALL_POSTS as SHARED_POSTS } from "../posts";
import { SEO_ARTICLES } from "../seo-articles";
import { LOCAL_POSTS } from "./local-posts";

/**
 * Three sources, deliberately layered:
 *   SHARED_POSTS  — ../posts.ts. Also drives generateMetadata and the sitemap.
 *                   Merging it here is what makes those sitemap slugs resolve;
 *                   four of them previously 404'd because only the metadata
 *                   layout could see them.
 *   LOCAL_POSTS   — the older FinovaOS-centric posts written straight into this
 *                   file. They override SHARED_POSTS where slugs collide, which
 *                   preserves the existing published copy.
 *   SEO_ARTICLES  — ../seo-articles.ts. Single source of truth, so these render
 *                   the same content the index and metadata layout use.
 */
const ALL_POSTS: Record<string, any> = { ...SHARED_POSTS, ...LOCAL_POSTS, ...SEO_ARTICLES };

const RELATED_BY_CATEGORY: Record<string, string[]> = {
  accounting: ["bank-reconciliation-guide","5","9","11"],
  guides:     ["1","2","7","13","manage-sales-inventory-accounting-one-system"],
  business:   ["should-you-combine-inventory-and-accounting","best-business-management-software-small-business","best-odoo-alternatives","best-quickbooks-alternatives","best-all-in-one-business-management-software","accounting-crm-inventory-software-small-business","business-management-software-wholesale","business-management-software-distributors","6","8","10","12"],
  product:    ["3","4","8","14"],
  fintech:    ["5","9","15"],
};

export default function BlogDetailPage() {
  const params  = useParams();
  const slug    = params?.slug as string;
  const post    = ALL_POSTS[slug];
  const [heroVis, setHeroVis] = useState(false);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => { setTimeout(() => setHeroVis(true), 80); }, []);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!post) {
    return (
      <main style={{ minHeight:"100vh", background:"linear-gradient(160deg,var(--dk-080c1e, #080c1e),var(--dk-0c0f2e, #0c0f2e))", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📄</div>
          <div style={{ fontSize:20, fontWeight:700, color:"var(--ink-solid, white)", marginBottom:12 }}>Article not found</div>
          <Link href="/blog" style={{ color:"var(--tx-818cf8, #818cf8)", textDecoration:"none", fontWeight:600, fontSize:14 }}>← Back to Blog</Link>
        </div>
      </main>
    );
  }

  const related = (RELATED_BY_CATEGORY[post.category] || [])
    .filter((id: string) => id !== slug)
    .slice(0, 3)
    .map((id: string) => ALL_POSTS[id] ? { ...ALL_POSTS[id], slug: id } : null)
    .filter(Boolean);

  return (
    <main style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,var(--dk-080c1e, #080c1e) 0%,var(--dk-0c0f2e, #0c0f2e) 50%,var(--dk-080c1e, #080c1e) 100%)",
      color:"var(--ink-solid, white)",
      fontFamily:"'DM Sans','Outfit',system-ui,sans-serif",
      overflowX:"hidden",
    }}>
      <style>{`
        
        * { box-sizing: border-box; }
      `}</style>

      {/* Hero */}
      <section style={{ padding:"100px 24px 48px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-80, left:"50%", transform:"translateX(-50%)", width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle,color-mix(in srgb, ${post.color} 9.4%, transparent) 0%,transparent 70%)`, pointerEvents:"none" }}/>
        <div style={{ maxWidth:760, margin:"0 auto", position:"relative", zIndex:1,
          opacity:heroVis?1:0, transform:heroVis?"translateY(0)":"translateY(20px)",
          transition:"opacity .6s ease, transform .6s ease" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22, fontSize:13 }}>
            <Link href="/blog" style={{ color:"rgba(var(--ink),var(--ta-40, .4))", textDecoration:"none", fontWeight:600 }}>Blog</Link>
            <span style={{ color:"rgba(var(--ink),var(--ta-20, .2))" }}>›</span>
            <span style={{ color:post.color, fontWeight:700 }}>{post.categoryLabel}</span>
          </div>
          <div style={{ display:"inline-flex", padding:"4px 14px", borderRadius:24, background:`color-mix(in srgb, ${post.color} 12.5%, transparent)`, border:`1px solid color-mix(in srgb, ${post.color} 25.1%, transparent)`, marginBottom:18 }}>
            <span style={{ fontSize:11, fontWeight:800, color:post.color, letterSpacing:".06em" }}>{post.categoryLabel.toUpperCase()}</span>
          </div>
          <h1 style={{ fontSize:"clamp(26px,5vw,46px)", fontWeight:900, letterSpacing:"-.03em", lineHeight:1.15, fontFamily:"Lora,serif", margin:"0 0 22px" }}>
            {post.title}
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:post.authorGradient, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"white" }}>{post.authorAvatar}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink-solid, white)" }}>{post.author}</div>
                <div style={{ fontSize:11, color:"rgba(var(--ink),var(--ta-35, .35))" }}>{post.authorRole}</div>
              </div>
            </div>
            <div style={{ width:1, height:24, background:"rgba(var(--ink),.1)" }}/>
            <span style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-40, .4))" }}>📅 {post.date}</span>
            <span style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-40, .4))" }}>⏱ {post.readTime}</span>
            <button onClick={copyLink} style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, padding:"6px 14px", borderRadius:20, background:"rgba(var(--ink),.06)", border:"1px solid rgba(var(--ink),.1)", color:"rgba(var(--ink),var(--ta-60, .6))", fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {copied ? "✓ Copied!" : "🔗 Share"}
            </button>
          </div>
        </div>
      </section>

      {/* Article content */}
      <div style={{ maxWidth:760, margin:"0 auto", padding:"0 24px 60px" }}>
        {post.content.map((block: any, i: number) => {
          if (block.type === "intro") return (
            <p key={i} style={{ fontSize:18, color:"rgba(var(--ink),var(--ta-70, .7))", lineHeight:1.85, margin:"0 0 32px", fontWeight:500, borderLeft:`3px solid ${post.color}`, paddingLeft:20 }}>
              {block.text}
            </p>
          );
          if (block.type === "h2") return (
            <h2 key={i} style={{ fontSize:"clamp(18px,3vw,24px)", fontWeight:800, color:"var(--ink-solid, white)", letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"40px 0 14px" }}>
              {block.text}
            </h2>
          );
          if (block.type === "p") return (
            <p key={i} style={{ fontSize:16, color:"rgba(var(--ink),var(--ta-60, .6))", lineHeight:1.85, margin:"0 0 20px" }}>
              {block.text}
            </p>
          );
          if (block.type === "list") return (
            <ul key={i} style={{ margin:"0 0 24px", paddingLeft:0, listStyle:"none" }}>
              {block.items.map((item: string, j: number) => (
                <li key={j} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:10, fontSize:15, color:"rgba(var(--ink),var(--ta-60, .6))", lineHeight:1.65 }}>
                  <span style={{ color:post.color, fontWeight:800, flexShrink:0, marginTop:2 }}>✓</span>
                  {item}
                </li>
              ))}
            </ul>
          );
          if (block.type === "numbered") return (
            <ol key={i} style={{ margin:"0 0 24px", paddingLeft:0, listStyle:"none" }}>
              {block.items.map((item: string, j: number) => (
                <li key={j} style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:12 }}>
                  <span style={{ width:28, height:28, borderRadius:8, background:`color-mix(in srgb, ${post.color} 12.5%, transparent)`, border:`1px solid color-mix(in srgb, ${post.color} 25.1%, transparent)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:post.color, flexShrink:0 }}>{j+1}</span>
                  <span style={{ fontSize:15, color:"rgba(var(--ink),var(--ta-60, .6))", lineHeight:1.65, paddingTop:4 }}>{item}</span>
                </li>
              ))}
            </ol>
          );
          if (block.type === "quote") return (
            <div key={i} style={{ margin:"32px 0", padding:"24px 28px", borderRadius:16, background:`color-mix(in srgb, ${post.color} 6.3%, transparent)`, border:`1px solid color-mix(in srgb, ${post.color} 18.8%, transparent)` }}>
              <div style={{ fontSize:40, color:post.color, lineHeight:1, marginBottom:10, opacity:.6 }}>&quot;</div>
              <p style={{ fontSize:16, color:"rgba(var(--ink),.75)", lineHeight:1.75, margin:"0 0 14px", fontStyle:"italic" }}>{block.text}</p>
              <div style={{ fontSize:13, color:post.color, fontWeight:700 }}>— {block.author}</div>
            </div>
          );
          // The direct answer to the title question, kept at the top of the
          // article. This is the passage answer engines lift, so it is marked up
          // as a self-contained block rather than folded into the intro prose.
          if (block.type === "answer") return (
            <div key={i} style={{ margin:"0 0 34px", padding:"26px 28px", borderRadius:18, background:`color-mix(in srgb, ${post.color} 7.1%, transparent)`, border:`1px solid color-mix(in srgb, ${post.color} 20.8%, transparent)` }}>
              <div style={{ fontSize:11, fontWeight:800, letterSpacing:".09em", color:post.color, marginBottom:12 }}>THE SHORT ANSWER</div>
              <p style={{ fontSize:16.5, color:"rgba(var(--ink),.82)", lineHeight:1.8, margin:0, fontWeight:500 }}>{block.text}</p>
            </div>
          );
          if (block.type === "h3") return (
            <h3 key={i} style={{ fontSize:"clamp(16px,2.4vw,19px)", fontWeight:800, color:"rgba(var(--ink),.92)", letterSpacing:"-.01em", margin:"30px 0 10px" }}>
              {block.href ? (
                <a href={block.href} target="_blank" rel="noopener noreferrer" style={{ color:"inherit", textDecoration:"underline", textDecorationColor:"rgba(var(--ink),.25)", textUnderlineOffset:4 }}>
                  {block.text} ↗
                </a>
              ) : block.text}
            </h3>
          );
          if (block.type === "note") return (
            <div key={i} style={{ margin:"28px 0", padding:"18px 22px", borderRadius:14, background:"rgba(var(--ink),.04)", borderLeft:"3px solid rgba(var(--ink),.22)" }}>
              <p style={{ fontSize:14.5, color:"rgba(var(--ink),var(--ta-55, .55))", lineHeight:1.75, margin:0 }}>{block.text}</p>
            </div>
          );
          if (block.type === "table") return (
            <figure key={i} style={{ margin:"28px 0" }}>
              {/* Wide tables scroll inside their own container so the page body never does. */}
              <div style={{ overflowX:"auto", borderRadius:14, border:"1px solid rgba(var(--ink),.09)" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:520, fontSize:13.5 }}>
                  <thead>
                    <tr>
                      {block.headers.map((h: string, hi: number) => (
                        <th key={hi} style={{ textAlign:"left", padding:"12px 14px", background:`color-mix(in srgb, ${post.color} 7.8%, transparent)`, color:post.color, fontWeight:800, fontSize:11.5, letterSpacing:".05em", textTransform:"uppercase", borderBottom:`1px solid color-mix(in srgb, ${post.color} 18.8%, transparent)`, whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row: string[], ri: number) => (
                      <tr key={ri} style={{ background: ri % 2 ? "rgba(var(--ink),.02)" : "transparent" }}>
                        {row.map((cell: string, ci: number) => (
                          <td key={ci} style={{ padding:"12px 14px", color: ci === 0 ? "rgba(var(--ink),.85)" : "rgba(var(--ink),var(--ta-58, .58))", fontWeight: ci === 0 ? 700 : 400, lineHeight:1.6, borderBottom:"1px solid rgba(var(--ink),.05)", verticalAlign:"top" }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {block.caption && (
                <figcaption style={{ fontSize:12, color:"rgba(var(--ink),var(--ta-32, .32))", marginTop:9, fontStyle:"italic" }}>{block.caption}</figcaption>
              )}
            </figure>
          );
          // Mirrored into FAQPage JSON-LD by the metadata layout — keep the
          // wording here identical to what is emitted there.
          if (block.type === "faq") return (
            <section key={i} style={{ margin:"44px 0 0" }}>
              <h2 style={{ fontSize:"clamp(18px,3vw,24px)", fontWeight:800, color:"var(--ink-solid, white)", letterSpacing:"-.02em", fontFamily:"Lora,serif", margin:"0 0 18px" }}>
                Frequently asked questions
              </h2>
              {block.items.map((f: { q: string; a: string }, fi: number) => (
                <div key={fi} style={{ padding:"18px 0", borderTop:"1px solid rgba(var(--ink),.07)" }}>
                  <h3 style={{ fontSize:15.5, fontWeight:800, color:"rgba(var(--ink),.9)", margin:"0 0 9px", lineHeight:1.45 }}>{f.q}</h3>
                  <p style={{ fontSize:15, color:"rgba(var(--ink),var(--ta-58, .58))", lineHeight:1.8, margin:0 }}>{f.a}</p>
                </div>
              ))}
            </section>
          );
          return null;
        })}

        {/* CTA */}
        <div style={{ marginTop:48, padding:"36px 32px", borderRadius:20, background:"linear-gradient(135deg,rgba(79,70,229,.2),rgba(124,58,237,.1))", border:"1px solid rgba(99,102,241,.3)", textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(var(--ink),var(--ta-50, .5))", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>READY TO START?</div>
          <h3 style={{ fontSize:22, fontWeight:800, color:"var(--ink-solid, white)", fontFamily:"Lora,serif", margin:"0 0 10px" }}>Start using FinovaOS today</h3>
          <p style={{ fontSize:14, color:"rgba(var(--ink),var(--ta-45, .45))", margin:"0 auto 22px", maxWidth:380 }}>Full platform access with expert support and priority response times.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <Link href="/signup" style={{ padding:"12px 28px", borderRadius:11, background:"linear-gradient(135deg,#4f46e5,#7c3aed)", color:"white", fontWeight:800, fontSize:13, textDecoration:"none" }}>
              Get Started →
            </Link>
            <Link href="/demo" style={{ padding:"12px 28px", borderRadius:11, background:"rgba(var(--ink),.08)", border:"1px solid rgba(var(--ink),.12)", color:"rgba(var(--ink),.8)", fontWeight:700, fontSize:13, textDecoration:"none" }}>
              Book a Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div style={{ maxWidth:760, margin:"0 auto", padding:"0 24px 100px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"rgba(var(--ink),var(--ta-40, .4))", textTransform:"uppercase", letterSpacing:".08em", marginBottom:20 }}>Related Articles</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:16 }}>
            {related.map((r: any) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} style={{ textDecoration:"none", display:"block", background:"rgba(var(--ink),.03)", borderRadius:14, border:"1px solid rgba(var(--ink),.07)", padding:"18px 16px", transition:"all .15s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(99,102,241,.08)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(99,102,241,.25)"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background="rgba(var(--ink),.03)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(var(--ink),.07)"; }}>
                <div style={{ height:3, borderRadius:2, background:r.color, marginBottom:12 }}/>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--ink-solid, white)", lineHeight:1.4, marginBottom:8 }}>{r.title}</div>
                <div style={{ fontSize:11, color:"rgba(var(--ink),var(--ta-30, .3))" }}>{r.readTime}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
