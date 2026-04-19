"use client";

import { useEffect, useRef, useState, forwardRef } from "react";

function toDisplay(iso: string) {
  if (!iso || iso.length < 10) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}-${m}-${y}`;
}

function toISO(display: string): string | null {
  const match = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const n = new Date(`${y}-${m}-${d}`);
  if (isNaN(n.getTime())) return null;
  return `${y}-${m}-${d}`;
}

function autoFormat(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

interface Props {
  value: string;                  // YYYY-MM-DD
  onChange: (iso: string) => void;
  style?: React.CSSProperties;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const DateInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, style, autoFocus, onKeyDown }, ref) => {
    const [display, setDisplay] = useState(() => toDisplay(value));

    useEffect(() => {
      setDisplay(toDisplay(value));
    }, [value]);

    return (
      <input
        ref={ref}
        type="text"
        placeholder="DD-MM-YYYY"
        value={display}
        style={style}
        autoFocus={autoFocus}
        onFocus={e => e.target.select()}
        onChange={e => {
          const formatted = autoFormat(e.target.value);
          setDisplay(formatted);
          const iso = toISO(formatted);
          if (iso) onChange(iso);
        }}
        onKeyDown={onKeyDown}
      />
    );
  }
);

DateInput.displayName = "DateInput";
