import { describe, expect, it } from "vitest";
import { BitVM3Orchestrator, UnavailableBitVM3Verifier } from "../lib/support/bitvm3";
import type { BitVM3Verifier } from "../lib/support/bitvm3";
import {
  createVerificationResult,
  digestVerifierRequest,
  VERIFIER_BITVM3_RETENTION_POLICY,
  VERIFIER_BITVM3_RETENTION_POLICY_VERSION,
  VERIFIER_RESOURCE_LIMITS,
  type BackendIdentity,
  type VerifierRequest,
} from "../lib/support/verifier-contract";
import {
  DeterministicFixtureVerifier,
  makeRecursiveRequest,
  makeVerifierRequest,
} from "./fixtures/verifierFixtures";

const AUTHORITATIVE_TEST_BACKEND: BackendIdentity = {
  id: "bitvm3-explicit-test-authority",
  version: "test-authority-v1",
  artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  authority: "authoritative",
};

class ContradictoryFixtureVerifier implements BitVM3Verifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(request: VerifierRequest) {
    return createVerificationResult({
      status: "valid",
      request_digest: await digestVerifierRequest(request),
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
      failure_code: "internal_error",
    });
  }
}

class AuthoritativeFixtureVerifier implements BitVM3Verifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;
  public calls = 0;

  public async verify(request: VerifierRequest) {
    this.calls += 1;
    return createVerificationResult({
      status: "valid",
      request_digest: await digestVerifierRequest(request),
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });
  }
}

class ThrowingVerifier implements BitVM3Verifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(): Promise<never> {
    throw new Error("fixture BitVM3 verifier failure");
  }
}

class DeferredBitVM3Verifier extends AuthoritativeFixtureVerifier {
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
    this.resolveStarted();
    await this.gate;
    return super.verify(request);
  }

  public release(): void {
    this.resolveGate();
  }
}

class FirstCallThrowingBitVM3Verifier extends AuthoritativeFixtureVerifier {
  public override async verify(request: VerifierRequest) {
    if (this.calls === 0) {
      this.calls += 1;
      throw new Error("fixture BitVM3 transient verifier failure");
    }
    return super.verify(request);
  }
}

function makeClock(initial = 0): { now: () => number; set: (value: number) => void; advance: (delta: number) => void } {
  let current = initial;
  return {
    now: () => current,
    set: (value) => {
      current = value;
    },
    advance: (delta) => {
      current += delta;
    },
  };
}

