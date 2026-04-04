"use client";

import { useEffect, useState } from "react";

type Update = {
  id: string;
  title: string;
  body: string;
  type: string;
  version?: string;
  createdAt: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  feature: { label: "New Feature", icon: "✨", color: "#818cf8", bg: "rgba(129,140,248,.15)" },
  improvement: { label: "Improvement", icon: "⚡", color: "#38bdf8", bg: "rgba(56,189,248,.15)" },
  bugfix: { label: "Bug Fix", icon: "🐛", color: "#34d399", bg: "rgba(52,211,153,.15)" },
  announcement: { label: "Announcement", icon: "📣", color: "#fbbf24", bg: "rgba(251,191,36,.15)" },
  maintenance: { label: "Maintenance", icon: "🔧", color: "#f87171", bg: "rgba(248,113,113,.15)" },
};

export default function WhatsNew() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [open, setOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const [selected, setSelected] = useState<Update | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/updates")
      .then((r) => r.json())
      .then((d) => {
        const list: Update[] = d.updates || [];
        setUpdates(list);
        setLoading(false);
        if (!list.length) return;

        const lastSeen = localStorage.getItem("finova_last_update");
        const latest = list[0]?.id;
        if (latest && lastSeen !== latest) {
          setHasNew(true);
          setTimeout(() => setOpen(true), 1500);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  function dismiss() {
    if (updates[0]) localStorage.setItem("finova_last_update", updates[0].id);
    setHasNew(false);
    setOpen(false);
    setSelected(null);
  }

  function openManually() {
    setOpen(true);
  }

  if (loading || !updates.length) return null;

  return (
    <>
      <button
        onClick={openManually}
        title="What’s New"
        style={{
          position: "relative",
          padding: "8px",
          borderRadius: 10,
          cursor: "pointer",
          background: "rgba(255,255,255,.05)",
          border: "1px solid rgba(255,255,255,.08)",
          color: "rgba(255,255,255,.6)",
          fontSize: 16,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🚀
        {hasNew && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#f87171,#ef4444)",
              border: "2px solid #080c1e",
              fontSize: 9,
              fontWeight: 800,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {updates.length > 9 ? "9+" : updates.length}
          </span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            animation: "fadeIn .2s ease",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "85vh",
              background: "linear-gradient(160deg,#0d1035,#080c1e)",
              borderRadius: 22,
              border: "1.5px solid rgba(99,102,241,.3)",
              boxShadow: "0 30px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(99,102,241,.1)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "22px 28px",
                borderBottom: "1px solid rgba(255,255,255,.07)",
                background: "linear-gradient(135deg,rgba(79,70,229,.2),rgba(124,58,237,.1))",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>🚀</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-.02em" }}>
                      What’s New in FinovaOS
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                      {updates.length} update{updates.length !== 1 ? "s" : ""} · Latest first
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={dismiss}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.1)",
                  color: "rgba(255,255,255,.5)",
                  fontSize: 16,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              <div style={{ width: 280, borderRight: "1px solid rgba(255,255,255,.07)", overflowY: "auto", flexShrink: 0 }}>
                {updates.map((u, i) => {
                  const tc = TYPE_CONFIG[u.type] || TYPE_CONFIG.feature;
                  const isSelected = selected?.id === u.id || (!selected && i === 0);
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelected(u)}
                      style={{
                        padding: "14px 18px",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,.04)",
                        background: isSelected ? "rgba(99,102,241,.12)" : "transparent",
                        borderLeft: `3px solid ${isSelected ? tc.color : "transparent"}`,
                        transition: "all .15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        <span style={{ padding: "2px 8px", borderRadius: 20, background: tc.bg, color: tc.color, fontSize: 9, fontWeight: 800 }}>
                          {tc.icon} {tc.label}
                        </span>
                        {i === 0 && (
                          <span style={{ padding: "2px 6px", borderRadius: 20, background: "rgba(248,113,113,.15)", color: "#f87171", fontSize: 9, fontWeight: 800 }}>
                            NEW
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "white", lineHeight: 1.4 }}>{u.title}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 4 }}>
                        {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        {u.version && ` · ${u.version}`}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
                {(() => {
                  const u = selected || updates[0];
                  if (!u) return null;
                  const tc = TYPE_CONFIG[u.type] || TYPE_CONFIG.feature;
                  return (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                        <span style={{ padding: "4px 12px", borderRadius: 20, background: tc.bg, color: tc.color, fontSize: 11, fontWeight: 800 }}>
                          {tc.icon} {tc.label}
                        </span>
                        {u.version && (
                          <span style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                            {u.version}
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-.02em", lineHeight: 1.3, margin: "0 0 12px" }}>
                        {u.title}
                      </h2>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 20 }}>
                        {new Date(u.createdAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </div>
                      <div style={{ color: "rgba(255,255,255,.75)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{u.body}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
