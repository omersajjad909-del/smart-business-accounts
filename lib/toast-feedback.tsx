"use client";

import toast from "react-hot-toast";

type ToastTone = "default" | "success" | "error";

const FONT = "'Outfit','Inter',sans-serif";
const PANEL = "rgba(12,16,36,.98)";
const BORDER = "rgba(255,255,255,.1)";
const TEXT = "#f8fafc";
const MUTED = "rgba(255,255,255,.68)";

function toastFrame(
  title: string,
  message: string,
  actions?: React.ReactNode,
  accent = "#818cf8"
) {
  return (t: { id: string }) => (
    <div
      style={{
        minWidth: 320,
        maxWidth: 440,
        padding: 16,
        borderRadius: 16,
        background: PANEL,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 20px 60px rgba(2,6,23,.45)",
        color: TEXT,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: accent,
            boxShadow: `0 0 16px ${accent}`,
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: MUTED }}>{message}</div>
      {actions ? <div style={{ marginTop: 14 }}>{actions}</div> : null}
      <button
        onClick={() => toast.dismiss(t.id)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

let _confirmActive = false;

export function confirmToast(message: string, title = "Please confirm") {
  // Prevent duplicate confirm dialogs
  if (_confirmActive) return Promise.resolve(false);
  _confirmActive = true;

  // Dismiss any lingering toasts first
  toast.dismiss();

  return new Promise<boolean>((resolve) => {
    function done(value: boolean, id: string) {
      _confirmActive = false;
      toast.dismiss(id);
      resolve(value);
    }

    toast.custom(
      (t) =>
        toastFrame(
          title,
          message,
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              onClick={() => done(false, t.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: MUTED,
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => done(true, t.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff",
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Confirm
            </button>
          </div>,
          "#818cf8"
        )(t),
      { duration: Infinity }
    );
  });
}

export function alertToast(message: string, tone: ToastTone = "default", title?: string) {
  const config =
    tone === "success"
      ? { accent: "#34d399", resolvedTitle: title || "Done" }
      : tone === "error"
        ? { accent: "#f87171", resolvedTitle: title || "Something went wrong" }
        : { accent: "#818cf8", resolvedTitle: title || "Notice" };

  toast.custom(
    toastFrame(config.resolvedTitle, message, undefined, config.accent),
    { duration: 3500 }
  );
}
