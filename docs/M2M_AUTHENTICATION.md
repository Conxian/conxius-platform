# M2M (Machine-to-Machine) & API Token Authentication

This document defines the Conxian platform's server-to-server authentication contract, covering JWT support, `CONXIAN_API_TOKEN` developer self-service credentials, and legacy key-based migration paths.

## Authentication methods

| Method | Use | Compatibility |
| --- | --- | --- |
| `Authorization: Bearer cx_live_...` / `cx_test_...` | Unified `CONXIAN_API_TOKEN` for developers & services | Preferred for developer self-service & external integrations |
| `Authorization: Bearer <JWT>` | Short-lived internal service credentials | Server-only platform support |
| `X-Conxian-Api-Token` | Explicit header for `CONXIAN_API_TOKEN` | Supported across all public & admin API routes |
| `X-Admin-API-Key` | Legacy admin operations (`ADMIN_DASHBOARD_API_KEY`) | Supported; legacy compatibility path |
| `X-Service-Key` | Internal service-to-service calls (`<service-id>:<key>`) | Supported during migration |
| `X-External-Key` | Third-party calls with configured scopes | Supported during migration |

### Authentication Precedence

Authentication precedence is strictly enforced:

1. **Bearer Authorization Header (`Authorization: Bearer <token>`)**:
   - If the token starts with `cx_live_` or `cx_test_`, it is authenticated as a **`CONXIAN_API_TOKEN`** against stored SHA-256 digests.
   - Otherwise, it is authenticated as an internal compact **HS256 JWT**. Malformed or invalid JWTs are rejected immediately (`401 Unauthorized`) and **never** fall through to legacy headers.
2. **Explicit API Token Header (`X-Conxian-Api-Token`)**: Evaluates `CONXIAN_API_TOKEN` directly.
3. **Legacy Header Order**: Evaluates `X-Admin-API-Key`, then `X-Service-Key`, then `X-External-Key`.

---

## CONXIAN_API_TOKEN Specification

`CONXIAN_API_TOKEN` instances feature structured prefixes, one-time raw secret display, SHA-256 hashed persistence, and timing-safe verification.

For complete details, see the [CONXIAN_API_TOKEN Architecture Specification](./architecture/CONXIAN_API_TOKEN_SPEC.md).

### Usage Example (Placeholder Token)

```bash
# Production token request (Simulated/Mock Data placeholder)
curl -H "Authorization: Bearer cx_live_<YOUR_API_TOKEN_ENTROPY>" \
  https://api.conxian-labs.com/api/v1/settlement-engine

# Or via explicit header
curl -H "X-Conxian-Api-Token: cx_live_<YOUR_API_TOKEN_ENTROPY>" \
  https://api.conxian-labs.com/api/v1/settlement-engine
```

---

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
