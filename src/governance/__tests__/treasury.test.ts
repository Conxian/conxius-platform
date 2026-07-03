import { describe, it, expect } from 'vitest';
import {
  computeFundingTier,
  computeFundedRoleEligibility,
  buildTreasuryFundedRoleProfile,
  FUNDED_ROLE_DEFINITIONS,
  CONTRIBUTOR_LEVEL_THRESHOLDS,
} from '../treasury';
import type { StewardProfile } from '../types';

const baseSteward: StewardProfile = {
  id: 's1',
  name: 'Alice',
  roles: ['contributor', 'delegate', 'guardian', 'policy-author', 'council'] as const,
  joinedAt: new Date('2025-03-15'),
  totalVotingPower: 2500,
  activeDelegations: 3,
};

describe('FUNDED_ROLE_DEFINITIONS', () => {
  it('defines 8 treasury-funded roles', () => {
    expect(FUNDED_ROLE_DEFINITIONS).toHaveLength(8);
  });

  it('each role has a unique id', () => {
    const ids = FUNDED_ROLE_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each role maps to a valid steward role', () => {
    const validRoles = ['member', 'contributor', 'delegate', 'policy-author', 'guardian', 'council'];
    for (const def of FUNDED_ROLE_DEFINITIONS) {
      expect(validRoles).toContain(def.stewardRole);
    }
  });

  it('each role maps to a valid allocation category', () => {
    const validCategories = ['community-rewards', 'governance-rewards', 'operational-rewards', 'treasury-reserve'];
    for (const def of FUNDED_ROLE_DEFINITIONS) {
      expect(validCategories).toContain(def.allocationCategory);
    }
  });

  it('each role has funding ranges with probationary < active < senior', () => {
    for (const def of FUNDED_ROLE_DEFINITIONS) {
      expect(def.fundingRangeSats.probationary).toBeLessThan(def.fundingRangeSats.active);
      expect(def.fundingRangeSats.active).toBeLessThan(def.fundingRangeSats.senior);
    }
  });
});

describe('CONTRIBUTOR_LEVEL_THRESHOLDS', () => {
  it('maps levels 0-5 to contributor names', () => {
    expect(CONTRIBUTOR_LEVEL_THRESHOLDS[0]).toBe('Newcomer');
    expect(CONTRIBUTOR_LEVEL_THRESHOLDS[1]).toBe('Contributor');
    expect(CONTRIBUTOR_LEVEL_THRESHOLDS[2]).toBe('Regular');
    expect(CONTRIBUTOR_LEVEL_THRESHOLDS[3]).toBe('Core');
    expect(CONTRIBUTOR_LEVEL_THRESHOLDS[4]).toBe('Champion');
    expect(CONTRIBUTOR_LEVEL_THRESHOLDS[5]).toBe('Steward');
  });
});

describe('computeFundingTier', () => {
  it('returns probationary when missing required badges', () => {
    expect(computeFundingTier(5, 60, false)).toBe('probationary');
  });

  it('returns probationary for low contributor level', () => {
    expect(computeFundingTier(0, 0, true)).toBe('probationary');
    expect(computeFundingTier(3, 10, true)).toBe('probationary');
  });

  it('returns active for Champion with 15+ votes', () => {
    expect(computeFundingTier(4, 15, true)).toBe('active');
    expect(computeFundingTier(4, 49, true)).toBe('active');
  });

  it('returns senior for Steward level with 50+ votes', () => {
    expect(computeFundingTier(5, 50, true)).toBe('senior');
    expect(computeFundingTier(5, 100, true)).toBe('senior');
  });
});

