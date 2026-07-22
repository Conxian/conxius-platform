# Specification: M2M JWT Authentication

## 1. Purpose and normative language

This specification defines the platform-side contract for short-lived JSON Web Tokens used for machine-to-machine authentication. It applies to server-only Conxian platform code and does not define Rust Gateway implementation behavior.

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

## ADDED Requirements

### Requirement: Server-only Bearer transport

The platform MUST accept JWT M2M credentials only in `Authorization: Bearer <compact-JWS>` and MUST keep signing, verification, re-issuance, and Gateway token caching in server-only code.

#### Scenario: Browser code cannot access the signing boundary

- **WHEN** a browser bundle or client request attempts to select a signing identity, scope set, or JWT secret
- **THEN** the platform rejects the operation because JWT issuance is not a public or browser capability

### Requirement: Fixed HS256 verification policy

The platform MUST verify JWTs with an exact `HS256` allowlist, `typ: JWT`, and the configured `GATEWAY_JWT_SECRET`, and MUST reject unsigned, alternate-algorithm, or `kid`-based tokens in this contract.

#### Scenario: Algorithm downgrade is attempted

- **WHEN** a token uses `none`, `HS384`, `HS512`, an asymmetric algorithm, or omits `alg`
- **THEN** authentication fails before the token can authorize a request

### Requirement: Required identity and time claims

Every accepted JWT MUST contain exact `iss`, exact single-string `aud`, registered service identity `sub`, space-delimited `scope`, integer `iat`, `nbf`, `exp`, and non-empty `jti` claims.

#### Scenario: A required claim is absent

- **WHEN** a signed token omits `aud`, `sub`, `scope`, `iat`, `nbf`, `exp`, or `jti`
- **THEN** authentication fails closed with no partial claim trust

### Requirement: Bounded lifetime and clock skew

The platform MUST enforce a default JWT TTL of `300` seconds within `60..900` seconds and a default clock skew of `30` seconds within `0..60` seconds, rejecting invalid configuration and out-of-bound token lifetimes.

#### Scenario: An expired token is outside tolerance

- **WHEN** `exp <= now - clockSkew`
- **THEN** the token is rejected even when its signature is valid

### Requirement: Service scope ceiling

JWT issuance and verification MUST reject unknown, duplicate, or ceiling-exceeding scopes, and every internal service token MUST include `m2m:internal` while remaining a subset of the registered service permission ceiling.

#### Scenario: A token claims an elevated scope

- **WHEN** a token for a service contains a scope outside `SERVICE_PERMISSIONS[sub]`
- **THEN** the token is unauthorized and cannot satisfy a route scope check

### Requirement: Strict Bearer precedence and legacy compatibility

The platform MUST reject a present but malformed or invalid Bearer header without falling through to legacy credentials, while continuing to support `X-Admin-API-Key`, `X-Service-Key`, and `X-External-Key` when no Bearer header is presented.

#### Scenario: Invalid Bearer is combined with a valid legacy key

- **WHEN** a request contains an invalid `Authorization` header and a valid legacy API/service/external key
- **THEN** the request remains unauthorized rather than bypassing the failed Bearer validation

### Requirement: Scoped compatibility admin guard

The compatibility `validateAdminAuth` guard MUST require `read:admin` for JWT-authenticated requests and MUST preserve the existing configured `X-Admin-API-Key` behavior without requiring JWT configuration.

#### Scenario: A valid JWT lacks the admin read scope

- **WHEN** a JWT is otherwise valid but does not contain `read:admin`
- **THEN** the compatibility admin guard returns forbidden rather than authorizing the route

### Requirement: Server-side short-lived refresh

“Refresh” MUST mean server-side re-issuance of a new bounded-lifetime access token from a trusted service identity; the platform MUST NOT add a long-lived refresh token, browser refresh endpoint, or client-side signing flow.

#### Scenario: A cached token nears expiry

- **WHEN** the cached token has no more than the configured clock-skew window remaining
- **THEN** the server issues a new short-lived JWT before sending the next Gateway request

### Requirement: Explicit Gateway migration modes

