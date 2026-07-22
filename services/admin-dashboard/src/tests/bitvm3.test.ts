import { describe, expect, it } from "vitest";
import { BitVM3Orchestrator, UnavailableBitVM3Verifier } from "../lib/support/bitvm3";
import type { BitVM3Verifier } from "../lib/support/bitvm3";
import {
  createVerificationResult,
  digestVerifierRequest,
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
});
