// FILE: app/(marketing)/ComingSoonGate.tsx
//
// What the public sees while the site is held back before launch. Rendered in
// place of the marketing pages by the layout — never for admins, who keep the
// real site so they can review it before pressing Launch Now.

export default function ComingSoonGate() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(160deg,#080c1e 0%,#0c0f2e 50%,#080c1e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Outfit','DM Sans',system-ui,sans-serif",
        color: "white",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 460 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            margin: "0 auto 26px",
            background: "linear-gradient(135deg,#6366f1,#4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            boxShadow: "0 20px 60px rgba(79,70,229,.45)",
          }}
        >
          🚀
        </div>

        <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: "-.6px", marginBottom: 14 }}>
          Something big is coming
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,.5)", marginBottom: 32 }}>
          FinovaOS — cloud accounting &amp; ERP built for growing businesses — is
          almost ready. We are putting the finishing touches in place.
        </p>

        <a
          href="/auth"
          style={{
            display: "inline-block",
            padding: "13px 30px",
            borderRadius: 12,
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            boxShadow: "0 10px 30px rgba(79,70,229,.35)",
          }}
        >
          Existing customer? Sign in →
        </a>

        <div style={{ marginTop: 34, fontSize: 12.5, color: "rgba(255,255,255,.28)" }}>
          Questions? <a href="mailto:hello@finovaos.app" style={{ color: "#a5b4fc", textDecoration: "none" }}>hello@finovaos.app</a>
        </div>
      </div>
    </main>
  );
}
