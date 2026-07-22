# M2M (Machine-to-Machine) Authentication

This document defines the Conxian platform's server-to-server authentication contract. It covers the existing key-based migration path and the platform-side short-lived JWT support from GitHub issue #1160.

## Authentication methods

| Method | Use | Compatibility |
| --- | --- | --- |
| `X-Admin-API-Key` | Legacy admin operations | Supported; does not require JWT configuration |
| `X-Service-Key` | Internal service-to-service calls (`<service-id>:<key>`) | Supported during migration |
| `X-External-Key` | Third-party calls with configured scopes | Supported during migration |
| `Authorization: Bearer <JWT>` | Short-lived internal service credentials | Server-only platform support |

Authentication precedence is intentional:

1. If `Authorization` is present, it must contain one valid Bearer JWT. A malformed, invalid, duplicated, or unsupported Authorization value is rejected and **never** falls through to a legacy key on the same request.
2. If `Authorization` is absent, the legacy order remains `X-Admin-API-Key`, `X-Service-Key`, then `X-External-Key`.

## Legacy headers

### Admin API key

```bash
curl -H "X-Admin-API-Key: your-admin-key" \
  https://api.conxian-labs.com/api/v1/admin/endpoint
```

### Service key

```bash
# Format: <service-id>:<service-key>
curl -H "X-Service-Key: gateway:your-gateway-key" \
  https://api.conxian-labs.com/api/v1/endpoint
```

### External key

```bash
curl -H "X-External-Key: your-external-key" \
  https://api.conxian-labs.com/api/v1/public/endpoint
```

## JWT contract

JWT signing and verification are server-only. `GATEWAY_JWT_SECRET` must never be accepted from a request, browser storage, a URL, a cookie, or client-side configuration. No browser signing flow, public issuance endpoint, or long-lived refresh token exists.

JWT requests use exactly one header:

```http
Authorization: Bearer <compact-JWS>
```

The compact token is bounded to 4096 bytes and must contain three non-empty dot-separated segments. The protected header must be exactly compatible with this issue's single-secret policy:

| Header | Required value |
| --- | --- |
| `alg` | `HS256` only |
| `typ` | `JWT` |
| `kid` | Absent; key rotation is tracked separately in #1161 |

The signed token contains these required claims:

| Claim | Contract |
| --- | --- |
| `iss` | Exact `GATEWAY_JWT_ISSUER` string |
| `aud` | Exact single-string `GATEWAY_JWT_AUDIENCE` value; arrays are rejected |
| `sub` | Registered internal service identity; `external` is not a JWT issuer identity |
| `scope` | Space-delimited known scopes, with no duplicates |
| `iat` | Integer issue time |
| `nbf` | Integer not-before time; issuance sets it equal to `iat` |
| `exp` | Integer expiry time |
| `jti` | Fresh, bounded token identifier |

The current service permission matrix is enforced both when issuing and verifying a token. Internal JWTs must include `m2m:internal`, and the scope set must remain a subset of the service's registered ceiling. A valid signature alone does not grant access.

### Lifetime and clock policy

- Default TTL: `300` seconds.
- Allowed TTL: inclusive `60..900` seconds.
- Default clock skew: `30` seconds.
- Allowed clock skew: inclusive `0..60` seconds.
- Invalid or out-of-range settings fail closed; they are not clamped.
- `exp <= now - clockSkew` is rejected. `iat` and `nbf` more than `clockSkew` in the future are rejected.
- A single captured validation time is used for the token checks.

JWT validation failures return a generic unauthorized result. Token contents, Authorization headers, secrets, and compact tokens must not be written to logs, response bodies, metrics labels, or URLs. A valid credential without the required route scope returns `403 Forbidden`.

## Admin route compatibility

`validateAdminAuth()` remains compatible with `X-Admin-API-Key` and does not require JWT configuration for that legacy path. For JWT requests, the default compatibility requirement is `read:admin`.

Write and administrative handlers use an explicit scope rather than treating `read:admin` as full access:

```typescript
import { validateAdminAuth } from "@/lib/support/auth";

export async function POST(req: Request) {
  const authError = await validateAdminAuth(req, "write:governance");
  if (authError) return authError;

  return Response.json({ ok: true });
}
```

The M2M helper is asynchronous because maintained JWT signing and verification are asynchronous:

```typescript
import { validateM2MAuth, validateM2MAuthWithScope } from "@/lib/support/m2m";

export async function GET(req: Request) {
  const authError = await validateM2MAuth(req);
  if (authError) return authError;
  return Response.json({ data: "success" });
}

export async function POST(req: Request) {
  const { response } = await validateM2MAuthWithScope(req, "write:governance");
  if (response) return response;
  return Response.json({ data: "success" });
}
```

