import { createLogger } from "./logger";
import {
  VERIFIER_CONTRACT_VERSION,
  UNAVAILABLE_BACKEND,
  backendIdentityEquals,
  createVerificationFailure,
  digestVerifierRequest,
  isBackendIdentity,
  isProductionVerified,
  isUnavailableBackend,
  rejectNonProductionVerification,
  type BackendIdentity,
  type VerificationFailureCode,
  type VerificationResult,
  type VerifierRequest,
  validateVerificationResult,
  validateVerifierRequest,
} from "./verifier-contract";

/**
* G-20 coordination only. Recursive proof execution is owned by a future
* Gateway/Core/Nexus adapter and must be injected explicitly.
*/

const logger = createLogger("BitVM3");

export interface BitVM3VerificationRequest {
  contract_version: typeof VERIFIER_CONTRACT_VERSION;
  proof_id: string;
  recursive_height: number;
  verifier_request: VerifierRequest;
}

export type BitVM3Status = "pending" | "verifying" | "verified" | "failed" | "unsupported";

export interface BitVM3State {
  id: string;
  recursiveHeight: number;
  isVerified: boolean;
  status: BitVM3Status;
  verification: VerificationResult;
  timestamp: string;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface BitVM3Verifier {
  readonly backendIdentity: BackendIdentity;
  verify(request: VerifierRequest): Promise<VerificationResult>;
}

export class UnavailableBitVM3Verifier implements BitVM3Verifier {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async verify(request: VerifierRequest): Promise<VerificationResult> {
    return createVerificationFailure(
      "backend_unavailable",
      "Recursive BitVM3 verification backend is not configured",
      {
        request_digest: await digestVerifierRequest(request),
        backend: UNAVAILABLE_BACKEND,
        provenance: "unknown",
      },
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

interface RecursiveValidationSuccess {
  ok: true;
  request: BitVM3VerificationRequest;
  verifier_request_digest: `sha256:${string}`;
}

interface RecursiveValidationFailure {
  ok: false;
  proof_id: string;
  recursive_height: number;
  failure_code: VerificationFailureCode;
  error: string;
}

type RecursiveValidation = RecursiveValidationSuccess | RecursiveValidationFailure;

async function validateRecursiveRequest(value: unknown): Promise<RecursiveValidation> {
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || !isNonEmptyString(value.proof_id)
    || typeof value.recursive_height !== "number"
    || !Number.isInteger(value.recursive_height)
    || value.recursive_height < 0) {
    return {
      ok: false,
      proof_id: "unknown",
      recursive_height: 0,
      failure_code: "malformed_request",
      error: "BitVM3 request requires a non-negative recursive height and proof id",
    };
  }

  const verifierValidation = await validateVerifierRequest(value.verifier_request);
  if (!verifierValidation.ok) {
    return {
      ok: false,
      proof_id: value.proof_id,
      recursive_height: value.recursive_height,
      failure_code: verifierValidation.failure_code,
      error: verifierValidation.error,
    };
  }

  return {
    ok: true,
    request: {
      contract_version: VERIFIER_CONTRACT_VERSION,
      proof_id: value.proof_id,
      recursive_height: value.recursive_height,
      verifier_request: verifierValidation.request,
    },
    verifier_request_digest: verifierValidation.request_digest,
  };
}

function statusForVerification(result: VerificationResult, authority: BackendIdentity): BitVM3Status {
  if (isProductionVerified(result, authority)) return "verified";
  if (result.status === "unavailable" || result.status === "unsupported") return "unsupported";
  return "failed";
}

function stateFor(
  proofId: string,
  recursiveHeight: number,
  verification: VerificationResult,
  authority: BackendIdentity,
): BitVM3State {
  return {
    id: proofId,
    recursiveHeight,
    isVerified: isProductionVerified(verification, authority),
    status: statusForVerification(verification, authority),
    verification,
    timestamp: new Date().toISOString(),
    failure_code: verification.failure_code,
    error: verification.error,
  };
}

function copyState(state: BitVM3State): BitVM3State {
  return {
    ...state,
    verification: {
      ...state.verification,
      backend: { ...state.verification.backend },
    },
  };
}

export class BitVM3Orchestrator {
  private readonly states = new Map<string, BitVM3State>();

  public constructor(private readonly verifier: BitVM3Verifier) {}

  /**
   * Triggers a recursive verification cycle through the injected backend.
   * No backend means a typed non-success result and no authoritative state.
   */
  public async verifyRecursive(value: unknown): Promise<BitVM3State> {
    const validation = await validateRecursiveRequest(value);
    if (!validation.ok) {
      return stateFor(
        validation.proof_id,
        validation.recursive_height,
        createVerificationFailure(validation.failure_code, validation.error),
        UNAVAILABLE_BACKEND,
      );
    }

    const verifierBackend = this.verifier.backendIdentity;
    if (!isBackendIdentity(verifierBackend)) {
      return stateFor(
        validation.request.proof_id,
        validation.request.recursive_height,
        createVerificationFailure("backend_mismatch", "Verifier adapter has no valid configured backend identity"),
        UNAVAILABLE_BACKEND,
      );
    }
    if (!isUnavailableBackend(verifierBackend)
      && !backendIdentityEquals(validation.request.verifier_request.backend, verifierBackend)) {
      return stateFor(
        validation.request.proof_id,
        validation.request.recursive_height,
        createVerificationFailure("backend_mismatch", "Verifier request is not bound to the configured adapter backend", {
          request_digest: validation.verifier_request_digest,
          backend: verifierBackend,
          provenance: validation.request.verifier_request.provenance,
        }),
        verifierBackend,
      );
    }

    logger.info(`Received recursive verification request for proof ${validation.request.proof_id}`);
    let verification: VerificationResult;
    try {
      verification = await this.verifier.verify(validation.request.verifier_request);
    } catch (error: unknown) {
      verification = createVerificationFailure(
        "internal_error",
        error instanceof Error ? error.message : "Recursive verifier adapter failed",
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
      const state = stateFor(
        validation.request.proof_id,
        validation.request.recursive_height,
        verification,
        verifierBackend,
      );
      this.states.set(validation.request.proof_id, state);
      return copyState(state);
    }

    return stateFor(
      validation.request.proof_id,
      validation.request.recursive_height,
      verification,
      verifierBackend,
    );
  }

  public getState(id: string): BitVM3State | undefined {
    const state = this.states.get(id);
    return state ? copyState(state) : undefined;
  }
}

export const bitvm3Orchestrator = new BitVM3Orchestrator(new UnavailableBitVM3Verifier());
