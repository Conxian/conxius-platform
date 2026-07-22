# M2M (Machine-to-Machine) Authentication

This document defines the M2M authentication patterns for the Conxian platform, enabling secure service-to-service communication across all platform components.

---

## Overview

The Conxian platform uses a multi-layered M2M authentication system:

| Method | Use Case | Security Level |
|--------|----------|----------------|
| **Admin API Key** | Primary admin operations | High |
| **Service Keys** | Internal service-to-service | High |
| **External Keys** | Third-party integrations | Configurable |
| **JWT Tokens** | Future token-based auth | TBD |

---

## Authentication Headers

### X-Admin-API-Key
Primary authentication header for admin operations.

```bash
curl -H "X-Admin-API-Key: your-admin-key" \
  https://api.conxian-labs.com/api/v1/admin/endpoint
```

### X-Service-Key
Service-to-service authentication with service identity.

```bash
# Format: <service-id>:<service-key>
curl -H "X-Service-Key: gateway:your-gateway-key" \
  https://api.conxian-labs.com/api/v1/endpoint
```

### X-External-Key
Third-party API access with explicit scopes.

```bash
curl -H "X-External-Key: your-external-key" \
  https://api.conxian-labs.com/api/v1/public/endpoint
```

---

## Service Registry

Each platform service has a defined set of scopes:

| Service ID | Description | Default Scopes |
|------------|-------------|----------------|
| `gateway` | conxian-gateway Rust backend | read:admin, read:governance, read:treasury, read:metrics, m2m:internal |
| `elizaos` | ElizaOS plugin | read:admin, read:governance, read:metrics, m2m:internal |
| `nexus` | conxian-nexus state service | read:governance, read:treasury, read:metrics, write:governance, m2m:internal |
| `orbit` | conxius-orbit deployment CLI | admin:deploy, m2m:internal |
| `wallet` | conxius-wallet mobile client | read:treasury, write:governance, m2m:internal |
| `ui` | conxian_ui dApp | read:admin, read:governance, read:treasury, read:metrics, m2m:internal |
| `admin-dashboard` | Admin dashboard | All scopes (full access) |
| `pulse-bos` | SFO dashboard | read:admin, read:treasury, read:metrics, m2m:internal |
| `external` | Third-party | Configurable via EXTERNAL_API_KEYS |

---

## Permission Scopes

### Read Scopes
| Scope | Description |
|-------|-------------|
| `read:admin` | Read admin dashboard data |
| `read:governance` | Read governance proposals and votes |
| `read:treasury` | Read treasury balances and transactions |
| `read:metrics` | Read platform metrics |

### Write Scopes
| Scope | Description |
|-------|-------------|
| `write:admin` | Modify admin configurations |
| `write:governance` | Submit governance actions |
| `write:treasury` | Modify treasury operations |

### Admin Scopes
| Scope | Description |
|-------|-------------|
| `admin:secrets` | Manage secrets |
| `admin:deploy` | Deployment operations |

### Internal Scopes
| Scope | Description |
|-------|-------------|
| `m2m:internal` | Internal service communication (always required) |

---

## Environment Variables

### Required for Services

```bash
# Admin Dashboard
ADMIN_DASHBOARD_API_KEY=your-admin-key

# Dashboard service identity. This is not the admin API key.
SERVICE_KEY_ADMIN_DASHBOARD=your-admin-dashboard-service-key

# Service Keys (per service)
SERVICE_KEY_GATEWAY=your-gateway-key
SERVICE_KEY_ELIZAOS=your-elizaos-key
SERVICE_KEY_NEXUS=your-nexus-key
SERVICE_KEY_ORBIT=your-orbit-key
SERVICE_KEY_WALLET=your-wallet-key
SERVICE_KEY_UI=your-ui-key
SERVICE_KEY_PULSE_BOS=your-pulse-bos-key

# Dashboard-owned registry and Prometheus scrape password file
M2M_SERVICE_KEY_REGISTRY_PATH=/var/lib/conxian/m2m/service-key-registry.json
PROMETHEUS_SCRAPE_PASSWORD_FILE=/var/lib/conxian/secrets/prometheus-scrape.password

# External API Keys (JSON)
EXTERNAL_API_KEYS='{"external-key-1": ["read:admin", "read:metrics"]}'

# JWT (future)
GATEWAY_JWT_SECRET=your-jwt-secret
```

