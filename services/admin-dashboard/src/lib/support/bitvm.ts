import { createLogger } from "./logger";
import {
  VERIFIER_CONTRACT_VERSION,
  UNAVAILABLE_BACKEND,
  backendIdentityEquals,
  boundedIdentifier,
  canonicalJson,
  createVerificationFailure,
  digestCanonical,
  digestVerifierRequest,
  isDigest,
  isCanonicalSignatureHex,
  isAuthoritativeBackendIdentity,
  isBackendIdentity,
  isProvenance,
  isProductionVerified,
  isVerificationFailureCode,
  isUnavailableBackend,
  normalizeBoundaryError,
  rejectNonProductionVerification,
  snapshotBoundedJson,
  VERIFIER_RESOURCE_LIMITS,
  VERIFIER_SIGNATURE_ENCODING,
  VERIFIER_SIGNATURE_ENCODING_VERSION,
  type BackendIdentity,
  type Digest,
  type Provenance,
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
  authorized_signers?: string[];
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

export interface SignatureAttestation {
  proof_id: string;
  verifier_id: string;
  encoding_version: typeof VERIFIER_SIGNATURE_ENCODING_VERSION;
  signature_digest: Digest;
  backend: BackendIdentity;
  provenance: Provenance;
  attestation_digest: Digest;
}

export interface PartialSignature {
  verifier_id: string;
  signature: string;
  timestamp: string;
  attestation: SignatureAttestation;
}

export interface AggregationState {
  proofId: string;
  verifier_request_digest: Digest;
  signatures: PartialSignature[];
  required: number;
  authorized_signers: string[];
  verifier_backend: BackendIdentity;
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
  readonly backendIdentity: BackendIdentity;
  verify(request: VerifierRequest): Promise<VerificationResult>;
}

export class UnavailableBitVMVerifier implements BitVMVerifier {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

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

export interface BitVMSignatureVerification {
  status: "valid" | "invalid" | "unavailable" | "unsupported" | "malformed";
  verified: boolean;
  backend: BackendIdentity;
  provenance: Provenance;
  attestation?: SignatureAttestation;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface BitVMSignatureVerifier {
  readonly backendIdentity: BackendIdentity;
  verify(input: {
    proofId: string;
    verifierId: string;
    signature: string;
    signature_encoding: typeof VERIFIER_SIGNATURE_ENCODING;
    signature_encoding_version: typeof VERIFIER_SIGNATURE_ENCODING_VERSION;
    aggregation: Readonly<AggregationState>;
  }): Promise<BitVMSignatureVerification>;
}

export class UnavailableBitVMSignatureVerifier implements BitVMSignatureVerifier {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async verify(): Promise<BitVMSignatureVerification> {
    return {
      status: "unavailable",
      verified: false,
      backend: UNAVAILABLE_BACKEND,
      provenance: "unknown",
      failure_code: "unsupported_backend",
      error: "BitVM signature verification backend is not configured",
    };
  }
}

export async function createSignatureAttestation(input: {
  proofId: string;
  verifierId: string;
  signature: string;
  backend: BackendIdentity;
  provenance: Provenance;
}): Promise<SignatureAttestation> {
  if (!isNonEmptyString(input.proofId)
    || !isNonEmptyString(input.verifierId)
    || !isCanonicalSignatureHex(input.signature)
    || !isBackendIdentity(input.backend)
    || !isProvenance(input.provenance)
    || input.proofId.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars
    || input.verifierId.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars
    || input.signature.length > VERIFIER_RESOURCE_LIMITS.maxSignatureChars) {
    throw new Error("Verifier resource limit exceeded: signature attestation");
  }
  const backendSnapshot = snapshotBoundedJson(input.backend);
  if (!backendSnapshot.ok || !isCanonicalBackendIdentity(backendSnapshot.snapshot)) {
    throw new Error(
      backendSnapshot.ok
        ? "Malformed signature attestation backend identity"
        : backendSnapshot.error,
    );
  }
  const backend = backendSnapshot.snapshot;
  const signature_digest = await digestCanonical({ signature: input.signature });
  const attestationWithoutDigest = {
    proof_id: input.proofId,
    verifier_id: input.verifierId,
    encoding_version: VERIFIER_SIGNATURE_ENCODING_VERSION,
    signature_digest,
    backend,
    provenance: input.provenance,
  };
  return {
    ...attestationWithoutDigest,
    attestation_digest: await digestCanonical(attestationWithoutDigest),
  };
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

interface FloorInitialization {
  verifier_request_digest: Digest;
  verifier_backend: BackendIdentity;
  tap_profile?: BitVMTapProfile;
  verification: VerificationResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOversizedString(value: unknown, maxLength: number): boolean {
  return typeof value === "string" && value.length > maxLength;
}

function isSignatureVerification(value: unknown): value is BitVMSignatureVerification {
  if (!isRecord(value)
    || (value.status !== "valid"
      && value.status !== "invalid"
      && value.status !== "unavailable"
      && value.status !== "unsupported"
      && value.status !== "malformed")
    || typeof value.verified !== "boolean"
    || !isBackendIdentity(value.backend)
    || !isProvenance(value.provenance)
    || (value.error !== undefined && typeof value.error !== "string")
    || (value.failure_code !== undefined && !isVerificationFailureCode(value.failure_code))) {
    return false;
  }
  return true;
}

function hasExactKeys(value: unknown, expected: readonly string[]): boolean {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function isCanonicalBackendIdentity(value: unknown): value is BackendIdentity {
  return hasExactKeys(value, ["artifact_digest", "authority", "id", "version"])
    && isBackendIdentity(value);
}

function isCanonicalSignatureAttestation(
  value: unknown,
  proofId: string,
  verifierId: string,
  backend: BackendIdentity,
  provenance: Provenance,
): value is SignatureAttestation {
  if (!hasExactKeys(value, [
    "attestation_digest",
    "backend",
    "encoding_version",
    "proof_id",
    "provenance",
    "signature_digest",
    "verifier_id",
  ]) || !isRecord(value)) {
    return false;
  }
  return isNonEmptyString(value.proof_id)
    && value.proof_id === proofId
    && value.proof_id.length <= VERIFIER_RESOURCE_LIMITS.maxIdentifierChars
    && isNonEmptyString(value.verifier_id)
    && value.verifier_id === verifierId
    && value.verifier_id.length <= VERIFIER_RESOURCE_LIMITS.maxIdentifierChars
    && value.encoding_version === VERIFIER_SIGNATURE_ENCODING_VERSION
    && isDigest(value.signature_digest)
    && isCanonicalBackendIdentity(value.backend)
    && backendIdentityEquals(value.backend, backend)
    && value.provenance === provenance
    && isDigest(value.attestation_digest);
}

function validateTapProfile(value: unknown): value is BitVMTapProfile {
  if (!isRecord(value)
    || !isNonEmptyString(value.id)
    || typeof value.tap_count !== "number"
    || !Number.isInteger(value.tap_count)
    || value.tap_count <= 0
    || value.tap_count > VERIFIER_RESOURCE_LIMITS.maxTapCount
    || value.id.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars) {
    return false;
  }

  const requiredSignatures = value.required_signatures;
  if (value.authorized_signers !== undefined
    && (!Array.isArray(value.authorized_signers)
      || value.authorized_signers.length > VERIFIER_RESOURCE_LIMITS.maxSignerCount
      || !value.authorized_signers.every((signer) => isNonEmptyString(signer)
        && signer.length <= VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
      || new Set(value.authorized_signers).size !== value.authorized_signers.length)) {
    return false;
  }
  if (requiredSignatures === undefined) return true;
  if (typeof requiredSignatures !== "number"
    || !Number.isInteger(requiredSignatures)
    || requiredSignatures <= 0
    || requiredSignatures > value.tap_count
    || !Array.isArray(value.authorized_signers)
    || value.authorized_signers.length > VERIFIER_RESOURCE_LIMITS.maxSignerCount
    || value.authorized_signers.length < requiredSignatures
    || !value.authorized_signers.every((signer) => isNonEmptyString(signer)
      && signer.length <= VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
    || new Set(value.authorized_signers).size !== value.authorized_signers.length) {
    return false;
  }

  return true;
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
  if (value.proof_id.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars) {
    return {
      ok: false,
      proof_id: boundedIdentifier(value.proof_id),
      tap_count: 0,
      failure_code: "resource_limit_exceeded",
      error: "BitVM proof id exceeds the v1 resource limit",
    };
  }

  if (value.tap_profile !== undefined
    && isRecord(value.tap_profile)
    && (isOversizedString(value.tap_profile.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
      || (typeof value.tap_profile.tap_count === "number"
        && value.tap_profile.tap_count > VERIFIER_RESOURCE_LIMITS.maxTapCount)
      || (Array.isArray(value.tap_profile.authorized_signers)
        && (value.tap_profile.authorized_signers.length > VERIFIER_RESOURCE_LIMITS.maxSignerCount
          || value.tap_profile.authorized_signers.some((signer) => isOversizedString(
            signer,
            VERIFIER_RESOURCE_LIMITS.maxIdentifierChars,
          )))))) {
    return {
      ok: false,
      proof_id: value.proof_id,
      tap_count: 0,
      failure_code: "resource_limit_exceeded",
      error: "BitVM tap profile exceeds the v1 resource limit",
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

function resultStatus(verification: VerificationResult, authority: BackendIdentity): BitVMStatus {
  if (isProductionVerified(verification, authority)) return "verified";
  if (verification.status === "unavailable" || verification.status === "unsupported") return "unsupported";
  return "failed";
}

function makeFloorResult(
  proofId: string,
  tapCount: number,
  verification: VerificationResult,
  authority: BackendIdentity,
): BitVMVerificationResult {
  return {
    verified: isProductionVerified(verification, authority),
    taps_generated: tapCount,
    proof_id: boundedIdentifier(proofId),
    status: resultStatus(verification, authority),
    timestamp: new Date().toISOString(),
    verification,
    failure_code: verification.failure_code,
    error: verification.error,
  };
}

function copyAggregation(aggregation: AggregationState): AggregationState {
  return {
    ...aggregation,
    authorized_signers: [...aggregation.authorized_signers],
    verifier_backend: { ...aggregation.verifier_backend },
    signatures: aggregation.signatures.map((signature) => ({
      ...signature,
      attestation: {
        ...signature.attestation,
        backend: { ...signature.attestation.backend },
      },
    })),
  };
}

function copyVerificationResult(result: VerificationResult): VerificationResult {
  return {
    ...result,
    backend: { ...result.backend },
  };
}

function copyTapProfile(profile: BitVMTapProfile | undefined): BitVMTapProfile | undefined {
  return profile
    ? { ...profile, authorized_signers: profile.authorized_signers ? [...profile.authorized_signers] : undefined }
    : undefined;
}

function sameTapProfile(left: BitVMTapProfile | undefined, right: BitVMTapProfile | undefined): boolean {
  return canonicalJson(left ?? null) === canonicalJson(right ?? null);
}

export class BitVMBridge {
  private readonly states = new Map<string, BitVMFlowState>();
  private readonly aggregations = new Map<string, AggregationState>();
  private readonly floorInitializations = new Map<string, FloorInitialization>();
  private readonly aggregationQueues = new Map<string, Promise<void>>();
  private readonly reservedSigners = new Map<string, Set<string>>();

  public constructor(
    private readonly verifier: BitVMVerifier,
    private readonly signatureVerifier: BitVMSignatureVerifier = new UnavailableBitVMSignatureVerifier(),
  ) {}

  private async withAggregationLock<T>(proofId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.aggregationQueues.get(proofId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.aggregationQueues.set(proofId, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.aggregationQueues.get(proofId) === queued) {
        this.aggregationQueues.delete(proofId);
      }
    }
  }

  /**
   * Verifies a canonical BitVM floor request through the injected backend.
   * Invalid, unavailable, unsupported, and simulated results never create a
   * verified floor state.
   */
  public async verifyFloor(value: unknown): Promise<BitVMVerificationResult> {
    const validation = await validateFloorRequest(value);
    if (!validation.ok) {
      const verification = createVerificationFailure(validation.failure_code, validation.error);
      return makeFloorResult(validation.proof_id, validation.tap_count, verification, UNAVAILABLE_BACKEND);
    }

    const verifierBackend = this.verifier.backendIdentity;
    if (!isBackendIdentity(verifierBackend)) {
      const verification = createVerificationFailure("backend_mismatch", "Verifier adapter has no valid configured backend identity");
      return makeFloorResult(
        validation.request.proof_id,
        validation.request.tap_profile?.tap_count ?? 0,
        verification,
        UNAVAILABLE_BACKEND,
      );
    }
    if (!isUnavailableBackend(verifierBackend)
      && !backendIdentityEquals(validation.request.verifier_request.backend, verifierBackend)) {
      const verification = createVerificationFailure("backend_mismatch", "Verifier request is not bound to the configured adapter backend", {
        request_digest: validation.verifier_request_digest,
        backend: verifierBackend,
        provenance: validation.request.verifier_request.provenance,
      });
      return makeFloorResult(
        validation.request.proof_id,
        validation.request.tap_profile?.tap_count ?? 0,
        verification,
        verifierBackend,
      );
    }

    return this.withAggregationLock(validation.request.proof_id, async () => {
      const existing = this.floorInitializations.get(validation.request.proof_id);
      if (existing) {
        const sameInitialization = existing.verifier_request_digest === validation.verifier_request_digest
          && backendIdentityEquals(existing.verifier_backend, verifierBackend)
          && backendIdentityEquals(existing.verifier_backend, validation.request.verifier_request.backend)
          && sameTapProfile(existing.tap_profile, validation.request.tap_profile);
        if (sameInitialization) {
          // Replays are read-only: preserve any signatures already committed to
          // this aggregation instead of replacing the live object.
          return makeFloorResult(
            validation.request.proof_id,
            existing.tap_profile?.tap_count ?? 0,
            copyVerificationResult(existing.verification),
            existing.verifier_backend,
          );
        }

        const failure = createVerificationFailure(
          backendIdentityEquals(existing.verifier_backend, verifierBackend)
            ? "malformed_request"
            : "backend_mismatch",
          "BitVM floor is already initialized for this proof id",
          {
            request_digest: validation.verifier_request_digest,
            backend: verifierBackend,
            provenance: validation.request.verifier_request.provenance,
          },
        );
        return makeFloorResult(
          validation.request.proof_id,
          validation.request.tap_profile?.tap_count ?? 0,
          failure,
          verifierBackend,
        );
      }

      logger.info(`Received verification request for proof ${boundedIdentifier(validation.request.proof_id)}`);
      let verification: VerificationResult;
      try {
        verification = await this.verifier.verify(validation.request.verifier_request);
      } catch (error: unknown) {
        verification = createVerificationFailure(
          "internal_error",
          error,
          {
            request_digest: validation.verifier_request_digest,
            backend: verifierBackend,
            provenance: validation.request.verifier_request.provenance,
          },
        );
      }
      const resultValidation = await validateVerificationResult(
        verification,
        validation.request.verifier_request,
        validation.verifier_request_digest,
        verifierBackend,
      );

      if (!resultValidation.ok) {
        verification = createVerificationFailure(resultValidation.failure_code, resultValidation.error, {
          request_digest: validation.verifier_request_digest,
          backend: verifierBackend,
          provenance: validation.request.verifier_request.provenance,
        });
      } else {
        verification = rejectNonProductionVerification(resultValidation.result, verifierBackend);
      }

      if (isProductionVerified(verification, verifierBackend)) {
        const tapProfile = copyTapProfile(validation.request.tap_profile);
        const storedVerification = copyVerificationResult(verification);
        const now = new Date().toISOString();
        this.floorInitializations.set(validation.request.proof_id, {
          verifier_request_digest: validation.verifier_request_digest,
          verifier_backend: { ...verifierBackend },
          tap_profile: tapProfile,
          verification: storedVerification,
        });
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
            verifier_request_digest: validation.verifier_request_digest,
            signatures: [],
            required: tapProfile.required_signatures,
            authorized_signers: [...(tapProfile.authorized_signers ?? [])],
            verifier_backend: { ...verifierBackend },
            is_complete: false,
          });
        }
      }

      return makeFloorResult(
        validation.request.proof_id,
        validation.request.tap_profile?.tap_count ?? 0,
        verification,
        verifierBackend,
      );
    });
  }

  public async submitSignature(
    proofId: string,
    verifierId: string,
    signature: string,
  ): Promise<AggregationSubmissionResult> {
    if (!isNonEmptyString(proofId)
      || !isNonEmptyString(verifierId)
      || typeof signature !== "string") {
      return {
        accepted: false,
        failure_code: "invalid_signature",
        error: "Partial signatures must be non-empty canonical hex values",
      };
    }
    if (proofId.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars
      || verifierId.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars
      || signature.length > VERIFIER_RESOURCE_LIMITS.maxSignatureChars) {
      return {
        accepted: false,
        failure_code: "resource_limit_exceeded",
        error: "Signature submission exceeds the v1 resource limit",
      };
    }
    if (!isCanonicalSignatureHex(signature)) {
      return {
        accepted: false,
        failure_code: "invalid_signature",
        error: "Partial signatures must be non-empty canonical hex values",
      };
    }

    return this.withAggregationLock(proofId, async () => {
      const aggregation = this.aggregations.get(proofId);
      if (!aggregation) {
        return {
          accepted: false,
          failure_code: "aggregation_not_found",
          error: "No configured aggregation exists for this proof",
        };
      }

      if (!aggregation.authorized_signers.includes(verifierId)) {
        return {
          accepted: false,
          failure_code: "unauthorized_signer",
          error: "Signer is not authorized for this aggregation",
        };
      }

      if (aggregation.signatures.some((partial) => partial.verifier_id === verifierId)) {
        return {
          accepted: false,
          failure_code: "duplicate_signer",
          error: "A signer may contribute only one partial signature",
        };
      }

      const reservations = this.reservedSigners.get(proofId) ?? new Set<string>();
      if (reservations.has(verifierId)) {
        return {
          accepted: false,
          failure_code: "duplicate_signer",
          error: "A signer submission is already being verified",
        };
      }
      reservations.add(verifierId);
      this.reservedSigners.set(proofId, reservations);

      try {
        const signatureBackend = this.signatureVerifier.backendIdentity;
        if (!isBackendIdentity(signatureBackend) || isUnavailableBackend(signatureBackend)) {
          return {
            accepted: false,
            failure_code: "unsupported_backend",
            error: "Explicit signature verification evidence is unavailable",
          };
        }

        let signatureVerification: BitVMSignatureVerification;
        try {
          signatureVerification = await this.signatureVerifier.verify({
            proofId,
            verifierId,
            signature,
            signature_encoding: VERIFIER_SIGNATURE_ENCODING,
            signature_encoding_version: VERIFIER_SIGNATURE_ENCODING_VERSION,
            aggregation: copyAggregation(aggregation),
          });
        } catch (error: unknown) {
          const normalized = normalizeBoundaryError(error, "Signature verifier failed");
          return {
            accepted: false,
            failure_code: normalized.truncated ? "resource_limit_exceeded" : "internal_error",
            error: normalized.message,
          };
        }

        if (this.aggregations.get(proofId) !== aggregation) {
          return {
            accepted: false,
            failure_code: "internal_error",
            error: "Aggregation changed before signature commit",
          };
        }

        if (!isSignatureVerification(signatureVerification)) {
          return {
            accepted: false,
            failure_code: "attestation_mismatch",
            error: "Signature verifier returned malformed evidence",
          };
        }

        const signatureError = normalizeBoundaryError(
          signatureVerification.error,
          "Signature verifier did not provide valid evidence",
        );
        if (typeof signatureVerification.error === "string" && signatureError.truncated) {
          return {
            accepted: false,
            failure_code: "resource_limit_exceeded",
            error: signatureError.message,
          };
        }

        if (signatureVerification.status !== "valid" || !signatureVerification.verified) {
          return {
            accepted: false,
            failure_code: signatureVerification.failure_code ?? "invalid_signature",
            error: signatureError.message,
          };
        }

        if (signatureVerification.failure_code !== undefined
          || !isProvenance(signatureVerification.provenance)
          || !isBackendIdentity(signatureVerification.backend)
          || !backendIdentityEquals(signatureVerification.backend, signatureBackend)
          || !backendIdentityEquals(signatureVerification.backend, aggregation.verifier_backend)
          || (signatureVerification.provenance !== "test" && signatureVerification.provenance !== "production")
          || (signatureVerification.provenance === "production" && !isAuthoritativeBackendIdentity(signatureVerification.backend))) {
          return {
            accepted: false,
            failure_code: signatureVerification.provenance === "simulated"
              ? "simulated_result"
              : "attestation_mismatch",
            error: "Signature evidence is not bound to an accepted configured backend",
          };
        }

        let attestationMatches = false;
        let attestationSnapshot: SignatureAttestation | undefined;
        try {
          const snapshot = snapshotBoundedJson(signatureVerification.attestation);
          if (!snapshot.ok) {
            return {
              accepted: false,
              failure_code: snapshot.failure_code,
              error: snapshot.error,
            };
          }
          if (!isCanonicalSignatureAttestation(
            snapshot.snapshot,
            proofId,
            verifierId,
            signatureVerification.backend,
            signatureVerification.provenance,
          )) {
            return {
              accepted: false,
              failure_code: "attestation_mismatch",
              error: "Signature attestation shape is outside the v1 contract",
            };
          }
          const expectedAttestation = await createSignatureAttestation({
            proofId,
            verifierId,
            signature,
            backend: signatureVerification.backend,
            provenance: signatureVerification.provenance,
          });
          attestationSnapshot = snapshot.snapshot;
          attestationMatches = canonicalJson(attestationSnapshot) === canonicalJson(expectedAttestation);
        } catch {
          attestationMatches = false;
        }
        if (!attestationMatches) {
          return {
            accepted: false,
            failure_code: "attestation_mismatch",
            error: "Signature attestation does not bind the submitted signature",
          };
        }
        if (!attestationSnapshot) {
          return {
            accepted: false,
            failure_code: "attestation_mismatch",
            error: "Signature attestation snapshot is unavailable",
          };
        }

        // Re-check uniqueness immediately before the state commit. The lock
        // and reservation prevent concurrent duplicate submissions; this CAS
        // check keeps the invariant explicit at the commit boundary.
        if (aggregation.signatures.some((partial) => partial.verifier_id === verifierId)) {
          return {
            accepted: false,
            failure_code: "duplicate_signer",
            error: "A signer may contribute only one partial signature",
          };
        }
        if (this.aggregations.get(proofId) !== aggregation) {
          return {
            accepted: false,
            failure_code: "internal_error",
            error: "Aggregation changed at signature commit",
          };
        }
        if (!reservations.has(verifierId)) {
          return {
            accepted: false,
            failure_code: "internal_error",
            error: "Signer reservation was lost before commit",
          };
        }

        aggregation.signatures.push({
          verifier_id: verifierId,
          signature,
          timestamp: new Date().toISOString(),
          attestation: attestationSnapshot,
        });
        aggregation.is_complete = aggregation.signatures.length >= aggregation.required;
        return { accepted: true, aggregation: copyAggregation(aggregation) };
      } finally {
        reservations.delete(verifierId);
        if (reservations.size === 0) this.reservedSigners.delete(proofId);
      }
    });
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

    logger.warn(`Challenge requested for tap ${tapIndex} on proof ${boundedIdentifier(proofId)}`);
    state.status = "challenged";
    state.activeChallenges.push(tapIndex);
    state.lastUpdate = new Date().toISOString();
    return { accepted: true };
  }

  public getState(proofId: string): BitVMFlowState | undefined {
    const state = this.states.get(proofId);
    return state
      ? { ...state, activeChallenges: [...state.activeChallenges] }
      : undefined;
  }

  public getAggregation(proofId: string): AggregationState | undefined {
    const aggregation = this.aggregations.get(proofId);
    return aggregation ? copyAggregation(aggregation) : undefined;
  }
}

export const bitvmBridge = new BitVMBridge(new UnavailableBitVMVerifier());
