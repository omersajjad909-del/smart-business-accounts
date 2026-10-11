/**
 * Drops an event into the platform admin's bell (the navbar notifications).
 *
 * Admin notifications are the Notification rows with no userId — a row with a
 * userId belongs to that one customer. This never throws: a failed
 * notification must not fail the signup, payment or message that caused it.
 */

import { prisma } from "@/lib/prisma";

export type AdminNotifyType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export async function notifyAdmins(input: {
  title: string;
  message?: string;
  type?: AdminNotifyType;
  /** Admin page the bell should open, e.g. "/admin/trials". */
  link?: string;
}): Promise<void> {
  try {
    await (prisma as any).notification.create({
      data: {
        title: input.title.slice(0, 160),
        message: (input.message || "").slice(0, 500),
        type: input.type || "INFO",
        link: input.link || null,
        isRead: false,
      },
    });
  } catch (e) {
    console.error("[adminNotify] failed:", e);
  }
}
