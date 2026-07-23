import { describe, expect, it, vi } from "vitest";
import {
  UnavailableDecryptionKeyReleaser,
  UnavailableOnChainMonitor,
  UnavailableZKVerifier,
  ZKCP_KEY_RELEASE_CAPABILITIES,
  ZKCP_KEY_RELEASE_REGISTRY,
  ZKCP_LIST_POLICY,
  ZKCP_RETENTION_POLICY,
  ZKCP_TIMESTAMP_MAX_MS,
  ZKCPBridge,
  deriveZKCPKeyReleaseObligationId,
  type DecryptionKeyReleaser,
  type DecryptionKeyReleaseEvidence,
  type DecryptionKeyReleaseLookupResult,
  type DecryptionKeyReleaseLookupRequest,
  type DecryptionKeyReleaseRequest,
  type DecryptionKeyReleaseResult,
  type OnChainMonitor,
  type ZKCPBridgeOptions,
  type ZKCPIntentInput,
  type ZKCPKeyReleaseRegistry,
  type ZKProofVerifier,
} from "../lib/support/zkcp";
import {
  canonicalJson,
  createPaymentObservation,
  createVerificationResult,
  digestVerifierRequest,
  UNAVAILABLE_BACKEND,
  VERIFIER_ATTESTATION_LIMITS,
  VERIFIER_RESOURCE_LIMITS,
  type BackendIdentity,
  type Digest,
  type PaymentObservationResult,
  type VerifierRequest,
} from "../lib/support/verifier-contract";
import {
  bindZKCPRequestToIntent,
  DeterministicFixtureVerifier,
  makeIntentInput,
  makeVerifierRequest,
} from "./fixtures/verifierFixtures";

const AUTHORITATIVE_TEST_BACKEND: BackendIdentity = {
  id: "explicit-test-authority",
  version: "test-authority-v1",
  artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  authority: "authoritative",
};

const ROTATED_RELEASE_BACKEND: BackendIdentity = {
  id: "explicit-test-authority",
  version: "test-authority-v2",
  artifact_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  authority: "authoritative",
};

const DRIFTED_REGISTRY_CAPABILITIES: typeof ZKCP_KEY_RELEASE_CAPABILITIES = {
  ...ZKCP_KEY_RELEASE_CAPABILITIES,
  registry_namespace: "conxian.zkcp.key-release.obligations.drifted.v1",
};

async function setup(verifier: ZKProofVerifier = new DeterministicFixtureVerifier()) {
  const genericRequest = await makeVerifierRequest();
  const input = await makeIntentInput(genericRequest);
  const request = await bindZKCPRequestToIntent(genericRequest, input);
  const bridge = new ZKCPBridge(
    verifier,
    new UnavailableOnChainMonitor(),
    new UnavailableDecryptionKeyReleaser(),
  );
  bridge.initializeIntent(input);
  return { bridge, request, input };
}

async function setupAuthoritativeSettlement(
  id: string,
  now: () => number,
  keyReleaser: DecryptionKeyReleaser,
  options: {
    input?: Partial<ZKCPIntentInput>;
    monitor?: OnChainMonitor;
    bridgeOptions?: ZKCPBridgeOptions;
  } = {},
) {
  const genericRequest = await makeVerifierRequest({
    backend: AUTHORITATIVE_TEST_BACKEND,
    provenance: "production",
  });
  const defaultInput = await makeIntentInput(genericRequest, id);
  const input = { ...defaultInput, ...options.input };
  const request = await bindZKCPRequestToIntent(genericRequest, input);
  const bridge = new ZKCPBridge(
    new AuthoritativeFixtureVerifier(),
    options.monitor ?? new AuthoritativeFixtureMonitor(),
    keyReleaser,
    { ...options.bridgeOptions, now },
  );
  bridge.initializeIntent(input);
  expect((await bridge.verifyProof(input.id, request)).status).toBe("valid");
  expect((await bridge.watchForPayment(input.id)).status).toBe("observed");
  return { bridge, input, request };
}

class AuthoritativeFixtureVerifier implements ZKProofVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(request: VerifierRequest) {
    return createVerificationResult({
      status: "valid",
      request_digest: await digestVerifierRequest(request),
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });
  }
}

class DeferredZKVerifier extends AuthoritativeFixtureVerifier {
  public calls = 0;
  private resolveStarted!: () => void;
  private resolveGate!: () => void;
  public readonly started: Promise<void>;
  private readonly gate: Promise<void>;

  public constructor() {
    super();
    this.started = new Promise<void>((resolve) => {
      this.resolveStarted = resolve;
    });
    this.gate = new Promise<void>((resolve) => {
      this.resolveGate = resolve;
    });
  }

  public override async verify(request: VerifierRequest) {
    this.calls += 1;
    this.resolveStarted();
    await this.gate;
    return super.verify(request);
  }

  public release(): void {
    this.resolveGate();
  }
}

class AuthoritativeFixtureMonitor implements OnChainMonitor {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public constructor(private readonly txid = "tx-authoritative-fixture") {}

  public async watchForPayment(request: Parameters<OnChainMonitor["watchForPayment"]>[0]): Promise<PaymentObservationResult> {
    const observation = await createPaymentObservation({
      request,
      txid: this.txid,
      amount: request.expected_amount,
      confirmations: 6,
      observer: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });
    return {
      contract_version: "conxian.verifier.v1",
      status: "observed",
      detected: true,
      provenance: "production",
      observation,
    };
  }
}

class DeferredPaymentMonitor extends AuthoritativeFixtureMonitor {
  public calls = 0;
  private resolveStarted!: () => void;
  private resolveGate!: () => void;
  public readonly started: Promise<void>;
  private readonly gate: Promise<void>;

  public constructor() {
    super();
    this.started = new Promise<void>((resolve) => {
      this.resolveStarted = resolve;
    });
    this.gate = new Promise<void>((resolve) => {
      this.resolveGate = resolve;
    });
  }

  public override async watchForPayment(
    request: Parameters<OnChainMonitor["watchForPayment"]>[0],
  ): Promise<PaymentObservationResult> {
    this.calls += 1;
    this.resolveStarted();
    await this.gate;
    return super.watchForPayment(request);
  }

  public release(): void {
    this.resolveGate();
  }
}

function releaseEvidenceFor(
  request: Readonly<DecryptionKeyReleaseRequest | DecryptionKeyReleaseLookupRequest>,
  overrides: Partial<DecryptionKeyReleaseEvidence> = {},
): string {
  const backend = "intent" in request ? request.binding.backend : request.backend;
  const evidence: DecryptionKeyReleaseEvidence = {
    contract_version: request.contract_version,
    registry_version: request.registry.registry_version,
    registry_namespace: request.registry.registry_namespace,
    obligation_id: request.obligation_id,
    binding_digest: request.binding_digest,
    idempotency_key: request.idempotency_key,
    backend_id: backend.id,
    backend_version: backend.version,
    backend_artifact_digest: backend.artifact_digest,
    backend_authority: backend.authority,
  };
  return canonicalJson({ ...evidence, ...overrides });
}

interface FixtureDurableReleaseRecord {
  binding_digest: DecryptionKeyReleaseRequest["binding_digest"];
  idempotency_key: string;
  release: DecryptionKeyReleaseResult;
}

abstract class DurableFixtureKeyReleaser implements DecryptionKeyReleaser {
  public readonly capabilities: typeof ZKCP_KEY_RELEASE_CAPABILITIES;

  public constructor(
    public readonly backendIdentity: BackendIdentity = AUTHORITATIVE_TEST_BACKEND,
    protected readonly records: Map<string, FixtureDurableReleaseRecord> = new Map(),
    capabilities: typeof ZKCP_KEY_RELEASE_CAPABILITIES = ZKCP_KEY_RELEASE_CAPABILITIES,
  ) {
    this.capabilities = capabilities;
  }

  public readonly lookupKeys: string[] = [];
  public readonly obligationLookupKeys: string[] = [];
  public readonly releaseKeys: string[] = [];

  protected storedRecord(obligationId: string): FixtureDurableReleaseRecord | undefined {
    return this.records.get(obligationId);
  }

  protected storedRelease(obligationId: string): DecryptionKeyReleaseResult | undefined {
    return this.storedRecord(obligationId)?.release;
  }

  protected storeRelease(
    request: Readonly<DecryptionKeyReleaseRequest>,
    result: DecryptionKeyReleaseResult,
  ): void {
    this.records.set(request.obligation_id, {
      binding_digest: request.binding_digest,
      idempotency_key: request.idempotency_key,
      release: result,
    });
  }

