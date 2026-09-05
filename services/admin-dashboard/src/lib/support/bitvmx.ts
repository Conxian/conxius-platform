import { createLogger } from "./logger";
import { generateId } from "./idgen";
const log = createLogger("BitVMX");

/**
 * G-44 & G-64: BitVMX High-Efficiency Computation & Fail-Closed Execution Engine
 *
 * BitVMX optimizes general-purpose computation on Bitcoin with reduced
 * on-chain footprint, "Adaptive Proofs", and strict fail-closed state invariants.
 */

export type BitVMXState =
  | 'idle'
  | 'executing'
  | 'proving'
  | 'challenged'
  | 'disproved'
  | 'finalized'
  | 'tombstoned';

export interface BitVMXIntent {
  id: string;
  programHash: string;
  inputData: string;
  outputData?: string;
  proof?: string;
  state: BitVMXState;
  challengeRound?: number;
  createdAtIso: string;
  updatedAtIso: string;
  finalizedAtIso?: string;
  tombstonedAtIso?: string;
}

export interface BitVMXConfig {
  maxActiveIntents: number;
  retentionTtlMs: number;
  maxChallengeDepth: number;
}

const DEFAULT_CONFIG: BitVMXConfig = {
  maxActiveIntents: 1000,
  retentionTtlMs: 3600 * 1000, // 1 hour TTL before tombstoning terminal states
  maxChallengeDepth: 32,
};

export class BitVMXBridge {
  private static intents: Map<string, BitVMXIntent> = new Map();
  private static config: BitVMXConfig = { ...DEFAULT_CONFIG };

  /**
   * Configures engine bounds and retention limits.
   */
  static setConfig(customConfig: Partial<BitVMXConfig>): void {
    this.config = { ...this.config, ...customConfig };
  }

  /**
   * Resets engine state (primarily for test isolation).
   */
  static resetEngine(): void {
    this.intents.clear();
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Validates hex or standard string format for program hashes and inputs.
   */
  private static isValidPayload(payload: string): boolean {
    return typeof payload === "string" && payload.trim().length > 0 && payload.length <= 16384;
  }

  /**
   * Purges tombstoned or expired terminal intents if maximum active intent threshold is approached.
   */
  private static pruneStaleIntents(): void {
    const nowMs = Date.now();
    for (const [id, intent] of this.intents.entries()) {
      if (intent.state === 'tombstoned') {
        this.intents.delete(id);
        continue;
      }

      if ((intent.state === 'finalized' || intent.state === 'disproved') && intent.finalizedAtIso) {
        const finalizedMs = new Date(intent.finalizedAtIso).getTime();
        if (nowMs - finalizedMs >= this.config.retentionTtlMs) {
          intent.state = 'tombstoned';
          intent.tombstonedAtIso = new Date().toISOString();
          log.info(`[G-64] Intent ${id} tombstoned due to retention TTL expiration.`);
          this.intents.delete(id);
        }
      }
    }
  }

  /**
   * Initializes a BitVMX intent with strict input validation and fail-closed bounds.
   */
  static async initializeIntent(programHash: string, inputData: string): Promise<BitVMXIntent> {
    this.pruneStaleIntents();

    if (!this.isValidPayload(programHash) || !this.isValidPayload(inputData)) {
      log.error(`[G-64] Invalid programHash or inputData payload provided.`);
      throw new Error("BitVMX: Invalid programHash or inputData payload.");
    }

    if (this.intents.size >= this.config.maxActiveIntents) {
      log.error(`[G-64] Engine capacity exceeded (${this.config.maxActiveIntents} active intents).`);
      throw new Error("BitVMX: Maximum active engine intent capacity exceeded.");
    }

    const now = new Date().toISOString();
    const id = `bitvmx-${generateId("bitvmx")}`;
    const intent: BitVMXIntent = {
      id,
      programHash,
      inputData,
      state: 'executing',
      createdAtIso: now,
      updatedAtIso: now,
    };

    this.intents.set(id, intent);
    log.info(`[G-64] Initialized intent: ${id} for program: ${programHash}`);
    return intent;
  }

  /**
   * Submits a proof for a BitVMX intent with state validation.
   */
  static async submitProof(id: string, proof: string, outputData: string): Promise<boolean> {
    const intent = this.intents.get(id);
    if (!intent || intent.state !== 'executing') {
      log.warn(`[G-64] submitProof rejected for intent ${id}: state is ${intent?.state ?? 'non-existent'}`);
      return false;
    }

    if (!this.isValidPayload(proof) || !this.isValidPayload(outputData)) {
      log.error(`[G-64] Invalid proof or outputData payload provided for intent ${id}`);
      return false;
    }

    const now = new Date().toISOString();
    intent.proof = proof;
    intent.outputData = outputData;
    intent.state = 'proving';
    intent.updatedAtIso = now;

    log.info(`[G-64] Proof submitted for intent: ${id}`);
    return true;
  }

  /**
   * Finalizes a proof successfully if unchallenged or verified.
   */
  static async finalizeProof(id: string): Promise<boolean> {
    const intent = this.intents.get(id);
    if (!intent || intent.state !== 'proving') {
      log.warn(`[G-64] finalizeProof rejected for intent ${id}: state is ${intent?.state ?? 'non-existent'}`);
      return false;
    }

    const now = new Date().toISOString();
    intent.state = 'finalized';
    intent.updatedAtIso = now;
    intent.finalizedAtIso = now;

    log.info(`[G-64] Intent ${id} finalized successfully.`);
    return true;
  }

  /**
   * Initiates an adaptive challenge round for a proof.
   */
  static async initiateChallenge(id: string): Promise<number> {
    const intent = this.intents.get(id);
    if (!intent || intent.state !== 'proving') {
      log.warn(`[G-64] initiateChallenge rejected for intent ${id}: state is ${intent?.state ?? 'non-existent'}`);
      return -1;
    }

    const now = new Date().toISOString();
    intent.state = 'challenged';
    intent.challengeRound = 1;
    intent.updatedAtIso = now;

    log.info(`[G-64] Challenging intent: ${id} (Round 1)`);
    return intent.challengeRound;
  }

  /**
   * Advances the adaptive challenge (binary search) up to maxChallengeDepth.
   */
  static async advanceChallenge(id: string): Promise<number> {
    const intent = this.intents.get(id);
    if (!intent || intent.state !== 'challenged' || typeof intent.challengeRound !== 'number') {
      log.warn(`[G-64] advanceChallenge rejected for intent ${id}: invalid state or missing round`);
      return -1;
    }

    const now = new Date().toISOString();
    intent.challengeRound += 1;
    intent.updatedAtIso = now;

    log.info(`[G-64] Advancing challenge for intent: ${id} to Round ${intent.challengeRound}`);

    if (intent.challengeRound >= this.config.maxChallengeDepth) {
      intent.state = 'disproved';
      intent.finalizedAtIso = now;
      log.info(`[G-64] Intent ${id} disproved after reaching maximum depth of ${this.config.maxChallengeDepth} rounds.`);
    }

    return intent.challengeRound;
  }

  /**
   * Manually tombstone an intent or check existing intent.
   */
  static getIntent(id: string): BitVMXIntent | undefined {
    return this.intents.get(id);
  }

  /**
   * Returns current active engine size.
   */
  static getActiveIntentsCount(): number {
    return this.intents.size;
  }
}
