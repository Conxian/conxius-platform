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
SERVICE_KEY_GATEWAY=your-gateway-key
SERVICE_KEY_ELIZAOS=your-elizaos-key
SERVICE_KEY_NEXUS=your-nexus-key
SERVICE_KEY_ORBIT=your-orbit-key
SERVICE_KEY_WALLET=your-wallet-key
SERVICE_KEY_UI=your-ui-key
SERVICE_KEY_PULSE_BOS=your-pulse-bos-key
EXTERNAL_API_KEYS='{"external-key-1":["read:admin","read:metrics"]}'

# Dashboard-owned legacy service-key registry and Prometheus scrape password file
M2M_SERVICE_KEY_REGISTRY_PATH=/var/lib/conxian/m2m/service-key-registry.json
PROMETHEUS_SCRAPE_PASSWORD_FILE=/var/lib/conxian/secrets/prometheus-scrape.password

# JWT settings; do not commit the secret
GATEWAY_JWT_SECRET=<at-least-32-byte-secret>
GATEWAY_JWT_ISSUER=https://issuer.example.internal
GATEWAY_JWT_AUDIENCE=conxian-gateway
M2M_JWT_TTL_SECONDS=300
M2M_JWT_CLOCK_SKEW_SECONDS=30
M2M_GATEWAY_AUTH_MODE=legacy
```

`GATEWAY_JWT_SECRET`, issuer, and audience are required whenever JWT issuance or verification is used. A minimum 32-byte secret is enforced. `legacy` mode may run with only the existing key configuration.

## Legacy service integration examples

The existing Gateway and ElizaOS clients continue to use their configured
legacy headers while migration mode remains `legacy`:

```typescript
import { getGatewayAuthHeaders } from "@/lib/sidl/gateway";

async function fetchFromGateway(path: string) {
  return fetch(`${process.env.CORE_API_URL}${path}`, {
    headers: {
      ...getGatewayAuthHeaders(),
      Accept: "application/json",
    },
  });
}
```

```typescript
import { getServiceAuthHeaders } from "@/lib/conxianClient";

function getAuthenticatedHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    ...getServiceAuthHeaders(),
  };
}
```

## Legacy service-key rotation v1

Rotation is a dashboard-owned registry operation. It returns a replacement
secret once, but it does **not** update another repository, deployment, secret
manager, or running consumer. The operator must distribute the replacement
through the approved deployment secret path.

The rotatable service IDs are `gateway`, `elizaos`, `nexus`, `orbit`, `wallet`,
`ui`, `admin-dashboard`, and `pulse-bos`. `external` keys, JWT secrets, and
`ADMIN_DASHBOARD_API_KEY` are outside this lifecycle.

### Registry and bootstrap behavior

- The registry stores only `sha256:<64 lowercase hex characters>` hashes,
  lifecycle metadata, audit events, and threshold markers.
- A missing registry imports non-empty `SERVICE_KEY_*` environment values once
  at generation `1`, including `SERVICE_KEY_ADMIN_DASHBOARD`.
- After a service record exists, the registry is authoritative. Changing an
  environment value does not replace or create a record automatically.
- In Compose, the registry path is
  `/var/lib/conxian/m2m/service-key-registry.json` on the named
  `m2m_registry_data` volume. The file backend supports one writer only; do not
  run multiple dashboard writers against the same registry.
- The derived `.lock`, `.candidate`, `.journal`, and `.marker` files must stay
  on the same persistent filesystem as the registry.

### Metadata endpoint

```text
GET /api/v1/m2m/service-keys
```

Authorize with `X-Admin-API-Key` only. A successful response is `200` with
`Cache-Control: no-store`, `X-Request-ID`, and this metadata-only shape:

```json
{
  "revision": 12,
  "services": [
    {
      "serviceId": "gateway",
      "generation": 2,
      "source": "registry",
      "activeCreatedAt": "2026-07-22T12:00:00.000Z",
      "activeExpiresAt": "2026-08-21T00:00:00.000Z",
      "previousGeneration": 1,
      "previousCreatedAt": "2026-07-21T12:00:00.000Z",
      "previousExpiresAt": null,
      "previousGraceUntil": "2026-07-23T12:00:00.000Z",
      "previousEffectiveUntil": "2026-07-23T12:00:00.000Z",
      "previousState": "grace",
      "updatedAt": "2026-07-22T12:00:00.000Z"
    }
  ]
}
```

The endpoint never returns a plaintext key, hash, authorization header, or
reversible credential value. `previousState` is `none`, `grace`, or `expired`.

### Rotate a service key

```text
POST /api/v1/m2m/service-keys/:serviceId/rotate
```

Only `X-Admin-API-Key` authorizes this endpoint. `expectedGeneration` is a
positive integer and is checked again while the writer lock is held. The
optional `gracePeriodSeconds` must be an integer from `300` through `604800`
seconds inclusive; the default is `86400` seconds. The optional `expiresAt`
must be a future RFC 3339 timestamp with an explicit timezone.

Use an approved secret store or an interactive shell variable for the admin key;
do not put a real key in shell history or a committed script:

```bash
read -r -s ADMIN_DASHBOARD_API_KEY
curl --silent --show-error --fail-with-body \
  -H "X-Admin-API-Key: ${ADMIN_DASHBOARD_API_KEY}" \
  -H 'Content-Type: application/json' \
  --data '{"expectedGeneration":1,"gracePeriodSeconds":86400}' \
  https://admin.example.invalid/api/v1/m2m/service-keys/gateway/rotate
