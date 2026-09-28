import { createLogger } from "./logger";
import { createHash, createHmac } from "crypto";

const logger = createLogger("ERC-7683");

/**
 * G-12: ERC-7683 Cross-Chain Intent Solver Selection Engine (CON-1307)
 *
 * This module coordinates the discovery, registration, SLA filtering, ranking,
 * and deterministic binding bid generation for ERC-7683 cross-chain solvers.
 */

export interface SolverSLA {
  minReputation: number;    // 0 - 100
  maxFeeBps: number;        // Max fee in basis points (e.g., 100 = 1%)
  maxLatencyMs: number;     // Max execution latency in ms
}

export interface Solver {
  id: string;
  name: string;
  reputation: number;        // 0 - 100
  supportedChains: string[]; // e.g. ['btc', 'stacks', 'eth', 'lightning', 'liquid', 'citrea']
  latency_ms: number;
  fee_bps: number;           // Basis points
  active: boolean;
  score?: number;
}

export interface SolverBid {
  bidId: string;
  solverId: string;
  solverName: string;
  intentId: string;
  targetChain: string;
  amountSat: number;
  estimatedTimeSec: number;
  totalFeeSat: number;
  feeBps: number;
  signature: string;
  timestampIso: string;
}

export interface SolverEngineConfig {
  maxSolvers?: number;
  secretKey?: string;
  defaultSLA?: SolverSLA;
}

export class SolverSelectionEngine {
  private solvers: Map<string, Solver> = new Map();
  private maxSolvers: number;
  private secretKey: string;
  private defaultSLA: SolverSLA;

  constructor(config: SolverEngineConfig = {}) {
    this.maxSolvers = config.maxSolvers ?? 100;
    this.secretKey = config.secretKey ?? "conxian-erc7683-solver-secret-v1";
    this.defaultSLA = config.defaultSLA ?? {
      minReputation: 50,
      maxFeeBps: 200,      // Max 2%
      maxLatencyMs: 5000,  // Max 5 seconds
    };

    // Initialize default reference solvers
    this.registerSolver({ id: 'solver-1', name: 'Alpha Solver', reputation: 98, supportedChains: ['btc', 'stacks', 'eth', 'citrea'], latency_ms: 120, fee_bps: 15, active: true });
    this.registerSolver({ id: 'solver-2', name: 'Beta Liquidity', reputation: 92, supportedChains: ['btc', 'lightning', 'stacks'], latency_ms: 450, fee_bps: 5, active: true });
    this.registerSolver({ id: 'solver-3', name: 'Gamma Bridge', reputation: 85, supportedChains: ['stacks', 'liquid', 'eth'], latency_ms: 800, fee_bps: 10, active: true });
  }

  /**
   * Registers or updates a solver in the engine registry with capacity verification.
   */
  public registerSolver(solver: Omit<Solver, "active"> & { active?: boolean }): Solver {
    if (!solver.id || typeof solver.id !== "string" || solver.id.trim() === "") {
      logger.error("[G-12] Registration failed: solver ID is required.");
      throw new Error("Solver ID is required");
    }

    if (!solver.supportedChains || solver.supportedChains.length === 0) {
      logger.error(`[G-12] Registration failed for ${solver.id}: supportedChains cannot be empty.`);
      throw new Error("Supported chains list cannot be empty");
    }

    if (this.solvers.size >= this.maxSolvers && !this.solvers.has(solver.id)) {
      logger.error(`[G-12] Engine capacity limit reached (${this.maxSolvers} solvers).`);
      throw new Error(`Solver engine capacity exceeded max limit of ${this.maxSolvers}`);
    }

    const fullSolver: Solver = {
      ...solver,
      reputation: Math.max(0, Math.min(100, solver.reputation)),
      latency_ms: Math.max(0, solver.latency_ms),
      fee_bps: Math.max(0, solver.fee_bps),
      active: solver.active ?? true,
    };

    this.solvers.set(solver.id, fullSolver);
    logger.info(`[G-12] Registered solver ${fullSolver.name} (${fullSolver.id}) with ${fullSolver.supportedChains.length} supported chains.`);
    return fullSolver;
  }

  /**
   * Deregisters a solver from the engine.
   */
  public deregisterSolver(solverId: string): boolean {
    const deleted = this.solvers.delete(solverId);
    if (deleted) {
      logger.info(`[G-12] Deregistered solver ${solverId}`);
    }
    return deleted;
  }

  /**
   * Retrieves all active registered solvers.
   */
  public getSolvers(): Solver[] {
    return Array.from(this.solvers.values()).filter((s) => s.active);
  }