describe("BitVM3Orchestrator fail-closed boundary", () => {
  it("returns unavailable instead of unconditional recursive success", async () => {
    const request = makeRecursiveRequest(await makeVerifierRequest());
    const orchestrator = new BitVM3Orchestrator(new UnavailableBitVM3Verifier());

    const state = await orchestrator.verifyRecursive(request);

    expect(state.isVerified).toBe(false);
    expect(state.status).toBe("unsupported");
    expect(state.failure_code).toBe("backend_unavailable");
    expect(orchestrator.getState(request.proof_id)).toBeUndefined();
  });

  it("rejects simulated recursive verification even when the fixture looks valid", async () => {
    const request = makeRecursiveRequest(await makeVerifierRequest());
    const orchestrator = new BitVM3Orchestrator(new DeterministicFixtureVerifier());

    const state = await orchestrator.verifyRecursive(request);

    expect(state.isVerified).toBe(false);
    expect(state.failure_code).toBe("simulated_result");
    expect(state.verification.provenance).toBe("simulated");
    expect(orchestrator.getState(request.proof_id)).toBeUndefined();
  });

  it("rejects a recursive request with a mutated proof", async () => {
    const verifierRequest = await makeVerifierRequest();
    const request = makeRecursiveRequest({
      ...verifierRequest,
      proof: { ...verifierRequest.proof, bytes: "ef".repeat(64) },
    });
    const orchestrator = new BitVM3Orchestrator(new DeterministicFixtureVerifier());

    const state = await orchestrator.verifyRecursive(request);

    expect(state.isVerified).toBe(false);
    expect(state.failure_code).toBe("proof_digest_mismatch");
  });

  it("normalizes verifier adapter exceptions into typed non-success", async () => {
    const request = makeRecursiveRequest(await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    }));
    const orchestrator = new BitVM3Orchestrator(new ThrowingVerifier());

    const state = await orchestrator.verifyRecursive(request);

    expect(state.isVerified).toBe(false);
    expect(state.status).toBe("failed");
    expect(state.failure_code).toBe("internal_error");
    expect(orchestrator.getState(request.proof_id)).toBeUndefined();
  });

  it("returns defensive copies of stored recursive state", async () => {
    const request = makeRecursiveRequest(await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    }));
    const orchestrator = new BitVM3Orchestrator(new AuthoritativeFixtureVerifier());
    await orchestrator.verifyRecursive(request);

    const snapshot = orchestrator.getState(request.proof_id);
    expect(snapshot?.status).toBe("verified");
    if (snapshot) {
      snapshot.status = "failed";
      snapshot.isVerified = false;
      snapshot.verification.failure_code = "internal_error";
    }

    const reread = orchestrator.getState(request.proof_id);
    expect(reread?.status).toBe("verified");
    expect(reread?.isVerified).toBe(true);
    expect(reread?.verification.failure_code).toBeUndefined();
  });

  it("normalizes a contradictory valid result with a failure code", async () => {
    const request = makeRecursiveRequest(await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    }));
    const orchestrator = new BitVM3Orchestrator(new ContradictoryFixtureVerifier());

    const state = await orchestrator.verifyRecursive(request);

    expect(state.isVerified).toBe(false);
    expect(state.status).toBe("failed");
    expect(state.failure_code).toBe("malformed_request");
    expect(state.verification.status).toBe("malformed");
    expect(orchestrator.getState(request.proof_id)).toBeUndefined();
  });

  it("enforces proof-id and recursive-height limits before backend dispatch", async () => {
    const verifier = new AuthoritativeFixtureVerifier();
    const orchestrator = new BitVM3Orchestrator(verifier);
    const verifierRequest = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });

    const maximum = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      recursive_height: VERIFIER_RESOURCE_LIMITS.maxRecursiveHeight,
    });
    expect(maximum.isVerified).toBe(true);
    expect(verifier.calls).toBe(1);

    const oversizedProofId = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      proof_id: "p".repeat(VERIFIER_RESOURCE_LIMITS.maxIdentifierChars + 1),
    });
    expect(oversizedProofId.failure_code).toBe("resource_limit_exceeded");

    const oversizedHeight = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      recursive_height: VERIFIER_RESOURCE_LIMITS.maxRecursiveHeight + 1,
    });
    expect(oversizedHeight.failure_code).toBe("resource_limit_exceeded");

    const unsafeHeight = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      recursive_height: Number.MAX_SAFE_INTEGER,
    });
    expect(unsafeHeight.failure_code).toBe("resource_limit_exceeded");

    const overflowHeight = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      recursive_height: Number.MAX_SAFE_INTEGER + 1,
    });
    expect(overflowHeight.failure_code).toBe("malformed_request");

    const negativeHeight = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      recursive_height: -1,
    });
    expect(negativeHeight.failure_code).toBe("malformed_request");

    const nanHeight = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      recursive_height: Number.NaN,
    });
    expect(nanHeight.failure_code).toBe("malformed_request");
    expect(verifier.calls).toBe(1);
  });

  it("serializes identical same-proof requests and returns a deterministic read-only replay", async () => {
    const verifier = new DeferredBitVM3Verifier();
    const request = makeRecursiveRequest(await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    }));
    const orchestrator = new BitVM3Orchestrator(verifier);

    const first = orchestrator.verifyRecursive(request);
    await verifier.started;
    const replay = orchestrator.verifyRecursive({ ...request });

    expect(verifier.calls).toBe(0);
    verifier.release();
    const [firstState, replayState] = await Promise.all([first, replay]);

    expect(verifier.calls).toBe(1);
    expect(firstState).toEqual(replayState);
    expect(firstState.status).toBe("verified");
    expect(orchestrator.getState(request.proof_id)).toEqual(firstState);
  });

  it("fails closed for conflicting same-proof requests without dispatching a second backend call", async () => {
    const verifier = new DeferredBitVM3Verifier();
    const request = makeRecursiveRequest(await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    }));
    const conflicting = { ...request, recursive_height: request.recursive_height + 1 };
    const orchestrator = new BitVM3Orchestrator(verifier);

    const first = orchestrator.verifyRecursive(request);
    await verifier.started;
    const second = orchestrator.verifyRecursive(conflicting);

    verifier.release();
    const [firstState, conflictingState] = await Promise.all([first, second]);

    expect(verifier.calls).toBe(1);
    expect(firstState.status).toBe("verified");
    expect(conflictingState.failure_code).toBe("malformed_request");
    expect(orchestrator.getState(request.proof_id)?.recursiveHeight).toBe(request.recursive_height);
  });

  it("cleans the per-proof queue after an adapter throw so a deliberate retry cannot deadlock", async () => {
    const verifier = new FirstCallThrowingBitVM3Verifier();
    const request = makeRecursiveRequest(await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    }));
    const orchestrator = new BitVM3Orchestrator(verifier);

    const failed = await orchestrator.verifyRecursive(request);
    const retried = await orchestrator.verifyRecursive(request);

    expect(failed.failure_code).toBe("internal_error");
    expect(retried.status).toBe("verified");
    expect(verifier.calls).toBe(2);
    expect(orchestrator.getState(request.proof_id)?.status).toBe("verified");
  });

  it("publishes a versioned hard cap and refuses unique proofs before dispatch", async () => {
    const verifier = new AuthoritativeFixtureVerifier();
    const orchestrator = new BitVM3Orchestrator(verifier, {
      retention: { maxRetainedStates: 2, terminalTtlMs: 100 },
    });
    const verifierRequest = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });

    const first = await orchestrator.verifyRecursive(makeRecursiveRequest(verifierRequest));
    const second = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      proof_id: "fixture-recursive-2",
    });
    const third = await orchestrator.verifyRecursive({
      ...makeRecursiveRequest(verifierRequest),
      proof_id: "fixture-recursive-3",
    });

    expect(first.status).toBe("verified");
    expect(second.status).toBe("verified");
    expect(third.failure_code).toBe("resource_limit_exceeded");
    expect(verifier.calls).toBe(2);
    expect(orchestrator.getRetentionSnapshot()).toMatchObject({
      policy_version: VERIFIER_BITVM3_RETENTION_POLICY_VERSION,
      max_retained_states: 2,
      retained_state_count: 2,
      state_map_count: 2,
      initialization_map_count: 2,
      generation_map_count: 2,
      in_flight_count: 0,
      proof_queue_count: 0,
    });
    expect(VERIFIER_BITVM3_RETENTION_POLICY.maxRetainedStates).toBeGreaterThan(0);
  });

  it("does not evict an in-flight reservation or proof queue during cleanup", async () => {
    const clock = makeClock();
    const verifier = new DeferredBitVM3Verifier();
    const orchestrator = new BitVM3Orchestrator(verifier, {
      now: clock.now,
      retention: { maxRetainedStates: 1, terminalTtlMs: 10 },
    });
    const verifierRequest = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });
    const request = makeRecursiveRequest(verifierRequest);
    const pending = orchestrator.verifyRecursive(request);
    await verifier.started;

    clock.advance(100);
    const duringFlight = orchestrator.getRetentionSnapshot();
    expect(duringFlight.retained_state_count).toBe(0);
    expect(duringFlight.in_flight_count).toBe(1);
    expect(duringFlight.proof_queue_count).toBe(1);

    const blocked = await orchestrator.verifyRecursive({
      ...request,
      proof_id: "fixture-recursive-capacity",
    });
    expect(blocked.failure_code).toBe("resource_limit_exceeded");
    expect(verifier.calls).toBe(0);

    verifier.release();
    expect((await pending).status).toBe("verified");
    expect(orchestrator.getRetentionSnapshot().in_flight_count).toBe(0);
  });

  it("cleans every retained BitVM3 map after terminal TTL and safely re-verifies", async () => {
    const clock = makeClock();
    const verifier = new AuthoritativeFixtureVerifier();
    const orchestrator = new BitVM3Orchestrator(verifier, {
      now: clock.now,
      retention: { maxRetainedStates: 2, terminalTtlMs: 10 },
    });
    const request = makeRecursiveRequest(await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    }));

    const first = await orchestrator.verifyRecursive(request);
    expect(first.status).toBe("verified");
    expect(orchestrator.getRetentionSnapshot()).toMatchObject({
      retained_state_count: 1,
      state_map_count: 1,
      initialization_map_count: 1,
      generation_map_count: 1,
    });

    clock.advance(10);
    expect(orchestrator.getState(request.proof_id)).toBeUndefined();
    expect(orchestrator.getRetentionSnapshot()).toMatchObject({
      retained_state_count: 0,
      state_map_count: 0,
      initialization_map_count: 0,
      generation_map_count: 0,
      in_flight_count: 0,
      proof_queue_count: 0,
    });

    const replayAfterExpiry = await orchestrator.verifyRecursive(request);
    expect(replayAfterExpiry.status).toBe("verified");
    expect(verifier.calls).toBe(2);
    expect(orchestrator.getState(request.proof_id)?.status).toBe("verified");
  });
});
