"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-warm-50)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" style={{ color: "var(--color-brand-teal)" }} />
            <span className="text-xl font-bold">GrantIQ</span>
          </div>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-warm-600 dark:text-warm-400">
                Check your email for a password reset link. It may take a minute to arrive.
              </p>
              <Link
                href="/login"
                className="text-sm font-medium"
                style={{ color: "var(--color-brand-teal)" }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
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
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: "var(--color-brand-teal)" }}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-sm text-center" style={{ color: "var(--color-warm-500)" }}>
                <Link
                  href="/login"
                  className="font-medium"
                  style={{ color: "var(--color-brand-teal)" }}
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