  protected successfulRelease(
    request: Readonly<DecryptionKeyReleaseRequest>,
    decryptionKey = "fixture-release-key",
  ): DecryptionKeyReleaseResult {
    return {
      status: "released",
      backend: this.backendIdentity,
      provenance: "production",
      decryptionKey,
      evidence: releaseEvidenceFor(request),
    };
  }

  public abstract release(
    request: Readonly<DecryptionKeyReleaseRequest>,
  ): Promise<DecryptionKeyReleaseResult>;

  public async getByIdempotencyKey(
    request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ): Promise<DecryptionKeyReleaseLookupResult> {
    return this.getByObligationId(request);
  }

  public async getByObligationId(
    request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ): Promise<DecryptionKeyReleaseLookupResult> {
    this.lookupKeys.push(request.idempotency_key);
    this.obligationLookupKeys.push(request.obligation_id);
    const record = this.storedRecord(request.obligation_id);
    if (record === undefined) {
      return {
        status: "absent" as const,
        registry: request.registry,
        obligation_id: request.obligation_id,
        backend: this.backendIdentity,
        provenance: "production" as const,
      };
    }
    if (record.binding_digest !== request.binding_digest
      || record.idempotency_key !== request.idempotency_key) {
      return {
        status: "conflict" as const,
        registry: request.registry,
        obligation_id: request.obligation_id,
        binding_digest: record.binding_digest,
        idempotency_key: record.idempotency_key,
        backend: this.backendIdentity,
        provenance: "production" as const,
        failure_code: "key_release_obligation_conflict" as const,
        error: "fixture registry obligation is bound to a different release request",
      };
    }
    return {
        status: "found" as const,
        registry: request.registry,
        obligation_id: request.obligation_id,
        binding_digest: record.binding_digest,
        idempotency_key: record.idempotency_key,
        backend: this.backendIdentity,
        provenance: "production" as const,
        release: record.release,
    };
  }

  protected existingOrConflict(
    request: Readonly<DecryptionKeyReleaseRequest>,
  ): DecryptionKeyReleaseResult | undefined {
    const record = this.storedRecord(request.obligation_id);
    if (record === undefined) return undefined;
    if (record.binding_digest !== request.binding_digest
      || record.idempotency_key !== request.idempotency_key) {
      return {
        status: "rejected",
        backend: this.backendIdentity,
        provenance: "production",
        failure_code: "key_release_obligation_conflict",
        error: "fixture registry obligation is already bound to different release terms",
      };
    }
    return record.release;
  }
}

class AuthoritativeFixtureKeyReleaser extends DurableFixtureKeyReleaser {
  public releaseCount = 0;

  public constructor(
    records: Map<string, FixtureDurableReleaseRecord> = new Map(),
    backendIdentity: BackendIdentity = AUTHORITATIVE_TEST_BACKEND,
    capabilities: typeof ZKCP_KEY_RELEASE_CAPABILITIES = ZKCP_KEY_RELEASE_CAPABILITIES,
  ) {
    super(backendIdentity, records, capabilities);
  }

  public override async release(request: Readonly<DecryptionKeyReleaseRequest>) {
    const retained = this.existingOrConflict(request);
    if (retained !== undefined) return retained;
    this.releaseCount += 1;
    this.releaseKeys.push(request.idempotency_key);
    const release = this.successfulRelease(request);
    this.storeRelease(request, release);
    return release;
  }
}

class CommitThenMalformedKeyReleaser extends AuthoritativeFixtureKeyReleaser {
  public override async release(request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    const retained = this.existingOrConflict(request);
    if (retained === undefined) {
      this.releaseCount += 1;
      this.releaseKeys.push(request.idempotency_key);
      this.storeRelease(request, this.successfulRelease(request));
    }
    return null as never;
  }
}

class CommitThenTimeoutKeyReleaser extends AuthoritativeFixtureKeyReleaser {
  public override async release(request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    const retained = this.existingOrConflict(request);
    if (retained === undefined) {
      this.releaseCount += 1;
      this.releaseKeys.push(request.idempotency_key);
      this.storeRelease(request, this.successfulRelease(request));
    }
    throw new Error("fixture timeout after durable release commit");
  }
}

class LookupErrorKeyReleaser extends AuthoritativeFixtureKeyReleaser {
  public lookupCalls = 0;

  public override async getByObligationId(
    _request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ): Promise<never> {
    this.lookupCalls += 1;
    throw new Error("fixture durable lookup unavailable");
  }
}

class MisclassifiedConflictKeyReleaser extends DurableFixtureKeyReleaser {
  public override async getByObligationId(
    request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ): Promise<DecryptionKeyReleaseLookupResult> {
    return {
      status: "conflict" as const,
      registry: request.registry,
      obligation_id: request.obligation_id,
      binding_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Digest,
      idempotency_key: `zkcp-release-v1:${"b".repeat(64)}`,
      backend: request.backend,
      provenance: "production" as const,
      failure_code: "internal_error" as const,
      error: "fixture conflict with misclassified backend code",
    };
  }

  public override async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    throw new Error("release must not run for a durable obligation conflict");
  }
}

class MissingDurableCapabilityKeyReleaser implements DecryptionKeyReleaser {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;
  public readonly capabilities = undefined;
  public lookupCalls = 0;
  public releaseCalls = 0;

  public async getByIdempotencyKey(
    _request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ): Promise<never> {
    this.lookupCalls += 1;
    throw new Error("durable lookup must not run without capability metadata");
  }

  public async getByObligationId(
    _request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ): Promise<never> {
    this.lookupCalls += 1;
    throw new Error("durable lookup must not run without capability metadata");
  }

  public async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    this.releaseCalls += 1;
    throw new Error("release must not run without capability metadata");
  }
}

type CorruptReleaseEvidenceMode = "key" | "statement" | "encrypted" | "backend" | "artifact";

class CorruptingLookupKeyReleaser extends DurableFixtureKeyReleaser {
  public constructor(private readonly mode: CorruptReleaseEvidenceMode) {
    super();
  }

  public override async getByObligationId(
    request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ) {
    const wrongDigest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
    const wrongBackend: BackendIdentity = {
      ...AUTHORITATIVE_TEST_BACKEND,
      id: "different-release-backend",
    };
    const evidence: DecryptionKeyReleaseEvidence = {
      contract_version: request.contract_version,
      registry_version: request.registry.registry_version,
      registry_namespace: request.registry.registry_namespace,
      obligation_id: request.obligation_id,
      binding_digest: this.mode === "statement" || this.mode === "encrypted" ? wrongDigest : request.binding_digest,
      idempotency_key: this.mode === "key" ? `zkcp-release-v1:${"0".repeat(64)}` : request.idempotency_key,
      backend_id: this.mode === "backend" ? wrongBackend.id : request.backend.id,
      backend_version: this.mode === "backend" ? wrongBackend.version : request.backend.version,
      backend_artifact_digest: this.mode === "artifact"
        ? wrongDigest
        : request.backend.artifact_digest,
      backend_authority: request.backend.authority,
    };
    const release: DecryptionKeyReleaseResult = {
      status: "released",
      backend: this.mode === "backend" ? wrongBackend : request.backend,
      provenance: "production",
      decryptionKey: "corrupt-release-key",
      evidence: canonicalJson(evidence),
    };
    return {
      status: "found" as const,
      registry: request.registry,
      obligation_id: request.obligation_id,
      binding_digest: request.binding_digest,
      idempotency_key: request.idempotency_key,
      backend: this.mode === "backend" ? wrongBackend : request.backend,
      provenance: "production" as const,
      release,
    };
  }

  public override async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    throw new Error("release must not run when durable evidence is mismatched");
  }
}

type ForgedLookupMode = "obligation" | "binding" | "evidence";

class ForgedLookupKeyReleaser extends DurableFixtureKeyReleaser {
  public releaseCalls = 0;

  public constructor(private readonly mode: ForgedLookupMode) {
    super();
  }

  public override async getByObligationId(
    request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ) {
    const forgedObligationId = `zkcp-obligation-v1:${"0".repeat(64)}`;
    const forgedBindingDigest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Digest;
    const release: DecryptionKeyReleaseResult = {
      status: "released",
      backend: request.backend,
      provenance: "production",
      decryptionKey: "forged-release-key",
      evidence: releaseEvidenceFor(request, this.mode === "evidence"
        ? { obligation_id: forgedObligationId }
        : undefined),
    };
    return {
      status: "found" as const,
      registry: request.registry,
      obligation_id: this.mode === "obligation" ? forgedObligationId : request.obligation_id,
      binding_digest: this.mode === "binding" ? forgedBindingDigest : request.binding_digest,
      idempotency_key: request.idempotency_key,
      backend: request.backend,
      provenance: "production" as const,
      release,
    };
  }

