import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section className="py-20 md:py-32 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-950/30 text-brand-teal text-sm font-medium mb-6">
          <Image src="/grantaq-icon.svg" alt="" width={18} height={18} className="h-4.5 w-4.5" />
          AI + Expert Grant Writers
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-warm-900 dark:text-warm-50 leading-tight">
          Find grants you actually<span className="text-brand-teal"> qualify for</span>
        </h1>
        <p className="text-lg md:text-xl text-warm-500 mt-6 max-w-2xl mx-auto">
          GrantAQ matches your organization to thousands of grants, then our AI and expert grant writers work together to prepare winning applications. Technology does the heavy lifting — humans ensure quality.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal-dark text-white px-8"
            render={
              <Link href="/signup">
                Start Free <ArrowRight className="ml-2 h-4 w-4 inline" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/tools/funding-gap">See What You&apos;re Missing</Link>}
          />
        </div>
        <p className="text-xs text-warm-400 mt-4">No credit card required. 5,000+ grants across federal, state, foundation, and corporate sources.</p>
      </div>
    </section>
  );
}
