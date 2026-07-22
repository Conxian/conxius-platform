# OpenSpec Proposal: Issue #1160 — JWT-based M2M Authentication

**Date**: 2026-07-22
**Reference**: [GitHub issue #1160](https://github.com/Conxian/conxius-platform/issues/1160)
**Status**: Proposed
**Phase**: Phase 0 — contract and implementation plan only

## Why

The platform's M2M module currently supports `X-Admin-API-Key`, `X-Service-Key`, and `X-External-Key`, but its JWT surface is only a placeholder. The existing `GATEWAY_JWT_SECRET` variable is not used to issue or verify signed tokens, and `services/admin-dashboard/src/lib/sidl/gateway.ts` does not yet produce an `Authorization: Bearer <JWT>` header.

Issue #1160 needs a concrete, testable JWT contract before production code is changed. The contract must add short-lived, scoped service credentials without silently weakening the current key-based migration path or claiming that the Rust Gateway already verifies this JWT format.

## What Changes

- Add a new `m2m-jwt-authentication` capability describing a server-only HS256 JWT issuer and verifier around the existing `GATEWAY_JWT_SECRET` boundary.
- Define the exact `Authorization: Bearer <JWT>` header grammar and required `iss`, `aud`, `sub`, `scope`, `iat`, `nbf`, `exp`, and `jti` claims.
- Require exact algorithm, issuer, audience, service-identity, lifetime, clock-skew, and scope-ceiling validation before a token is trusted.
- Extend `M2MAuthenticator` and the compatibility admin route guard so a JWT is accepted only when it carries the required admin scope (`read:admin` for the compatibility guard).
- Preserve legacy API, service, and external-key authentication during migration. A malformed or invalid Bearer header must not fall through to a legacy credential path.
- Define server-only token issuance, short-lived re-issuance (“refresh”), and in-memory Gateway-header caching. “Refresh” is not a long-lived browser refresh token.
- Add an explicit Gateway auth migration mode so the platform can remain on legacy headers while the current Rust Gateway still treats bearer values as opaque tokens.
- Update M2M tests, documentation, and environment templates/schema files as part of the later implementation phase.
- Record that true end-to-end Gateway JWT verification is a coordinated follow-up in the Gateway repository, not an outcome of this platform-only proposal.

## Capabilities

### New Capabilities

- `m2m-jwt-authentication`: Server-only issuance, verification, scope authorization, compatibility behavior, and Gateway header transport for short-lived M2M JWTs.

### Modified Capabilities

- None. The repository has no existing canonical M2M specification file; the current key-based behavior is documented operationally in `docs/M2M_AUTHENTICATION.md` and implemented in `services/admin-dashboard/src/lib/support/m2m.ts`.

## Contract decisions

- **Signing boundary:** HS256 with the existing `GATEWAY_JWT_SECRET`; the secret is never sent to a browser or remote caller.
- **Lifetime:** default `300` seconds, minimum `60` seconds, maximum `900` seconds. Requested or configured values outside the bounds are rejected rather than clamped.
- **Clock skew:** default `30` seconds, bounded to `0..60` seconds.
- **Identity and scopes:** `sub` is the registered service identity; the space-delimited `scope` claim must be a subset of that service's existing permission ceiling and must include `m2m:internal` for internal services.
- **Refresh:** a server-only helper re-issues a new short-lived access token when the cached token is at or within the configured clock-skew window of expiry. No long-lived refresh token or browser endpoint is introduced.
- **Rotation:** one shared HS256 secret is supported in this issue. Multi-key overlap, `kid`, and automated rotation belong to [issue #1161](https://github.com/Conxian/conxius-platform/issues/1161).
- **Gateway rollout:** `legacy` remains the safe default; `dual` sends JWT plus existing headers for controlled migration; `jwt` sends the Bearer token after the Gateway verifier is coordinated.

## Scope

### In scope for the implementation phase

- Server-only JWT types, configuration, issuance, verification, and scope checks in `services/admin-dashboard/src/lib/support/m2m.ts`.
- Compatibility routing through `services/admin-dashboard/src/lib/support/auth.ts` and the existing `validateAdminAuth` export.
- Server-only JWT generation/caching in `services/admin-dashboard/src/lib/sidl/gateway.ts`.
- Unit and route-guard tests in `services/admin-dashboard/src/tests/m2m.test.ts` and related test files.
- Documentation and environment template/schema updates for the JWT contract and migration modes.

### Out of scope

- Rust Gateway JWT verification, Gateway claim-to-permission mapping, or Gateway deployment changes.
- Browser-side token signing, token storage, client-side refresh, cookies, or a public token-issuance endpoint.
- Asymmetric signing, JWKS, `kid`, multi-secret overlap, automated key rotation, or revocation APIs; these are follow-up work for #1161.
- Replacing or removing legacy API, service, or external keys during the migration window.
- Any protocol, user-data, custody, wallet, or funds behavior.

## Impact

The implementation will affect the admin-dashboard server-only support/auth surface, Gateway request headers, M2M tests, M2M documentation, and environment templates/schema files. A small runtime dependency such as `jose` may be added to the admin-dashboard workspace so HS256 verification and signing use a maintained standards-compliant implementation; dependency and lockfile changes belong to the implementation phase, not this proposal commit.

The proposal deliberately does not state that the current Rust Gateway accepts these JWTs. Until the coordinated Gateway follow-up is complete, the platform's default Gateway transport remains legacy-compatible.

## Phase 0 boundary

This commit creates only OpenSpec artifacts. It does not modify production TypeScript, tests, documentation, environment files, dependencies, workflows, or the Rust Gateway.
