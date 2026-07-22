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
- `backend` identity, version, and artifact digest;
- `provenance` (`production`, `test`, or `simulated`);
- a typed result status and failure code.

Digests are represented as `sha256:<64 lowercase hex>` strings. The contract
normalizes and validates all fields at the boundary, including hex/base64
encoding, input order, curve/system/circuit/key equality, and digest equality.
It does not perform pairing arithmetic or claim that a digest match is a proof.

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
- Finalization requires the stored observed payment and a real externally
  supplied decryption-key release adapter. Until that backend exists,
  finalization returns `decryption_key_unavailable` and leaves the intent in
  `paid`/`verified` state. No synthetic key is constructed.
- Unknown actions are explicit 400 non-success responses.

## 5. Guard strategy

The contamination guard scans only tracked production-boundary source files,
not `src/tests` or documentation. It detects structural dangerous patterns:

- unconditional `verified`/`isVerified` true assignments in verifier modules;
- proof-length-only predicates used as verification;
- production simulator/default-verifier construction;
- synthetic decryption-key generation;
- unknown settlement-action success responses.

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
