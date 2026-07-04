/**
 * FROST Threshold Signature Coordination (G-14)
 *
 * TypeScript-level scaffolding for Flexible Round-Optimized Schnorr Threshold
 * (FROST) signatures. The actual cryptographic operations are performed by the
 * `lib-conxian-core/frost` Rust module (using `frost-secp256k1-tr` v3.0.0 for
 * BIP-340 Taproot-compatible signatures).
 *
 * This module defines the coordination types — key generation, signing rounds,
 * and aggregation — that the Gateway BFF uses to orchestrate multi-party
 * threshold signing for sBTC operations, treasury multisig, and institutional
 * vault management.
 *
 * @see RFC 9591 — Two-Round Threshold Schnorr Signatures with FROST
 * @see https://github.com/ZcashFoundation/frost — ZF FROST (frost-secp256k1-tr)
 */

// ─── Participants & Configuration ───────────────────────────────────────────

export type ParticipantId = number;

export type FROSTParameters = {
  /** Minimum number of signers required to produce a valid signature */
  threshold: number;
  /** Total number of participants in the signing group */
  totalParticipants: number;
};

// ─── Distributed Key Generation (DKG) ───────────────────────────────────────

export type KeyPackage = {
  participantId: ParticipantId;
  /** The participant's secret signing share (never transmitted) */
  signingShare: string;
  /** The participant's public verification share */
  verifyingShare: string;
  /** The group verifying key (shared by all participants) */
  groupVerifyingKey: string;
  /** Minimum signers required */
  threshold: number;
};

export type DKGCommitment = {
  participantId: ParticipantId;
  /** Commitment to the participant's polynomial coefficients */
  commitments: string[];
};

export type DKGState =
  | { phase: "idle" }
  | { phase: "round1"; participants: ParticipantId[]; commitments: DKGCommitment[] }
  | { phase: "round2"; participants: ParticipantId[]; keyPackages: Record<ParticipantId, KeyPackage> }
  | { phase: "complete"; groupPublicKey: string; threshold: number; totalParticipants: number };

// ─── Signing Rounds ─────────────────────────────────────────────────────────

export type SigningCommitment = {
  participantId: ParticipantId;
  /** Hiding commitment */
  hiding: string;
  /** Binding commitment */
  binding: string;
};

export type SigningPackage = {
  /** The message to sign (32-byte hash, hex-encoded) */
  messageHash: string;
  /** Signing commitments from all participants */
  commitments: SigningCommitment[];
  /** The group verifying key */
  groupVerifyingKey: string;
};

export type SignatureShare = {
  participantId: ParticipantId;
  /** The participant's partial signature */
  share: string;
};

export type SigningRoundState =
  | { phase: "idle" }
  | { phase: "round1"; signingPackage: SigningPackage }
  | {
      phase: "round2";
      signingPackage: SigningPackage;
      shares: SignatureShare[];
      remainingSigners: ParticipantId[];
    }
  | { phase: "aggregating"; signingPackage: SigningPackage; shares: SignatureShare[] }
  | { phase: "complete"; groupSignature: string; messageHash: string };

// ─── Aggregation & Verification ─────────────────────────────────────────────

export type AggregationResult = {
  /** The final threshold signature (BIP-340 compatible, 64 bytes hex) */
  groupSignature: string;
  /** The message that was signed */
  messageHash: string;
  /** Participant IDs whose shares were included */
  includedSigners: ParticipantId[];
  /** Whether the signature verifies against the group public key */
  verified: boolean;
};

// ─── Treasury Vault Configuration ───────────────────────────────────────────

export type FrostVaultConfig = {
  vaultId: string;
  parameters: FROSTParameters;
  groupPublicKey: string;
  /** Operator IDs mapped to participant indices */
  participantMapping: Record<string, ParticipantId>;
  /** When the DKG ceremony was completed */
  dkgCompletedAtIso: string;
  /** Network: mainnet, testnet, signet */
  network: "mainnet" | "testnet" | "signet";
};

// ─── Coordination Functions (stubs — delegate to Rust core) ─────────────────

/**
 * Initialize a FROST distributed key generation ceremony.
 * In production, this delegates to `lib-conxian-core/frost` via the Gateway.
 */
export function initDKG(params: FROSTParameters): DKGState {
  const participants: ParticipantId[] = Array.from(
    { length: params.totalParticipants },
    (_, i) => (i + 1) as ParticipantId
  );
  return {
    phase: "round1",
    participants,
    commitments: [],
  };
}

/**
 * Simulate producing a signing commitment for Round 1.
 */
export function produceCommitment(participantId: ParticipantId): SigningCommitment {
  return {
    participantId,
    hiding: `commit_hiding_${participantId}_${Date.now()}`,
    binding: `commit_binding_${participantId}_${Date.now()}`,
  };
}

/**
 * Validate the signing package before Round 2.
 */
export function validateSigningPackage(pkg: SigningPackage): boolean {
  return (
    pkg.messageHash.length === 64 &&
    pkg.commitments.length > 0 &&
    pkg.groupVerifyingKey.length > 0
  );
}

/**
 * Verify the aggregated threshold signature.
 * Delegates to frost-secp256k1-tr verification via Gateway.
 */
export function verifyAggregatedSignature(
  result: AggregationResult,
  groupPublicKey: string
): boolean {
  // In production: POST /api/v1/frost/verify with { signature, messageHash, groupPublicKey }
  return result.verified && result.groupSignature.length === 128;
}

/**
 * Check if a vault config meets minimum security requirements.
 */
export function validateVaultConfig(config: FrostVaultConfig): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (config.parameters.threshold < 2) {
    issues.push("Threshold must be at least 2 for any multisig");
  }
  if (config.parameters.threshold > config.parameters.totalParticipants) {
    issues.push("Threshold cannot exceed total participants");
  }
  if (Object.keys(config.participantMapping).length !== config.parameters.totalParticipants) {
    issues.push("Participant mapping must include all total participants");
  }
  if (config.network === "mainnet" && config.parameters.threshold < 3) {
    issues.push("Mainnet vaults should use threshold >= 3 for production security");
  }
  return { valid: issues.length === 0, issues };
}
