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
labels become typed non-success results without state advancement.

BitVM2 aggregation requires a profile-scoped authorized signer set, unique
signer ids, and an explicitly injected signature verifier that returns a
backend-bound attestation. Only `test` or authoritative `production`
attestations are accepted; simulated/unknown provenance, the default verifier,
and hex formatting alone cannot advance aggregation.

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
