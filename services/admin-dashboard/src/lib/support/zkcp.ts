import { createLogger } from "./logger";
import {
  VERIFIER_CONTRACT_VERSION,
  UNAVAILABLE_BACKEND,
  backendIdentityEquals,
  canonicalJson,
  createPaymentFailure,
  createVerificationFailure,
  boundedIdentifier,
  digestCanonical,
  digestVerifierRequest,
  isDigest,
  isAuthoritativeBackendIdentity,
  isBackendIdentity,
  isPaymentNetwork,
  isProductionPayment,
  isProductionVerified,
  isProvenance,
  isUnavailableBackend,
  isVerificationFailureCode,
  normalizeBoundaryError,
  rejectNonProductionVerification,
  VERIFIER_RESOURCE_LIMITS,
  VERIFIER_ZKCP_LIST_POLICY_VERSION,
  VERIFIER_ZKCP_RETENTION_POLICY_VERSION,
  type BackendIdentity,
  type Digest,
  type PaymentNetwork,
  type PaymentObservation,
  type PaymentObservationRequest,
  type PaymentObservationResult,
  type PublicInputBinding,
  type VerificationFailureCode,
  type VerificationResult,
  type VerifierRequest,
  validatePaymentObservation,
  validateVerificationResult,
  validateVerifierRequest,
} from "./verifier-contract";

/**
* ZKCP (Zero-Knowledge Contingent Payments) coordination boundary. The
* dashboard does not implement a proof system, chain monitor, or key-release
* primitive. Each dependency is explicit and unavailable by default.
*/

const logger = createLogger("ZKCP");

export const ZKCP_STATEMENT_BINDING_VERSION = "conxian.zkcp.statement.v1" as const;
export type ZKCPStatus = "pending" | "verified" | "paid" | "failed" | "unsupported";
export type ZKProofSystem = "groth16" | "plonk" | "stark";

export interface ZKCPIntent {
  id: string;
  amount: number;
  encryptedDataHash: Digest;
  proofHash: Digest;
  sellerAddress: string;
  buyerAddress: string;
  network: PaymentNetwork;
  status: ZKCPStatus;
  round: number;
  paymentHash?: string;
  proofSystem?: ZKProofSystem;
  verification?: VerificationResult;
  paymentObservation?: PaymentObservation;
  createdAt: string;
  updatedAt: string;
}

export interface ZKCPIntentInput {
  id: string;
  amount: number;
  encryptedDataHash: Digest;
  proofHash: Digest;
  sellerAddress: string;
  buyerAddress: string;
  network: PaymentNetwork;
}

export type ZKVerificationResult = VerificationResult;

export interface ZKCPBindingDigests {
  version: typeof ZKCP_STATEMENT_BINDING_VERSION;
  payment_condition_digest: Digest;
  statement_digest: Digest;
  domain_digest: Digest;
}

export const ZKCP_RETENTION_POLICY = Object.freeze({
  version: VERIFIER_ZKCP_RETENTION_POLICY_VERSION,
  maxActiveIntents: VERIFIER_RESOURCE_LIMITS.maxZkcpActiveIntents,
  maxTotalIntents: VERIFIER_RESOURCE_LIMITS.maxZkcpTotalIntents,
  terminalRetentionMs: VERIFIER_RESOURCE_LIMITS.maxZkcpTerminalRetentionMs,
} as const);

export const ZKCP_LIST_POLICY = Object.freeze({
  version: VERIFIER_ZKCP_LIST_POLICY_VERSION,
  defaultPageSize: 50,
  maxPageSize: VERIFIER_RESOURCE_LIMITS.maxZkcpListPageSize,
  maxOffset: VERIFIER_RESOURCE_LIMITS.maxZkcpListOffset,
} as const);

export const ZKCP_TIMESTAMP_MIN_MS = 0;
export const ZKCP_TIMESTAMP_MAX_MS = 8.64e15;

type ZKCPClockFailureCode = "internal_error" | "malformed_request" | "resource_limit_exceeded";

interface ZKCPClockFailure {
  ok: false;
  failure_code: ZKCPClockFailureCode;
  error: string;
}

interface ZKCPTimestamp {
  ok: true;
  milliseconds: number;
  iso: string;
}

type ZKCPTimestampResult = ZKCPTimestamp | ZKCPClockFailure;

function safeTimestamp(value: unknown, previousMilliseconds?: number): ZKCPTimestampResult {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, failure_code: "malformed_request", error: "ZKCP clock must return a finite numeric timestamp" };
  }
  if (!Number.isSafeInteger(value)) {
    return { ok: false, failure_code: "malformed_request", error: "ZKCP clock must return a safe integer timestamp" };
  }
  if (value < ZKCP_TIMESTAMP_MIN_MS) {
    return { ok: false, failure_code: "malformed_request", error: "ZKCP clock must not return a negative timestamp" };
  }
  if (value > ZKCP_TIMESTAMP_MAX_MS) {
    return {
      ok: false,
      failure_code: "resource_limit_exceeded",
      error: "ZKCP clock timestamp exceeds the ECMAScript Date serialization range",
    };
  }
  if (previousMilliseconds !== undefined && value < previousMilliseconds) {
    return { ok: false, failure_code: "internal_error", error: "ZKCP clock moved backwards and violated monotonicity" };
  }
  try {
    return { ok: true, milliseconds: value, iso: new Date(value).toISOString() };
  } catch (error: unknown) {
    const normalized = normalizeBoundaryError(error, "ZKCP timestamp serialization failed");
    return {
      ok: false,
      failure_code: normalized.truncated ? "resource_limit_exceeded" : "internal_error",
      error: normalized.message,
    };
  }
}

