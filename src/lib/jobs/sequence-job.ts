import { Resend } from "resend";
import { render } from "@react-email/render";
import { createAdminClient } from "@/lib/supabase/admin";
import { Welcome } from "@/emails/welcome";
import { logger } from "@/lib/logger";

const FROM = process.env.RESEND_FROM_EMAIL ?? "GrantAQ <noreply@grantaq.com>";

export async function processSequenceJob(payload: Record<string, unknown>): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set, skipping sequence job");
    return;
  }

  const resend = new Resend(apiKey);
  const db = createAdminClient();
  const userId = payload.user_id as string;
  const trigger = payload.trigger as string;

  if (!userId) return;

  // Get user info
  const { data: authData } = await db.auth.admin.getUserById(userId);
  if (!authData?.user?.email) return;

  const email = authData.user.email;
  const name = (authData.user.user_metadata?.full_name as string) ?? email.split("@")[0];

  // Get org name
  const { data: membership } = await db
    .from("org_members")
    .select("org_id, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .single();

  const orgName = (membership?.organizations as { name?: string } | null)?.name ?? "Your Organization";

  if (trigger === "signup") {
    // Send welcome email
    const html = await render(Welcome({
      userName: name,
      orgName,
      appBaseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://grantaq.com",
    }));

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Welcome to GrantAQ — start here",
      html,
    });

    logger.info("Welcome email sent", { email, userId });
  }
}
