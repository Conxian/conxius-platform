# Design: Fail-Closed Verifier Boundaries

## 1. Boundary intent

The dashboard remains an orchestration and presentation layer. It does not
implement cryptography and it does not infer verification from shape, length,
labels, caller assertions, or simulated state. A production construction must
receive its verifier and payment observer explicitly. The default construction
is an unavailable adapter that returns a typed failure.

```text
canonical request
      │
      ▼
explicit verifier adapter ── unavailable by default ──► typed failure
      │
      ▼
canonical result with backend/provenance evidence
      │
      ├── simulated provenance ───────────────► never settlement-authorizing
      └── supported + valid + real provenance ► eligible for payment gate

explicit payment observer ───────────────────► independently observed tx only
```

No adapter is selected by proof metadata. The caller supplies a contract-bound
request and an adapter implementation; the adapter is responsible for proving
that its backend identity and artifact digest match the request/result.

## 2. Canonical typed contract

`services/admin-dashboard/src/lib/support/verifier-contract.ts` owns the shared
contract. The v1 request binds:

- `proof_system`, `curve`, and `encoding`;
- `circuit_id`/`circuit_digest`;
- `verification_key_id`/`verification_key_digest`;
- ordered `public_inputs` with stable names, encodings, and digests;
- `proof_bytes` plus `proof_digest`;
- `statement_digest` and `domain_digest`;
- adapter-owned `backend` identity, version, artifact digest, and explicit
  authority (`authoritative` or `non_authoritative`);
- `provenance` (`production`, `test`, or `simulated`);
- a typed result status and failure code.

Digests are represented as `sha256:<64 lowercase hex>` strings. The contract
normalizes and validates all fields at the boundary, including hex/base64
encoding, input order, curve/system/circuit/key equality, and digest equality.
Settlement amounts and confirmation counts are bounded safe integers. It does
not perform pairing arithmetic or claim that a digest match is a proof.

Production-valid predicates require a configured adapter identity, request and
result evidence matching that identity, authoritative backend authority,
`production` provenance, `status: valid`, `verified: true`, and no failure code.
The `unavailable` sentinel and non-authoritative placeholders can never satisfy
that predicate.

### 2.1 ZKCP intent binding

ZKCP derives the versioned `conxian.zkcp.statement.v1` binding before adapter
dispatch. Its deterministic canonical material includes the encrypted-data
digest, intent id, seller/buyer parties, amount, network, payment condition and
an explicit null pre-payment hash slot, proof digest/system, circuit/key
bindings, and ordered public-input terms. The resulting statement and domain
digests are compared with the request; a proof hash alone is insufficient.

The same contract is used by BitVM2, BitVM3 recursive verification, and ZKCP.
BitVM-specific fields may carry an explicitly profile-scoped `tap_count`; `364`
is documentation/profile data only and is never proof of verification.

### 2.2 Versioned resource limits

The boundary publishes `conxian.verifier.limits.v1` through
`VERIFIER_RESOURCE_LIMITS`. These limits are checked before decoding, digest
calculation, or adapter dispatch:

| Field | Limit |
| --- | ---: |
| Settlement request body | 512 KiB |
| Encoded proof | 128 KiB decoded bytes |
| Public inputs | 32 entries; 16 KiB per value; 128 KiB total decoded bytes |
| Identifiers / circuit and key ids | 128 characters |
| Backend version | 64 characters |
| Addresses / transaction ids | 256 characters |
| BitVM signatures | `conxian.verifier.signature.v1`, canonical even-length hex, 64–512 decoded bytes / 1,024 characters |
| Authorized signers / tap count | 64 signers / 1,024 taps |
| BitVM3 proof id / recursive height | 128 characters / safe integer `0..1,024` |
| Confirmation count | 1,000,000 |
| Decryption-key evidence | 4,096 characters |

Digest fields remain exact `sha256:<64 lowercase hex>` values, while error,
timestamp, and action strings have explicit length ceilings. BitVM signature
submissions carry the explicit signature encoding/version contract and reject
odd-length hex, short/long byte sequences, and malformed characters before
signature-verifier dispatch. BitVM3 recursive metadata is checked for bounded
identifiers, finite safe integers, non-negative height, and the versioned height
ceiling before recursive-verifier dispatch. Encoded-byte upper bounds reject
oversized hex/base64/base64url values before decoding or hashing. The settlement
route maps `resource_limit_exceeded` to HTTP `413`; helper and adapter
boundaries return the same typed failure without invoking a backend.