  public override async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    this.releaseCalls += 1;
    throw new Error("release must not run after forged durable evidence");
  }
}

class HostileEvidenceLookupKeyReleaser extends DurableFixtureKeyReleaser {
  public lookupCalls = 0;
  public releaseCalls = 0;

  public constructor(
    private readonly hostileEvidence: unknown | ((request: Readonly<DecryptionKeyReleaseLookupRequest>) => unknown),
  ) {
    super();
  }

  public override async getByObligationId(
    request: Readonly<DecryptionKeyReleaseLookupRequest>,
  ) {
    this.lookupCalls += 1;
    const evidence = typeof this.hostileEvidence === "function"
      ? this.hostileEvidence(request)
      : this.hostileEvidence;
    return {
      status: "found" as const,
      registry: request.registry,
      obligation_id: request.obligation_id,
      binding_digest: request.binding_digest,
      idempotency_key: request.idempotency_key,
      backend: request.backend,
      provenance: "production" as const,
      release: {
        status: "released" as const,
        backend: request.backend,
        provenance: "production" as const,
        decryptionKey: "hostile-release-key",
        evidence: evidence as string,
      },
    };
  }

  public override async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    this.releaseCalls += 1;
    throw new Error("release must not run for hostile evidence");
  }
}

class ThrowingZKVerifier implements ZKProofVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(): Promise<never> {
    throw new Error("fixture verifier failure");
  }
}

class OversizedResultZKVerifier extends AuthoritativeFixtureVerifier {
  public override async verify(request: VerifierRequest) {
    return createVerificationResult({
      status: "valid",
      request_digest: await digestVerifierRequest(request),
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
      error: "v".repeat(VERIFIER_RESOURCE_LIMITS.maxErrorChars + 1),
    });
  }
}

class ThrowingOversizedZKVerifier implements ZKProofVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(): Promise<never> {
    throw new Error("v".repeat(VERIFIER_RESOURCE_LIMITS.maxErrorChars + 1));
  }
}

class ThrowingPaymentMonitor implements OnChainMonitor {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async watchForPayment(): Promise<never> {
    throw new Error("fixture observer failure");
  }
}

class OversizedPaymentMonitor implements OnChainMonitor {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async watchForPayment(): Promise<PaymentObservationResult> {
    return {
      contract_version: "conxian.verifier.v1",
      status: "not_observed",
      detected: false,
      provenance: "production",
      failure_code: "payment_not_observed",
      error: "p".repeat(VERIFIER_RESOURCE_LIMITS.maxErrorChars + 1),
    };
  }
}

class ThrowingOversizedPaymentMonitor implements OnChainMonitor {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async watchForPayment(): Promise<never> {
    throw new Error("p".repeat(VERIFIER_RESOURCE_LIMITS.maxErrorChars + 1));
  }
}

class NullKeyReleaser extends DurableFixtureKeyReleaser {
  public releaseCount = 0;

  public override async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    this.releaseCount += 1;
    return null as never;
  }
}

class OversizedKeyReleaser extends DurableFixtureKeyReleaser {
  public override async release(_request: Readonly<DecryptionKeyReleaseRequest>) {
    return {
      status: "rejected" as const,
      backend: this.backendIdentity,
      provenance: "production" as const,
      failure_code: "internal_error" as const,
      error: "k".repeat(VERIFIER_RESOURCE_LIMITS.maxErrorChars + 1),
    };
  }
}

class ThrowingOversizedKeyReleaser extends DurableFixtureKeyReleaser {
  public override async release(_request: Readonly<DecryptionKeyReleaseRequest>): Promise<never> {
    throw new Error("k".repeat(VERIFIER_RESOURCE_LIMITS.maxErrorChars + 1));
  }
}

class BlockingKeyReleaser extends AuthoritativeFixtureKeyReleaser {
  private resolveReleaseStarted!: () => void;
  private resolveReleaseGate!: () => void;
  public readonly releaseStarted = new Promise<void>((resolve) => {
    this.resolveReleaseStarted = resolve;
  });
  private readonly releaseGate = new Promise<void>((resolve) => {
    this.resolveReleaseGate = resolve;
  });

  public override async release(request: Readonly<DecryptionKeyReleaseRequest>) {
    const retained = this.existingOrConflict(request);
    if (retained !== undefined) return retained;
    this.releaseCount += 1;
    this.resolveReleaseStarted();
    await this.releaseGate;
    const release = this.successfulRelease(request);
    this.storeRelease(request, release);
    return release;
  }

  public unblock(): void {
    this.resolveReleaseGate();
  }
}

class ClockInvalidatingKeyReleaser extends AuthoritativeFixtureKeyReleaser {
  public constructor(private readonly invalidateClock: () => void) {
    super();
  }

  public override async release(request: Readonly<DecryptionKeyReleaseRequest>) {
    const retained = this.existingOrConflict(request);
    if (retained !== undefined) return retained;
    this.releaseCount += 1;
    this.invalidateClock();
    const release = this.successfulRelease(request);
    this.storeRelease(request, release);
    return release;
  }
}

class SentinelProductionVerifier implements ZKProofVerifier {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async verify(request: VerifierRequest) {
    return createVerificationResult({
      status: "valid",
      request_digest: await digestVerifierRequest(request),
      backend: UNAVAILABLE_BACKEND,
      provenance: "production",
    });
  }
}

class SentinelProductionMonitor implements OnChainMonitor {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async watchForPayment(request: Parameters<OnChainMonitor["watchForPayment"]>[0]): Promise<PaymentObservationResult> {
    const observation = await createPaymentObservation({
      request,
      txid: "tx-unavailable-sentinel",
      amount: request.expected_amount,
      confirmations: 6,
      observer: UNAVAILABLE_BACKEND,
      provenance: "production",
    });
    return {
      contract_version: "conxian.verifier.v1",
      status: "observed",
      detected: true,
      provenance: "production",
      observation,
    };
  }
}

class SentinelProductionKeyReleaser extends DurableFixtureKeyReleaser {
  public constructor() {
    super(UNAVAILABLE_BACKEND);
  }

  public override async release(request: Readonly<DecryptionKeyReleaseRequest>) {
    return {
      status: "released" as const,
      backend: UNAVAILABLE_BACKEND,
      provenance: "production" as const,
      decryptionKey: "sentinel-must-not-release",
      evidence: releaseEvidenceFor(request),
    };
  }
}

