import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <nav className="border-b border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-brand-teal" />
          <span className="text-xl font-bold text-warm-900 dark:text-warm-50">GrantIQ</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400">Pricing</Link>
          <Link href="/blog" className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400">Blog</Link>
          <Link href="/leaderboard" className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400">Leaderboard</Link>
          <Link href="/tools/funding-gap" className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400">Free Tools</Link>
          <Link href="/grant-directory" className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400">Grant Directory</Link>
          <Link href="/signup/nonprofit" className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400">Start a Nonprofit</Link>
          <Link href="/#get-certified" className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400">Get Grant Certified</Link>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" render={<Link href="/login">Log in</Link>} />
          <Button
            className="bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href="/signup">Start Free</Link>}
          />
        </div>
      </div>
    </nav>
  );
}
