/**
 * lib/ai/aiStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Where the AI console pages keep anything worth keeping.
 *
 * Most of these pages compute on demand and persist nothing — a churn score is
 * only true for as long as the underlying data is, so caching it would be a way
 * to act on a stale number. Four of them genuinely need memory: the objection
 * library, competitor snapshots (a diff needs a previous state to diff against),
 * SEO drafts, and generated case studies.
 *
 * Those four do not get four new Prisma models. Adding a model here means a
 * hand-run migration against Supabase, and this project already carries one
 * migration that has been "pending" long enough to make the feature it belongs
 * to inert. Four more is four more ways to ship a page that silently does
 * nothing. So this stores JSON on `AdminActionLog`, which is already a
 * general-purpose audit table with a `details String? @db.Text` column and an
 * index on `action` — the same trick /api/admin/settings already uses with
 * `ActivityLog`. No migration, nothing to forget to run.
 *
 * The tradeoff is honest: no relational queries over these rows and no
 * per-field index. Everything here is a small list read by one operator, so
 * neither is missed. If one of these grows into a real feature with real
 * volume, promote it to its own model then — the read/write surface is these
 * five functions.
 */

import { prisma } from "@/lib/prisma";

/** Marks a row as an AI artifact rather than an actual audited admin action. */
export const AI_ASSET_ACTION = "AI_ASSET";

export type AiAssetKind =
  | "objection"
  | "competitor-snapshot"
  | "seo-draft"
  | "case-study"
  | "brand-profile";

export type AiAsset<T = unknown> = {
  id: string;
  kind: AiAssetKind;
  /** Stable identifier within a kind — a domain, a slug. Blank when unkeyed. */
  key: string;
  title: string;
  data: T;
  authorEmail: string;
  createdAt: string;
};

const db = prisma as any;

function toAsset<T>(row: any): AiAsset<T> {
  let data: unknown = null;
  try {
    data = row.details ? JSON.parse(row.details) : null;
  } catch {
    // A row whose JSON no longer parses is a row written by an older shape of
    // this code. Surface it as empty rather than throwing the whole list away.
    data = null;
  }
  return {
    id: row.id,
    kind: row.targetType as AiAssetKind,
    key: row.targetId || "",
    title: row.targetLabel || "",
    data: data as T,
    authorEmail: row.adminEmail || "",
    createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
  };
}

/**
 * Write one artifact.
 *
 * When `key` is given, an existing artifact of the same kind and key is
 * replaced rather than duplicated — so re-scraping a competitor updates that
 * competitor instead of growing the list by one every week.
 */
export async function saveAiAsset<T>(opts: {
  kind: AiAssetKind;
  key?: string;
  title: string;
  data: T;
  admin: { id: string; email: string };
}): Promise<AiAsset<T>> {
  const key = opts.key || "";

  if (key) {
    await db.adminActionLog.deleteMany({
      where: { action: AI_ASSET_ACTION, targetType: opts.kind, targetId: key },
    }).catch(() => null);
  }

  const row = await db.adminActionLog.create({
    data: {
      adminId: opts.admin.id,
      adminEmail: opts.admin.email,
      action: AI_ASSET_ACTION,
      targetType: opts.kind,
      targetId: key || null,
      targetLabel: opts.title.slice(0, 200),
      details: JSON.stringify(opts.data),
    },
  });

  return toAsset<T>(row);
}

/** Every artifact of one kind, newest first. */
export async function listAiAssets<T>(kind: AiAssetKind, take = 100): Promise<AiAsset<T>[]> {
  const rows = await db.adminActionLog.findMany({
    where: { action: AI_ASSET_ACTION, targetType: kind },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 500),
  }).catch(() => []);
  return rows.map((r: any) => toAsset<T>(r));
}

/** One artifact by kind + key, or null. */
export async function getAiAsset<T>(kind: AiAssetKind, key: string): Promise<AiAsset<T> | null> {
  const row = await db.adminActionLog.findFirst({
    where: { action: AI_ASSET_ACTION, targetType: kind, targetId: key },
    orderBy: { createdAt: "desc" },
  }).catch(() => null);
  return row ? toAsset<T>(row) : null;
}

/**
 * Delete one artifact by row id.
 *
 * Scoped to `AI_ASSET_ACTION` on purpose: this id arrives from the browser, and
 * without the scope a crafted request would delete a genuine audit-log entry.
 */
export async function deleteAiAsset(id: string): Promise<boolean> {
  const res = await db.adminActionLog.deleteMany({
    where: { id, action: AI_ASSET_ACTION },
  }).catch(() => ({ count: 0 }));
  return (res?.count || 0) > 0;
}
