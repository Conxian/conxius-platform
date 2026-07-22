import { describe, expect, it } from "vitest";
import { BitVM3Orchestrator, UnavailableBitVM3Verifier } from "../lib/support/bitvm3";
import {
  DeterministicFixtureVerifier,
  makeRecursiveRequest,
  makeVerifierRequest,
} from "./fixtures/verifierFixtures";

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
});
