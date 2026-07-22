import { createLogger } from "./logger";
import {
  VERIFIER_CONTRACT_VERSION,
  UNAVAILABLE_BACKEND,
  backendIdentityEquals,
  boundedIdentifier,
  createVerificationFailure,
  digestVerifierRequest,
  isBackendIdentity,
  isProductionVerified,
  isUnavailableBackend,
  normalizeBoundaryError,
  rejectNonProductionVerification,
  VERIFIER_BITVM3_RETENTION_POLICY,
  VERIFIER_BITVM3_RETENTION_POLICY_VERSION,
  VERIFIER_RESOURCE_LIMITS,
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

/**
* BitVM3 stores serialized timestamps in terminal state. ECMAScript Date
* serialization accepts this inclusive millisecond range, but the
* orchestrator intentionally rejects negative values so the injected clock
* cannot move before the Unix epoch.
*/
export const BITVM3_TIMESTAMP_MIN_MS = 0;
export const BITVM3_TIMESTAMP_MAX_MS = 8.64e15;
const BITVM3_FALLBACK_TIMESTAMP = "1970-01-01T00:00:00.000Z";

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

export type BitVM3ConfigurationErrorCode = "invalid_retention_policy";

export class BitVM3ConfigurationError extends Error {
  public readonly code: BitVM3ConfigurationErrorCode;
  public readonly option: "maxRetainedStates" | "terminalTtlMs";

  public constructor(
    option: "maxRetainedStates" | "terminalTtlMs",
    message: string,
  ) {
    super(message);
    this.name = "BitVM3ConfigurationError";
    this.code = "invalid_retention_policy";
    this.option = option;
  }
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

type BitVM3ClockFailureCode = "internal_error" | "malformed_request" | "resource_limit_exceeded";

interface BitVM3ClockFailure {
  ok: false;
  failure_code: BitVM3ClockFailureCode;
  error: string;
}

interface BitVM3Timestamp {
  ok: true;
  milliseconds: number;
  iso: string;
}

type BitVM3TimestampResult = BitVM3Timestamp | BitVM3ClockFailure;

function safeTimestamp(value: unknown, previousMilliseconds?: number): BitVM3TimestampResult {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "BitVM3 clock must return a finite numeric timestamp",
    };
  }
  if (!Number.isSafeInteger(value)) {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "BitVM3 clock must return a safe integer timestamp",
    };
  }
  if (value < BITVM3_TIMESTAMP_MIN_MS) {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "BitVM3 clock must not return a negative timestamp",
    };
  }
  if (value < -8.64e15 || value > BITVM3_TIMESTAMP_MAX_MS) {
    return {
      ok: false,
      failure_code: "resource_limit_exceeded",
      error: "BitVM3 clock timestamp exceeds the ECMAScript Date serialization range",
    };
  }
  if (previousMilliseconds !== undefined && value < previousMilliseconds) {
    return {
      ok: false,
      failure_code: "internal_error",
      error: "BitVM3 clock moved backwards and violated monotonicity",
    };
  }

  try {
    const iso = new Date(value).toISOString();
    return { ok: true, milliseconds: value, iso };
  } catch (error: unknown) {
    const normalized = normalizeBoundaryError(error, "BitVM3 timestamp serialization failed");
    return {
      ok: false,
      failure_code: normalized.truncated ? "resource_limit_exceeded" : "internal_error",
      error: normalized.message,
    };
  }
}

