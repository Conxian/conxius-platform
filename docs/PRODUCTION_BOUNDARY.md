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
