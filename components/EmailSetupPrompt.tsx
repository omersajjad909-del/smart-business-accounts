"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/hasPermission";
import { PERMISSIONS } from "@/lib/permissions";

const NOT_CONFIGURED = "EMAIL_NOT_CONFIGURED";
const EVENT = "finova:email-not-configured";

let patched = false;

// Every document/report email goes through the same API, which answers 409 +
// EMAIL_NOT_CONFIGURED when the company has no SMTP login of its own. Watching
// fetch once, here, means every send button — present and future — gets the
// same popup without each page having to handle the case itself.
function patchFetch() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await original(...args);
    if (res.status === 409) {
      res.clone().json().then((d) => {
        if (d?.code === NOT_CONFIGURED) window.dispatchEvent(new Event(EVENT));
      }).catch(() => {});
    }
    return res;
  };
}

export default function EmailSetupPrompt() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    patchFetch();
    const show = () => setOpen(true);
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);

  if (!open) return null;

  const canSetup = hasPermission(getCurrentUser(), PERMISSIONS.EMAIL_SETTINGS);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="email-setup-title"
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "var(--card-bg-solid, #1c1917)", color: "var(--ink-solid, #fff)", border: "1px solid rgba(var(--ink),.12)", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,.4)", fontFamily: "'Outfit','Inter',sans-serif" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>✉️</div>
        <h2 id="email-setup-title" style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>Your email is not set up</h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 20px", opacity: 0.75 }}>
          {canSetup
            ? "To send invoices and documents from your own email address, please set up your email first (SMTP / app password). Until then, nothing can be sent."
            : "Your company has not set up its email yet, so this message could not be sent. Please ask your administrator to set up the company email."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={() => setOpen(false)}
            style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(var(--ink),.15)", background: "transparent", color: "inherit", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
          {canSetup && (
            <button onClick={() => { setOpen(false); router.push("/dashboard/email-settings"); }}
              style={{ padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Set up email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
