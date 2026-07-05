"use client";
import { useState } from "react";

const ff = "'Outfit','Inter',sans-serif";

interface PrintActionBarProps {
  onPrintA4: () => void;
  onPrintThermal?: () => void;
  thermalLabel?: string;
  onEmail?: () => Promise<void> | void;
  onWhatsApp?: () => Promise<void> | void;
  onSms?: () => void;
  onEdit: () => void;
  onNew: () => void;
  newLabel?: string;
  editLabel?: string;
  extraActions?: { label: string; icon: string; onClick: () => void }[];
}

export function PrintActionBar({
  onPrintA4,
  onPrintThermal,
  thermalLabel = "Thermal",
  onEmail,
  onWhatsApp,
  onSms,
  onEdit,
  onNew,
  newLabel = "New",
  editLabel = "Edit",
  extraActions = [],
}: PrintActionBarProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const handle = async (key: string, fn?: () => Promise<void> | void) => {
    if (!fn) return;
    setOpen(false);
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  const hasShare = onEmail || onWhatsApp || onSms;

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {/* Print / Share dropdown */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: "#18181b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 16px",
            fontSize: 14,
            fontFamily: ff,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {busy ? `${busy}…` : "Print / Share"}
          <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
        </button>

        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              background: "var(--card-bg, #1c1c1e)",
              border: "1px solid var(--border, #333)",
              borderRadius: 10,
              padding: "6px 0",
              zIndex: 50,
              minWidth: 190,
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            }}>
              <DropItem icon="🖨️" label="Print A4" onClick={() => { setOpen(false); onPrintA4(); }} />
              {onPrintThermal && (
                <DropItem icon="🧾" label={`Print ${thermalLabel}`} onClick={() => { setOpen(false); onPrintThermal(); }} />
              )}

              {(hasShare || extraActions.length > 0) && <Divider />}

              {onEmail && (
                <DropItem icon="✉️" label="Send Email" loading={busy === "Email"} onClick={() => handle("Email", onEmail)} />
              )}
              {onWhatsApp && (
                <DropItem icon="💬" label="WhatsApp" loading={busy === "WhatsApp"} onClick={() => handle("WhatsApp", onWhatsApp)} />
              )}
              {onSms && (
                <DropItem icon="📱" label="Send SMS" loading={busy === "SMS"} onClick={() => handle("SMS", onSms)} />
              )}

              {extraActions.length > 0 && <Divider />}
              {extraActions.map(a => (
                <DropItem key={a.label} icon={a.icon} label={a.label} onClick={() => { setOpen(false); a.onClick(); }} />
              ))}
            </div>
          </>
        )}
      </div>

      <button onClick={onEdit} style={ghostBtn}>{editLabel}</button>
      <button onClick={onNew} style={ghostBtn}>{newLabel}</button>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-muted, #888)",
  border: "1px solid var(--border, #333)",
  borderRadius: 8,
  padding: "9px 16px",
  fontSize: 14,
  fontFamily: ff,
  cursor: "pointer",
};

function DropItem({
  icon, label, onClick, loading,
}: { icon: string; label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        background: "none",
        border: "none",
        padding: "10px 16px",
        cursor: loading ? "not-allowed" : "pointer",
        color: "var(--text-primary, #f0f0f0)",
        fontSize: 13,
        fontFamily: ff,
        textAlign: "left",
        opacity: loading ? 0.5 : 1,
        transition: "background 0.1s",
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget).style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={e => { (e.currentTarget).style.background = "none"; }}
    >
      <span style={{ fontSize: 15, minWidth: 20 }}>{icon}</span>
      {loading ? `${label}…` : label}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border, #2a2a2a)", margin: "4px 0" }} />;
}