Gateway header generation MUST support `legacy`, `dual`, and `jwt` modes with `legacy` as the safe default, and an explicitly selected JWT mode MUST fail closed when JWT configuration is missing or invalid.

#### Scenario: Legacy mode is used before Gateway coordination

- **WHEN** `M2M_GATEWAY_AUTH_MODE=legacy`
- **THEN** the client sends existing legacy headers and does not claim that the current Rust Gateway verifies the proposed JWT

### Requirement: Safe failures and token secrecy

JWT validation MUST fail closed for signature, algorithm, issuer, audience, identity, claim, time, scope, header, secret, and configuration failures, and MUST NOT log or expose raw secrets, Authorization headers, compact tokens, or token-bearing URLs.

#### Scenario: A malformed token reaches the verifier

- **WHEN** the Authorization value is malformed or exceeds the bounded input size
- **THEN** the client receives a generic unauthorized result and operational logs contain only a safe reason code

## 2. Trust boundary and migration modes

1. JWT signing and verification MUST run only in server-side support modules. Any module that can access `GATEWAY_JWT_SECRET` MUST remain server-only and MUST NOT be imported by browser bundles.
2. The secret MUST NOT be accepted from a request, browser storage, URL, cookie, or client-side configuration.
3. The platform MUST support the following Gateway transport modes through `M2M_GATEWAY_AUTH_MODE`:
   - `legacy` — default; send the existing `X-Admin-API-Key` and/or `X-Service-Key` headers and do not issue a JWT for Gateway requests.
   - `dual` — send `Authorization: Bearer <JWT>` together with the existing legacy headers. This mode is for controlled migration and MUST NOT be treated as proof that the Gateway verifies the JWT.
   - `jwt` — send the JWT Bearer header as the Gateway credential after the coordinated Gateway verifier is available.
4. An invalid or unsupported mode MUST fail closed. The implementation MUST NOT silently downgrade an explicitly selected `dual` or `jwt` mode to `legacy` because JWT configuration is missing.
5. The current Rust Gateway is outside this specification. The platform implementation MUST record that current Gateway behavior uses opaque bearer/service credentials and that end-to-end JWT verification requires a coordinated Gateway change.

## 3. Request header contract

1. A JWT request credential MUST be carried in exactly one HTTP header:

   ```http
   Authorization: Bearer <compact-JWS>
   ```

2. The scheme comparison MAY be case-insensitive, but the parser MUST require exactly one non-empty token value with no leading/trailing whitespace or additional credential material.
3. The compact JWS MUST contain exactly three non-empty dot-separated segments and MUST be no larger than the implementation's bounded token-input limit (the default contract is `4096` bytes).
4. A request with an `Authorization` header that is malformed, non-Bearer, duplicated, or otherwise present but invalid MUST be rejected as unauthorized. It MUST NOT fall through to an `X-Admin-API-Key`, `X-Service-Key`, or `X-External-Key` credential on the same request.
5. If no `Authorization` header is present, the existing legacy authentication order and formats remain available:
   - `X-Admin-API-Key: <key>`
   - `X-Service-Key: <service-id>:<key>`
   - `X-External-Key: <key>`

## 4. JWT protected header and claims

### 4.1 Protected header

The protected header MUST satisfy all of the following:

| Field | Requirement |
| --- | --- |
| `alg` | MUST be exactly `HS256`; `none`, `HS384`, `HS512`, asymmetric algorithms, and algorithm omission MUST be rejected. |
| `typ` | MUST be exactly `JWT`. |
| `kid` | MUST be absent in this issue's single-secret contract. Tokens carrying `kid` are rejected until #1161 defines rotation semantics. |

The verifier MUST select the algorithm from an allowlist, never from an untrusted token without comparison to the fixed `HS256` policy.

### 4.2 Required claims

All claims in the following table are required. Unknown private claims MAY be ignored only after all required validation succeeds; they MUST NOT change authorization decisions.

