import Link from "next/link";
import type { Metadata } from "next";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "GrantIQ Blog — Grant Strategy & Writing Insights",
  description:
    "Expert guides on grant discovery, proposal writing, nonprofit operations, and AI-powered funding strategy. Written by the team behind Friedman Global's grant consulting playbooks.",
  alternates: {
    canonical: "https://grantiq.com/blog",
  },
  openGraph: {
    title: "GrantIQ Blog — Grant Strategy & Writing Insights",
    description:
      "Expert guides on grant strategy, proposal writing, and nonprofit funding. AI-powered insights from the GrantIQ team.",
    url: "https://grantiq.com/blog",
    siteName: "GrantIQ",
    type: "website",
  },
};

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

export default function BlogIndexPage() {
  const [featured, ...rest] = BLOG_POSTS;

  return (
    <div className="max-w-6xl mx-auto py-16 px-4">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-warm-900 dark:text-warm-50">
          Grant Strategy &amp; Writing Insights
        </h1>
        <p className="text-warm-500 mt-3 max-w-2xl mx-auto text-lg">
          Practical guides on finding grants, writing winning proposals, and building a sustainable
          funding strategy — from the team behind 400+ successful grant campaigns.
        </p>
      </div>

      {/* Featured Post */}
      {featured && (
        <Link href={`/blog/${featured.slug}`} className="block mb-12 group">
          <div className="rounded-2xl border border-warm-200 dark:border-warm-800 p-8 hover:border-brand-teal/50 hover:shadow-lg transition-all bg-white dark:bg-warm-900">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      CATEGORY_COLORS[featured.category] ?? "bg-warm-100 text-warm-700"
                    }`}
                  >
                    {featured.category}
                  </span>
                  <span className="text-xs text-warm-400">Featured</span>
                </div>
                <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50 group-hover:text-brand-teal transition-colors mb-3 leading-snug">
                  {featured.title}
                </h2>
                <p className="text-warm-500 leading-relaxed mb-4">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-warm-400">
                  <span>{formatDate(featured.publishedAt)}</span>
                  <span>&middot;</span>
                  <span>{featured.readingTime} min read</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center">
                <span className="inline-flex items-center gap-2 text-brand-teal font-medium text-sm group-hover:gap-3 transition-all">
                  Read article <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Post Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rest.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
            <article className="h-full rounded-2xl border border-warm-200 dark:border-warm-800 p-6 hover:border-brand-teal/50 hover:shadow-md transition-all bg-white dark:bg-warm-900 flex flex-col">
              <div className="mb-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    CATEGORY_COLORS[post.category] ?? "bg-warm-100 text-warm-700"
                  }`}
                >
                  {post.category}
                </span>
              </div>
              <h2 className="text-lg font-bold text-warm-900 dark:text-warm-50 group-hover:text-brand-teal transition-colors mb-2 leading-snug flex-1">
                {post.title}
              </h2>
              <p className="text-sm text-warm-500 leading-relaxed mb-4 line-clamp-3">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between text-xs text-warm-400 mt-auto pt-4 border-t border-warm-100 dark:border-warm-800">
                <span>{formatDate(post.publishedAt)}</span>
                <span>{post.readingTime} min read</span>
              </div>
            </article>
          </Link>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="mt-16 p-8 bg-brand-teal/5 dark:bg-brand-teal/10 rounded-2xl border border-brand-teal/20 text-center">
        <h2 className="text-xl font-bold text-warm-900 dark:text-warm-50">
          Ready to put this into practice?
        </h2>
        <p className="text-warm-500 mt-2 max-w-xl mx-auto">
          GrantIQ matches your organization to 5,000+ grants — and helps you write winning
          applications faster with AI.
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-teal hover:bg-brand-teal-dark text-white text-sm font-medium transition-colors"
        >
          Find Grants You Qualify For <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
