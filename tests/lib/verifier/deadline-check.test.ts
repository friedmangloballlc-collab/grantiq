import { describe, it, expect } from 'vitest';
import { checkDeadline } from '@/lib/verifier/deadline-check';
import type { VerifierGrantRow } from '@/lib/verifier/types';

function row(partial: Partial<VerifierGrantRow>): VerifierGrantRow {
  return {
    id: 'g1',
    url: null,
    deadline: null,
    recurrence: null,
    ein: null,
    manual_review_flag: false,
    ...partial,
  };
}

describe('checkDeadline', () => {
  const now = new Date('2026-04-20T00:00:00Z');

  it('returns no_deadline when deadline is null', () => {
    expect(checkDeadline(row({}), now)).toEqual({
      status: 'no_deadline',
      actionSuggested: 'no_change',
    });
  });

  it('returns no_deadline when deadline is malformed', () => {
    expect(checkDeadline(row({ deadline: 'not-a-date' }), now)).toEqual({
      status: 'no_deadline',
      actionSuggested: 'no_change',
    });
  });

  it('returns future for deadline in the future', () => {
    const future = '2027-01-01T00:00:00Z';
    expect(checkDeadline(row({ deadline: future }), now)).toEqual({
      status: 'future',
      actionSuggested: 'no_change',
    });
  });

  it('archives a past one_time deadline', () => {
    const past = '2025-01-01T00:00:00Z';
    expect(checkDeadline(row({ deadline: past, recurrence: 'one_time' }), now)).toEqual({
      status: 'passed_one_time',
      actionSuggested: 'archive',
    });
  });

  it('does NOT archive a past rolling deadline', () => {
    const past = '2025-01-01T00:00:00Z';
    expect(checkDeadline(row({ deadline: past, recurrence: 'rolling' }), now)).toEqual({
      status: 'passed_rolling',
      actionSuggested: 'no_change',
    });
  });

  it('does NOT archive a past annual deadline', () => {
    const past = '2025-01-01T00:00:00Z';
    expect(checkDeadline(row({ deadline: past, recurrence: 'annual' }), now)).toEqual({
      status: 'passed_rolling',
      actionSuggested: 'no_change',
    });
  });

  it('does NOT archive past deadline with null recurrence (safety default)', () => {
    const past = '2025-01-01T00:00:00Z';
    expect(checkDeadline(row({ deadline: past, recurrence: null }), now)).toEqual({
      status: 'passed_rolling',
      actionSuggested: 'no_change',
    });
  });

  it('treats deadline exactly equal to now as past', () => {
    const sameMoment = now.toISOString();
    expect(
      checkDeadline(row({ deadline: sameMoment, recurrence: 'one_time' }), now).actionSuggested
    ).toBe('archive');
  });
});
