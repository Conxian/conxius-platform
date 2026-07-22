import { describe, expect, it } from "vitest";
import { BitVM3Orchestrator, UnavailableBitVM3Verifier } from "../lib/support/bitvm3";
import type { BitVM3Verifier } from "../lib/support/bitvm3";
import {
  createVerificationResult,
  digestVerifierRequest,
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

  public async verify(request: VerifierRequest) {
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
});
