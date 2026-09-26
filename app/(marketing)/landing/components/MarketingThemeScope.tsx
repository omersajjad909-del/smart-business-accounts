"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { isLightReadyPath } from "@/lib/marketingTheme"

/**
 * Root element of the marketing layout. Decided on the client because the
 * layout itself does not re-render on client-side navigation between pages.
 * Pages without a light design get `.mk-force-dark`, which puts every theme
 * variable back to its dark value (see globals.css).
 */
export default function MarketingThemeScope({ className, children }: { className?: string; children: ReactNode }) {
  const lightReady = isLightReadyPath(usePathname())
  return (
    <div className={`${className ?? ""}${lightReady ? "" : " mk-force-dark"}`} style={{ background: "var(--mk-page-bg, #060919)" }}>
      {children}
    </div>
  )
}
