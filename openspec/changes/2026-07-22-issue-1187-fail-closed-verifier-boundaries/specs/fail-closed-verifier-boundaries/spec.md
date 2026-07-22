# Specification: Fail-Closed Verifier Boundaries

This change-local delta defines the platform acceptance contract for issue
#1187. It does not replace Gateway/Core/Nexus cryptographic specifications; it
ensures this repository cannot authorize settlement while those dependencies
are unavailable.

## ADDED Requirements

### Requirement: Versioned canonical verifier contracts

The platform MUST validate a versioned verifier request and result that bind the
proof system, curve, encoding, circuit identity and digest, verification-key
identity and digest, ordered/named public inputs, proof bytes and digest,
statement/domain digests, backend identity/version/artifact digest, explicit
backend authority, provenance, and typed failure codes. Digest equality MUST
NOT be treated as cryptographic verification by itself. A production-valid
result MUST match the adapter-owned configured backend identity and carry
authoritative authority; the unavailable sentinel and non-authoritative
placeholders MUST NOT satisfy production authority. Settlement amounts and
confirmation counts MUST be bounded safe integers.

The boundary MUST enforce the versioned `conxian.verifier.limits.v1` resource
contract before decoding, hashing, or invoking an adapter. It MUST bound the
request body, encoded proof bytes, public-input count and per/total input bytes,
identifiers, digests/domains, backend versions, addresses, transaction ids,
signatures, signer sets, tap counts, confirmation counts, timestamps, actions,
and error strings. BitVM signature submission MUST use the explicit versioned
`conxian.verifier.signature.v1` hex encoding, require an even number of nibbles,
and accept only the configured minimum/maximum decoded byte range. BitVM3
recursive metadata MUST bound `proof_id` by the identifier limit and require
`recursive_height` to be a finite non-negative safe integer no greater than the
versioned recursive-height maximum. These checks MUST occur before the relevant
signature or recursive verifier adapter is invoked. A resource overage MUST return the typed
`resource_limit_exceeded` failure; the settlement route MUST return HTTP 413.

#### Scenario: Contract mutations fail closed

- **WHEN** a request has malformed encoding, a mismatched curve, circuit, key,
  proof digest, public-input order, or statement/domain digest
- **THEN** validation returns a typed non-success result and no verifier state
  advances

#### Scenario: Versioned signature and recursive metadata bounds fail closed

- **WHEN** a BitVM signature has odd-length hex, a decoded byte length below or
  above the configured range, or non-hex characters, or a BitVM3 request has an
  oversized proof id, negative/NaN/infinite/unsafe recursive height, or a height
  above the versioned maximum
- **THEN** the boundary returns `invalid_signature`, `malformed_request`, or
  `resource_limit_exceeded` as appropriate, does not invoke the signature or
  recursive verifier adapter, and does not advance state

#### Scenario: Malformed or throwing adapters fail closed

- **WHEN** an injected verifier, observer, signature verifier, or key-release
  adapter throws, returns null, or returns a malformed/contradictory result
- **THEN** the boundary returns a typed non-success result with error text
  normalized to `maxErrorChars` and does not advance or regress authoritative
  state; an over-limit error is `resource_limit_exceeded` and the settlement
  route maps it to HTTP 413

#### Scenario: Adapter identity is authoritative

- **WHEN** a result claims `production` validity but its backend is unavailable,
  non-authoritative, or does not match the configured adapter identity
- **THEN** validation returns a typed backend failure and no verified state is
  created

#### Scenario: Oversized input fails before expensive work

- **WHEN** an untrusted request contains an oversized body, proof, public input,
  identifier, digest/domain string, signature, signer set, or other bounded
  route field
- **THEN** the boundary returns `resource_limit_exceeded` (or a typed
  malformed failure for invalid shape), performs no unbounded decode/hash, and
  does not invoke a verifier, observer, or settlement backend

### Requirement: Bounded adapter attestations and detached evidence

Adapter-owned attestation values MUST cross the signature-verifier boundary as
a canonical JSON string under the versioned `conxian.verifier.attestation.v1`
profile. The encoded character and UTF-8 byte limits MUST be checked before
`JSON.parse`; non-string object/proxy values MUST be rejected without
reflection or own-key enumeration. The parsed value MUST then pass the
existing bounded iterative validator before canonicalization, digesting, or
storage. The profile MUST bound total encoded characters and bytes, traversal
depth, object-key count, array length, key length, and string length. It MUST
permit only JSON-like null, boolean, finite-number, string, plain-object, and
dense-array values. Accessors, hidden properties, symbols, cycles, sparse
arrays, custom/prototype-polluted objects, forbidden prototype keys, and
non-finite numbers MUST be rejected. Validation MUST create a detached deeply
immutable canonical snapshot; adapter-owned objects MUST NOT remain
authoritative after return. Because no second JSON parser is introduced, the
input MUST equal the canonical reserialization of the parsed snapshot, making
that reserialization authoritative and rejecting duplicate-key and other
standard-parser representation ambiguities.

