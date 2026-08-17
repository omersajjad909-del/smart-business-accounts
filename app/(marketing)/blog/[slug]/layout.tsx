import type { Metadata } from "next";
import { ALL_POSTS } from "../posts";
import { SEO_ARTICLES } from "../seo-articles";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://www.finovaos.app";

/** Same merge order as the article page, so metadata never describes a different page than the one that renders. */
const POSTS: Record<string, any> = { ...ALL_POSTS, ...SEO_ARTICLES };

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

  return {
    title: post.title,
    description: post.excerpt || `${post.title} — Read this guide on business finance and accounting by the FinovaOS team.`,
    keywords: post.keywords,
    authors: post.author ? [{ name: post.author }] : undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      url: `${BASE}/blog/${post.id}`,
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
    alternates: { canonical: `${BASE}/blog/${post.id}` },
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

  const url = `${BASE}/blog/${post.id}`;
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
