/**
* Versioned, transport-neutral contracts for proof verification and payment
* observation. This module validates bindings and provenance; it does not
* implement pairing arithmetic, recursive proof execution, or chain access.
*/

export const VERIFIER_CONTRACT_VERSION = "conxian.verifier.v1" as const;

export type VerifierContractVersion = typeof VERIFIER_CONTRACT_VERSION;
export type Digest = `sha256:${string}`;

export type ProofSystem =
  | "bitvm2"
  | "bitvm3-recursive"
  | "groth16"
  | "plonk"
  | "stark";

export type Curve = "secp256k1" | "bn254" | "bls12-381" | "none";
export type Encoding = "hex" | "base64" | "base64url";
export type Provenance = "production" | "test" | "simulated" | "unknown";

export interface BackendIdentity {
  id: string;
  version: string;
  artifact_digest: Digest;
}

export interface CircuitBinding {
  id: string;
  digest: Digest;
}

export interface VerificationKeyBinding {
  id: string;
  digest: Digest;
}

export interface ProofBinding {
  bytes: string;
  encoding: Encoding;
  digest: Digest;
}

export interface PublicInputBinding {
  index: number;
  name: string;
  value: string;
  encoding: Encoding;
  digest: Digest;
}

export interface VerifierRequest {
  contract_version: VerifierContractVersion;
  proof_system: ProofSystem;
  curve: Curve;
  circuit: CircuitBinding;
  verification_key: VerificationKeyBinding;
  public_inputs: readonly PublicInputBinding[];
  public_inputs_digest: Digest;
  proof: ProofBinding;
  statement_digest: Digest;
  domain_digest: Digest;
  backend: BackendIdentity;
  provenance: Provenance;
}

export type VerificationStatus =
  | "valid"
  | "invalid"
  | "unavailable"
  | "unsupported"
  | "malformed";

export type VerificationFailureCode =
  | "backend_unavailable"
  | "unsupported_backend"
  | "malformed_request"
  | "malformed_encoding"
  | "digest_unavailable"
  | "proof_digest_mismatch"
  | "proof_invalid"
  | "verification_key_mismatch"
  | "public_input_mismatch"
  | "statement_mismatch"
  | "domain_mismatch"
  | "curve_mismatch"
  | "circuit_mismatch"
  | "backend_mismatch"
  | "invalid_challenge"
  | "invalid_signature"
  | "aggregation_not_found"
  | "simulated_result"
  | "observer_unavailable"
  | "payment_not_observed"
  | "payment_mismatch"
  | "payment_hash_not_authority"
  | "decryption_key_unavailable"
  | "internal_error"
  | "unknown_action";

