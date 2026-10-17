import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BabylonStakingEngine,
  MAX_BABYLON_STAKING_CAPACITY,
  DEFAULT_UNBONDING_TIMELOCK_BLOCKS,
} from '../lib/support/babylon';

describe('BabylonStakingEngine (G-43)', () => {
  let engine: BabylonStakingEngine;

  beforeEach(() => {
    engine = new BabylonStakingEngine();
  });

  it('should successfully create a valid staking delegation in pending state', () => {
    const delegation = engine.createDelegation({
      stakerPubKey: '02a161708452787d7f272a24fa6e42b2f72a4417740263f3508f7d98305c4d6a59',
      finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
      amountSat: 10_000_000,
      stakingTxHash: 'd5a0a38d17f8b9e6e897918a24c5826f00223942385e49320141620021650893',
      currentBlockHeight: 850000,
    });

    expect(delegation.delegationId).toBeDefined();
    expect(delegation.state).toBe('pending');
    expect(delegation.amountSat).toBe(10_000_000);
    expect(delegation.unbondingTimelockBlocks).toBe(DEFAULT_UNBONDING_TIMELOCK_BLOCKS);
    expect(delegation.accruedYieldSat).toBe(0);
  });

  it('should fail-closed when parameters are invalid or empty', () => {
    expect(() =>
      engine.createDelegation({
        stakerPubKey: '',
        finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
        amountSat: 10_000_000,
        stakingTxHash: 'd5a0a38d17f8b9e6e897918a24c5826f00223942385e49320141620021650893',
        currentBlockHeight: 850000,
      })
    ).toThrow('[Babylon] Invalid stakerPubKey provided');

    expect(() =>
      engine.createDelegation({
        stakerPubKey: '02a161708452787d7f272a24fa6e42b2f72a4417740263f3508f7d98305c4d6a59',
        finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
        amountSat: -500,
        stakingTxHash: 'd5a0a38d17f8b9e6e897918a24c5826f00223942385e49320141620021650893',
        currentBlockHeight: 850000,
      })
    ).toThrow('[Babylon] Staking amount must be greater than zero');
  });

  it('should activate, unbond, and complete withdrawal upon timelock maturity', () => {
    const delegation = engine.createDelegation({
      stakerPubKey: '02a161708452787d7f272a24fa6e42b2f72a4417740263f3508f7d98305c4d6a59',
      finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
      amountSat: 50_000_000,
      stakingTxHash: 'e6b1b49e28f9c0f7f908029b35d6937g11334053496f50431252731132761904',
      currentBlockHeight: 850000,
      unbondingTimelockBlocks: 100,
    });

    // Activate
    const active = engine.activateDelegation(delegation.delegationId);
    expect(active.state).toBe('active');

    // Initiate Unbonding at block 850050
    const unbonding = engine.initiateUnbonding(delegation.delegationId, 850050);
    expect(unbonding.state).toBe('unbonding');
    expect(unbonding.unbondingTargetBlock).toBe(850150);

    // Premature withdrawal attempt at block 850100 should fail
    expect(() => engine.completeWithdrawal(delegation.delegationId, 850100)).toThrow(
      'timelock not matured'
    );

    // Withdrawal at block 850150 should succeed
    const withdrawn = engine.completeWithdrawal(delegation.delegationId, 850150);
    expect(withdrawn.state).toBe('withdrawn');
    expect(withdrawn.withdrawnAtBlock).toBe(850150);
  });

  it('should support slashing upon cryptographic evidence of misbehavior', () => {
    const delegation = engine.createDelegation({
      stakerPubKey: '02a161708452787d7f272a24fa6e42b2f72a4417740263f3508f7d98305c4d6a59',
      finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
      amountSat: 20_000_000,
      stakingTxHash: 'f7c2c50f39g0d1g8g019130c46e7048h22445164507g61542363842243872015',
      currentBlockHeight: 850000,
    });

    engine.activateDelegation(delegation.delegationId);

    const slashed = engine.slashDelegation(
      delegation.delegationId,
      850020,
      'DoubleSignProofSig1Sig2Block850020'
    );

    expect(slashed.state).toBe('slashed');
    expect(slashed.slashedAtBlock).toBe(850020);
    expect(slashed.slashingReason).toContain('DoubleSignProof');
  });

  it('should calculate accrued yield for active delegations', () => {
    const delegation = engine.createDelegation({
      stakerPubKey: '02a161708452787d7f272a24fa6e42b2f72a4417740263f3508f7d98305c4d6a59',
      finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
      amountSat: 100_000_000, // 1 BTC
      stakingTxHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
      currentBlockHeight: 850000,
    });

    engine.activateDelegation(delegation.delegationId);

    // Calculate yield after 52,560 blocks (~1 year) at 5.2% APR -> ~5,200,000 sats
    const yieldSat = engine.calculateYield(delegation.delegationId, 52560);
    expect(yieldSat).toBeGreaterThan(5_100_000);
    expect(yieldSat).toBeLessThan(5_300_000);
  });

  it('should enforce capacity limits (MAX_BABYLON_STAKING_CAPACITY)', () => {
    // Fill engine to capacity
    for (let i = 0; i < MAX_BABYLON_STAKING_CAPACITY; i++) {
      engine.createDelegation({
        stakerPubKey: '02a161708452787d7f272a24fa6e42b2f72a4417740263f3508f7d98305c4d6a59',
        finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
        amountSat: 1_000_000,
        stakingTxHash: `txhash-${i}-${Date.now()}`,
        currentBlockHeight: 850000,
      });
    }

    expect(engine.getMetrics().totalDelegations).toBe(MAX_BABYLON_STAKING_CAPACITY);

    expect(() =>
      engine.createDelegation({
        stakerPubKey: '02a161708452787d7f272a24fa6e42b2f72a4417740263f3508f7d98305c4d6a59',
        finalityProviderPubKey: '03b272819563898e8f383b35gb7f53c3g83b5528851374g4619g8ea9416d5e7b60',
        amountSat: 1_000_000,
        stakingTxHash: 'overflow-txhash',
        currentBlockHeight: 850000,
      })
    ).toThrow('Engine capacity limit reached');
  });
});
