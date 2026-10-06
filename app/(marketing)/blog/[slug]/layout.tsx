import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ALL_POSTS } from "../posts";
import { SEO_ARTICLES } from "../seo-articles";
import { LOCAL_POSTS } from "./local-posts";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

/**
 * Same three sources, same merge order, as the article page's own ALL_POSTS
 * (BlogDetailPage in ./page.tsx) — so metadata never describes a different
 * page than the one that renders.
 *
 * LOCAL_POSTS was missing here until this fix: this object used to be
 * `{ ...ALL_POSTS, ...SEO_ARTICLES }`, so every post that exists only in
 * LOCAL_POSTS — the numeric-slug posts "1" through "15" — fell into the
 * `!post` branch below and shipped the generic "Blog Post | FinovaOS"
 * fallback with no canonical tag at all, while the page itself rendered
 * real, distinct content at that URL. That is exactly the shape of a
 * "Duplicate without user-selected canonical" GSC error: ~15 distinct pages
 * all missing a self-referencing canonical.
 */
const POSTS: Record<string, any> = { ...ALL_POSTS, ...LOCAL_POSTS, ...SEO_ARTICLES };

/** "August 17, 2026" → ISO. Returns undefined rather than an Invalid Date string. */
function toIso(date?: string): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS[slug];

  if (!post) {
    return {
      title: "Blog Post | FinovaOS",
      description: "Read the latest business finance tips and accounting guides from FinovaOS.",
    };
  }

  const published = toIso(post.date);
  // `slug` (the actual route param) rather than `post.id` — the LOCAL_POSTS
  // entries ("1" through "15") carry no `id` field at all, so building the
  // canonical from `post.id` emitted `/blog/undefined` for every one of them.
  const url = `${BASE}/blog/${slug}`;

  return {
    title: post.title,
    description: post.excerpt || `${post.title} — Read this guide on business finance and accounting by the FinovaOS team.`,
    keywords: post.keywords,
    authors: post.author ? [{ name: post.author }] : undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      url,
      siteName: "FinovaOS",
      images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: post.title }],
      type: "article",
      publishedTime: published,
      authors: post.author ? [post.author] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || post.title,
      images: [`${BASE}/icon.png`],
    },
    alternates: { canonical: url },
  };
}

/**
 * Structured data for the article.
 *
 * Emitted from the layout rather than the page because the page is a client
 * component — this keeps the JSON-LD in the server-rendered HTML where Google
 * and the AI answer-engine crawlers read it without executing JavaScript.
 *
 * FAQPage is only emitted when the article genuinely carries a visible FAQ
 * block. Marking up questions that are not on the page is a structured-data
 * violation and gets the whole page's rich results dropped.
 */
function buildJsonLd(slug: string) {
  const post = POSTS[slug];
  if (!post) return null;

  // Same `slug`-not-`post.id` fix as generateMetadata above — LOCAL_POSTS
  // entries have no `id` field.
  const url = `${BASE}/blog/${slug}`;
  const published = toIso(post.date);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: post.title,
      description: post.excerpt || post.title,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      image: `${BASE}/icon.png`,
      datePublished: published,
      dateModified: published,
      keywords: Array.isArray(post.keywords) ? post.keywords.join(", ") : undefined,
      author: { "@type": "Organization", name: post.author || "FinovaOS", url: BASE },
      publisher: {
        "@type": "Organization",
        name: "FinovaOS",
        url: BASE,
        logo: { "@type": "ImageObject", url: `${BASE}/icon.png` },
      },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumbs`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  const faqBlock = (post.content as any[] | undefined)?.find(
    (b) => b?.type === "faq" && Array.isArray(b.items) && b.items.length > 0
  );

  if (faqBlock) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faqBlock.items.map((item: { q: string; a: string }) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export default async function BlogPostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // The page below is a client component ("use client"), so it cannot call
  // notFound() itself — it rendered an "Article not found" message at HTTP
  // 200 for any unrecognized slug instead, which Search Console reports as a
  // soft 404 (content that reads as an error page but returns 200). This
  // layout is the one server-rendered file in the route, so the check lives
  // here: an unknown slug now returns a real 404 before the client page ever
  // mounts.
  if (!POSTS[slug]) notFound();

  const jsonLd = buildJsonLd(slug);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
