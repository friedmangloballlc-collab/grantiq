"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sparkles, CalendarCheck, PenLine } from "lucide-react";

const BENEFITS = [
  {
    icon: Sparkles,
    text: "AI matches you to grants you qualify for",
  },
  {
    icon: CalendarCheck,
    text: "Track deadlines and manage applications",
  },
  {
    icon: PenLine,
    text: "AI writes your grant applications",
  },
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Call server-side API to create user + org (bypasses RLS)
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, orgName, termsAccepted }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      setLoading(false);
      return;
    }

    // Sign in the user after account creation
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Account created but sign-in failed. Try logging in.");
      setLoading(false);
      return;
    }

    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--color-warm-50)]">
      {/* ── Left panel: social proof (desktop) / top banner (mobile) ── */}
      <div
        className="md:w-1/2 lg:w-5/12 flex flex-col justify-center px-8 py-10 md:py-0 md:px-12 lg:px-16"
        style={{ backgroundColor: "var(--color-brand-teal)" }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-2 mb-8">
          <Image
            src="/grantaq-icon.svg"
            alt="GrantAQ"
            width={32}
            height={32}
            className="h-8 w-8 brightness-0 invert"
          />
          <span className="text-xl font-bold text-white">GrantAQ</span>
        </div>

        {/* Headline */}
        <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug">
          Join 4,000+ organizations finding grants with GrantAQ
        </h2>
        <p className="mt-3 text-sm text-white/70">
          The AI-powered grant platform built for nonprofits, schools, and small businesses.
        </p>

        {/* Benefits list */}
        <ul className="mt-8 space-y-4">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-white/15">
                <Icon className="h-4 w-4 text-white" />
              </span>
              <span className="text-sm text-white leading-snug pt-1">{text}</span>
            </li>
          ))}
        </ul>

        {/* Social proof pill */}
        <div className="mt-10 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 w-fit">
          <span className="flex -space-x-1">
            {["bg-amber-400", "bg-sky-400", "bg-rose-400", "bg-emerald-400"].map((bg, i) => (
              <span
                key={i}
                className={`h-6 w-6 rounded-full border-2 border-white/30 ${bg}`}
              />
            ))}
          </span>
          <span className="text-xs text-white/80 font-medium">
            4,000+ organizations and growing
          </span>
        </div>
      </div>

      {/* ── Right panel: signup form ── */}
      <div className="md:w-1/2 lg:w-7/12 flex items-center justify-center px-4 py-10 md:py-0">
        <Card className="w-full max-w-md shadow-md">
          <CardHeader className="text-center">
            {/* Show logo only on mobile (the left panel is hidden on mobile) */}
            <div className="flex items-center justify-center gap-2 mb-2 md:hidden">
              <Image
                src="/grantaq-icon.svg"
                alt="GrantAQ"
                width={28}
                height={28}
                className="h-7 w-7"
              />
              <span className="text-xl font-bold">GrantAQ</span>
            </div>
            <CardTitle>Create your account</CardTitle>
            <p className="text-sm" style={{ color: "var(--color-warm-500)" }}>
              Start finding grants in under 3 minutes
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Your Organization"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex items-start gap-2">
                <input
                  id="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border border-input accent-[var(--color-brand-teal)]"
                />
                <label htmlFor="termsAccepted" className="text-sm leading-snug" style={{ color: "var(--color-warm-500)" }}>
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="font-medium underline underline-offset-2"
                    style={{ color: "var(--color-brand-teal)" }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-medium underline underline-offset-2"
                    style={{ color: "var(--color-brand-teal)" }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: "var(--color-brand-teal)" }}
                disabled={loading || !termsAccepted}
              >
                {loading ? "Creating account..." : "Start Free"}
              </Button>
            </form>
            <p className="text-sm text-center mt-4" style={{ color: "var(--color-warm-500)" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-medium" style={{ color: "var(--color-brand-teal)" }}>
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
