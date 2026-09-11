import { redirect } from "next/navigation";

/**
 * An older, thinner stock report used to live here — item, quantity, average
 * rate and nothing else. Reports → Stock does the same job and more (purchased
 * and sold columns, stock value, CSV, print), and that is the one on the menu,
 * so this was a second page nobody could reach and nobody maintained.
 *
 * Kept as a redirect rather than deleted so old links and bookmarks still land
 * somewhere useful — the same treatment /dashboard/testimonial got when it
 * folded into Feedback.
 */
export default function StockReportRedirect() {
  redirect("/dashboard/reports/stock");
}
