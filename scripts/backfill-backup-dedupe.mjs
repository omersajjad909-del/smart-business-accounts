// backfill.tmp.ts
import { createHash } from "crypto";

// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// lib/fieldEncrypt.ts
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";
var ALGORITHM = "aes-256-gcm";
var PREFIX = "enc:v1:";
var IV_BYTES = 12;
function getKey() {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY env var is missing or invalid. Generate one: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  return Buffer.from(hex, "hex");
}
function encryptField(plaintext) {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext;
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}
function decryptField(value) {
  if (!value) return value;
  if (!value.startsWith(PREFIX)) return value;
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted field format");
  const [ivHex, tagHex, ctHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ctHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// lib/prisma.ts
var globalForPrisma = global;
var prismaLogLevels = process.env.DEBUG_PRISMA === "true" ? ["query", "error", "warn"] : ["error", "warn"];
var ENCRYPTED_FIELDS = {
  User: ["phone"],
  Contact: ["email", "phone"],
  Company: ["phone", "taxId"]
};
var IMMUTABLE_LOG_ACTIONS = /* @__PURE__ */ new Set([
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
  "2FA_ENABLED",
  "2FA_DISABLED",
  "2FA_VERIFIED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "PLAN_CHANGED",
  "SUBSCRIPTION_CANCELLED",
  "USER_CREATED",
  "USER_DELETED",
  "USER_ROLE_CHANGED",
  "COMPANY_CREATED",
  "COMPANY_DELETED",
  "PERMISSION_CHANGED",
  "EXPORT_DATA",
  "DATA_DELETED"
]);
function encryptData(model, data) {
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
function decryptResult(model, result) {
  if (!result || !process.env.FIELD_ENCRYPTION_KEY) return result;
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return result;
  if (Array.isArray(result)) return result.map((r) => decryptResult(model, r));
  const out = { ...result };
  for (const field of fields) {
    if (typeof out[field] === "string") {
      try {
        out[field] = decryptField(out[field]);
      } catch {
      }
    }
  }
  return out;
}
function buildClient() {
  const base = new PrismaClient({ log: prismaLogLevels });
  return base.$extends({
    query: {
      // ── Immutable audit log protection ──
      activityLog: {
        async $allOperations({ operation, args, query }) {
          if (operation === "update" || operation === "updateMany") {
            throw new Error("ActivityLog records are immutable and cannot be updated.");
          }
          if (operation === "delete" || operation === "deleteMany") {
            const action = args?.where?.action;
            if (action && IMMUTABLE_LOG_ACTIONS.has(action)) {
              throw new Error(`ActivityLog action "${action}" is a security record and cannot be deleted.`);
            }
          }
          return query(args);
        }
      },
      // ── Field encryption: User ──
      user: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("User", args.data);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("User", args.create);
          if (args.update) args.update = encryptData("User", args.update);
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("User", result);
        }
      },
      // ── Field encryption: Contact ──
      contact: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("Contact", args.data);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("Contact", args.create);
          if (args.update) args.update = encryptData("Contact", args.update);
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("Contact", result);
        }
      },
      // ── Field encryption: Company ──
      company: {
        async create({ args, query }) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async update({ args, query }) {
          if (args.data) args.data = encryptData("Company", args.data);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async upsert({ args, query }) {
          if (args.create) args.create = encryptData("Company", args.create);
          if (args.update) args.update = encryptData("Company", args.update);
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findUnique({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findFirst({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return decryptResult("Company", result);
        }
      }
    }
  });
}
var globalForExtended = global;
var prisma = globalForExtended.prisma ?? buildClient();
globalForExtended.prisma = prisma;

// lib/backup.ts
import { gzipSync, gunzipSync } from "zlib";
var GZIP_PREFIX = "gz:";
function unpackSnapshot(stored) {
  if (!stored.startsWith(GZIP_PREFIX)) return stored;
  return gunzipSync(Buffer.from(stored.slice(GZIP_PREFIX.length), "base64")).toString("utf8");
}

// backfill.tmp.ts
import { gzipSync as gzipSync2 } from "zlib";
var rows = await prisma.systemBackup.findMany({
  where: { status: "COMPLETED", metadata: { not: null } },
  orderBy: { createdAt: "asc" },
  select: { id: true, companyId: true, fileName: true, metadata: true, fileSize: true, contentHash: true, verifiedAt: true, createdAt: true }
});
console.log(`
${rows.length} completed snapshots
`);
var groups = /* @__PURE__ */ new Map();
var recompressed = 0;
var bytesBefore = 0;
var bytesAfter = 0;
for (const r of rows) {
  const json = unpackSnapshot(r.metadata);
  const parsed = JSON.parse(json);
  const { exportedAt, ...content } = parsed;
  const hash = createHash("sha256").update(JSON.stringify(content)).digest("hex");
  bytesBefore += Buffer.byteLength(r.metadata, "utf8");
  const wasPlain = !r.metadata.startsWith("gz:");
  const packed = wasPlain ? "gz:" + gzipSync2(Buffer.from(json, "utf8"), { level: 9 }).toString("base64") : r.metadata;
  const size = Buffer.byteLength(packed, "utf8");
  bytesAfter += size;
  await prisma.systemBackup.update({
    where: { id: r.id },
    data: {
      contentHash: hash,
      verifiedAt: r.verifiedAt ?? r.createdAt,
      ...wasPlain ? { metadata: packed, fileSize: size } : {}
    }
  });
  if (wasPlain) recompressed++;
  const key = `${r.companyId}:${hash}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}
console.log(`recompressed ${recompressed} rows`);
console.log(`payload bytes: ${(bytesBefore / 1024 / 1024).toFixed(2)} MB -> ${(bytesAfter / 1024 / 1024).toFixed(2)} MB
`);
var removed = 0;
var reclaimed = 0;
for (const [, group] of groups) {
  if (group.length < 2) continue;
  const [keep, ...dupes] = group;
  const newest = group[group.length - 1];
  await prisma.systemBackup.update({
    where: { id: keep.id },
    data: { verifiedAt: newest.createdAt }
  });
  const res = await prisma.systemBackup.deleteMany({ where: { id: { in: dupes.map((d) => d.id) } } });
  removed += res.count;
  reclaimed += dupes.reduce((a, d) => a + (d.fileSize || 0), 0);
  console.log(`  ${keep.fileName.slice(0, 46)} \u2014 kept 1, removed ${res.count} identical copy/copies`);
}
var after = await prisma.systemBackup.aggregate({ _sum: { fileSize: true }, _count: { _all: true } });
console.log(`
removed ${removed} duplicate snapshot(s)`);
console.log(`now: ${after._count._all} snapshots, ${((after._sum.fileSize || 0) / 1024).toFixed(1)} KB reported storage`);
await prisma.$disconnect();
