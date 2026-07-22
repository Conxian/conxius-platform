import { describe, expect, it } from "vitest";
import {
  BitVMBridge,
  createSignatureAttestation,
  UnavailableBitVMVerifier,
  type BitVMSignatureVerifier,
  type BitVMVerifier,
} from "../lib/support/bitvm";
import {
  createVerificationResult,
  digestVerifierRequest,
  VERIFIER_RESOURCE_LIMITS,
  type BackendIdentity,
  type VerifierRequest,
} from "../lib/support/verifier-contract";
import {
  DeterministicFixtureVerifier,
  makeFloorRequest,
  makeVerifierRequest,
} from "./fixtures/verifierFixtures";

const AUTHORITATIVE_TEST_BACKEND: BackendIdentity = {
  id: "bitvm-explicit-test-authority",
  version: "test-authority-v1",
  artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  authority: "authoritative",
};

class AuthoritativeFixtureVerifier implements BitVMVerifier {
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

class ContradictoryFixtureVerifier extends AuthoritativeFixtureVerifier {
  public override async verify(request: VerifierRequest) {
    return createVerificationResult({
      status: "valid",
      request_digest: await digestVerifierRequest(request),
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
      failure_code: "internal_error",
    });
  }
}

class ExplicitSignatureVerifier implements BitVMSignatureVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(input: Parameters<BitVMSignatureVerifier["verify"]>[0]) {
    const attestation = await createSignatureAttestation({
      proofId: input.proofId,
      verifierId: input.verifierId,
      signature: input.signature,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "test",
    });
    return {
      status: "valid" as const,
      verified: true,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "test" as const,
      attestation,
    };
  }
}

class DeferredSignatureVerifier extends ExplicitSignatureVerifier {
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

  public override async verify(input: Parameters<BitVMSignatureVerifier["verify"]>[0]) {
    this.calls += 1;
    this.resolveStarted();
    await this.gate;
    return super.verify(input);
  }

  public release(): void {
    this.resolveGate();
  }
}

class FirstCallThrowingSignatureVerifier implements BitVMSignatureVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;
  public calls = 0;

  public async verify(input: Parameters<BitVMSignatureVerifier["verify"]>[0]) {
    this.calls += 1;
    if (this.calls === 1) throw new Error("fixture signature verifier failure");
    const attestation = await createSignatureAttestation({
      proofId: input.proofId,
      verifierId: input.verifierId,
      signature: input.signature,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "test",
    });
    return {
      status: "valid" as const,
      verified: true,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "test" as const,
      attestation,
    };
  }
}

class InvalidSignatureVerifier implements BitVMSignatureVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify() {
    return {
      status: "invalid" as const,
      verified: false,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "test" as const,
      failure_code: "invalid_signature" as const,
      error: "Fixture rejected the signature",
    };
  }
}

class MalformedSignatureVerifier implements BitVMSignatureVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify() {
    return {
      status: "valid" as const,
      verified: true,
      backend: null,
      provenance: "test" as const,
    } as never;
  }
}

class ThrowingVerifier implements BitVMVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(): Promise<never> {
    throw new Error("fixture BitVM verifier failure");
  }
}

class SimulatedSignatureVerifier implements BitVMSignatureVerifier {
  public readonly backendIdentity = AUTHORITATIVE_TEST_BACKEND;

  public async verify(input: Parameters<BitVMSignatureVerifier["verify"]>[0]) {
    const attestation = await createSignatureAttestation({
      proofId: input.proofId,
      verifierId: input.verifierId,
      signature: input.signature,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "simulated",
    });
    return {
      status: "valid" as const,
      verified: true,
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "simulated" as const,
      attestation,
    };
  }
}