#### Scenario: Hostile attestation graphs fail closed

- **WHEN** a signature adapter returns an object/proxy, oversized, malformed,
  deep, cyclic, accessor, sparse, custom-prototype, polluted, duplicate-key,
  or mutable-after-return attestation payload
- **THEN** the boundary returns a typed malformed/resource failure, performs no
  digest or aggregation commit from the hostile payload, invokes no own-key
  trap for object/proxy values, and any later mutation of adapter-owned data
  cannot change stored aggregation state

#### Scenario: Attestation bounds are enforced before storage

- **WHEN** an attestation exceeds the versioned total, depth, key, array, key
  length, or string length quota
- **THEN** the boundary returns `resource_limit_exceeded`, retains no private
  evidence from that value, and leaves aggregation completeness unchanged

#### Scenario: Canonical payload bounds precede parsing

- **WHEN** an attestation string exceeds the encoded character/byte ceiling or
  parses to content beyond the depth, key, array, or string quotas
- **THEN** an over-limit result is returned before JSON decoding for the raw
  string case, otherwise the parsed content fails with
  `resource_limit_exceeded`, and no adapter-owned evidence is retained

### Requirement: Same-proof BitVM3 replay and concurrency protection

BitVM3 recursive verification MUST serialize operations per proof id with a
FIFO or equivalent compare-and-swap guard spanning the asynchronous backend
call and state commit. An identical request digest, recursive height, and
backend identity MUST be deterministic and read-only after initialization. A
conflicting same-id request MUST fail closed without a second backend dispatch.
Generation/state checks MUST prevent stale completions from making returned
state disagree with stored state, and queue cleanup MUST occur after success,
failure, and adapter throw.

#### Scenario: Same-proof deferred requests are deterministic

- **WHEN** identical BitVM3 requests overlap while the backend is deferred
- **THEN** only one backend call occurs, both callers receive the same
  committed state, and the replay cannot replace or mutate stored state

#### Scenario: Conflicting same-proof requests fail closed

- **WHEN** a request with the same proof id but a different digest, height, or
  backend arrives before or after initialization
- **THEN** the conflicting request returns `malformed_request`, no second
  backend call occurs, and stored state remains bound to the first request

#### Scenario: Adapter throws do not poison the proof queue

- **WHEN** a BitVM3 backend throws or a deferred operation completes out of
  order relative to a queued replay
- **THEN** the thrown operation is typed `internal_error`, queue cleanup runs,
  and subsequent deliberate operations cannot deadlock or commit stale state

### Requirement: Versioned bounded BitVM3 terminal retention

BitVM3 MUST publish the versioned `conxian.bitvm3.retention.v1` lifecycle
policy with a hard cap on retained terminal states and a terminal TTL. Capacity
MUST be reserved before asynchronous verifier dispatch so concurrent unique
proof ids cannot exceed the cap; a full cap MUST return
`resource_limit_exceeded` without backend dispatch. In-flight reservations and
proof queues MUST never be evicted.

Every `BitVM3Orchestrator` instance MUST use the policy defaults of 1,024
retained states and 15 minutes exactly. Constructor overrides MAY lower either
value for deterministic tests, but invalid, non-positive, non-integer, unsafe,
or above-policy values MUST be rejected with a typed configuration error.

When an idle terminal record reaches the TTL, cleanup MUST atomically remove
the state, initialization metadata, generation counter, and idle queue metadata
for that proof id. Cleanup MUST skip any proof with an in-flight or queued
operation. The clock MUST be injectable for deterministic tests and MUST return
finite, safe, non-negative integer milliseconds within the inclusive
ECMAScript Date serialization range `0..8.64e15`. Accepted readings MUST be
monotonic; a negative, non-finite, unsafe, out-of-range, or rolled-back reading
MUST return a typed failure without an uncaught serialization error or state
commit. An identical request before expiry MUST be a read-only replay; after
expiry it MUST safely re-verify or return a typed expired/unknown result, and a
conflicting request MUST remain a typed conflict.

#### Scenario: BitVM3 capacity fails before backend dispatch

- **WHEN** retained terminal states plus in-flight reservations reach the
  versioned cap and a new unique proof id is submitted
- **THEN** the request returns `resource_limit_exceeded`, the configured
  verifier is not invoked, and existing state remains unchanged

#### Scenario: BitVM3 cleanup preserves in-flight operations

