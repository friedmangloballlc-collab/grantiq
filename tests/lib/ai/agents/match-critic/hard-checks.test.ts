import { describe, it, expect } from 'vitest';
import { runHardChecks } from '@/lib/ai/agents/match-critic/hard-checks';
import type { CriticOrgProfile, CriticGrantMatch } from '@/lib/ai/agents/match-critic/types';

function org(partial: Partial<CriticOrgProfile> = {}): CriticOrgProfile {
  return {
    name: 'Test Nonprofit',
    entity_type: '501c3',
    state: 'CA',
    city: 'San Francisco',
    annual_budget: 500_000,
    employee_count: 10,
    population_served: ['youth'],
    program_areas: ['education'],
    mission_statement: 'Help kids.',
    ...partial,
  };
}

function grant(partial: Partial<CriticGrantMatch> = {}): CriticGrantMatch {
  return {
    id: 'g1',
    name: 'Education Grant',
    funder_name: 'Acme Foundation',
    source_type: 'foundation',
    category: 'education',
    amount_min: 10_000,
    amount_max: 100_000,
    eligibility_types: ['501c3'],
    states: [],
    description: null,
    ...partial,
  };
}

describe('runHardChecks — geography', () => {
  it('KILLs when grant states exclude org state', () => {
    const v = runHardChecks(org({ state: 'TX' }), grant({ states: ['CA', 'OR', 'WA'] }));
    expect(v?.verdict).toBe('KILL');
    expect(v?.killReason).toBe('geography');
    expect(v?.confidence).toBe(1.0);
    expect(v?.stage).toBe('hard_check');
  });

  it('KEEPs when grant states include org state', () => {
    const v = runHardChecks(org({ state: 'CA' }), grant({ states: ['CA', 'OR'] }));
    expect(v).toBeNull();
  });

  it('KEEPs when grant has no state restriction (empty array)', () => {
    const v = runHardChecks(org({ state: 'TX' }), grant({ states: [] }));
    expect(v).toBeNull();
  });

  it('KEEPs when org state is null (cannot determine)', () => {
    const v = runHardChecks(org({ state: null }), grant({ states: ['CA'] }));
    expect(v).toBeNull();
  });

  it('is case insensitive', () => {
    const v = runHardChecks(org({ state: 'ca' }), grant({ states: ['CA'] }));
    expect(v).toBeNull();
  });
});

describe('runHardChecks — org size', () => {
  it('KILLs when org budget is >10x grant max (too big)', () => {
    const v = runHardChecks(org({ annual_budget: 5_000_000 }), grant({ amount_max: 10_000 }));
    expect(v?.killReason).toBe('org_size_too_big');
  });

  it('KILLs when grant max >10x org budget (too small to manage)', () => {
    const v = runHardChecks(org({ annual_budget: 50_000 }), grant({ amount_max: 5_000_000 }));
    expect(v?.killReason).toBe('org_size_too_small');
  });

  it('KEEPs at exactly 10x boundary (not > 10x)', () => {
    const v = runHardChecks(org({ annual_budget: 1_000_000 }), grant({ amount_max: 100_000 }));
    expect(v).toBeNull();
  });

  it('KEEPs when org_budget is null', () => {
    const v = runHardChecks(org({ annual_budget: null }), grant({ amount_max: 100_000 }));
    expect(v).toBeNull();
  });

  it('KEEPs when amount_max is null', () => {
    const v = runHardChecks(org({ annual_budget: 500_000 }), grant({ amount_max: null }));
    expect(v).toBeNull();
  });
});

describe('runHardChecks — entity type', () => {
  it('KILLs when grant requires 501c3 and org is LLC', () => {
    const v = runHardChecks(
      org({ entity_type: 'LLC' }),
      grant({ eligibility_types: ['501c3'] })
    );
    expect(v?.killReason).toBe('entity_type');
  });

  it('KEEPs when org entity matches', () => {
    const v = runHardChecks(
      org({ entity_type: '501c3' }),
      grant({ eligibility_types: ['501c3'] })
    );
    expect(v).toBeNull();
  });

  it('treats "501(c)(3)" and "501c3" as equivalent', () => {
    const v = runHardChecks(
      org({ entity_type: '501c3' }),
      grant({ eligibility_types: ['501(c)(3)'] })
    );
    expect(v).toBeNull();
  });

  it('treats "nonprofit" as matching "501c3"', () => {
    const v = runHardChecks(
      org({ entity_type: 'nonprofit' }),
      grant({ eligibility_types: ['501c3'] })
    );
    expect(v).toBeNull();
  });

  it('treats "school" as matching "educational institution"', () => {
    const v = runHardChecks(
      org({ entity_type: 'school' }),
      grant({ eligibility_types: ['educational institution'] })
    );
    expect(v).toBeNull();
  });

  it('KEEPs when grant has no eligibility restriction', () => {
    const v = runHardChecks(
      org({ entity_type: 'LLC' }),
      grant({ eligibility_types: [] })
    );
    expect(v).toBeNull();
  });
});

describe('runHardChecks — compound cases', () => {
  it('KILLs on first failing check (geography before size)', () => {
    const v = runHardChecks(
      org({ state: 'TX', annual_budget: 5_000_000 }),
      grant({ states: ['CA'], amount_max: 10_000 })
    );
    expect(v?.killReason).toBe('geography');
  });

  it('passes all hard checks when fully aligned', () => {
    const v = runHardChecks(
      org({ state: 'CA', annual_budget: 500_000, entity_type: '501c3' }),
      grant({ states: ['CA'], amount_max: 100_000, eligibility_types: ['501c3'] })
    );
    expect(v).toBeNull(); // Proceeds to Stage 2
  });
});
