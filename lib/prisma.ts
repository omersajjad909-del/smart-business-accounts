import { Prisma, PrismaClient } from "@prisma/client";
import { encryptField, decryptField } from "@/lib/fieldEncrypt";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaLogLevels: Prisma.LogLevel[] =
  process.env.DEBUG_PRISMA === "true"
    ? ["query", "error", "warn"]
    : ["error", "warn"];

/**
 * Sensitive fields per model — encrypted at rest with AES-256-GCM.
 * Only active when FIELD_ENCRYPTION_KEY env var is set.
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User:    ["phone"],
  Contact: ["email", "phone"],
  Company: ["phone", "taxId"],
};

/**
 * Critical audit log actions — immutable, cannot be deleted or updated.
 */
const IMMUTABLE_LOG_ACTIONS = new Set([
  "LOGIN", "LOGOUT", "LOGIN_FAILED",
  "2FA_ENABLED", "2FA_DISABLED", "2FA_VERIFIED",
  "PASSWORD_CHANGED", "PASSWORD_RESET",
  "PLAN_CHANGED", "SUBSCRIPTION_CANCELLED",
  "USER_CREATED", "USER_DELETED", "USER_ROLE_CHANGED",
  "COMPANY_CREATED", "COMPANY_DELETED",
  "PERMISSION_CHANGED",
  "EXPORT_DATA", "DATA_DELETED",
]);

// ── Encrypt helpers ──

function encryptData(model: string, data: Record<string, any>): Record<string, any> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data || !process.env.FIELD_ENCRYPTION_KEY) return data;
  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === "string" && result[field]) {
      result[field] = encryptField(result[field]);
    }
  }
  return result;
}

function decryptResult(model: string, result: any): any {
  if (!result || !process.env.FIELD_ENCRYPTION_KEY) return result;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return result;

  if (Array.isArray(result)) return result.map(r => decryptResult(model, r));

  const out = { ...result };
  for (const field of fields) {
    if (typeof out[field] === "string") {
      try { out[field] = decryptField(out[field]); } catch { /* legacy plaintext — leave as-is */ }
    }
  }
  return out;
}

// ── Build client with Prisma 5/6 $extends ──

function buildClient() {
  const base = new PrismaClient({ log: prismaLogLevels });

  return base.$extends({
    query: {
      // ── Immutable audit log protection ──
      activityLog: {
        async $allOperations({ operation, args, query }: any) {
          if (operation === "update" || operation === "updateMany") {
            throw new Error("ActivityLog records are immutable and cannot be updated.");
          }
          if (operation === "delete" || operation === "deleteMany") {
            const action = (args as any)?.where?.action;
            if (action && IMMUTABLE_LOG_ACTIONS.has(action)) {
              throw new Error(`ActivityLog action "${action}" is a security record and cannot be deleted.`);
            }
          }
          return query(args);
        },
      },

      // ── Field encryption: User ──
      user: {
        async create({ args, query }: any) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async update({ args, query }: any) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async upsert({ args, query }: any) {
          if (args.create) args.create = encryptData("User", args.create);
          if (args.update) args.update = encryptData("User", args.update);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findUnique({ args, query }: any) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findFirst({ args, query }: any) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findMany({ args, query }: any) {
          const result = await query(args);
          return decryptResult("User", result);
        },
      },

      // ── Field encryption: Contact ──
      contact: {
        async create({ args, query }: any) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async update({ args, query }: any) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async upsert({ args, query }: any) {
          if (args.create) args.create = encryptData("Contact", args.create);
          if (args.update) args.update = encryptData("Contact", args.update);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findUnique({ args, query }: any) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findFirst({ args, query }: any) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findMany({ args, query }: any) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
      },

      // ── Field encryption: Company ──
      company: {
        async create({ args, query }: any) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async update({ args, query }: any) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async upsert({ args, query }: any) {
          if (args.create) args.create = encryptData("Company", args.create);
          if (args.update) args.update = encryptData("Company", args.update);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findUnique({ args, query }: any) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findFirst({ args, query }: any) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findMany({ args, query }: any) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
      },
    },
  });
}

type ExtendedPrisma = ReturnType<typeof buildClient>;
const globalForExtended = global as unknown as { prisma: ExtendedPrisma };

export const prisma: ExtendedPrisma =
  globalForExtended.prisma ?? buildClient();

globalForExtended.prisma = prisma;
