import { describe, it, expect } from "vitest";
import { ParsedGrantSchema, ParsedGrant } from "@/lib/ingestion/grant-schema";

describe("ParsedGrantSchema", () => {
  const minimal: ParsedGrant = {
    name: "Community Development Grant",
    funder_name: "USDA Rural Development",
    source_type: "federal",
    url: null,
    amount_min: null,
    amount_max: null,
    deadline: null,
    deadline_type: "rolling",
    eligibility_types: [],
    states: [],
    description: null,
    cfda_number: null,
    category: null,
    data_source: "seed",
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
    const full: ParsedGrant = {
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
});
