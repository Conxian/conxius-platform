# OpenSpec Proposal: Fail-Closed Verifier Boundaries for BitVM and ZKCP

**Date**: 2026-07-22
**Reference**: [Issue #1187](https://github.com/Conxian/conxius-platform/issues/1187)
**Related research**: [Conxian/conxian-gateway#189](https://github.com/Conxian/conxian-gateway/issues/189)
**Status**: In implementation; production cryptographic backend remains out of scope

## Why

The admin-dashboard settlement helpers currently expose scaffold behavior as if
it were authoritative verification. BitVM2 accepts proof length, BitVM3 marks
recursive verification successful without a verifier, and ZKCP has a default
length-only verifier and a caller-supplied payment-hash finalization path. These
paths can make settlement state advance without a canonical proof, verification
key, public-input binding, payment observation, or cryptographic backend.

The repository needs an explicit contract boundary that distinguishes strategic
scaffolding and evaluation fixtures from production authorization. Unsupported
or unavailable verification must be a typed non-success result, and settlement
must reject simulated, malformed, invalid, unknown, or caller-only evidence.

## What changes

- Define a versioned, typed verifier contract covering proof system, curve,
  encoding, circuit and verification-key identities/digests, ordered/named
  public inputs, proof bytes/digest, statement/domain digest, adapter-owned
  backend identity/authority and artifact digest, provenance, and typed failure
  codes.
- Bind ZKCP verification to a versioned deterministic intent statement/domain
  digest covering encrypted data, payment condition, parties, amount, network,
  proof, and public-input terms before any lifecycle transition.
- Keep authoritative proof/payment evidence internal, expose only immutable
  intent snapshots, and keep payment observation separate from any future
  irreversible key-release coordinator. `paid` is evidence, not finalization.
- Gate BitVM2 aggregation on authorized unique signers plus explicit injected
  signature-verification attestations; unavailable/default signature checking
  remains unsupported.
- Normalize contradictory adapter responses so no user-visible status can be
  `verified`/success-shaped when `verified` is false or a failure code exists.
- Totalize injected adapter boundaries and reject unsafe settlement amounts;
  production key release remains hard-disabled so malformed responses,
  replayed watches, and concurrent callers cannot cause an irreversible effect.
- Replace production-facing simulator/default-verifier construction with
  explicitly injected unavailable adapters.
- Keep deterministic cryptographic-looking fixtures only in test/evaluation
  modules, with explicit `simulated` provenance that settlement rejects.
- Harden BitVM2, BitVM3, ZKCP, payment observation, and the settlement route so
  only an injected supported backend plus independently observed payment can
  advance settlement state.
- Add versioned BitVM2 retained-state caps with pre-dispatch reservations,
  active-operation preservation, and atomic terminal cleanup across associated
  maps.
- Retain bounded BitVM3 request-identity tombstones after terminal expiry so
  conflicting same-id reuse fails closed during the explicit window; require a
  durable Gateway/Core identity registry for permanent global uniqueness.
- Quarantine production key release completely: `ZKCPBridge` accepts only
  verifier and payment-observer dependencies, `finalizeSettlement` always
  returns a typed unavailable/unsupported result, and the settlement route
  performs the same hard stop without calling the bridge or inspecting caller
  claims. No decryption key, finalized success, release registry, obligation
  lookup, or irreversible dispatch is exported by the platform.
- Record the future dependency explicitly: any later release implementation
  requires an independently authenticated, server-bound Gateway/Core atomic
  claim-or-get coordinator and durable registry. Dependency injection,
  capability strings, or adapter self-attestation alone must never enable it.
- If a future release contract needs an obligation identity, derive it only
  from the canonical encrypted-data commitment plus an explicit version/domain.
  The commitment is the exact UTF-8 bytes of the validated ASCII token
  `sha256:` followed by 64 lowercase hexadecimal characters; no whitespace,
  Unicode normalization, seller/buyer strings, or mutable settlement terms
  enter the identity. This is a future contract, not executable platform code.
- Extend Python and PowerShell contamination guards to detect the exact
  dangerous classes without scanning test-only fixtures as production code.
- Add negative-vector tests for unavailable backends, simulation, key/proof/input
  mutation, encoding/curve/circuit mismatch, tap/signature failures, arbitrary
  payment hashes, and unknown actions.
- Correct readiness, debt, risk, production-boundary, research, and session-log
  documentation. Profile-specific BitVM2 tap counts must not be presented as a
  universal constant.

## Scope and non-goals

This change is limited to the platform boundary. It does not implement pairing
arithmetic, add `snarkjs`, select a production cryptographic backend, or change
Gateway/Core/Nexus. The platform will expose the contract and fail closed until
those cross-repository backends are available and independently accepted.

## Acceptance criteria

1. Production-facing verifier defaults cannot return authoritative-looking
   success from proof length or unconditional assignments.
2. A verifier request and result are versioned and bind all security-relevant
   proof, key, input, statement, adapter-owned backend authority, and
   provenance fields; the unavailable or non-authoritative sentinel cannot
   satisfy production authority.
3. Missing, unavailable, unsupported, malformed, invalid, simulated, and
   mismatched evidence return typed non-success outcomes.
4. ZKCP verification rejects mutated intent terms, statement/domain digests, or
   public-input order/value bindings before state transition.
5. Payment observation is explicitly injected; a caller-supplied payment hash
   alone cannot authorize any irreversible action. A paid intent is not
   finalized, no synthetic or adapter-supplied decryption key is emitted, and
   the production finalize route returns typed `unsupported_backend` with zero
   bridge/adapter dispatch. Returned intent/lifecycle objects are immutable
   snapshots.
6. Unknown settlement actions and all rejected outcomes leave settlement state
   unchanged and return non-success HTTP responses.
7. BitVM2 aggregation rejects duplicate/unauthorized signers, arbitrary
   format-only signatures, unavailable verifiers, simulated/unknown provenance,
   and malformed attestations;
   only an explicit injected test/production adapter can accept evidence.
8. Production-boundary guards and focused tests cover the listed threat classes
   in both repository-supported script dialects.
9. Documentation separates strategic alignment/scaffolding from production
   cryptographic readiness and records the remaining cross-repo work.
10. BitVM2 retention reservations prevent verifier dispatch at capacity and
    cleanup never evicts in-flight challenges, signatures, or queued work;
    terminal cleanup removes related state maps atomically.
11. BitVM3 retains a versioned, capped tombstone window for expired proof ids;
    same-request replay is deterministic, conflicting replay fails closed, and
    documentation requires durable Gateway/Core identity for permanent reuse
    prevention.
12. Production `zkcp-finalize` and direct-library finalization return a typed
    unavailable/unsupported result for every caller payload, including valid,
    malformed, replayed, restart, and drift-shaped inputs. They make zero
    calls to injected-looking adapters and never create `finalized` state or
    decryption-key output.
13. Proof and independently observed payment transitions remain fail closed;
    `paid` is the terminal payment-evidence state exposed by this boundary and
    cannot release data. Test-only deterministic proof/payment fixtures carry
    `simulated` provenance and cannot authorize settlement.
14. A future release proposal must provide an independently authenticated,
    server-bound Gateway/Core atomic claim-or-get coordinator and durable
    registry. If it introduces an obligation id, its canonical input is only
    the encrypted-data commitment bytes plus version/domain as specified above;
    raw seller/buyer representations and dependency-injected self-attestation
    are not authority.