export interface ZKCPIntentPage {
  policy_version: typeof VERIFIER_ZKCP_LIST_POLICY_VERSION;
  intents: ReadonlyArray<Readonly<ZKCPIntent>>;
  count: number;
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset?: number;
}

export interface ZKCPListPaginationValidationSuccess {
  ok: true;
  limit: number;
  offset: number;
}

export interface ZKCPListPaginationValidationFailure {
  ok: false;
  failure_code: "malformed_request" | "resource_limit_exceeded";
  error: string;
}

export type ZKCPListPaginationValidation =
  | ZKCPListPaginationValidationSuccess
  | ZKCPListPaginationValidationFailure;

export function validateZKCPListPagination(limit: unknown, offset: unknown): ZKCPListPaginationValidation {
  const normalizedLimit = limit === undefined ? ZKCP_LIST_POLICY.defaultPageSize : limit;
  const normalizedOffset = offset === undefined ? 0 : offset;
  if (typeof normalizedLimit !== "number" || !Number.isSafeInteger(normalizedLimit) || normalizedLimit < 1) {
    return { ok: false, failure_code: "malformed_request", error: "ZKCP list limit must be a positive safe integer" };
  }
  if (normalizedLimit > ZKCP_LIST_POLICY.maxPageSize) {
    return { ok: false, failure_code: "resource_limit_exceeded", error: "ZKCP list limit exceeds the v1 resource limit" };
  }
  if (typeof normalizedOffset !== "number" || !Number.isSafeInteger(normalizedOffset) || normalizedOffset < 0) {
    return { ok: false, failure_code: "malformed_request", error: "ZKCP list offset must be a non-negative safe integer" };
  }
  if (normalizedOffset > ZKCP_LIST_POLICY.maxOffset) {
    return { ok: false, failure_code: "resource_limit_exceeded", error: "ZKCP list offset exceeds the v1 resource limit" };
  }
  return { ok: true, limit: normalizedLimit, offset: normalizedOffset };
}

export interface ZKProofVerifier {
  readonly backendIdentity: BackendIdentity;
  verify(request: VerifierRequest): Promise<VerificationResult>;
}

export class UnavailableZKVerifier implements ZKProofVerifier {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async verify(request: VerifierRequest): Promise<VerificationResult> {
    return createVerificationFailure(
      "backend_unavailable",
      "ZK proof verification backend is not configured",
      {
        request_digest: await digestVerifierRequest(request),
        backend: UNAVAILABLE_BACKEND,
        provenance: "unknown",
      },
    );
  }
}

export interface OnChainMonitor {
  readonly backendIdentity: BackendIdentity;
  watchForPayment(request: PaymentObservationRequest): Promise<PaymentObservationResult>;
}

export class UnavailableOnChainMonitor implements OnChainMonitor {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async watchForPayment(_request: PaymentObservationRequest): Promise<PaymentObservationResult> {
    return createPaymentFailure(
      "observer_unavailable",
      "Bitcoin payment observer is not configured",
    );
  }
}

export interface SettlementFinalizationResult {
  finalized: false;
  status: "rejected" | "unavailable";
  intentId: string;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export type ZKCPEventHandler = (event: ZKCPEvent) => void;

export interface ZKCPEvent {
  type: "intent_created" | "proof_verified" | "payment_detected" | "intent_failed";
  intentId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

interface BindingValidationSuccess {
  ok: true;
  binding: ZKCPBindingDigests;
}

interface BindingValidationFailure {
  ok: false;
  failure_code: VerificationFailureCode;
  error: string;
}

type BindingValidation = BindingValidationSuccess | BindingValidationFailure;

interface StoredVerificationEvidence {
  request: VerifierRequest;
  request_digest: Digest;
  result: VerificationResult;
}

interface StoredPaymentEvidence {
  request: PaymentObservationRequest;
  observation: PaymentObservation;
}

export interface ZKCPBridgeOptions {
  now?: () => number;
  maxActiveIntents?: number;
  maxTotalIntents?: number;
  terminalRetentionMs?: number;
}

export class ZKCPBoundaryError extends Error {
  public readonly failure_code: ZKCPClockFailureCode;