| Claim | Type and meaning | Validation |
| --- | --- | --- |
| `iss` | Non-empty string issuer | MUST exactly equal configured `GATEWAY_JWT_ISSUER`. |
| `aud` | One string audience | MUST exactly equal configured `GATEWAY_JWT_AUDIENCE`; arrays and missing values are rejected. |
| `sub` | Registered service identity | MUST be one of the `ServiceId` values in the platform registry and MUST not be an unregistered or client-selected identity. JWT issuance for `external` is not part of this contract; external integrations continue using explicit external keys. |
| `scope` | Space-delimited scope string | MUST contain only known `Scope` values, no duplicates, and no empty items. It MUST be a subset of the current permission ceiling for `sub`. Internal service tokens MUST include `m2m:internal`. |
| `iat` | Integer NumericDate | MUST be present and MUST NOT be more than the configured clock-skew window in the future. |
| `nbf` | Integer NumericDate | MUST be present and MUST not be later than `now + clockSkew`. The issuer SHOULD set it equal to `iat`. |
| `exp` | Integer NumericDate | MUST be greater than `iat` and MUST not be expired beyond the configured clock-skew tolerance. |
| `jti` | Non-empty opaque token identifier | MUST be present, bounded to a safe identifier length, and unique per issuance. It is used for audit correlation and future revocation/rotation work; the raw token MUST never be logged. |

The verifier MUST validate the signature before treating any decoded claim as trusted.

### 4.3 Lifetime and clock policy

1. `M2M_JWT_TTL_SECONDS` MUST default to `300` seconds and MUST be bounded inclusively to `60..900` seconds. A configured or requested value outside that range MUST fail closed; it MUST NOT be silently clamped.
2. Each issued token MUST satisfy `60 <= exp - iat <= 900` seconds. The default issuance lifetime is `300` seconds.
3. `M2M_JWT_CLOCK_SKEW_SECONDS` MUST default to `30` seconds and MUST be bounded inclusively to `0..60` seconds. An invalid configured value MUST fail closed.
4. Verification MUST apply the configured skew consistently:
   - reject `iat > now + clockSkew`;
   - reject `nbf > now + clockSkew`;
   - reject `exp <= now - clockSkew`;
   - reject lifetimes outside the fixed minimum/maximum regardless of skew.
5. The implementation MUST use one captured validation time per request so boundary checks are deterministic and cannot drift between claims.

## 5. Signing and issuance

1. Phase 0/issue #1160 MUST use the existing `GATEWAY_JWT_SECRET` environment boundary with HS256. The secret MUST be present, non-empty, and meet the implementation's minimum entropy/length requirement; the proposed default is at least 32 bytes. No development fallback or hardcoded secret is permitted.
2. `GATEWAY_JWT_ISSUER` and `GATEWAY_JWT_AUDIENCE` MUST be explicitly configured whenever JWT issuance or verification is enabled. The implementation MUST not invent an insecure default that causes tokens to be accepted across environments.
3. The issuer MUST accept only a server-owned registered `serviceId` and requested scopes from trusted server-side call sites. Request bodies, query parameters, browser code, and arbitrary external callers MUST NOT be able to select the signing identity or scope set.
4. Before signing, the issuer MUST enforce that requested scopes are known, non-duplicated, include `m2m:internal` for internal services, and are a subset of `SERVICE_PERMISSIONS[serviceId]`. Scope escalation MUST fail rather than truncate or broaden the request.
5. The issuer MUST create a fresh `jti` for every token, set `nbf` and `iat` from the same captured time, and set `exp` using the bounded TTL.
6. The issuer MUST use a maintained JWT implementation with explicit algorithm selection. A decode-only implementation or hand-rolled signature check is not acceptable.

## 6. Server-side refresh and caching

1. “Refresh” in this contract means server-side re-issuance of a new short-lived access token from a trusted service identity. It MUST NOT mean a long-lived refresh token, browser endpoint, cookie, or client-side signing flow.
2. Gateway header generation MAY cache a token in process memory keyed by target audience, service identity, and canonical sorted scope set.
3. A cached token MAY be reused only while its remaining lifetime is greater than `clockSkew`. At or within the skew window, the server MUST issue a new token before sending the request.
4. The cache MUST be non-persistent, MUST not be shared with browser code, and MUST not include raw token values in logs, metrics labels, thrown errors, or response bodies.
5. If JWT configuration is absent or invalid in `dual` or `jwt` mode, issuance MUST fail closed. `legacy` mode is the only intentional path that may operate without JWT configuration.

