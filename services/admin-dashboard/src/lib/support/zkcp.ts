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
  parseBoundedJsonPayload,
  VERIFIER_ATTESTATION_LIMITS,
  rejectNonProductionVerification,
  VERIFIER_RESOURCE_LIMITS,
  VERIFIER_ZKCP_KEY_RELEASE_CONTRACT_VERSION,
  VERIFIER_ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION,
  VERIFIER_ZKCP_KEY_RELEASE_POLICY_VERSION,
  VERIFIER_ZKCP_KEY_RELEASE_OBLIGATION_VERSION,
  VERIFIER_ZKCP_KEY_RELEASE_REGISTRY_VERSION,
  VERIFIER_ZKCP_KEY_RELEASE_REGISTRY_NAMESPACE,
  VERIFIER_ZKCP_LIST_POLICY_VERSION,
  VERIFIER_ZKCP_RETENTION_POLICY_VERSION,
  type BackendIdentity,
  type Digest,
  type PaymentNetwork,
  type PaymentObservation,
  type PaymentObservationRequest,
  type PaymentObservationResult,
  type Provenance,
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
export const ZKCP_KEY_RELEASE_CONTRACT_VERSION = VERIFIER_ZKCP_KEY_RELEASE_CONTRACT_VERSION;
export const ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION = VERIFIER_ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION;
export const ZKCP_KEY_RELEASE_POLICY_VERSION = VERIFIER_ZKCP_KEY_RELEASE_POLICY_VERSION;
export const ZKCP_KEY_RELEASE_OBLIGATION_VERSION = VERIFIER_ZKCP_KEY_RELEASE_OBLIGATION_VERSION;
export const ZKCP_KEY_RELEASE_REGISTRY_VERSION = VERIFIER_ZKCP_KEY_RELEASE_REGISTRY_VERSION;
export const ZKCP_KEY_RELEASE_REGISTRY_NAMESPACE = VERIFIER_ZKCP_KEY_RELEASE_REGISTRY_NAMESPACE;

export interface ZKCPKeyReleaseRegistry {
  registry_version: typeof ZKCP_KEY_RELEASE_REGISTRY_VERSION;
  registry_namespace: string;
}

export const ZKCP_KEY_RELEASE_REGISTRY: ZKCPKeyReleaseRegistry = Object.freeze({
  registry_version: ZKCP_KEY_RELEASE_REGISTRY_VERSION,
  registry_namespace: ZKCP_KEY_RELEASE_REGISTRY_NAMESPACE,
});

export type ZKCPStatus = "pending" | "verified" | "paid" | "finalized" | "failed" | "unsupported";
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
  decryptionKey?: string;
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

/**
* Admission metadata for a durable key-release backend. These declarations
* are not a local latch: the backend owns the durable record and MUST make
* every irreversible release for one stable obligation atomic with its
* binding/idempotency record, so retries, replicas, and process restarts
* cannot release the same encrypted payload twice.
*/
export interface DecryptionKeyReleaseCapabilities {
  contract_version: typeof ZKCP_KEY_RELEASE_CONTRACT_VERSION;
  idempotency_version: typeof ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION;
  release_policy_version: typeof ZKCP_KEY_RELEASE_POLICY_VERSION;
  obligation_version: typeof ZKCP_KEY_RELEASE_OBLIGATION_VERSION;
  registry_version: typeof ZKCP_KEY_RELEASE_REGISTRY_VERSION;
  registry_namespace: string;
  /** Legacy compatibility metadata; obligation guarantee is authoritative. */
  release_guarantee?: "exactly_once_per_idempotency_key";
  obligation_guarantee: "exactly_once_per_obligation";
  durable_idempotency: true;
  /** Legacy compatibility metadata; lookup-by-obligation is authoritative. */
  get_by_idempotency_key?: true;
  get_by_obligation_id: true;
  atomic_obligation_claim: true;
  idempotent_release: true;
}

export const ZKCP_KEY_RELEASE_CAPABILITIES: DecryptionKeyReleaseCapabilities = Object.freeze({
  contract_version: ZKCP_KEY_RELEASE_CONTRACT_VERSION,
  idempotency_version: ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION,
  release_policy_version: ZKCP_KEY_RELEASE_POLICY_VERSION,
  obligation_version: ZKCP_KEY_RELEASE_OBLIGATION_VERSION,
  registry_version: ZKCP_KEY_RELEASE_REGISTRY_VERSION,
  registry_namespace: ZKCP_KEY_RELEASE_REGISTRY_NAMESPACE,
  release_guarantee: "exactly_once_per_idempotency_key",
  obligation_guarantee: "exactly_once_per_obligation",
  durable_idempotency: true,
  get_by_idempotency_key: true,
  get_by_obligation_id: true,
  atomic_obligation_claim: true,
  idempotent_release: true,
});

export interface ZKCPKeyReleaseObligation {
  obligation_version: typeof ZKCP_KEY_RELEASE_OBLIGATION_VERSION;
  encrypted_data_digest: Digest;
  seller_address: string;
  buyer_address: string;
}

export interface ZKCPKeyReleasePaymentBinding {
  address: string;
  expected_amount: number;
  amount: number;
  network: PaymentNetwork;
  txid: string;
}

export interface ZKCPKeyReleaseBinding {
  binding_version: typeof ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION;
  release_policy_version: typeof ZKCP_KEY_RELEASE_POLICY_VERSION;
  obligation_id: string;
  intent_id: string;
  amount: number;
  seller_address: string;
  buyer_address: string;
  network: PaymentNetwork;
  encrypted_data_digest: Digest;
  proof_digest: Digest;
  statement_digest: Digest;
  domain_digest: Digest;
  payment: ZKCPKeyReleasePaymentBinding;
  backend: BackendIdentity;
}

export interface DecryptionKeyReleaseRequest {
  contract_version: typeof ZKCP_KEY_RELEASE_CONTRACT_VERSION;
  registry: ZKCPKeyReleaseRegistry;
  obligation_id: string;
  binding_digest: Digest;
  idempotency_key: string;
  binding: ZKCPKeyReleaseBinding;
  intent: Readonly<ZKCPIntent>;
  payment: Readonly<PaymentObservation>;
}

