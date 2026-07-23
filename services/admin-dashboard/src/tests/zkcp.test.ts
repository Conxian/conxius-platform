import { describe, expect, it, vi } from "vitest";
import {
  UnavailableOnChainMonitor,
  UnavailableZKVerifier,
  ZKCP_LIST_POLICY,
  ZKCPBridge,
  type ZKCPBridgeOptions,
  type OnChainMonitor,
  type ZKProofVerifier,
} from "../lib/support/zkcp";
import {
  createPaymentObservation,
  createVerificationResult,
  digestVerifierRequest,
  VERIFIER_RESOURCE_LIMITS,
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

const AUTHORITATIVE_BACKEND: BackendIdentity = {
  id: "gateway-core-zkcp-test",
  version: "test-coordinator-v1",
  artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  authority: "authoritative",
};

class AuthoritativeFixtureVerifier implements ZKProofVerifier {
  public readonly backendIdentity = AUTHORITATIVE_BACKEND;

  public async verify(request: VerifierRequest) {
    return createVerificationResult({
      status: "valid",
      request_digest: await digestVerifierRequest(request),
      backend: AUTHORITATIVE_BACKEND,
      provenance: "production",
    });
  }
}

class AuthoritativeFixtureMonitor implements OnChainMonitor {
  public readonly backendIdentity = AUTHORITATIVE_BACKEND;

  public constructor(private readonly txid = "tx-authoritative-fixture") {}

  public async watchForPayment(
    request: Parameters<OnChainMonitor["watchForPayment"]>[0],
  ): Promise<PaymentObservationResult> {
    const observation = await createPaymentObservation({
      request,
      txid: this.txid,
      amount: request.expected_amount,
      confirmations: 6,
      observer: AUTHORITATIVE_BACKEND,
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

class DeferredAuthoritativeFixtureMonitor extends AuthoritativeFixtureMonitor {
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
    this.resolveStarted();
    await this.gate;
    return super.watchForPayment(request);
  }

  public release(): void {
    this.resolveGate();
  }
}

interface MaliciousReleaseAdapter {
  readonly backendIdentity: BackendIdentity;
  readonly capabilities: Record<string, unknown>;
  readonly getByObligationId: ReturnType<typeof vi.fn>;
  readonly release: ReturnType<typeof vi.fn>;
}

function makeMaliciousReleaseAdapter(): MaliciousReleaseAdapter {
  return {
    backendIdentity: AUTHORITATIVE_BACKEND,
    capabilities: {
      contract_version: "conxian.zkcp.key-release.v1",
      atomic_obligation_claim: true,
      idempotent_release: true,
    },
    getByObligationId: vi.fn(async () => ({ status: "absent" })),
    release: vi.fn(async () => ({
      status: "released",
      backend: AUTHORITATIVE_BACKEND,
      provenance: "simulated",
      decryptionKey: "must-never-escape",
    })),
  };
}

async function makeAuthoritativeSetup(
  id = "zkcp-paid-not-finalized",
  options: ZKCPBridgeOptions = {},
) {
  const request = await makeVerifierRequest({
    backend: AUTHORITATIVE_BACKEND,
    provenance: "production",
  });
  const input = await makeIntentInput(request, id);
  const boundRequest = await bindZKCPRequestToIntent(request, input);
  const bridge = new ZKCPBridge(
    new AuthoritativeFixtureVerifier(),
    new AuthoritativeFixtureMonitor(),
    options,
  );
  bridge.initializeIntent(input);
  expect((await bridge.verifyProof(input.id, boundRequest)).status).toBe("valid");
  expect((await bridge.watchForPayment(input.id)).status).toBe("observed");
  return { bridge, input };
}

function internalMap(bridge: ZKCPBridge, name: string): Map<string, unknown> {
  return Reflect.get(bridge, name) as Map<string, unknown>;
}

describe("ZKCP fail-closed boundary", () => {
  it("keeps the default proof verifier unavailable and never advances lifecycle state", async () => {
    const request = await makeVerifierRequest();
    const input = await makeIntentInput(request, "zkcp-default-unavailable");
    const boundRequest = await bindZKCPRequestToIntent(request, input);
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new UnavailableOnChainMonitor(),
    );
    bridge.initializeIntent(input);

    const result = await bridge.verifyProof(input.id, boundRequest);

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("backend_unavailable");
    expect(bridge.getIntent(input.id)?.status).toBe("unsupported");
    expect(bridge.getIntent(input.id)?.paymentObservation).toBeUndefined();
  });

  it("rejects simulated fixture verification before a paid transition", async () => {
    const request = await makeVerifierRequest();
    const input = await makeIntentInput(request, "zkcp-simulated");
    const boundRequest = await bindZKCPRequestToIntent(request, input);
    const bridge = new ZKCPBridge(
      new DeterministicFixtureVerifier(),
      new UnavailableOnChainMonitor(),
    );
    bridge.initializeIntent(input);

    const result = await bridge.verifyProof(input.id, boundRequest);

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("simulated_result");
    expect(result.provenance).toBe("simulated");
    expect(bridge.getIntent(input.id)?.status).toBe("failed");
  });

  it("preserves proof and payment evidence while keeping paid distinct from finalization", async () => {
    const { bridge, input } = await makeAuthoritativeSetup();

    const result = await bridge.finalizeSettlement(input.id);
    const intent = bridge.getIntent(input.id);

    expect(result).toEqual({
      finalized: false,
      status: "unavailable",
      intentId: input.id,
      failure_code: "unsupported_backend",
      error: expect.stringContaining("independently authenticated Gateway/Core coordinator"),
    });
    expect(intent?.status).toBe("paid");
    expect(intent?.paymentHash).toBe("tx-authoritative-fixture");
    expect("decryptionKey" in (intent ?? {})).toBe(false);
    expect(result.finalized).toBe(false);
  });

  it("ignores a conforming-looking injected release adapter, including across restart-like replicas", async () => {
    const adapter = makeMaliciousReleaseAdapter();
    const first = await makeAuthoritativeSetup("zkcp-release-quarantine-first");
    const second = await makeAuthoritativeSetup("zkcp-release-quarantine-second");

    // The third constructor argument is options, not a release adapter. This
    // runtime-shaped injection regression proves a stale caller cannot revive
    // the removed adapter slot through JavaScript argument passing.
    const firstWithInjectedAdapter = Reflect.construct(ZKCPBridge, [
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      adapter,
    ]) as ZKCPBridge;
    firstWithInjectedAdapter.initializeIntent(first.input);
    const firstResult = await firstWithInjectedAdapter.finalizeSettlement(first.input.id);
    const secondResult = await second.bridge.finalizeSettlement(second.input.id);

    expect(firstResult.finalized).toBe(false);
    expect(secondResult.finalized).toBe(false);
    expect(firstResult.status).toBe("unavailable");
    expect(secondResult.status).toBe("unavailable");
    expect(firstWithInjectedAdapter.getIntent(first.input.id)?.status).toBe("pending");
    expect(adapter.getByObligationId).not.toHaveBeenCalled();
    expect(adapter.release).not.toHaveBeenCalled();
  });

  it("returns unavailable without inspecting arbitrary finalize payloads", async () => {
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new UnavailableOnChainMonitor(),
    );

    const results = await Promise.all([
      bridge.finalizeSettlement("missing-intent"),
      bridge.finalizeSettlement(""),
      bridge.finalizeSettlement("x".repeat(VERIFIER_RESOURCE_LIMITS.maxIdentifierChars + 100)),
    ]);

    expect(results.every((result) => result.status === "unavailable")).toBe(true);
    expect(results.every((result) => result.finalized === false)).toBe(true);
    expect(results.every((result) => result.failure_code === "unsupported_backend")).toBe(true);
  });

  it("does not observe payment before authoritative proof evidence", async () => {
    const request = await makeVerifierRequest();
    const input = await makeIntentInput(request, "zkcp-payment-before-proof");
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new AuthoritativeFixtureMonitor(),
    );
    bridge.initializeIntent(input);

    const result = await bridge.watchForPayment(input.id);

    expect(result.detected).toBe(false);
    expect(result.failure_code).toBe("payment_not_observed");
    expect(bridge.getIntent(input.id)?.status).toBe("pending");
  });

  it("rejects mutated public-input bindings before verifier dispatch", async () => {
    const request = await makeVerifierRequest();
    const input = await makeIntentInput(request, "zkcp-binding-regression");
    const boundRequest = await bindZKCPRequestToIntent(request, input);
    const bridge = new ZKCPBridge(
      new DeterministicFixtureVerifier(),
      new UnavailableOnChainMonitor(),
    );
    bridge.initializeIntent(input);

    const result = await bridge.verifyProof(input.id, {
      ...boundRequest,
      public_inputs: boundRequest.public_inputs.map((publicInput, index) => (
        index === 1 ? { ...publicInput, name: "buyer_address" } : publicInput
      )),
    });

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("public_input_mismatch");
    expect(bridge.getIntent(input.id)?.status).toBe("failed");
  });

  it("rejects duplicate intent ids and keeps snapshots immutable", async () => {
    const request = await makeVerifierRequest();
    const input = await makeIntentInput(request, "zkcp-immutable");
    const bridge = new ZKCPBridge(new UnavailableZKVerifier(), new UnavailableOnChainMonitor());
    const snapshot = bridge.initializeIntent(input) as Record<string, unknown>;

    expect(() => bridge.initializeIntent(input)).toThrow("already exists");
    expect(() => {
      snapshot.status = "paid";
    }).toThrow();
    expect(bridge.getIntent(input.id)?.status).toBe("pending");
  });

  it("keeps retained intent listing bounded and excludes the removed finalized state", async () => {
    const request = await makeVerifierRequest();
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new UnavailableOnChainMonitor(),
      {
        maxActiveIntents: 4,
        maxTotalIntents: 4,
        now: () => 1_000,
      },
    );
    for (const id of ["zkcp-page-3", "zkcp-page-1", "zkcp-page-2"]) {
      bridge.initializeIntent(await makeIntentInput(request, id));
    }

    const page = bridge.listIntentsPage(undefined, 2, 0);

    expect(page.policy_version).toBe(ZKCP_LIST_POLICY.version);
    expect(page.count).toBe(2);
    expect(page.total).toBe(3);
    expect(page.intents.map((intent) => intent.id)).toEqual(["zkcp-page-1", "zkcp-page-2"]);
    expect(bridge.listIntentsByStatus("paid")).toHaveLength(0);
  });

  it("retains paid evidence through its TTL, purges every map atomically, and recovers capacity", async () => {
    let now = 1_000;
    const request = await makeVerifierRequest({
      backend: AUTHORITATIVE_BACKEND,
      provenance: "production",
    });
    const input = await makeIntentInput(request, "zkcp-paid-retention");
    const replacement = await makeIntentInput(request, "zkcp-paid-replacement");
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      new AuthoritativeFixtureMonitor(),
      {
        now: () => now,
        maxActiveIntents: 1,
        maxTotalIntents: 1,
        terminalRetentionMs: 10,
      },
    );

    bridge.initializeIntent(input);
    expect((await bridge.verifyProof(input.id, await bindZKCPRequestToIntent(request, input))).status).toBe("valid");
    expect((await bridge.watchForPayment(input.id)).status).toBe("observed");
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
    expect(internalMap(bridge, "verificationEvidence").has(input.id)).toBe(true);
    expect(internalMap(bridge, "paymentEvidence").has(input.id)).toBe(true);

    now = 1_009;
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
    expect(bridge.listIntentsByStatus("paid")).toHaveLength(1);
    expect(() => bridge.initializeIntent(replacement)).toThrow(/retained-intent capacity is full/);

    now = 1_010;
    expect(bridge.purgeExpiredTerminalRecords()).toBe(1);
    expect(bridge.getIntent(input.id)).toBeUndefined();
    expect(bridge.listIntentsByStatus("paid")).toHaveLength(0);
    expect(internalMap(bridge, "verificationEvidence").has(input.id)).toBe(false);
    expect(internalMap(bridge, "paymentEvidence").has(input.id)).toBe(false);
    expect(internalMap(bridge, "lifecycleGenerations").has(input.id)).toBe(false);
    expect(internalMap(bridge, "lifecycleQueues").has(input.id)).toBe(false);
    expect(() => bridge.initializeIntent(replacement)).not.toThrow();
  });

  it("preserves an in-flight watch operation when terminal cleanup reaches its TTL", async () => {
    let now = 1_000;
    const request = await makeVerifierRequest({
      backend: AUTHORITATIVE_BACKEND,
      provenance: "production",
    });
    const input = await makeIntentInput(request, "zkcp-watch-retention-race");
    const monitor = new DeferredAuthoritativeFixtureMonitor();
    const bridge = new ZKCPBridge(
      new AuthoritativeFixtureVerifier(),
      monitor,
      { now: () => now, terminalRetentionMs: 10 },
    );
    const boundRequest = await bindZKCPRequestToIntent(request, input);
    bridge.initializeIntent(input);
    expect((await bridge.verifyProof(input.id, boundRequest)).status).toBe("valid");

    const watch = bridge.watchForPayment(input.id);
    await monitor.started;
    now = 1_010;

    expect(bridge.purgeExpiredTerminalRecords()).toBe(0);
    expect(bridge.getIntent(input.id)?.status).toBe("verified");
    expect(internalMap(bridge, "lifecycleQueues").has(input.id)).toBe(true);

    monitor.release();
    expect((await watch).status).toBe("observed");
    expect(bridge.getIntent(input.id)?.status).toBe("paid");
  });
});
