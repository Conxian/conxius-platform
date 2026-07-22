import {
  VERIFIER_CONTRACT_VERSION,
  createVerifierRequest,
  createVerificationFailure,
  createVerificationResult,
  digestVerifierRequest,
  type BackendIdentity,
  type CreateVerifierRequestInput,
  type Curve,
  type Digest,
  type VerifierRequest,
} from "../../lib/support/verifier-contract";
import type { BitVMFloorRequest, BitVMVerifier } from "../../lib/support/bitvm";
import type { BitVM3VerificationRequest, BitVM3Verifier } from "../../lib/support/bitvm3";
import {
  deriveZKCPBinding,
  expectedZKCPPublicInputs,
  type ZKCPIntentInput,
  type ZKProofVerifier,
} from "../../lib/support/zkcp";

/**
* Test-only deterministic fixture. It deliberately reports simulated
* provenance so production bridges reject the result before state advances.
*/

export const TEST_BACKEND: BackendIdentity = {
  id: "fixture-verifier",
  version: "test-v1",
  artifact_digest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
  authority: "non_authoritative",
};

export const TEST_CIRCUIT = {
  id: "fixture-circuit-v1",
  digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222" as Digest,
};

export const TEST_VERIFICATION_KEY = {
  id: "fixture-vk-v1",
  digest: "sha256:3333333333333333333333333333333333333333333333333333333333333333" as Digest,
};

export const TEST_STATEMENT_DIGEST = "sha256:4444444444444444444444444444444444444444444444444444444444444444" as Digest;
export const TEST_DOMAIN_DIGEST = "sha256:5555555555555555555555555555555555555555555555555555555555555555" as Digest;
export const ENCRYPTED_DATA_DIGEST = "sha256:6666666666666666666666666666666666666666666666666666666666666666" as Digest;

export interface FixtureRequestOverrides {
  proof_system?: CreateVerifierRequestInput["proof_system"];
  curve?: Curve;
  circuit?: CreateVerifierRequestInput["circuit"];
  verification_key?: CreateVerifierRequestInput["verification_key"];
  statement_digest?: Digest;
  domain_digest?: Digest;
  backend?: BackendIdentity;
  provenance?: CreateVerifierRequestInput["provenance"];
  proof_bytes?: string;
  proof_encoding?: CreateVerifierRequestInput["proof"]["encoding"];
  public_inputs?: CreateVerifierRequestInput["public_inputs"];
}

export async function makeVerifierRequest(overrides: FixtureRequestOverrides = {}): Promise<VerifierRequest> {
  return createVerifierRequest({
    proof_system: overrides.proof_system ?? "groth16",
    curve: overrides.curve ?? "bn254",
    circuit: overrides.circuit ?? TEST_CIRCUIT,
    verification_key: overrides.verification_key ?? TEST_VERIFICATION_KEY,
    public_inputs: overrides.public_inputs ?? [
      { index: 0, name: "amount", value: "03e8", encoding: "hex" },
      { index: 1, name: "recipient", value: "6263317174657374", encoding: "hex" },
    ],
    proof: {
      bytes: overrides.proof_bytes ?? "ab".repeat(64),
      encoding: overrides.proof_encoding ?? "hex",
    },
    statement_digest: overrides.statement_digest ?? TEST_STATEMENT_DIGEST,
    domain_digest: overrides.domain_digest ?? TEST_DOMAIN_DIGEST,
    backend: overrides.backend ?? TEST_BACKEND,
    provenance: overrides.provenance ?? "test",
  });
}

export function makeFloorRequest(request: VerifierRequest): BitVMFloorRequest {
  return {
    contract_version: VERIFIER_CONTRACT_VERSION,
    proof_id: "fixture-floor-1",
    verifier_request: request,
    tap_profile: {
      id: "profile-bitvm2-test",
      tap_count: 12,
      required_signatures: 2,
      authorized_signers: ["verifier-1", "verifier-2"],
    },
  };
}

export function makeRecursiveRequest(request: VerifierRequest): BitVM3VerificationRequest {
  return {
    contract_version: VERIFIER_CONTRACT_VERSION,
    proof_id: "fixture-recursive-1",
    recursive_height: 10,
    verifier_request: request,
  };
}

export async function makeIntentInput(request: VerifierRequest, id = "zkcp-fixture-1"): Promise<ZKCPIntentInput> {
  return {
    id,
    amount: 1000,
    encryptedDataHash: ENCRYPTED_DATA_DIGEST,
    proofHash: request.proof.digest,
    sellerAddress: "bc1qfixture-seller",
    buyerAddress: "bc1qfixture-buyer",
    network: "bitcoin-regtest",
  };
}

export async function bindZKCPRequestToIntent(
  request: VerifierRequest,
  intent: ZKCPIntentInput,
): Promise<VerifierRequest> {
  const boundRequest = await createVerifierRequest({
    proof_system: request.proof_system,
    curve: request.curve,
    circuit: request.circuit,
    verification_key: request.verification_key,
    public_inputs: expectedZKCPPublicInputs(intent),
    proof: {
      bytes: request.proof.bytes,
      encoding: request.proof.encoding,
    },
    statement_digest: request.statement_digest,
    domain_digest: request.domain_digest,
    backend: request.backend,
    provenance: request.provenance,
  });
  const binding = await deriveZKCPBinding(intent, boundRequest);
  return {
    ...boundRequest,
    statement_digest: binding.statement_digest,
    domain_digest: binding.domain_digest,
  };
}

export class DeterministicFixtureVerifier implements BitVMVerifier, BitVM3Verifier, ZKProofVerifier {
  public readonly backendIdentity = TEST_BACKEND;

  public constructor(private readonly expectedCurve: Curve = "bn254") {}

  public async verify(request: VerifierRequest) {
    const request_digest = await digestVerifierRequest(request);
    if (request.curve !== this.expectedCurve) {
      return createVerificationFailure("curve_mismatch", "Fixture policy rejected the curve", {
        request_digest,
        backend: request.backend,
        provenance: "simulated",
      });
    }
    if (request.circuit.digest !== TEST_CIRCUIT.digest) {
      return createVerificationFailure("circuit_mismatch", "Fixture policy rejected the circuit", {
        request_digest,
        backend: request.backend,
        provenance: "simulated",
      });
    }
    if (request.verification_key.digest !== TEST_VERIFICATION_KEY.digest) {
      return createVerificationFailure("verification_key_mismatch", "Fixture policy rejected the verification key", {
        request_digest,
        backend: request.backend,
        provenance: "simulated",
      });
    }
    return createVerificationResult({
      status: "valid",
      request_digest,
      backend: request.backend,
      provenance: "simulated",
    });
  }
}
