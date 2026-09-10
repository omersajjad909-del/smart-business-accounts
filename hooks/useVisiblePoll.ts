"use client";

/**
 * setInterval for polling, minus the requests nobody is waiting for.
 *
 * A plain `setInterval(fetchThing, 3000)` keeps firing in a tab that has been
 * sitting behind six other tabs since lunch. On Vercel every one of those is a
 * billed function invocation, and an agent dashboard left open all day was on
 * its own worth tens of thousands of them — for screens nobody was looking at.
 *
 * So the interval only runs while the tab is actually visible. Coming back into
 * view fires the callback immediately, before restarting the clock, so the
 * screen is never showing stale data while it waits out the first tick — which
 * means the pause is invisible to whoever is using it.
 *
 * The callback is held in a ref, so callers can pass an inline closure without
 * having to stabilise it: a re-render swaps in the new function without
 * restarting the interval.
 *
 * `activeKey` does double duty. It gates the poll by truthiness — a falsy key
 * means there is nothing to poll for yet — and any change to it restarts the
 * interval, which fires the callback straight away. Pass the id of whatever is
 * being watched (`activeKey={conversationId}`) and switching to a different one
 * refreshes immediately instead of showing the previous item's data until the
 * next tick.
 */

import { useEffect, useRef } from "react";

export function useVisiblePoll(
  fn: () => void | Promise<void>,
  intervalMs: number,
  activeKey: unknown = true,
) {
  const fnRef = useRef(fn);
  // After commit, not during render — a ref written mid-render is a tearing
  // hazard React lints against. Declared first so it lands before the poll
  // effect below ever reads it.
  useEffect(() => { fnRef.current = fn; });

  useEffect(() => {
    if (!activeKey) return;

    let handle: ReturnType<typeof setInterval> | null = null;
    const run = () => { void fnRef.current(); };

    function start() {
      if (handle) return;
      run(); // catch up on whatever changed while we were hidden
      handle = setInterval(run, intervalMs);
    }

    function stop() {
      if (!handle) return;
      clearInterval(handle);
      handle = null;
    }

    function onVisibilityChange() {
      if (document.hidden) stop();
      else start();
    }

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs, activeKey]);
}
