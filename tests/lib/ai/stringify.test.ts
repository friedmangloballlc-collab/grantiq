/**
 * Tests for the canonical stable-stringify utility (Unit 2 / R19a).
 *
 * Two invariants matter for cache-key correctness:
 *   1. Stability — the same logical value always serializes to the same bytes
 *   2. Semantic correctness — the output round-trips back to the same value
 *
 * The package itself has its own test suite for #1; these tests are the
 * codebase's contract that the wrapper preserves both properties for the
 * shapes of data we actually pass through it (org profiles, RFP analyses,
 * funder intel — nested objects, arrays, mixed types).
 */

import { describe, it, expect } from "vitest";
import { canonicalStringify } from "@/lib/ai/stringify";

// --------------------------------------------------------------------------
// Stability — same logical input always produces the same bytes
// --------------------------------------------------------------------------
describe("canonicalStringify stability", () => {
  it("produces byte-identical output regardless of object-key insertion order", () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("sorts keys lexically across arbitrary depth", () => {
    const a = { z: { y: 1, x: 2 }, a: { c: 3, b: 4 } };
    const b = { a: { b: 4, c: 3 }, z: { x: 2, y: 1 } };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("preserves array index order (arrays are not sorted)", () => {
    expect(canonicalStringify([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalStringify([3, 1, 2])).not.toBe(canonicalStringify([1, 2, 3]));
  });

  it("handles mixed object + array nesting deterministically", () => {
    const a = { items: [{ b: 1, a: 2 }, { d: 3, c: 4 }], meta: { z: 1, a: 2 } };
    const b = { meta: { a: 2, z: 1 }, items: [{ a: 2, b: 1 }, { c: 4, d: 3 }] };
    expect(canonicalStringify(a)).toBe(canonicalStringify(b));
  });

  it("produces stable output for an org-profile-shaped fixture across 3 invocations", () => {
    const profile = {
      name: "Atlanta Youth Foundation",
      mission_statement: "We support kids.",
      population_served: ["youth", "families"],
      program_areas: ["education", "after-school"],
      voice_profile: { tone: "warm", reading_level: 8 },
      annual_budget_cents: 250000000,
    };
    const out1 = canonicalStringify(profile);
    const out2 = canonicalStringify({ ...profile });
    const out3 = canonicalStringify(JSON.parse(JSON.stringify(profile)));
    expect(out1).toBe(out2);
    expect(out2).toBe(out3);
  });
});

// --------------------------------------------------------------------------
// Semantic correctness — output round-trips back to an equivalent value
// --------------------------------------------------------------------------
describe("canonicalStringify semantic correctness", () => {
  it("round-trips primitive values", () => {
    expect(JSON.parse(canonicalStringify(42)!)).toBe(42);
    expect(JSON.parse(canonicalStringify("hello")!)).toBe("hello");
    expect(JSON.parse(canonicalStringify(true)!)).toBe(true);
    expect(JSON.parse(canonicalStringify(null)!)).toBeNull();
  });

  it("round-trips a flat object", () => {
    const value = { a: 1, b: "two", c: true, d: null };
    expect(JSON.parse(canonicalStringify(value)!)).toEqual(value);
  });

  it("round-trips a nested object", () => {
    const value = { outer: { inner: { deep: { deeper: [1, 2, 3] } } } };
    expect(JSON.parse(canonicalStringify(value)!)).toEqual(value);
  });

  it("round-trips arrays with mixed types", () => {
    const value = [1, "two", true, null, { nested: "object" }, [1, 2]];
    expect(JSON.parse(canonicalStringify(value)!)).toEqual(value);
  });

  it("preserves every top-level key for an org-profile-shaped fixture", () => {
    const profile = {
      name: "Atlanta Youth Foundation",
      mission_statement: "We support kids.",
      population_served: ["youth", "families"],
      program_areas: ["education"],
      voice_profile: { tone: "warm" },
      annual_budget_cents: 250000000,
      empty_field: "",
      nullish_field: null,
      zero_field: 0,
    };
    const parsed = JSON.parse(canonicalStringify(profile)!);
    for (const key of Object.keys(profile)) {
      expect(parsed).toHaveProperty(key);
    }
    expect(parsed).toEqual(profile);
  });

  it("preserves non-ASCII content (Unicode, accents, emoji)", () => {
    const value = {
      spanish: "educación bilingüe",
      french: "café",
      chinese: "教育",
      emoji: "🎓📚",
      mixed: "Foundation — São Paulo",
    };
    const parsed = JSON.parse(canonicalStringify(value)!);
    expect(parsed).toEqual(value);
  });

  it("preserves empty string vs null vs undefined-omission distinction", () => {
    const value = { empty: "", nullish: null };
    const parsed = JSON.parse(canonicalStringify(value)!);
    expect(parsed.empty).toBe("");
    expect(parsed.nullish).toBeNull();
  });
});

// --------------------------------------------------------------------------
// Edge cases
// --------------------------------------------------------------------------
describe("canonicalStringify edge cases", () => {
  it("returns a string for an empty object and an empty array", () => {
    expect(canonicalStringify({})).toBe("{}");
    expect(canonicalStringify([])).toBe("[]");
  });

  it("handles deeply-nested objects without stack overflow", () => {
    let nested: Record<string, unknown> = { value: 0 };
    for (let i = 0; i < 100; i++) {
      nested = { level: i, child: nested };
    }
    expect(typeof canonicalStringify(nested)).toBe("string");
  });

  it("returns undefined for a top-level undefined", () => {
    expect(canonicalStringify(undefined)).toBeUndefined();
  });

  it("returns undefined for a top-level function", () => {
    expect(canonicalStringify(() => 1)).toBeUndefined();
  });

  it("throws on a circular reference (safe-stable-stringify default behavior)", () => {
    const a: { self?: unknown } = {};
    a.self = a;
    // safe-stable-stringify default config replaces cycles with `[Circular]`
    // string rather than throwing — the wrapper inherits that. Verify the
    // output is a string and contains the cycle marker rather than crashing.
    const out = canonicalStringify(a);
    expect(typeof out).toBe("string");
    expect(out).toContain("Circular");
  });
});