## Gateway migration modes

`M2M_GATEWAY_AUTH_MODE` controls the server-only Gateway client:

| Mode | Headers | Use |
| --- | --- | --- |
| `legacy` (default) | Existing `X-Admin-API-Key` and/or `X-Service-Key` | Safe current behavior |
| `dual` | JWT Bearer plus existing legacy headers | Controlled migration |
| `jwt` | JWT Bearer only | Only after Gateway verification is coordinated |

`dual` and `jwt` fail closed when JWT configuration is missing or invalid. They never silently downgrade to `legacy`. The Gateway client uses the fixed `admin-dashboard` service identity and the least-privilege read set required by its current read calls: `read:admin`, `read:treasury`, `read:metrics`, and `m2m:internal`.

Gateway JWTs are cached only in process memory. The cache key contains the audience, service identity, and canonical sorted scope set. A cached token is reused only while more than the configured clock-skew window remains; otherwise the server re-issues a new short-lived access token before the next request.

“Refresh” means this server-side re-issuance. There is no refresh-token endpoint, persistent refresh token, browser token storage, cookie, or client-side signing path.

### Current Rust Gateway boundary

This repository implements and tests platform-side issuance, verification, route authorization, migration headers, and cache behavior. It does **not** implement Rust Gateway JWT verification or claim-to-permission mapping. The current Rust Gateway may treat bearer values as opaque credentials, so `legacy` remains the deployment default until a coordinated Gateway change and evidence exist. Platform tests must not be read as end-to-end Gateway interoperability evidence.

## Service registry and scopes

| Service ID | Default ceiling |
| --- | --- |
| `gateway` | `read:admin`, `read:governance`, `read:treasury`, `read:metrics`, `m2m:internal` |
| `elizaos` | `read:admin`, `read:governance`, `read:metrics`, `m2m:internal` |
| `nexus` | `read:governance`, `read:treasury`, `read:metrics`, `write:governance`, `m2m:internal` |
| `orbit` | `admin:deploy`, `m2m:internal` |
| `wallet` | `read:treasury`, `write:governance`, `m2m:internal` |
| `ui` | `read:admin`, `read:governance`, `read:treasury`, `read:metrics`, `m2m:internal` |
| `admin-dashboard` | All registered scopes, including `m2m:internal` |
| `pulse-bos` | `read:admin`, `read:treasury`, `read:metrics`, `m2m:internal` |
| `external` | Explicit `EXTERNAL_API_KEYS` scopes; not a JWT issuer identity |

The known scopes are `read:admin`, `write:admin`, `read:governance`, `write:governance`, `read:treasury`, `write:treasury`, `read:metrics`, `admin:secrets`, `admin:deploy`, and `m2m:internal`.

## Environment variables

```bash
# Legacy compatibility
ADMIN_DASHBOARD_API_KEY=your-admin-key
SERVICE_KEY_ADMIN_DASHBOARD=your-admin-dashboard-key
EXTERNAL_API_KEYS='{"external-key-1":["read:admin","read:metrics"]}'

# JWT settings; do not commit the secret
GATEWAY_JWT_SECRET=<at-least-32-byte-secret>
GATEWAY_JWT_ISSUER=https://issuer.example.internal
GATEWAY_JWT_AUDIENCE=conxian-gateway
M2M_JWT_TTL_SECONDS=300
M2M_JWT_CLOCK_SKEW_SECONDS=30
M2M_GATEWAY_AUTH_MODE=legacy
```

`GATEWAY_JWT_SECRET`, issuer, and audience are required whenever JWT issuance or verification is used. A minimum 32-byte secret is enforced. `legacy` mode may run with only the existing key configuration.

## Rotation boundary: issue #1161

Issue [#1161](https://github.com/Conxian/conxius-platform/issues/1161) owns multi-key rotation, active/previous-secret overlap, `kid`, automated rotation, revocation, and/or an asymmetric JWKS design. Issue #1160 intentionally supports one shared HS256 secret only; coordinated replacement may invalidate outstanding tokens.

## Security practices

1. Never commit credentials; provision them through the repository's secret-management process.
2. Use unique legacy keys per service and grant the smallest possible scope ceiling.
3. Keep JWT issuance, verification, and Gateway caching in server-only modules.
4. Keep `legacy` mode enabled until the Rust Gateway verifier is deployed and verified.
5. Treat unexpected `401` results as credential, claim, time, or configuration failures; treat `403` as an authenticated credential missing the route's required scope.

© 2026 Conxian Labs. Code is Law.