describe('computeFundedRoleEligibility', () => {
  it('returns 8 role assignments for any steward', () => {
    const roles = computeFundedRoleEligibility(baseSteward, 4, 30, ['delegate', 'guardian'], new Set());
    expect(roles).toHaveLength(8);
  });

  it('newcomer with no activity has all roles unfunded', () => {
    const roles = computeFundedRoleEligibility(
      { ...baseSteward, roles: ['member'] },
      0,
      0,
      [],
      new Set(),
    );
    for (const role of roles) {
      expect(role.monthlyFundingEstimateSats).toBe(0);
    }
  });

  it('scores roles higher when steward has matching role', () => {
    const delegateSteward = { ...baseSteward, roles: ['delegate'] as const };
    const roles = computeFundedRoleEligibility(delegateSteward, 4, 30, ['delegate', 'consistent-voter'], new Set());
    const delegateRole = roles.find((r) => r.roleId === 'governance-delegate');
    const operatorRole = roles.find((r) => r.roleId === 'protocol-operator');
    expect(delegateRole).toBeDefined();
    expect(operatorRole).toBeDefined();
    expect(delegateRole!.eligibilityScore).toBeGreaterThan(operatorRole!.eligibilityScore);
  });

  it('marks recognized roles as funded', () => {
    const recognized = new Set(['governance-delegate']);
    const roles = computeFundedRoleEligibility(
      baseSteward,
      4,
      30,
      ['delegate', 'consistent-voter'],
      recognized,
    );
    const funded = roles.find((r) => r.roleId === 'governance-delegate');
    expect(funded).toBeDefined();
    expect(funded!.monthlyFundingEstimateSats).toBeGreaterThan(0);
    expect(funded!.recognizedBy).toBe('governance-prop-governance-delegate');
  });

  it('includes missing requirements for unfunded roles', () => {
    const roles = computeFundedRoleEligibility(
      { ...baseSteward, roles: ['member'] },
      0,
      0,
      [],
      new Set(),
    );
    const councilRole = roles.find((r) => r.roleId === 'council-member');
    expect(councilRole).toBeDefined();
    expect(councilRole!.missingRequirements.length).toBeGreaterThan(0);
    expect(councilRole!.missingRequirements.some((m) => m.includes('council'))).toBe(true);
  });
});

describe('buildTreasuryFundedRoleProfile', () => {
  it('builds a complete profile with allocation breakdown', () => {
    const recognized = new Set(['governance-delegate', 'policy-steward']);
    const profile = buildTreasuryFundedRoleProfile(
      baseSteward,
      4,
      28,
      ['first-vote', 'consistent-voter', 'delegate', 'guardian', 'policy-author', 'policy-shaper'],
      recognized,
    );

    expect(profile.stewardId).toBe('s1');
    expect(profile.stewardName).toBe('Alice');
    expect(profile.assignedRoles).toHaveLength(8);
    expect(profile.totalMonthlyAllocationSats).toBeGreaterThan(0);
    expect(profile.lastEvaluatedIso).toBeDefined();

    const fundedCount = profile.assignedRoles.filter((r) => r.monthlyFundingEstimateSats > 0).length;
    expect(fundedCount).toBe(2);

    expect(profile.allocationBreakdown['governance-rewards']).toBeGreaterThan(0);
  });

  it('new steward member has zero allocation', () => {
    const profile = buildTreasuryFundedRoleProfile(
      { ...baseSteward, roles: ['member'] as const },
      0,
      0,
      [],
      new Set(),
    );

    expect(profile.totalMonthlyAllocationSats).toBe(0);
    expect(profile.allocationBreakdown['community-rewards']).toBe(0);
    expect(profile.allocationBreakdown['governance-rewards']).toBe(0);
    expect(profile.allocationBreakdown['operational-rewards']).toBe(0);
    expect(profile.allocationBreakdown['treasury-reserve']).toBe(0);
  });

  it('distinguishes contributors from funded stewards', () => {
    const profile = buildTreasuryFundedRoleProfile(
      { ...baseSteward, roles: ['contributor', 'delegate'] as const },
      3,
      15,
      ['first-vote', 'consistent-voter', 'delegate'],
      new Set(['governance-delegate']),
    );

    const funded = profile.assignedRoles.filter((r) => r.monthlyFundingEstimateSats > 0);
    const unfunded = profile.assignedRoles.filter((r) => r.monthlyFundingEstimateSats === 0);

    expect(funded.length).toBeGreaterThan(0);
    expect(unfunded.length).toBeGreaterThan(0);
  });
});
