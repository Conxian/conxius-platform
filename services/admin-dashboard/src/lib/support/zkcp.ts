import { createLogger } from "./logger";
import {
  VERIFIER_CONTRACT_VERSION,
  UNAVAILABLE_BACKEND,
  createPaymentFailure,
  createVerificationFailure,
  digestVerifierRequest,
  isProductionPayment,
  isProductionVerified,
  isVerificationFailureCode,
  rejectNonProductionVerification,
  type Digest,
  type PaymentNetwork,
  type PaymentObservation,
  type PaymentObservationRequest,
  type PaymentObservationResult,
  type Provenance,
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

export interface ZKProofVerifier {
  verify(request: VerifierRequest): Promise<VerificationResult>;
}

export class UnavailableZKVerifier implements ZKProofVerifier {
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
  watchForPayment(request: PaymentObservationRequest): Promise<PaymentObservationResult>;
}

export class UnavailableOnChainMonitor implements OnChainMonitor {
  public async watchForPayment(_request: PaymentObservationRequest): Promise<PaymentObservationResult> {
    return createPaymentFailure(
      "observer_unavailable",
      "Bitcoin payment observer is not configured",
    );
  }
}

export interface DecryptionKeyReleaseResult {
  status: "released" | "unavailable" | "rejected";
  provenance: Provenance;
  decryptionKey?: string;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface DecryptionKeyReleaser {
  release(intent: ZKCPIntent, payment: PaymentObservation): Promise<DecryptionKeyReleaseResult>;
}

export class UnavailableDecryptionKeyReleaser implements DecryptionKeyReleaser {
  public async release(_intent: ZKCPIntent, _payment: PaymentObservation): Promise<DecryptionKeyReleaseResult> {
    return {
      status: "unavailable",
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

function isProvenance(value: unknown): value is Provenance {
  return value === "production" || value === "test" || value === "simulated" || value === "unknown";
}

function isZKProofSystem(value: unknown): value is ZKProofSystem {
  return value === "groth16" || value === "plonk" || value === "stark";
}

function paymentRequestFor(intent: ZKCPIntent): PaymentObservationRequest {
  return {
    intent_id: intent.id,
    address: intent.sellerAddress,
    expected_amount: intent.amount,
    network: intent.network,
  };
}

function failedVerification(intentId: string, code: VerificationFailureCode, error: string): VerificationResult {
  logger.warn(`Verification failed for intent ${intentId}: ${code}`);
  return createVerificationFailure(code, error);
}

async function normalizePaymentResult(
  value: unknown,
  request: PaymentObservationRequest,
): Promise<PaymentObservationResult> {
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || !isPaymentStatus(value.status)
    || typeof value.detected !== "boolean"
    || !isProvenance(value.provenance)) {
    return createPaymentFailure("payment_mismatch", "Payment observer returned a malformed result");
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

  if (!value.detected || value.observation === undefined) {
    return createPaymentFailure("payment_not_observed", "Observed payment result is missing payment evidence");
  }

  const validation = await validatePaymentObservation(value.observation, request);
  if (!validation.ok) return createPaymentFailure(validation.failure_code, validation.error);
  const observation = validation.observation;

  const result: PaymentObservationResult = {
    contract_version: VERIFIER_CONTRACT_VERSION,
    status: "observed",
    detected: true,
    provenance: value.provenance,
    observation,
  };

  if (result.provenance === "simulated" || observation.provenance === "simulated") {
    return createPaymentFailure("simulated_result", "Simulated payment evidence cannot authorize settlement", "simulated");
  }

  return result;
}

export class ZKCPBridge {
  private readonly intents = new Map<string, ZKCPIntent>();
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

  public initializeIntent(params: ZKCPIntentInput): ZKCPIntent {
    if (!isNonEmptyString(params.id)
      || !Number.isInteger(params.amount)
      || params.amount <= 0
      || !isNonEmptyString(params.sellerAddress)
      || !isNonEmptyString(params.buyerAddress)
      || !isPaymentNetwork(params.network)
      || !/^sha256:[0-9a-f]{64}$/.test(params.encryptedDataHash)
      || !/^sha256:[0-9a-f]{64}$/.test(params.proofHash)) {
      throw new Error("Malformed ZKCP intent bindings");
    }

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
    return intent;
  }

  public async verifyProof(intentId: string, value: unknown): Promise<VerificationResult> {
    const intent = this.intents.get(intentId);
    if (!intent) return failedVerification(intentId, "malformed_request", "Intent not found");
    if (intent.status !== "pending") {
      return failedVerification(intentId, "malformed_request", `Intent is not pending (current: ${intent.status})`);
    }

    const requestValidation = await validateVerifierRequest(value);
    if (!requestValidation.ok) {
      const result = failedVerification(intentId, requestValidation.failure_code, requestValidation.error);
      intent.status = "failed";
      intent.verification = result;
      intent.updatedAt = new Date().toISOString();
      this.emit({ type: "intent_failed", intentId, timestamp: intent.updatedAt, data: { failure_code: result.failure_code } });
      return result;
    }

    if (requestValidation.request.proof.digest !== intent.proofHash) {
      const result = failedVerification(intentId, "proof_digest_mismatch", "Proof is not bound to the initialized intent");
      intent.status = "failed";
      intent.verification = result;
      intent.updatedAt = new Date().toISOString();
      this.emit({ type: "intent_failed", intentId, timestamp: intent.updatedAt, data: { failure_code: result.failure_code } });
      return result;
    }

    let result = await this.verifier.verify(requestValidation.request);
    const resultValidation = await validateVerificationResult(
      result,
      requestValidation.request,
      requestValidation.request_digest,
    );

    if (!resultValidation.ok) {
      result = createVerificationFailure(resultValidation.failure_code, resultValidation.error, {
        request_digest: requestValidation.request_digest,
      });
    } else {
      result = rejectNonProductionVerification(resultValidation.result);
    }

    intent.updatedAt = new Date().toISOString();
    intent.verification = result;
    if (isProductionVerified(result)) {
      if (!isZKProofSystem(requestValidation.request.proof_system)) {
        const failure = failedVerification(intentId, "unsupported_backend", "The selected proof system is not a ZKCP proof system");
        intent.status = "failed";
        intent.verification = failure;
        return failure;
      }
      intent.status = "verified";
      intent.proofSystem = requestValidation.request.proof_system;
      this.emit({
        type: "proof_verified",
        intentId,
        timestamp: intent.updatedAt,
        data: { proofSystem: intent.proofSystem, backend: result.backend.id },
      });
    } else {
      intent.status = result.status === "unavailable" || result.status === "unsupported" ? "unsupported" : "failed";
      this.emit({ type: "intent_failed", intentId, timestamp: intent.updatedAt, data: { failure_code: result.failure_code } });
    }

    return result;
  }

  public async watchForPayment(intentId: string): Promise<PaymentObservationResult> {
    const intent = this.intents.get(intentId);
    if (!intent) return createPaymentFailure("payment_not_observed", "Intent not found");
    if (intent.status !== "verified" || !intent.verification || !isProductionVerified(intent.verification)) {
      return createPaymentFailure("payment_not_observed", "A production-valid proof is required before payment observation");
    }

    const request = paymentRequestFor(intent);
    const observed = await this.onChainMonitor.watchForPayment(request);
    const result = await normalizePaymentResult(observed, request);
    if (!isProductionPayment(result)) return result;
    const observation = result.observation;

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
    return result;
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

    if (intent.status !== "paid" || !intent.paymentObservation) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        failure_code: "payment_not_observed",
        error: "Independent production payment observation is required",
      };
    }

    const paymentResult: PaymentObservationResult = {
      contract_version: VERIFIER_CONTRACT_VERSION,
      status: "observed",
      detected: true,
      provenance: intent.paymentObservation.provenance,
      observation: intent.paymentObservation,
    };
    if (!isProductionPayment(paymentResult)) {
      return {
        finalized: false,
        status: "rejected",
        intentId,
        paymentHash: intent.paymentObservation.txid,
        failure_code: "simulated_result",
        error: "Non-production payment evidence cannot finalize settlement",
      };
    }

    const release = await this.keyReleaser.release(intent, intent.paymentObservation);
    if (release.status !== "released" || release.provenance !== "production" || !isNonEmptyString(release.decryptionKey)) {
      return {
        finalized: false,
        status: release.status === "unavailable" ? "unavailable" : "rejected",
        intentId,
        paymentHash: intent.paymentObservation.txid,
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
      data: { paymentHash: intent.paymentObservation.txid },
    });

    return {
      finalized: true,
      status: "finalized",
      intentId,
      paymentHash: intent.paymentObservation.txid,
      decryptionKey: release.decryptionKey,
    };
  }

  public getIntent(id: string): ZKCPIntent | undefined {
    return this.intents.get(id);
  }

  public listIntents(): ZKCPIntent[] {
    return Array.from(this.intents.values());
  }

  public listIntentsByStatus(status: ZKCPStatus): ZKCPIntent[] {
    return Array.from(this.intents.values()).filter((intent) => intent.status === status);
  }
}

function isPaymentNetwork(value: unknown): value is PaymentNetwork {
  return value === "bitcoin-mainnet"
    || value === "bitcoin-testnet"
    || value === "bitcoin-signet"
    || value === "bitcoin-regtest";
}

export const zkcpBridge = new ZKCPBridge(
  new UnavailableZKVerifier(),
  new UnavailableOnChainMonitor(),
  new UnavailableDecryptionKeyReleaser(),
);
