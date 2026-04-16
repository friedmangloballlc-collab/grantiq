import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section className="py-20 md:py-32 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-950/30 text-brand-teal text-sm font-medium mb-6">
          <Image src="/grantaq-icon.svg" alt="" width={18} height={18} className="h-4.5 w-4.5" />
          AI-Powered Grant Discovery &amp; Readiness
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-warm-900 dark:text-warm-50 leading-tight">
          Find grants you actually<span className="text-brand-teal"> qualify for</span>
        </h1>
        <p className="text-lg md:text-xl text-warm-500 mt-6 max-w-2xl mx-auto">
          Check your eligibility in 60 seconds. Our AI matches your organization to 6,000+ grants,
          diagnoses your readiness, and helps write winning applications.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
            render={
              <Link href="/check">
                Check My Eligibility — Free <ArrowRight className="ml-2 h-4 w-4 inline" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/signup">Create Free Account</Link>}
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-xs text-warm-500">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> No account needed</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> Results in 60 seconds</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> 6,000+ grants</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-brand-teal" /> 100% free</span>
        </div>
      </div>
    </section>
  );
}
