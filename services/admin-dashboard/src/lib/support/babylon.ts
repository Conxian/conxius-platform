/**
 * Babylon Bitcoin Staking Protocol Engine (G-43)
 * Non-custodial Bitcoin staking orchestration, delegation state machine enforcement,
 * unbonding timelock verification, slashing attestations, and capacity bounds.
 */

import { createLogger } from './logger';

const logger = createLogger('babylon');

export const MAX_BABYLON_STAKING_CAPACITY = 1000;
export const DEFAULT_UNBONDING_TIMELOCK_BLOCKS = 1008; // ~7 days at 10 min/block
export const DEFAULT_STAKING_APR = 0.052; // 5.2% APR baseline yield

export type BabylonDelegationState =
  | 'pending'
  | 'active'
  | 'unbonding'
  | 'withdrawn'
  | 'slashed'
  | 'tombstoned';

export interface BabylonStakingDelegation {
  delegationId: string;
  stakerPubKey: string;
  finalityProviderPubKey: string;
  amountSat: number;
  state: BabylonDelegationState;
  stakingTxHash: string;
  unbondingTimelockBlocks: number;
  stakedAtBlock: number;
  unbondingStartedAtBlock?: number;
  unbondingTargetBlock?: number;
  withdrawnAtBlock?: number;
  slashedAtBlock?: number;
  slashingReason?: string;
  accruedYieldSat: number;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface CreateDelegationParams {
  stakerPubKey: string;
  finalityProviderPubKey: string;
  amountSat: number;
  stakingTxHash: string;
  currentBlockHeight: number;
  unbondingTimelockBlocks?: number;
}

export interface BabylonStakingMetrics {
  totalDelegations: number;
  activeDelegations: number;
  unbondingDelegations: number;
  withdrawnDelegations: number;
  slashedDelegations: number;
  tombstonedDelegations: number;
  totalStakedSat: number;
  totalYieldAccruedSat: number;
}

export class BabylonStakingEngine {
  private delegations: Map<string, BabylonStakingDelegation> = new Map();