- **WHEN** TTL cleanup runs while a proof verification is deferred or queued
- **THEN** its reservation and queue metadata remain present, no in-flight
  operation is evicted, and the operation may commit or release normally

#### Scenario: BitVM3 expiry cleans all maps and permits safe replay

- **WHEN** an idle verified proof exceeds the terminal TTL and the same request
  is submitted again
- **THEN** the state, initialization, generation, and queue records are removed
  together before the replay dispatch, and the request is safely re-verified
  under the bounded policy

#### Scenario: BitVM3 retention and clock configuration stay within policy

- **WHEN** an orchestrator is constructed with an invalid/above-policy retention
  override or an injected clock returns an invalid, out-of-range, or rolled-back
  value
- **THEN** construction fails with a typed configuration error, or verification
  returns a typed bounded failure without backend dispatch or an uncaught
  `toISOString()` exception

### Requirement: Bounded ZKCP retention and paginated listing

ZKCP MUST publish the versioned `conxian.zkcp.retention.v1` policy with hard
active and total retained-intent quotas and a terminal-record TTL. Capacity
handling MUST never silently evict an active or pending intent; it MUST either
clean expired terminal records or return a typed `resource_limit_exceeded`
capacity response. Terminal cleanup MUST atomically remove the intent and all
associated proof, payment, key-release, lock, generation, and queue evidence.
The clock MUST be injectable for deterministic lifecycle tests.

ZKCP list operations MUST publish `conxian.zkcp.list.v1`, validate positive
integer `limit` and non-negative integer `offset`, order deterministically, and
return at most the bounded page size with page metadata. The route MUST NOT
serialize an unbounded retained-intent map.

#### Scenario: Capacity never evicts active state

- **WHEN** active or pending intents fill the active/total quota, including
  after the terminal TTL has elapsed
- **THEN** initialization fails with `resource_limit_exceeded` and all existing
  active/pending intents remain available and unchanged

#### Scenario: Expired terminal evidence is removed atomically

- **WHEN** a terminal intent exceeds the configured retention TTL and is not
  locked or queued
- **THEN** the intent and every associated private evidence/lock bookkeeping
  entry are removed together, while active intents are retained

#### Scenario: ZKCP listing is bounded and deterministic

- **WHEN** a caller requests a valid page, an invalid limit/offset, or a page
  beyond the retained set
- **THEN** the response contains only the requested bounded page in stable
  order, invalid pagination returns a typed malformed/resource failure, and no
  full unbounded set is returned

### Requirement: Bounded untrusted identifiers in logs and failures

Direct-library verifier and settlement failures MUST NOT interpolate raw
attacker-controlled identifiers into logs or response fields. Invalid and
oversized identifiers MUST use the fixed bounded sentinel or a summary whose
size is checked without copying or hashing the entire input. The rule MUST
apply consistently to BitVM2, BitVM3, ZKCP, and settlement-route failures.

#### Scenario: Oversized identifiers are not echoed or logged

- **WHEN** a direct-library or route request supplies an oversized proof or
  intent id
- **THEN** the typed failure contains only a bounded sentinel/summary, the
  oversized value is absent from the response and logger arguments, and the
  verifier/settlement adapter is not invoked

### Requirement: Versioned ZKCP statement and domain binding

ZKCP MUST derive and validate a versioned deterministic statement/domain
binding before invoking a verifier or advancing intent state. The binding MUST
include the encrypted-data digest, intent/payment condition, parties, amount,
network, pre-payment hash condition, proof digest/system, circuit/key bindings,
and ordered public-input terms. A proof digest alone MUST NOT authorize proof
verification.

#### Scenario: ZKCP term or input mutation fails before transition

- **WHEN** encrypted data, payment terms, seller/buyer, amount, network,
  statement/domain digest, public-input value/order, or any bound proof term is
  changed without recomputing the exact canonical intent binding
- **THEN** verification returns `public_input_mismatch`, `statement_mismatch`,
  `domain_mismatch`, or another typed binding failure and the intent remains
  non-authoritative

### Requirement: Explicit verifier and payment dependency injection

Production constructions MUST require explicit verifier and payment-observer
dependencies. The default dependencies MUST be unavailable/unsupported
adapters, not simulators. Missing or unavailable dependencies MUST return typed
non-success outcomes.

#### Scenario: Missing backend is observable and non-authoritative

- **WHEN** BitVM2, BitVM3, or ZKCP is constructed without a supported injected
  backend, or an injected backend reports unavailable
- **THEN** the operation returns `backend_unavailable` or
  `observer_unavailable`, carries non-production provenance, and does not mark
  a proof verified or move settlement state forward

### Requirement: Simulation quarantine

Evaluation-only deterministic fixtures MAY produce cryptographic-looking
results, but MUST label them `simulated` and MUST be excluded from production
settlement authorization.