describe("ZKCPBridge fail-closed boundary", () => {
  it("derives one stable obligation across mutable terms but separates payload or recipient changes", async () => {
    const genericRequest = await makeVerifierRequest();
    const base = await makeIntentInput(genericRequest, "zkcp-obligation-original");
    const original = await deriveZKCPKeyReleaseObligationId(base);
    const rehydrated = await deriveZKCPKeyReleaseObligationId({
      id: "zkcp-obligation-rehydrated",
      encryptedDataHash: base.encryptedDataHash,
      sellerAddress: base.sellerAddress,
      buyerAddress: base.buyerAddress,
      amount: 2_000,
      network: "bitcoin-testnet",
    } as Parameters<typeof deriveZKCPKeyReleaseObligationId>[0]);
    const changedPayload = await deriveZKCPKeyReleaseObligationId({
      ...base,
      encryptedDataHash: "sha256:7777777777777777777777777777777777777777777777777777777777777777" as Digest,
    });
    const changedRecipient = await deriveZKCPKeyReleaseObligationId({
      ...base,
      buyerAddress: "bc1qfixture-other-buyer",
    });

    expect(original).toMatch(/^zkcp-obligation-v1:[0-9a-f]{64}$/);
    expect(rehydrated).toBe(original);
    expect(changedPayload).not.toBe(original);
    expect(changedRecipient).not.toBe(original);
  });

  it("requires an explicitly injected backend and returns unavailable", async () => {
    const genericRequest = await makeVerifierRequest();
    const input = await makeIntentInput(genericRequest, "zkcp-unavailable");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    bridge.initializeIntent(input);

    const result = await bridge.verifyProof(input.id, request);

    expect(result.verified).toBe(false);
    expect(result.status).toBe("unavailable");
    expect(result.failure_code).toBe("backend_unavailable");
    expect(bridge.getIntent(input.id)?.status).toBe("unsupported");
  });

  it("rejects a deterministic simulated valid-looking verifier result", async () => {
    const { bridge, request, input } = await setup();

    const result = await bridge.verifyProof(input.id, request);

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("simulated_result");
    expect(result.provenance).toBe("simulated");
    expect(bridge.getIntent(input.id)?.status).toBe("failed");
  });

  it("rejects a production-looking result from a non-authoritative placeholder backend", async () => {
    class PlaceholderVerifier extends DeterministicFixtureVerifier {
      public async verify(request: VerifierRequest) {
        return createVerificationResult({
          status: "valid",
          request_digest: await digestVerifierRequest(request),
          backend: this.backendIdentity,
          provenance: "production",
        });
      }
    }

    const { bridge, request, input } = await setup(new PlaceholderVerifier());
    const result = await bridge.verifyProof(input.id, request);

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("backend_mismatch");
    expect(bridge.getIntent(input.id)?.status).toBe("failed");
  });

  it("rejects production-looking results from the unavailable sentinel", async () => {
    const genericRequest = await makeVerifierRequest({ backend: UNAVAILABLE_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-unavailable-sentinel");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    const bridge = new ZKCPBridge(
      new SentinelProductionVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    bridge.initializeIntent(input);

    const result = await bridge.verifyProof(input.id, request);

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("backend_mismatch");
    expect(bridge.getIntent(input.id)?.status).toBe("failed");
  });

  it("rejects wrong keys, curves, and circuits through the bound policy fixture", async () => {
    const wrongKeyCase = await setup();
    const wrongKeyRequest = await bindZKCPRequestToIntent({
      ...wrongKeyCase.request,
      verification_key: {
        ...wrongKeyCase.request.verification_key,
        digest: "sha256:9999999999999999999999999999999999999999999999999999999999999999",
      },
    }, wrongKeyCase.input);
    expect((await wrongKeyCase.bridge.verifyProof(wrongKeyCase.input.id, wrongKeyRequest)).failure_code)
      .toBe("verification_key_mismatch");

    const genericWrongCurve = await makeVerifierRequest({ curve: "secp256k1" });
    const wrongCurveInput = await makeIntentInput(genericWrongCurve, "zkcp-wrong-curve");
    const wrongCurveRequest = await bindZKCPRequestToIntent(genericWrongCurve, wrongCurveInput);
    const wrongCurveBridge = new ZKCPBridge(
      new DeterministicFixtureVerifier("bn254"),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    wrongCurveBridge.initializeIntent(wrongCurveInput);
    expect((await wrongCurveBridge.verifyProof(wrongCurveInput.id, wrongCurveRequest)).failure_code)
      .toBe("curve_mismatch");

    const wrongCircuitCase = await setup();
    const wrongCircuitRequest = await bindZKCPRequestToIntent({
      ...wrongCircuitCase.request,
      circuit: {
        ...wrongCircuitCase.request.circuit,
        digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    }, wrongCircuitCase.input);
    expect((await wrongCircuitCase.bridge.verifyProof(wrongCircuitCase.input.id, wrongCircuitRequest)).failure_code)
      .toBe("circuit_mismatch");
  });

  it("rejects mutated statement, domain, public-input, and proof bindings", async () => {
    const statementCase = await setup();
    expect((await statementCase.bridge.verifyProof(statementCase.input.id, {
      ...statementCase.request,
      statement_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    })).failure_code).toBe("statement_mismatch");

    const domainCase = await setup();
    expect((await domainCase.bridge.verifyProof(domainCase.input.id, {
      ...domainCase.request,
      domain_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    })).failure_code).toBe("domain_mismatch");

    const publicInputCase = await setup();
    expect((await publicInputCase.bridge.verifyProof(publicInputCase.input.id, {
      ...publicInputCase.request,
      public_inputs: [...publicInputCase.request.public_inputs].map((input, index) => index === 1
        ? { ...input, name: "buyer_address" }
        : input),
    })).failure_code).toBe("public_input_mismatch");

    const proofCase = await setup();
    expect((await proofCase.bridge.verifyProof(proofCase.input.id, {
      ...proofCase.request,
      proof: { ...proofCase.request.proof, bytes: "cd".repeat(64) },
    })).failure_code).toBe("proof_digest_mismatch");
  });

  it("rejects malformed encodings before an adapter can run", async () => {
    const { bridge, request, input } = await setup();
    const malformed = {
      ...request,
      proof: { ...request.proof, encoding: "base64" as const, bytes: "not-base64" },
    };

    const result = await bridge.verifyProof(input.id, malformed);

    expect(result.failure_code).toBe("malformed_encoding");
    expect(result.verified).toBe(false);
  });

  it("returns immutable snapshots and keeps authoritative evidence internal", async () => {
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      new AuthoritativeFixtureKeyReleaser(),
    );
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-immutable");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    bridge.initializeIntent(input);

    await bridge.verifyProof(input.id, request);
    await bridge.watchForPayment(input.id);
    const snapshot = bridge.getIntent(input.id) as Record<string, unknown>;
    expect(() => {
      snapshot.status = "failed";
      (snapshot.paymentObservation as Record<string, unknown>).txid = "attacker-txid";
    }).toThrow();

    const finalized = await bridge.finalizeSettlement(input.id);
    expect(finalized.finalized).toBe(true);
    expect(finalized.paymentHash).toBe("tx-authoritative-fixture");
    expect(finalized.decryptionKey).toBe("fixture-release-key");
  });

  it("serializes concurrent verification and prevents a stale terminal overwrite", async () => {
    const verifier = new DeferredZKVerifier();
    const bridge = new ZKCPBridge(
      verifier,
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-verify-race");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    bridge.initializeIntent(input);

    const first = bridge.verifyProof(input.id, request);
    await verifier.started;
    const replay = bridge.verifyProof(input.id, request);

    expect(verifier.calls).toBe(1);
    verifier.release();
    const [firstResult, replayResult] = await Promise.all([first, replay]);

    expect(firstResult.status).toBe("valid");
    expect(replayResult.failure_code).toBe("malformed_request");
    expect(bridge.getIntent(input.id)?.status).toBe("verified");
  });

  it("serializes payment watch and finalization without regressing terminal state", async () => {
    const monitor = new DeferredPaymentMonitor();
    const keyReleaser = new AuthoritativeFixtureKeyReleaser();
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      monitor,
      keyReleaser,
    );
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-watch-finalize-race");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    bridge.initializeIntent(input);
    expect((await bridge.verifyProof(input.id, request)).status).toBe("valid");

    const firstWatch = bridge.watchForPayment(input.id);
    await monitor.started;
    const replayWatch = bridge.watchForPayment(input.id);
    const finalization = bridge.finalizeSettlement(input.id);

    expect(monitor.calls).toBe(1);
    monitor.release();
    const [firstResult, replayResult, finalized] = await Promise.all([
      firstWatch,
      replayWatch,
      finalization,
    ]);

    expect(firstResult.status).toBe("observed");
    expect(replayResult.status).toBe("observed");
    expect(finalized.finalized).toBe(true);
    expect(keyReleaser.releaseCount).toBe(1);
    expect(keyReleaser.lookupKeys[0]).toBe(keyReleaser.releaseKeys[0]);
    expect(bridge.getIntent(input.id)?.status).toBe("finalized");
  });

  it("rejects unavailable sentinel payment and key-release authority", async () => {
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-sentinel-payment");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    const paymentBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new SentinelProductionMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    paymentBridge.initializeIntent(input);
    await paymentBridge.verifyProof(input.id, request);

    const observed = await paymentBridge.watchForPayment(input.id);
    expect(observed.detected).toBe(false);
    expect(observed.status).toBe("mismatch");
    expect(observed.failure_code).toBe("payment_mismatch");
    expect(paymentBridge.getIntent(input.id)?.status).toBe("verified");

    const keyBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      new SentinelProductionKeyReleaser(),
    );
    keyBridge.initializeIntent(input);
    await keyBridge.verifyProof(input.id, request);
    await keyBridge.watchForPayment(input.id);

    const finalized = await keyBridge.finalizeSettlement(input.id);
    expect(finalized.finalized).toBe(false);
    expect(finalized.status).toBe("unavailable");
    expect(finalized.failure_code).toBe("decryption_key_unavailable");
    expect(keyBridge.getIntent(input.id)?.status).toBe("paid");
  });

  it("normalizes throwing and malformed adapters without advancing state", async () => {
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-adapter-failures");
    const request = await bindZKCPRequestToIntent(genericRequest, input);

    const verifierBridge = new ZKCPBridge(
      new ThrowingZKVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    verifierBridge.initializeIntent(input);
    const verification = await verifierBridge.verifyProof(input.id, request);
    expect(verification.failure_code).toBe("internal_error");
    expect(verifierBridge.getIntent(input.id)?.status).toBe("failed");

    const observerBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new ThrowingPaymentMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    const observerInput = { ...input, id: "zkcp-observer-failure" };
    const observerRequest = await bindZKCPRequestToIntent(genericRequest, observerInput);
    observerBridge.initializeIntent(observerInput);
    await observerBridge.verifyProof(observerInput.id, observerRequest);
    const observed = await observerBridge.watchForPayment(observerInput.id);
    expect(observed.failure_code).toBe("internal_error");
    expect(observerBridge.getIntent(observerInput.id)?.status).toBe("verified");

    const keyBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      new NullKeyReleaser(),
    );
    const keyInput = { ...input, id: "zkcp-key-failure" };
    const keyRequest = await bindZKCPRequestToIntent(genericRequest, keyInput);
    keyBridge.initializeIntent(keyInput);
    await keyBridge.verifyProof(keyInput.id, keyRequest);
    await keyBridge.watchForPayment(keyInput.id);
    const finalized = await keyBridge.finalizeSettlement(keyInput.id);
    expect(finalized.failure_code).toBe("internal_error");
    expect(keyBridge.getIntent(keyInput.id)?.status).toBe("paid");
  });

  it("reconciles a durable release after local result handling loses the response", async () => {
    const keyReleaser = new CommitThenMalformedKeyReleaser();
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-post-dispatch-malformed-release",
      () => 1_800_000_000_000,
      keyReleaser,
    );

    const first = await bridge.finalizeSettlement(input.id);
    const retry = await bridge.finalizeSettlement(input.id);

    expect(first.finalized).toBe(false);
    expect(first.failure_code).toBe("internal_error");
    expect(retry.finalized).toBe(true);
    expect(retry.decryptionKey).toBe("fixture-release-key");
    expect(keyReleaser.releaseCount).toBe(1);
    expect(keyReleaser.lookupKeys.length).toBe(2);
    expect(keyReleaser.lookupKeys[0]).toBe(keyReleaser.lookupKeys[1]);
    expect(bridge.getIntent(input.id)?.status).toBe("finalized");
  });

  it("reconstructs after process loss and reuses the same durable key exactly once", async () => {
    const records = new Map<string, FixtureDurableReleaseRecord>();
    const firstReleaser = new CommitThenTimeoutKeyReleaser(records);
    const firstSetup = await setupAuthoritativeSettlement(
      "zkcp-process-loss-before-local-commit",
      () => 1_800_000_000_000,
      firstReleaser,
    );

    const first = await firstSetup.bridge.finalizeSettlement(firstSetup.input.id);
    expect(first.finalized).toBe(false);
    expect(first.failure_code).toBe("key_release_ambiguous");
    expect(firstSetup.bridge.getIntent(firstSetup.input.id)?.status).toBe("paid");
    expect(firstReleaser.releaseCount).toBe(1);
    expect(firstReleaser.lookupKeys[0]).toBe(firstReleaser.releaseKeys[0]);

    const secondReleaser = new AuthoritativeFixtureKeyReleaser(records);
    const secondSetup = await setupAuthoritativeSettlement(
      "zkcp-process-loss-before-local-commit",
      () => 1_900_000_000_000,
      secondReleaser,
    );
    const second = await secondSetup.bridge.finalizeSettlement(secondSetup.input.id);

    expect(second.finalized).toBe(true);
    expect(second.decryptionKey).toBe("fixture-release-key");
    expect(secondReleaser.releaseCount).toBe(0);
    expect(firstReleaser.lookupKeys[0]).toBe(secondReleaser.lookupKeys[0]);
    expect(firstReleaser.lookupKeys[0]).toMatch(/^zkcp-release-v1:[0-9a-f]{64}$/);
    expect(firstReleaser.obligationLookupKeys[0]).toBe(secondReleaser.obligationLookupKeys[0]);
    expect(firstReleaser.obligationLookupKeys[0]).toMatch(/^zkcp-obligation-v1:[0-9a-f]{64}$/);
    expect(secondSetup.bridge.getIntent(secondSetup.input.id)?.status).toBe("finalized");
  });

  it("uses one shared obligation across changed terms, payment txid, and network without a second effect", async () => {
    const records = new Map<string, FixtureDurableReleaseRecord>();
    const firstReleaser = new CommitThenTimeoutKeyReleaser(records);
    const firstSetup = await setupAuthoritativeSettlement(
      "zkcp-rehydrated-obligation-first",
      () => 1_800_000_000_000,
      firstReleaser,
      { monitor: new AuthoritativeFixtureMonitor("tx-original-payment") },
    );

    const first = await firstSetup.bridge.finalizeSettlement(firstSetup.input.id);
    expect(first.finalized).toBe(false);
    expect(first.failure_code).toBe("key_release_ambiguous");
    expect(firstReleaser.releaseCount).toBe(1);

    const secondReleaser = new AuthoritativeFixtureKeyReleaser(records);
    const secondSetup = await setupAuthoritativeSettlement(
      "zkcp-rehydrated-obligation-second",
      () => 1_900_000_000_000,
      secondReleaser,
      {
        input: {
          amount: 2_000,
          network: "bitcoin-testnet",
        },
        monitor: new AuthoritativeFixtureMonitor("tx-rehydrated-payment"),
      },
    );

    const second = await secondSetup.bridge.finalizeSettlement(secondSetup.input.id);

    expect(second.finalized).toBe(false);
    expect(second.failure_code).toBe("key_release_obligation_conflict");
    expect(secondReleaser.releaseCount).toBe(0);
    expect(firstReleaser.obligationLookupKeys[0]).toBe(secondReleaser.obligationLookupKeys[0]);
    expect(firstReleaser.lookupKeys[0]).not.toBe(secondReleaser.lookupKeys[0]);
    expect(firstSetup.request.statement_digest).not.toBe(secondSetup.request.statement_digest);
    expect(secondSetup.bridge.getIntent(secondSetup.input.id)?.status).toBe("paid");
  });

  it("fails closed on backend artifact rotation while keeping the pinned registry namespace", async () => {
    const records = new Map<string, FixtureDurableReleaseRecord>();
    const firstReleaser = new AuthoritativeFixtureKeyReleaser(records);
    const firstSetup = await setupAuthoritativeSettlement(
      "zkcp-backend-rotation",
      () => 1_800_000_000_000,
      firstReleaser,
    );
    expect((await firstSetup.bridge.finalizeSettlement(firstSetup.input.id)).finalized).toBe(true);

    const rotatedReleaser = new AuthoritativeFixtureKeyReleaser(records, ROTATED_RELEASE_BACKEND);
    const rotatedSetup = await setupAuthoritativeSettlement(
      "zkcp-backend-rotation",
      () => 1_900_000_000_000,
      rotatedReleaser,
    );
    const rotated = await rotatedSetup.bridge.finalizeSettlement(rotatedSetup.input.id);

    expect(rotated.finalized).toBe(false);
    expect(rotated.failure_code).toBe("key_release_obligation_conflict");
    expect(rotatedReleaser.releaseCount).toBe(0);
    expect(rotatedSetup.bridge.getIntent(rotatedSetup.input.id)?.status).toBe("paid");
  });

  it("allows two bridge instances to reconcile one shared atomic obligation claim", async () => {
    const records = new Map<string, FixtureDurableReleaseRecord>();
    const firstReleaser = new AuthoritativeFixtureKeyReleaser(records);
    const secondReleaser = new AuthoritativeFixtureKeyReleaser(records);
    const firstSetup = await setupAuthoritativeSettlement(
      "zkcp-shared-registry-bridge-one",
      () => 1_800_000_000_000,
      firstReleaser,
    );
    const secondSetup = await setupAuthoritativeSettlement(
      "zkcp-shared-registry-bridge-one",
      () => 1_900_000_000_000,
      secondReleaser,
    );

    const [first, second] = await Promise.all([
      firstSetup.bridge.finalizeSettlement(firstSetup.input.id),
      secondSetup.bridge.finalizeSettlement(secondSetup.input.id),
    ]);

    expect(first.finalized).toBe(true);
    expect(second.finalized).toBe(true);
    expect(firstReleaser.releaseCount + secondReleaser.releaseCount).toBe(1);
    expect(firstReleaser.obligationLookupKeys[0]).toBe(secondReleaser.obligationLookupKeys[0]);
    expect(firstReleaser.lookupKeys[0]).toBe(secondReleaser.lookupKeys[0]);
  });

  it("rejects a releaser with drifted registry metadata before durable lookup or release", async () => {
    const keyReleaser = new AuthoritativeFixtureKeyReleaser(
      new Map(),
      AUTHORITATIVE_TEST_BACKEND,
      DRIFTED_REGISTRY_CAPABILITIES,
    );
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-drifted-registry",
      () => 1_800_000_000_000,
      keyReleaser,
      { bridgeOptions: { keyReleaseRegistry: ZKCP_KEY_RELEASE_REGISTRY } },
    );

    const result = await bridge.finalizeSettlement(input.id);

    expect(result.finalized).toBe(false);
    expect(result.status).toBe("unavailable");
    expect(result.failure_code).toBe("key_release_registry_mismatch");
    expect(keyReleaser.lookupKeys).toHaveLength(0);
    expect(keyReleaser.releaseCount).toBe(0);
  });

  it("rejects a bridge configured with a noncanonical registry namespace", () => {
    expect(() => new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      new AuthoritativeFixtureKeyReleaser(),
      {
        keyReleaseRegistry: {
          registry_version: ZKCP_KEY_RELEASE_REGISTRY.registry_version,
          registry_namespace: "conxian.zkcp.key-release.obligations.drifted.v1",
        },
      },
    )).toThrow("canonical v1 registry");
  });

  it("fails before release when durable lookup errors", async () => {
    const keyReleaser = new LookupErrorKeyReleaser();
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-durable-lookup-error",
      () => 1_800_000_000_000,
      keyReleaser,
    );

    const result = await bridge.finalizeSettlement(input.id);

    expect(result.finalized).toBe(false);
    expect(result.failure_code).toBe("key_release_lookup_failed");
    expect(keyReleaser.lookupCalls).toBe(1);
    expect(keyReleaser.releaseCount).toBe(0);
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
  });

  it("normalizes any durable conflict status to the typed obligation conflict", async () => {
    const keyReleaser = new MisclassifiedConflictKeyReleaser();
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-misclassified-conflict",
      () => 1_800_000_000_000,
      keyReleaser,
    );

    const result = await bridge.finalizeSettlement(input.id);

    expect(result.finalized).toBe(false);
    expect(result.failure_code).toBe("key_release_obligation_conflict");
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
  });

  it("rejects a key-release backend without durable capability metadata", async () => {
    const keyReleaser = new MissingDurableCapabilityKeyReleaser();
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-missing-durable-capability",
      () => 1_800_000_000_000,
      keyReleaser,
    );

    const result = await bridge.finalizeSettlement(input.id);

    expect(result.finalized).toBe(false);
    expect(result.status).toBe("unavailable");
    expect(result.failure_code).toBe("key_release_capability_missing");
    expect(keyReleaser.lookupCalls).toBe(0);
    expect(keyReleaser.releaseCalls).toBe(0);
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
  });

  it.each([
    ["key", "key_release_idempotency_mismatch"],
    ["statement", "key_release_obligation_conflict"],
    ["encrypted", "key_release_obligation_conflict"],
    ["backend", "key_release_backend_mismatch"],
    ["artifact", "key_release_backend_mismatch"],
  ] as const)("rejects durable evidence with a mismatched %s binding", async (mode, failureCode) => {
    const keyReleaser = new CorruptingLookupKeyReleaser(mode);
    const { bridge, input } = await setupAuthoritativeSettlement(
      `zkcp-mismatched-release-${mode}`,
      () => 1_800_000_000_000,
      keyReleaser,
    );

    const result = await bridge.finalizeSettlement(input.id);

    expect(result.finalized).toBe(false);
    expect(result.failure_code).toBe(failureCode);
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
  });

  it.each([
    ["obligation", "key_release_obligation_conflict"],
    ["binding", "key_release_obligation_conflict"],
    ["evidence", "key_release_obligation_conflict"],
  ] as const)("rejects forged durable %s identity without dispatch", async (mode, failureCode) => {
    const keyReleaser = new ForgedLookupKeyReleaser(mode);
    const { bridge, input } = await setupAuthoritativeSettlement(
      `zkcp-forged-release-${mode}`,
      () => 1_800_000_000_000,
      keyReleaser,
    );

    const result = await bridge.finalizeSettlement(input.id);

    expect(result.finalized).toBe(false);
    expect(result.failure_code).toBe(failureCode);
    expect(keyReleaser.releaseCalls).toBe(0);
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
  });

  it("rejects hostile proxy and cyclic evidence without traversing adapter-owned objects", async () => {
    let trapCalls = 0;
    const hostileProxy = new Proxy({}, {
      get() {
        trapCalls += 1;
        throw new Error("hostile evidence getter invoked");
      },
      ownKeys() {
        trapCalls += 1;
        throw new Error("hostile evidence ownKeys invoked");
      },
      getOwnPropertyDescriptor() {
        trapCalls += 1;
        throw new Error("hostile evidence descriptor invoked");
      },
    });
    const proxyReleaser = new HostileEvidenceLookupKeyReleaser(hostileProxy);
    const proxySetup = await setupAuthoritativeSettlement(
      "zkcp-hostile-proxy-evidence",
      () => 1_800_000_000_000,
      proxyReleaser,
    );
    const proxyResult = await proxySetup.bridge.finalizeSettlement(proxySetup.input.id);

    const cyclicEvidence: Record<string, unknown> = {};
    cyclicEvidence.self = cyclicEvidence;
    const cyclicReleaser = new HostileEvidenceLookupKeyReleaser(cyclicEvidence);
    const cyclicSetup = await setupAuthoritativeSettlement(
      "zkcp-hostile-cyclic-evidence",
      () => 1_800_000_000_000,
      cyclicReleaser,
    );
    const cyclicResult = await cyclicSetup.bridge.finalizeSettlement(cyclicSetup.input.id);

    const accessorEvidence: Record<string, unknown> = {};
    Object.defineProperty(accessorEvidence, "secret", {
      enumerable: true,
      get() {
        trapCalls += 1;
        throw new Error("hostile evidence accessor invoked");
      },
    });
    const accessorReleaser = new HostileEvidenceLookupKeyReleaser(accessorEvidence);
    const accessorSetup = await setupAuthoritativeSettlement(
      "zkcp-hostile-accessor-evidence",
      () => 1_800_000_000_000,
      accessorReleaser,
    );
    const accessorResult = await accessorSetup.bridge.finalizeSettlement(accessorSetup.input.id);

    expect(proxyResult.failure_code).toBe("internal_error");
    expect(cyclicResult.failure_code).toBe("internal_error");
    expect(accessorResult.failure_code).toBe("internal_error");
    expect(proxyReleaser.releaseCalls).toBe(0);
    expect(cyclicReleaser.releaseCalls).toBe(0);
    expect(accessorReleaser.releaseCalls).toBe(0);
    expect(trapCalls).toBe(0);
  });

  it("bounds canonical evidence before parsing and rejects deep or extra fields", async () => {
    const extraReleaser = new HostileEvidenceLookupKeyReleaser((request: Readonly<DecryptionKeyReleaseLookupRequest>) => {
      const evidence = JSON.parse(releaseEvidenceFor(request)) as Record<string, unknown>;
      evidence.extra = "must-not-cross";
      return canonicalJson(evidence);
    });
    const extraSetup = await setupAuthoritativeSettlement(
      "zkcp-extra-evidence-field",
      () => 1_800_000_000_000,
      extraReleaser,
    );

    const arrayReleaser = new HostileEvidenceLookupKeyReleaser((request: Readonly<DecryptionKeyReleaseLookupRequest>) => {
      const evidence = JSON.parse(releaseEvidenceFor(request)) as Record<string, unknown>;
      evidence.extra = ["arrays-must-not-cross"];
      return canonicalJson(evidence);
    });
    const arraySetup = await setupAuthoritativeSettlement(
      "zkcp-array-evidence",
      () => 1_800_000_000_000,
      arrayReleaser,
    );

    const deepReleaser = new HostileEvidenceLookupKeyReleaser((request: Readonly<DecryptionKeyReleaseLookupRequest>) => {
      const evidence = JSON.parse(releaseEvidenceFor(request)) as Record<string, unknown>;
      let nested: unknown = "leaf";
      for (let index = 0; index <= VERIFIER_ATTESTATION_LIMITS.maxDepth; index += 1) {
        nested = { nested };
      }
      evidence.nested = nested;
      return canonicalJson(evidence);
    });
    const deepSetup = await setupAuthoritativeSettlement(
      "zkcp-deep-evidence",
      () => 1_800_000_000_000,
      deepReleaser,
    );

    const largeReleaser = new HostileEvidenceLookupKeyReleaser(
      "x".repeat(VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedChars + 1),
    );
    const largeSetup = await setupAuthoritativeSettlement(
      "zkcp-large-evidence",
      () => 1_800_000_000_000,
      largeReleaser,
    );

    const [extraResult, arrayResult, deepResult, largeResult] = await Promise.all([
      extraSetup.bridge.finalizeSettlement(extraSetup.input.id),
      arraySetup.bridge.finalizeSettlement(arraySetup.input.id),
      deepSetup.bridge.finalizeSettlement(deepSetup.input.id),
      largeSetup.bridge.finalizeSettlement(largeSetup.input.id),
    ]);

    expect(extraResult.failure_code).toBe("key_release_evidence_mismatch");
    expect(arrayResult.failure_code).toBe("key_release_evidence_mismatch");
    expect(deepResult.failure_code).toBe("resource_limit_exceeded");
    expect(largeResult.failure_code).toBe("resource_limit_exceeded");
  });

  it("detaches evidence at the canonical string boundary before adapter mutation can persist", async () => {
    let mutableEvidence: Record<string, unknown> | undefined;
    const keyReleaser = new HostileEvidenceLookupKeyReleaser((request: Readonly<DecryptionKeyReleaseLookupRequest>) => {
      mutableEvidence = JSON.parse(releaseEvidenceFor(request)) as Record<string, unknown>;
      const canonical = canonicalJson(mutableEvidence);
      mutableEvidence.backend_id = "mutated-after-serialization";
      return canonical;
    });
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-mutated-evidence",
      () => 1_800_000_000_000,
      keyReleaser,
    );

    const result = await bridge.finalizeSettlement(input.id);

    expect(result.finalized).toBe(true);
    expect(result.decryptionKey).toBe("hostile-release-key");
    expect(mutableEvidence?.backend_id).toBe("mutated-after-serialization");
  });

  it("bounds over-limit verifier, payment, and key-release adapter errors", async () => {
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });

    const verifierInput = await makeIntentInput(genericRequest, "zkcp-over-limit-verifier");
    const verifierRequest = await bindZKCPRequestToIntent(genericRequest, verifierInput);
    const verifierBridge = new ZKCPBridge(
      new OversizedResultZKVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    verifierBridge.initializeIntent(verifierInput);
    const verifierResult = await verifierBridge.verifyProof(verifierInput.id, verifierRequest);
    expect(verifierResult.failure_code).toBe("resource_limit_exceeded");
    expect(verifierResult.error?.length).toBeLessThanOrEqual(VERIFIER_RESOURCE_LIMITS.maxErrorChars);

    const throwingVerifierInput = await makeIntentInput(genericRequest, "zkcp-over-limit-thrown-verifier");
    const throwingVerifierRequest = await bindZKCPRequestToIntent(genericRequest, throwingVerifierInput);
    const throwingVerifierBridge = new ZKCPBridge(
      new ThrowingOversizedZKVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    throwingVerifierBridge.initializeIntent(throwingVerifierInput);
    const throwingVerifierResult = await throwingVerifierBridge.verifyProof(
      throwingVerifierInput.id,
      throwingVerifierRequest,
    );
    expect(throwingVerifierResult.failure_code).toBe("resource_limit_exceeded");
    expect(throwingVerifierResult.error?.length).toBeLessThanOrEqual(VERIFIER_RESOURCE_LIMITS.maxErrorChars);

    const observerInput = await makeIntentInput(genericRequest, "zkcp-over-limit-observer");
    const observerRequest = await bindZKCPRequestToIntent(genericRequest, observerInput);
    const observerBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new OversizedPaymentMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    observerBridge.initializeIntent(observerInput);
    await observerBridge.verifyProof(observerInput.id, observerRequest);
    const observerResult = await observerBridge.watchForPayment(observerInput.id);
    expect(observerResult.failure_code).toBe("resource_limit_exceeded");
    expect(observerResult.error?.length).toBeLessThanOrEqual(VERIFIER_RESOURCE_LIMITS.maxErrorChars);

    const throwingObserverInput = await makeIntentInput(genericRequest, "zkcp-over-limit-thrown-observer");
    const throwingObserverRequest = await bindZKCPRequestToIntent(genericRequest, throwingObserverInput);
    const throwingObserverBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new ThrowingOversizedPaymentMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    throwingObserverBridge.initializeIntent(throwingObserverInput);
    await throwingObserverBridge.verifyProof(throwingObserverInput.id, throwingObserverRequest);
    const throwingObserverResult = await throwingObserverBridge.watchForPayment(throwingObserverInput.id);
    expect(throwingObserverResult.failure_code).toBe("resource_limit_exceeded");
    expect(throwingObserverResult.error?.length).toBeLessThanOrEqual(VERIFIER_RESOURCE_LIMITS.maxErrorChars);

    const keyInput = await makeIntentInput(genericRequest, "zkcp-over-limit-key");
    const keyRequest = await bindZKCPRequestToIntent(genericRequest, keyInput);
    const keyBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      new OversizedKeyReleaser(),
    );
    keyBridge.initializeIntent(keyInput);
    await keyBridge.verifyProof(keyInput.id, keyRequest);
    await keyBridge.watchForPayment(keyInput.id);
    const keyResult = await keyBridge.finalizeSettlement(keyInput.id);
    expect(keyResult.failure_code).toBe("resource_limit_exceeded");
    expect(keyResult.error?.length).toBeLessThanOrEqual(VERIFIER_RESOURCE_LIMITS.maxErrorChars);

    const throwingKeyInput = await makeIntentInput(genericRequest, "zkcp-over-limit-thrown-key");
    const throwingKeyRequest = await bindZKCPRequestToIntent(genericRequest, throwingKeyInput);
    const throwingKeyBridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      new ThrowingOversizedKeyReleaser(),
    );
    throwingKeyBridge.initializeIntent(throwingKeyInput);
    await throwingKeyBridge.verifyProof(throwingKeyInput.id, throwingKeyRequest);
    await throwingKeyBridge.watchForPayment(throwingKeyInput.id);
    const throwingKeyResult = await throwingKeyBridge.finalizeSettlement(throwingKeyInput.id);
    expect(throwingKeyResult.failure_code).toBe("resource_limit_exceeded");
    expect(throwingKeyResult.error?.length).toBeLessThanOrEqual(VERIFIER_RESOURCE_LIMITS.maxErrorChars);
  });

  it("rejects unsafe integer amounts before canonical settlement binding", async () => {
    const { bridge, input } = await setup();
    expect(() => bridge.initializeIntent({
      ...input,
      id: "zkcp-unsafe-amount",
      amount: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow("Malformed ZKCP intent bindings");
  });

  it("does not replay payment observation or key release after finalization", async () => {
    const keyReleaser = new AuthoritativeFixtureKeyReleaser();
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      keyReleaser,
    );
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-replay");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    bridge.initializeIntent(input);
    await bridge.verifyProof(input.id, request);
    await bridge.watchForPayment(input.id);

    const first = await bridge.finalizeSettlement(input.id);
    const repeatedPayment = await bridge.watchForPayment(input.id);
    const second = await bridge.finalizeSettlement(input.id);

    expect(first.finalized).toBe(true);
    expect(repeatedPayment.status).toBe("observed");
    expect(repeatedPayment.observation?.txid).toBe("tx-authoritative-fixture");
    expect(second.finalized).toBe(true);
    expect(keyReleaser.releaseCount).toBe(1);
    expect(bridge.getIntent(input.id)?.status).toBe("finalized");
  });

  it("rejects concurrent finalization while one key release is in flight", async () => {
    const keyReleaser = new BlockingKeyReleaser();
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      keyReleaser,
    );
    const genericRequest = await makeVerifierRequest({ backend: AUTHORITATIVE_TEST_BACKEND, provenance: "production" });
    const input = await makeIntentInput(genericRequest, "zkcp-concurrent-finalize");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    bridge.initializeIntent(input);
    await bridge.verifyProof(input.id, request);
    await bridge.watchForPayment(input.id);

    const first = bridge.finalizeSettlement(input.id);
    await keyReleaser.releaseStarted;
    const second = await bridge.finalizeSettlement(input.id);
    keyReleaser.unblock();
    const firstResult = await first;

    expect(second.finalized).toBe(false);
    expect(second.failure_code).toBe("internal_error");
    expect(firstResult.finalized).toBe(true);
    expect(keyReleaser.releaseCount).toBe(1);
  });

  it("fails before key-release dispatch for invalid clocks and allows one deliberate retry", async () => {
    const cases = [
      {
        label: "thrown",
        invalidate: (clock: { value: number; throwing: boolean }) => {
          clock.throwing = true;
        },
      },
      {
        label: "rollback",
        invalidate: (clock: { value: number; throwing: boolean }) => {
          clock.value -= 1;
        },
      },
      {
        label: "out-of-range",
        invalidate: (clock: { value: number; throwing: boolean }) => {
          clock.value = ZKCP_TIMESTAMP_MAX_MS + 1;
        },
      },
    ] as const;

    for (const testCase of cases) {
      const clock = { value: 1_800_000_000_000, throwing: false };
      const now = () => {
        if (clock.throwing) throw new Error(`fixture ${testCase.label} clock failure`);
        return clock.value;
      };
      const keyReleaser = new AuthoritativeFixtureKeyReleaser();
      const { bridge, input } = await setupAuthoritativeSettlement(
        `zkcp-clock-${testCase.label}`,
        now,
        keyReleaser,
      );

      testCase.invalidate(clock);
      const failed = await bridge.finalizeSettlement(input.id);
      expect(failed.finalized).toBe(false);
      expect(failed.failure_code).toBe(testCase.label === "out-of-range"
        ? "resource_limit_exceeded"
        : "internal_error");
      expect(keyReleaser.releaseCount).toBe(0);

      clock.throwing = false;
      clock.value = 1_800_000_000_001;
      const retried = await bridge.finalizeSettlement(input.id);
      expect(retried.finalized).toBe(true);
      expect(keyReleaser.releaseCount).toBe(1);
    }
  });

  it("does not read the clock after a deferred key release and retries terminally without redispatch", async () => {
    const clock = { value: 1_800_000_000_000, throwing: false };
    const keyReleaser = new BlockingKeyReleaser();
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-clock-deferred-release",
      () => {
        if (clock.throwing) throw new Error("clock must not be read after release dispatch");
        return clock.value;
      },
      keyReleaser,
    );

    const finalization = bridge.finalizeSettlement(input.id);
    await keyReleaser.releaseStarted;
    clock.throwing = true;
    keyReleaser.unblock();

    const first = await finalization;
    const retry = await bridge.finalizeSettlement(input.id);
    expect(first.finalized).toBe(true);
    expect(retry.finalized).toBe(true);
    expect(keyReleaser.releaseCount).toBe(1);
  });

  it("latches a successful release exactly once even when the releaser invalidates the clock", async () => {
    const clock = { value: 1_800_000_000_000, throwing: false };
    const keyReleaser = new ClockInvalidatingKeyReleaser(() => {
      clock.throwing = true;
    });
    const { bridge, input } = await setupAuthoritativeSettlement(
      "zkcp-clock-post-release",
      () => {
        if (clock.throwing) throw new Error("post-release clock access is forbidden");
        return clock.value;
      },
      keyReleaser,
    );

    const first = await bridge.finalizeSettlement(input.id);
    const retry = await bridge.finalizeSettlement(input.id);
    expect(first.finalized).toBe(true);
    expect(retry.finalized).toBe(true);
    expect(keyReleaser.releaseCount).toBe(1);
  });

  it("rejects duplicate intent ids instead of overwriting authoritative state", async () => {
    const { bridge, input } = await setup();
    expect(() => bridge.initializeIntent(input)).toThrow("already exists");
  });

  it("does not observe or finalize payment without production proof and payment evidence", async () => {
    const { bridge, input } = await setup();

    const observed = await bridge.watchForPayment(input.id);
    expect(observed.detected).toBe(false);
    expect(observed.failure_code).toBe("payment_not_observed");

    const finalized = await bridge.finalizeSettlement(input.id);
    expect(finalized.finalized).toBe(false);
    expect(finalized.failure_code).toBe("payment_not_observed");
    expect(finalized.decryptionKey).toBeUndefined();
  });

  it("keeps lifecycle records typed and does not emit a synthetic key", async () => {
    const { bridge, request, input } = await setup();
    const events: string[] = [];
    bridge.onEvent((event) => events.push(event.type));

    await bridge.verifyProof(input.id, request);
    expect(events).toContain("intent_failed");
    expect(bridge.getIntent(input.id)?.decryptionKey).toBeUndefined();
  });

  it("does not log an oversized direct-library intent id verbatim", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const oversizedId = "i".repeat(VERIFIER_RESOURCE_LIMITS.maxIdentifierChars + 1);
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );

    try {
      const result = await bridge.verifyProof(oversizedId, {});
      const logged = warning.mock.calls.flatMap((args) => args.map((value) => String(value))).join(" ");

      expect(result.failure_code).toBe("resource_limit_exceeded");
      expect(logged).toContain("unknown");
      expect(logged).not.toContain(oversizedId);
    } finally {
      warning.mockRestore();
    }
  });

  it("enforces active and retained-intent quotas without evicting active intents", async () => {
    let now = 1_800_000_000_000;
    const genericRequest = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });
    const firstInput = await makeIntentInput(genericRequest, "zkcp-capacity-1");
    const secondInput = await makeIntentInput(genericRequest, "zkcp-capacity-2");
    const thirdInput = await makeIntentInput(genericRequest, "zkcp-capacity-3");
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
      {
        now: () => now,
        maxActiveIntents: 2,
        maxTotalIntents: 2,
        terminalRetentionMs: 100,
      },
    );

    bridge.initializeIntent(firstInput);
    bridge.initializeIntent(secondInput);
    now += ZKCP_RETENTION_POLICY.terminalRetentionMs + 1;

    expect(() => bridge.initializeIntent(thirdInput)).toThrow("active-intent capacity is full");
    expect(bridge.getIntent(firstInput.id)?.status).toBe("pending");
    expect(bridge.getIntent(secondInput.id)?.status).toBe("pending");
  });

  it("evicts only expired terminal records and atomically removes their private evidence", async () => {
    let now = 1_800_000_000_000;
    const genericRequest = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });
    const input = await makeIntentInput(genericRequest, "zkcp-retention-terminal");
    const request = await bindZKCPRequestToIntent(genericRequest, input);
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      new AuthoritativeFixtureKeyReleaser(),
      { now: () => now, terminalRetentionMs: 1000 },
    );
    bridge.initializeIntent(input);
    expect((await bridge.verifyProof(input.id, request)).status).toBe("valid");
    expect((await bridge.watchForPayment(input.id)).status).toBe("observed");
    expect((await bridge.finalizeSettlement(input.id)).finalized).toBe(true);

    const internals = bridge as unknown as {
      verificationEvidence: Map<string, unknown>;
      paymentEvidence: Map<string, unknown>;
      keyReleaseEvidence: Map<string, unknown>;
    };
    expect(internals.verificationEvidence.has(input.id)).toBe(true);
    expect(internals.paymentEvidence.has(input.id)).toBe(true);
    expect(internals.keyReleaseEvidence.has(input.id)).toBe(true);

    now += 1001;
    expect(bridge.purgeExpiredTerminalRecords()).toBe(1);
    expect(bridge.getIntent(input.id)).toBeUndefined();
    expect(internals.verificationEvidence.has(input.id)).toBe(false);
    expect(internals.paymentEvidence.has(input.id)).toBe(false);
    expect(internals.keyReleaseEvidence.has(input.id)).toBe(false);
  });

  it("returns deterministic bounded ZKCP pages and rejects invalid pagination", async () => {
    const genericRequest = await makeVerifierRequest();
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
      { now: () => 1_800_000_000_000, maxActiveIntents: 4, maxTotalIntents: 4 },
    );
    for (const id of ["zkcp-page-3", "zkcp-page-1", "zkcp-page-2"]) {
      bridge.initializeIntent(await makeIntentInput(genericRequest, id));
    }

    const firstPage = bridge.listIntentsPage(undefined, 2, 0);
    const secondPage = bridge.listIntentsPage(undefined, 2, firstPage.next_offset);

    expect(firstPage.policy_version).toBe(ZKCP_LIST_POLICY.version);
    expect(firstPage.count).toBe(2);
    expect(firstPage.total).toBe(3);
    expect(firstPage.has_more).toBe(true);
    expect(firstPage.intents.map((intent) => intent.id)).toEqual(["zkcp-page-1", "zkcp-page-2"]);
    expect(secondPage.intents.map((intent) => intent.id)).toEqual(["zkcp-page-3"]);
    expect(secondPage.has_more).toBe(false);

    expect(() => bridge.listIntentsPage(undefined, 0, 0)).toThrow("limit");
    expect(() => bridge.listIntentsPage(undefined, ZKCP_LIST_POLICY.maxPageSize + 1, 0))
      .toThrow("limit");
    expect(() => bridge.listIntentsPage(undefined, 1, ZKCP_LIST_POLICY.maxOffset + 1))
      .toThrow("offset");
  });
});
