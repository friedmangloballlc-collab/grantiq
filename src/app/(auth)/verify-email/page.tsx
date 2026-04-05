import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Supabase redirects here after the user clicks the confirmation link in their
 * inbox (configured in the Supabase dashboard under Authentication > Email
 * Templates > Redirect URL). The email token is consumed by Supabase before
 * the redirect, so this page only needs to tell the user they are verified.
 */
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-warm-50)] px-4">
      <Card className="w-full max-w-md shadow-md text-center">
        <CardHeader>
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-brand-teal)", opacity: 0.12 }}
          />
          <CardTitle>Email verified!</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm" style={{ color: "var(--color-warm-500)" }}>
            Your email address has been confirmed. You can now sign in and start
            finding grants.
          </p>
          <Link href="/login">
            <Button
              className="w-full"
              style={{ backgroundColor: "var(--color-brand-teal)" }}
            >
              Sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
