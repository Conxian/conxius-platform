# Production boundary (BOS)

This document defines what `conxius-platform` is allowed to own for BOS-related work, and what code paths are considered “production boundary” for this repository.

## Owner surface

`conxius-platform` may own:

- Operator/admin services that ship from this repo (for example, `services/admin-dashboard`).
- Secrets provisioning and operator tooling that can affect production behavior (for example, `scripts/provision-secrets.sh`).
- Orchestration wiring (submodule pins, `docker-compose.yml`, CI workflows).

`conxius-platform` must not become the home for core Nexus/Gateway production logic. Those changes belong in their owning repositories.

## Chain-specific operator/deployment repositories (ITIL V5 Alignment)

Chain-specific deployment/operator repositories (including Conxius Orbit / `Conxian/conxius-orbit`) are subordinate to this parent control model:

- Operator setup must use parent-approved runbook steps and owner review routing.
- Deployment workflows must be fail-closed and bounded to deployment/operator concerns.
- These repositories must not become protocol owners and must not expand into broad protocol ownership.

## Production boundary

In this repository, the production boundary is:

- `services/admin-dashboard/` (excluding `services/admin-dashboard/src/tests/`)
- `scripts/provision-secrets.sh`

Anything in the production boundary must be fail-closed (no simulated-success defaults) and must not contain stub markers.

## Verifier and settlement readiness boundary

The following paths are production-boundary orchestration only:

- `services/admin-dashboard/src/lib/support/verifier-contract.ts`
- `services/admin-dashboard/src/lib/support/bitvm.ts`
- `services/admin-dashboard/src/lib/support/bitvm3.ts`
- `services/admin-dashboard/src/lib/support/zkcp.ts`
- `services/admin-dashboard/src/app/api/v1/settlement-engine/route.ts`

They define and enforce versioned bindings for proof system, curve, encoding,
circuit/key identities and digests, ordered public inputs, proof bytes/digest,
statement/domain digests, backend identity/version/artifact digest, payment
observations, provenance, and typed failures. They do not implement proof
arithmetic, chain observation, or key-release cryptography.

Production authority is adapter-owned, not caller- or provenance-owned. Backend
identity includes explicit authority and every production-valid verification,
payment, and key-release result must match the configured adapter identity. The
unavailable sentinel and non-authoritative placeholders cannot authorize state.
ZKCP additionally binds encrypted data, payment condition, parties, amount,
network, proof terms, and ordered public inputs through the versioned
`conxian.zkcp.statement.v1` statement/domain digests.

ZKCP getters/list methods return defensive immutable snapshots. Authoritative
proof/payment evidence remains private to the bridge and is revalidated against
the exact stored bindings immediately before key release. BitVM2 aggregation is
also gated by authorized unique signers and explicit injected signature
attestations; hex formatting alone is not evidence. Floor initialization/replay
and signature submission share a per-proof guard, identical floor replays are
read-only, conflicting reinitialization is rejected, and signature commits use
aggregation identity compare-and-swap checks. Terminal finalization is
idempotent/serialized, payment watches cannot regress paid/finalized state, and
throwing or malformed injected adapters become typed non-success results.

The boundary also publishes `conxian.verifier.limits.v1` resource limits. The
settlement body is capped at 512 KiB; proofs at 128 KiB decoded bytes; public
inputs at 32 entries, 16 KiB per value, and 128 KiB total; identifiers at 128
characters; backend versions at 64; addresses and transaction ids at 256;
signatures use `conxian.verifier.signature.v1` canonical even-length hex with
64–512 decoded bytes and at most 1,024 characters; signer sets are capped at
64; taps at 1,024; BitVM3 proof ids at 128 characters and recursive heights at
safe integer `0..1,024`; confirmations at 1,000,000; returned decryption-key
evidence at 4,096 characters; and adapter/route error text at 1,024 characters.
Digest/domain strings remain exact SHA-256 forms. Odd, short, long, or malformed
signatures and invalid recursive metadata are rejected before backend dispatch.
Oversized fields and normalized over-limit adapter errors return
`resource_limit_exceeded`; the settlement route returns HTTP 413.