export interface DecryptionKeyReleaseEvidence {
  contract_version: typeof ZKCP_KEY_RELEASE_CONTRACT_VERSION;
  registry_version: typeof ZKCP_KEY_RELEASE_REGISTRY_VERSION;
  registry_namespace: string;
  obligation_id: string;
  binding_digest: Digest;
  idempotency_key: string;
  backend_id: string;
  backend_version: string;
  backend_artifact_digest: Digest;
  backend_authority: BackendIdentity["authority"];
}

export type DecryptionKeyReleaseLookupStatus = "found" | "absent" | "conflict" | "unavailable" | "rejected";

export interface DecryptionKeyReleaseLookupRequest {
  contract_version: typeof ZKCP_KEY_RELEASE_CONTRACT_VERSION;
  registry: ZKCPKeyReleaseRegistry;
  obligation_id: string;
  binding_digest: Digest;
  idempotency_key: string;
  binding: ZKCPKeyReleaseBinding;
  backend: BackendIdentity;
}

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

export interface DecryptionKeyReleaseResult {
  status: "released" | "unavailable" | "rejected";
  backend: BackendIdentity;
  provenance: Provenance;
  decryptionKey?: string;
  /** Canonical bounded JSON text; adapter-owned objects are not accepted. */
  evidence?: string;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface DecryptionKeyReleaseLookupResult {
  status: DecryptionKeyReleaseLookupStatus;
  registry: ZKCPKeyReleaseRegistry;
  obligation_id: string;
  binding_digest?: Digest;
  idempotency_key?: string;
  backend: BackendIdentity;
  provenance: Provenance;
  release?: DecryptionKeyReleaseResult;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface DecryptionKeyReleaser {
  readonly backendIdentity: BackendIdentity;
  readonly capabilities?: DecryptionKeyReleaseCapabilities;
  /**
   * Returns the durable obligation record before any release is dispatched.
   * The registry MUST return `conflict` when the obligation is already bound
   * to a different binding digest or idempotency key.
   */
  getByObligationId(request: Readonly<DecryptionKeyReleaseLookupRequest>): Promise<DecryptionKeyReleaseLookupResult>;
  /** Legacy lookup is retained for adapter migration but is not authoritative. */
  getByIdempotencyKey?(request: Readonly<DecryptionKeyReleaseLookupRequest>): Promise<DecryptionKeyReleaseLookupResult>;
  /**
   * The external backend MUST atomically claim the obligation, persist its
   * binding/idempotency key, and perform at most one irreversible release.
   * A retry with the same obligation/binding/key is idempotent; a different
   * binding for an existing obligation is a typed conflict.
   */
  release(request: Readonly<DecryptionKeyReleaseRequest>): Promise<DecryptionKeyReleaseResult>;
}

export class UnavailableDecryptionKeyReleaser implements DecryptionKeyReleaser {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;
  public readonly capabilities = undefined;

  public async getByIdempotencyKey(request: Readonly<DecryptionKeyReleaseLookupRequest>): Promise<DecryptionKeyReleaseLookupResult> {
    return {
      status: "unavailable",
      registry: request.registry,
      obligation_id: request.obligation_id,
      backend: UNAVAILABLE_BACKEND,
      provenance: "unknown",
      failure_code: "decryption_key_unavailable",
      error: "Decryption-key release backend is not configured",
    };
  }

  public async getByObligationId(request: Readonly<DecryptionKeyReleaseLookupRequest>): Promise<DecryptionKeyReleaseLookupResult> {
    return {
      status: "unavailable",
      registry: request.registry,
      obligation_id: request.obligation_id,
      backend: UNAVAILABLE_BACKEND,
      provenance: "unknown",
      failure_code: "decryption_key_unavailable",
      error: "Decryption-key release backend is not configured",
    };
  }

  public async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<DecryptionKeyReleaseResult> {
    return {
      status: "unavailable",
      backend: UNAVAILABLE_BACKEND,
      provenance: "unknown",
      failure_code: "decryption_key_unavailable",
      error: "Decryption-key release backend is not configured",
    };
  }
}

export interface SettlementFinalizationResult {
  finalized: boolean;
  status: "finalized" | "rejected" | "unavailable";
  intentId: string;
  paymentHash?: string;
  decryptionKey?: string;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export type ZKCPEventHandler = (event: ZKCPEvent) => void;

export interface ZKCPEvent {
  type: "intent_created" | "proof_verified" | "payment_detected" | "settlement_finalized" | "intent_failed";
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

interface StoredKeyReleaseEvidence {
  result: DecryptionKeyReleaseResult;
  released_at: string;
  idempotency_key: string;
  binding: ZKCPKeyReleaseBinding;
}

export interface ZKCPBridgeOptions {
  now?: () => number;
  maxActiveIntents?: number;
  maxTotalIntents?: number;
  terminalRetentionMs?: number;
  keyReleaseRegistry?: ZKCPKeyReleaseRegistry;
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
    || value === "finalized"
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

function isBoundedIdempotencyKey(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= VERIFIER_RESOURCE_LIMITS.maxIdempotencyKeyChars
    && /^zkcp-release-v1:[0-9a-f]{64}$/.test(value);
}

function isBoundedObligationId(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= VERIFIER_RESOURCE_LIMITS.maxIdempotencyKeyChars
    && /^zkcp-obligation-v1:[0-9a-f]{64}$/.test(value);
}

function isKeyReleaseRegistry(value: unknown): value is ZKCPKeyReleaseRegistry {
  return isRecord(value)
    && value.registry_version === ZKCP_KEY_RELEASE_REGISTRY_VERSION
    && isBoundedNonEmptyString(value.registry_namespace, VERIFIER_RESOURCE_LIMITS.maxRegistryNamespaceChars);
}

function keyReleaseRegistryEquals(
  left: ZKCPKeyReleaseRegistry,
  right: ZKCPKeyReleaseRegistry,
): boolean {
  return left.registry_version === right.registry_version
    && left.registry_namespace === right.registry_namespace;
}

function isCanonicalKeyReleaseRegistry(value: ZKCPKeyReleaseRegistry): boolean {
  return keyReleaseRegistryEquals(value, ZKCP_KEY_RELEASE_REGISTRY);
}

function isDurableKeyReleaseCapabilities(
  value: unknown,
  expectedRegistry: ZKCPKeyReleaseRegistry,
): value is DecryptionKeyReleaseCapabilities {
  return isRecord(value)
    && value.contract_version === ZKCP_KEY_RELEASE_CONTRACT_VERSION
    && value.idempotency_version === ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION
    && value.release_policy_version === ZKCP_KEY_RELEASE_POLICY_VERSION
    && value.obligation_version === ZKCP_KEY_RELEASE_OBLIGATION_VERSION
    && value.registry_version === ZKCP_KEY_RELEASE_REGISTRY_VERSION
    && value.registry_namespace === expectedRegistry.registry_namespace
    && value.obligation_guarantee === "exactly_once_per_obligation"
    && value.durable_idempotency === true
    && value.get_by_obligation_id === true
    && value.atomic_obligation_claim === true
    && value.idempotent_release === true;
}

function isKeyReleasePaymentBinding(value: unknown): value is ZKCPKeyReleasePaymentBinding {
  return isRecord(value)
    && isBoundedNonEmptyString(value.address, VERIFIER_RESOURCE_LIMITS.maxAddressChars)
    && typeof value.expected_amount === "number"
    && Number.isSafeInteger(value.expected_amount)
    && value.expected_amount > 0
    && typeof value.amount === "number"
    && Number.isSafeInteger(value.amount)
    && value.amount > 0
    && value.amount === value.expected_amount
    && isPaymentNetwork(value.network)
    && isBoundedNonEmptyString(value.txid, VERIFIER_RESOURCE_LIMITS.maxTxidChars);
}

function isKeyReleaseBinding(value: unknown, authority?: BackendIdentity): value is ZKCPKeyReleaseBinding {
  return isRecord(value)
    && value.binding_version === ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION
    && value.release_policy_version === ZKCP_KEY_RELEASE_POLICY_VERSION
    && isBoundedObligationId(value.obligation_id)
    && isBoundedNonEmptyString(value.intent_id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
    && typeof value.amount === "number"
    && Number.isSafeInteger(value.amount)
    && value.amount > 0
    && isBoundedNonEmptyString(value.seller_address, VERIFIER_RESOURCE_LIMITS.maxAddressChars)
    && isBoundedNonEmptyString(value.buyer_address, VERIFIER_RESOURCE_LIMITS.maxAddressChars)
    && isPaymentNetwork(value.network)
    && isDigest(value.encrypted_data_digest)
    && isDigest(value.proof_digest)
    && isDigest(value.statement_digest)
    && isDigest(value.domain_digest)
    && isKeyReleasePaymentBinding(value.payment)
    && isAuthoritativeBackendIdentity(value.backend)
    && (authority === undefined || backendIdentityEquals(value.backend, authority));
}

export async function deriveZKCPKeyReleaseObligationId(
  intent: Pick<ZKCPIntentInput, "encryptedDataHash" | "sellerAddress" | "buyerAddress">,
): Promise<string> {
  if (!isDigest(intent.encryptedDataHash)
    || !isBoundedNonEmptyString(intent.sellerAddress, VERIFIER_RESOURCE_LIMITS.maxAddressChars)
    || !isBoundedNonEmptyString(intent.buyerAddress, VERIFIER_RESOURCE_LIMITS.maxAddressChars)) {
    throw new Error("ZKCP key-release obligation identity is malformed");
  }
  const obligation: ZKCPKeyReleaseObligation = {
    obligation_version: ZKCP_KEY_RELEASE_OBLIGATION_VERSION,
    encrypted_data_digest: intent.encryptedDataHash,
    seller_address: intent.sellerAddress,
    buyer_address: intent.buyerAddress,
  };
  const digest = await digestCanonical({
    contract_version: ZKCP_KEY_RELEASE_CONTRACT_VERSION,
    purpose: "zkcp-key-release-obligation",
    obligation,
  });
  const id = `zkcp-obligation-v1:${digestHex(digest)}`;
  if (!isBoundedObligationId(id)) {
    throw new Error("ZKCP key-release obligation identity exceeds the v1 resource limit");
  }
  return id;
}

export async function deriveZKCPKeyReleaseBindingDigest(
  binding: ZKCPKeyReleaseBinding,
): Promise<Digest> {
  if (!isKeyReleaseBinding(binding)) {
    throw new Error("ZKCP key-release binding is malformed");
  }
  return digestCanonical({
    contract_version: ZKCP_KEY_RELEASE_CONTRACT_VERSION,
    purpose: "zkcp-key-release-binding",
    binding,
  });
}

export async function deriveZKCPKeyReleaseIdempotencyKey(
  binding: ZKCPKeyReleaseBinding,
): Promise<string> {
  if (!isKeyReleaseBinding(binding)) {
    throw new Error("ZKCP key-release binding is malformed");
  }
  const digest = await digestCanonical({
    contract_version: ZKCP_KEY_RELEASE_CONTRACT_VERSION,
    idempotency_version: ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION,
    purpose: "zkcp-key-release-idempotency",
    binding,
  });
  const key = `zkcp-release-v1:${digestHex(digest)}`;
  if (!isBoundedIdempotencyKey(key)) {
    throw new Error("ZKCP key-release idempotency key exceeds the v1 resource limit");
  }
  return key;
}

function keyReleaseBindingMatchesRequest(
  binding: ZKCPKeyReleaseBinding,
  obligationId: string,
  intent: Readonly<ZKCPIntent>,
  payment: Readonly<PaymentObservation>,
  statementDigest: Digest,
  domainDigest: Digest,
  authority: BackendIdentity,
): boolean {
  return isKeyReleaseBinding(binding, authority)
    && binding.obligation_id === obligationId
    && binding.intent_id === intent.id
    && binding.amount === intent.amount
    && binding.seller_address === intent.sellerAddress
    && binding.buyer_address === intent.buyerAddress
    && binding.network === intent.network
    && binding.encrypted_data_digest === intent.encryptedDataHash
    && binding.proof_digest === intent.proofHash
    && binding.statement_digest === statementDigest
    && binding.domain_digest === domainDigest
    && binding.payment.address === payment.address
    && binding.payment.expected_amount === payment.expected_amount
    && binding.payment.amount === payment.amount
    && binding.payment.network === payment.network
    && binding.payment.txid === payment.txid;
}

interface KeyReleaseEvidenceValidationSuccess {
  ok: true;
  evidence: DecryptionKeyReleaseEvidence;
}

interface KeyReleaseEvidenceValidationFailure {
  ok: false;
  failure_code: VerificationFailureCode;
  error: string;
}

type KeyReleaseEvidenceValidation =
  | KeyReleaseEvidenceValidationSuccess
  | KeyReleaseEvidenceValidationFailure;

const KEY_RELEASE_EVIDENCE_KEYS = [
  "backend_artifact_digest",
  "backend_authority",
  "backend_id",
  "backend_version",
  "binding_digest",
  "contract_version",
  "idempotency_key",
  "obligation_id",
  "registry_namespace",
  "registry_version",
] as const;

function parseKeyReleaseEvidence(value: unknown):
  | { ok: true; evidence: DecryptionKeyReleaseEvidence }
  | { ok: false; failure_code: VerificationFailureCode; error: string } {
  const parsed = parseBoundedJsonPayload(value);
  if (!parsed.ok) return parsed;
  if (!isRecord(parsed.snapshot) || Object.getPrototypeOf(parsed.snapshot) !== null) {
    return { ok: false, failure_code: "key_release_evidence_mismatch", error: "Key-release evidence must be a flat JSON object" };
  }

  const keys = Object.keys(parsed.snapshot).sort();
  if (keys.length !== KEY_RELEASE_EVIDENCE_KEYS.length
    || keys.some((key, index) => key !== KEY_RELEASE_EVIDENCE_KEYS[index])) {
    return { ok: false, failure_code: "key_release_evidence_mismatch", error: "Key-release evidence contains an unknown or missing field" };
  }

  const candidate = parsed.snapshot;
  const evidence: DecryptionKeyReleaseEvidence = {
    contract_version: candidate.contract_version as DecryptionKeyReleaseEvidence["contract_version"],
    registry_version: candidate.registry_version as DecryptionKeyReleaseEvidence["registry_version"],
    registry_namespace: candidate.registry_namespace as string,
    obligation_id: candidate.obligation_id as string,
    binding_digest: candidate.binding_digest as Digest,
    idempotency_key: candidate.idempotency_key as string,
    backend_id: candidate.backend_id as string,
    backend_version: candidate.backend_version as string,
    backend_artifact_digest: candidate.backend_artifact_digest as Digest,
    backend_authority: candidate.backend_authority as BackendIdentity["authority"],
  };

  if (evidence.contract_version !== ZKCP_KEY_RELEASE_CONTRACT_VERSION
    || evidence.registry_version !== ZKCP_KEY_RELEASE_REGISTRY_VERSION
    || !isBoundedNonEmptyString(evidence.registry_namespace, VERIFIER_RESOURCE_LIMITS.maxRegistryNamespaceChars)
    || !isBoundedObligationId(evidence.obligation_id)
    || !isDigest(evidence.binding_digest)
    || !isBoundedIdempotencyKey(evidence.idempotency_key)
    || !isBoundedNonEmptyString(evidence.backend_id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
    || !isBoundedNonEmptyString(evidence.backend_version, VERIFIER_RESOURCE_LIMITS.maxVersionChars)
    || !isDigest(evidence.backend_artifact_digest)
    || (evidence.backend_authority !== "authoritative" && evidence.backend_authority !== "non_authoritative")) {
    return { ok: false, failure_code: "key_release_evidence_mismatch", error: "Key-release evidence contains invalid primitive fields" };
  }

  if (canonicalJson(evidence) !== parsed.canonical) {
    return { ok: false, failure_code: "key_release_evidence_mismatch", error: "Key-release evidence is not canonically serialized" };
  }
  return { ok: true, evidence: Object.freeze(evidence) };
}

function validateKeyReleaseEvidence(
  value: unknown,
  request: Readonly<DecryptionKeyReleaseRequest>,
  authority: BackendIdentity,
): KeyReleaseEvidenceValidation {
  const parsed = parseKeyReleaseEvidence(value);
  if (!parsed.ok) return parsed;
  const evidence = parsed.evidence;
  if (evidence.registry_version !== request.registry.registry_version
    || evidence.registry_namespace !== request.registry.registry_namespace) {
    return { ok: false, failure_code: "key_release_registry_mismatch", error: "Key-release evidence uses a different durable registry" };
  }
  if (evidence.obligation_id !== request.obligation_id) {
    return { ok: false, failure_code: "key_release_obligation_conflict", error: "Key-release evidence belongs to a different release obligation" };
  }
  if (evidence.binding_digest !== request.binding_digest) {
    return { ok: false, failure_code: "key_release_obligation_conflict", error: "Key-release evidence is bound to different settlement terms for this obligation" };
  }
  if (evidence.idempotency_key !== request.idempotency_key) {
    return { ok: false, failure_code: "key_release_idempotency_mismatch", error: "Key-release evidence uses a different idempotency key" };
  }
  if (evidence.backend_id !== authority.id
    || evidence.backend_version !== authority.version
    || evidence.backend_artifact_digest !== authority.artifact_digest
    || evidence.backend_authority !== authority.authority) {
    return { ok: false, failure_code: "key_release_backend_mismatch", error: "Key-release evidence is not bound to the configured backend artifact" };
  }
  if (!keyReleaseBindingMatchesRequest(
    request.binding,
    request.obligation_id,
    request.intent,
    request.payment,
    request.binding.statement_digest,
    request.binding.domain_digest,
    authority,
  ) || !isKeyReleaseRegistry(request.registry)) {
    return { ok: false, failure_code: "key_release_evidence_mismatch", error: "Key-release evidence is not bound to the immutable settlement request" };
  }
  return { ok: true, evidence };
}

function isProductionKeyRelease(
  result: DecryptionKeyReleaseResult,
  authority: BackendIdentity,
  request: Readonly<DecryptionKeyReleaseRequest>,
): KeyReleaseEvidenceValidation {
  if (result.status !== "released"
    || result.provenance !== "production"
    || result.failure_code !== undefined
    || !isNonEmptyString(result.decryptionKey)
    || !isAuthoritativeBackendIdentity(result.backend)
    || !isAuthoritativeBackendIdentity(authority)
    || !backendIdentityEquals(result.backend, authority)) {
    return { ok: false, failure_code: "key_release_evidence_mismatch", error: "Production key-release evidence is not authoritative" };
  }
  return validateKeyReleaseEvidence(result.evidence, request, authority);
}

function isKeyReleaseResult(value: unknown): value is DecryptionKeyReleaseResult {
  return isRecord(value)
    && (value.status === "released" || value.status === "unavailable" || value.status === "rejected")
    && isBackendIdentity(value.backend)
    && isProvenance(value.provenance)
    && (value.failure_code === undefined || isVerificationFailureCode(value.failure_code))
    && (value.decryptionKey === undefined
      || typeof value.decryptionKey === "string")
    && (value.evidence === undefined || typeof value.evidence === "string")
    && (value.error === undefined
      || typeof value.error === "string");
}

type KeyReleaseBoundaryValidation =
  | { ok: true; result: DecryptionKeyReleaseResult }
  | { ok: false; failure_code: VerificationFailureCode; error: string };

function normalizeKeyReleaseResult(value: unknown): KeyReleaseBoundaryValidation {
  try {
    if (!isKeyReleaseResult(value)) {
      return { ok: false, failure_code: "internal_error", error: "Key-release backend returned malformed evidence" };
    }
    if ((typeof value.error === "string" && value.error.length > VERIFIER_RESOURCE_LIMITS.maxErrorChars)
      || (typeof value.decryptionKey === "string"
        && value.decryptionKey.length > VERIFIER_RESOURCE_LIMITS.maxDecryptionKeyChars)) {
      const normalized = normalizeBoundaryError(value.error, "Key-release evidence exceeds the v1 resource limit");
      return { ok: false, failure_code: "resource_limit_exceeded", error: normalized.message };
    }
    if (typeof value.evidence === "string") {
      if (value.evidence.length > VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedChars) {
        return {
          ok: false,
          failure_code: "resource_limit_exceeded",
          error: "Key-release evidence exceeds the v1 encoded-character limit",
        };
      }
      let evidenceBytes: number;
      try {
        evidenceBytes = new TextEncoder().encode(value.evidence).byteLength;
      } catch {
        return {
          ok: false,
          failure_code: "malformed_request",
          error: "Key-release evidence could not be encoded",
        };
      }
      if (evidenceBytes > VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedBytes) {
        return {
          ok: false,
          failure_code: "resource_limit_exceeded",
          error: "Key-release evidence exceeds the v1 encoded-byte limit",
        };
      }
    }
    return {
      ok: true,
      result: {
        status: value.status,
        backend: { ...value.backend },
        provenance: value.provenance,
        decryptionKey: value.decryptionKey,
        evidence: value.evidence,
        failure_code: value.failure_code,
        error: value.error,
      },
    };
  } catch (error: unknown) {
    const normalized = normalizeBoundaryError(error, "Key-release evidence validation failed");
    return {
      ok: false,
      failure_code: normalized.truncated ? "resource_limit_exceeded" : "internal_error",
      error: normalized.message,
    };
  }
}

function normalizeKeyReleaseLookupResult(value: unknown):
  | { ok: true; result: DecryptionKeyReleaseLookupResult }
  | { ok: false; failure_code: VerificationFailureCode; error: string } {
  try {
    if (!isRecord(value)
      || (value.status !== "found"
        && value.status !== "absent"
        && value.status !== "conflict"
        && value.status !== "unavailable"
        && value.status !== "rejected")
      || !isKeyReleaseRegistry(value.registry)
      || !isBoundedObligationId(value.obligation_id)
      || (value.binding_digest !== undefined && !isDigest(value.binding_digest))
      || (value.idempotency_key !== undefined && !isBoundedIdempotencyKey(value.idempotency_key))
      || !isBackendIdentity(value.backend)
      || !isProvenance(value.provenance)
      || (value.failure_code !== undefined && !isVerificationFailureCode(value.failure_code))
      || (value.error !== undefined && typeof value.error !== "string")) {
      return { ok: false, failure_code: "key_release_lookup_failed", error: "Key-release durable lookup returned malformed evidence" };
    }
    if (typeof value.error === "string" && value.error.length > VERIFIER_RESOURCE_LIMITS.maxErrorChars) {
      const normalized = normalizeBoundaryError(value.error, "Key-release durable lookup error exceeds the v1 resource limit");
      return { ok: false, failure_code: "resource_limit_exceeded", error: normalized.message };
    }
    if (value.status === "found") {
      if (value.failure_code !== undefined || value.error !== undefined) {
        return { ok: false, failure_code: "key_release_lookup_failed", error: "A found durable lookup cannot carry failure evidence" };
      }
      if (value.binding_digest === undefined || value.idempotency_key === undefined) {
        return { ok: false, failure_code: "key_release_lookup_failed", error: "A found durable lookup must identify its canonical obligation binding" };
      }
      const release = normalizeKeyReleaseResult(value.release);
      if (!release.ok) return release;
      return {
        ok: true,
        result: {
          status: "found",
          registry: { ...value.registry },
          obligation_id: value.obligation_id,
          binding_digest: value.binding_digest,
          idempotency_key: value.idempotency_key,
          backend: { ...value.backend },
          provenance: value.provenance,
          release: release.result,
        },
      };
    }
    if (value.release !== undefined) {
      return { ok: false, failure_code: "key_release_lookup_failed", error: "An absent, conflicting, or failed durable lookup cannot carry release evidence" };
    }
    if (value.status === "absent" && (value.failure_code !== undefined || value.error !== undefined)) {
      return { ok: false, failure_code: "key_release_lookup_failed", error: "A durable lookup is absent only when it carries no failure evidence" };
    }
    if (value.status === "conflict") {
      if (value.binding_digest === undefined || value.idempotency_key === undefined) {
        return {
          ok: false,
          failure_code: "key_release_lookup_failed",
          error: "A conflicting durable lookup must identify the canonical obligation binding",
        };
      }
      return {
        ok: true,
        result: {
          status: "conflict",
          registry: { ...value.registry },
          obligation_id: value.obligation_id,
          binding_digest: value.binding_digest,
          idempotency_key: value.idempotency_key,
          backend: { ...value.backend },
          provenance: value.provenance,
          failure_code: "key_release_obligation_conflict",
          error: value.error ?? "Durable registry obligation is already bound to different release terms",
        },
      };
    }
    return {
      ok: true,
      result: {
        status: value.status,
        registry: { ...value.registry },
        obligation_id: value.obligation_id,
        binding_digest: value.binding_digest,
        idempotency_key: value.idempotency_key,
        backend: { ...value.backend },
        provenance: value.provenance,
        failure_code: value.failure_code,
        error: value.error,
      },
    };
  } catch (error: unknown) {
    const normalized = normalizeBoundaryError(error, "Key-release durable lookup validation failed");
    return {
      ok: false,
      failure_code: normalized.truncated ? "resource_limit_exceeded" : "key_release_lookup_failed",
      error: normalized.message,
    };
  }
}

async function buildKeyReleaseRequest(
  intent: Readonly<ZKCPIntent>,
  payment: Readonly<PaymentObservation>,
  proofRequest: Readonly<VerifierRequest>,
  authority: BackendIdentity,
  registry: ZKCPKeyReleaseRegistry,
): Promise<Readonly<DecryptionKeyReleaseRequest>> {
  const obligation_id = await deriveZKCPKeyReleaseObligationId({
    encryptedDataHash: intent.encryptedDataHash,
    sellerAddress: intent.sellerAddress,
    buyerAddress: intent.buyerAddress,
  });
  const binding: ZKCPKeyReleaseBinding = immutableCopy({
    binding_version: ZKCP_KEY_RELEASE_IDEMPOTENCY_VERSION,
    release_policy_version: ZKCP_KEY_RELEASE_POLICY_VERSION,
    obligation_id,
    intent_id: intent.id,
    amount: intent.amount,
    seller_address: intent.sellerAddress,
    buyer_address: intent.buyerAddress,
    network: intent.network,
    encrypted_data_digest: intent.encryptedDataHash,
    proof_digest: intent.proofHash,
    statement_digest: proofRequest.statement_digest,
    domain_digest: proofRequest.domain_digest,
    payment: {
      address: payment.address,
      expected_amount: payment.expected_amount,
      amount: payment.amount,
      network: payment.network,
      txid: payment.txid,
    },
    backend: { ...authority },
  });

  if (!keyReleaseBindingMatchesRequest(
    binding,
    obligation_id,
    intent,
    payment,
    proofRequest.statement_digest,
    proofRequest.domain_digest,
    authority,
  )) {
    throw new Error("ZKCP key-release binding is not aligned with retained settlement evidence");
  }

  const binding_digest = await deriveZKCPKeyReleaseBindingDigest(binding);
  const idempotency_key = await deriveZKCPKeyReleaseIdempotencyKey(binding);
  return immutableCopy({
    contract_version: ZKCP_KEY_RELEASE_CONTRACT_VERSION,
    registry,
    obligation_id,
    binding_digest,
    idempotency_key,
    binding,
    intent,
    payment,
  });
}

export class ZKCPBridge {
  private readonly intents = new Map<string, ZKCPIntent>();
  private readonly verificationEvidence = new Map<string, StoredVerificationEvidence>();
  private readonly paymentEvidence = new Map<string, StoredPaymentEvidence>();
  private readonly keyReleaseEvidence = new Map<string, StoredKeyReleaseEvidence>();
  private readonly keyReleaseAttempts = new Set<string>();
  private readonly finalizationLocks = new Set<string>();
  private readonly lifecycleQueues = new Map<string, Promise<void>>();
  private readonly lifecycleGenerations = new Map<string, number>();
  private readonly eventHandlers: ZKCPEventHandler[] = [];
  private readonly now: () => number;
  private readonly maxActiveIntents: number;
  private readonly maxTotalIntents: number;
  private readonly terminalRetentionMs: number;
  private readonly keyReleaseRegistry: ZKCPKeyReleaseRegistry;
  private lastObservedTimeMs: number | undefined;

  public constructor(
    private readonly verifier: ZKProofVerifier,
    private readonly onChainMonitor: OnChainMonitor,
    private readonly keyReleaser: DecryptionKeyReleaser,
    options: ZKCPBridgeOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    const configuredRegistry = options.keyReleaseRegistry ?? ZKCP_KEY_RELEASE_REGISTRY;
    if (!isKeyReleaseRegistry(configuredRegistry) || !isCanonicalKeyReleaseRegistry(configuredRegistry)) {
      throw new ZKCPBoundaryError(
        "malformed_request",
        "ZKCP key-release registry metadata must match the canonical v1 registry",
      );
    }
    this.keyReleaseRegistry = Object.freeze({ ...configuredRegistry });
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
    return intent.status === "pending" || intent.status === "verified" || intent.status === "paid";
  }

  private deleteIntentEvidence(intentId: string): void {
    this.verificationEvidence.delete(intentId);
    this.paymentEvidence.delete(intentId);
    this.keyReleaseEvidence.delete(intentId);
    this.keyReleaseAttempts.delete(intentId);
  }

  private cleanupExpiredTerminalRecords(): number {
    const timestamp = this.currentTimestamp();
    if (!timestamp.ok) return 0;
    const cutoff = timestamp.milliseconds - this.terminalRetentionMs;
    let removed = 0;
    for (const [intentId, intent] of this.intents) {
      if (this.isActiveIntent(intent)
        || this.finalizationLocks.has(intentId)
        || this.lifecycleQueues.has(intentId)) continue;
      const updatedAt = Date.parse(intent.updatedAt);
      if (!Number.isFinite(updatedAt) || updatedAt > cutoff) continue;
      this.intents.delete(intentId);
      this.deleteIntentEvidence(intentId);
      this.lifecycleGenerations.delete(intentId);
      this.finalizationLocks.delete(intentId);
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

      if (intent.status === "paid" || intent.status === "finalized") {
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
    const intentValidation = validateIntentIdentifier(intentId);
    if (!intentValidation.ok) {
      return {
        finalized: false,
        status: "rejected",
        intentId: intentValidation.id,
        failure_code: intentValidation.failure_code,
        error: intentValidation.error,
      };
    }
    const safeIntentId = intentValidation.id;
    const initialIntent = this.intents.get(safeIntentId);
    if (!initialIntent) {
      return {
        finalized: false,
        status: "rejected",
        intentId: safeIntentId,
        failure_code: "payment_not_observed",
        error: "Intent not found",
      };
    }

    if (initialIntent.status === "finalized") {
      return {
        finalized: true,
        status: "finalized",
        intentId: safeIntentId,
        paymentHash: initialIntent.paymentHash,
        decryptionKey: initialIntent.decryptionKey,
      };
    }

    if (this.finalizationLocks.has(safeIntentId)) {
      return {
        finalized: false,
        status: "rejected",
        intentId: safeIntentId,
        paymentHash: initialIntent.paymentHash,
        failure_code: "internal_error",
        error: "Settlement finalization is already in progress",
      };
    }

    this.finalizationLocks.add(safeIntentId);
    try {
      return await this.withIntentLock(safeIntentId, async () => {
        const intent = this.intents.get(safeIntentId);
        if (!intent) {
          return {
            finalized: false,
            status: "rejected",
            intentId: safeIntentId,
            failure_code: "payment_not_observed",
            error: "Intent not found",
          };
        }
        if (intent.status === "finalized") {
          return {
            finalized: true,
            status: "finalized",
            intentId: safeIntentId,
            paymentHash: intent.paymentHash,
            decryptionKey: intent.decryptionKey,
          };
        }
        const operation = this.beginOperation(safeIntentId, ["pending", "verified", "paid", "failed", "unsupported"]);
        if (!operation) {
          return {
            finalized: false,
            status: "rejected",
            intentId: safeIntentId,
            failure_code: "internal_error",
            error: "Unable to start ZKCP finalization operation",
          };
        }
        return this.finalizeSettlementInternal(safeIntentId, intent, operation);
      });
    } finally {
      this.finalizationLocks.delete(safeIntentId);
    }
  }

  private async finalizeSettlementInternal(
    intentId: string,
    intent: ZKCPIntent,
    operation: IntentOperation,
  ): Promise<SettlementFinalizationResult> {
    const proofEvidence = await this.revalidateProofEvidence(intent);
    if (!proofEvidence.ok) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        failure_code: proofEvidence.failure_code,
        error: proofEvidence.error,
      };
    }
    if (!this.isCurrentOperation(operation)) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        failure_code: "internal_error",
        error: "ZKCP finalization became stale after proof revalidation",
      };
    }

    const paymentEvidence = await this.revalidatePaymentEvidence(intent);
    if (!paymentEvidence.ok) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: intent.paymentHash,
        failure_code: paymentEvidence.failure_code,
        error: paymentEvidence.error,
      };
    }
    if (!this.isCurrentOperation(operation, ["paid"])) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: intent.paymentHash,
        failure_code: "internal_error",
        error: "ZKCP finalization requires an unchanged paid lifecycle state",
      };
    }

    const releaseBackend = this.keyReleaser.backendIdentity;
    if (!isBackendIdentity(releaseBackend) || isUnavailableBackend(releaseBackend)) {
      return {
        finalized: false,
        status: "unavailable",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "decryption_key_unavailable",
        error: "Decryption-key release backend is not configured",
      };
    }

    const capabilities = this.keyReleaser.capabilities;
    if (!isRecord(capabilities)) {
      return {
        finalized: false,
        status: "unavailable",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_capability_missing",
        error: "Key-release backend must provide the versioned durable obligation and lookup contract",
      };
    }
    if (!isKeyReleaseRegistry({
      registry_version: capabilities.registry_version,
      registry_namespace: capabilities.registry_namespace,
    }) || capabilities.registry_namespace !== this.keyReleaseRegistry.registry_namespace) {
      return {
        finalized: false,
        status: "unavailable",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_registry_mismatch",
        error: "Key-release backend is not bound to the pinned durable obligation registry",
      };
    }
    if (!isDurableKeyReleaseCapabilities(capabilities, this.keyReleaseRegistry)
      || typeof this.keyReleaser.getByObligationId !== "function"
      || typeof this.keyReleaser.release !== "function") {
      return {
        finalized: false,
        status: "unavailable",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_capability_missing",
        error: "Key-release backend must provide the versioned durable obligation and lookup contract",
      };
    }

    const releaseTimestamp = this.currentTimestamp();
    if (!releaseTimestamp.ok) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: releaseTimestamp.failure_code,
        error: releaseTimestamp.error,
      };
    }