  public constructor(
    failure_code: ZKCPClockFailureCode,
    message: string,
  ) {
    super(message);
    this.name = "ZKCPBoundaryError";
    this.failure_code = failure_code;
  }
}

interface IntentOperation {
  intentId: string;
  intent: ZKCPIntent;
  generation: number;
  expectedStatuses: readonly ZKCPStatus[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoundedNonEmptyString(value: unknown, maxLength: number): value is string {
  return isNonEmptyString(value) && value.length <= maxLength;
}

function validateIntentIdentifier(value: unknown):
  | { ok: true; id: string }
  | { ok: false; failure_code: "malformed_request" | "resource_limit_exceeded"; id: string; error: string } {
  if (!isNonEmptyString(value)) {
    return {
      ok: false,
      failure_code: "malformed_request",
      id: boundedIdentifier(value),
      error: "ZKCP intent id is required",
    };
  }
  if (value.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars) {
    return {
      ok: false,
      failure_code: "resource_limit_exceeded",
      id: boundedIdentifier(value),
      error: "ZKCP intent id exceeds the v1 resource limit",
    };
  }
  return { ok: true, id: value };
}

function isPaymentStatus(value: unknown): value is PaymentObservationResult["status"] {
  return value === "observed"
    || value === "not_observed"
    || value === "unavailable"
    || value === "malformed"
    || value === "mismatch"
    || value === "rejected";
}

function isZKProofSystem(value: unknown): value is ZKProofSystem {
  return value === "groth16" || value === "plonk" || value === "stark";
}

function isZKCPStatus(value: unknown): value is ZKCPStatus {
  return value === "pending"
    || value === "verified"
    || value === "paid"
    || value === "failed"
    || value === "unsupported";
}

function paymentRequestFor(intent: Pick<ZKCPIntent, "id" | "amount" | "sellerAddress" | "network">): PaymentObservationRequest {
  return {
    intent_id: intent.id,
    address: intent.sellerAddress,
    expected_amount: intent.amount,
    network: intent.network,
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function digestHex(value: Digest): string {
  return value.slice("sha256:".length);
}

function amountHex(value: number): string {
  const hex = value.toString(16);
  return hex.length % 2 === 0 ? hex : `0${hex}`;
}

export function expectedZKCPPublicInputs(
  intent: Pick<ZKCPIntentInput, "amount" | "encryptedDataHash" | "sellerAddress">,
): readonly Omit<PublicInputBinding, "digest">[] {
  return [
    {
      index: 0,
      name: "amount",
      value: amountHex(intent.amount),
      encoding: "hex",
    },
    {
      index: 1,
      name: "seller_address",
      value: bytesToHex(new TextEncoder().encode(intent.sellerAddress)),
      encoding: "hex",
    },
    {
      index: 2,
      name: "encrypted_data_hash",
      value: digestHex(intent.encryptedDataHash),
      encoding: "hex",
    },
  ];
}

export async function deriveZKCPBinding(
  intent: Pick<ZKCPIntentInput, "id" | "amount" | "encryptedDataHash" | "proofHash" | "sellerAddress" | "buyerAddress" | "network">,
  request: Pick<VerifierRequest, "proof_system" | "curve" | "circuit" | "verification_key" | "proof">,
): Promise<ZKCPBindingDigests> {
  const paymentCondition = {
    binding_version: ZKCP_STATEMENT_BINDING_VERSION,
    intent_id: intent.id,
    address: intent.sellerAddress,
    amount: intent.amount,
    network: intent.network,
    payment_hash: null,
  } as const;
  const payment_condition_digest = await digestCanonical(paymentCondition);
  const publicInputs = expectedZKCPPublicInputs(intent);
  const common = {
    binding_version: ZKCP_STATEMENT_BINDING_VERSION,
    contract_version: VERIFIER_CONTRACT_VERSION,
    intent_id: intent.id,
    encrypted_data_digest: intent.encryptedDataHash,
    payment_condition: paymentCondition,
    payment_condition_digest,
    seller_address: intent.sellerAddress,
    buyer_address: intent.buyerAddress,
    amount: intent.amount,
    network: intent.network,
    proof_digest: request.proof.digest,
    proof_system: request.proof_system,
    curve: request.curve,
    circuit: request.circuit,
    verification_key: request.verification_key,
    public_inputs: publicInputs,
  } as const;

  return {
    version: ZKCP_STATEMENT_BINDING_VERSION,
    payment_condition_digest,
    statement_digest: await digestCanonical({
      ...common,
      purpose: "zkcp-proof-statement",
    }),
    domain_digest: await digestCanonical({
      binding_version: ZKCP_STATEMENT_BINDING_VERSION,
      contract_version: VERIFIER_CONTRACT_VERSION,
      purpose: "zkcp-settlement-domain",
      intent_id: intent.id,
      encrypted_data_digest: intent.encryptedDataHash,
      payment_condition_digest,
      seller_address: intent.sellerAddress,
      buyer_address: intent.buyerAddress,
      amount: intent.amount,
      network: intent.network,
      proof_system: request.proof_system,
      curve: request.curve,
      circuit: request.circuit,
      verification_key: request.verification_key,
      proof_digest: request.proof.digest,
      public_inputs: publicInputs,
    }),
  };
}

async function validateZKCPIntentBinding(
  intent: ZKCPIntent,
  request: VerifierRequest,
): Promise<BindingValidation> {
  const expectedInputs = expectedZKCPPublicInputs(intent);
  if (request.public_inputs.length !== expectedInputs.length) {
    return { ok: false, failure_code: "public_input_mismatch", error: "ZKCP public-input count is not bound to the intent" };
  }
  for (let index = 0; index < expectedInputs.length; index += 1) {
    const actual = request.public_inputs[index];
    const expected = expectedInputs[index];
    if (actual.index !== expected.index
      || actual.name !== expected.name
      || actual.value !== expected.value
      || actual.encoding !== expected.encoding) {
      return {
        ok: false,
        failure_code: "public_input_mismatch",
        error: `ZKCP public input ${index} is not bound to the intent settlement terms`,
      };
    }
  }

  try {
    const binding = await deriveZKCPBinding(intent, request);
    if (request.statement_digest !== binding.statement_digest) {
      return { ok: false, failure_code: "statement_mismatch", error: "ZKCP statement digest is not bound to the intent" };
    }
    if (request.domain_digest !== binding.domain_digest) {
      return { ok: false, failure_code: "domain_mismatch", error: "ZKCP domain digest is not bound to the settlement terms" };
    }
    return { ok: true, binding };
  } catch (error: unknown) {
    const normalized = normalizeBoundaryError(error, "Unable to derive ZKCP statement binding");
    return {
      ok: false,
      failure_code: "digest_unavailable",
      error: normalized.message,
    };
  }
}

function immutableCopy<T>(value: T): T {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => immutableCopy(entry))) as T;
  }
  if (isRecord(value)) {
    const copy: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) copy[key] = immutableCopy(entry);
    return Object.freeze(copy) as T;
  }
  return value;
}

function failedVerification(intentId: string, code: VerificationFailureCode, error: string): VerificationResult {
  logger.warn(`Verification failed for intent ${boundedIdentifier(intentId)}: ${code}`);
  return createVerificationFailure(code, error);
}

async function normalizePaymentResult(
  value: unknown,
  request: PaymentObservationRequest,
  authority: BackendIdentity,
): Promise<PaymentObservationResult> {
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || !isPaymentStatus(value.status)
    || typeof value.detected !== "boolean"
    || !isProvenance(value.provenance)) {
    return createPaymentFailure("payment_mismatch", "Payment observer returned a malformed result");
  }