export interface VerificationResult {
  contract_version: VerifierContractVersion;
  request_digest?: Digest;
  status: VerificationStatus;
  verified: boolean;
  backend: BackendIdentity;
  provenance: Provenance;
  checked_at: string;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface CreateVerifierRequestInput {
  proof_system: ProofSystem;
  curve: Curve;
  circuit: CircuitBinding;
  verification_key: VerificationKeyBinding;
  public_inputs: readonly Omit<PublicInputBinding, "digest">[];
  proof: Omit<ProofBinding, "digest">;
  statement_digest: Digest;
  domain_digest: Digest;
  backend: BackendIdentity;
  provenance: Provenance;
}

export const UNAVAILABLE_BACKEND: BackendIdentity = Object.freeze({
  id: "unavailable",
  version: "0",
  artifact_digest: `sha256:${"0".repeat(64)}` as Digest,
});

export interface VerifierValidationSuccess {
  ok: true;
  request: VerifierRequest;
  request_digest: Digest;
}

export interface VerifierValidationFailure {
  ok: false;
  failure_code: VerificationFailureCode;
  error: string;
}

export type VerifierValidation = VerifierValidationSuccess | VerifierValidationFailure;

export interface VerificationResultValidationSuccess {
  ok: true;
  result: VerificationResult;
}

export interface VerificationResultValidationFailure {
  ok: false;
  failure_code: VerificationFailureCode;
  error: string;
}

export type VerificationResultValidation =
  | VerificationResultValidationSuccess
  | VerificationResultValidationFailure;

export type PaymentNetwork = "bitcoin-mainnet" | "bitcoin-testnet" | "bitcoin-signet" | "bitcoin-regtest";

export interface PaymentObservationRequest {
  intent_id: string;
  address: string;
  expected_amount: number;
  network: PaymentNetwork;
}

export interface PaymentObservation {
  contract_version: VerifierContractVersion;
  intent_id: string;
  address: string;
  expected_amount: number;
  network: PaymentNetwork;
  txid: string;
  amount: number;
  confirmations: number;
  observer: BackendIdentity;
  provenance: Provenance;
  observed_at: string;
  observation_digest: Digest;
}

export type PaymentObservationStatus =
  | "observed"
  | "not_observed"
  | "unavailable"
  | "malformed"
  | "mismatch"
  | "rejected";

export interface PaymentObservationResult {
  contract_version: VerifierContractVersion;
  status: PaymentObservationStatus;
  detected: boolean;
  provenance: Provenance;
  observation?: PaymentObservation;
  failure_code?: VerificationFailureCode;
  error?: string;
}

export interface PaymentObservationValidationSuccess {
  ok: true;
  observation: PaymentObservation;
}

export interface PaymentObservationValidationFailure {
  ok: false;
  failure_code: VerificationFailureCode;
  error: string;
}

export type PaymentObservationValidation =
  | PaymentObservationValidationSuccess
  | PaymentObservationValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isDigest(value: unknown): value is Digest {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isEncoding(value: unknown): value is Encoding {
  return value === "hex" || value === "base64" || value === "base64url";
}

function isProvenance(value: unknown): value is Provenance {
  return value === "production" || value === "test" || value === "simulated" || value === "unknown";
}

function isProofSystem(value: unknown): value is ProofSystem {
  return value === "bitvm2"
    || value === "bitvm3-recursive"
    || value === "groth16"
    || value === "plonk"
    || value === "stark";
}

function isCurve(value: unknown): value is Curve {
  return value === "secp256k1" || value === "bn254" || value === "bls12-381" || value === "none";
}

function isPaymentNetwork(value: unknown): value is PaymentNetwork {
  return value === "bitcoin-mainnet"
    || value === "bitcoin-testnet"
    || value === "bitcoin-signet"
    || value === "bitcoin-regtest";
}

export function isVerificationFailureCode(value: unknown): value is VerificationFailureCode {
  return value === "backend_unavailable"
    || value === "unsupported_backend"
    || value === "malformed_request"
    || value === "malformed_encoding"
    || value === "digest_unavailable"
    || value === "proof_digest_mismatch"
    || value === "proof_invalid"
    || value === "verification_key_mismatch"
    || value === "public_input_mismatch"
    || value === "statement_mismatch"
    || value === "domain_mismatch"
    || value === "curve_mismatch"
    || value === "circuit_mismatch"
    || value === "backend_mismatch"
    || value === "invalid_challenge"
    || value === "invalid_signature"
    || value === "aggregation_not_found"
    || value === "simulated_result"
    || value === "observer_unavailable"
    || value === "payment_not_observed"
    || value === "payment_mismatch"
    || value === "payment_hash_not_authority"
    || value === "decryption_key_unavailable"
    || value === "internal_error"
    || value === "unknown_action";
}

function isBackendIdentity(value: unknown): value is BackendIdentity {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id)
    && isNonEmptyString(value.version)
    && isDigest(value.artifact_digest);
}

function isCircuitBinding(value: unknown): value is CircuitBinding {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id) && isDigest(value.digest);
}

function isVerificationKeyBinding(value: unknown): value is VerificationKeyBinding {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id) && isDigest(value.digest);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

function decodeEncodedBytes(value: string, encoding: Encoding): Uint8Array | undefined {
  if (encoding === "hex") {
    if (value.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(value)) return undefined;
    const bytes = new Uint8Array(value.length / 2);
    for (let index = 0; index < value.length; index += 2) {
      bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
    }
    return bytes;
  }

  const isBase64Url = encoding === "base64url";
  const alphabet = isBase64Url ? /^[A-Za-z0-9_-]*$/ : /^[A-Za-z0-9+/]*={0,2}$/;
  if (!alphabet.test(value) || value.length % 4 === 1) return undefined;

  const normalized = isBase64Url
    ? value.replace(/-/g, "+").replace(/_/g, "/")
    : value;
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    const binary = globalThis.atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return undefined;
  }
}

