import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      {/* Branding */}
      <div className="flex items-center gap-2 mb-8">
        <Image
          src="/grantaq-icon.svg"
          alt="GrantAQ"
          width={32}
          height={32}
          className="h-8 w-8"
          priority
        />
        <span className="text-xl font-bold tracking-tight">GrantAQ</span>
      </div>

      {/* 404 */}
      <p className="text-7xl font-bold text-[var(--color-brand-teal)] mb-4 leading-none">
        404
      </p>

      <div className="space-y-2 mb-8 max-w-sm">
        <h1 className="text-2xl font-semibold text-warm-900 dark:text-warm-50">
          This page doesn&apos;t exist
        </h1>
        <p className="text-sm text-warm-500">
          We couldn&apos;t find what you were looking for. It may have moved or been removed.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white" render={<Link href="/dashboard">Go to Dashboard</Link>} />
        <Button variant="outline" render={<Link href="/matches">Browse Grant Matches</Link>} />
      </div>

      <p className="mt-12 text-xs text-warm-400">GrantAQ &copy; 2026</p>
    </div>
  );
}