## 7. Verification, authentication, and authorization

### 7.1 `M2MAuthenticator`

`M2MAuthenticator` MUST expose JWT authentication through the same `AuthResult` contract used by existing key methods, with `source: 'jwt'`, the validated `serviceId` from `sub`, and normalized scopes.

JWT verification MUST reject all of the following:

- invalid signature or missing secret;
- unsupported, missing, or mismatched algorithm;
- wrong issuer or audience;
- missing, malformed, future, expired, or otherwise invalid `iat`, `nbf`, `exp`, or `jti`;
- unknown service identity or a token whose identity does not match the trusted service registry;
- unknown, duplicate, or ceiling-exceeding scopes;
- malformed Authorization headers, malformed compact tokens, oversized input, or extra credential material.

The public response for token parsing, signature, claim, and configuration failures SHOULD be the same generic `401 Unauthorized` shape. Safe internal reason codes MAY be recorded for operations, but token contents and secrets MUST not be recorded.

### 7.2 Required scopes

1. `validateM2MAuthWithScope(request, requiredScope)` MUST return `401` when authentication fails and `403` when a valid credential lacks `requiredScope`.
2. The required scope MUST be checked after JWT signature and claim validation. A token with an elevated or unknown scope MUST never become authorized merely because it contains the requested scope.
3. The permission ceiling MUST be enforced during both issuance and verification so a change to the service registry cannot leave an over-privileged token valid.

### 7.3 Compatibility admin guard

1. The compatibility `validateAdminAuth` route guard MUST continue to accept the existing configured `X-Admin-API-Key` behavior without requiring JWT configuration.
2. When the request uses a JWT Bearer credential, `validateAdminAuth` MUST require `read:admin` in addition to all normal JWT validation. It MUST not treat a valid signature alone as admin authorization.
3. Routes requiring write or administrative actions MUST use an explicit scope-aware guard; `read:admin` MUST not imply `write:admin`, `admin:secrets`, or `admin:deploy`.
4. Existing service-key and external-key behavior in the M2M module MUST remain covered by compatibility tests during migration. No legacy credential is removed by this specification.

## 8. Key rotation boundary

The single `GATEWAY_JWT_SECRET` HS256 design has an intentional rotation limitation: issuer and verifier share one secret, there is no `kid`, and there is no active/previous-key overlap. Rotation therefore requires coordinated secret replacement and redeployment across all platform JWT issuers/verifiers and may invalidate all outstanding tokens. Automated rotation, overlap windows, `kid`, and/or an asymmetric JWKS design belong to issue #1161 and MUST NOT be implied as implemented by #1160.

## 9. Security and observability requirements

1. Validation MUST be deterministic and fail closed. No unsigned, partially validated, algorithm-downgraded, or legacy-fallback JWT path is allowed.
2. Authorization headers, compact tokens, secrets, decoded claim payloads containing sensitive data, and token-bearing URLs MUST be redacted from logs and error messages.
3. Authentication failure logging MAY include a safe reason code, service endpoint, and request correlation ID, but MUST NOT include the raw credential or full token.
4. The implementation MUST have tests for invalid signature, wrong algorithm, wrong issuer, wrong audience, unknown service, missing claims, expired tokens, future `iat`/`nbf`, clock-skew boundaries, scope escalation, malformed headers/tokens, missing secret/configuration, token cache expiry, and legacy compatibility.
5. Browser-side imports, localStorage/sessionStorage token storage, client refresh calls, and public signing endpoints MUST be absent.

## 10. Gateway integration boundary

The platform MAY generate a standards-compliant Bearer JWT in `dual` or `jwt` mode, but this alone does not establish Gateway interoperability. The Rust Gateway MUST receive a coordinated follow-up change that validates HS256, issuer, audience, service identity, lifetime, and scope claims, and maps them to its own authorization model. Until that work is complete, `legacy` remains the default transport and platform tests MUST not claim end-to-end Gateway JWT verification.
