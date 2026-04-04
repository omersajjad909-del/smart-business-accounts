import type { Metadata } from "next";
import { ALL_POSTS } from "../posts";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://finovaos.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = ALL_POSTS[slug];

  if (!post) {
    return {
      title: "Blog Post | FinovaOS",
      description: "Read the latest business finance tips and accounting guides from FinovaOS.",
    };
  }

  return {
    title: post.title,
    description: post.excerpt || `${post.title} — Read this guide on business finance and accounting by the FinovaOS team.`,
    authors: post.author ? [{ name: post.author }] : undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      url: `${BASE}/blog/${post.id}`,
      siteName: "FinovaOS",
      images: [{ url: `${BASE}/icon.png`, width: 1200, height: 630, alt: post.title }],
      type: "article",
      publishedTime: post.date || undefined,
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

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
