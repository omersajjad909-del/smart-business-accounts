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

    // Does a programmatic scroll move the page at all? On a desktop browser it
    // does; if it does not here, the document is not the scroller iOS thinks it
    // is, and the numbers below say which element is.
    let progScroll = "(pending)";
    setTimeout(() => {
      const before = window.scrollY;
      window.scrollTo(0, 250);
      setTimeout(() => {
        progScroll = `${Math.round(before)} -> ${Math.round(window.scrollY)}`;
        window.scrollTo(0, before);
      }, 120);
    }, 2500);

    const tick = setInterval(() => {
      const d = document.documentElement;
      const b = document.body;
      const ds = getComputedStyle(d);
      const bs = getComputedStyle(b);
      const root = document.querySelector(".dashboard-root") as HTMLElement | null;
      const rs = root ? getComputedStyle(root) : null;
      const nav = document.querySelector(".dashboard-root aside nav") as HTMLElement | null;
      const pane = document.querySelector(".dashboard-content-scroll") as HTMLElement | null;
      const ps = pane ? getComputedStyle(pane) : null;
      const se = document.scrollingElement as HTMLElement | null;
      const vv = (window as any).visualViewport;

      setInfo([
        `win ${window.innerWidth}x${window.innerHeight} vv ${vv ? Math.round(vv.height) : "-"}  scrollY ${Math.round(window.scrollY)} (max ${Math.round(maxScrollY)})`,
        `scroller=${se ? se.tagName : "?"} clientH ${se?.clientHeight} scrollH ${se?.scrollHeight} top ${Math.round(se?.scrollTop || 0)}`,
        `htmlEl clientH ${d.clientHeight} scrollH ${d.scrollHeight} offH ${d.offsetHeight}`,
        `bodyEl clientH ${b.clientHeight} scrollH ${b.scrollHeight} h:${bs.height} minH:${bs.minHeight}`,
        `html oy:${ds.overflowY} ox:${ds.overflowX} h:${ds.height} minH:${ds.minHeight}`,
        root ? `root h:${rs!.height} minH:${rs!.minHeight} disp:${rs!.display} pos:${rs!.position}` : "root: none",
        pane ? `pane oy:${ps!.overflowY} h:${ps!.height} clientH ${pane.clientHeight} scrollH ${pane.scrollHeight} top ${Math.round(pane.scrollTop)}` : "pane: none",
        nav ? `sidebar-nav oy:${getComputedStyle(nav).overflowY} scrollH ${nav.scrollHeight} clientH ${nav.clientHeight}` : "sidebar-nav: none",
        `programmatic scrollTo(250): ${progScroll}`,
        `touchmove ${moves} | prevented ${prevented} | html.class ${d.className || "-"}`,
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
