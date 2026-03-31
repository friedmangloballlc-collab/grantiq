"use client";

import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "grantaq_cookie_consent";

type ConsentState = "accepted" | "declined" | null;

export function CookieConsent() {
  const [consent, setConsent] = useState<ConsentState | "loading">("loading");
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ConsentState | null;
      setConsent(stored);
    } catch {
      setConsent(null);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // localStorage may be unavailable in some contexts
    }
    setConsent("accepted");
  };

  const decline = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "declined");
    } catch {
      // localStorage may be unavailable in some contexts
    }
    setConsent("declined");
    setShowPreferences(false);
  };

  // Don't render until we've checked localStorage (avoids hydration flash)
  if (consent === "loading" || consent === "accepted" || consent === "declined") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 bg-white dark:bg-warm-900 border border-warm-200 dark:border-warm-700 rounded-xl shadow-xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Cookie className="h-5 w-5 text-warm-500 shrink-0 mt-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-warm-900 dark:text-warm-50 mb-1">Cookies &amp; Privacy</p>
          <p className="text-xs text-warm-600 dark:text-warm-400 leading-relaxed">
            We use cookies for authentication and to improve your experience.{" "}
            <a href="/privacy#cookies" className="text-brand-teal hover:underline">
              Learn more
            </a>
          </p>

          {showPreferences && (
            <div className="mt-3 space-y-2 text-xs text-warm-600 dark:text-warm-400">
              <div className="flex items-center justify-between">
                <span>Essential cookies (authentication)</span>
                <span className="text-green-600 dark:text-green-400 font-medium">Always on</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Referral tracking (30-day)</span>
                <span className="text-warm-500">Included</span>
              </div>
              <p className="text-warm-400">We do not use advertising or analytics tracking cookies.</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={accept} className="bg-brand-teal hover:bg-brand-teal-dark text-white text-xs px-3">
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPreferences((v) => !v)}
              className="text-xs px-3"
            >
              {showPreferences ? "Hide" : "Manage Preferences"}
            </Button>
            {showPreferences && (
              <Button size="sm" variant="ghost" onClick={decline} className="text-xs px-2 text-warm-500">
                Decline optional
              </Button>
            )}
          </div>
        </div>
        <button
          onClick={accept}
          aria-label="Dismiss cookie notice"
          className="shrink-0 text-warm-400 hover:text-warm-600 dark:hover:text-warm-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