  /**
   * Create a new Babylon Bitcoin Staking Delegation.
   */
  public createDelegation(params: CreateDelegationParams): BabylonStakingDelegation {
    if (this.delegations.size >= MAX_BABYLON_STAKING_CAPACITY) {
      logger.error('Delegation creation failed: capacity limit reached', {
        capacity: MAX_BABYLON_STAKING_CAPACITY,
      });
      throw new Error(`[Babylon] Engine capacity limit reached: max ${MAX_BABYLON_STAKING_CAPACITY} delegations supported`);
    }

    if (!params.stakerPubKey || params.stakerPubKey.trim() === '') {
      throw new Error('[Babylon] Invalid stakerPubKey provided');
    }

    if (!params.finalityProviderPubKey || params.finalityProviderPubKey.trim() === '') {
      throw new Error('[Babylon] Invalid finalityProviderPubKey provided');
    }

    if (!params.amountSat || params.amountSat <= 0) {
      throw new Error('[Babylon] Staking amount must be greater than zero');
    }

    if (!params.stakingTxHash || params.stakingTxHash.trim() === '') {
      throw new Error('[Babylon] Invalid stakingTxHash provided');
    }

    const delegationId = `babylon-${params.stakingTxHash.slice(0, 12)}-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const delegation: BabylonStakingDelegation = {
      delegationId,
      stakerPubKey: params.stakerPubKey,
      finalityProviderPubKey: params.finalityProviderPubKey,
      amountSat: params.amountSat,
      state: 'pending',
      stakingTxHash: params.stakingTxHash,
      unbondingTimelockBlocks: params.unbondingTimelockBlocks ?? DEFAULT_UNBONDING_TIMELOCK_BLOCKS,
      stakedAtBlock: params.currentBlockHeight,
      accruedYieldSat: 0,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    this.delegations.set(delegationId, delegation);
    logger.info('Created Babylon staking delegation', { delegationId, amountSat: params.amountSat });
    return { ...delegation };
  }

  /**
   * Activate a pending delegation upon on-chain confirmation.
   */
  public activateDelegation(delegationId: string): BabylonStakingDelegation {
    const delegation = this.getDelegationOrThrow(delegationId);

    if (delegation.state !== 'pending') {
      throw new Error(`[Babylon] Cannot activate delegation ${delegationId}: current state is ${delegation.state}`);
    }

    delegation.state = 'active';
    delegation.updatedAtIso = new Date().toISOString();
    logger.info('Activated Babylon staking delegation', { delegationId });
    return { ...delegation };
  }

  /**
   * Initiate unbonding for an active delegation.
   */
  public initiateUnbonding(delegationId: string, currentBlockHeight: number): BabylonStakingDelegation {
    const delegation = this.getDelegationOrThrow(delegationId);

    if (delegation.state !== 'active') {
      throw new Error(`[Babylon] Cannot initiate unbonding for delegation ${delegationId}: state is ${delegation.state}`);
    }

    delegation.state = 'unbonding';
    delegation.unbondingStartedAtBlock = currentBlockHeight;
    delegation.unbondingTargetBlock = currentBlockHeight + delegation.unbondingTimelockBlocks;
    delegation.updatedAtIso = new Date().toISOString();

    logger.info('Initiated unbonding for Babylon delegation', {
      delegationId,
      startedAtBlock: currentBlockHeight,
      targetBlock: delegation.unbondingTargetBlock,
    });

    return { ...delegation };
  }

  /**
   * Complete withdrawal once the unbonding timelock has matured.
   */
  public completeWithdrawal(delegationId: string, currentBlockHeight: number): BabylonStakingDelegation {
    const delegation = this.getDelegationOrThrow(delegationId);

    if (delegation.state !== 'unbonding') {
      throw new Error(`[Babylon] Cannot complete withdrawal for delegation ${delegationId}: state is ${delegation.state}`);
    }

    if (!delegation.unbondingTargetBlock || currentBlockHeight < delegation.unbondingTargetBlock) {
      const remainingBlocks = (delegation.unbondingTargetBlock ?? currentBlockHeight) - currentBlockHeight;
      throw new Error(`[Babylon] Cannot withdraw delegation ${delegationId}: timelock not matured (${remainingBlocks} blocks remaining)`);
    }

    delegation.state = 'withdrawn';
    delegation.withdrawnAtBlock = currentBlockHeight;
    delegation.updatedAtIso = new Date().toISOString();

    logger.info('Completed withdrawal for Babylon delegation', { delegationId, withdrawnAtBlock: currentBlockHeight });
    return { ...delegation };
  }

  /**
   * Slash a delegation upon proof of malicious double-signing by finality provider.
   */
  public slashDelegation(delegationId: string, currentBlockHeight: number, proofEvidence: string): BabylonStakingDelegation {
    const delegation = this.getDelegationOrThrow(delegationId);

    if (delegation.state === 'withdrawn' || delegation.state === 'tombstoned') {
      throw new Error(`[Babylon] Cannot slash delegation ${delegationId}: already terminal (${delegation.state})`);
    }

    if (!proofEvidence || proofEvidence.trim() === '') {
      throw new Error('[Babylon] Slashing requires non-empty proof evidence');
    }

    delegation.state = 'slashed';
    delegation.slashedAtBlock = currentBlockHeight;
    delegation.slashingReason = `Slashed due to malicious behavior proof: ${proofEvidence.slice(0, 30)}`;
    delegation.updatedAtIso = new Date().toISOString();

    logger.warn('Delegation slashed for finality provider misbehavior', { delegationId, proofEvidence });
    return { ...delegation };
  }

  /**
   * Archive/tombstone terminal delegations.
   */
  public tombstoneDelegation(delegationId: string): BabylonStakingDelegation {
    const delegation = this.getDelegationOrThrow(delegationId);

    if (delegation.state !== 'withdrawn' && delegation.state !== 'slashed') {
      throw new Error(`[Babylon] Only withdrawn or slashed delegations can be tombstoned (current state: ${delegation.state})`);
    }

    delegation.state = 'tombstoned';
    delegation.updatedAtIso = new Date().toISOString();

    logger.info('Tombstoned Babylon delegation', { delegationId });
    return { ...delegation };
  }

  /**
   * Update accrued yield for active delegations based on blocks elapsed.
   */
  public calculateYield(delegationId: string, blocksElapsed: number, customApr = DEFAULT_STAKING_APR): number {
    const delegation = this.getDelegationOrThrow(delegationId);

    if (delegation.state !== 'active') {
      return delegation.accruedYieldSat;
    }

    // Approx 52,560 blocks per year (10-minute target)
    const yearFraction = blocksElapsed / 52560;
    const additionalYieldSat = Math.floor(delegation.amountSat * customApr * yearFraction);
    delegation.accruedYieldSat += additionalYieldSat;
    delegation.updatedAtIso = new Date().toISOString();

    return delegation.accruedYieldSat;
  }

  /**
   * Retrieve delegation by ID.
   */
  public getDelegation(delegationId: string): BabylonStakingDelegation | null {
    const delegation = this.delegations.get(delegationId);
    return delegation ? { ...delegation } : null;
  }

  /**
   * Return overall metrics for Babylon staking engine.
   */
  public getMetrics(): BabylonStakingMetrics {
    let active = 0;
    let unbonding = 0;
    let withdrawn = 0;
    let slashed = 0;
    let tombstoned = 0;
    let totalStakedSat = 0;
    let totalYieldSat = 0;

    for (const d of this.delegations.values()) {
      totalYieldSat += d.accruedYieldSat;

      switch (d.state) {
        case 'active':
          active++;
          totalStakedSat += d.amountSat;
          break;
        case 'unbonding':
          unbonding++;
          totalStakedSat += d.amountSat;
          break;
        case 'withdrawn':
          withdrawn++;
          break;
        case 'slashed':
          slashed++;
          break;
        case 'tombstoned':
          tombstoned++;
          break;
      }
    }

    return {
      totalDelegations: this.delegations.size,
      activeDelegations: active,
      unbondingDelegations: unbonding,
      withdrawnDelegations: withdrawn,
      slashedDelegations: slashed,
      tombstonedDelegations: tombstoned,
      totalStakedSat,
      totalYieldAccruedSat: totalYieldSat,
    };
  }

  private getDelegationOrThrow(delegationId: string): BabylonStakingDelegation {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) {
      throw new Error(`[Babylon] Delegation ${delegationId} not found`);
    }
    return delegation;
  }
}
