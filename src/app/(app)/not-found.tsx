import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Branding */}
      <div className="flex items-center gap-2 mb-6">
        <Image
          src="/grantaq-icon.svg"
          alt="GrantAQ"
          width={28}
          height={28}
          className="h-7 w-7"
          priority
        />
        <span className="text-lg font-bold tracking-tight">GrantAQ</span>
      </div>

      {/* 404 */}
      <p className="text-6xl font-bold text-[var(--color-brand-teal)] mb-3 leading-none">
        404
      </p>

      <div className="space-y-2 mb-8 max-w-sm">
        <h1 className="text-xl font-semibold text-warm-900 dark:text-warm-50">
          This page doesn&apos;t exist
        </h1>
        <p className="text-sm text-warm-500">
          The page you&apos;re looking for couldn&apos;t be found. Head back to a
          working page below.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button className="bg-[var(--color-brand-teal)] hover:bg-[var(--color-brand-teal)]/90 text-white" render={<Link href="/dashboard">Back to Dashboard</Link>} />
        <Button variant="outline" render={<Link href="/matches">View Grant Matches</Link>} />
      </div>
    </div>
  );
}