async function makeAuthoritativeBridge(signatureVerifier?: BitVMSignatureVerifier): Promise<BitVMBridge> {
  const bridge = new BitVMBridge(new AuthoritativeFixtureVerifier(), signatureVerifier);
  const request = await makeVerifierRequest({
    backend: AUTHORITATIVE_TEST_BACKEND,
    provenance: "production",
  });
  const result = await bridge.verifyFloor(makeFloorRequest(request));
  expect(result.verified).toBe(true);
  return bridge;
}

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

  it("requires the request backend to match the adapter-owned identity", async () => {
    const bridge = new BitVMBridge(new AuthoritativeFixtureVerifier());
    const result = await bridge.verifyFloor(makeFloorRequest(await makeVerifierRequest()));

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe("backend_mismatch");
    expect(bridge.getState("fixture-floor-1")).toBeUndefined();
  });

  it("normalizes a contradictory valid result with a failure code", async () => {
    const bridge = new BitVMBridge(new ContradictoryFixtureVerifier());
    const request = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });

    const result = await bridge.verifyFloor(makeFloorRequest(request));

    expect(result.verified).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.failure_code).toBe("malformed_request");
    expect(result.verification.status).toBe("malformed");
    expect(bridge.getState("fixture-floor-1")).toBeUndefined();
  });

  it("normalizes verifier adapter exceptions into typed non-success", async () => {
    const bridge = new BitVMBridge(new ThrowingVerifier());
    const request = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });

    const result = await bridge.verifyFloor(makeFloorRequest(request));

    expect(result.verified).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.failure_code).toBe("internal_error");
    expect(bridge.getState("fixture-floor-1")).toBeUndefined();
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

  it("requires explicit signature verification evidence and rejects duplicate signers", async () => {
    const bridge = await makeAuthoritativeBridge(new ExplicitSignatureVerifier());
    const first = await bridge.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64));
    expect(first.accepted).toBe(true);
    expect(first.aggregation?.is_complete).toBe(false);

    const duplicate = await bridge.submitSignature("fixture-floor-1", "verifier-1", "cd".repeat(64));
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.failure_code).toBe("duplicate_signer");
    expect(bridge.getAggregation("fixture-floor-1")?.signatures).toHaveLength(1);

    const second = await bridge.submitSignature("fixture-floor-1", "verifier-2", "cd".repeat(64));
    expect(second.accepted).toBe(true);
    expect(second.aggregation?.is_complete).toBe(true);
  });

  it("serializes concurrent same-signer submissions before async verification", async () => {
    const signatureVerifier = new DeferredSignatureVerifier();
    const bridge = await makeAuthoritativeBridge(signatureVerifier);

    const first = bridge.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64));
    await signatureVerifier.started;
    const duplicate = bridge.submitSignature("fixture-floor-1", "verifier-1", "cd".repeat(64));

    expect(signatureVerifier.calls).toBe(1);
    signatureVerifier.release();
    const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);

    expect(firstResult.accepted).toBe(true);
    expect(duplicateResult.accepted).toBe(false);
    expect(duplicateResult.failure_code).toBe("duplicate_signer");
    expect(bridge.getAggregation("fixture-floor-1")?.signatures).toHaveLength(1);
  });

  it("accepts concurrent distinct signers exactly once each", async () => {
    const signatureVerifier = new DeferredSignatureVerifier();
    const bridge = await makeAuthoritativeBridge(signatureVerifier);

    const first = bridge.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64));
    await signatureVerifier.started;
    const second = bridge.submitSignature("fixture-floor-1", "verifier-2", "cd".repeat(64));

    expect(signatureVerifier.calls).toBe(1);
    signatureVerifier.release();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(firstResult.accepted).toBe(true);
    expect(secondResult.accepted).toBe(true);
    expect(signatureVerifier.calls).toBe(2);
    expect(bridge.getAggregation("fixture-floor-1")?.signatures).toHaveLength(2);
  });

  it("releases a reserved signer after a verifier throw so a retry can succeed", async () => {
    const signatureVerifier = new FirstCallThrowingSignatureVerifier();
    const bridge = await makeAuthoritativeBridge(signatureVerifier);

    const [failed, retry] = await Promise.all([
      bridge.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64)),
      bridge.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64)),
    ]);

    expect(failed.accepted).toBe(false);
    expect(failed.failure_code).toBe("internal_error");
    expect(retry.accepted).toBe(true);
    expect(signatureVerifier.calls).toBe(2);
    expect(bridge.getAggregation("fixture-floor-1")?.signatures).toHaveLength(1);
  });

  it("rejects oversized signature identifiers and signer profiles", async () => {
    const signatureVerifier = new ExplicitSignatureVerifier();
    const bridge = await makeAuthoritativeBridge(signatureVerifier);

    const oversizedSignature = await bridge.submitSignature(
      "fixture-floor-1",
      "verifier-1",
      "ab".repeat((VERIFIER_RESOURCE_LIMITS.maxSignatureChars / 2) + 1),
    );
    expect(oversizedSignature.failure_code).toBe("resource_limit_exceeded");

    const oversizedProfileBridge = new BitVMBridge(new AuthoritativeFixtureVerifier());
    const request = await makeVerifierRequest({
      backend: AUTHORITATIVE_TEST_BACKEND,
      provenance: "production",
    });
    const result = await oversizedProfileBridge.verifyFloor({
      ...makeFloorRequest(request),
      tap_profile: {
        id: "profile-bitvm2-test",
        tap_count: 12,
        required_signatures: 1,
        authorized_signers: Array.from(
          { length: VERIFIER_RESOURCE_LIMITS.maxSignerCount + 1 },
          (_, index) => `verifier-${index}`,
        ),
      },
    });
    expect(result.failure_code).toBe("resource_limit_exceeded");
  });

  it("fails closed for unavailable and format-only signature verifiers", async () => {
    const unavailable = await makeAuthoritativeBridge();
    const unavailableResult = await unavailable.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64));
    expect(unavailableResult.accepted).toBe(false);
    expect(unavailableResult.failure_code).toBe("unsupported_backend");

    const rejected = await makeAuthoritativeBridge(new InvalidSignatureVerifier());
    const rejectedResult = await rejected.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64));
    expect(rejectedResult.accepted).toBe(false);
    expect(rejectedResult.failure_code).toBe("invalid_signature");
    expect(rejected.getAggregation("fixture-floor-1")?.signatures).toHaveLength(0);

    const malformed = await makeAuthoritativeBridge(new MalformedSignatureVerifier());
    const malformedResult = await malformed.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64));
    expect(malformedResult.accepted).toBe(false);
    expect(malformedResult.failure_code).toBe("attestation_mismatch");
    expect(malformed.getAggregation("fixture-floor-1")?.signatures).toHaveLength(0);

    const simulated = await makeAuthoritativeBridge(new SimulatedSignatureVerifier());
    const simulatedResult = await simulated.submitSignature("fixture-floor-1", "verifier-1", "ab".repeat(64));
    expect(simulatedResult.accepted).toBe(false);
    expect(simulatedResult.failure_code).toBe("simulated_result");
    expect(simulated.getAggregation("fixture-floor-1")?.signatures).toHaveLength(0);
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
