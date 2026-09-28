"use client";
// FILE: components/costing/LengthUnitSwitch.tsx
//
// Inch / CM toggle for typing a bag size. Local customers quote a bag in
// inches, export parties in centimetres — same formula, different ruler. See
// lib/formulaUnits.ts for why this only changes what is shown and typed.

import type { LengthUnit } from "@/lib/formulaUnits";

const OPTIONS: [LengthUnit, string][] = [["in", "Inch"], ["cm", "CM"]];

export function LengthUnitSwitch({ value, onChange }: { value: LengthUnit; onChange: (next: LengthUnit) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Length unit"
      title="Type the bag size in inches or centimetres. The costing and every result stay in inches."
      style={{
        display: "inline-flex", gap: 3, padding: 3, borderRadius: 11,
        background: "rgba(var(--ink),.05)", border: "1px solid rgba(var(--ink),.09)",
      }}
    >
      {OPTIONS.map(([unit, text]) => {
        const on = value === unit;
        return (
          <button
            key={unit}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(unit)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              cursor: "pointer", border: "none", fontFamily: "inherit",
              background: on ? "rgba(99,102,241,.28)" : "transparent",
              color: on ? "var(--tx-c7d2fe, #c7d2fe)" : "rgba(var(--ink),var(--ta-45, .45))",
            }}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
