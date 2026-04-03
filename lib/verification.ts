import { createHmac, randomInt } from "crypto";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/emailTemplates";
import { sendVerificationSms } from "@/lib/sms";

export type VerificationChannel = "email" | "sms";

export const OTP_TTL_MS = 15 * 60 * 1000;

export function isOtpDevMode() {
  return false;
}

function otpHash(code: string) {
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
  return createHmac("sha256", secret).update(code).digest("hex");
}

export function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function normalizePhone(phone: string | null | undefined) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits}`;
}

export function maskEmail(email: string) {
  const [local, domain] = String(email || "").split("@");
  if (!local || !domain) return email;
  const prefix = local.slice(0, 2);
  return `${prefix}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export function maskPhone(phone: string) {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  if (!digits) return "";
  const visible = digits.slice(-4);
  return `+${"*".repeat(Math.max(digits.length - 4, 4))}${visible}`;
}

export function getAvailableChannels(targets: {
  email?: string | null;
  phone?: string | null;
}): VerificationChannel[] {
  const channels: VerificationChannel[] = [];
  if (targets.email) channels.push("email");
  if (targets.phone) channels.push("sms");
  return channels;
}

export async function getStoredPhoneForUser(userId: string) {
  const phoneLog = await prisma.activityLog.findMany({
    where: {
      userId,
      action: { in: ["USER_PHONE_SET", "SIGNUP"] },
    },
    orderBy: { createdAt: "desc" },
    select: { details: true },
    take: 10,
  });

  for (const log of phoneLog) {
    const details = safeJson(log.details);
    const normalized = normalizePhone(details?.phone);
    if (normalized) return normalized;
  }

  return null;
}

export async function getUserVerificationTargets(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) return null;

  const phone = await getStoredPhoneForUser(userId);

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    phone,
    availableChannels: getAvailableChannels({ email: user.email, phone }),
  };
}

export async function isUserVerified(userId: string) {
  const log = await prisma.activityLog.findFirst({
    where: {
      userId,
      action: { in: ["ACCOUNT_VERIFIED", "EMAIL_VERIFIED"] },
    },
    select: { id: true },
  });

  return !!log;
}

export async function getLatestVerificationLog(
  companyId: string,
  userId: string,
) {
  return prisma.activityLog.findFirst({
    where: {
      companyId,
      userId,
      action: { in: ["VERIFY_OTP", "EMAIL_OTP"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, details: true, createdAt: true },
  });
}

export async function createVerificationCodeLog(params: {
  companyId: string;
  userId: string;
  channel: VerificationChannel;
  target: string;
}) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expMs = Date.now() + OTP_TTL_MS;

  await prisma.activityLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      action: "VERIFY_OTP",
      details: JSON.stringify({
        h: otpHash(code),
        exp: expMs,
        channel: params.channel,
        target: params.target,
      }),
    },
  });

  return { code, expMs };
}

export async function sendVerificationCode(params: {
  name: string;
  email: string;
  phone?: string | null;
  channel: VerificationChannel;
  code: string;
}) {
  if (params.channel === "sms") {
    if (!params.phone) {
      return {
        success: false,
        actualChannel: "sms" as VerificationChannel,
        error: "Phone number not available",
      };
    }

    const sms = await sendVerificationSms(params.phone, params.name, params.code);
    return {
      success: sms.success,
      actualChannel: "sms" as VerificationChannel,
      transport: sms.provider,
      error: sms.error,
    };
  }

  const emailResult = await sendEmail({
    to: params.email,
    subject: "Your Finova verification code",
    html: emailTemplates.otp(
      { name: params.name, email: params.email },
      params.code,
    ),
  });

  return {
    success: emailResult.success,
    actualChannel: "email" as VerificationChannel,
    transport: "email",
    error: emailResult.error,
  };
}

export function getMaskedTarget(
  channel: VerificationChannel,
  targets: { email: string; phone?: string | null },
) {
  return channel === "sms"
    ? maskPhone(targets.phone || "")
    : maskEmail(targets.email);
}

export function getOtpHash(code: string) {
  return otpHash(code);
}
