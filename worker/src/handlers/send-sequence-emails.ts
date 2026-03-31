import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndSendSequenceEmails } from "@/lib/email/sequence-runner";

/**
 * Handles the `send_sequence_emails` job type.
 * Runs the full sequence runner: checks all active users and sends any
 * post-signup or re-engagement emails that are due.
 *
 * This job is intended to run once daily, typically enqueued by the scheduler.
 */
export async function handleSendSequenceEmails(_supabase: SupabaseClient): Promise<void> {
  console.log("[sequence-handler] Starting send_sequence_emails job");
  await checkAndSendSequenceEmails();
  console.log("[sequence-handler] send_sequence_emails job complete");
}
