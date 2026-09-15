"use client";
// FILE: components/costing/NumberListInput.tsx
//
// A list of numbers typed as text — the stock widths a supplier sells, the
// pack sizes a line runs.
//
// Both the formula editor and the run screen used to wire this straight to the
// array:
//
//     value={list.join(", ")}
//     onChange={e => set(e.target.value.split(",").map(n => Number(n.trim()))
//                                      .filter(Number.isFinite))}
//
// which breaks in two ways at once, and they compound into something that
// looks like the box is fighting you.
//
// Number("") is 0, not NaN, and 0 passes isFinite. So clearing the 48 out of
// "48, 50, 52" leaves an empty first slot that comes straight back as a
// literal 0 — a stock width of zero inches, silently in the list, which
// bestFitStock will happily consider.
//
// And because the text shown is re-derived from the parsed array on every
// keystroke, the string React puts back is never quite the string that was
// typed ("48," becomes "48"), so the caret is pushed to the end of the box
// mid-edit. Clear one number and the cursor jumps to the far end of the line.
//
// So the text being typed lives here, and only finished numbers leave. The
// array is followed when it changes from somewhere else — a formula loaded, a
// template opened — but never while it is this box doing the changing.

import { useState } from "react";

/** Empty slots are dropped, not read as zero. "48, , 52" is two widths. */
export function parseNumberList(text: string): number[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function NumberListInput({
  value,
  onChange,
  style,
  placeholder = "48, 50, 52",
  title,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  title?: string;
}) {
  const [text, setText] = useState(() => value.join(", "));

  /* What this box last sent out. Anything different arriving from the parent
     came from somewhere else and is worth adopting; an echo of our own last
     change is not, and adopting it is what used to move the caret.

     Held in state rather than a ref, and compared during render rather than in
     an effect: this is React's own shape for adjusting state when a prop
     changes, and it re-renders before the browser paints, so the box never
     shows the stale text for a frame. */
  const [sent, setSent] = useState(() => value.join(","));
  const incoming = value.join(",");
  if (incoming !== sent) {
    setSent(incoming);
    setText(value.join(", "));
  }

  return (
    <input
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const parsed = parseNumberList(next);
        setSent(parsed.join(","));
        onChange(parsed);
      }}
      onBlur={() => {
        // Tidy up only once the box is left alone — spacing and stray commas
        // are fixed here rather than under a cursor that is still typing.
        const parsed = parseNumberList(text);
        setText(parsed.join(", "));
        setSent(parsed.join(","));
      }}
      placeholder={placeholder}
      title={title}
      style={style}
      inputMode="decimal"
    />
  );
}
