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
