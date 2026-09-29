import { headers } from "next/headers";
import { redirect } from "next/navigation";

// This used to render its own full copy of the homepage — same Hero,
// Pricing, FAQ, etc. as app/page.tsx, just assembled a second time. Nothing
// links to /landing (Ahrefs flags it as an orphan) and Google was indexing
// it as duplicate content against the real homepage. The host-specific
// redirects below are the only part of this route that still matters — kept
// so any old /landing links on finovaforge.com/usefinova.app/etc. still land
// in the right place — everything else now falls through to the homepage.
async function getRequestHost() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    ""
  ).toLowerCase();
}

export default async function LandingPage() {
  const host = await getRequestHost();

  if (host === "finovaforge.com" || host === "www.finovaforge.com") {
    redirect("/forge");
  }

  if (host === "usefinova.app" || host.endsWith(".usefinova.app")) {
    redirect("/auth");
  }

  if (host === "admin.finovaos.app" || host.endsWith(".admin.finovaos.app")) {
    redirect("/admin/login");
  }

  if (host === "ai.finovaos.app" || host.endsWith(".ai.finovaos.app")) {
    redirect("/dashboard/ai");
  }

  redirect("/");
}
