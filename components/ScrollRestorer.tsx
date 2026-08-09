"use client";

import { useEffect } from "react";

export default function ScrollRestorer() {
  useEffect(() => {
    function restore() {
      try {
        const doc = document.documentElement;
        // Remove our lock class if present
        if (doc.classList.contains("fnv-lock-scroll")) doc.classList.remove("fnv-lock-scroll");
        // Clear any inline overflow styles that might persist
        if (document.body.style.overflow) document.body.style.overflow = "";
        if (document.documentElement.style.overflow) document.documentElement.style.overflow = "";
        // Ensure heights are flexible
        document.body.style.height = "auto";
        document.documentElement.style.height = "auto";
      } catch (e) {
        // ignore
      }
    }

    // Run immediately and again shortly after hydration to catch late changes
    restore();
    const t1 = setTimeout(restore, 120);
    const t2 = setTimeout(restore, 600);

    // Detect large fixed/sticky elements that cover the viewport and may capture touch events.
    function clearBlockingFixed() {
      try {
        const elems = Array.from(document.querySelectorAll("*"));
        for (const el of elems) {
          if (!(el instanceof HTMLElement)) continue;
          const s = getComputedStyle(el);
          if (s.display === "none" || s.visibility === "hidden" || el.hasAttribute("aria-hidden") ) continue;
          const pos = s.position;
          if (pos !== "fixed" && pos !== "sticky") continue;
          const rect = el.getBoundingClientRect();
          const coversVertically = rect.top <= 2 && rect.bottom >= window.innerHeight - 2;
          const coversMostly = rect.height >= window.innerHeight * 0.9 || coversVertically;
          if (!coversMostly) continue;
          // Skip legitimate dialogs / modals
          if (el.closest('[role="dialog"], [aria-modal="true"], .fin-admin-overlay, .fnv-chat-widget')) continue;
          // If already handled, skip
          if (el.dataset.fnvBlockCleared === "1") continue;
          // Store original pointer-events so we can restore if needed
          el.dataset.fnvOriginalPointer = el.style.pointerEvents || "";
          el.style.pointerEvents = "none";
          el.dataset.fnvBlockCleared = "1";
          // expose in console for debugging
          // eslint-disable-next-line no-console
          console.warn("ScrollRestorer: disabled pointer-events on likely-blocking element:", el);
        }
      } catch (e) {
        // ignore
      }
    }

    // Run shortly after restore steps
    const t3 = setTimeout(clearBlockingFixed, 180);

    // Watch for elements being added/changed and clear them if they look blocking
    const mo2 = new MutationObserver(() => {
      clearBlockingFixed();
    });
    mo2.observe(document.body, { childList: true, subtree: true });

    // If something sets overflow:hidden later, remove it unless there is a clear reason.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && (m.attributeName === "style" || m.attributeName === "class")) {
          // If body/html has inline overflow hidden, remove it
          if (document.body.style.overflow === "hidden" || document.documentElement.style.overflow === "hidden") {
            // Allow legitimate overlays to use the `fnv-lock-scroll` class — if present, skip removal.
            if (!document.documentElement.classList.contains("fnv-lock-scroll")) {
              document.body.style.overflow = "";
              document.documentElement.style.overflow = "";
            }
          }
        }
      }
    });

    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      mo.disconnect();
    };
  }, []);

  return null;
}
