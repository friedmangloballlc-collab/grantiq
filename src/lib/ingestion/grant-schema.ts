import { z } from "zod";

export const ParsedGrantSchema = z.object({
  // ── Existing fields ──────────────────────────────────────────────────
  name: z.string().min(1, "name is required"),
  funder_name: z.string().min(1, "funder_name is required"),
  source_type: z.enum(["federal", "state", "foundation", "corporate"]),
  url: z.string().url().nullable().default(null),
  amount_min: z
    .number()
    .nullable()
    .default(null)
    .transform((v) => (v !== null && v < 0 ? null : v)),
  amount_max: z
    .number()
    .nullable()
    .default(null)
    .transform((v) => (v !== null && v < 0 ? null : v)),
  deadline: z.date().nullable().default(null),
  deadline_type: z
    .enum(["loi", "full_application", "rolling", "quarterly"])
    .default("rolling"),
  recurrence: z.enum(["one_time", "annual", "rolling"]).default("annual"),
  eligibility_types: z.array(z.string()).default([]),
  states: z.array(z.string().length(2)).default([]),
  description: z.string().nullable().default(null),
  cfda_number: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  data_source: z.enum(["seed", "api_crawl", "manual"]).default("seed"),
  raw_text: z.string().nullable().default(null),
  status: z.enum(["forecasted", "open", "closed", "archived"]).default("open"),
  is_active: z.boolean().default(true),

  // ── New: Grants.gov fields ───────────────────────────────────────────
  opportunity_number: z.string().nullable().default(null),
  open_date: z.string().nullable().default(null),
  estimated_funding: z.number().nullable().default(null),
  cfda_numbers: z.array(z.string()).default([]),
  applicant_eligibility_types: z.array(z.string()).default([]),
  funding_activity_category: z.string().nullable().default(null),
  competition_id: z.string().nullable().default(null),
  archive_date: z.string().nullable().default(null),
  award_ceiling: z.number().nullable().default(null),
  award_floor: z.number().nullable().default(null),
  estimated_awards_count: z.number().int().nullable().default(null),
  cost_sharing_required: z.boolean().default(false),

  // ── New: SAM.gov fields ──────────────────────────────────────────────
  naics_code: z.string().nullable().default(null),
  posted_date: z.string().nullable().default(null),
  classification_code: z.string().nullable().default(null),
  solicitation_number: z.string().nullable().default(null),
  point_of_contact: z.record(z.string(), z.unknown()).nullable().default(null),
  set_aside_code: z.string().nullable().default(null),

  // ── New: Shared enrichment ───────────────────────────────────────────
  application_process: z.string().nullable().default(null),
  contact_info: z.record(z.string(), z.unknown()).nullable().default(null),
  geographic_restrictions: z.record(z.string(), z.unknown()).nullable().default(null),
  requires_sam: z.boolean().default(false),
  required_certification: z.string().nullable().default(null),
  match_required_pct: z.number().nullable().default(null),
  eligible_naics: z.array(z.string()).default([]),
  new_applicant_friendly: z.boolean().nullable().default(null),
  external_id: z.string().nullable().default(null),
});

export type ParsedGrant = z.infer<typeof ParsedGrantSchema>;