unset ADMIN_DASHBOARD_API_KEY
```

The successful response is `201`, `Cache-Control: no-store`, and contains:

```json
{
  "serviceId": "gateway",
  "generation": 2,
  "secret": "<one-time-unpadded-base64url-secret>",
  "rotatedAt": "2026-07-22T12:00:00.000Z",
  "previousGraceUntil": "2026-07-23T12:00:00.000Z",
  "expiresAt": null,
  "revision": 12
}
```

The generated secret decodes to 32 random bytes. It is never persisted, logged,
replayed, or returned by metadata. Capture it only in memory, update the
consumer manually, and then remove it from the terminal/session. The old key
remains accepted only while both its grace and optional expiry boundaries are
strictly in the future. At the exact boundary, it is rejected.

### Generation conflicts

A stale `expectedGeneration` returns `409 generation_conflict` and does not
advance the revision or create another key. The response includes only:
`serviceId`, `expectedGeneration`, `currentGeneration`, `currentRevision`,
`previousGeneration`, `previousGraceUntil`, `previousEffectiveUntil`, and
`activeExpiresAt`, together with `error`, `message`, `requestId`, and
`X-Request-ID`. Never retry a conflict with a secret copied from logs; re-read
metadata and follow the rollout state for the current generation.

### Rollback after a lost response

```text
POST /api/v1/m2m/service-keys/:serviceId/rollback
```

Rollback also accepts only `X-Admin-API-Key`. The request body is:

```json
{
  "expectedGeneration": 2,
  "targetGeneration": 1,
  "reason": "rotation response was lost"
}
```

`reason` is trimmed, must be non-empty, and is limited to 512 characters without
control characters. The target must be the current previous generation and
must still be inside its effective deadline. A successful `200` response is
metadata-only:

```json
{
  "serviceId": "gateway",
  "generation": 3,
  "revision": 13,
  "source": "rollback",
  "rollbackOfGeneration": 2,
  "rollbackTargetGeneration": 1,
  "activeExpiresAt": "2026-07-23T12:00:00.000Z",
  "rolledBackAt": "2026-07-22T12:10:00.000Z"
}
```

Rollback creates a new generation; it never reuses a generation number or
reissues the lost secret. If the response to rollback is also lost, use the
stale-generation conflict and metadata endpoint to confirm the committed
generation rather than repeating the operation.

### Manual consumer update sequence

1. Confirm the current generation and the target consumer's deployment owner.
2. Rotate using the admin API key and keep the one-time response only in memory.
3. Write the new `<service-id>:<secret>` value to the consumer's approved secret
   store. Header parsing splits at the first colon, so legacy secrets containing
   additional colons remain compatible.
4. Roll out or restart the consumer and verify it authenticates with the new
   generation while the previous key is still within grace.
5. Validate the dashboard metadata and metrics, then allow grace to complete.
6. Remove the old consumer secret from the deployment system according to its
   retention policy. The dashboard registry already contains only its hash.

For `admin-dashboard`, use this special order: authenticate the rotation with
the unchanged `ADMIN_DASHBOARD_API_KEY`, rotate the `admin-dashboard` record,
manually update only `SERVICE_KEY_ADMIN_DASHBOARD` in the dashboard's approved
deployment secret source, and restart the dashboard. Do not substitute the
admin API key for the dashboard service key; they have separate names,
consumers, permissions, and lifecycles.

### API errors and recovery

| Status | Code | Operator action |
| --- | --- | --- |
| `400` | `invalid_request`, `invalid_generation_precondition`, `invalid_grace_period`, `invalid_expiry` | Fix the request; no mutation occurred. |
| `401` | `unauthorized` | Present the admin API key; service keys cannot authorize rotation or rollback. |
| `404` | `service_not_found` | Use a bootstrapped supported service ID. |
| `409` | `generation_conflict` | Re-read metadata; do not replay a secret. |
| `409` | `rollback_window_expired` | Use a separate approved consumer repair procedure. |
| `409` | `rollback_target_conflict` | Re-read metadata and use the current previous generation. |
| `503` | `m2m_registry_busy` | Retry after the `Retry-After: 5` header; do not remove a live lock speculatively. |
| `503` | `m2m_registry_unavailable` | Stop rotations, preserve the volume, and follow the runbook recovery steps. |

Every route response carries a server-generated `X-Request-ID`; JSON errors
repeat it as `requestId`. Request IDs and errors never contain authorization
headers, hashes, or plaintext keys.

### API key rotation

`ADMIN_DASHBOARD_API_KEY` is deliberately not rotated by this v1 registry. Its
rotation remains a separate deployment-secret procedure: provision the new
admin API key, update all admin callers and the dashboard, deploy in a planned
window, and revoke the old value only after validation. Never use
`SERVICE_KEY_ADMIN_DASHBOARD` as an admin API key.

## Rotation boundary: issue #1161

Issue [#1161](https://github.com/Conxian/conxius-platform/issues/1161) owns multi-key rotation, active/previous-secret overlap, `kid`, automated rotation, revocation, and/or an asymmetric JWKS design. Issue #1160 intentionally supports one shared HS256 secret only; coordinated replacement may invalidate outstanding tokens.

The legacy `SERVICE_KEY_*` registry rotation documented above is separate from
JWT secret rotation. It supports atomic generation changes, previous-key grace,
rollback after a lost response, and metadata-only observability without adding
`kid` or silently rotating `GATEWAY_JWT_SECRET`.

## Metrics, alerts, and scrape authentication

The dashboard exports bounded M2M metrics through the existing protected
`GET /api/metrics` route:

- `m2m_service_key_expiry_timestamp_seconds{service_id,key_role}`
- `m2m_service_key_rotation_total{service_id,outcome}`
- `m2m_service_key_rollback_total{service_id,outcome}`
- `m2m_service_key_validation_total{service_id,outcome}`
- `m2m_service_key_generation{service_id}`
- `m2m_service_key_registry_ready`
- `m2m_service_key_registry_revision`
- `m2m_service_key_expiry_threshold_total{service_id,key_role,threshold}`
- `m2m_service_key_registry_write_failures_total{stage,category}`

The readiness gauge is initialized to `0` and becomes `1` only after a
validated registry load or initialization. The revision gauge is omitted until
that point, and is cleared again when registry access becomes unavailable or
recovery-latched. The checked-in Prometheus rules alert on a missing/zero
readiness gauge and only treat a missing revision as an error after readiness
has been established.

The checked-in Prometheus rules cover active and previous expiry, mutually
exclusive 30-day/7-day/24-hour/1-hour windows, invalid/expired authentication
bursts, rotation and rollback failures/conflicts, registry write failures,
unavailable registry observations, registry-not-ready state, and an absent
ready-state revision metric. Threshold state is persisted by generation and
role so repeated evaluations do not create duplicate crossing events.

Prometheus authenticates with Basic Auth using username `prometheus` and the
password file at `/run/secrets/prometheus_scrape_password`. The host-side file
is created by `scripts/provision-secrets.sh` at
`PROMETHEUS_SCRAPE_PASSWORD_FILE`, mounted as the same Compose secret into both
Prometheus and `admin-dashboard`, and ignored by Git. The password is not
embedded in `prometheus.yml` or the environment value; the environment contains
the file path only. If the file is missing or unreadable, scrape authentication
fails closed with `503 metrics_scrape_auth_unavailable`. Operators may continue
to use a valid `X-Admin-API-Key` or valid M2M credential for manual metrics
access.

## Troubleshooting

### `401 Unauthorized`

- Verify the credential matches the configured admin key, service-key registry,
  external-key map, or JWT issuer/audience/time policy.
- Check the header name and format: `X-Admin-API-Key`,
  `X-Service-Key: <service-id>:<secret>`, `X-External-Key`, or exactly one
  `Authorization: Bearer <JWT>` value.

### `403 Forbidden`

- The credential authenticated successfully but does not include the route's
  required scope. Use the service permission ceiling and the route's explicit
  scope requirement as the source of truth.

### Service-key format or registry errors

- Service IDs must be lowercase registered IDs, and the parser splits at the
  first colon so secrets containing additional colons remain compatible.
- A stale generation requires a fresh metadata read; do not replay a secret
  from logs or another operator session.
- `503 m2m_registry_unavailable` or `503 metrics_scrape_auth_unavailable` is a
  fail-closed signal. Preserve the registry volume and follow the recovery
  runbook instead of bypassing the guard.

## Security practices

1. Never commit credentials; provision them through the repository's secret-management process.
2. Use unique legacy keys per service and grant the smallest possible scope ceiling.
3. Keep JWT issuance, verification, and Gateway caching in server-only modules.
4. Keep `legacy` mode enabled until the Rust Gateway verifier is deployed and verified.
5. Treat unexpected `401` results as credential, claim, time, or configuration failures; treat `403` as an authenticated credential missing the route's required scope.

© 2026 Conxian Labs. Code is Law.