#### Scenario: Simulated evidence cannot finalize

- **WHEN** an injected fixture verifier returns a valid-looking result with
  `simulated` provenance, or a fixture observer reports a synthetic payment
- **THEN** the bridge and settlement route return a typed rejection and retain
  the intent/floor in a non-authoritative state

### Requirement: Fail-closed settlement transitions

Settlement MUST reject unsupported, simulated, malformed, invalid, and unknown
actions/results. Caller-supplied payment hashes MUST NOT independently
authorize finalization. Synthetic decryption keys MUST NOT be generated in
production behavior. Unknown actions MUST return non-success responses and no
state mutation.

#### Scenario: Payment and action authorization require independent evidence

- **WHEN** a caller submits an arbitrary payment hash, an unknown action, or a
  proof result that is not production-valid and backend-bound
- **THEN** the route returns a typed non-success response, does not emit a
  decryption key, and leaves settlement state unchanged

#### Scenario: Lifecycle snapshots cannot bypass finalization evidence

- **WHEN** a caller mutates an object returned by an intent getter/list method,
  or a status string conflicts with retained proof/payment evidence
- **THEN** the caller changes no authoritative state and finalization
  revalidates the internally retained evidence before key release

#### Scenario: Terminal finalization cannot be replayed or raced

- **WHEN** a caller watches payment after finalization, finalizes an already
  finalized intent, or invokes finalization concurrently
- **THEN** the first authoritative release is preserved, repeated finalization
  is idempotent, payment state does not regress, and a concurrent release is
  rejected without a second key-release invocation

#### Scenario: Async lifecycle commits cannot regress state

- **WHEN** verification, payment observation, or finalization awaits an
  adapter while another lifecycle operation or replay is queued for the same
  intent
- **THEN** operations execute in deterministic per-intent order and every
  evidence/terminal commit re-checks operation identity, generation, and
  expected status so a stale operation cannot overwrite `verified`, `paid`, or
  `finalized` state

### Requirement: Attested unique BitVM2 aggregation

BitVM2 aggregation MUST require a profile-scoped authorized signer set, unique
signer ids, and explicit injected signature-verification/attestation evidence.
The default/unavailable signature verifier MUST return typed unsupported
without accepting a signature. Simulated or unknown provenance MUST NOT count
toward completion. Signature formatting alone MUST NOT complete aggregation.

#### Scenario: Duplicate or unverified signatures do not count twice

- **WHEN** a signer submits twice, an unauthorized signer submits, an
  unavailable verifier is configured, or an adapter returns malformed or
  contradictory attestation evidence
- **THEN** the submission is rejected with a typed failure and aggregation
  completeness remains unchanged

#### Scenario: Concurrent signer reservations are atomic

- **WHEN** the same signer submits concurrently, a distinct signer submits
  concurrently, or signature verification fails/throws after reservation
- **THEN** the same signer is counted at most once, distinct authorized signers
  may each commit once, failed reservations are released for retry, and the
  commit re-checks signer uniqueness

#### Scenario: Floor initialization cannot detach an active aggregation

- **WHEN** a signature verifier is awaiting an async result while an identical
  `verifyFloor` replay arrives for the same proof, or a conflicting floor
  initialization arrives
- **THEN** the replay waits on the same per-proof guard and is read-only (or is
  rejected as a conflict), the live aggregation object and committed signatures
  remain unchanged, and a stale signature result cannot commit to a detached
  aggregation

### Requirement: Threat-class guard and regression coverage

The repository MUST provide equivalent Python and PowerShell full-content
contamination checks for dangerous production-boundary patterns and focused tests for
unavailable backends, simulation rejection, wrong keys, mutated proof/inputs,
malformed encoding, curve/circuit mismatch, invalid tap/challenge/signature,
arbitrary payment hashes, and unknown actions. Tests/docs MUST be excluded from
production-pattern scanning without weakening runtime boundaries.

#### Scenario: Guard catches production regressions without fixture false positives

- **WHEN** a production verifier reintroduces an unconditional success,
  proof-length predicate, multiline simulator/default alias or test-fixture
  import, non-canonical bridge construction, synthetic key, or unknown-action
  success response
- **THEN** both supported guard implementations fail with a specific rule,
  while equivalent test-only fixture code is not reported as production
  contamination

#### Scenario: PowerShell and Python canonical cases remain in parity

- **WHEN** the canonical explicit unavailable ZKCP construction, a default
  alias, or a simulator alias is evaluated against the guard fixtures
- **THEN** the unavailable construction is allowed and aliases are rejected in
  both rule definitions; a static parity checker may be used when `pwsh` is
  unavailable but MUST NOT claim runtime PowerShell execution
