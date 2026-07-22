import { createLogger } from "./logger";
import {
  VERIFIER_CONTRACT_VERSION,
  UNAVAILABLE_BACKEND,
  createVerificationFailure,
  digestVerifierRequest,
  isProductionVerified,
  rejectNonProductionVerification,
  type Digest,
  type VerificationFailureCode,
  type VerificationResult,
  type VerifierRequest,
  validateVerificationResult,
  validateVerifierRequest,
} from "./verifier-contract";

/**
* G-01/G-11 coordination only. This module never implements BitVM arithmetic.
* A supported Gateway/Core verifier must be injected before any floor can be
* authoritative.
*/

const logger = createLogger("BitVM2");

export type BitVMStatus =
  | "pending"
  | "verifying"
  | "verified"
  | "challenged"
  | "disproved"
  | "slashed"
  | "failed"
  | "unsupported";

export interface BitVMTapProfile {
  id: string;
  tap_count: number;
  required_signatures?: number;
}

export interface BitVMFloorRequest {
  contract_version: typeof VERIFIER_CONTRACT_VERSION;
  proof_id: string;
  verifier_request: VerifierRequest;
  tap_profile?: BitVMTapProfile;
}

export interface BitVMVerificationResult {
  verified: boolean;
  taps_generated: number;
  proof_id: string;
  status: BitVMStatus;
  timestamp: string;
  verification: VerificationResult;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface BitVMFlowState {
  proofId: string;
  status: BitVMStatus;
  segments: number;
  tapProfileId?: string;
  activeChallenges: number[];
  lastUpdate: string;
}

export interface PartialSignature {
  verifier_id: string;
  signature: string;
  timestamp: string;
}

export interface AggregationState {
  proofId: string;
  signatures: PartialSignature[];
  required: number;
  is_complete: boolean;
}

export interface AggregationSubmissionResult {
  accepted: boolean;
  aggregation?: AggregationState;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface TapChallengeResult {
  accepted: boolean;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface BitVMVerifier {
  verify(request: VerifierRequest): Promise<VerificationResult>;
}

export class UnavailableBitVMVerifier implements BitVMVerifier {
  public async verify(request: VerifierRequest): Promise<VerificationResult> {
    return createVerificationFailure(
      "backend_unavailable",
      "BitVM verification backend is not configured",
      {
        request_digest: await digestVerifierRequest(request),
        backend: UNAVAILABLE_BACKEND,
        provenance: "unknown",
      },
    );
  }
}

interface FloorValidationSuccess {
  ok: true;
  request: BitVMFloorRequest;
  verifier_request_digest: Digest;
}

interface FloorValidationFailure {
  ok: false;
  proof_id: string;
  tap_count: number;
  failure_code: VerificationFailureCode;
  error: string;
}

type FloorValidation = FloorValidationSuccess | FloorValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateTapProfile(value: unknown): value is BitVMTapProfile {
  if (!isRecord(value)
    || !isNonEmptyString(value.id)
    || typeof value.tap_count !== "number"
    || !Number.isInteger(value.tap_count)
    || value.tap_count <= 0) {
    return false;
  }

  return value.required_signatures === undefined
    || (typeof value.required_signatures === "number"
      && Number.isInteger(value.required_signatures)
      && value.required_signatures > 0
      && value.required_signatures <= value.tap_count);
}

async function validateFloorRequest(value: unknown): Promise<FloorValidation> {
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || !isNonEmptyString(value.proof_id)) {
    return {
      ok: false,
      proof_id: "unknown",
      tap_count: 0,
      failure_code: "malformed_request",
      error: "BitVM floor request requires a contract version and proof id",
    };
  }

  if (value.tap_profile !== undefined && !validateTapProfile(value.tap_profile)) {
    return {
      ok: false,
      proof_id: value.proof_id,
      tap_count: 0,
      failure_code: "malformed_request",
      error: "BitVM tap profile is malformed",
    };
  }

  const verifierValidation = await validateVerifierRequest(value.verifier_request);
  if (!verifierValidation.ok) {
    return {
      ok: false,
      proof_id: value.proof_id,
      tap_count: validateTapProfile(value.tap_profile) ? value.tap_profile.tap_count : 0,
      failure_code: verifierValidation.failure_code,
      error: verifierValidation.error,
    };
  }

  return {
    ok: true,
    request: {
      contract_version: VERIFIER_CONTRACT_VERSION,
      proof_id: value.proof_id,
      verifier_request: verifierValidation.request,
      tap_profile: validateTapProfile(value.tap_profile) ? value.tap_profile : undefined,
    },
    verifier_request_digest: verifierValidation.request_digest,
  };
}

function resultStatus(verification: VerificationResult): BitVMStatus {
  if (verification.status === "valid" && verification.provenance === "production") return "verified";
  if (verification.status === "unavailable" || verification.status === "unsupported") return "unsupported";
  if (verification.status === "invalid" || verification.status === "malformed") return "failed";
  return "failed";
}

function makeFloorResult(
  proofId: string,
  tapCount: number,
  verification: VerificationResult,
): BitVMVerificationResult {
  return {
    verified: isProductionVerified(verification),
    taps_generated: tapCount,
    proof_id: proofId,
    status: resultStatus(verification),
    timestamp: new Date().toISOString(),
    verification,
    failure_code: verification.failure_code,
    error: verification.error,
  };
}

export class BitVMBridge {
  private readonly states = new Map<string, BitVMFlowState>();
  private readonly aggregations = new Map<string, AggregationState>();