Adapter attestations use the versioned `conxian.verifier.attestation.v1`
profile as canonical JSON strings: 4,096 characters and 16 KiB UTF-8 are
checked before `JSON.parse`. Object/proxy attestations are rejected without
own-key enumeration. Parsed content is limited to depth 8, objects with 16
keys, arrays with 16 entries, keys at 64 characters, and strings at 1,024
characters. Only JSON-like primitives, plain objects, and dense arrays are
accepted. Cycles, accessors, hidden/symbol properties, custom or polluted
prototypes, forbidden prototype keys, sparse arrays, and non-finite numbers
fail closed. The boundary applies bounded iterative validation, requires exact
canonical reserialization (the authoritative duplicate-key defense without a
second parser), and stores only a detached deeply frozen snapshot.
Invalid or oversized proof/intent identifiers use the fixed `unknown` sentinel
in direct-library failures, route responses, and logs rather than raw input.

ZKCP lifecycle operations are FIFO-serialized per intent and use generation /
object-identity compare-and-swap checks before every asynchronous evidence or
terminal-state commit. BitVM2 submissions reserve signer ids under a per-proof
lock, release reservations on all failure paths, and re-check uniqueness at
commit. Adapter and route-catch errors are normalized without invoking arbitrary
thrown-value stringification. These controls prevent stale adapter completions
and concurrent duplicate signers from regressing or duplicating authoritative
state.

BitVM3 uses the same per-proof FIFO discipline around the full asynchronous
backend call and commit. Identical request-digest/height/backend replays are
read-only, conflicting same-id requests fail closed, and generation/state checks
prevent returned and stored state from diverging. Queue cleanup runs on success,
failure, and adapter throw. The versioned `conxian.bitvm3.retention.v1` policy
caps retained terminal states at 1,024 by default and expires idle terminal
records after 15 minutes. Capacity is reserved before backend dispatch, so a
full cap returns a typed resource failure without dispatch. In-flight
reservations and queues are never evicted; TTL cleanup atomically removes state,
initialization metadata, generation counters, and idle queue metadata. An
identical request after expiry is safely re-verified under the bounded policy,
and the clock is injectable for deterministic lifecycle tests.

ZKCP publishes `conxian.zkcp.retention.v1` with 1,024 active and 2,048 total
retained-intent limits plus a default 15-minute terminal TTL. Capacity handling
never silently evicts active or pending intents. Expired terminal cleanup
atomically removes the intent and proof/payment/key-release evidence plus
generation, lock, and queue bookkeeping. `conxian.zkcp.list.v1` exposes only a
deterministically ordered bounded page (default 50, maximum 100, offset maximum
2,048); invalid pagination is typed and the route never returns the full map.

Production construction explicitly injects verifier, payment-observer, and
key-release dependencies. The checked-in construction uses unavailable
adapters, so missing Gateway/Core/Nexus backends return typed non-success
results. Test-only deterministic fixtures live under
`services/admin-dashboard/src/tests/` and carry `simulated` provenance; they
are not production adapters and settlement rejects them.

Caller-supplied payment hashes are identifiers only and never authorize
finalization. No synthetic decryption key may be generated in this boundary.
The `364` value appearing in BitVM2 research is a profile-specific layout
example, not a universal protocol constant and not evidence that verification
has occurred. See [issue #1187](https://github.com/Conxian/conxius-platform/issues/1187)
and the change-local [OpenSpec contract](../openspec/changes/2026-07-22-issue-1187-fail-closed-verifier-boundaries/specs/fail-closed-verifier-boundaries/spec.md).

## Dev-only surfaces

The following paths are explicitly **dev-only** and must not be wired into production deployments:

- `services/admin-pulse-bos/`
