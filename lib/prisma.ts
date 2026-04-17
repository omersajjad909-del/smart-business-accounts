import { Prisma, PrismaClient } from "@prisma/client";
import { encryptField, decryptField } from "@/lib/fieldEncrypt";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prismaLogLevels: Prisma.LogLevel[] =
  process.env.DEBUG_PRISMA === "true"
    ? ["query", "error", "warn"]
    : ["error", "warn"];

/**
 * Sensitive fields per model that should be encrypted at rest.
 * Only string fields that contain PII or confidential data.
 */
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  User:    ["phone"],
  Contact: ["email", "phone"],
  Company: ["phone", "taxId"],
};

function encryptModelFields(model: string, data: Record<string, any>): Record<string, any> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields || !data) return data;
  const result = { ...data };
  for (const field of fields) {
    if (typeof result[field] === "string" && result[field]) {
      result[field] = encryptField(result[field]);
    }
  }
  return result;
}

function decryptModelResult(model: string, result: any): any {
  if (!result) return result;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return result;

  if (Array.isArray(result)) {
    return result.map(item => decryptModelResult(model, item));
  }

  const decrypted = { ...result };
  for (const field of fields) {
    if (typeof decrypted[field] === "string") {
      try {
        decrypted[field] = decryptField(decrypted[field]);
      } catch {
        // If decryption fails (e.g. plaintext legacy value), leave as-is
      }
    }
  }
  return decrypted;
}

/**
 * Critical audit log actions that must never be deleted or modified.
 * These form the immutable security trail.
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

function createPrismaClient() {
  const client = new PrismaClient({ log: prismaLogLevels });

  // ── Immutable audit log protection ──
  client.$use(async (params, next) => {
    if (params.model === "ActivityLog") {
      if (params.action === "update" || params.action === "updateMany") {
        // Block all updates to audit logs — they are append-only
        throw new Error("ActivityLog records are immutable and cannot be updated.");
      }
      if (params.action === "delete") {
        // Allow deletion only for non-critical actions (e.g. OTP codes)
        // Critical security actions are permanently protected
        const where = params.args?.where;
        if (where?.action && IMMUTABLE_LOG_ACTIONS.has(where.action)) {
          throw new Error(`ActivityLog action "${where.action}" is immutable and cannot be deleted.`);
        }
      }
      if (params.action === "deleteMany") {
        const where = params.args?.where;
        if (where?.action && IMMUTABLE_LOG_ACTIONS.has(where.action)) {
          throw new Error(`ActivityLog action "${where.action}" is immutable and cannot be deleted.`);
        }
      }
    }
    return next(params);
  });

  // Only apply encryption middleware if the key is configured
  if (process.env.FIELD_ENCRYPTION_KEY) {
    client.$use(async (params, next) => {
      const model = params.model as string | undefined;

      // ── Encrypt on write ──
      if (model && ENCRYPTED_FIELDS[model]) {
        const writeActions = ["create", "update", "upsert", "createMany", "updateMany"];
        if (writeActions.includes(params.action)) {
          if (params.args?.data) {
            if (Array.isArray(params.args.data)) {
              params.args.data = params.args.data.map((d: any) => encryptModelFields(model, d));
            } else {
              params.args.data = encryptModelFields(model, params.args.data);
            }
          }
          // upsert has separate create/update
          if (params.action === "upsert") {
            if (params.args?.create) params.args.create = encryptModelFields(model, params.args.create);
            if (params.args?.update) params.args.update = encryptModelFields(model, params.args.update);
          }
        }
      }

      const result = await next(params);

      // ── Decrypt on read ──
      if (model && ENCRYPTED_FIELDS[model]) {
        const readActions = ["findUnique", "findFirst", "findMany", "create", "update", "upsert"];
        if (readActions.includes(params.action)) {
          return decryptModelResult(model, result);
        }
      }

      return result;
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

// Cache singleton to prevent new client per serverless invocation
globalForPrisma.prisma = prisma;