  public constructor(private readonly verifier: BitVMVerifier) {}

  /**
   * Verifies a canonical BitVM floor request through the injected backend.
   * Invalid, unavailable, unsupported, and simulated results never create a
   * verified floor state.
   */
  public async verifyFloor(value: unknown): Promise<BitVMVerificationResult> {
    const validation = await validateFloorRequest(value);
    if (!validation.ok) {
      const verification = createVerificationFailure(validation.failure_code, validation.error);
      return makeFloorResult(validation.proof_id, validation.tap_count, verification);
    }

    logger.info(`Received verification request for proof ${validation.request.proof_id}`);
    let verification = await this.verifier.verify(validation.request.verifier_request);
    const resultValidation = await validateVerificationResult(
      verification,
      validation.request.verifier_request,
      validation.verifier_request_digest,
    );

    if (!resultValidation.ok) {
      verification = createVerificationFailure(resultValidation.failure_code, resultValidation.error, {
        request_digest: validation.verifier_request_digest,
      });
    } else {
      verification = rejectNonProductionVerification(resultValidation.result);
    }

    if (isProductionVerified(verification)) {
      const tapProfile = validation.request.tap_profile;
      const now = new Date().toISOString();
      this.states.set(validation.request.proof_id, {
        proofId: validation.request.proof_id,
        status: "verified",
        segments: tapProfile?.tap_count ?? 0,
        tapProfileId: tapProfile?.id,
        activeChallenges: [],
        lastUpdate: now,
      });

      if (tapProfile?.required_signatures !== undefined) {
        this.aggregations.set(validation.request.proof_id, {
          proofId: validation.request.proof_id,
          signatures: [],
          required: tapProfile.required_signatures,
          is_complete: false,
        });
      }
    }

    return makeFloorResult(
      validation.request.proof_id,
      validation.request.tap_profile?.tap_count ?? 0,
      verification,
    );
  }

  public async submitSignature(
    proofId: string,
    verifierId: string,
    signature: string,
  ): Promise<AggregationSubmissionResult> {
    if (!isNonEmptyString(proofId) || !isNonEmptyString(verifierId) || !/^[0-9a-fA-F]{128,}$/.test(signature)) {
      return {
        accepted: false,
        failure_code: "invalid_signature",
        error: "Partial signatures must be non-empty canonical hex values",
      };
    }

    const aggregation = this.aggregations.get(proofId);
    if (!aggregation) {
      return {
        accepted: false,
        failure_code: "aggregation_not_found",
        error: "No configured aggregation exists for this proof",
      };
    }

    aggregation.signatures.push({
      verifier_id: verifierId,
      signature,
      timestamp: new Date().toISOString(),
    });
    aggregation.is_complete = aggregation.signatures.length >= aggregation.required;
    return { accepted: true, aggregation };
  }

  public async challengeTap(proofId: string, tapIndex: number): Promise<TapChallengeResult> {
    const state = this.states.get(proofId);
    if (!state || state.status !== "verified") {
      return {
        accepted: false,
        failure_code: "invalid_challenge",
        error: "A verified floor is required before challenging a tap",
      };
    }

    if (!Number.isInteger(tapIndex) || tapIndex < 0 || tapIndex >= state.segments) {
      return {
        accepted: false,
        failure_code: "invalid_challenge",
        error: "Tap index is outside the selected profile",
      };
    }

    logger.warn(`Challenge requested for tap ${tapIndex} on proof ${proofId}`);
    state.status = "challenged";
    state.activeChallenges.push(tapIndex);
    state.lastUpdate = new Date().toISOString();
    return { accepted: true };
  }

  public getState(proofId: string): BitVMFlowState | undefined {
    return this.states.get(proofId);
  }

  public getAggregation(proofId: string): AggregationState | undefined {
    return this.aggregations.get(proofId);
  }
}

export const bitvmBridge = new BitVMBridge(new UnavailableBitVMVerifier());
