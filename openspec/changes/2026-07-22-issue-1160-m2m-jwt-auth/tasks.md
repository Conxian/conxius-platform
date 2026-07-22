# Tasks: Issue #1160 — JWT-based M2M Authentication

## 1. Phase 0 proposal baseline

- [x] 1.1 Create the dated `spec-driven` OpenSpec change directory with `.openspec.yaml`.
- [x] 1.2 Record issue #1160, current M2M implementation paths, the server-only boundary, and the no-production-code phase boundary.
- [x] 1.3 Define the change-local `m2m-jwt-authentication` capability specification and repository-style `spec-delta.md`.
- [x] 1.4 Define the HS256, claim, lifetime, scope-ceiling, compatibility, migration-mode, refresh, caching, and Gateway follow-up decisions.

## 2. Server-only JWT configuration and primitives

- [ ] 2.1 Add a server-only JWT configuration model in `services/admin-dashboard/src/lib/support/m2m.ts` for `GATEWAY_JWT_SECRET`, `GATEWAY_JWT_ISSUER`, `GATEWAY_JWT_AUDIENCE`, `M2M_JWT_TTL_SECONDS`, `M2M_JWT_CLOCK_SKEW_SECONDS`, and `M2M_GATEWAY_AUTH_MODE`.
- [ ] 2.2 Enforce fail-closed configuration validation: no missing secret/issuer/audience in JWT modes, minimum secret length, TTL `60..900`, clock skew `0..60`, and a recognized migration mode.
- [ ] 2.3 Add a maintained JWT implementation dependency with explicit HS256 signing and verification; do not add a browser bundle or hand-roll cryptographic verification.
- [ ] 2.4 Define typed JWT header/claim/auth-result structures without `any`, including normalized scopes and `source: 'jwt'`.

## 3. Token issuance and verification

- [ ] 3.1 Implement server-only issuance for a trusted registered service identity with exact `iss`, `aud`, `sub`, `scope`, `iat`, `nbf`, `exp`, and fresh `jti` claims.
- [ ] 3.2 Reject requested scopes that are unknown, duplicated, missing `m2m:internal` for internal services, or outside the service permission ceiling.
- [ ] 3.3 Implement strict Bearer parsing, compact-JWS shape checks, exact `HS256`/`JWT` header checks, signature verification, issuer/audience checks, and required-claim validation.
- [ ] 3.4 Apply one captured validation time and bounded clock-skew rules for `iat`, `nbf`, and `exp`; reject invalid or out-of-range token lifetimes.
- [ ] 3.5 Re-check the current service permission ceiling during verification and return safe generic failures without logging token material.

## 4. Compatibility and route authorization

- [ ] 4.1 Update `M2MAuthenticator.authenticate()` to give a present Authorization header strict precedence and to reject invalid Bearer credentials without legacy fallback.
- [ ] 4.2 Preserve existing `X-Admin-API-Key`, `X-Service-Key`, and `X-External-Key` behavior when no Bearer credential is present.
- [ ] 4.3 Update the compatibility guard in `services/admin-dashboard/src/lib/support/auth.ts` / `m2m.ts` so JWT-authenticated admin routes require `read:admin`.
- [ ] 4.4 Keep write/admin operations on explicit scope-aware guards; do not let `read:admin` imply `write:admin`, `admin:secrets`, or `admin:deploy`.

## 5. Gateway header issuance, refresh, and cache

- [ ] 5.1 Implement server-only Gateway JWT header generation in `services/admin-dashboard/src/lib/sidl/gateway.ts` using the fixed `admin-dashboard` identity and a least-privilege scope set.
- [ ] 5.2 Add `legacy`, `dual`, and `jwt` Gateway transport modes with `legacy` as the default and explicit fail-closed behavior for invalid JWT modes/configuration.
- [ ] 5.3 Add process-local token caching keyed by audience, service identity, and canonical scopes; re-issue inside the clock-skew window and never persist or log token values.
- [ ] 5.4 Verify that no browser/client import, storage path, public issuance endpoint, or long-lived refresh token is introduced.

