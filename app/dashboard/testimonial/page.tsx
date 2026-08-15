import { redirect } from "next/navigation";

/**
 * "Write a Review" used to live here, asking for a star rating and a written
 * review — the exact same thing the Feedback & Support page now asks for under
 * its ⭐ Review type (rating + publish consent, which an admin then publishes as
 * a public testimonial). Two pages for one job only confused people, so this
 * stays only as a redirect for old links and bookmarks.
 */
export default function TestimonialRedirect() {
  redirect("/dashboard/feedback");
}