### 2.3 Bounded adapter attestations

Adapter-owned attestation objects are governed by the versioned
`conxian.verifier.attestation.v1` profile before digesting or storage. The
profile caps total canonical text at 4,096 characters and UTF-8 bytes at 16 KiB,
depth at 8, object keys at 16, array length at 16, keys at 64 characters, and
strings at 1,024 characters. Only `null`, booleans, finite numbers, strings,
plain objects, and dense arrays are permitted. Symbols, accessors, hidden
properties, custom or polluted prototypes, forbidden keys, sparse arrays, and
cycles are rejected. Validation uses an explicit bounded work stack rather than
recursive traversal, then builds a detached deeply frozen snapshot; the
adapter-owned object is never retained as authoritative evidence and mutations
after return cannot alter aggregation state.

Attestation failures use the same typed resource/malformed boundary as the
request contract. BitVM2 accepts only the exact versioned signature-attestation
shape, with bounded identifiers and digest fields, after the detached snapshot
has been checked. Direct-library and route failures collapse invalid or
oversized proof identifiers to the fixed `unknown` sentinel; bounded summaries
are used for all verifier/settlement logger fields and responses rather than
echoing attacker-controlled identifiers.

### 2.4 BitVM3 same-proof concurrency

BitVM3 recursive verification uses a per-proof FIFO queue around the complete
async adapter call and commit. An identical request digest, recursive height,
and backend identity replay only returns a defensive copy of the committed
state. A conflicting request for an initialized proof id returns a typed
`malformed_request` without a second backend dispatch. Generation and state
presence checks remain at commit, and queue cleanup is protected by `finally`,
so deferred completion, adapter throws, and retries cannot leave returned state
different from stored state or poison future operations.

### 2.5 Bounded ZKCP retention and listing

ZKCP publishes `conxian.zkcp.retention.v1`: at most 1,024 active intents and
2,048 total retained intents, with terminal records retained for at most 15
minutes by default. Capacity checks run after terminal cleanup but active or
pending intents are never silently evicted; a full active/retained capacity is
a typed `resource_limit_exceeded` response. Terminal eviction atomically removes
the intent and all private proof, payment, key-release, generation, lock, and
queue bookkeeping. The bridge accepts an injectable clock for deterministic
cleanup tests.

`conxian.zkcp.list.v1` requires deterministic creation-time/id ordering and a
bounded page: default 50, maximum 100, and offset maximum 2,048. Invalid limits
or offsets are typed malformed/resource failures, and list responses include
the policy version, page metadata, and at most the requested bounded number of
intents; the route never serializes the entire retained map.

## 3. Adapter and provenance model

`UnavailableVerifier` and `UnavailablePaymentObserver` are production-safe
defaults. They return `backend_unavailable` / `observer_unavailable` typed
failures and never mutate settlement state.

Tests may inject `DeterministicFixtureVerifier` and a payment fixture observer
from `src/tests/fixtures`. Fixture results must carry `provenance: simulated`
and a fixture backend artifact digest. The ZKCP bridge and route reject those
results before changing intent status to `verified`, `paid`, or `finalized`.

ZKCP intent getters return deep immutable snapshots. Authoritative proof and
payment evidence remain in private bridge records; finalization revalidates the
stored request/result/observation digests and adapter identities immediately
before invoking key release. Terminal finalization is idempotent, concurrent
release attempts are rejected, and payment observation cannot regress a paid or
finalized intent. Duplicate intent ids are rejected rather than overwritten.

Injected verifier, observer, signature, and key-release adapters are
totalized at the boundary: thrown exceptions, null values, malformed result
shapes, contradictory status/failure combinations, and non-production success
labels become typed non-success results without state advancement. All adapter
and route-catch error text is normalized through the shared `maxErrorChars`
ceiling; an over-limit message is truncated and classified as
`resource_limit_exceeded`, and arbitrary thrown values never reach the response
unbounded.

