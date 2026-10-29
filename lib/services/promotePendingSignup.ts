import type { BusinessType } from "@/lib/businessModules";
import { seedMinimalChart } from "@/lib/services/accountsSeed";
import { currencyByCountry } from "@/lib/currency";
import { prisma } from "@/lib/prisma";
import { trialCompanyFields } from "@/lib/trial";
import { safeJson } from "@/lib/verification";
import { notifyAdmins } from "@/lib/adminNotify";

/**
 * Turn a verified PendingSignup into the real thing.
 *
 * This is the only place a signup becomes a Company — nothing upstream writes to
 * the real tables, so an unverified address can never own a tenant. One
 * transaction, so a failure halfway cannot leave a company with no owner.
 */
export async function promotePendingSignup(pendingId: string) {
  const pending = await prisma.pendingSignup.findUnique({ where: { id: pendingId } });
  if (!pending) return null;

  const data = safeJson(pending.payload);
  if (!data) return null;

  const country = data.countryCode ? String(data.countryCode).toUpperCase() : "US";
  const customModuleIds: string[] = Array.isArray(data.customModuleIds)
    ? data.customModuleIds
    : [];

  const { company, user } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: String(data.companyName),
        isActive: true,
        country,
        // currencyByCountry returns null for countries it has no mapping for —
        // fall back to USD rather than writing null into a non-nullable column.
        baseCurrency: currencyByCountry(country) || "USD",
        businessType: (data.businessType ? String(data.businessType) : "trading") as BusinessType,
        businessSetupDone: Boolean(data.businessType),
        // A trial signup starts TRIALING on the trial plan with an end date;
        // a paid signup waits INACTIVE for its first payment.
        ...(data.trial
          ? trialCompanyFields(String(data.trialSource || "web"), data.phone ? String(data.phone) : null)
          : { plan: String(data.planCode || "STARTER"), subscriptionStatus: "INACTIVE" }),
        activeModules: customModuleIds.length > 0 ? customModuleIds.join(",") : null,
        customPrice: data.customPrice ?? null,
      },
    });

    const user = await tx.user.create({
      data: {
        name: String(data.name),
        email: pending.email,
        password: String(data.passwordHash),
        role: "ADMIN",
        defaultCompanyId: company.id,
      },
    });

    await tx.userCompany.create({
      data: { userId: user.id, companyId: company.id, isDefault: true },
    });

    // Seed the chart the app posts to (CASH, AR-CUST, AP-SUP, SALES, …, each
    // with its partyType). Until now it was only created lazily, when an ADMIN
    // opened the full Chart of Accounts list — so a customer who went straight
    // to invoices found no customer, supplier, cash or bank to choose from and
    // could not record anything. Paying companies logged in for weeks this way.
    await seedMinimalChart(tx, company.id);

    // The pending row is consumed inside the same transaction: if anything above
    // fails, the visitor still has a valid code to retry with.
    await tx.pendingSignup.delete({ where: { id: pending.id } });

    return { company, user };
  });

  // Funnel breadcrumbs. Non-critical — a failure here must not undo a signup
  // that already succeeded, so they sit outside the transaction.
  if (data.countryCode) {
    await prisma.activityLog
      .create({
        data: {
          companyId: company.id,
          userId: null,
          action: "COMPANY_COUNTRY_SET",
          details: JSON.stringify({ country }),
        },
      })
      .catch(() => {});
  }

  await notifyAdmins({
    title: data.trial ? "🆕 New free trial" : "🆕 New signup",
    message: [company.name, user.email, data.phone, country].filter(Boolean).join(" · "),
    type: "SUCCESS",
    link: data.trial ? "/admin/trials" : "/admin/companies",
  });

  await prisma.activityLog
    .create({
      data: {
        companyId: company.id,
        userId: user.id,
        action: "SIGNUP",
        details: JSON.stringify({
          email: user.email,
          phone: data.phone || null,
          plan: String(data.planCode || "STARTER"),
          teamSize: data.teamSize || null,
          referralSource: data.referralSource || null,
        }),
      },
    })
    .catch(() => {});

  if (data.phone) {
    await prisma.activityLog
      .create({
        data: {
          companyId: company.id,
          userId: user.id,
          action: "USER_PHONE_SET",
          details: JSON.stringify({ phone: data.phone, source: "signup" }),
        },
      })
      .catch(() => {});
  }

  if (data.referralCode) {
    try {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: String(data.referralCode).toUpperCase().trim() },
        select: { id: true },
      });
      if (referrer && referrer.id !== user.id) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            refereeEmail: user.email,
            status: "signed_up",
          },
        });
      }
    } catch { /* non-critical */ }
  }

  return { companyId: company.id, userId: user.id };
}
