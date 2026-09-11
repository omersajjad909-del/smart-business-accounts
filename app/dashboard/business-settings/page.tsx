import { redirect } from "next/navigation";

/**
 * Business Settings folded into the Admin Control Center.
 *
 * The two screens had grown into near-copies of each other: company identity,
 * invoice contact, tax registration, bank details and print preferences were
 * editable on both, writing to the same settings record. Whichever one somebody
 * happened to open, they had no way of knowing the other existed — and a value
 * corrected in one looked unchanged if they went back to the other.
 *
 * Admin Control is the survivor because it already carried everything this page
 * did and more: Branches, Team & Access, Permissions, Backup, and the branch
 * code this page never asked for. What was better here — the province picker
 * and the list of bank accounts — moved across before this became a redirect.
 *
 * What is not carried over: the Current Plan card, the Plan Features list and
 * Quick Links. The plan already shows in Admin Control's own header row and on
 * Billing, and Quick Links pointed at Admin Control among others, which from
 * inside Admin Control is a link to itself.
 *
 * A redirect rather than a deletion so old links and bookmarks still land
 * somewhere useful.
 */
export default function BusinessSettingsRedirect() {
  redirect("/dashboard/admin-control");
}
