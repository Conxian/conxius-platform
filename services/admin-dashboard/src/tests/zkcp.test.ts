import { describe, expect, it } from "vitest";
import {
  UnavailableDecryptionKeyReleaser,
  UnavailableOnChainMonitor,
  UnavailableZKVerifier,
  ZKCPBridge,
} from "../lib/support/zkcp";
import {
  DeterministicFixtureVerifier,
  makeIntentInput,
  makeVerifierRequest,
} from "./fixtures/verifierFixtures";

async function setup(verifier = new DeterministicFixtureVerifier()) {
  const request = await makeVerifierRequest();
  const bridge = new ZKCPBridge(
    verifier,
    new UnavailableOnChainMonitor(),
    new UnavailableDecryptionKeyReleaser(),
  );
  const input = await makeIntentInput(request);
  bridge.initializeIntent(input);
  return { bridge, request, input };
}

describe("ZKCPBridge fail-closed boundary", () => {
  it("requires an explicitly injected backend and returns unavailable", async () => {
    const request = await makeVerifierRequest();
    const bridge = new ZKCPBridge(
      new UnavailableZKVerifier(),
      new UnavailableOnChainMonitor(),
      new UnavailableDecryptionKeyReleaser(),
    );
    const input = await makeIntentInput(request, "zkcp-unavailable");
    bridge.initializeIntent(input);

    const result = await bridge.verifyProof(input.id, request);

    expect(result.verified).toBe(false);
    expect(result.status).toBe("unavailable");
    expect(result.failure_code).toBe("backend_unavailable");
    expect(bridge.getIntent(input.id)?.status).toBe("unsupported");
  });

  it("rejects a simulated valid-looking verifier result", async () => {
    const { bridge, request, input } = await setup();

    const result = await bridge.verifyProof(input.id, request);

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("simulated_result");
    expect(result.provenance).toBe("simulated");
    expect(bridge.getIntent(input.id)?.status).toBe("failed");
  });

  it("rejects wrong keys, curves, and circuits through the injected policy fixture", async () => {
    const base = await makeVerifierRequest();

    const wrongKeyRequest = {
      ...base,
      verification_key: {
        ...base.verification_key,
        digest: "sha256:9999999999999999999999999999999999999999999999999999999999999999" as typeof base.verification_key.digest,
      },
    };
    const wrongKey = await setup();
    expect((await wrongKey.bridge.verifyProof(wrongKey.input.id, wrongKeyRequest)).failure_code)
      .toBe("verification_key_mismatch");

    const wrongCurve = await setup(new DeterministicFixtureVerifier("bn254"));
    const wrongCurveRequest = await makeVerifierRequest({ curve: "secp256k1" });
    const wrongCurveInput = await makeIntentInput(wrongCurveRequest, "zkcp-wrong-curve");
    wrongCurve.bridge.initializeIntent(wrongCurveInput);
    expect((await wrongCurve.bridge.verifyProof(wrongCurveInput.id, wrongCurveRequest)).failure_code)
      .toBe("curve_mismatch");

    const wrongCircuitRequest = {
      ...base,
      circuit: {
        ...base.circuit,
        digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as typeof base.circuit.digest,
      },
    };
    const wrongCircuit = await setup();
    expect((await wrongCircuit.bridge.verifyProof(wrongCircuit.input.id, wrongCircuitRequest)).failure_code)
      .toBe("circuit_mismatch");
  });

  it("rejects mutated proofs and public-input ordering", async () => {
    const proofCase = await setup();
    const mutatedProof = {
      ...proofCase.request,
      proof: { ...proofCase.request.proof, bytes: "cd".repeat(64) },
    };
    expect((await proofCase.bridge.verifyProof(proofCase.input.id, mutatedProof)).failure_code)
      .toBe("proof_digest_mismatch");

    const inputCase = await setup();
    const mutatedInputs = {
      ...inputCase.request,
      public_inputs: [...inputCase.request.public_inputs].reverse(),
    };
    expect((await inputCase.bridge.verifyProof(inputCase.input.id, mutatedInputs)).failure_code)
      .toBe("public_input_mismatch");
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
