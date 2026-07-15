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

# Service Keys (per service)
SERVICE_KEY_GATEWAY=your-gateway-key
SERVICE_KEY_ELIZAOS=your-elizaos-key
SERVICE_KEY_NEXUS=your-nexus-key
SERVICE_KEY_ORBIT=your-orbit-key
SERVICE_KEY_WALLET=your-wallet-key
SERVICE_KEY_UI=your-ui-key
SERVICE_KEY_PULSE_BOS=your-pulse-bos-key

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

## Key Rotation

### Service Key Rotation

1. Generate new service key
2. Update environment variable on target service
3. Deploy target service
4. Update source service with new key
5. Deploy source service

### API Key Rotation

1. Generate new admin API key
2. Update ADMIN_DASHBOARD_API_KEY
3. Update all consumers
4. Revoke old key

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