  /**
   * Ranks available solvers for a given intent based on weighted SLA metrics.
   * Ranking weights: Reputation (40%), Fee BPS (40%), Latency (20%).
   */
  public rankSolvers(targetChain: string, amountSat: number, slaFilter?: Partial<SolverSLA>): Solver[] {
    if (!targetChain || typeof targetChain !== "string" || targetChain.trim() === "") {
      logger.error("[G-12] rankSolvers failed: targetChain is required.");
      return [];
    }

    if (!amountSat || amountSat <= 0) {
      logger.error("[G-12] rankSolvers failed: amountSat must be a positive integer.");
      return [];
    }

    const sla: SolverSLA = {
      minReputation: slaFilter?.minReputation ?? this.defaultSLA.minReputation,
      maxFeeBps: slaFilter?.maxFeeBps ?? this.defaultSLA.maxFeeBps,
      maxLatencyMs: slaFilter?.maxLatencyMs ?? this.defaultSLA.maxLatencyMs,
    };

    const normalizedChain = targetChain.toLowerCase().trim();

    return Array.from(this.solvers.values())
      .filter((s) => s.active)
      .filter((s) => s.supportedChains.map((c) => c.toLowerCase()).includes(normalizedChain))
      .filter((s) => s.reputation >= sla.minReputation)
      .filter((s) => s.fee_bps <= sla.maxFeeBps)
      .filter((s) => s.latency_ms <= sla.maxLatencyMs)
      .map((solver) => {
        // Fee Score: 0 BPS = 100, 200 BPS = 0
        const feeScore = Math.max(0, 100 - solver.fee_bps * 0.5);
        // Latency Score: 0ms = 100, 5000ms = 0
        const latencyScore = Math.max(0, 100 - solver.latency_ms / 50);
        // Weighted Composite Score
        const score = solver.reputation * 0.4 + feeScore * 0.4 + latencyScore * 0.2;

        return { ...solver, score: Number(score.toFixed(2)) };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  /**
   * Selects the highest ranked solver matching SLA and generates a cryptographically signed binding bid.
   */
  public async selectBest(
    intentId: string,
    targetChain: string,
    amountSat: number,
    slaFilter?: Partial<SolverSLA>
  ): Promise<SolverBid | undefined> {
    if (!intentId || typeof intentId !== "string" || intentId.trim() === "") {
      logger.error("[G-12] selectBest failed: intentId is required.");
      return undefined;
    }

    const ranked = this.rankSolvers(targetChain, amountSat, slaFilter);
    if (ranked.length === 0) {
      logger.warn(`[G-12] No eligible solvers found matching chain=${targetChain}, amount=${amountSat}Sat, SLA criteria.`);
      return undefined;
    }

    const best = ranked[0];
    const timestampIso = new Date().toISOString();
    const totalFeeSat = Math.max(1, Math.ceil(amountSat * (best.fee_bps / 10000)));
    const estimatedTimeSec = Math.max(1, Math.ceil(best.latency_ms / 1000));
    const bidId = `bid-${best.id}-${createHash("sha256").update(`${intentId}:${timestampIso}`).digest("hex").slice(0, 12)}`;

    // Cryptographic binding signature calculation
    const payload = `bid:${bidId}:intent:${intentId}:solver:${best.id}:chain:${targetChain}:amount:${amountSat}:fee:${totalFeeSat}:time:${timestampIso}`;
    const signature = createHmac("sha256", this.secretKey).update(payload).digest("hex");

    logger.info(`[G-12] Selected best solver ${best.name} (${best.id}) with score ${best.score} for intent ${intentId}. Bid ${bidId} issued.`);

    return {
      bidId,
      solverId: best.id,
      solverName: best.name,
      intentId,
      targetChain: targetChain.toLowerCase().trim(),
      amountSat,
      estimatedTimeSec,
      totalFeeSat,
      feeBps: best.fee_bps,
      signature,
      timestampIso,
    };
  }

  /**
   * Verifies the authenticity and integrity of a SolverBid signature.
   */
  public verifyBidSignature(bid: SolverBid): boolean {
    if (!bid || !bid.bidId || !bid.intentId || !bid.solverId || !bid.signature) {
      return false;
    }

    const payload = `bid:${bid.bidId}:intent:${bid.intentId}:solver:${bid.solverId}:chain:${bid.targetChain}:amount:${bid.amountSat}:fee:${bid.totalFeeSat}:time:${bid.timestampIso}`;
    const expectedSignature = createHmac("sha256", this.secretKey).update(payload).digest("hex");

    return bid.signature === expectedSignature;
  }
}

export const solverSelectionEngine = new SolverSelectionEngine();
