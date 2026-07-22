import { describe, expect, it } from "vitest";
import { BitVMBridge, UnavailableBitVMVerifier } from "../lib/support/bitvm";
import {
  DeterministicFixtureVerifier,
  makeFloorRequest,
  makeVerifierRequest,
} from "./fixtures/verifierFixtures";

describe("BitVMBridge fail-closed boundary", () => {
  it("returns a typed unavailable result and never creates floor state", async () => {
    const request = makeFloorRequest(await makeVerifierRequest());
    const bridge = new BitVMBridge(new UnavailableBitVMVerifier());

    const result = await bridge.verifyFloor(request);

    expect(result.verified).toBe(false);
    expect(result.status).toBe("unsupported");
    expect(result.failure_code).toBe("backend_unavailable");
    expect(result.taps_generated).toBe(12);
    expect(bridge.getState(request.proof_id)).toBeUndefined();
  });

  it("rejects a deterministic simulated verifier result", async () => {
    const request = makeFloorRequest(await makeVerifierRequest());
    const bridge = new BitVMBridge(new DeterministicFixtureVerifier());

    const result = await bridge.verifyFloor(request);

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("simulated_result");
    expect(result.verification.provenance).toBe("simulated");
    expect(bridge.getState(request.proof_id)).toBeUndefined();
  });

  it("rejects a mutated proof whose original digest is retained", async () => {
    const verifierRequest = await makeVerifierRequest();
    const request = makeFloorRequest({
      ...verifierRequest,
      proof: { ...verifierRequest.proof, bytes: "cd".repeat(64) },
    });
    const bridge = new BitVMBridge(new DeterministicFixtureVerifier());

    const result = await bridge.verifyFloor(request);

    expect(result.failure_code).toBe("proof_digest_mismatch");
    expect(result.verified).toBe(false);
  });

  it("rejects reordered public inputs", async () => {
    const verifierRequest = await makeVerifierRequest();
    const request = makeFloorRequest({
      ...verifierRequest,
      public_inputs: [...verifierRequest.public_inputs].reverse(),
    });
    const bridge = new BitVMBridge(new DeterministicFixtureVerifier());

    const result = await bridge.verifyFloor(request);

    expect(result.failure_code).toBe("public_input_mismatch");
    expect(result.verified).toBe(false);
  });

  it("rejects malformed proof encoding", async () => {
    const verifierRequest = await makeVerifierRequest();
    const request = makeFloorRequest({
      ...verifierRequest,
      proof: { ...verifierRequest.proof, encoding: "base64", bytes: "not-base64" },
    });
    const bridge = new BitVMBridge(new DeterministicFixtureVerifier());

    const result = await bridge.verifyFloor(request);

    expect(result.failure_code).toBe("malformed_encoding");
    expect(result.verified).toBe(false);
  });

  it("rejects wrong verification keys, curves, and circuits", async () => {
    const bridge = new BitVMBridge(new DeterministicFixtureVerifier());
    const base = await makeVerifierRequest();

    const wrongKey = await bridge.verifyFloor(makeFloorRequest({
      ...base,
      verification_key: { ...base.verification_key, digest: "sha256:9999999999999999999999999999999999999999999999999999999999999999" },
    }));
    expect(wrongKey.failure_code).toBe("verification_key_mismatch");

    const wrongCurve = await bridge.verifyFloor(makeFloorRequest(await makeVerifierRequest({ curve: "secp256k1" })));
    expect(wrongCurve.failure_code).toBe("curve_mismatch");

    const wrongCircuit = await bridge.verifyFloor(makeFloorRequest({
      ...base,
      circuit: { ...base.circuit, digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    }));
    expect(wrongCircuit.failure_code).toBe("circuit_mismatch");
  });

  it("rejects invalid tap challenges and signatures", async () => {
    const bridge = new BitVMBridge(new UnavailableBitVMVerifier());

    const challenge = await bridge.challengeTap("missing-proof", 0);
    expect(challenge.accepted).toBe(false);
    expect(challenge.failure_code).toBe("invalid_challenge");

    const signature = await bridge.submitSignature("missing-proof", "verifier-1", "not-a-signature");
    expect(signature.accepted).toBe(false);
    expect(signature.failure_code).toBe("invalid_signature");
  });
});
