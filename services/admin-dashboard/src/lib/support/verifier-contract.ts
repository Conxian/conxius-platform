/**
* Versioned, transport-neutral contracts for proof verification and payment
* observation. This module validates bindings and provenance; it does not
* implement pairing arithmetic, recursive proof execution, or chain access.
*/

export const VERIFIER_CONTRACT_VERSION = "conxian.verifier.v1" as const;
export const VERIFIER_RESOURCE_LIMITS_VERSION = "conxian.verifier.limits.v1" as const;
export const VERIFIER_SIGNATURE_ENCODING_VERSION = "conxian.verifier.signature.v1" as const;
export const VERIFIER_ATTESTATION_LIMITS_VERSION = "conxian.verifier.attestation.v1" as const;
export const VERIFIER_ZKCP_RETENTION_POLICY_VERSION = "conxian.zkcp.retention.v1" as const;
export const VERIFIER_ZKCP_LIST_POLICY_VERSION = "conxian.zkcp.list.v1" as const;
export const VERIFIER_BITVM2_RETENTION_POLICY_VERSION = "conxian.bitvm2.retention.v1" as const;
export const VERIFIER_BITVM3_RETENTION_POLICY_VERSION = "conxian.bitvm3.retention.v1" as const;
export const VERIFIER_BITVM3_TOMBSTONE_POLICY_VERSION = "conxian.bitvm3.tombstone.v1" as const;
export const VERIFIER_SIGNATURE_ENCODING = "hex" as const;

/**
* Resource limits are part of the boundary contract. Keep these values
* explicit and versioned so callers and tests do not silently inherit an
* unbounded decoder/hash surface when a backend is added later.
*/
export const VERIFIER_RESOURCE_LIMITS = Object.freeze({
  maxRequestBodyBytes: 512 * 1024,
  maxProofBytes: 128 * 1024,
  maxPublicInputCount: 32,
  maxPublicInputBytes: 16 * 1024,
  maxPublicInputsBytes: 128 * 1024,
  maxIdentifierChars: 128,
  maxVersionChars: 64,
  maxAddressChars: 256,
  maxTxidChars: 256,
  maxSignatureChars: 1024,
  minSignatureBytes: 64,
  maxSignatureBytes: 512,
  maxSignerCount: 64,
  maxTapCount: 1024,
  maxRecursiveHeight: 1024,
  maxConfirmations: 1_000_000,
  maxErrorChars: 1024,
  maxTimestampChars: 64,
  maxActionChars: 64,
  maxZkcpActiveIntents: 1024,
  maxZkcpTotalIntents: 2048,
  maxZkcpListPageSize: 100,
  maxZkcpListOffset: 2048,
  maxZkcpTerminalRetentionMs: 15 * 60 * 1000,
} as const);

/**
* Adapter attestations are bounded JSON-like evidence, not arbitrary object
* graphs. These limits are checked while a detached snapshot is built,
* before canonicalization or storage.
*/
export const VERIFIER_ATTESTATION_LIMITS = Object.freeze({
  maxTotalEncodedChars: 4096,
  maxTotalEncodedBytes: 16 * 1024,
  maxDepth: 8,
  maxObjectKeys: 16,
  maxArrayLength: 16,
  maxKeyChars: 64,
  maxStringChars: 1024,
} as const);

/**
* BitVM3 terminal state is process-local orchestration evidence. The cap and
* TTL are part of the public boundary contract so a future backend cannot turn
* unique proof ids into process-lifetime state without an explicit policy.
*/
export const VERIFIER_BITVM3_RETENTION_POLICY = Object.freeze({
  version: VERIFIER_BITVM3_RETENTION_POLICY_VERSION,
  maxRetainedStates: 1024,
  terminalTtlMs: 15 * 60 * 1000,
} as const);

/**
* BitVM2 floor and aggregation evidence is process-local orchestration state.
* A hard cap is mandatory; the terminal TTL only applies to explicitly closed
* records and never to floors that can still receive challenges or signatures.
*/
export const VERIFIER_BITVM2_RETENTION_POLICY = Object.freeze({
  version: VERIFIER_BITVM2_RETENTION_POLICY_VERSION,
  maxRetainedFloors: 1024,
  terminalTtlMs: 15 * 60 * 1000,
} as const);

/**
* Expired BitVM3 state is replaced by a bounded identity tombstone. The window
* is intentionally finite: permanent proof-id uniqueness belongs to a durable
* Gateway/Core registry, not process-local dashboard memory.
*/
export const VERIFIER_BITVM3_TOMBSTONE_POLICY = Object.freeze({
  version: VERIFIER_BITVM3_TOMBSTONE_POLICY_VERSION,
  maxTombstones: 2048,
  ttlMs: 15 * 60 * 1000,
} as const);

