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

const SEVERITY_THRESHOLDS: Record<TrustTier, { warning: number; breach: number; critical: number }> = {
  Strict: { warning: -10, breach: -5, critical: 0 },
  Managed: { warning: -30, breach: -15, critical: 0 },
  Expedient: { warning: -60, breach: -30, critical: 0 },
  ObserverOnly: { warning: -100, breach: -50, critical: 0 },
};

const SLASH_PERCENTAGES: Record<SlaSeverity, number> = {
  Warning: 2,
  Breach: 5,
  Critical: 15,
};

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

export function generateGapJobCard(
  failedJob: JobCard,
  performancePercent: number,
  blockHeight: number,
): Partial<JobCard> {
  return {
    context: `GAP: ${failedJob.context} (Performance: ${performancePercent}%)`,
    type: failedJob.type,
    workIntent: {
      senderAddress: 'satori-automation.conxian',
      receiverAddress: failedJob.workIntent.receiverAddress,
      taskId: `gap-${failedJob.id}`,
      amountSbtc: Math.floor(failedJob.workIntent.amountSbtc * 1.25),
    },
    id: `gap-${failedJob.id}`,
    state: 'Published',
    trustTier: failedJob.trustTier,
    createdAtBlock: blockHeight,
    deadlineBlock: blockHeight + Math.ceil((failedJob.deadlineBlock - failedJob.createdAtBlock) / 2),
  };
}
