# Design: Issue #1160 — JWT-based M2M Authentication

## Context

The admin-dashboard M2M module at `services/admin-dashboard/src/lib/support/m2m.ts` currently validates three key-based credentials and already contains a `jwtSecret` configuration field plus a `'jwt'` `AuthResult` source, but it has no JWT issuance or verification path. The Gateway client at `services/admin-dashboard/src/lib/sidl/gateway.ts` is server-only and currently sends `X-Admin-API-Key` and `X-Service-Key`; its JWT code is a placeholder. The legacy route guard at `services/admin-dashboard/src/lib/support/auth.ts` only validates the admin API key.

The operational contract in `docs/M2M_AUTHENTICATION.md` describes JWTs as future functionality. The existing `GATEWAY_JWT_SECRET` and environment schema provide a natural HS256 boundary for this issue, but the current Rust Gateway is not established as a verifier for the proposed JWT claims. Platform work therefore needs an explicit migration boundary rather than a claim of end-to-end readiness.

This is a security-sensitive, cross-cutting change involving authentication, authorization, server-only token transport, compatibility behavior, tests, documentation, and environment configuration. It is intentionally specified before implementation.

## Goals / Non-Goals

**Goals:**

- Add a concrete platform-side JWT contract that can be implemented and tested without relying on undocumented Gateway behavior.
- Use `Authorization: Bearer <JWT>` with an exact HS256 allowlist and required issuer, audience, service identity, scope, time, and token-ID claims.
- Make validation deterministic and fail closed for malformed credentials, invalid signatures, configuration absence, claim failures, and scope escalation.
- Preserve existing API-key, service-key, and external-key behavior during a controlled migration.
- Keep signing, verification, re-issuance, and Gateway token caching server-only.
- Define bounded TTL and clock-skew values that make security tests and operational behavior unambiguous.
- Separate platform readiness from the coordinated Rust Gateway verifier and from future key rotation work in #1161.

**Non-Goals:**

- Implementing or modifying Rust Gateway authentication in `Conxian/conxian-gateway`.
- Introducing browser-side JWT signing, browser token storage, cookies, public issuance, or long-lived refresh tokens.
- Solving multi-key rotation, `kid`, key overlap, revocation, or asymmetric JWKS distribution.
- Removing legacy credentials or changing unrelated protocol, wallet, custody, settlement, or user-data behavior.

## Decisions

### 1. Use the existing HS256 secret boundary for this issue

The implementation will use `GATEWAY_JWT_SECRET` with a fixed `HS256` algorithm allowlist. The verifier will not accept the token-selected algorithm, unsigned tokens, or other HMAC/asymmetric variants. `GATEWAY_JWT_ISSUER` and `GATEWAY_JWT_AUDIENCE` will be explicit required configuration when JWT mode is enabled; no environment-specific trust defaults will be invented.

**Why this choice:** it fits the existing environment boundary and keeps #1160 focused on platform behavior. A JWKS/asymmetric design would introduce key distribution and Gateway coordination that are not currently present.

**Alternative rejected:** accepting any algorithm supported by a JWT library. This creates algorithm-confusion risk and makes the contract dependent on library defaults.

**Rotation limitation:** one shared secret, no `kid`, and no active/previous overlap means rotation requires coordinated replacement/redeployment and may invalidate outstanding tokens. #1161 owns the rotation mechanism and must not be silently folded into this issue.

### 2. Use a strict, compact claim contract

The issuer will create a compact JWS with `HS256`, `typ: JWT`, and no `kid`. Required claims are exact `iss`, exact single-string `aud`, registered service identity in `sub`, space-delimited `scope`, integer `iat`, `nbf`, `exp`, and fresh `jti`.

The verifier will validate the signature before trusting claims, compare issuer and audience exactly, resolve `sub` through the existing service registry, normalize and validate scopes, and apply one captured clock value to the lifetime checks. Unknown claims will not affect authorization.

**Why this choice:** explicit claim shapes prevent issuer/audience confusion, service impersonation, array-vs-string ambiguity, and scope parsing drift. A single normalized `scope` representation maps directly to the existing `Scope[]` model.

### 3. Bound token lifetime and clock tolerance

`M2M_JWT_TTL_SECONDS` defaults to `300` seconds and is valid only within `60..900` seconds. `M2M_JWT_CLOCK_SKEW_SECONDS` defaults to `30` seconds and is valid only within `0..60` seconds. Configuration and per-token requested TTLs outside those limits fail closed instead of being clamped.

Verification rejects future `iat`/`nbf` beyond skew, expired `exp` beyond skew, non-positive or out-of-bounds lifetimes, missing claims, and inconsistent timestamps. These fixed bounds make unit tests deterministic and limit the exposure window of a leaked token.

### 4. Enforce service scope ceilings twice

The existing `SERVICE_PERMISSIONS` matrix remains the authoritative ceiling for JWT service identities. Issuance rejects any requested scope outside the identity's ceiling. Verification repeats the subset check against the current matrix so a token cannot retain permissions after a service's configured ceiling is reduced.

Internal service tokens must include `m2m:internal`. A valid signature never grants authorization by itself; request-specific guards still require the exact requested scope. The compatibility `validateAdminAuth` path requires `read:admin` for JWTs, while write/admin operations require explicit scope-aware guards.