    let releaseRequest: Readonly<DecryptionKeyReleaseRequest>;
    try {
      const releaseIntentSnapshot = immutableCopy(intent);
      const releasePaymentSnapshot = immutableCopy(paymentEvidence.observation);
      releaseRequest = await buildKeyReleaseRequest(
        releaseIntentSnapshot,
        releasePaymentSnapshot,
        proofEvidence.evidence.request,
        releaseBackend,
        this.keyReleaseRegistry,
      );
    } catch (error: unknown) {
      const normalized = normalizeBoundaryError(error, "Unable to prepare bounded key-release input");
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: normalized.truncated ? "resource_limit_exceeded" : "internal_error",
        error: normalized.message,
      };
    }

    const releaseCommitContext = Object.freeze({
      released_at: releaseTimestamp.iso,
      payment_hash: paymentEvidence.observation.txid,
    });

    // This local marker is diagnostic/cache state only. Durable obligation
    // lookup and atomic claim keyed by the stable obligation remain
    // authoritative across retries, replicas, and process restarts.
    this.keyReleaseAttempts.add(intentId);

    let rawLookup: unknown;
    try {
      rawLookup = await this.keyReleaser.getByObligationId({
        contract_version: releaseRequest.contract_version,
        registry: releaseRequest.registry,
        obligation_id: releaseRequest.obligation_id,
        binding_digest: releaseRequest.binding_digest,
        idempotency_key: releaseRequest.idempotency_key,
        binding: releaseRequest.binding,
        backend: releaseBackend,
      });
    } catch (error: unknown) {
      const normalized = normalizeBoundaryError(error, "Key-release backend failed");
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: normalized.truncated ? "resource_limit_exceeded" : "key_release_lookup_failed",
        error: normalized.message,
      };
    }

    if (!this.isCurrentOperation(operation, ["paid"])) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "internal_error",
        error: "ZKCP finalization became stale after durable key-release lookup",
      };
    }

    const lookupValidation = normalizeKeyReleaseLookupResult(rawLookup);
    if (!lookupValidation.ok) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: lookupValidation.failure_code,
        error: lookupValidation.error,
      };
    }

    const lookup = lookupValidation.result;
    if (!keyReleaseRegistryEquals(lookup.registry, this.keyReleaseRegistry)) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_registry_mismatch",
        error: "Durable key-release lookup returned a different obligation registry",
      };
    }
    if (lookup.obligation_id !== releaseRequest.obligation_id) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_obligation_conflict",
        error: "Durable key-release lookup returned a different release obligation",
      };
    }
    if (lookup.binding_digest !== undefined && lookup.binding_digest !== releaseRequest.binding_digest) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_obligation_conflict",
        error: "Durable registry obligation is already bound to different settlement terms",
      };
    }
    if (lookup.idempotency_key !== undefined && lookup.idempotency_key !== releaseRequest.idempotency_key) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_obligation_conflict",
        error: "Durable registry obligation is already bound to a different release key",
      };
    }
    if (!backendIdentityEquals(lookup.backend, releaseBackend)) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_backend_mismatch",
        error: "Durable key-release lookup is not bound to the configured backend identity",
      };
    }

    if (lookup.provenance !== "production") {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "key_release_lookup_failed",
        error: "Durable key-release lookup must carry production provenance",
      };
    }

    let release: DecryptionKeyReleaseResult;
    if (lookup.status === "found") {
      if (lookup.release === undefined) {
        return {
          finalized: false,
          status: "rejected",
          intentId,
          paymentHash: paymentEvidence.observation.txid,
          failure_code: "key_release_lookup_failed",
          error: "Durable key-release lookup reported found without release evidence",
        };
      }
      release = lookup.release;
    } else if (lookup.status === "absent") {
      let rawRelease: unknown;
      try {
        // The stable obligation, canonical binding digest, and deterministic
        // key are claimed atomically by the durable backend. No timestamp or
        // process-local state enters this request, and no non-idempotent
        // fallback is permitted.
        rawRelease = await this.keyReleaser.release(releaseRequest);
      } catch (error: unknown) {
        const normalized = normalizeBoundaryError(error, "Key-release backend outcome is ambiguous");
        return {
          finalized: false,
          status: "rejected",
          intentId,
          paymentHash: paymentEvidence.observation.txid,
          failure_code: normalized.truncated ? "resource_limit_exceeded" : "key_release_ambiguous",
          error: normalized.message,
        };
      }

      const releaseValidation = normalizeKeyReleaseResult(rawRelease);
      if (!releaseValidation.ok) {
        return {
          finalized: false,
          status: "rejected",
          intentId,
          paymentHash: paymentEvidence.observation.txid,
          failure_code: releaseValidation.failure_code,
          error: releaseValidation.error,
        };
      }
      release = releaseValidation.result;
    } else {
      return {
        finalized: false,
        status: lookup.status === "unavailable" ? "unavailable" : "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: lookup.failure_code
          ?? (lookup.status === "conflict" ? "key_release_obligation_conflict" : "key_release_lookup_failed"),
        error: lookup.error ?? "Durable key-release lookup did not establish release state",
      };
    }

    if (release.status !== "released") {
      return {
        finalized: false,
        status: release.status === "unavailable" ? "unavailable" : "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: release.failure_code ?? "decryption_key_unavailable",
        error: release.error ?? "Production decryption-key release was not accepted",
      };
    }

    const productionRelease = isProductionKeyRelease(release, releaseBackend, releaseRequest);
    if (!productionRelease.ok) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: productionRelease.failure_code,
        error: productionRelease.error,
      };
    }

    const releaseEvidence: StoredKeyReleaseEvidence = immutableCopy({
      result: release,
      released_at: releaseCommitContext.released_at,
      idempotency_key: releaseRequest.idempotency_key,
      binding: releaseRequest.binding,
    });

    try {
      if (!this.isCurrentOperation(operation, ["paid"])) {
        return {
          finalized: false,
          status: "rejected",
          intentId,
          paymentHash: releaseCommitContext.payment_hash,
          failure_code: "internal_error",
          error: "ZKCP finalization became stale before durable release commit",
        };
      }
      const retained = this.keyReleaseEvidence.get(intentId);
      if (retained !== undefined && retained.idempotency_key !== releaseRequest.idempotency_key) {
        return {
          finalized: false,
          status: "rejected",
          intentId,
          paymentHash: releaseCommitContext.payment_hash,
          failure_code: "key_release_idempotency_mismatch",
          error: "Local key-release evidence is bound to a different immutable idempotency key",
        };
      }
      if (retained === undefined) this.keyReleaseEvidence.set(intentId, releaseEvidence);
      intent.status = "finalized";
      intent.decryptionKey = release.decryptionKey;
      intent.updatedAt = releaseCommitContext.released_at;
      this.lifecycleGenerations.set(intentId, operation.generation + 1);
      this.emit({
        type: "settlement_finalized",
        intentId,
        timestamp: intent.updatedAt,
        data: {
          paymentHash: releaseCommitContext.payment_hash,
          idempotencyKey: releaseRequest.idempotency_key,
        },
      });
    } catch (error: unknown) {
      const normalized = normalizeBoundaryError(error, "Durable key-release evidence commit failed");
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: releaseCommitContext.payment_hash,
        failure_code: normalized.truncated ? "resource_limit_exceeded" : "internal_error",
        error: normalized.message,
      };
    }

    return {
      finalized: true,
      status: "finalized",
      intentId,
      paymentHash: releaseCommitContext.payment_hash,
      decryptionKey: release.decryptionKey,
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
  new UnavailableDecryptionKeyReleaser(),
);
