export const FINOVA_USER_PROFILE_UPDATED = "finova:user-profile-updated";
export const FINOVA_COMPANY_PROFILE_UPDATED = "finova:company-profile-updated";

export type FinovaUserProfileDetail = {
  name?: string;
  email?: string;
  avatar?: string | null;
};

export type FinovaCompanyProfileDetail = {
  name?: string;
  logoUrl?: string | null;
  country?: string | null;
  baseCurrency?: string;
};

export function dispatchUserProfileUpdated(detail: FinovaUserProfileDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FINOVA_USER_PROFILE_UPDATED, { detail }));
}

export function dispatchCompanyProfileUpdated(detail: FinovaCompanyProfileDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FINOVA_COMPANY_PROFILE_UPDATED, { detail }));
}
