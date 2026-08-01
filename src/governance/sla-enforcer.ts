/**
 * SLA Enforcer — monitors Job Cards against Stacks block-timestamp deadlines.
 *
 * Implements CON-791 trust-tier-aware SLA enforcement using canonical CJCS types.
 * When a job card breaches its deadline, this module calculates the yield slash
 * percentage and determines whether to trigger autonomous gap job card generation
 * (Satori <70% bottleneck rule).
 *
 * Wire path: conxius-platform SLA enforcer -> cjcs.ts -> lib-conxian-core::cjcs
 *            -> sla-enforcer.clar -> referral-aggregator.clar
 */

import type { JobCard, SlaRecord, SlaSeverity, TrustTier } from './cjcs';

/** Severity thresholds per trust tier. */
const SEVERITY_THRESHOLDS: Record<TrustTier, { warning: number; breach: number; critical: number }> = {
  Strict: { warning: -10, breach: -5, critical: 0 },
  Managed: { warning: -30, breach: -15, critical: 0 },
  Expedient: { warning: -60, breach: -30, critical: 0 },
};

/** Slash percentages per severity. */
const SLASH_PERCENTAGES: Record<SlaSeverity, number> = {
  Warning: 2,
  Breach: 5,
  Critical: 15,
};

/**
 * Evaluate SLA status for a job card at a given block height.
 * Returns an SLA record with severity, slash percentage, and gap card trigger.
 */
export function evaluateSla(jobCard: JobCard, currentBlock: number): SlaRecord {
  const blocksRemaining = jobCard.deadlineBlock - currentBlock;
  const thresholds = SEVERITY_THRESHOLDS[jobCard.trustTier];

  let severity: SlaSeverity;
  if (blocksRemaining <= thresholds.critical) {
    severity = 'Critical';
  } else if (blocksRemaining <= thresholds.breach) {
    severity = 'Breach';
  } else if (blocksRemaining <= thresholds.warning) {
    severity = 'Warning';
  } else {
    severity = 'Warning';
  }

  // Satori bottleneck rule: if severity is Breach or Critical, generate gap job card
  const triggerGapJobCard = severity === 'Breach' || severity === 'Critical';

  return {
    jobCardId: jobCard.id,
    checkBlock: currentBlock,
    blocksRemaining,
    severity,
    slashPercent: SLASH_PERCENTAGES[severity],
    triggerGapJobCard,
  };
}

/**
 * Generate a Gap Job Card payload when Satori detects performance below 70%.
 * This mirrors the canonical CJCS v2.0 Gap Job Card schema.
 */
export function generateGapJobCard(
  failedJob: JobCard,
  performancePercent: number,
  blockHeight: number,
): Partial<JobCard> {
  return {
    title: `GAP: ${failedJob.title} (Performance: ${performancePercent}%)`,
    description: `Autonomous gap job card triggered by Satori Reasoning.\nOriginal job: ${failedJob.id}\nPerformance: ${performancePercent}% (below 70% threshold)\nTrigger block: ${blockHeight}`,
    creator: 'satori-automation.conxian',
    state: 'Published',
    trustTier: failedJob.trustTier,
    rewardUstx: Math.floor(failedJob.rewardUstx * 1.25), // 25% premium for gap fill
    createdAtBlock: blockHeight,
    deadlineBlock: blockHeight + Math.ceil(failedJob.deadlineBlock - failedJob.createdAtBlock) / 2,
    metadata: {
      gapReason: 'satori-below-70',
      originalJobId: failedJob.id,
      performanceAtTrigger: String(performancePercent),
    },
  };
}