## 6. Tests and security regression coverage

- [ ] 6.1 Extend `services/admin-dashboard/src/tests/m2m.test.ts` or add focused JWT tests for valid issuance, valid verification, `AuthResult` mapping, required scope success, and cache reuse/re-issuance.
- [ ] 6.2 Add negative tests for invalid signature, wrong algorithm, wrong issuer, wrong audience, unknown service, missing claims, malformed headers/tokens, oversized input, missing secret/configuration, and invalid TTL/skew configuration.
- [ ] 6.3 Add time-boundary tests for expired `exp`, future `iat`/`nbf`, accepted/rejected clock skew, and lifetime minimum/maximum.
- [ ] 6.4 Add scope-escalation tests for unknown scopes, duplicate scopes, missing `m2m:internal`, service-ceiling violations, and valid signatures lacking the route's required scope.
- [ ] 6.5 Add compatibility tests proving legacy API/service/external keys continue to work without JWT configuration and that invalid Bearer credentials do not fall through.
- [ ] 6.6 Add tests proving `validateAdminAuth` accepts JWTs only with `read:admin` and returns the expected unauthorized/forbidden behavior.

## 7. Documentation and environment contract

- [ ] 7.1 Update `docs/M2M_AUTHENTICATION.md` with the Bearer claim contract, TTL/skew bounds, server-only refresh definition, migration modes, failure behavior, and rotation limitation.
- [ ] 7.2 Update `.env.example`, `.env.schema`, and `.env.production.schema` with the JWT issuer/audience, bounded policy settings, and Gateway auth mode without adding secrets.
- [ ] 7.3 Document that current Rust Gateway JWT verification is a coordinated follow-up and that `legacy` remains the deployment default until evidence exists.
- [ ] 7.4 Record #1161 as the owner of key rotation, overlap, `kid`, and/or JWKS work; do not imply those capabilities are delivered by #1160.

## 8. Validation and handoff

- [ ] 8.1 Run the repository-documented OpenSpec validation command(s) and resolve all change-local validation errors.
- [ ] 8.2 Run targeted admin-dashboard tests plus the repository-relevant lint/typecheck/test commands; redact secrets and tokens from evidence.
- [ ] 8.3 Review the final diff for production-boundary, browser-bundle, secret, and scope-leakage regressions.
- [ ] 8.4 Coordinate a separate Gateway-repository implementation/evidence task before enabling `dual` or `jwt` in a deployed environment.

## Acceptance criteria

- [ ] 8.5 **AC-1 — Strict JWT contract:** A valid token must use `Authorization: Bearer`, `HS256`, exact configured issuer/audience, registered `sub`, valid scopes, integer `iat`/`nbf`/`exp`, and fresh `jti`.
- [ ] 8.6 **AC-2 — Fail-closed validation:** Invalid signatures, algorithms, issuers, audiences, identities, claims, times, headers, secrets, and configuration never authenticate a request.
- [ ] 8.7 **AC-3 — Bounded policy:** Default TTL is `300` seconds, valid TTL is `60..900`, default skew is `30` seconds, valid skew is `0..60`, and out-of-range values are rejected.
- [ ] 8.8 **AC-4 — Scope ceiling:** Issuance and verification reject scope escalation; route guards distinguish `401` from `403`; JWT admin compatibility requires `read:admin`.
- [ ] 8.9 **AC-5 — Compatibility:** Legacy API/service/external-key flows remain available when no Bearer header is present, while invalid Bearer credentials do not fall through.
- [ ] 8.10 **AC-6 — Server-only transport:** Issuance, verification, refresh, and Gateway caching never enter browser code, persistent storage, logs, URLs, or response bodies.
- [ ] 8.11 **AC-7 — Honest Gateway boundary:** Platform tests and docs distinguish local JWT support from true Rust Gateway JWT verification, which remains a coordinated follow-up.
