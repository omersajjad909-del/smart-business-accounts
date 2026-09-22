import { redirect } from "next/navigation";

// This was a parallel, earlier implementation of the same live-chat agent
// dashboard that now lives at /admin/chat ("Support Inbox" in the admin nav).
// Nothing in the app links here anymore (confirmed — only robots.ts still
// disallows the path for crawlers), so anyone who lands on it is following an
// old bookmark. Redirect rather than delete outright, matching the same
// pattern already used by app/dashboard/chat/page.tsx.
export default function ChatAdminRedirect() {
  redirect("/admin/chat");
}