  if (value.failure_code !== undefined && !isVerificationFailureCode(value.failure_code)) {
    return createPaymentFailure("payment_mismatch", "Payment observer returned an unknown failure code");
  }
  if (value.error !== undefined && typeof value.error !== "string") {
    return createPaymentFailure("payment_mismatch", "Payment observer returned a malformed error");
  }
  if (typeof value.error === "string" && value.error.length > VERIFIER_RESOURCE_LIMITS.maxErrorChars) {
    return createPaymentFailure("resource_limit_exceeded", value.error);
  }

  if (value.status !== "observed") {
    if (value.detected) return createPaymentFailure("payment_mismatch", "A non-observed payment result cannot be detected");
    if (!isVerificationFailureCode(value.failure_code)) {
      return createPaymentFailure("payment_mismatch", "Non-observed payment results require a typed failure code");
    }
    return {
      contract_version: VERIFIER_CONTRACT_VERSION,
      status: value.status,
      detected: false,
      provenance: value.provenance,
      failure_code: value.failure_code,
      error: typeof value.error === "string" ? value.error : undefined,
    };
  }

  if (value.failure_code !== undefined) {
    return createPaymentFailure("payment_mismatch", "An observed payment result cannot carry a failure code");
  }
  if (!value.detected || value.observation === undefined) {
    return createPaymentFailure("payment_not_observed", "Observed payment result is missing payment evidence");
  }

  const validation = await validatePaymentObservation(value.observation, request);
  if (!validation.ok) return createPaymentFailure(validation.failure_code, validation.error);
  const observation = validation.observation;

  if (!backendIdentityEquals(observation.observer, authority)
    || observation.provenance !== value.provenance) {
    return createPaymentFailure("payment_mismatch", "Payment evidence is not bound to the configured observer");
  }

  if (!isAuthoritativeBackendIdentity(authority)
    || !isAuthoritativeBackendIdentity(observation.observer)) {
    return createPaymentFailure("payment_mismatch", "Only an authoritative observer can report an observed payment", value.provenance);
  }

  if (value.provenance !== "production" || observation.provenance !== "production") {
    return createPaymentFailure("simulated_result", "Non-production payment evidence cannot authorize settlement", value.provenance);
  }

  const result: PaymentObservationResult = {
    contract_version: VERIFIER_CONTRACT_VERSION,
    status: "observed",
    detected: true,
    provenance: value.provenance,
    observation,
  };

  return result;
}

function copyPaymentResult(result: PaymentObservationResult): PaymentObservationResult {
  return immutableCopy(result);
}

function copyVerificationResult(result: VerificationResult): VerificationResult {
  return immutableCopy(result);
}

export class ZKCPBridge {
  private readonly intents = new Map<string, ZKCPIntent>();
  private readonly verificationEvidence = new Map<string, StoredVerificationEvidence>();
  private readonly paymentEvidence = new Map<string, StoredPaymentEvidence>();
  private readonly lifecycleQueues = new Map<string, Promise<void>>();
  private readonly lifecycleGenerations = new Map<string, number>();
  private readonly eventHandlers: ZKCPEventHandler[] = [];
  private readonly now: () => number;
  private readonly maxActiveIntents: number;
  private readonly maxTotalIntents: number;
  private readonly terminalRetentionMs: number;
  private lastObservedTimeMs: number | undefined;

  public constructor(
    private readonly verifier: ZKProofVerifier,
    private readonly onChainMonitor: OnChainMonitor,
    options: ZKCPBridgeOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.maxActiveIntents = this.policyOption(
      options.maxActiveIntents,
      ZKCP_RETENTION_POLICY.maxActiveIntents,
      "maxActiveIntents",
    );
    this.maxTotalIntents = this.policyOption(
      options.maxTotalIntents,
      ZKCP_RETENTION_POLICY.maxTotalIntents,
      "maxTotalIntents",
    );
    this.terminalRetentionMs = this.policyOption(
      options.terminalRetentionMs,
      ZKCP_RETENTION_POLICY.terminalRetentionMs,
      "terminalRetentionMs",
      true,
    );
    if (this.maxActiveIntents > this.maxTotalIntents) {
      throw new ZKCPBoundaryError("malformed_request", "ZKCP active-intent quota cannot exceed total quota");
    }
  }

