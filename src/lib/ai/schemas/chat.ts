import { z } from "zod";

export const GrantieChatOutputSchema = z.object({
  response: z.string().min(1),
  suggested_actions: z.array(z.object({
    action_type: z.enum(["add_to_pipeline", "draft_loi", "set_reminder", "run_matching", "view_grant", "update_profile", "check_readiness"]),
    label: z.string(),
    payload: z.record(z.unknown()).optional(),
  })).optional(),
  follow_up_prompts: z.array(z.string()).max(3).optional(),
  sources_referenced: z.array(z.string()).optional(),
});

export type GrantieChatOutput = z.infer<typeof GrantieChatOutputSchema>;
