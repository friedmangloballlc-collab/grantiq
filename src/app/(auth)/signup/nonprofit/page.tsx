"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2 } from "lucide-react";

export default function NonprofitSignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        orgName,
        entity_type: "nonprofit_501c3",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      setLoading(false);
      return;
    }

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

    router.push("/nonprofit-formation");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-warm-50)] px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header badge */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-brand-teal/10 text-brand-teal">
            <Building2 className="h-3.5 w-3.5" />
            Nonprofit Formation Service
          </span>
        </div>

        <Card className="shadow-lg border-warm-200">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-warm-900">
              Start Your Nonprofit
            </CardTitle>
            <p className="text-sm text-warm-500 mt-1">
              Create your free account and we&apos;ll guide you through every step of the formation process.
            </p>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Value props */}
            <div className="mb-6 grid grid-cols-1 gap-2">
              {[
                "5-phase guided formation wizard",
                "Articles, bylaws & IRS form checklists",
                "Resume at any time — progress is saved",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-warm-600">
                  <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="orgName">Proposed Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g., Hope Community Foundation"
                  required
                />
                <p className="text-xs text-warm-400 mt-1">You can update this later during formation.</p>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
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
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-brand-teal hover:bg-brand-teal-dark text-white py-2.5 text-base font-semibold"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Start Your Nonprofit →"}
              </Button>
            </form>

            <p className="text-xs text-center mt-4 text-warm-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-teal hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-center mt-4 text-warm-400">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
