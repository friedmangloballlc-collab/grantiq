"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/check", label: "Free Eligibility Check" },
  { href: "/grant-services", label: "Services" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/tools", label: "Free Tools" },
  { href: "/signup/nonprofit", label: "Start a Nonprofit" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="border-b border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 relative z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/grantaq-icon.svg" alt="GrantAQ" width={32} height={32} className="h-8 w-8" />
          <span className="text-xl font-bold text-warm-900 dark:text-warm-50">GrantAQ</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-warm-600 hover:text-warm-900 dark:text-warm-400 dark:hover:text-warm-50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden sm:inline-flex" render={<Link href="/login">Log in</Link>} />
          <Button
            className="bg-brand-teal hover:bg-brand-teal-dark text-white"
            render={<Link href="/signup">Start Free</Link>}
          />
          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 text-warm-600 hover:text-warm-900 dark:text-warm-400"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden border-t border-warm-200 dark:border-warm-800 bg-white dark:bg-warm-900 px-4 py-4 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-warm-700 hover:bg-warm-100 dark:text-warm-300 dark:hover:bg-warm-800 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-warm-200 dark:border-warm-800 mt-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-warm-700 hover:bg-warm-100 dark:text-warm-300 dark:hover:bg-warm-800"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
