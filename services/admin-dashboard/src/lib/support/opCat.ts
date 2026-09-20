import { createLogger } from "./logger";

const logger = createLogger("OP_CAT");

/**
 * G-15: Bitcoin Recursive Covenants OP_CAT (BIP-347) Engine & Stack Machine
 *
 * Implements a fail-closed, memory-bounded OP_CAT stack evaluation and recursive covenant
 * validation engine enforcing the 520-byte maximum stack element size constraint.
 */

export const MAX_STACK_ELEMENT_SIZE_BYTES = 520;
export const MAX_CAT_OPERATIONS_PER_SCRIPT = 100;
export const MAX_ACTIVE_EVALUATIONS = 1000;

export interface OpCatExecutionResult {
  success: boolean;
  resultHex?: string;
  resultingSize?: number;
  error?: string;
}

export interface CovenantState {
  covenantId: string;
  depth: number;
  maxDepth: number;
  stateHash: string;
  isFinalized: boolean;
  historyHashes: string[];
  createdAtIso: string;
  lastUpdatedAtIso: string;
}

export class OpCatEngine {
  private activeEvaluationsCount = 0;
  private covenants: Map<string, CovenantState> = new Map();

  /**
   * Concatenates two byte arrays / hex strings as specified by OP_CAT (BIP-347).
   * Enforces the 520-byte maximum stack element size limit.
   */
  public executeCat(elementA: string | Uint8Array, elementB: string | Uint8Array): OpCatExecutionResult {
    if (this.activeEvaluationsCount >= MAX_ACTIVE_EVALUATIONS) {
      logger.error(`[G-15] OP_CAT execution limit reached (${MAX_ACTIVE_EVALUATIONS})`);
      return { success: false, error: "Maximum execution capacity reached" };
    }

    try {
      this.activeEvaluationsCount++;

      const bufA = typeof elementA === "string" ? Buffer.from(elementA.replace(/^0x/, ""), "hex") : Buffer.from(elementA);
      const bufB = typeof elementB === "string" ? Buffer.from(elementB.replace(/^0x/, ""), "hex") : Buffer.from(elementB);

      const combinedSize = bufA.length + bufB.length;

      if (combinedSize > MAX_STACK_ELEMENT_SIZE_BYTES) {
        logger.error(`[G-15] OP_CAT failed: concatenated element size (${combinedSize} bytes) exceeds limit of ${MAX_STACK_ELEMENT_SIZE_BYTES} bytes`);
        return {
          success: false,
          error: `Push size limit exceeded: combined size ${combinedSize} bytes exceeds max limit of ${MAX_STACK_ELEMENT_SIZE_BYTES} bytes`,
        };
      }

      const combined = Buffer.concat([bufA, bufB]);
      const resultHex = combined.toString("hex");

      logger.info(`[G-15] OP_CAT executed successfully. Concatenated ${bufA.length}B + ${bufB.length}B = ${combinedSize}B`);

      return {
        success: true,
        resultHex,
        resultingSize: combinedSize,
      };
    } catch (err: any) {
      logger.error(`[G-15] OP_CAT execution error: ${err.message}`);
      return { success: false, error: err.message || "Execution error" };
    } finally {
      this.activeEvaluationsCount = Math.max(0, this.activeEvaluationsCount - 1);
    }
  }

  /**
   * Initializes a new recursive covenant state machine.
   */
  public createCovenant(covenantId: string, initialStateHash: string, maxDepth = 64): CovenantState {
    if (!covenantId || covenantId.trim().length === 0) {
      logger.error("[G-15] Covenant creation failed: invalid covenantId");
      throw new Error("Invalid covenantId");
    }

    if (!initialStateHash || initialStateHash.trim().length === 0) {
      logger.error(`[G-15] Covenant creation failed for ${covenantId}: invalid initialStateHash`);
      throw new Error("Invalid initialStateHash");
    }

    if (maxDepth <= 0 || maxDepth > 256) {
      logger.error(`[G-15] Covenant creation failed for ${covenantId}: maxDepth must be between 1 and 256`);
      throw new Error("Invalid maxDepth");
    }

    if (this.covenants.has(covenantId)) {
      logger.error(`[G-15] Covenant ${covenantId} already exists`);
      throw new Error(`Covenant ${covenantId} already exists`);
    }

    const state: CovenantState = {
      covenantId,
      depth: 0,
      maxDepth,
      stateHash: initialStateHash,
      isFinalized: false,
      historyHashes: [initialStateHash],
      createdAtIso: new Date().toISOString(),
      lastUpdatedAtIso: new Date().toISOString(),
    };

    this.covenants.set(covenantId, state);
    logger.info(`[G-15] Covenant ${covenantId} initialized with depth 0/${maxDepth}`);
    return { ...state, historyHashes: [...state.historyHashes] };
  }

  /**
   * Transitions a recursive covenant state to the next recursion depth using concatenated state proofing.
   */
  public transitionCovenant(covenantId: string, nextStateHash: string): CovenantState {
    const state = this.covenants.get(covenantId);
    if (!state) {
      logger.error(`[G-15] Covenant transition failed: covenant ${covenantId} not found`);
      throw new Error(`Covenant ${covenantId} not found`);
    }

    if (state.isFinalized) {
      logger.error(`[G-15] Covenant transition failed for ${covenantId}: covenant is finalized`);
      throw new Error("Cannot transition finalized covenant");
    }

    if (state.depth >= state.maxDepth) {
      logger.error(`[G-15] Covenant transition failed for ${covenantId}: maximum recursion depth (${state.maxDepth}) reached`);
      throw new Error(`Maximum recursion depth (${state.maxDepth}) reached`);
    }

    if (!nextStateHash || nextStateHash.trim().length === 0) {
      logger.error(`[G-15] Covenant transition failed for ${covenantId}: invalid nextStateHash`);
      throw new Error("Invalid nextStateHash");
    }

    // Verify OP_CAT state hash concatenation simulation
    const catResult = this.executeCat(state.stateHash, nextStateHash);
    if (!catResult.success) {
      logger.error(`[G-15] Covenant transition state hashing failed for ${covenantId}: ${catResult.error}`);
      throw new Error(`State proof concatenation failed: ${catResult.error}`);
    }

    state.depth += 1;
    state.stateHash = nextStateHash;
    state.historyHashes.push(nextStateHash);
    state.lastUpdatedAtIso = new Date().toISOString();

    this.covenants.set(covenantId, state);
    logger.info(`[G-15] Covenant ${covenantId} transitioned to depth ${state.depth}/${state.maxDepth}`);

    return { ...state, historyHashes: [...state.historyHashes] };
  }

  /**
   * Finalizes a recursive covenant, locking further state transitions.
   */
  public finalizeCovenant(covenantId: string): CovenantState {
    const state = this.covenants.get(covenantId);
    if (!state) {
      logger.error(`[G-15] Covenant finalization failed: covenant ${covenantId} not found`);
      throw new Error(`Covenant ${covenantId} not found`);
    }

    state.isFinalized = true;
    state.lastUpdatedAtIso = new Date().toISOString();

    this.covenants.set(covenantId, state);
    logger.info(`[G-15] Covenant ${covenantId} finalized at depth ${state.depth}`);

    return { ...state, historyHashes: [...state.historyHashes] };
  }

  /**
   * Retrieves covenant state.
   */
  public getCovenant(covenantId: string): CovenantState | undefined {
    const state = this.covenants.get(covenantId);
    return state ? { ...state, historyHashes: [...state.historyHashes] } : undefined;
  }
}

export const opCatEngine = new OpCatEngine();