export type VerifierContractVersion = typeof VERIFIER_CONTRACT_VERSION;
export type VerifierSignatureEncodingVersion = typeof VERIFIER_SIGNATURE_ENCODING_VERSION;
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
export type BackendAuthority = "authoritative" | "non_authoritative";

export interface BackendIdentity {
  id: string;
  version: string;
  artifact_digest: Digest;
  authority: BackendAuthority;
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
  | "resource_limit_exceeded"
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
  | "duplicate_signer"
  | "unauthorized_signer"
  | "attestation_mismatch"
  | "invalid_challenge"
  | "invalid_signature"
  | "aggregation_not_found"
  | "simulated_result"
  | "observer_unavailable"
  | "payment_not_observed"
  | "payment_mismatch"
  | "payment_hash_not_authority"
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
  authority: "non_authoritative",
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

function isBoundedNonEmptyString(value: unknown, maxLength: number): value is string {
  return isNonEmptyString(value) && value.length <= maxLength;
}

export const BOUNDED_IDENTIFIER_SENTINEL = "unknown" as const;

/**
* Invalid and oversized identifiers collapse to a fixed sentinel. This keeps
* direct-library failures, route payloads, and logs from echoing attacker
* controlled input outside the identifier boundary.
*/
export function boundedIdentifier(value: unknown): string {
  return isBoundedNonEmptyString(value, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
    ? value
    : BOUNDED_IDENTIFIER_SENTINEL;
}

function isOversizedString(value: unknown, maxLength: number): boolean {
  return typeof value === "string" && value.length > maxLength;
}

export interface NormalizedBoundaryError {
  message: string;
  truncated: boolean;
}

/**
* Adapter errors are untrusted boundary data. Preserve useful context only
* within the versioned error ceiling and never call arbitrary `toString()`
* implementations on thrown values.
*/
export function normalizeBoundaryError(value: unknown, fallback: string): NormalizedBoundaryError {
  const fallbackMessage = typeof fallback === "string" && fallback.length > 0
    ? fallback
    : "Boundary adapter failed";
  const rawMessage = value instanceof Error && typeof value.message === "string"
    ? value.message
    : typeof value === "string"
      ? value
      : fallbackMessage;
  const message = rawMessage.length > 0 ? rawMessage : fallbackMessage;
  if (message.length <= VERIFIER_RESOURCE_LIMITS.maxErrorChars) {
    return { message, truncated: false };
  }
  return {
    message: message.slice(0, VERIFIER_RESOURCE_LIMITS.maxErrorChars),
    truncated: true,
  };
}

export interface BoundedJsonSnapshotSuccess {
  ok: true;
  snapshot: unknown;
}

export interface BoundedJsonSnapshotFailure {
  ok: false;
  failure_code: "resource_limit_exceeded" | "malformed_request";
  error: string;
}

export type BoundedJsonSnapshotResult = BoundedJsonSnapshotSuccess | BoundedJsonSnapshotFailure;

export interface CanonicalJsonPayloadSuccess {
  ok: true;
  snapshot: unknown;
  canonical: string;
}

export interface CanonicalJsonPayloadFailure {
  ok: false;
  failure_code: "resource_limit_exceeded" | "malformed_request";
  error: string;
}

export type CanonicalJsonPayloadResult = CanonicalJsonPayloadSuccess | CanonicalJsonPayloadFailure;

interface SnapshotEnterFrame {
  kind: "enter";
  value: unknown;
  depth: number;
  parent?: Record<string, unknown> | unknown[];
  key?: string | number;
}

interface SnapshotExitFrame {
  kind: "exit";
  original: object;
  snapshot: Record<string, unknown> | unknown[];
}

type SnapshotFrame = SnapshotEnterFrame | SnapshotExitFrame;

function isForbiddenJsonKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

function canonicalTokenSize(value: null | boolean | number | string): { chars: number; bytes: number } {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== "string") throw new Error("Unable to encode bounded JSON value");
  return {
    chars: encoded.length,
    bytes: new TextEncoder().encode(encoded).byteLength,
  };
}

/**
* Build a detached, deeply frozen, bounded JSON-like snapshot without
* recursive traversal. Accessors, symbols, custom prototypes, cycles, sparse
* arrays, non-finite numbers, and prototype-pollution keys are rejected.
*/
export function snapshotBoundedJson(value: unknown): BoundedJsonSnapshotResult {
  let totalChars = 0;
  let totalBytes = 0;
  let root: unknown;
  const active = new WeakSet<object>();
  const stack: SnapshotFrame[] = [{ kind: "enter", value, depth: 0 }];

  const fail = (
    failure_code: BoundedJsonSnapshotFailure["failure_code"],
    error: string,
  ): BoundedJsonSnapshotFailure => ({ ok: false, failure_code, error });

  const account = (chars: number, bytes: number): BoundedJsonSnapshotFailure | undefined => {
    totalChars += chars;
    totalBytes += bytes;
    if (totalChars > VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedChars
      || totalBytes > VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedBytes) {
      return fail("resource_limit_exceeded", "Attestation exceeds the v1 encoded-size limit");
    }
    return undefined;
  };

  const assign = (
    parent: Record<string, unknown> | unknown[] | undefined,
    key: string | number | undefined,
    child: unknown,
  ): void => {
    if (parent === undefined || key === undefined) {
      root = child;
      return;
    }
    if (Array.isArray(parent)) {
      parent[key as number] = child;
      return;
    }
    Object.defineProperty(parent, key as string, {
      configurable: true,
      enumerable: true,
      value: child,
      writable: true,
    });
  };

  try {
    while (stack.length > 0) {
      const frame = stack.pop() as SnapshotFrame;
      if (frame.kind === "exit") {
        Object.freeze(frame.snapshot);
        active.delete(frame.original);
        continue;
      }

      const current = frame.value;
      if (current === null || typeof current === "boolean" || typeof current === "string" || typeof current === "number") {
        if (typeof current === "string" && current.length > VERIFIER_ATTESTATION_LIMITS.maxStringChars) {
          return fail("resource_limit_exceeded", "Attestation string exceeds the v1 length limit");
        }
        if (typeof current === "number" && !Number.isFinite(current)) {
          return fail("malformed_request", "Attestation contains a non-finite number");
        }
        const size = canonicalTokenSize(current);
        const budgetFailure = account(size.chars, size.bytes);
        if (budgetFailure) return budgetFailure;
        assign(frame.parent, frame.key, current);
        continue;
      }

      if (typeof current !== "object") {
        return fail("malformed_request", "Attestation contains a value outside the JSON-like type set");
      }
      if (frame.depth > VERIFIER_ATTESTATION_LIMITS.maxDepth) {
        return fail("resource_limit_exceeded", "Attestation exceeds the v1 depth limit");
      }
      if (active.has(current)) {
        return fail("malformed_request", "Attestation contains a cycle");
      }

      const isArray = Array.isArray(current);
      const prototype = Object.getPrototypeOf(current);
      if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
        return fail("malformed_request", "Attestation contains a disallowed prototype");
      }

      const ownKeys = Reflect.ownKeys(current);
      if (isArray) {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(current, "length");
        if (!lengthDescriptor || !("value" in lengthDescriptor)
          || !Number.isSafeInteger(lengthDescriptor.value)
          || lengthDescriptor.value < 0
          || lengthDescriptor.value > VERIFIER_ATTESTATION_LIMITS.maxArrayLength
          || ownKeys.length > VERIFIER_ATTESTATION_LIMITS.maxArrayLength + 1) {
          return fail("resource_limit_exceeded", "Attestation array exceeds the v1 length limit");
        }
        const length = lengthDescriptor.value;
        for (const ownKey of ownKeys) {
          if (ownKey === "length") continue;
          if (typeof ownKey !== "string" || !/^(0|[1-9][0-9]*)$/.test(ownKey)) {
            return fail("malformed_request", "Attestation array contains a non-index property");
          }
          const index = Number(ownKey);
          if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
            return fail("malformed_request", "Attestation array contains an invalid index");
          }
        }
        for (let index = 0; index < length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
            return fail("malformed_request", "Attestation arrays must not contain holes or accessors");
          }
        }
        const structuralChars = 2 + Math.max(0, length - 1);
        const budgetFailure = account(structuralChars, structuralChars);
        if (budgetFailure) return budgetFailure;
        const snapshot: unknown[] = [];
        assign(frame.parent, frame.key, snapshot);
        active.add(current);
        stack.push({ kind: "exit", original: current, snapshot });
        for (let index = length - 1; index >= 0; index -= 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index)) as PropertyDescriptor;
          stack.push({ kind: "enter", value: descriptor.value, depth: frame.depth + 1, parent: snapshot, key: index });
        }
        continue;
      }

      if (ownKeys.length > VERIFIER_ATTESTATION_LIMITS.maxObjectKeys) {
        return fail("resource_limit_exceeded", "Attestation object exceeds the v1 key-count limit");
      }
      const keys: string[] = [];
      for (const ownKey of ownKeys) {
        if (typeof ownKey !== "string"
          || ownKey.length > VERIFIER_ATTESTATION_LIMITS.maxKeyChars
          || isForbiddenJsonKey(ownKey)) {
          return fail("malformed_request", "Attestation contains an invalid object key");
        }
        const descriptor = Object.getOwnPropertyDescriptor(current, ownKey);
        if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
          return fail("malformed_request", "Attestation objects must not contain accessors or hidden properties");
        }
        keys.push(ownKey);
      }
      keys.sort();
      let structuralChars = 2 + Math.max(0, keys.length - 1);
      let structuralBytes = structuralChars;
      for (const key of keys) {
        const size = canonicalTokenSize(key);
        structuralChars += size.chars + 1;
        structuralBytes += size.bytes + 1;
      }
      const budgetFailure = account(structuralChars, structuralBytes);
      if (budgetFailure) return budgetFailure;

      const snapshot: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      assign(frame.parent, frame.key, snapshot);
      active.add(current);
      stack.push({ kind: "exit", original: current, snapshot });
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        const descriptor = Object.getOwnPropertyDescriptor(current, key) as PropertyDescriptor;
        stack.push({ kind: "enter", value: descriptor.value, depth: frame.depth + 1, parent: snapshot, key });
      }
    }
  } catch {
    return fail("malformed_request", "Attestation could not be safely snapshotted");
  }

  return { ok: true, snapshot: root };
}

