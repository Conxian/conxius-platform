import { createLogger } from "./logger";
import {
  VERIFIER_CONTRACT_VERSION,
  UNAVAILABLE_BACKEND,
  backendIdentityEquals,
  canonicalJson,
  createPaymentFailure,
  createVerificationFailure,
  digestCanonical,
  digestVerifierRequest,
  isAuthoritativeBackendIdentity,
  isBackendIdentity,
  isPaymentNetwork,
  isProductionPayment,
  isProductionVerified,
  isProvenance,
  isUnavailableBackend,
  isVerificationFailureCode,
  rejectNonProductionVerification,
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

export interface ZKCPBindingDigests {
  version: typeof ZKCP_STATEMENT_BINDING_VERSION;
  payment_condition_digest: Digest;
  statement_digest: Digest;
  domain_digest: Digest;
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
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface DecryptionKeyReleaser {
  readonly backendIdentity: BackendIdentity;
  release(intent: Readonly<ZKCPIntent>, payment: Readonly<PaymentObservation>): Promise<DecryptionKeyReleaseResult>;
}

export class UnavailableDecryptionKeyReleaser implements DecryptionKeyReleaser {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async release(_intent: Readonly<ZKCPIntent>, _payment: Readonly<PaymentObservation>): Promise<DecryptionKeyReleaseResult> {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
    return {
      ok: false,
      failure_code: "digest_unavailable",
      error: error instanceof Error ? error.message : "Unable to derive ZKCP statement binding",
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
  logger.warn(`Verification failed for intent ${intentId}: ${code}`);
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

function isProductionKeyRelease(
  result: DecryptionKeyReleaseResult,
  authority: BackendIdentity,
): boolean {
  return result.status === "released"
    && result.provenance === "production"
    && result.failure_code === undefined
    && isNonEmptyString(result.decryptionKey)
    && isAuthoritativeBackendIdentity(result.backend)
    && isAuthoritativeBackendIdentity(authority)
    && backendIdentityEquals(result.backend, authority);
}

function isKeyReleaseResult(value: unknown): value is DecryptionKeyReleaseResult {
  return isRecord(value)
    && (value.status === "released" || value.status === "unavailable" || value.status === "rejected")
    && isBackendIdentity(value.backend)
    && isProvenance(value.provenance)
    && (value.failure_code === undefined || isVerificationFailureCode(value.failure_code))
    && (value.decryptionKey === undefined || typeof value.decryptionKey === "string")
    && (value.error === undefined || typeof value.error === "string");
}

export class ZKCPBridge {
  private readonly intents = new Map<string, ZKCPIntent>();
  private readonly verificationEvidence = new Map<string, StoredVerificationEvidence>();
  private readonly paymentEvidence = new Map<string, StoredPaymentEvidence>();
  private readonly finalizationLocks = new Set<string>();
  private readonly eventHandlers: ZKCPEventHandler[] = [];

  public constructor(
    private readonly verifier: ZKProofVerifier,
    private readonly onChainMonitor: OnChainMonitor,
    private readonly keyReleaser: DecryptionKeyReleaser,
  ) {}

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

  private recordFailure(intent: ZKCPIntent, result: VerificationResult): VerificationResult {
    intent.status = result.status === "unavailable" || result.status === "unsupported" ? "unsupported" : "failed";
    intent.verification = result;
    intent.updatedAt = new Date().toISOString();
    this.verificationEvidence.delete(intent.id);
    this.emit({ type: "intent_failed", intentId: intent.id, timestamp: intent.updatedAt, data: { failure_code: result.failure_code } });
    return copyVerificationResult(result);
  }

  public initializeIntent(params: ZKCPIntentInput): Readonly<ZKCPIntent> {
    if (!isNonEmptyString(params.id)
      || !Number.isSafeInteger(params.amount)
      || params.amount <= 0
      || !isNonEmptyString(params.sellerAddress)
      || !isNonEmptyString(params.buyerAddress)
      || !isPaymentNetwork(params.network)
      || !/^sha256:[0-9a-f]{64}$/.test(params.encryptedDataHash)
      || !/^sha256:[0-9a-f]{64}$/.test(params.proofHash)) {
      throw new Error("Malformed ZKCP intent bindings");
    }
    if (this.intents.has(params.id)) throw new Error("ZKCP intent id already exists");

    const now = new Date().toISOString();
    const intent: ZKCPIntent = {
      ...params,
      status: "pending",
      round: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.intents.set(intent.id, intent);
    this.emit({ type: "intent_created", intentId: intent.id, timestamp: now, data: { amount: intent.amount } });
    logger.info(`Initialized intent ${intent.id}`);
    return immutableCopy(intent);
  }

  public async verifyProof(intentId: string, value: unknown): Promise<VerificationResult> {
    const intent = this.intents.get(intentId);
    if (!intent) return copyVerificationResult(failedVerification(intentId, "malformed_request", "Intent not found"));
    if (intent.status !== "pending") {
      return copyVerificationResult(failedVerification(intentId, "malformed_request", `Intent is not pending (current: ${intent.status})`));
    }

    const requestValidation = await validateVerifierRequest(value);
    if (!requestValidation.ok) {
      return this.recordFailure(intent, failedVerification(intentId, requestValidation.failure_code, requestValidation.error));
    }

    if (requestValidation.request.proof.digest !== intent.proofHash) {
      return this.recordFailure(intent, failedVerification(intentId, "proof_digest_mismatch", "Proof is not bound to the initialized intent"));
    }

    const bindingValidation = await validateZKCPIntentBinding(intent, requestValidation.request);
    if (!bindingValidation.ok) {
      return this.recordFailure(intent, failedVerification(intentId, bindingValidation.failure_code, bindingValidation.error));
    }

    if (!isZKProofSystem(requestValidation.request.proof_system)) {
      return this.recordFailure(intent, failedVerification(intentId, "unsupported_backend", "The selected proof system is not a ZKCP proof system"));
    }

    const verifierBackend = this.verifier.backendIdentity;
    if (!isBackendIdentity(verifierBackend)) {
      return this.recordFailure(intent, failedVerification(intentId, "backend_mismatch", "Verifier adapter has no valid configured backend identity"));
    }
    if (!isUnavailableBackend(verifierBackend)
      && !backendIdentityEquals(requestValidation.request.backend, verifierBackend)) {
      return this.recordFailure(intent, failedVerification(intentId, "backend_mismatch", "Verifier request is not bound to the configured adapter backend"));
    }

    let result: VerificationResult;
    try {
      result = await this.verifier.verify(requestValidation.request);
    } catch (error: unknown) {
      result = createVerificationFailure(
        "internal_error",
        error instanceof Error ? error.message : "ZK proof verifier adapter failed",
        {
          request_digest: requestValidation.request_digest,
          backend: verifierBackend,
          provenance: requestValidation.request.provenance,
        },
      );
    }
    const resultValidation = await validateVerificationResult(
      result,
      requestValidation.request,
      requestValidation.request_digest,
      verifierBackend,
    );

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
      return this.recordFailure(intent, result);
    }

    const evidence: StoredVerificationEvidence = immutableCopy({
      request: requestValidation.request,
      request_digest: requestValidation.request_digest,
      result,
    });
    this.verificationEvidence.set(intent.id, evidence);
    intent.updatedAt = new Date().toISOString();
    intent.verification = result;
    intent.status = "verified";
    intent.proofSystem = requestValidation.request.proof_system;
    this.emit({
      type: "proof_verified",
      intentId,
      timestamp: intent.updatedAt,
      data: { proofSystem: intent.proofSystem, backend: result.backend.id },
    });
    return copyVerificationResult(result);
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

    const proofEvidence = await this.revalidateProofEvidence(intent);
    if (!proofEvidence.ok) return createPaymentFailure(proofEvidence.failure_code, proofEvidence.error);

    const observerBackend = this.onChainMonitor.backendIdentity;
    if (!isBackendIdentity(observerBackend)) {
      return createPaymentFailure("payment_mismatch", "Payment observer has no valid configured backend identity");
    }
    const request = paymentRequestFor(intent);
    let observed: PaymentObservationResult;
    try {
      observed = await this.onChainMonitor.watchForPayment(request);
    } catch (error: unknown) {
      return copyPaymentResult(createPaymentFailure(
        "internal_error",
        error instanceof Error ? error.message : "Payment observer adapter failed",
      ));
    }
    const result = await normalizePaymentResult(observed, request, observerBackend);
    if (!isProductionPayment(result, observerBackend)) return copyPaymentResult(result);

    const observation = immutableCopy(result.observation);
    this.paymentEvidence.set(intent.id, immutableCopy({ request, observation }));
    intent.paymentObservation = observation;
    intent.paymentHash = observation.txid;
    intent.status = "paid";
    intent.updatedAt = new Date().toISOString();
    this.emit({
      type: "payment_detected",
      intentId,
      timestamp: intent.updatedAt,
      data: { txid: observation.txid, confirmations: observation.confirmations },
    });
    return copyPaymentResult(result);
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
    const intent = this.intents.get(intentId);
    if (!intent) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        failure_code: "payment_not_observed",
        error: "Intent not found",
      };
    }

    if (intent.status === "finalized") {
      return {
        finalized: true,
        status: "finalized",
        intentId,
        paymentHash: intent.paymentHash,
        decryptionKey: intent.decryptionKey,
      };
    }

    if (this.finalizationLocks.has(intentId)) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: intent.paymentHash,
        failure_code: "internal_error",
        error: "Settlement finalization is already in progress",
      };
    }

    this.finalizationLocks.add(intentId);
    try {
      return await this.finalizeSettlementInternal(intentId, intent);
    } finally {
      this.finalizationLocks.delete(intentId);
    }
  }

  private async finalizeSettlementInternal(
    intentId: string,
    intent: ZKCPIntent,
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

    let release: DecryptionKeyReleaseResult;
    try {
      release = await this.keyReleaser.release(
        immutableCopy(intent),
        immutableCopy(paymentEvidence.observation),
      );
    } catch (error: unknown) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "internal_error",
        error: error instanceof Error ? error.message : "Key-release backend failed",
      };
    }

    if (!isKeyReleaseResult(release)) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: "internal_error",
        error: "Key-release backend returned malformed evidence",
      };
    }

    if (!isProductionKeyRelease(release, releaseBackend)) {
      return {
        finalized: false,
        status: release.status === "unavailable" ? "unavailable" : "rejected",
        intentId,
        paymentHash: paymentEvidence.observation.txid,
        failure_code: release.failure_code ?? "decryption_key_unavailable",
        error: release.error ?? "Production decryption-key release was not accepted",
      };
    }

    intent.status = "finalized";
    intent.decryptionKey = release.decryptionKey;
    intent.updatedAt = new Date().toISOString();
    this.emit({
      type: "settlement_finalized",
      intentId,
      timestamp: intent.updatedAt,
      data: { paymentHash: paymentEvidence.observation.txid },
    });

    return {
      finalized: true,
      status: "finalized",
      intentId,
      paymentHash: paymentEvidence.observation.txid,
      decryptionKey: release.decryptionKey,
    };
  }

  public getIntent(id: string): Readonly<ZKCPIntent> | undefined {
    const intent = this.intents.get(id);
    return intent ? immutableCopy(intent) : undefined;
  }

  public listIntents(): ReadonlyArray<Readonly<ZKCPIntent>> {
    return this.listSnapshots(this.intents.values());
  }

  public listIntentsByStatus(status: ZKCPStatus): ReadonlyArray<Readonly<ZKCPIntent>> {
    return this.listSnapshots(Array.from(this.intents.values()).filter((intent) => intent.status === status));
  }

  private listSnapshots(intents: Iterable<ZKCPIntent>): ReadonlyArray<Readonly<ZKCPIntent>> {
    return immutableCopy(Array.from(intents));
  }
}

export const zkcpBridge = new ZKCPBridge(
  new UnavailableZKVerifier(),
  new UnavailableOnChainMonitor(),
  new UnavailableDecryptionKeyReleaser(),
);
