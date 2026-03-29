import { z } from "zod";

export const ParsedGrantSchema = z.object({
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
});

export type ParsedGrant = z.infer<typeof ParsedGrantSchema>;
