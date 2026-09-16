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

/** Selects the whole field, where the browser allows it on that input type. */
function selectAll(el: HTMLInputElement): void {
  try {
    el.select();
  } catch {
    // Some browsers refuse select() on a number input. Nothing is lost — the
    // field simply behaves as it did before.
  }
}

export default function ZeroFieldSelect() {
  useEffect(() => {
    /* The one that actually has to work.
    
       Selecting on focus depends on winning a race with the browser's own
       caret placement, and it does not always win — which is why the zero was
       still there to type in front of. This fires at the moment a character is
       about to be inserted, long after any caret has settled, so there is no
       timing to lose: the zero is selected and the keystroke replaces it.
       
       Only for typing. A paste, a delete, an arrow key are all left alone. */
    function onBeforeInput(event: Event) {
      const el = event.target as Element | null;
      if (!isNumericField(el)) return;
      const inputType = (event as InputEvent).inputType;
      if (inputType !== "insertText") return;
      if (!ZERO.test(el.value.trim())) return;
      // Already selected — the keystroke will replace it on its own. Reading
      // the selection off a number input throws in Firefox, so a failure here
      // just means "assume not selected" rather than skipping the fix.
      try {
        if (el.selectionStart === 0 && el.selectionEnd === el.value.length) return;
      } catch { /* selection unreadable on this input type */ }
      selectAll(el);
    }

    /* Belt and braces, and the reason the selection is visible: this one
       highlights the zero as soon as the box is clicked, so it is obvious the
       digit will replace rather than follow it. Where it loses the race the
       handler above still catches the keystroke. */
    function onFocusIn(event: FocusEvent) {
      const el = event.target as Element | null;
      if (!isNumericField(el)) return;
      if (!ZERO.test(el.value.trim())) return;
      requestAnimationFrame(() => {
        if (document.activeElement !== el) return;
        if (!ZERO.test(el.value.trim())) return;
        selectAll(el);
      });
    }

    // focusin and beforeinput both bubble, so one listener each covers the page.
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("beforeinput", onBeforeInput, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("beforeinput", onBeforeInput, true);
    };
  }, []);

  return null;
}
