"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-warm-50)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" style={{ color: "var(--color-brand-teal)" }} />
            <span className="text-xl font-bold">GrantAQ</span>
          </div>
          <CardTitle>Welcome back</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="Your password"
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
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-sm text-center" style={{ color: "var(--color-warm-500)" }}>
              <Link
                href="/reset-password"
                className="font-medium"
                style={{ color: "var(--color-brand-teal)" }}
              >
                Forgot password?
              </Link>
            </p>
          </form>
          <p className="text-sm text-center mt-4" style={{ color: "var(--color-warm-500)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium" style={{ color: "var(--color-brand-teal)" }}>
              Sign up free
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
