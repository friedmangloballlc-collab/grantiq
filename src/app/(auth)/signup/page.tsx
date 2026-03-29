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

export default function SignupPage() {
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

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Signup failed");
      setLoading(false);
      return;
    }

    // 2. Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: orgName || "My Organization", entity_type: "other" })
      .select("id")
      .single();

    if (orgError || !org) {
      setError("Failed to create organization");
      setLoading(false);
      return;
    }

    // 3. Create org membership (owner)
    await supabase.from("org_members").insert({
      org_id: org.id,
      user_id: authData.user.id,
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString(),
    });

    // 4. Create default subscription (free)
    await supabase.from("subscriptions").insert({
      org_id: org.id,
      user_id: authData.user.id,
      tier: "free",
      status: "active",
    });

    // 5. Create org_capabilities + org_profiles
    await supabase.from("org_capabilities").insert({ org_id: org.id });
    await supabase.from("org_profiles").insert({ org_id: org.id });

    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-warm-50)] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6" style={{ color: "var(--color-brand-teal)" }} />
            <span className="text-xl font-bold">GrantIQ</span>
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              style={{ backgroundColor: "var(--color-brand-teal)" }}
              disabled={loading}
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
  );
}