  private policyOption(value: number | undefined, fallback: number, name: string, allowZero = false): number {
    if (value === undefined) return fallback;
    if (!Number.isSafeInteger(value) || (allowZero ? value < 0 : value <= 0) || value > fallback) {
      throw new ZKCPBoundaryError("malformed_request", `ZKCP ${name} option is outside the v1 policy`);
    }
    return value;
  }

  private currentTimestamp(): ZKCPTimestampResult {
    let value: unknown;
    try {
      value = this.now();
    } catch (error: unknown) {
      const normalized = normalizeBoundaryError(error, "ZKCP clock failed");
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

  private isActiveIntent(intent: ZKCPIntent): boolean {
    return intent.status === "pending" || intent.status === "verified";
  }

  private deleteIntentEvidence(intentId: string): void {
    this.verificationEvidence.delete(intentId);
    this.paymentEvidence.delete(intentId);
  }

  private cleanupExpiredTerminalRecords(): number {
    const timestamp = this.currentTimestamp();
    if (!timestamp.ok) return 0;
    const cutoff = timestamp.milliseconds - this.terminalRetentionMs;
    let removed = 0;
    for (const [intentId, intent] of this.intents) {
      if (this.isActiveIntent(intent)
        || this.lifecycleQueues.has(intentId)) continue;
      const updatedAt = Date.parse(intent.updatedAt);
      if (!Number.isFinite(updatedAt) || updatedAt > cutoff) continue;
      this.intents.delete(intentId);
      this.deleteIntentEvidence(intentId);
      this.lifecycleGenerations.delete(intentId);
      this.lifecycleQueues.delete(intentId);
      removed += 1;
    }
    return removed;
  }

  public purgeExpiredTerminalRecords(): number {
    return this.cleanupExpiredTerminalRecords();
  }

  private activeIntentCount(): number {
    let count = 0;
    for (const intent of this.intents.values()) {
      if (this.isActiveIntent(intent)) count += 1;
    }
    return count;
  }

  private async withIntentLock<T>(intentId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.lifecycleQueues.get(intentId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.lifecycleQueues.set(intentId, queued);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.lifecycleQueues.get(intentId) === queued) {
        this.lifecycleQueues.delete(intentId);
      }
    }
  }

  private beginOperation(
    intentId: string,
    expectedStatuses: readonly ZKCPStatus[],
  ): IntentOperation | undefined {
    const intent = this.intents.get(intentId);
    if (!intent || !expectedStatuses.includes(intent.status)) return undefined;
    return {
      intentId,
      intent,
      generation: this.lifecycleGenerations.get(intentId) ?? 0,
      expectedStatuses,
    };
  }

  private isCurrentOperation(
    operation: IntentOperation,
    statuses: readonly ZKCPStatus[] = operation.expectedStatuses,
  ): boolean {
    const current = this.intents.get(operation.intentId);
    return current === operation.intent
      && (this.lifecycleGenerations.get(operation.intentId) ?? 0) === operation.generation
      && statuses.includes(current.status);
  }

  private commitOperation(
    operation: IntentOperation,
    commit: (intent: ZKCPIntent) => void,
    statuses: readonly ZKCPStatus[] = operation.expectedStatuses,
  ): boolean {
    if (!this.isCurrentOperation(operation, statuses)) return false;
    commit(operation.intent);
    this.lifecycleGenerations.set(operation.intentId, operation.generation + 1);
    return true;
  }

  public onEvent(handler: ZKCPEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private emit(event: ZKCPEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Event subscribers cannot alter settlement state.
      }
    }
  }

  private recordFailure(operation: IntentOperation, result: VerificationResult): VerificationResult {
    const timestamp = this.currentTimestamp();
    if (!timestamp.ok) {
      return copyVerificationResult(failedVerification(operation.intentId, timestamp.failure_code, timestamp.error));
    }
    if (!this.commitOperation(operation, (intent) => {
      intent.status = result.status === "unavailable" || result.status === "unsupported" ? "unsupported" : "failed";
      intent.verification = immutableCopy(result);
      intent.updatedAt = timestamp.iso;
      this.deleteIntentEvidence(intent.id);
      this.emit({ type: "intent_failed", intentId: intent.id, timestamp: intent.updatedAt, data: { failure_code: result.failure_code } });
    })) {
      return copyVerificationResult(failedVerification(operation.intentId, "internal_error", "ZKCP lifecycle operation became stale before failure commit"));
    }
    return copyVerificationResult(result);
  }

