"use client";

import { useEffect, useState } from "react";

/**
 * On-screen scroll diagnostic. Renders only when the URL carries
 * `?debug=scroll`, so it never appears for a normal visitor.
 *
 * It exists because the dashboard scrolls in every desktop browser and in
 * Chrome's device emulation, but not on a real iPhone — and iOS Safari has no
 * console to inspect. Rather than keep guessing from the code, this reports the
 * three facts that separate the possible causes:
 *
 *   · touchmove fires at all      → the gesture is reaching the page
 *   · touchmove is defaultPrevented → something is cancelling the scroll
 *   · scrollY moves while dragging → the page can actually scroll
 *
 * Delete this component once the cause is found.
 */
export default function ScrollDebugPanel() {
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).get("debug")) return;
    setOn(true);

    let moves = 0;
    let prevented = 0;
    let maxScrollY = 0;

    const onTouchMove = (e: TouchEvent) => {
      moves++;
      if (e.defaultPrevented) prevented++;
    };
    // Passive so this listener itself can never be the thing blocking scroll.
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    const onScroll = () => {
      maxScrollY = Math.max(maxScrollY, window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const tick = setInterval(() => {
      const d = document.documentElement;
      const b = document.body;
      const ds = getComputedStyle(d);
      const bs = getComputedStyle(b);
      const root = document.querySelector(".dashboard-root") as HTMLElement | null;
      const rs = root ? getComputedStyle(root) : null;
      const nav = document.querySelector(".dashboard-root aside nav") as HTMLElement | null;

      setInfo([
        `win ${window.innerWidth}x${window.innerHeight}  scrollY ${Math.round(window.scrollY)} (max ${Math.round(maxScrollY)})`,
        `doc scrollH ${d.scrollHeight}  body scrollH ${b.scrollHeight}`,
        `html oy:${ds.overflowY} ox:${ds.overflowX} ta:${ds.touchAction} h:${ds.height}`,
        `body oy:${bs.overflowY} ta:${bs.touchAction} h:${bs.height}`,
        root ? `root oy:${rs!.overflowY} ta:${rs!.touchAction} h:${rs!.height} pos:${rs!.position}` : "root: none",
        nav ? `sidebar-nav oy:${getComputedStyle(nav).overflowY} scrollH ${nav.scrollHeight} clientH ${nav.clientHeight} scrollTop ${Math.round(nav.scrollTop)}` : "sidebar-nav: none",
        `html.class: ${d.className || "(none)"}`,
        `touchmove fired ${moves}  |  defaultPrevented ${prevented}`,
      ]);
    }, 400);

    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      clearInterval(tick);
    };
  }, []);

  if (!on) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 6,
        right: 6,
        bottom: 6,
        zIndex: 2147483647,
        background: "rgba(0,0,0,.9)",
        color: "#7CFC9B",
        font: "10px/1.35 ui-monospace,Menlo,monospace",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #2f7",
        // Must not swallow the very gesture we are measuring.
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
      }}
    >
      {info.join("\n")}
    </div>
  );
}
