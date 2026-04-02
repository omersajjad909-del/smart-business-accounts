import { Suspense } from "react";
import ClientAcceptInvite from "./client";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ClientAcceptInvite />
    </Suspense>
  );
}
