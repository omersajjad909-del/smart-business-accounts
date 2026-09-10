"use client";

/**
 * Stops the mouse wheel editing number inputs.
 *
 * A focused `<input type="number">` treats the scroll wheel as its stepper. So
 * an operator who typed 10 into Disc%, left the cursor there and scrolled the
 * page got 11, 12, 13 — and scrolling the other way ran it down through zero
 * into −10. The field they had already finished with changed underneath them,
 * with nothing on screen to say it had, and the invoice went out wrong.
 *
 * The fix is to take focus off the field the moment the wheel turns over it.
 * An unfocused number input ignores the wheel, so the value stays as typed and
 * the page scrolls normally — which is what the operator was asking for by
 * scrolling in the first place.
 *
 * Deliberately not `preventDefault()`: that would keep the value safe but eat
 * the scroll, leaving the page stuck whenever the cursor happened to rest on a
 * quantity cell. The listener stays passive so it can never block scrolling.
 *
 * One listener on the document rather than an `onWheel` on 153 files' worth of
 * inputs — and it covers the ones added later, which is the half that always
 * gets missed.
 */

import { useEffect } from "react";

export default function NumberWheelGuard() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.type === "number" &&
        // Only when the wheel is over the focused field itself. Scrolling
        // elsewhere on the page must not steal focus from what someone is
        // partway through typing.
        (active === e.target || active.contains(e.target as Node))
      ) {
        active.blur();
      }
    };

    document.addEventListener("wheel", onWheel, { passive: true });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}
