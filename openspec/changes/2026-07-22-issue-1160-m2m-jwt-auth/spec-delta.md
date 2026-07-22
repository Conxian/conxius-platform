# Spec Delta: Issue #1160 — JWT-based M2M Authentication

This change introduces the new capability specification:

- `openspec/changes/2026-07-22-issue-1160-m2m-jwt-auth/specs/m2m-jwt-authentication/spec.md`

The capability is proposed for later synchronization into the canonical `openspec/specs/` collection after review and implementation. This phase does not modify an existing canonical spec or production code.

## Added normative requirements

1. Server-side M2M JWTs MUST use `Authorization: Bearer <compact-JWS>` and MUST be issued and verified only in server-only support code.
2. The phase-0 contract MUST use the existing `GATEWAY_JWT_SECRET` with an exact `HS256` algorithm allowlist; unsigned, alternate-algorithm, and `kid`-based tokens are rejected.
3. Tokens MUST contain and validate exact `iss`, `aud`, registered service identity (`sub`), space-delimited `scope`, integer `iat`, `nbf`, `exp`, and non-empty `jti` claims.
4. Token TTL MUST default to `300` seconds and remain within `60..900` seconds. Clock skew MUST default to `30` seconds and remain within `0..60` seconds. Invalid configuration MUST fail closed.
5. JWT scopes MUST be known, non-duplicated, and a subset of the current service permission ceiling. Internal service tokens MUST include `m2m:internal`; scope escalation MUST be rejected during issuance and verification.
6. A present but malformed or invalid Bearer header MUST not fall through to legacy API, service, or external-key credentials. Legacy credentials remain supported when no Bearer credential is presented.
7. The compatibility admin route guard MUST require `read:admin` for JWT-authenticated requests while preserving existing `X-Admin-API-Key` behavior.
8. “Refresh” MUST mean server-side re-issuance of a new short-lived token from a trusted service identity. Long-lived refresh tokens, browser signing, browser storage, and public issuance endpoints are out of scope.
9. Gateway JWT generation and caching MUST remain server-only, in-memory, bounded by token expiry, and free of token/log leakage. Gateway transport MUST support explicit `legacy`, `dual`, and `jwt` migration modes with `legacy` as the safe default.
10. Current Rust Gateway JWT verification remains a coordinated follow-up because this repository does not establish that the Gateway validates the proposed JWT claims; issue #1161 owns multi-key rotation improvements.

## Compatibility and non-goals

- Existing `X-Admin-API-Key`, `X-Service-Key`, and `X-External-Key` flows remain available during migration.
- No Rust Gateway, protocol, wallet, custody, user-data, browser, or production implementation changes are included in this phase.
