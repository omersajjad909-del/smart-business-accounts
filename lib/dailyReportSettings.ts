import { prisma } from "@/lib/prisma";

export type DailyReportSettings = {
  enabled: boolean;
  sendTime: string; // "HH:MM" in `timezone`
  timezone: string; // IANA, e.g. "Asia/Karachi"
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
  phones: string[];
  emails: string[];
  lastSentDate: string | null; // local YYYY-MM-DD of the last report sent
  lastStatus: string | null;
};

export const DEFAULT_DAILY_REPORT_SETTINGS: DailyReportSettings = {
  enabled: false,
  sendTime: "21:00",
  timezone: "Asia/Karachi",
  whatsapp: true,
  sms: false,
  email: true,
  phones: [],
  emails: [],
  lastSentDate: null,
  lastStatus: null,
};

let tableReady: Promise<void> | null = null;

// Same ensure-table approach as lib/companyCommsConfig.ts — no migration step.
function ensureTable() {
  if (!tableReady) {
    tableReady = prisma
      .$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "DailyReportSetting" (
          "companyId" TEXT PRIMARY KEY REFERENCES "Company"("id") ON DELETE CASCADE,
          "enabled" BOOLEAN NOT NULL DEFAULT false,
          "sendTime" TEXT NOT NULL DEFAULT '21:00',
          "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
          "whatsapp" BOOLEAN NOT NULL DEFAULT true,
          "sms" BOOLEAN NOT NULL DEFAULT false,
          "email" BOOLEAN NOT NULL DEFAULT true,
          "phones" TEXT NOT NULL DEFAULT '',
          "emails" TEXT NOT NULL DEFAULT '',
          "lastSentDate" TEXT,
          "lastStatus" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      )
      .then(() => undefined)
      .catch((e) => {
        tableReady = null;
        throw e;
      });
  }
  return tableReady;
}

const splitList = (s: unknown) =>
  String(s || "")
    .split(/[,\n;]+/)
    .map((x) => x.trim())
    .filter(Boolean);

export function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function getDailyReportSettings(companyId: string): Promise<DailyReportSettings> {
  await ensureTable();
  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT * FROM "DailyReportSetting" WHERE "companyId" = ${companyId} LIMIT 1
  `;
  const r = rows[0];
  if (!r) return { ...DEFAULT_DAILY_REPORT_SETTINGS };
  return {
    enabled: !!r.enabled,
    sendTime: r.sendTime || "21:00",
    timezone: r.timezone || "Asia/Karachi",
    whatsapp: !!r.whatsapp,
    sms: !!r.sms,
    email: !!r.email,
    phones: splitList(r.phones),
    emails: splitList(r.emails),
    lastSentDate: r.lastSentDate ?? null,
    lastStatus: r.lastStatus ?? null,
  };
}

export async function saveDailyReportSettings(
  companyId: string,
  input: Partial<DailyReportSettings>,
): Promise<DailyReportSettings> {
  const cur = await getDailyReportSettings(companyId);
  const sendTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.sendTime ?? cur.sendTime))
    ? String(input.sendTime ?? cur.sendTime)
    : cur.sendTime;
  const tzIn = String(input.timezone ?? cur.timezone);
  const next: DailyReportSettings = {
    ...cur,
    enabled: input.enabled ?? cur.enabled,
    sendTime,
    timezone: isValidTimezone(tzIn) ? tzIn : cur.timezone,
    whatsapp: input.whatsapp ?? cur.whatsapp,
    sms: input.sms ?? cur.sms,
    email: input.email ?? cur.email,
    phones: (input.phones ?? cur.phones).map((p) => p.trim()).filter(Boolean).slice(0, 10),
    emails: (input.emails ?? cur.emails)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      .slice(0, 10),
  };
  await prisma.$executeRaw`
    INSERT INTO "DailyReportSetting"
      ("companyId","enabled","sendTime","timezone","whatsapp","sms","email","phones","emails","updatedAt")
    VALUES
      (${companyId}, ${next.enabled}, ${next.sendTime}, ${next.timezone}, ${next.whatsapp}, ${next.sms},
       ${next.email}, ${next.phones.join(",")}, ${next.emails.join(",")}, NOW())
    ON CONFLICT ("companyId") DO UPDATE SET
      "enabled" = EXCLUDED."enabled", "sendTime" = EXCLUDED."sendTime", "timezone" = EXCLUDED."timezone",
      "whatsapp" = EXCLUDED."whatsapp", "sms" = EXCLUDED."sms", "email" = EXCLUDED."email",
      "phones" = EXCLUDED."phones", "emails" = EXCLUDED."emails", "updatedAt" = NOW()
  `;
  return next;
}

export async function markDailyReportSent(companyId: string, localDate: string, status: string) {
  await ensureTable();
  await prisma.$executeRaw`
    INSERT INTO "DailyReportSetting" ("companyId","lastSentDate","lastStatus","updatedAt")
    VALUES (${companyId}, ${localDate}, ${status}, NOW())
    ON CONFLICT ("companyId") DO UPDATE SET
      "lastSentDate" = EXCLUDED."lastSentDate", "lastStatus" = EXCLUDED."lastStatus", "updatedAt" = NOW()
  `;
}

/** Companies that turned the report on. */
export async function listEnabledCompanyIds(): Promise<string[]> {
  await ensureTable();
  const rows = await prisma.$queryRaw<Array<{ companyId: string }>>`
    SELECT s."companyId" FROM "DailyReportSetting" s
    JOIN "Company" c ON c."id" = s."companyId"
    WHERE s."enabled" = true AND c."isActive" = true AND c."isDemo" = false
  `;
  return rows.map((r) => r.companyId);
}