BitVM2 aggregation requires a profile-scoped authorized signer set, unique
signer ids, and an explicitly injected signature verifier that returns a
backend-bound attestation. Only `test` or authoritative `production`
attestations are accepted; simulated/unknown provenance, the default verifier,
and hex formatting alone cannot advance aggregation.

Lifecycle operations are serialized FIFO per ZKCP intent. Each async operation
captures the intent object and generation, then performs an identity/generation
compare-and-swap check before every evidence or terminal-state commit. Verify,
watch, and finalize replays therefore have deterministic ordering: a replay
after a successful transition is read-only or typed non-success, terminal
finalization is idempotent, and the existing finalization lock rejects a second
key-release attempt while release is in flight. BitVM2 signature submissions
are serialized per proof, reserve a signer before async verification, release
that reservation on all failure/throw paths, and re-check uniqueness at commit.
BitVM2 floor initialization and signature submission share that same per-proof
FIFO guard. A successful floor initialization is recorded by request digest,
backend identity, and tap profile; an identical replay is read-only and cannot
replace the live aggregation, while a conflicting replay is rejected. Signature
commit performs an object-identity compare-and-swap against the guarded
aggregation so a stale async result cannot commit to a detached object, and the
queue release is protected by `finally` so adapter failures do not poison the
lock.

The platform deliberately does not export a production simulator or a real
cryptographic implementation. Future Gateway/Core/Nexus adapters must satisfy
the same contract and must be selected by explicit dependency injection.

## 4. Settlement state rules

- A proof result is settlement-eligible only when `status: valid`,
  `provenance: production`, and all contract bindings validate.
- `simulated`, `unsupported`, `unavailable`, `malformed`, `invalid`, and
  `unknown` outcomes are non-success and cannot advance state.
- Payment is eligible only when the injected observer returns a validated
  observation bound to the intent/address/amount and a non-empty txid. The
  `paymentHash` request field is not evidence.
- Payment and key-release predicates additionally require adapter-owned,
  authoritative backend identities matching the retained observation/result;
  `production` provenance alone is never sufficient.
- Finalization requires the stored observed payment and a real externally
  supplied decryption-key release adapter. Until that backend exists,
  finalization returns `decryption_key_unavailable` and leaves the intent in
  `paid`/`verified` state. No synthetic key is constructed.
- Repeated finalization of an already-finalized intent is read-only and
  idempotent; concurrent key-release attempts return typed `internal_error`
  without invoking the releaser twice.
- Adapter exceptions or malformed top-level responses are normalized to typed
  non-success outcomes; they never escape as an apparent authorization.
- Unknown actions are explicit 400 non-success responses.

## 5. Guard strategy

The contamination guard scans only tracked production-boundary source files,
not `src/tests` or documentation. It detects structural dangerous patterns:

- unconditional `verified`/`isVerified` true assignments in verifier modules;
- proof-length-only predicates used as verification;
- production simulator/default-verifier construction;
- synthetic decryption-key generation;
- unknown settlement-action success responses.

The Python and PowerShell implementations scan complete file content, including
multiline constructs. They reject non-canonical bridge construction, simulator
or default aliases, and imports from test fixtures into production verifier or
settlement paths. Test-only fixtures remain outside the production scan.

Python and PowerShell rule identifiers and scope remain equivalent. The guard
must avoid broad words such as `simulated` in tests/docs so evaluation fixtures
remain possible without false positives.

The Python self-test also statically extracts the PowerShell bridge-construction
patterns and exercises canonical unavailable constructions plus default/
simulator aliases. This parity check is text/fixture based when `pwsh` is not
installed; it does not claim runtime PowerShell execution.

## 6. Compatibility

Existing public method names remain where practical, but return types become
typed non-success instead of throwing or returning booleans that look
authoritative. Existing consumers can inspect `success`, `status`, and
`failure_code`. Settlement route authentication is unchanged.

## 7. Explicit non-goals

- pairing arithmetic, Groth16/PLONK/STARK verification, or recursive proof
  execution;
- adding `snarkjs` or any new production cryptography dependency;
- selecting or claiming readiness of a Gateway/Core/Nexus backend;
- custody, funds movement, or protocol-owned state changes.
