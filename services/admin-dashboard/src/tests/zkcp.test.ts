import { describe, expect, it } from "vitest";
import {
  UnavailableDecryptionKeyReleaser,
  UnavailableOnChainMonitor,
  UnavailableZKVerifier,
  ZKCPBridge,
  type DecryptionKeyReleaser,
  type OnChainMonitor,
  type ZKProofVerifier,
} from "../lib/support/zkcp";
import {
  createPaymentObservation,
  createVerificationResult,
  digestVerifierRequest,
  UNAVAILABLE_BACKEND,
  type BackendIdentity,
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

  public async watchForPayment(request: Parameters<OnChainMonitor["watchForPayment"]>[0]): Promise<PaymentObservationResult> {
    const observation = await createPaymentObservation({
      request,
      txid: "tx-authoritative-fixture",
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

class AuthoritativeFixtureKeyReleaser implements DecryptionKeyReleaser {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;
  public releaseCount = 0;

  public async release() {
    this.releaseCount += 1;
    return {
      status: "released" as const,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production" as const,
      decryptionKey: "fixture-release-key",
    };
  }
}

class ThrowingZKVerifier implements ZKProofVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(): Promise<never> {
    throw new Error("fixture verifier failure");
  }
}

class ThrowingPaymentMonitor implements OnChainMonitor {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async watchForPayment(): Promise<never> {
    throw new Error("fixture observer failure");
  }
}

class NullKeyReleaser implements DecryptionKeyReleaser {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async release(): Promise<never> {
    return null as never;
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

  public override async release() {
    this.releaseCount += 1;
    this.resolveReleaseStarted();
    await this.releaseGate;
    return {
      status: "released" as const,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production" as const,
      decryptionKey: "fixture-release-key",
    };
  }

  public unblock(): void {
    this.resolveReleaseGate();
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

class SentinelProductionKeyReleaser implements DecryptionKeyReleaser {
  public readonly backendIdentity = UNAVAILABLE_BACKEND;

  public async release() {
    return {
      status: "released" as const,
      backend: UNAVAILABLE_BACKEND,
      provenance: "production" as const,
      decryptionKey: "sentinel-must-not-release",
    };
  }
}

describe("ZKCPBridge fail-closed boundary", () => {
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
});
