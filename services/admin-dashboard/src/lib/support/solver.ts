/**
 * G-12: ERC-7683 Solver Selection Algorithm (CON-1307)
 *
 * This module coordinates the selection of cross-chain solvers
 * for USI Intents, using a score-based ranking system.
 */

export interface Solver {
  id: string;
  name: string;
  reputation: number; // 0-100
  supportedChains: string[];
  latency_ms: number;
  fee_bps: number; // basis points
}

export interface SolverBid {
  solverId: string;
  intentId: string;
  estimatedTime_sec: number;
  totalFee_sats: number;
  signature: string;
}

export class SolverSelectionEngine {
  private solvers: Solver[] = [
    { id: 'solver-1', name: 'Alpha Solver', reputation: 98, supportedChains: ['btc', 'stacks', 'eth'], latency_ms: 120, fee_bps: 15 },
    { id: 'solver-2', name: 'Beta Liquidity', reputation: 92, supportedChains: ['btc', 'lightning'], latency_ms: 450, fee_bps: 5 },
    { id: 'solver-3', name: 'Gamma Bridge', reputation: 85, supportedChains: ['stacks', 'liquid'], latency_ms: 800, fee_bps: 10 }
  ];

  /**
   * Ranks available solvers for a given intent based on weighted metrics.
   * Weights: Reputation (40%), Fee (40%), Latency (20%).
   */
  public rankSolvers(targetChain: string, amount_sats: number): Solver[] {
    console.log(`[ERC-7683] Ranking solvers for chain: ${targetChain} and amount: ${amount_sats} sats`);

    return this.solvers
      .filter(s => s.supportedChains.includes(targetChain))
      .map(solver => {
        // Simple normalization and scoring
        const feeScore = (100 - (solver.fee_bps * 2)); // Lower fee is better
        const latencyScore = Math.max(0, 100 - (solver.latency_ms / 10)); // Lower latency is better
        const score = (solver.reputation * 0.4) + (feeScore * 0.4) + (latencyScore * 0.2);

        return { ...solver, score };
      })
      .sort((a: any, b: any) => b.score - a.score);
  }

  /**
   * Selects the best solver and requests a binding bid.
   */
  public async selectBest(intentId: string, targetChain: string, amount_sats: number): Promise<SolverBid | undefined> {
    const ranked = this.rankSolvers(targetChain, amount_sats);
    if (ranked.length === 0) return undefined;

    const best = ranked[0];
    console.log(`[ERC-7683] Selected best solver: ${best.name} for intent: ${intentId}`);

    // Simulate bid generation
    return {
      solverId: best.id,
      intentId,
      estimatedTime_sec: Math.ceil(best.latency_ms / 100),
      totalFee_sats: Math.ceil(amount_sats * (best.fee_bps / 10000)),
      signature: `sig-${best.id}-${intentId}`
    };
  }
}

export const solverSelectionEngine = new SolverSelectionEngine();