export function isCanonicalSignatureHex(value: unknown): value is string {
  return typeof value === "string"
    && value.length % 2 === 0
    && value.length >= VERIFIER_RESOURCE_LIMITS.minSignatureBytes * 2
    && value.length <= VERIFIER_RESOURCE_LIMITS.maxSignatureBytes * 2
    && /^[0-9a-fA-F]+$/.test(value);
}

export function isDigest(value: unknown): value is Digest {
  return typeof value === "string"
    && value.length === "sha256:".length + 64
    && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isEncoding(value: unknown): value is Encoding {
  return value === "hex" || value === "base64" || value === "base64url";
}

export function isProvenance(value: unknown): value is Provenance {
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

export function isPaymentNetwork(value: unknown): value is PaymentNetwork {
  return value === "bitcoin-mainnet"
    || value === "bitcoin-testnet"
    || value === "bitcoin-signet"
    || value === "bitcoin-regtest";
}

export function isVerificationFailureCode(value: unknown): value is VerificationFailureCode {
  return value === "backend_unavailable"
    || value === "unsupported_backend"
    || value === "malformed_request"
    || value === "resource_limit_exceeded"
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
    || value === "duplicate_signer"
    || value === "unauthorized_signer"
    || value === "attestation_mismatch"
    || value === "invalid_challenge"
    || value === "invalid_signature"
    || value === "aggregation_not_found"
    || value === "simulated_result"
    || value === "observer_unavailable"
    || value === "payment_not_observed"
    || value === "payment_mismatch"
    || value === "payment_hash_not_authority"
    || value === "internal_error"
    || value === "unknown_action";
}

export function isBackendIdentity(value: unknown): value is BackendIdentity {
  if (!isRecord(value)) return false;
  return isBoundedNonEmptyString(value.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
    && isBoundedNonEmptyString(value.version, VERIFIER_RESOURCE_LIMITS.maxVersionChars)
    && isDigest(value.artifact_digest)
    && (value.authority === "authoritative" || value.authority === "non_authoritative");
}

export function backendIdentityEquals(left: BackendIdentity, right: BackendIdentity): boolean {
  return left.id === right.id
    && left.version === right.version
    && left.artifact_digest === right.artifact_digest
    && left.authority === right.authority;
}

export function isUnavailableBackend(value: unknown): value is BackendIdentity {
  return isBackendIdentity(value) && backendIdentityEquals(value, UNAVAILABLE_BACKEND);
}

export function isAuthoritativeBackendIdentity(value: unknown): value is BackendIdentity {
  return isBackendIdentity(value)
    && value.authority === "authoritative"
    && !isUnavailableBackend(value);
}

function isCircuitBinding(value: unknown): value is CircuitBinding {
  if (!isRecord(value)) return false;
  return isBoundedNonEmptyString(value.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars) && isDigest(value.digest);
}

function isVerificationKeyBinding(value: unknown): value is VerificationKeyBinding {
  if (!isRecord(value)) return false;
  return isBoundedNonEmptyString(value.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars) && isDigest(value.digest);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
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

export function encodedByteUpperBound(value: string, encoding: Encoding): number {
  if (encoding === "hex") return Math.ceil(value.length / 2);
  return Math.ceil((value.length * 3) / 4);
}

export function maxEncodedLengthForBytes(maxBytes: number, encoding: Encoding): number {
  if (encoding === "hex") return maxBytes * 2;
  return Math.ceil((maxBytes * 4) / 3) + 4;
}

export function isEncodedValueWithinLimit(
  value: unknown,
  encoding: Encoding,
  maxBytes: number,
): value is string {
  return typeof value === "string"
    && value.length <= maxEncodedLengthForBytes(maxBytes, encoding)
    && encodedByteUpperBound(value, encoding) <= maxBytes;
}

async function sha256Bytes(bytes: Uint8Array): Promise<Digest> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable");
  }
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}` as Digest;
}

export async function digestEncodedValue(
  value: string,
  encoding: Encoding,
  maxBytes: number = VERIFIER_RESOURCE_LIMITS.maxProofBytes,
): Promise<Digest> {
  if (!isEncoding(encoding) || !isEncodedValueWithinLimit(value, encoding, maxBytes)) {
    throw new Error("Verifier resource limit exceeded before encoded digest");
  }
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

/**
* Parse adapter evidence only after its encoded representation is bounded.
* Signature-verifier results must provide this canonical JSON string rather
* than an adapter-owned object or proxy. The standard JSON parser resolves a
* duplicate key to its last value; requiring byte-for-byte equality with the
* canonical reserialization makes that reserialization authoritative and
* rejects duplicate-key, whitespace, key-order, escape, and number-format
* ambiguities without adding a second parser dependency.
*/
export function parseBoundedJsonPayload(value: unknown): CanonicalJsonPayloadResult {
  if (typeof value !== "string") {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "Bounded JSON evidence must be a canonical string payload",
    };
  }
  if (value.length > VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedChars) {
    return {
      ok: false,
      failure_code: "resource_limit_exceeded",
      error: "Bounded JSON evidence exceeds the v1 encoded-character limit",
    };
  }

  let encodedBytes: number;
  try {
    encodedBytes = new TextEncoder().encode(value).byteLength;
  } catch {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "Bounded JSON evidence could not be encoded",
    };
  }
  if (encodedBytes > VERIFIER_ATTESTATION_LIMITS.maxTotalEncodedBytes) {
    return {
      ok: false,
      failure_code: "resource_limit_exceeded",
      error: "Bounded JSON evidence exceeds the v1 encoded-byte limit",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "Bounded JSON evidence is malformed",
    };
  }

  const snapshot = snapshotBoundedJson(parsed);
  if (!snapshot.ok) return snapshot;

  let canonical: string;
  try {
    canonical = canonicalJson(snapshot.snapshot);
  } catch {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "Bounded JSON evidence is not canonicalizable",
    };
  }
  if (canonical !== value) {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "Bounded JSON evidence must match canonical reserialization",
    };
  }

  return { ok: true, snapshot: snapshot.snapshot, canonical };
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
  assertVerifierRequestResourceLimits(request);
  return digestCanonical(requestDigestMaterial(request));
}

function assertVerifierRequestResourceLimits(request: VerifierRequest): void {
  if (!Array.isArray(request.public_inputs)
    || request.public_inputs.length > VERIFIER_RESOURCE_LIMITS.maxPublicInputCount
    || !isDigest(request.public_inputs_digest)
    || !isDigest(request.statement_digest)
    || !isDigest(request.domain_digest)
    || !isCircuitBinding(request.circuit)
    || !isVerificationKeyBinding(request.verification_key)
    || !isBackendIdentity(request.backend)
    || !isEncoding(request.proof.encoding)
    || !isEncodedValueWithinLimit(request.proof.bytes, request.proof.encoding, VERIFIER_RESOURCE_LIMITS.maxProofBytes)) {
    throw new Error("Verifier resource limit exceeded before request digest");
  }

  let publicInputBytes = 0;
  for (const publicInput of request.public_inputs) {
    if (!isBoundedNonEmptyString(publicInput.name, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
      || !isEncoding(publicInput.encoding)
      || !isEncodedValueWithinLimit(publicInput.value, publicInput.encoding, VERIFIER_RESOURCE_LIMITS.maxPublicInputBytes)) {
      throw new Error("Verifier resource limit exceeded before request digest");
    }
    publicInputBytes += encodedByteUpperBound(publicInput.value, publicInput.encoding);
  }
  if (publicInputBytes > VERIFIER_RESOURCE_LIMITS.maxPublicInputsBytes) {
    throw new Error("Verifier resource limit exceeded before request digest");
  }
}

export async function createVerifierRequest(input: CreateVerifierRequestInput): Promise<VerifierRequest> {
  if (!isProofSystem(input.proof_system)
    || !isCurve(input.curve)
    || !isProvenance(input.provenance)
    || !isDigest(input.statement_digest)
    || !isDigest(input.domain_digest)
    || input.public_inputs.length > VERIFIER_RESOURCE_LIMITS.maxPublicInputCount) {
    throw new Error("Verifier resource limit exceeded: public input count");
  }
  if (!isCircuitBinding(input.circuit) || !isVerificationKeyBinding(input.verification_key)) {
    throw new Error("Malformed verifier circuit or verification-key binding");
  }
  if (!isBackendIdentity(input.backend)) {
    throw new Error("Malformed verifier backend identity");
  }
  if (!isEncoding(input.proof.encoding)
    || !isNonEmptyString(input.proof.bytes)
    || !isEncodedValueWithinLimit(input.proof.bytes, input.proof.encoding, VERIFIER_RESOURCE_LIMITS.maxProofBytes)) {
    throw new Error("Verifier resource limit exceeded: proof bytes");
  }

  let publicInputBytes = 0;
  for (const publicInput of input.public_inputs) {
    if (!isFiniteInteger(publicInput.index)
      || publicInput.index < 0
      || !isBoundedNonEmptyString(publicInput.name, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
      || !isEncoding(publicInput.encoding)
      || !isNonEmptyString(publicInput.value)
      || !isEncodedValueWithinLimit(publicInput.value, publicInput.encoding, VERIFIER_RESOURCE_LIMITS.maxPublicInputBytes)) {
      throw new Error("Verifier resource limit exceeded: public input");
    }
    publicInputBytes += encodedByteUpperBound(publicInput.value, publicInput.encoding);
  }
  if (publicInputBytes > VERIFIER_RESOURCE_LIMITS.maxPublicInputsBytes) {
    throw new Error("Verifier resource limit exceeded: public input bytes");
  }

  const public_inputs = await Promise.all(input.public_inputs.map(async (publicInput) => ({
    ...publicInput,
    digest: await digestEncodedValue(
      publicInput.value,
      publicInput.encoding,
      VERIFIER_RESOURCE_LIMITS.maxPublicInputBytes,
    ),
  })));

  const proof: ProofBinding = {
    ...input.proof,
    digest: await digestEncodedValue(input.proof.bytes, input.proof.encoding, VERIFIER_RESOURCE_LIMITS.maxProofBytes),
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
  if (code === "malformed_request"
    || code === "resource_limit_exceeded"
    || code === "malformed_encoding"
    || code === "digest_unavailable") return "malformed";
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
  error: unknown,
  options: {
    request_digest?: Digest;
    backend?: BackendIdentity;
    provenance?: Provenance;
  } = {},
): VerificationResult {
  const normalized = normalizeBoundaryError(error, "Verifier failure");
  const effectiveFailureCode = normalized.truncated ? "resource_limit_exceeded" : failure_code;
  return createVerificationResult({
    status: failureStatus(effectiveFailureCode),
    backend: options.backend ?? UNAVAILABLE_BACKEND,
    provenance: options.provenance ?? "unknown",
    request_digest: options.request_digest,
    failure_code: effectiveFailureCode,
    error: normalized.message,
  });
}

export async function validateVerifierRequest(value: unknown): Promise<VerifierValidation> {
  if (!isRecord(value)) {
    return { ok: false, failure_code: "malformed_request", error: "Verifier request must be an object" };
  }

  if ((isRecord(value.circuit) && isOversizedString(value.circuit.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars))
    || (isRecord(value.verification_key) && isOversizedString(value.verification_key.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars))
    || (isRecord(value.backend) && (
      isOversizedString(value.backend.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
      || isOversizedString(value.backend.version, VERIFIER_RESOURCE_LIMITS.maxVersionChars)
    ))
    || isOversizedString(value.statement_digest, "sha256:".length + 64)
    || isOversizedString(value.domain_digest, "sha256:".length + 64)) {
    return { ok: false, failure_code: "resource_limit_exceeded", error: "Verifier identifier or digest exceeds the v1 resource limit" };
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
  if (!isEncodedValueWithinLimit(value.proof.bytes, value.proof.encoding, VERIFIER_RESOURCE_LIMITS.maxProofBytes)) {
    return { ok: false, failure_code: "resource_limit_exceeded", error: "Encoded proof exceeds the v1 resource limit" };
  }

  const rawInputs = value.public_inputs;
  if (!Array.isArray(rawInputs) || !isDigest(value.public_inputs_digest)) {
    return { ok: false, failure_code: "malformed_request", error: "Ordered public inputs are required" };
  }
  if (rawInputs.length > VERIFIER_RESOURCE_LIMITS.maxPublicInputCount) {
    return { ok: false, failure_code: "resource_limit_exceeded", error: "Public-input count exceeds the v1 resource limit" };
  }

  const public_inputs: PublicInputBinding[] = [];
  const names = new Set<string>();
  let publicInputBytes = 0;
  for (let index = 0; index < rawInputs.length; index += 1) {
    const rawInput = rawInputs[index];
    if (isRecord(rawInput)
      && (isOversizedString(rawInput.name, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
        || (isEncoding(rawInput.encoding)
          && !isEncodedValueWithinLimit(rawInput.value, rawInput.encoding, VERIFIER_RESOURCE_LIMITS.maxPublicInputBytes)))) {
      return { ok: false, failure_code: "resource_limit_exceeded", error: "Public-input value exceeds the v1 resource limit" };
    }
    if (!isRecord(rawInput)
      || !isFiniteInteger(rawInput.index)
      || rawInput.index !== index
      || !isBoundedNonEmptyString(rawInput.name, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
      || names.has(rawInput.name)
      || !isNonEmptyString(rawInput.value)
      || !isEncoding(rawInput.encoding)
      || !isDigest(rawInput.digest)) {
      return { ok: false, failure_code: "public_input_mismatch", error: "Public inputs must be ordered and uniquely named" };
    }
    publicInputBytes += encodedByteUpperBound(rawInput.value, rawInput.encoding);
    if (publicInputBytes > VERIFIER_RESOURCE_LIMITS.maxPublicInputsBytes) {
      return { ok: false, failure_code: "resource_limit_exceeded", error: "Total public-input bytes exceed the v1 resource limit" };
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
    const proofDigest = await digestEncodedValue(
      value.proof.bytes,
      value.proof.encoding,
      VERIFIER_RESOURCE_LIMITS.maxProofBytes,
    );
    if (proofDigest !== value.proof.digest) {
      return { ok: false, failure_code: "proof_digest_mismatch", error: "Proof digest does not match proof bytes" };
    }

    for (const input of public_inputs) {
      const inputDigest = await digestEncodedValue(
        input.value,
        input.encoding,
        VERIFIER_RESOURCE_LIMITS.maxPublicInputBytes,
      );
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
    const normalized = normalizeBoundaryError(error, "Unable to validate encoded verifier data");
    return {
      ok: false,
      failure_code: normalized.truncated
        ? "resource_limit_exceeded"
        : error instanceof Error
          && typeof error.message === "string"
          && error.message.includes("Web Crypto")
          ? "digest_unavailable"
          : "malformed_encoding",
      error: normalized.message,
    };
  }
}

export async function validateVerificationResult(
  value: unknown,
  request: VerifierRequest,
  request_digest: Digest,
  authority?: BackendIdentity,
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
    || !isBoundedNonEmptyString(value.checked_at, VERIFIER_RESOURCE_LIMITS.maxTimestampChars)
    || (value.error !== undefined && typeof value.error !== "string")) {
    return { ok: false, failure_code: "malformed_request", error: "Verifier result is not a canonical v1 result" };
  }

  if (isOversizedString(value.error, VERIFIER_RESOURCE_LIMITS.maxErrorChars)) {
    return { ok: false, failure_code: "resource_limit_exceeded", error: "Verifier error exceeds the v1 resource limit" };
  }

  if ((value.status === "valid") !== value.verified) {
    return { ok: false, failure_code: "malformed_request", error: "Verifier result status and verified flag disagree" };
  }

  if (value.status === "valid" && value.failure_code !== undefined) {
    return { ok: false, failure_code: "malformed_request", error: "A valid verifier result cannot carry a failure code" };
  }

  if (value.status === "valid" || value.status === "invalid") {
    if (!backendIdentityEquals(value.backend, request.backend)) {
      return { ok: false, failure_code: "backend_mismatch", error: "Verifier result backend does not match the request" };
    }
  }

  if (value.status === "valid" && value.provenance === "production") {
    if (!isAuthoritativeBackendIdentity(value.backend)) {
      return { ok: false, failure_code: "backend_mismatch", error: "Only an authoritative backend can report a production-valid result" };
    }
    if (authority === undefined
      || !isAuthoritativeBackendIdentity(authority)
      || !backendIdentityEquals(value.backend, authority)) {
      return { ok: false, failure_code: "backend_mismatch", error: "Production-valid result is not bound to the configured verifier backend" };
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

export function isProductionVerified(result: VerificationResult, authority?: BackendIdentity): boolean {
  return result.status === "valid"
    && result.verified
    && result.provenance === "production"
    && result.failure_code === undefined
    && isAuthoritativeBackendIdentity(result.backend)
    && authority !== undefined
    && isAuthoritativeBackendIdentity(authority)
    && backendIdentityEquals(result.backend, authority);
}

export function rejectNonProductionVerification(
  result: VerificationResult,
  authority?: BackendIdentity,
): VerificationResult {
  if (result.status === "valid" && isUnavailableBackend(result.backend)) {
    return createVerificationFailure("backend_unavailable", "Unavailable verifier backend cannot authorize verification", {
      request_digest: result.request_digest,
      backend: result.backend,
      provenance: result.provenance,
    });
  }
  if (result.status === "valid" && result.provenance !== "production") {
    return createVerificationFailure("simulated_result", "Non-production verification cannot authorize settlement", {
      request_digest: result.request_digest,
      backend: result.backend,
      provenance: result.provenance,
    });
  }
  if (result.status === "valid"
    && (authority === undefined
      || !isAuthoritativeBackendIdentity(authority)
      || !isAuthoritativeBackendIdentity(result.backend)
      || !backendIdentityEquals(result.backend, authority))) {
    return createVerificationFailure("backend_mismatch", "Verifier result is not bound to an authoritative configured backend", {
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
  const observedAt = input.observed_at ?? new Date().toISOString();
  if (!isBoundedNonEmptyString(input.request.intent_id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
    || !isBoundedNonEmptyString(input.request.address, VERIFIER_RESOURCE_LIMITS.maxAddressChars)
    || !isFiniteInteger(input.request.expected_amount)
    || input.request.expected_amount <= 0
    || !isPaymentNetwork(input.request.network)
    || !isBoundedNonEmptyString(input.txid, VERIFIER_RESOURCE_LIMITS.maxTxidChars)
    || !isBoundedNonEmptyString(observedAt, VERIFIER_RESOURCE_LIMITS.maxTimestampChars)
    || !isFiniteInteger(input.amount)
    || input.amount <= 0
    || !isFiniteInteger(input.confirmations)
    || input.confirmations < 0
    || input.confirmations > VERIFIER_RESOURCE_LIMITS.maxConfirmations
    || !isBackendIdentity(input.observer)
    || !isProvenance(input.provenance)) {
    throw new Error("Verifier resource limit exceeded: payment observation");
  }
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
    observed_at: observedAt,
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
  if ((isOversizedString(request.intent_id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
      || isOversizedString(request.address, VERIFIER_RESOURCE_LIMITS.maxAddressChars)
      || isOversizedString(value && isRecord(value) ? value.txid : undefined, VERIFIER_RESOURCE_LIMITS.maxTxidChars)
      || isOversizedString(value && isRecord(value) ? value.observed_at : undefined, VERIFIER_RESOURCE_LIMITS.maxTimestampChars))
    || (isRecord(value)
      && typeof value.confirmations === "number"
      && value.confirmations > VERIFIER_RESOURCE_LIMITS.maxConfirmations)) {
    return { ok: false, failure_code: "resource_limit_exceeded", error: "Payment observation exceeds the v1 resource limit" };
  }
  if (!isRecord(value)
    || value.contract_version !== VERIFIER_CONTRACT_VERSION
    || value.intent_id !== request.intent_id
    || value.address !== request.address
    || !isFiniteInteger(request.expected_amount)
    || request.expected_amount <= 0
    || value.expected_amount !== request.expected_amount
    || value.network !== request.network
    || !isNonEmptyString(value.txid)
    || !isFiniteInteger(value.amount)
    || value.amount <= 0
    || value.amount !== request.expected_amount
    || !isFiniteInteger(value.confirmations)
    || value.confirmations < 0
    || value.confirmations > VERIFIER_RESOURCE_LIMITS.maxConfirmations
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
    const normalized = normalizeBoundaryError(error, "Unable to validate payment observation digest");
    return {
      ok: false,
      failure_code: "digest_unavailable",
      error: normalized.message,
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
  error: unknown,
  provenance: Provenance = "unknown",
): PaymentObservationResult {
  const normalized = normalizeBoundaryError(error, "Payment observer failure");
  const effectiveFailureCode = normalized.truncated ? "resource_limit_exceeded" : failure_code;
  return {
    contract_version: VERIFIER_CONTRACT_VERSION,
    status: paymentStatus(effectiveFailureCode),
    detected: false,
    provenance,
    failure_code: effectiveFailureCode,
    error: normalized.message,
  };
}

export function isProductionPayment(
  result: PaymentObservationResult,
  authority?: BackendIdentity,
): result is PaymentObservationResult & { observation: PaymentObservation } {
  return result.status === "observed"
    && result.detected
    && result.failure_code === undefined
    && result.provenance === "production"
    && result.observation !== undefined
    && result.observation.provenance === "production"
    && isAuthoritativeBackendIdentity(result.observation.observer)
    && authority !== undefined
    && isAuthoritativeBackendIdentity(authority)
    && backendIdentityEquals(result.observation.observer, authority);
}