**Alternative rejected:** trusting scopes solely because they are signed. A signed scope can still be over-privileged if the issuer or configuration is wrong; the service ceiling is the defense-in-depth boundary.

### 5. Make Bearer precedence explicit while preserving legacy credentials

Authentication will inspect `Authorization` first. If that header is present, it must be a valid Bearer JWT or the request is rejected; the implementation must not fall through to a legacy header after a malformed or invalid Bearer credential. If no Authorization header is present, the existing API/service/external-key paths remain available in their current formats.

This prevents a caller from combining a failed JWT attempt with an unrelated credential and makes the migration behavior predictable. Existing tests for key methods and legacy route behavior remain part of the implementation acceptance matrix.

### 6. Define refresh as server-side re-issuance, not a refresh-token protocol

No public issuance route will be added. A server-only issuer function will accept a service identity and requested scopes only from trusted, statically configured call sites. `gateway.ts` will use the fixed `admin-dashboard` identity and a least-privilege scope set for Gateway reads; it will not accept service identity or scopes from browser input.

The Gateway client may keep an in-memory token cache keyed by audience, service identity, and canonical scope set. If the cached token has no more than the configured skew remaining, the server issues a new token. The cache is process-local and is never persisted or exposed to client code.

### 7. Add an explicit Gateway migration mode

The client will use `M2M_GATEWAY_AUTH_MODE`:

| Mode | Header behavior | Use |
| --- | --- | --- |
| `legacy` (default) | Existing `X-Admin-API-Key`/`X-Service-Key` headers only | Safe current behavior while the Gateway remains opaque-token based |
| `dual` | Bearer JWT plus existing legacy headers | Controlled migration after the Gateway path is known to tolerate/interpret both |
| `jwt` | Bearer JWT as the Gateway credential | Only after the coordinated Gateway verifier is deployed |

An explicitly selected `dual` or `jwt` mode with missing/invalid JWT configuration fails closed rather than silently downgrading. Platform tests can verify header construction and cache behavior, but they must not claim true end-to-end Gateway verification until the Gateway repository supplies that evidence.

### 8. Use a maintained JWT implementation and preserve the server boundary

The implementation should use a maintained standards-compliant library such as `jose` with explicit HS256 signing and verification. The dependency belongs only in server-side workspace code. `gateway.ts` already imports `server-only`; the JWT support module and all issuer call sites must preserve that boundary.

The implementation must redact Authorization headers and token material from logs, response bodies, metrics labels, and error messages. Safe reason codes and correlation IDs may be logged for operations.

## Risks / Trade-offs

- **[Risk] Shared HS256 secret compromise affects every issuer/verifier in the trust domain.** → Use a minimum-length secret, server-only access, short TTLs, no browser exposure, and make rotation a tracked follow-up in #1161.
- **[Risk] The Gateway may reject a JWT as an opaque bearer value before migration is complete.** → Keep `legacy` as the default, make `dual`/`jwt` explicit, and require coordinated Gateway verification before claiming E2E support.
- **[Risk] A valid token can still be over-privileged if scope checks are incomplete.** → Enforce the service ceiling at issuance and verification and require explicit route scopes.
- **[Risk] Token parsing or logging can leak credentials.** → Bound input size, reject malformed headers, use generic public errors, and redact raw Authorization values and token-bearing diagnostics.
- **[Risk] Short TTLs can increase token issuance load.** → Use process-local caching and re-issue only inside the clock-skew window; never extend a cached token past `exp`.
- **[Risk] Legacy compatibility can delay migration completion.** → Keep migration modes and explicit exit criteria in operational docs; do not remove legacy paths until Gateway and consumers provide coordinated evidence.
- **[Risk] Date-prefixed repository change folders are not accepted by the currently installed OpenSpec CLI version.** → Preserve the repository's established dated folder convention, validate through a temporary letter-prefixed alias where necessary, and record the CLI limitation rather than renaming the committed artifact.

## Migration Plan

1. Review and approve this proposal, change-local capability spec, design, and task list.
2. Implement JWT support in server-only `m2m.ts`, including configuration validation, issuance, verification, scope checks, and generic failure semantics.
3. Update the compatibility route guard so JWT requests require `read:admin`, while legacy API/service/external-key tests remain green.
4. Add Gateway header issuance/caching behind `M2M_GATEWAY_AUTH_MODE`, retaining `legacy` as the default.
5. Add security regression tests and documentation/env updates; run the repository's documented lint/typecheck/test checks plus OpenSpec validation.
6. Coordinate with `Conxian/conxian-gateway` on HS256 verification and claim-to-permission mapping before enabling `dual` or `jwt` in a deployed environment.
7. Roll back by selecting `legacy` mode and reverting the platform implementation if JWT verification or Gateway interoperability is not ready. No secret is embedded in code, and no browser migration is required.

## Open Questions

- The exact Rust Gateway follow-up contract and rollout owner must be confirmed before `dual` or `jwt` is enabled outside controlled tests.
- Issue #1161 must decide whether future rotation uses overlapping HS256 secrets, `kid`, asymmetric keys/JWKS, or another managed trust mechanism.
- A replay-cache policy for `jti` may be added later if the Gateway or threat model requires one; #1160 requires unique IDs and safe correlation but does not invent a persistent replay store.

These questions do not block the platform-side phase-0 contract because the current proposal deliberately keeps the Gateway verifier and key rotation outside its implementation boundary.
