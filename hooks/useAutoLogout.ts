"use client";
import { useEffect, useRef, useState, useCallback } from "react";

const WARN_MS   = 25 * 60 * 1000; // 25 min idle → show warning
const LOGOUT_MS = 30 * 60 * 1000; // 30 min idle → auto-logout

export function useAutoLogout(onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(300);

  const warningActive    = useRef(false);
  const warnTimer        = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const logoutTimer      = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countdown        = useRef<ReturnType<typeof setInterval> | null>(null);
  const onLogoutRef      = useRef(onLogout);
  const lastActivityAt   = useRef(Date.now()); // wall-clock time of last activity
  onLogoutRef.current    = onLogout;

  const clearAll = useCallback(() => {
    if (warnTimer.current)   clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countdown.current)   clearInterval(countdown.current);
    warnTimer.current = logoutTimer.current = countdown.current = null;
  }, []);

  const arm = useCallback(() => {
    clearAll();
    warningActive.current  = false;
    lastActivityAt.current = Date.now();
    setShowWarning(false);

    warnTimer.current = setTimeout(() => {
      warningActive.current = true;
      setShowWarning(true);
      setSecondsLeft(300);
      countdown.current = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    }, WARN_MS);

    logoutTimer.current = setTimeout(() => {
      clearAll();
      warningActive.current = false;
      setShowWarning(false);
      onLogoutRef.current();
    }, LOGOUT_MS);
  }, [clearAll]);

  const stayLoggedIn = useCallback(() => arm(), [arm]);

  useEffect(() => {
    arm();
    const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;
    const handler = () => { if (!warningActive.current) arm(); };
    EVENTS.forEach(ev => window.addEventListener(ev, handler, { passive: true }));

    // Handles sleep/wake and background tab throttling:
    // when the tab becomes visible, check real elapsed time
    const onVisibility = () => {
      if (document.hidden) return;
      const elapsed = Date.now() - lastActivityAt.current;
      if (elapsed >= LOGOUT_MS) {
        clearAll();
        onLogoutRef.current();
      } else if (elapsed >= WARN_MS && !warningActive.current) {
        warningActive.current = true;
        setShowWarning(true);
        const remaining = Math.max(0, Math.floor((LOGOUT_MS - elapsed) / 1000));
        setSecondsLeft(remaining);
        countdown.current = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearAll();
      EVENTS.forEach(ev => window.removeEventListener(ev, handler));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [arm, clearAll]);

  return { showWarning, secondsLeft, stayLoggedIn };
}
