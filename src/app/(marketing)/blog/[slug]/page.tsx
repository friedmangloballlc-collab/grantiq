import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar, Share2 } from "lucide-react";
import { BLOG_POSTS, getBlogPost, getRelatedPosts } from "@/lib/blog/posts";

// ---------------------------------------------------------------------------
// Static Params & Metadata
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  return {
    title: post.seoTitle,
    description: post.seoDescription,
    alternates: {
      canonical: `https://grantiq.com/blog/${post.slug}`,
    },
    openGraph: {
      title: post.seoTitle,
      description: post.seoDescription,
      url: `https://grantiq.com/blog/${post.slug}`,
      siteName: "GrantIQ",
      type: "article",
      publishedTime: post.publishedAt,
      authors: ["GrantIQ Team"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle,
      description: post.seoDescription,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  "Grant Strategy": "bg-brand-teal/10 text-brand-teal",
  "Grant Writing": "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  "Nonprofit Operations": "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  "AI & Technology": "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  "Industry Guides": "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);

  const postUrl = `https://grantiq.com/blog/${post.slug}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}`;
  const linkedinShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent(post.title)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription,
    author: {
      "@type": "Organization",
      name: "GrantIQ Team",
      url: "https://grantiq.com",
    },
    publisher: {
      "@type": "Organization",
      name: "GrantIQ",
      url: "https://grantiq.com",
    },
    datePublished: post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto py-12 px-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-warm-400 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-warm-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-warm-600 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-warm-600 dark:text-warm-400 truncate max-w-xs">{post.title}</span>
        </nav>

        {/* Article Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                CATEGORY_COLORS[post.category] ?? "bg-warm-100 text-warm-700"
              }`}
            >
              {post.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-warm-900 dark:text-warm-50 leading-tight mb-4">
            {post.title}
          </h1>

          <p className="text-lg text-warm-500 leading-relaxed mb-6">{post.excerpt}</p>

          <div className="flex flex-wrap items-center gap-5 text-sm text-warm-400 pb-6 border-b border-warm-200 dark:border-warm-800">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readingTime} min read
            </span>
            <span className="text-warm-400">By GrantIQ Team</span>
          </div>
        </header>

        {/* Article Body */}
        <article
          className="prose prose-warm prose-lg max-w-none
            prose-headings:font-bold prose-headings:text-warm-900 dark:prose-headings:text-warm-50
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-warm-700 dark:prose-p:text-warm-300 prose-p:leading-relaxed prose-p:mb-4
            prose-ul:text-warm-700 dark:prose-ul:text-warm-300
            prose-li:mb-1
            prose-strong:text-warm-900 dark:prose-strong:text-warm-100
            prose-a:text-brand-teal prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Share Buttons */}
        <div className="mt-12 pt-8 border-t border-warm-200 dark:border-warm-800">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-warm-500 font-medium">
              <Share2 className="h-4 w-4" />
              Share this article
            </span>
            <a
              href={linkedinShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-warm-200 dark:border-warm-700 text-sm text-warm-600 dark:text-warm-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
              LinkedIn
            </a>
            <a
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-warm-200 dark:border-warm-700 text-sm text-warm-600 dark:text-warm-400 hover:border-sky-400 hover:text-sky-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
              X (Twitter)
            </a>
            <button
              type="button"
              onClick={undefined}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-warm-200 dark:border-warm-700 text-sm text-warm-600 dark:text-warm-400 hover:border-warm-400 transition-colors copy-link-btn"
              data-url={postUrl}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy link
            </button>
          </div>
        </article>

        {/* CTA */}
        <div className="mt-12 p-8 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-2xl border border-brand-teal/20 text-center">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">
            Find grants that match YOUR organization
          </h2>
          <p className="text-warm-500 mt-2 max-w-xl mx-auto">
            GrantIQ&apos;s AI matches your nonprofit to 5,000+ active grants — federal, foundation,
            state, and corporate — ranked by how well you qualify.
          </p>
          <Link
            href="/signup"
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-teal hover:bg-brand-teal-dark text-white text-sm font-medium transition-colors"
          >
            Get Your Free Grant Match Report →
          </Link>
        </div>

        {/* Back link */}
        <div className="mt-10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 dark:hover:text-warm-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all articles
          </Link>
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-warm-200 dark:border-warm-800">
            <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50 mb-6">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((relPost) => (
                <Link key={relPost.slug} href={`/blog/${relPost.slug}`} className="group block">
                  <article className="h-full rounded-xl border border-warm-200 dark:border-warm-800 p-5 hover:border-brand-teal/50 hover:shadow-md transition-all bg-white dark:bg-warm-900 flex flex-col">
                    <div className="mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          CATEGORY_COLORS[relPost.category] ?? "bg-warm-100 text-warm-700"
                        }`}
                      >
                        {relPost.category}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-warm-900 dark:text-warm-50 group-hover:text-brand-teal transition-colors mb-2 leading-snug flex-1">
                      {relPost.title}
                    </h3>
                    <p className="text-xs text-warm-400 mt-auto pt-3 border-t border-warm-100 dark:border-warm-800">
                      {relPost.readingTime} min read
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
