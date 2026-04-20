// grantiq/src/lib/ai/agents/match-critic/hard-checks.ts
//
// Stage 1 of the Funder Match Critic: deterministic, no LLM. Handles
// the ~60% of kills that are obvious (wrong geography, wrong size,
// wrong entity type) in <1ms with zero API cost. Only grants that
// pass Stage 1 proceed to Stage 2 (LLM semantic check).

import type { CriticOrgProfile, CriticGrantMatch, CriticVerdict } from './types';

const SIZE_TOO_BIG_MULTIPLE = 10; // org budget > 10x grant max = too big
const SIZE_TOO_SMALL_MULTIPLE = 10; // grant max > 10x org budget = too small

/**
 * Run all deterministic checks. Returns:
 *   - KILL verdict if any hard criterion fails
 *   - null if all hard checks pass (caller then runs Stage 2)
 */
export function runHardChecks(
  org: CriticOrgProfile,
  grant: CriticGrantMatch
): CriticVerdict | null {
  // Geography — grant restricts to specific states, org is elsewhere
  if (grant.states.length > 0 && org.state) {
    const orgState = org.state.toUpperCase().trim();
    const allowedStates = grant.states.map((s) => s.toUpperCase().trim());
    if (!allowedStates.includes(orgState)) {
      return {
        verdict: 'KILL',
        killReason: 'geography',
        confidence: 1.0,
        notes: `Grant restricted to ${grant.states.join(', ')}; org is in ${org.state}`,
        stage: 'hard_check',
      };
    }
  }

  // Org size too big — budget exceeds what this grant sizes
  if (
    org.annual_budget !== null &&
    org.annual_budget > 0 &&
    grant.amount_max !== null &&
    grant.amount_max > 0 &&
    org.annual_budget > grant.amount_max * SIZE_TOO_BIG_MULTIPLE
  ) {
    return {
      verdict: 'KILL',
      killReason: 'org_size_too_big',
      confidence: 0.9,
      notes: `Org annual budget $${fmtK(org.annual_budget)} >> grant cap $${fmtK(grant.amount_max)}`,
      stage: 'hard_check',
    };
  }

  // Org size too small — grant is far too big for this org to responsibly manage
  if (
    org.annual_budget !== null &&
    org.annual_budget > 0 &&
    grant.amount_max !== null &&
    grant.amount_max > 0 &&
    grant.amount_max > org.annual_budget * SIZE_TOO_SMALL_MULTIPLE
  ) {
    return {
      verdict: 'KILL',
      killReason: 'org_size_too_small',
      confidence: 0.85,
      notes: `Grant cap $${fmtK(grant.amount_max)} vastly exceeds org budget $${fmtK(org.annual_budget)}`,
      stage: 'hard_check',
    };
  }

  // Entity type — grant lists eligible types, org isn't one
  if (grant.eligibility_types.length > 0 && org.entity_type) {
    const orgType = normalizeEntityType(org.entity_type);
    const allowed = grant.eligibility_types.map(normalizeEntityType);
    if (!allowed.some((t) => matchesEntityType(orgType, t))) {
      return {
        verdict: 'KILL',
        killReason: 'entity_type',
        confidence: 1.0,
        notes: `Grant requires ${grant.eligibility_types.join('/')}; org is ${org.entity_type}`,
        stage: 'hard_check',
      };
    }
  }

  // All hard checks passed — hand to Stage 2
  return null;
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

function normalizeEntityType(t: string): string {
  return t.toLowerCase().trim().replace(/[()]/g, '').replace(/\s+/g, '_');
}

/**
 * Entity types in the DB are fuzzy — "501c3", "501(c)(3)", "nonprofit",
 * "nonprofit 501(c)(3)" all refer to the same kind of org. This matcher
 * treats known synonyms as equivalent so we don't false-kill legitimate
 * matches on a cosmetic mismatch.
 */
function matchesEntityType(orgType: string, grantAllowedType: string): boolean {
  if (orgType === grantAllowedType) return true;

  // Synonym groups — pairs of values that should match each other
  const synonymGroups = [
    ['501c3', '501c_3', 'nonprofit', 'nonprofit_501c3', 'public_charity'],
    ['llc', 'for_profit', 'small_business'],
    ['govt', 'government', 'municipal', 'state_government', 'local_government'],
    ['educational_institution', 'school', 'university', 'college'],
    ['tribal', 'native_american_tribe', 'tribal_government'],
  ];

  for (const group of synonymGroups) {
    if (group.includes(orgType) && group.includes(grantAllowedType)) return true;
  }
  return false;
}
