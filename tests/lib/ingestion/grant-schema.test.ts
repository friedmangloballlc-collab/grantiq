import { describe, it, expect } from "vitest";
import { ParsedGrantSchema, ParsedGrant } from "@/lib/ingestion/grant-schema";

describe("ParsedGrantSchema", () => {
  const minimal = {
    name: "Community Development Grant",
    funder_name: "USDA Rural Development",
    source_type: "federal" as const,
    url: null,
    amount_min: null,
    amount_max: null,
    deadline: null,
    deadline_type: "rolling" as const,
    eligibility_types: [],
    states: [],
    description: null,
    cfda_number: null,
    category: null,
    data_source: "seed" as const,
  };

  it("accepts a valid minimal grant", () => {
    const result = ParsedGrantSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = ParsedGrantSchema.safeParse({ ...minimal, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing funder_name", () => {
    const result = ParsedGrantSchema.safeParse({ ...minimal, funder_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source_type", () => {
    const result = ParsedGrantSchema.safeParse({ ...minimal, source_type: "unknown" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid source_types", () => {
    for (const t of ["federal", "state", "foundation", "corporate"]) {
      const result = ParsedGrantSchema.safeParse({ ...minimal, source_type: t });
      expect(result.success).toBe(true);
    }
  });

  it("coerces amount_min below 0 to null", () => {
    const result = ParsedGrantSchema.safeParse({ ...minimal, amount_min: -100 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount_min).toBeNull();
  });

  it("accepts a full grant with all fields", () => {
    const full = {
      ...minimal,
      amount_min: 50000,
      amount_max: 500000,
      deadline: new Date("2026-06-30"),
      deadline_type: "full_application",
      eligibility_types: ["nonprofit_501c3", "nonprofit_501c4"],
      states: ["CA", "TX"],
      description: "A federal grant for rural communities",
      cfda_number: "10.001",
      category: "rural development",
    };
    const result = ParsedGrantSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it("accepts full Grants.gov metadata", () => {
    const result = ParsedGrantSchema.safeParse({
      name: "Youth STEM Program",
      funder_name: "NSF",
      source_type: "federal",
      opportunity_number: "NSF-24-001",
      open_date: "2026-01-15",
      estimated_funding: 5000000,
      cfda_numbers: ["47.076", "47.041"],
      applicant_eligibility_types: ["nonprofit_501c3", "higher_education"],
      funding_activity_category: "ST",
      cost_sharing_required: true,
      award_ceiling: 500000,
      award_floor: 50000,
      estimated_awards_count: 15,
      naics_code: "541711",
      requires_sam: true,
      eligible_naics: ["541711", "541712"],
      match_required_pct: 25,
      raw_text: '{"full":"api_response"}',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.opportunity_number).toBe("NSF-24-001");
      expect(result.data.cfda_numbers).toEqual(["47.076", "47.041"]);
      expect(result.data.cost_sharing_required).toBe(true);
      expect(result.data.requires_sam).toBe(true);
      expect(result.data.match_required_pct).toBe(25);
    }
  });
});
