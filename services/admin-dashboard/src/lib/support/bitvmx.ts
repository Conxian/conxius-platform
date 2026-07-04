import { createLogger } from "./logger";
import { generateId } from "./idgen";
const log = createLogger("BitVMX");

/**
 * G-44: BitVMX High-Efficiency Computation
 *
 * BitVMX optimizes general-purpose computation on Bitcoin with reduced
 * on-chain footprint and "Adaptive Proofs".
 */

export type BitVMXState = 'idle' | 'executing' | 'proving' | 'challenged' | 'disproved' | 'finalized';

export interface BitVMXIntent {
  id: string;
  programHash: string;
  inputData: string;
  outputData?: string;
  proof?: string;
  state: BitVMXState;
  challengeRound?: number;
}

export class BitVMXBridge {
  private static intents: Map<string, BitVMXIntent> = new Map();

  /**
   * Initializes a BitVMX intent for execution.
   */
  static async initializeIntent(programHash: string, inputData: string): Promise<BitVMXIntent> {
    const id = `bitvmx-${generateId("bitvmx")}`;
    const intent: BitVMXIntent = {
      id,
      programHash,
      inputData,
      state: 'executing'
    };

    this.intents.set(id, intent);
    log.info(` Initialized intent: ${id} for program: ${programHash}`);
    return intent;
  }

  /**
   * Submits a proof for a BitVMX intent.
   */
  static async submitProof(id: string, proof: string, outputData: string): Promise<boolean> {
    const intent = this.intents.get(id);
    if (!intent) return false;

    intent.proof = proof;
    intent.outputData = outputData;
    intent.state = 'proving';

    log.info(` Proof submitted for intent: ${id}`);
    return true;
  }

  /**
   * Initiates an adaptive challenge round for a proof.
   */
  static async initiateChallenge(id: string): Promise<number> {
    const intent = this.intents.get(id);
    if (!intent || intent.state !== 'proving') return -1;

    intent.state = 'challenged';
    intent.challengeRound = 1;

    log.info(` Challenging intent: ${id} (Round 1)`);
    return intent.challengeRound;
  }

  /**
   * Advances the adaptive challenge (binary search).
   */
  static async advanceChallenge(id: string): Promise<number> {
    const intent = this.intents.get(id);
    if (!intent || intent.state !== 'challenged' || !intent.challengeRound) return -1;

    intent.challengeRound += 1;
    log.info(` Advancing challenge for intent: ${id} to Round ${intent.challengeRound}`);

    // In BitVMX, if the challenge reaches the maximum depth (e.g., 32 rounds),
    // it results in a definitive proof or disprove.
    if (intent.challengeRound >= 32) {
      intent.state = 'disproved';
      log.info(` Intent ${id} disproved after 32 rounds.`);
    }

    return intent.challengeRound;
  }

  static getIntent(id: string): BitVMXIntent | undefined {
    return this.intents.get(id);
  }
}
