import { describe, it, expect, beforeEach } from 'vitest';
import { SolverSelectionEngine } from '../lib/support/solver';

describe('SolverSelectionEngine (G-12)', () => {
  let engine: SolverSelectionEngine;

  beforeEach(() => {
    engine = new SolverSelectionEngine();
  });

  it('should rank solvers based on supported chains', () => {
    const ranked = engine.rankSolvers('btc', 1000000);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every(s => s.supportedChains.includes('btc'))).toBe(true);
  });

  it('should prefer higher reputation and lower fees (simulated)', () => {
    const ranked = engine.rankSolvers('btc', 1000000);
    // Alpha Solver has 98 reputation, Beta has 92 but lower fees.
    // In our weights, Alpha likely wins on reputation unless fees are vastly different.
    expect(ranked[0].id).toBe('solver-1');
  });

  it('should generate a binding bid for an intent', async () => {
    const bid = await engine.selectBest('intent-123', 'stacks', 500000);
    expect(bid).toBeDefined();
    expect(bid?.intentId).toBe('intent-123');
    expect(bid?.signature).toContain('solver-');
  });
});