---

## Usage Examples

### Admin Dashboard → Gateway

```typescript
import { getGatewayAuthHeaders } from '@/lib/sidl/gateway';

async function fetchFromGateway(path: string) {
  const headers = getGatewayAuthHeaders();
  return fetch(`${process.env.CORE_API_URL}${path}`, {
    headers: {
      ...headers,
      'Accept': 'application/json',
    },
  });
}
```

### ElizaOS Plugin → Admin Dashboard

```typescript
import { getServiceAuthHeaders } from '@/lib/conxianClient';

function getAuthenticatedHeaders() {
  const headers = {
    'Accept': 'application/json',
  };
  
  const serviceHeaders = getServiceAuthHeaders();
  Object.entries(serviceHeaders).forEach(([key, value]) => {
    headers[key] = value;
  });
  
  return headers;
}
```

### API Route Protection

```typescript
import { validateM2MAuth, validateM2MAuthWithScope } from '@/lib/support/m2m';

export async function GET(req: Request) {
  // Basic M2M auth
  const authError = validateM2MAuth(req);
  if (authError) return authError;
  
  // Proceed with request
  return Response.json({ data: 'success' });
}

// With scope check
export async function POST(req: Request) {
  const { response, auth } = validateM2MAuthWithScope(req, 'write:governance');
  if (response) return response;
  
  // Authenticated and authorized
  return Response.json({ data: 'success' });
}
```

---

## Service-Key Rotation v1

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

## Metrics, alerts, and scrape authentication

The dashboard exports bounded M2M metrics through the existing protected
`GET /api/metrics` route:

- `m2m_service_key_expiry_timestamp_seconds{service_id,key_role}`
- `m2m_service_key_rotation_total{service_id,outcome}`
- `m2m_service_key_rollback_total{service_id,outcome}`
- `m2m_service_key_validation_total{service_id,outcome}`
- `m2m_service_key_generation{service_id}`
- `m2m_service_key_registry_revision`
- `m2m_service_key_expiry_threshold_total{service_id,key_role,threshold}`
- `m2m_service_key_registry_write_failures_total{stage,category}`

The checked-in Prometheus rules cover active and previous expiry, mutually
exclusive 30-day/7-day/24-hour/1-hour windows, invalid/expired authentication
bursts, rotation and rollback failures/conflicts, registry write failures,
unavailable registry observations, and an absent registry revision metric.
Threshold state is persisted by generation and role so repeated evaluations do
not create duplicate crossing events.

Prometheus authenticates with Basic Auth using username `prometheus` and the
password file at `/run/secrets/prometheus_scrape_password`. The host-side file
is created by `scripts/provision-secrets.sh` at
`PROMETHEUS_SCRAPE_PASSWORD_FILE`, mounted as the same Compose secret into both
Prometheus and `admin-dashboard`, and ignored by Git. The password is not
embedded in `prometheus.yml` or the environment value; the environment contains
the file path only. If the file is missing or unreadable, scrape authentication
fails closed with `503 metrics_scrape_auth_unavailable`. Operators may continue
to use a valid `X-Admin-API-Key` for manual metrics access.

---

## Security Best Practices

1. **Never commit keys to git** - Use environment variables or secrets management
2. **Use unique keys per service** - Enables key rotation without downtime
3. **Principle of least privilege** - Grant only required scopes
4. **Monitor authentication failures** - Log and alert on auth errors
5. **Rotate keys regularly** - Quarterly rotation recommended

---

## Troubleshooting

### 401 Unauthorized
- Verify API key matches `ADMIN_DASHBOARD_API_KEY`
- Check header name: `X-Admin-API-Key` (case-sensitive)

### 403 Forbidden
- Service lacks required scope
- Check service permissions in M2M config

### Service Key Format Error
- Ensure format is `<service-id>:<key>` (e.g., `gateway:your-key`)
- Service ID must be lowercase and match registry

---

© 2026 Conxian Labs. Code is Law.
