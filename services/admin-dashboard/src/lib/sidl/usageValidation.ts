/**
 * Usage Validation Types (CON-1263)
 * Aligned with openspec/specs/usage-validation-instrumentation-v1.spec.md
 */

export type SignalStrength = "weak" | "strong";

export interface UsageEvent {
  event: string;
  strength: SignalStrength;
  identity_hash: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export class UsageValidator {
  private static ACTIVATION_THRESHOLD = 50;

  /**
   * Score an event based on its signal strength and metadata.
   */
  public static scoreEvent(event: UsageEvent): number {
    let score = 0;
    if (event.strength === "strong") score += 30;
    if (event.strength === "weak") score += 5;

    // Additional scoring logic based on event type
    if (event.event === "SDK_INIT") score += 10;
    if (event.event === "FIRST_PROOF") score += 40;
    if (event.event === "BFF_CALL") score += 15;

    return score;
  }

  /**
   * Determine if the usage signal warrants institutional triage.
   */
  public static warrantsTriage(score: number): boolean {
    return score >= UsageValidator.ACTIVATION_THRESHOLD;
  }
}
