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

#### Scenario: Contract mutations fail closed

- **WHEN** a request has malformed encoding, a mismatched curve, circuit, key,
  proof digest, public-input order, or statement/domain digest
- **THEN** validation returns a typed non-success result and no verifier state
  advances

#### Scenario: Malformed or throwing adapters fail closed

- **WHEN** an injected verifier, observer, signature verifier, or key-release
  adapter throws, returns null, or returns a malformed/contradictory result
- **THEN** the boundary returns a typed non-success result and does not advance
  or regress authoritative state

#### Scenario: Adapter identity is authoritative

- **WHEN** a result claims `production` validity but its backend is unavailable,
  non-authoritative, or does not match the configured adapter identity
- **THEN** validation returns a typed backend failure and no verified state is
  created

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
