"use client";

/**
 * A number field sitting on 0 selects that 0 when you click into it.
 *
 * Numeric inputs all over the dashboard start at 0 rather than empty, which is
 * right — a blank quantity box reads as "unknown" where a 0 reads as "none".
 * But clicking into one puts the caret after the zero, so typing 5 leaves 05,
 * and the operator has to notice and delete a character that was never theirs.
 * Across a form of twelve boxes that is twelve chances to post 05 instead of 5.
 *
 * Selecting the zero fixes it without changing any value: type a digit and it
 * replaces the selection, type 0 and you still have 0, click away having typed
 * nothing and nothing happened. It only ever fires on a field that is showing
 * a zero — a box holding 100 is left exactly alone, caret where you put it.
 *
 * Done here, once, on a delegated listener rather than by touching every
 * input. There are hundreds of them, they are written in a dozen styles, and a
 * fix applied by hand would be a fix that is missing from whichever form is
 * written next week.
 *
 * Nothing here writes to an input's value, so it cannot fight a controlled
 * React component: selection is not state, and React has no opinion about it.
 */

import { useEffect } from "react";

/** "0", "0.0", "0.00" — a zero however it is spelled. Not "0.5", not "10". */
const ZERO = /^0+(?:[.,]0*)?$/;

function isNumericField(el: Element | null): el is HTMLInputElement {
  if (!(el instanceof HTMLInputElement)) return false;
  if (el.readOnly || el.disabled) return false;
  if (el.type === "number") return true;
  // Some boxes are type=text with a numeric keypad hint — same field to an
  // operator, so the same behaviour.
  if (el.type !== "text") return false;
  const mode = (el.inputMode || el.getAttribute("inputmode") || "").toLowerCase();
  return mode === "decimal" || mode === "numeric";
}

export default function ZeroFieldSelect() {
  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      const el = event.target as Element | null;
      if (!isNumericField(el)) return;
      if (!ZERO.test(el.value.trim())) return;

      /* One frame late on purpose. A click focuses the field and *then* places
         the caret, so selecting during the focus event is undone a moment
         later by the browser's own caret placement. */
      requestAnimationFrame(() => {
        if (document.activeElement !== el) return;
        if (!ZERO.test(el.value.trim())) return;
        try {
          el.select();
        } catch {
          // Safari refuses select() on some number inputs. Nothing is lost —
          // the field simply behaves as it did before.
        }
      });
    }

    // focusin rather than focus: it bubbles, so one listener covers the page.
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return null;
}