async function validateRecursiveRequest(value: unknown): Promise<RecursiveValidation> {
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || !isNonEmptyString(value.proof_id)) {
    return {
      ok: false,
      proof_id: "unknown",
      recursive_height: 0,
      failure_code: "malformed_request",
      error: "BitVM3 request requires a non-negative recursive height and proof id",
    };
  }

  if (value.proof_id.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars) {
    return {
      ok: false,
      proof_id: "unknown",
      recursive_height: 0,
      failure_code: "resource_limit_exceeded",
      error: "BitVM3 proof id exceeds the v1 resource limit",
    };
  }

  if (typeof value.recursive_height !== "number"
    || !Number.isFinite(value.recursive_height)
    || !Number.isSafeInteger(value.recursive_height)
    || value.recursive_height < 0) {
    return {
      ok: false,
      proof_id: value.proof_id,
      recursive_height: 0,
      failure_code: "malformed_request",
      error: "BitVM3 recursive height must be a non-negative safe integer",
    };
  }

  if (value.recursive_height > VERIFIER_RESOURCE_LIMITS.maxRecursiveHeight) {
    return {
      ok: false,
      proof_id: value.proof_id,
      recursive_height: VERIFIER_RESOURCE_LIMITS.maxRecursiveHeight,
      failure_code: "resource_limit_exceeded",
      error: "BitVM3 recursive height exceeds the v1 resource limit",
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
  timestampMs = Date.now(),
): BitVM3State {
  const timestamp = safeTimestamp(timestampMs);
  return {
    id: boundedIdentifier(proofId),
    recursiveHeight,
    isVerified: isProductionVerified(verification, authority),
    status: statusForVerification(verification, authority),
    verification: {
      ...verification,
      backend: { ...verification.backend },
    },
    timestamp: timestamp.ok ? timestamp.iso : BITVM3_FALLBACK_TIMESTAMP,
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

interface BitVM3Initialization {
  verifier_request_digest: string;
  recursive_height: number;
  verifier_backend: BackendIdentity;
  state: BitVM3State;
  retained_at_ms: number;
}

export interface BitVM3RetentionPolicy {
  version: typeof VERIFIER_BITVM3_RETENTION_POLICY_VERSION;
  maxRetainedStates: number;
  terminalTtlMs: number;
}

export interface BitVM3OrchestratorOptions {
  now?: () => number;
  retention?: Partial<Pick<BitVM3RetentionPolicy, "maxRetainedStates" | "terminalTtlMs">>;
}

export interface BitVM3RetentionSnapshot {
  policy_version: typeof VERIFIER_BITVM3_RETENTION_POLICY_VERSION;
  max_retained_states: number;
  terminal_ttl_ms: number;
  retained_state_count: number;
  state_map_count: number;
  initialization_map_count: number;
  generation_map_count: number;
  in_flight_count: number;
  proof_queue_count: number;
}

type RetentionPreparation =
  | { kind: "replay"; state: BitVM3State }
  | { kind: "conflict" }
  | { kind: "capacity" }
  | { kind: "clock_failure"; failure: BitVM3ClockFailure }
  | { kind: "reserved"; generation: number };

type RetentionCommit =
  | { kind: "committed"; state: BitVM3State }
  | { kind: "stale" }
  | { kind: "clock_failure"; failure: BitVM3ClockFailure };

export class BitVM3Orchestrator {
  private readonly states = new Map<string, BitVM3State>();
  private readonly initializations = new Map<string, BitVM3Initialization>();
  private readonly generations = new Map<string, number>();
  private readonly proofQueues = new Map<string, Promise<void>>();
  private readonly retainedReservations = new Set<string>();
  private readonly now: () => number;
  private readonly retentionPolicy: BitVM3RetentionPolicy;
  private lastObservedTimeMs: number | undefined;
  private retentionQueue: Promise<void> = Promise.resolve();

  public constructor(
    private readonly verifier: BitVM3Verifier,
    options: BitVM3OrchestratorOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    const maxRetainedStates = this.policyOption(
      options.retention?.maxRetainedStates,
      VERIFIER_BITVM3_RETENTION_POLICY.maxRetainedStates,
      "maxRetainedStates",
    );
    const terminalTtlMs = this.policyOption(
      options.retention?.terminalTtlMs,
      VERIFIER_BITVM3_RETENTION_POLICY.terminalTtlMs,
      "terminalTtlMs",
    );
    this.retentionPolicy = {
      version: VERIFIER_BITVM3_RETENTION_POLICY_VERSION,
      maxRetainedStates,
      terminalTtlMs,
    };
  }

  private policyOption(
    value: number | undefined,
    fallback: number,
    option: "maxRetainedStates" | "terminalTtlMs",
  ): number {
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
      throw new BitVM3ConfigurationError(
        option,
        `BitVM3 ${option} must be a positive safe integer at or below the v1 policy`,
      );
    }
    if (value > fallback) {
      throw new BitVM3ConfigurationError(
        option,
        `BitVM3 ${option} must not exceed the v1 policy maximum`,
      );
    }
    return value;
  }

  private currentTimestamp(): BitVM3TimestampResult {
    let value: unknown;
    try {
      value = this.now();
    } catch (error: unknown) {
      const normalized = normalizeBoundaryError(error, "BitVM3 clock failed");
      return {
        ok: false,
        failure_code: normalized.truncated ? "resource_limit_exceeded" : "internal_error",
        error: normalized.message,
      };
    }
    const timestamp = safeTimestamp(value, this.lastObservedTimeMs);
    if (timestamp.ok) this.lastObservedTimeMs = timestamp.milliseconds;
    return timestamp;
  }

  private async withRetentionLock<T>(operation: () => Promise<T> | T): Promise<T> {
    const previous = this.retentionQueue;
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.retentionQueue = queued;
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.retentionQueue === queued) {
        this.retentionQueue = Promise.resolve();
      }
    }
  }

  private retainedProofIds(): Set<string> {
    const ids = new Set<string>();
    for (const id of this.states.keys()) ids.add(id);
    for (const id of this.initializations.keys()) ids.add(id);
    for (const id of this.generations.keys()) ids.add(id);
    return ids;
  }

  /**
   * Remove only idle terminal records. A proof queue or reservation marks an
   * operation as in flight, so cleanup must leave every associated map alone
   * until the operation commits or releases its reservation.
   */
  private cleanupExpiredTerminalStates(): BitVM3ClockFailure | undefined {
    const timestamp = this.currentTimestamp();
    if (!timestamp.ok) return timestamp;
    const now = timestamp.milliseconds;
    for (const proofId of this.retainedProofIds()) {
      if (this.proofQueues.has(proofId) || this.retainedReservations.has(proofId)) continue;
      const initialization = this.initializations.get(proofId);
      const expired = !initialization
        || (now >= initialization.retained_at_ms
          && now - initialization.retained_at_ms >= this.retentionPolicy.terminalTtlMs);
      if (!expired) continue;

      this.states.delete(proofId);
      this.initializations.delete(proofId);
      this.generations.delete(proofId);
      if (!this.proofQueues.has(proofId)) this.proofQueues.delete(proofId);
    }
    return undefined;
  }

  private async prepareRetention(
    proofId: string,
    verifierRequestDigest: string,
    recursiveHeight: number,
    verifierBackend: BackendIdentity,
    requestBackend: BackendIdentity,
  ): Promise<RetentionPreparation> {
    return this.withRetentionLock(() => {
      const clockFailure = this.cleanupExpiredTerminalStates();
      if (clockFailure) return { kind: "clock_failure", failure: clockFailure };
      const existing = this.initializations.get(proofId);
      if (existing) {
        const sameInitialization = existing.verifier_request_digest === verifierRequestDigest
          && existing.recursive_height === recursiveHeight
          && backendIdentityEquals(existing.verifier_backend, verifierBackend)
          && backendIdentityEquals(existing.verifier_backend, requestBackend);
        return sameInitialization
          ? { kind: "replay", state: copyState(existing.state) }
          : { kind: "conflict" };
      }

      if (this.retainedProofIds().size + this.retainedReservations.size
        >= this.retentionPolicy.maxRetainedStates) {
        return { kind: "capacity" };
      }

      this.retainedReservations.add(proofId);
      return {
        kind: "reserved",
        generation: this.generations.get(proofId) ?? 0,
      };
    });
  }

  private async releaseRetentionReservation(proofId: string): Promise<void> {
    await this.withRetentionLock(() => {
      this.retainedReservations.delete(proofId);
    });
  }

  private async commitVerifiedState(input: {
    proofId: string;
    recursiveHeight: number;
    verification: VerificationResult;
    verifierBackend: BackendIdentity;
    verifierRequestDigest: string;
    generation: number;
  }): Promise<RetentionCommit> {
    return this.withRetentionLock(() => {
      if (!this.retainedReservations.has(input.proofId)
        || (this.generations.get(input.proofId) ?? 0) !== input.generation
        || this.states.has(input.proofId)
        || this.initializations.has(input.proofId)) {
        return { kind: "stale" };
      }

      const retainedAt = this.currentTimestamp();
      if (!retainedAt.ok) return { kind: "clock_failure", failure: retainedAt };
      const state = stateFor(
        input.proofId,
        input.recursiveHeight,
        input.verification,
        input.verifierBackend,
        retainedAt.milliseconds,
      );
      this.states.set(input.proofId, state);
      this.initializations.set(input.proofId, {
        verifier_request_digest: input.verifierRequestDigest,
        recursive_height: input.recursiveHeight,
        verifier_backend: { ...input.verifierBackend },
        state,
        retained_at_ms: retainedAt.milliseconds,
      });
      this.generations.set(input.proofId, input.generation + 1);
      this.retainedReservations.delete(input.proofId);
      return { kind: "committed", state };
    });
  }

  private async withProofLock<T>(proofId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.proofQueues.get(proofId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.proofQueues.set(proofId, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.proofQueues.get(proofId) === queued) {
        this.proofQueues.delete(proofId);
      }
    }
  }

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

    return this.withProofLock(validation.request.proof_id, async () => {
      const preparation = await this.prepareRetention(
        validation.request.proof_id,
        validation.verifier_request_digest,
        validation.request.recursive_height,
        verifierBackend,
        validation.request.verifier_request.backend,
      );
      if (preparation.kind === "replay") return preparation.state;
      if (preparation.kind === "clock_failure") {
        return stateFor(
          validation.request.proof_id,
          validation.request.recursive_height,
          createVerificationFailure(
            preparation.failure.failure_code,
            preparation.failure.error,
            {
              request_digest: validation.verifier_request_digest,
              backend: verifierBackend,
              provenance: validation.request.verifier_request.provenance,
            },
          ),
          verifierBackend,
        );
      }
      if (preparation.kind === "conflict") {
        return stateFor(
          validation.request.proof_id,
          validation.request.recursive_height,
          createVerificationFailure(
            "malformed_request",
            "BitVM3 proof id is already initialized with a conflicting request",
            {
              request_digest: validation.verifier_request_digest,
              backend: verifierBackend,
              provenance: validation.request.verifier_request.provenance,
            },
          ),
          verifierBackend,
        );
      }
      if (preparation.kind === "capacity") {
        return stateFor(
          validation.request.proof_id,
          validation.request.recursive_height,
          createVerificationFailure(
            "resource_limit_exceeded",
            "BitVM3 retained-state capacity is full; no backend dispatch occurred",
            {
              request_digest: validation.verifier_request_digest,
              backend: verifierBackend,
              provenance: validation.request.verifier_request.provenance,
            },
          ),
          verifierBackend,
        );
      }

      let reserved = true;
      try {
        logger.info(`Received recursive verification request for proof ${boundedIdentifier(validation.request.proof_id)}`);
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
          const commit = await this.commitVerifiedState({
            proofId: validation.request.proof_id,
            recursiveHeight: validation.request.recursive_height,
            verification,
            verifierBackend,
            verifierRequestDigest: validation.verifier_request_digest,
            generation: preparation.generation,
          });
          if (commit.kind === "clock_failure") {
            return stateFor(
              validation.request.proof_id,
              validation.request.recursive_height,
              createVerificationFailure(
                commit.failure.failure_code,
                commit.failure.error,
                {
                  request_digest: validation.verifier_request_digest,
                  backend: verifierBackend,
                  provenance: validation.request.verifier_request.provenance,
                },
              ),
              verifierBackend,
            );
          }
          if (commit.kind === "stale") {
            return stateFor(
              validation.request.proof_id,
              validation.request.recursive_height,
              createVerificationFailure("internal_error", "BitVM3 proof state changed before commit"),
              verifierBackend,
            );
          }
          reserved = false;
          return copyState(commit.state);
        }

        return stateFor(
          validation.request.proof_id,
          validation.request.recursive_height,
          verification,
          verifierBackend,
        );
      } finally {
        if (reserved) await this.releaseRetentionReservation(validation.request.proof_id);
      }
    });
  }

  public getState(id: string): BitVM3State | undefined {
    this.cleanupExpiredTerminalStates();
    const state = this.states.get(id);
    return state ? copyState(state) : undefined;
  }

  public getRetentionSnapshot(): BitVM3RetentionSnapshot {
    this.cleanupExpiredTerminalStates();
    return {
      policy_version: this.retentionPolicy.version,
      max_retained_states: this.retentionPolicy.maxRetainedStates,
      terminal_ttl_ms: this.retentionPolicy.terminalTtlMs,
      retained_state_count: this.retainedProofIds().size,
      state_map_count: this.states.size,
      initialization_map_count: this.initializations.size,
      generation_map_count: this.generations.size,
      in_flight_count: this.retainedReservations.size,
      proof_queue_count: this.proofQueues.size,
    };
  }
}

export const bitvm3Orchestrator = new BitVM3Orchestrator(new UnavailableBitVM3Verifier());