async function sha256Bytes(bytes: Uint8Array): Promise<Digest> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable");
  }
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}` as Digest;
}

export async function digestEncodedValue(value: string, encoding: Encoding): Promise<Digest> {
  const bytes = decodeEncodedBytes(value, encoding);
  if (!bytes) throw new Error("Malformed encoded value");
  return sha256Bytes(bytes);
}

export function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Non-finite numbers are not canonicalizable");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new Error("Unsupported value in canonical JSON");
}

export async function digestCanonical(value: unknown): Promise<Digest> {
  return sha256Bytes(new TextEncoder().encode(canonicalJson(value)));
}

function publicInputDigestMaterial(input: PublicInputBinding): Record<string, unknown> {
  return {
    index: input.index,
    name: input.name,
    encoding: input.encoding,
    digest: input.digest,
  };
}

function requestDigestMaterial(request: VerifierRequest): Record<string, unknown> {
  return {
    contract_version: request.contract_version,
    proof_system: request.proof_system,
    curve: request.curve,
    circuit: request.circuit,
    verification_key: request.verification_key,
    public_inputs: request.public_inputs.map(publicInputDigestMaterial),
    public_inputs_digest: request.public_inputs_digest,
    proof: request.proof,
    statement_digest: request.statement_digest,
    domain_digest: request.domain_digest,
    backend: request.backend,
    provenance: request.provenance,
  };
}

export async function digestVerifierRequest(request: VerifierRequest): Promise<Digest> {
  return digestCanonical(requestDigestMaterial(request));
}

export async function createVerifierRequest(input: CreateVerifierRequestInput): Promise<VerifierRequest> {
  const public_inputs = await Promise.all(input.public_inputs.map(async (publicInput) => ({
    ...publicInput,
    digest: await digestEncodedValue(publicInput.value, publicInput.encoding),
  })));

  const proof: ProofBinding = {
    ...input.proof,
    digest: await digestEncodedValue(input.proof.bytes, input.proof.encoding),
  };

  const public_inputs_digest = await digestCanonical(public_inputs.map(publicInputDigestMaterial));
  return {
    contract_version: VERIFIER_CONTRACT_VERSION,
    proof_system: input.proof_system,
    curve: input.curve,
    circuit: input.circuit,
    verification_key: input.verification_key,
    public_inputs,
    public_inputs_digest,
    proof,
    statement_digest: input.statement_digest,
    domain_digest: input.domain_digest,
    backend: input.backend,
    provenance: input.provenance,
  };
}

function failureStatus(code: VerificationFailureCode): VerificationStatus {
  if (code === "backend_unavailable" || code === "observer_unavailable") return "unavailable";
  if (code === "unsupported_backend") return "unsupported";
  if (code === "malformed_request" || code === "malformed_encoding" || code === "digest_unavailable") return "malformed";
  return "invalid";
}

export function createVerificationResult(input: {
  status: VerificationStatus;
  backend: BackendIdentity;
  provenance: Provenance;
  request_digest?: Digest;
  failure_code?: VerificationFailureCode;
  error?: string;
  checked_at?: string;
}): VerificationResult {
  return {
    contract_version: VERIFIER_CONTRACT_VERSION,
    request_digest: input.request_digest,
    status: input.status,
    verified: input.status === "valid",
    backend: input.backend,
    provenance: input.provenance,
    checked_at: input.checked_at ?? new Date().toISOString(),
    failure_code: input.failure_code,
    error: input.error,
  };
}

export function createVerificationFailure(
  failure_code: VerificationFailureCode,
  error: string,
  options: {
    request_digest?: Digest;
    backend?: BackendIdentity;
    provenance?: Provenance;
  } = {},
): VerificationResult {
  return createVerificationResult({
    status: failureStatus(failure_code),
    backend: options.backend ?? UNAVAILABLE_BACKEND,
    provenance: options.provenance ?? "unknown",
    request_digest: options.request_digest,
    failure_code,
    error,
  });
}

export async function validateVerifierRequest(value: unknown): Promise<VerifierValidation> {
  if (!isRecord(value)) {
    return { ok: false, failure_code: "malformed_request", error: "Verifier request must be an object" };
  }

  if (value.contract_version !== VERIFIER_CONTRACT_VERSION
    || !isProofSystem(value.proof_system)
    || !isCurve(value.curve)
    || !isCircuitBinding(value.circuit)
    || !isVerificationKeyBinding(value.verification_key)
    || !isBackendIdentity(value.backend)
    || !isProvenance(value.provenance)
    || !isDigest(value.statement_digest)
    || !isDigest(value.domain_digest)) {
    return { ok: false, failure_code: "malformed_request", error: "Verifier request is missing a canonical binding" };
  }

  if (!isRecord(value.proof)
    || !isNonEmptyString(value.proof.bytes)
    || !isEncoding(value.proof.encoding)
    || !isDigest(value.proof.digest)) {
    return { ok: false, failure_code: "malformed_encoding", error: "Proof bytes or encoding is malformed" };
  }

  const rawInputs = value.public_inputs;
  if (!Array.isArray(rawInputs) || !isDigest(value.public_inputs_digest)) {
    return { ok: false, failure_code: "malformed_request", error: "Ordered public inputs are required" };
  }

  const public_inputs: PublicInputBinding[] = [];
  const names = new Set<string>();
  for (let index = 0; index < rawInputs.length; index += 1) {
    const rawInput = rawInputs[index];
    if (!isRecord(rawInput)
      || !isFiniteInteger(rawInput.index)
      || rawInput.index !== index
      || !isNonEmptyString(rawInput.name)
      || names.has(rawInput.name)
      || !isNonEmptyString(rawInput.value)
      || !isEncoding(rawInput.encoding)
      || !isDigest(rawInput.digest)) {
      return { ok: false, failure_code: "public_input_mismatch", error: "Public inputs must be ordered and uniquely named" };
    }
    names.add(rawInput.name);
    public_inputs.push({
      index: rawInput.index,
      name: rawInput.name,
      value: rawInput.value,
      encoding: rawInput.encoding,
      digest: rawInput.digest,
    });
  }

  try {
    const proofDigest = await digestEncodedValue(value.proof.bytes, value.proof.encoding);
    if (proofDigest !== value.proof.digest) {
      return { ok: false, failure_code: "proof_digest_mismatch", error: "Proof digest does not match proof bytes" };
    }

    for (const input of public_inputs) {
      const inputDigest = await digestEncodedValue(input.value, input.encoding);
      if (inputDigest !== input.digest) {
        return { ok: false, failure_code: "public_input_mismatch", error: `Public input '${input.name}' digest does not match its value` };
      }
    }

    const publicInputsDigest = await digestCanonical(public_inputs.map(publicInputDigestMaterial));
    if (publicInputsDigest !== value.public_inputs_digest) {
      return { ok: false, failure_code: "public_input_mismatch", error: "Public input order or names do not match the bound digest" };
    }

    const request: VerifierRequest = {
      contract_version: VERIFIER_CONTRACT_VERSION,
      proof_system: value.proof_system,
      curve: value.curve,
      circuit: value.circuit,
      verification_key: value.verification_key,
      public_inputs,
      public_inputs_digest: value.public_inputs_digest,
      proof: {
        bytes: value.proof.bytes,
        encoding: value.proof.encoding,
        digest: value.proof.digest,
      },
      statement_digest: value.statement_digest,
      domain_digest: value.domain_digest,
      backend: value.backend,
      provenance: value.provenance,
    };

    return {
      ok: true,
      request,
      request_digest: await digestVerifierRequest(request),
    };
  } catch (error: unknown) {
    return {
      ok: false,
      failure_code: error instanceof Error && error.message.includes("Web Crypto")
        ? "digest_unavailable"
        : "malformed_encoding",
      error: error instanceof Error ? error.message : "Unable to validate encoded verifier data",
    };
  }
}

function backendEquals(left: BackendIdentity, right: BackendIdentity): boolean {
  return left.id === right.id
    && left.version === right.version
    && left.artifact_digest === right.artifact_digest;
}

export async function validateVerificationResult(
  value: unknown,
  request: VerifierRequest,
  request_digest: Digest,
): Promise<VerificationResultValidation> {
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || !isDigest(value.request_digest)
    || value.request_digest !== request_digest
    || (value.status !== "valid"
      && value.status !== "invalid"
      && value.status !== "unavailable"
      && value.status !== "unsupported"
      && value.status !== "malformed")
    || typeof value.verified !== "boolean"
    || !isBackendIdentity(value.backend)
    || !isProvenance(value.provenance)
    || typeof value.checked_at !== "string") {
    return { ok: false, failure_code: "malformed_request", error: "Verifier result is not a canonical v1 result" };
  }

  if ((value.status === "valid") !== value.verified) {
    return { ok: false, failure_code: "malformed_request", error: "Verifier result status and verified flag disagree" };
  }

  if (value.status === "valid" || value.status === "invalid") {
    if (!backendEquals(value.backend, request.backend)) {
      return { ok: false, failure_code: "backend_mismatch", error: "Verifier result backend does not match the request" };
    }
  }

  if (value.failure_code !== undefined && !isVerificationFailureCode(value.failure_code)) {
    return { ok: false, failure_code: "malformed_request", error: "Verifier result failure code is not recognized" };
  }

  const result: VerificationResult = {
    contract_version: VERIFIER_CONTRACT_VERSION,
    request_digest: value.request_digest,
    status: value.status,
    verified: value.verified,
    backend: value.backend,
    provenance: value.provenance,
    checked_at: value.checked_at,
    failure_code: isVerificationFailureCode(value.failure_code) ? value.failure_code : undefined,
    error: typeof value.error === "string" ? value.error : undefined,
  };

  if (result.status !== "valid" && !result.failure_code) {
    return { ok: false, failure_code: "malformed_request", error: "Non-success verifier results require a typed failure code" };
  }

  return { ok: true, result };
}

export function isProductionVerified(result: VerificationResult): boolean {
  return result.status === "valid"
    && result.verified
    && result.provenance === "production"
    && result.failure_code === undefined;
}

export function rejectNonProductionVerification(result: VerificationResult): VerificationResult {
  if (result.status === "valid" && result.provenance !== "production") {
    return createVerificationFailure("simulated_result", "Non-production verification cannot authorize settlement", {
      request_digest: result.request_digest,
      backend: result.backend,
      provenance: result.provenance,
    });
  }
  return result;
}

export async function createPaymentObservation(input: {
  request: PaymentObservationRequest;
  txid: string;
  amount: number;
  confirmations: number;
  observer: BackendIdentity;
  provenance: Provenance;
  observed_at?: string;
}): Promise<PaymentObservation> {
  const observationWithoutDigest = {
    contract_version: VERIFIER_CONTRACT_VERSION,
    intent_id: input.request.intent_id,
    address: input.request.address,
    expected_amount: input.request.expected_amount,
    network: input.request.network,
    txid: input.txid,
    amount: input.amount,
    confirmations: input.confirmations,
    observer: input.observer,
    provenance: input.provenance,
    observed_at: input.observed_at ?? new Date().toISOString(),
  };
  return {
    ...observationWithoutDigest,
    observation_digest: await digestCanonical(observationWithoutDigest),
  };
}

export async function validatePaymentObservation(
  value: unknown,
  request: PaymentObservationRequest,
): Promise<PaymentObservationValidation> {
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || value.intent_id !== request.intent_id
    || value.address !== request.address
    || value.expected_amount !== request.expected_amount
    || value.network !== request.network
    || !isNonEmptyString(value.txid)
    || typeof value.amount !== "number"
    || !Number.isFinite(value.amount)
    || value.amount !== request.expected_amount
    || !isFiniteInteger(value.confirmations)
    || value.confirmations < 0
    || !isPaymentNetwork(value.network)
    || !isBackendIdentity(value.observer)
    || !isProvenance(value.provenance)
    || typeof value.observed_at !== "string"
    || !isDigest(value.observation_digest)) {
    return { ok: false, failure_code: "payment_mismatch", error: "Payment observation does not match the intent" };
  }

  const observation: PaymentObservation = {
    contract_version: VERIFIER_CONTRACT_VERSION,
    intent_id: value.intent_id,
    address: value.address,
    expected_amount: value.expected_amount,
    network: value.network,
    txid: value.txid,
    amount: value.amount,
    confirmations: value.confirmations,
    observer: value.observer,
    provenance: value.provenance,
    observed_at: value.observed_at,
    observation_digest: value.observation_digest,
  };

  try {
    const withoutDigest = { ...observation };
    delete (withoutDigest as { observation_digest?: Digest }).observation_digest;
    const digest = await digestCanonical(withoutDigest);
    if (digest !== observation.observation_digest) {
      return { ok: false, failure_code: "payment_mismatch", error: "Payment observation digest does not match its fields" };
    }
  } catch (error: unknown) {
    return {
      ok: false,
      failure_code: "digest_unavailable",
      error: error instanceof Error ? error.message : "Unable to validate payment observation digest",
    };
  }

  return { ok: true, observation };
}

function paymentStatus(code: VerificationFailureCode): PaymentObservationStatus {
  if (code === "observer_unavailable") return "unavailable";
  if (code === "payment_not_observed") return "not_observed";
  if (code === "simulated_result") return "rejected";
  if (code === "payment_mismatch") return "mismatch";
  return "malformed";
}

export function createPaymentFailure(
  failure_code: VerificationFailureCode,
  error: string,
  provenance: Provenance = "unknown",
): PaymentObservationResult {
  return {
    contract_version: VERIFIER_CONTRACT_VERSION,
    status: paymentStatus(failure_code),
    detected: false,
    provenance,
    failure_code,
    error,
  };
}

export function isProductionPayment(result: PaymentObservationResult): result is PaymentObservationResult & { observation: PaymentObservation } {
  return result.status === "observed"
    && result.detected
    && result.provenance === "production"
    && result.observation !== undefined
    && result.observation.provenance === "production";
}