  public initializeIntent(params: ZKCPIntentInput): Readonly<ZKCPIntent> {
    if (!isNonEmptyString(params.id)
      || params.id.length > VERIFIER_RESOURCE_LIMITS.maxIdentifierChars
      || !Number.isSafeInteger(params.amount)
      || params.amount <= 0
      || !isNonEmptyString(params.sellerAddress)
      || params.sellerAddress.length > VERIFIER_RESOURCE_LIMITS.maxAddressChars
      || !isNonEmptyString(params.buyerAddress)
      || params.buyerAddress.length > VERIFIER_RESOURCE_LIMITS.maxAddressChars
      || !isPaymentNetwork(params.network)
      || !/^sha256:[0-9a-f]{64}$/.test(params.encryptedDataHash)
      || !/^sha256:[0-9a-f]{64}$/.test(params.proofHash)) {
      throw new Error("Malformed ZKCP intent bindings");
    }
    this.cleanupExpiredTerminalRecords();
    if (this.intents.has(params.id)) throw new Error("ZKCP intent id already exists");
    if (this.activeIntentCount() >= this.maxActiveIntents) {
      throw new ZKCPBoundaryError("resource_limit_exceeded", "ZKCP active-intent capacity is full");
    }
    if (this.intents.size >= this.maxTotalIntents) {
      throw new ZKCPBoundaryError("resource_limit_exceeded", "ZKCP retained-intent capacity is full");
    }

    const timestamp = this.currentTimestamp();
    if (!timestamp.ok) throw new ZKCPBoundaryError(timestamp.failure_code, timestamp.error);
    const now = timestamp.iso;
    const intent: ZKCPIntent = {
      ...params,
      status: "pending",
      round: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.intents.set(intent.id, intent);
    this.lifecycleGenerations.set(intent.id, 0);
    this.emit({ type: "intent_created", intentId: intent.id, timestamp: now, data: { amount: intent.amount } });
    logger.info(`Initialized intent ${boundedIdentifier(intent.id)}`);
    return immutableCopy(intent);
  }

  public async verifyProof(intentId: string, value: unknown): Promise<VerificationResult> {
    const intentValidation = validateIntentIdentifier(intentId);
    if (!intentValidation.ok) {
      return copyVerificationResult(failedVerification(
        intentValidation.id,
        intentValidation.failure_code,
        intentValidation.error,
      ));
    }
    return this.withIntentLock(intentValidation.id, async () => {
      const intent = this.intents.get(intentId);
      if (!intent) return copyVerificationResult(failedVerification(intentId, "malformed_request", "Intent not found"));
      if (intent.status !== "pending") {
        return copyVerificationResult(failedVerification(intentId, "malformed_request", `Intent is not pending (current: ${intent.status})`));
      }

      const operation = this.beginOperation(intentId, ["pending"]);
      if (!operation) {
        return copyVerificationResult(failedVerification(intentId, "internal_error", "Unable to start ZKCP verification operation"));
      }

      const requestValidation = await validateVerifierRequest(value);
      if (!requestValidation.ok) {
        return this.recordFailure(operation, failedVerification(intentId, requestValidation.failure_code, requestValidation.error));
      }

      if (requestValidation.request.proof.digest !== intent.proofHash) {
        return this.recordFailure(operation, failedVerification(intentId, "proof_digest_mismatch", "Proof is not bound to the initialized intent"));
      }

      const bindingValidation = await validateZKCPIntentBinding(intent, requestValidation.request);
      if (!bindingValidation.ok) {
        return this.recordFailure(operation, failedVerification(intentId, bindingValidation.failure_code, bindingValidation.error));
      }
      if (!this.isCurrentOperation(operation)) {
        return copyVerificationResult(failedVerification(intentId, "internal_error", "ZKCP verification became stale before backend dispatch"));
      }

      const proofSystem = requestValidation.request.proof_system;
      if (!isZKProofSystem(proofSystem)) {
        return this.recordFailure(operation, failedVerification(intentId, "unsupported_backend", "The selected proof system is not a ZKCP proof system"));
      }

      const verifierBackend = this.verifier.backendIdentity;
      if (!isBackendIdentity(verifierBackend)) {
        return this.recordFailure(operation, failedVerification(intentId, "backend_mismatch", "Verifier adapter has no valid configured backend identity"));
      }
      if (!isUnavailableBackend(verifierBackend)
        && !backendIdentityEquals(requestValidation.request.backend, verifierBackend)) {
        return this.recordFailure(operation, failedVerification(intentId, "backend_mismatch", "Verifier request is not bound to the configured adapter backend"));
      }

      let result: VerificationResult;
      try {
        result = await this.verifier.verify(requestValidation.request);
      } catch (error: unknown) {
        result = createVerificationFailure(
          "internal_error",
          error,
          {
            request_digest: requestValidation.request_digest,
            backend: verifierBackend,
            provenance: requestValidation.request.provenance,
          },
        );
      }
      if (!this.isCurrentOperation(operation)) {
        return copyVerificationResult(failedVerification(intentId, "internal_error", "ZKCP verification became stale after backend dispatch"));
      }

      const resultValidation = await validateVerificationResult(
        result,
        requestValidation.request,
        requestValidation.request_digest,
        verifierBackend,
      );
      if (!this.isCurrentOperation(operation)) {
        return copyVerificationResult(failedVerification(intentId, "internal_error", "ZKCP verification became stale before result commit"));
      }

      if (!resultValidation.ok) {
        result = createVerificationFailure(resultValidation.failure_code, resultValidation.error, {
          request_digest: requestValidation.request_digest,
          backend: verifierBackend,
          provenance: requestValidation.request.provenance,
        });
      } else {
        result = rejectNonProductionVerification(resultValidation.result, verifierBackend);
      }

      if (!isProductionVerified(result, verifierBackend)) {
        return this.recordFailure(operation, result);
      }

      const evidence: StoredVerificationEvidence = immutableCopy({
        request: requestValidation.request,
        request_digest: requestValidation.request_digest,
        result,
      });
      const timestamp = this.currentTimestamp();
      if (!timestamp.ok) {
        return copyVerificationResult(failedVerification(intentId, timestamp.failure_code, timestamp.error));
      }
      if (!this.commitOperation(operation, (currentIntent) => {
        this.verificationEvidence.set(currentIntent.id, evidence);
        currentIntent.updatedAt = timestamp.iso;
        currentIntent.verification = immutableCopy(result);
        currentIntent.status = "verified";
        currentIntent.proofSystem = proofSystem;
        this.emit({
          type: "proof_verified",
          intentId,
          timestamp: currentIntent.updatedAt,
          data: { proofSystem: currentIntent.proofSystem, backend: result.backend.id },
        });
      })) {
        return copyVerificationResult(failedVerification(intentId, "internal_error", "ZKCP verification became stale before state commit"));
      }
      return copyVerificationResult(result);
    });
  }

  private async revalidateProofEvidence(intent: ZKCPIntent): Promise<
    | { ok: true; evidence: StoredVerificationEvidence }
    | { ok: false; failure_code: VerificationFailureCode; error: string }
  > {
    const stored = this.verificationEvidence.get(intent.id);
    if (!stored) return { ok: false, failure_code: "payment_not_observed", error: "No authoritative proof evidence is retained" };

    const requestValidation = await validateVerifierRequest(stored.request);
    if (!requestValidation.ok) return requestValidation;
    if (requestValidation.request_digest !== stored.request_digest) {
      return { ok: false, failure_code: "statement_mismatch", error: "Stored verifier request digest changed" };
    }
    if (requestValidation.request.proof.digest !== intent.proofHash) {
      return { ok: false, failure_code: "proof_digest_mismatch", error: "Stored proof evidence is not bound to the intent" };
    }

    const bindingValidation = await validateZKCPIntentBinding(intent, requestValidation.request);
    if (!bindingValidation.ok) return bindingValidation;

    const verifierBackend = this.verifier.backendIdentity;
    if (!isBackendIdentity(verifierBackend)) {
      return { ok: false, failure_code: "backend_mismatch", error: "Verifier adapter has no valid configured backend identity" };
    }
    const resultValidation = await validateVerificationResult(
      stored.result,
      requestValidation.request,
      requestValidation.request_digest,
      verifierBackend,
    );
    if (!resultValidation.ok) return resultValidation;
    const normalized = rejectNonProductionVerification(resultValidation.result, verifierBackend);
    if (!isProductionVerified(normalized, verifierBackend)) {
      return { ok: false, failure_code: normalized.failure_code ?? "backend_mismatch", error: normalized.error ?? "Stored proof evidence is no longer authoritative" };
    }

    return {
      ok: true,
      evidence: immutableCopy({
        request: requestValidation.request,
        request_digest: requestValidation.request_digest,
        result: normalized,
      }),
    };
  }

  private paymentResultForObservation(observation: PaymentObservation): PaymentObservationResult {
    return {
      contract_version: VERIFIER_CONTRACT_VERSION,
      status: "observed",
      detected: true,
      provenance: observation.provenance,
      observation: immutableCopy(observation),
    };
  }

  public async watchForPayment(intentId: string): Promise<PaymentObservationResult> {
    const intentValidation = validateIntentIdentifier(intentId);
    if (!intentValidation.ok) {
      return copyPaymentResult(createPaymentFailure(intentValidation.failure_code, intentValidation.error));
    }
    return this.withIntentLock(intentValidation.id, async () => {
      const intent = this.intents.get(intentId);
      if (!intent) return copyPaymentResult(createPaymentFailure("payment_not_observed", "Intent not found"));

      if (intent.status === "paid") {
        const existingEvidence = await this.revalidatePaymentEvidence(intent);
        if (!existingEvidence.ok) return copyPaymentResult(createPaymentFailure(existingEvidence.failure_code, existingEvidence.error));
        return copyPaymentResult(this.paymentResultForObservation(existingEvidence.observation));
      }
      if (intent.status !== "verified") {
        return copyPaymentResult(createPaymentFailure("payment_not_observed", "Production proof verification is required before payment observation"));
      }

      const operation = this.beginOperation(intentId, ["verified"]);
      if (!operation) {
        return copyPaymentResult(createPaymentFailure("internal_error", "Unable to start ZKCP payment observation operation"));
      }

      const proofEvidence = await this.revalidateProofEvidence(intent);
      if (!proofEvidence.ok) return copyPaymentResult(createPaymentFailure(proofEvidence.failure_code, proofEvidence.error));
      if (!this.isCurrentOperation(operation)) {
        return copyPaymentResult(createPaymentFailure("internal_error", "ZKCP payment observation became stale before backend dispatch"));
      }

      const observerBackend = this.onChainMonitor.backendIdentity;
      if (!isBackendIdentity(observerBackend)) {
        return copyPaymentResult(createPaymentFailure("payment_mismatch", "Payment observer has no valid configured backend identity"));
      }
      const request = paymentRequestFor(intent);
      let observed: PaymentObservationResult;
      try {
        observed = await this.onChainMonitor.watchForPayment(request);
      } catch (error: unknown) {
        return copyPaymentResult(createPaymentFailure(
          "internal_error",
          error,
        ));
      }
      if (!this.isCurrentOperation(operation)) {
        return copyPaymentResult(createPaymentFailure("internal_error", "ZKCP payment observation became stale after backend dispatch"));
      }
      const result = await normalizePaymentResult(observed, request, observerBackend);
      if (!this.isCurrentOperation(operation)) {
        return copyPaymentResult(createPaymentFailure("internal_error", "ZKCP payment observation became stale before result commit"));
      }
      if (!isProductionPayment(result, observerBackend)) return copyPaymentResult(result);

      const observation = immutableCopy(result.observation);
      const timestamp = this.currentTimestamp();
      if (!timestamp.ok) {
        return copyPaymentResult(createPaymentFailure(timestamp.failure_code, timestamp.error));
      }
      if (!this.commitOperation(operation, (currentIntent) => {
        this.paymentEvidence.set(currentIntent.id, immutableCopy({ request, observation }));
        currentIntent.paymentObservation = observation;
        currentIntent.paymentHash = observation.txid;
        currentIntent.status = "paid";
        currentIntent.updatedAt = timestamp.iso;
        this.emit({
          type: "payment_detected",
          intentId,
          timestamp: currentIntent.updatedAt,
          data: { txid: observation.txid, confirmations: observation.confirmations },
        });
      })) {
        return copyPaymentResult(createPaymentFailure("internal_error", "ZKCP payment observation became stale before state commit"));
      }
      return copyPaymentResult(result);
    });
  }

  private async revalidatePaymentEvidence(intent: ZKCPIntent): Promise<
    | { ok: true; observation: PaymentObservation }
    | { ok: false; failure_code: VerificationFailureCode; error: string }
  > {
    const stored = this.paymentEvidence.get(intent.id);
    if (!stored) return { ok: false, failure_code: "payment_not_observed", error: "Independent production payment observation is required" };

    const request = paymentRequestFor(intent);
    if (canonicalJson(stored.request) !== canonicalJson(request)) {
      return { ok: false, failure_code: "payment_mismatch", error: "Stored payment request is not bound to the current intent" };
    }
    const validation = await validatePaymentObservation(stored.observation, request);
    if (!validation.ok) return validation;

    const observerBackend = this.onChainMonitor.backendIdentity;
    if (!isBackendIdentity(observerBackend)
      || !isProductionPayment({
        contract_version: VERIFIER_CONTRACT_VERSION,
        status: "observed",
        detected: true,
        provenance: validation.observation.provenance,
        observation: validation.observation,
      }, observerBackend)) {
      return { ok: false, failure_code: "payment_mismatch", error: "Stored payment evidence is not authoritative for the configured observer" };
    }

    return { ok: true, observation: immutableCopy(validation.observation) };
  }

  public async finalizeSettlement(intentId: string): Promise<SettlementFinalizationResult> {
    const validation = validateIntentIdentifier(intentId);
    return {
      finalized: false,
      status: "unavailable",
      intentId: validation.id,
      failure_code: "unsupported_backend",
      error: "ZKCP key release is unavailable until an independently authenticated Gateway/Core coordinator is implemented",
    };
  }

  public getIntent(id: string): Readonly<ZKCPIntent> | undefined {
    const validation = validateIntentIdentifier(id);
    if (!validation.ok) return undefined;
    const intent = this.intents.get(validation.id);
    return intent ? immutableCopy(intent) : undefined;
  }

  public listIntentsPage(
    status?: ZKCPStatus,
    limit?: number,
    offset?: number,
  ): ZKCPIntentPage {
    if (status !== undefined && !isZKCPStatus(status)) {
      throw new ZKCPBoundaryError("malformed_request", "Unknown ZKCP status filter");
    }
    const pagination = validateZKCPListPagination(limit, offset);
    if (!pagination.ok) throw new ZKCPBoundaryError(pagination.failure_code, pagination.error);
    this.cleanupExpiredTerminalRecords();
    const ordered = Array.from(this.intents.values())
      .filter((intent) => status === undefined || intent.status === status)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
    const page = ordered.slice(pagination.offset, pagination.offset + pagination.limit);
    const hasMore = pagination.offset + page.length < ordered.length;
    return immutableCopy({
      policy_version: ZKCP_LIST_POLICY.version,
      intents: page,
      count: page.length,
      total: ordered.length,
      limit: pagination.limit,
      offset: pagination.offset,
      has_more: hasMore,
      next_offset: hasMore ? pagination.offset + page.length : undefined,
    }) as ZKCPIntentPage;
  }

  public listIntents(limit = ZKCP_LIST_POLICY.defaultPageSize, offset = 0): ReadonlyArray<Readonly<ZKCPIntent>> {
    return this.listIntentsPage(undefined, limit, offset).intents;
  }

  public listIntentsByStatus(
    status: ZKCPStatus,
    limit = ZKCP_LIST_POLICY.defaultPageSize,
    offset = 0,
  ): ReadonlyArray<Readonly<ZKCPIntent>> {
    return this.listIntentsPage(status, limit, offset).intents;
  }
}

export const zkcpBridge = new ZKCPBridge(
  new UnavailableZKVerifier(),
  new UnavailableOnChainMonitor(),
);
