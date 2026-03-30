import { MarketingNav } from "@/components/marketing/marketing-nav";
import { CookieConsent } from "@/components/shared/cookie-consent";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-warm-900">
      <MarketingNav />
      {children}
      <footer className="border-t border-warm-200 dark:border-warm-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-warm-500">&copy; {new Date().getFullYear()} GrantIQ &mdash; Friedman Global LLC. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="/privacy" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">Privacy Policy</a>
            <a href="/terms" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">Terms of Service</a>
            <a href="/grant-directory" className="text-sm text-warm-500 hover:text-warm-900 dark:hover:text-warm-50">Grant Directory</a>
          </div>
        </div>
      </footer>
      <CookieConsent />
    </div>
  );
}
