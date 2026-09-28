import { describe, it, expect, beforeEach } from 'vitest';
import { SolverSelectionEngine, SolverBid } from '../lib/support/solver';

describe('SolverSelectionEngine (G-12 / CON-1307)', () => {
  let engine: SolverSelectionEngine;

  beforeEach(() => {
    engine = new SolverSelectionEngine();
  });

  it('should rank default solvers based on supported chains', () => {
    const ranked = engine.rankSolvers('btc', 1000000);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every(s => s.supportedChains.includes('btc'))).toBe(true);
  });

  it('should rank solvers accurately based on weighted composite score', () => {
    const ranked = engine.rankSolvers('btc', 1000000);
    // Alpha Solver has 98 reputation, fee 15 bps, latency 120ms
    expect(ranked[0].id).toBe('solver-1');
    expect(ranked[0].score).toBeGreaterThan(90);
  });

  it('should generate and verify a binding signed bid for an intent', async () => {
    const bid = await engine.selectBest('intent-123', 'stacks', 500000);
    expect(bid).toBeDefined();
    expect(bid?.intentId).toBe('intent-123');
    expect(bid?.solverId).toBe('solver-1');
    expect(bid?.totalFeeSat).toBe(750); // 500000 * 15 / 10000 = 750 sats
    expect(bid?.signature).toBeDefined();

    // Verify cryptographic signature
    const isValid = engine.verifyBidSignature(bid as SolverBid);
    expect(isValid).toBe(true);
  });

  it('should fail verification if bid payload is tampered', async () => {
    const bid = await engine.selectBest('intent-456', 'btc', 1000000);
    expect(bid).toBeDefined();

    const tamperedBid: SolverBid = {
      ...(bid as SolverBid),
      amountSat: 2000000, // Tampered amount
    };

    const isValid = engine.verifyBidSignature(tamperedBid);
    expect(isValid).toBe(false);
  });

  it('should filter solvers based on custom SLA parameters', () => {
    // Register high fee solver
    engine.registerSolver({
      id: 'solver-high-fee',
      name: 'Expensive Solver',
      reputation: 99,
      supportedChains: ['btc'],
      latency_ms: 100,
      fee_bps: 500, // 5% fee
    });

    // Default SLA excludes fee_bps > 200
    const defaultRanked = engine.rankSolvers('btc', 1000000);
    expect(defaultRanked.find(s => s.id === 'solver-high-fee')).toBeUndefined();

    // Relaxed SLA includes high fee solver
    const relaxedRanked = engine.rankSolvers('btc', 1000000, { maxFeeBps: 1000 });
    expect(relaxedRanked.find(s => s.id === 'solver-high-fee')).toBeDefined();
  });

  it('should dynamically register and deregister solvers', () => {
    const newSolver = engine.registerSolver({
      id: 'solver-citrea-1',
      name: 'Citrea Liquidity',
      reputation: 95,
      supportedChains: ['citrea'],
      latency_ms: 200,
      fee_bps: 8,
    });

    expect(newSolver.id).toBe('solver-citrea-1');
    const citreaSolvers = engine.rankSolvers('citrea', 500000);
    expect(citreaSolvers.find(s => s.id === 'solver-citrea-1')).toBeDefined();

    const deregistered = engine.deregisterSolver('solver-citrea-1');
    expect(deregistered).toBe(true);
    const postDeregisterSolvers = engine.rankSolvers('citrea', 500000);
    expect(postDeregisterSolvers.find(s => s.id === 'solver-citrea-1')).toBeUndefined();
  });

  it('should return undefined if no solver matches requested chain or SLA', async () => {
    const bid = await engine.selectBest('intent-789', 'nonexistent-chain', 100000);
    expect(bid).toBeUndefined();
  });

  it('should enforce capacity limits on solver registration', () => {
    const constrainedEngine = new SolverSelectionEngine({ maxSolvers: 3 });
    expect(() => {
      constrainedEngine.registerSolver({
        id: 'solver-overflow',
        name: 'Overflow Solver',
        reputation: 80,
        supportedChains: ['btc'],
        latency_ms: 300,
        fee_bps: 20,
      });
    }).toThrow('Solver engine capacity exceeded max limit of 3');
  });
});
