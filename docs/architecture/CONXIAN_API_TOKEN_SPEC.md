# CONXIAN_API_TOKEN Specification & Org-Wide API Management Strategy

**Document Status**: Strategic Standard
**Target Version**: v0.2.5+
**Owner**: Conxian Engineering & Security Architecture
**Last Updated**: 2026-09-07

---

## 1. Executive Summary

This specification establishes the canonical **`CONXIAN_API_TOKEN`** standard across the Conxian ecosystem, including the `admin-dashboard` institutional platform, `conxian-gateway`, `conxian-nexus`, `admin-pulse-bos`, and developer SDKs (`elizaos-plugin-conxian`).

`CONXIAN_API_TOKEN` bridges machine-to-machine (M2M) server authentication and developer self-service API key management. It provides structured token prefixes (`cx_live_` and `cx_test_`), SHA-256 hashed persistence, fine-grained scope delegation, and timing-safe verification.

---

## 2. Token Anatomy & Format

All `CONXIAN_API_TOKEN` instances adhere to a strict, prefixed string format designed for instant secret detection and environment safety.

```
cx_<environment>_<entropy>
```

### Components

1. **Brand Prefix (`cx_`)**: Identifies the token as belonging to the Conxian platform.
2. **Environment Classifier (`live` or `test`)**:
   - `cx_live_`: Production / Mainnet operations. Grants access to production settlement engines and live node adapters.
   - `cx_test_`: Sandbox / Testnet / Devnet operations. Restricts state changes to simulated or devnet environments.
3. **High-Entropy Secret Payload**: 32 hex-encoded random bytes (64 hex characters) generated via cryptographically secure pseudo-random number generators (`crypto.randomBytes(32)` or `crypto.getRandomValues()`).

### Example Token Placeholders (Simulated Data)
- **Production Token Placeholder**: `cx_live_<64_hex_entropy_bytes>`
- **Testnet Token Placeholder**: `cx_test_<64_hex_entropy_bytes>`

---

## 3. Cryptographic Storage & Security Invariants

To prevent credential leakage in the event of database or telemetry compromise, raw `CONXIAN_API_TOKEN` values are **never stored in plaintext**.

### Storage Requirements
1. **One-Time Display**: The raw, unhashed token is returned **exactly once** to the client upon creation.
2. **SHA-256 Hash Digest**: Persistence stores the hex-encoded SHA-256 digest of the token:
   $$\text{stored\_hash} = \text{SHA-256}(\text{raw\_token})$$
3. **Masked Display Metadata**: Persistence stores a masked representation for dashboard display and auditing (e.g. `cx_live_...4d5e`).
4. **Timing-Safe Verification**: All token verification routines utilize constant-time comparison functions (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.

---

## 4. Header Precedence & Authentication Contract

Services accepting `CONXIAN_API_TOKEN` evaluate incoming request headers according to the following strict precedence order:

1. **Primary Bearer Authorization**: `Authorization: Bearer cx_live_<token>` or `Authorization: Bearer cx_test_<token>`
2. **Explicit Token Header**: `X-Conxian-Api-Token: cx_live_<token>`
3. **Legacy Headers**:
   - `X-Admin-API-Key` (Legacy environment variable `ADMIN_DASHBOARD_API_KEY`)
   - `X-Service-Key` (Legacy registry `X-Service-Key: <serviceId>:<secret>`)
   - `X-External-Key` (Legacy static scope map)

### Response Behavior
- **Valid Token with Sufficient Scopes**: `200 OK`
- **Invalid, Expired, or Revoked Token**: `401 Unauthorized` (`{"error": "Unauthorized"}`)
- **Valid Token with Insufficient Scopes**: `403 Forbidden` (`{"error": "Forbidden", "requiredScope": "..."}`)

---

## 5. Scope Delegation & Permission Matrix

Tokens are bounded by explicit scopes assigned during issuance. The current scope catalog includes:

| Scope | Category | Description |
|---|---|---|
| `read:admin` | Administrative | Read system state, M2M metadata, and health status |
| `write:admin` | Administrative | Create/rotate service keys, issue API tokens, update config |
| `read:metrics` | Observability | Access Prometheus `/api/metrics` and system telemetry |
| `read:telemetry` | Observability | Read UI/system telemetry events |
| `read:settlement` | Settlement Engine | Query BitVM, ZKCP, and USI settlement intents |
| `write:settlement` | Settlement Engine | Submit settlement intents, FROST signatures, and proofs |
| `read:governance` | Governance | View proposals, claims, and funded role history |
| `write:governance` | Governance | Submit governance votes and claim transitions |

---

## 6. Token Management Lifecycle Endpoints

The `admin-dashboard` service exposes a unified management endpoint at `/api/v1/m2m/tokens`:

### 1. List Active Tokens (`GET /api/v1/m2m/tokens`)
Requires `read:admin`. Returns metadata for all active/revoked tokens without revealing raw secrets.

### 2. Issue Token (`POST /api/v1/m2m/tokens`)
Requires `write:admin` (or `read:admin`). Accepts label, environment (`live` | `test`), scopes, and optional `ttlSeconds`. Returns the newly generated raw token **once**, alongside metadata.

### 3. Revoke Token (`DELETE /api/v1/m2m/tokens?id=<tokenId>`)
Requires `write:admin` (or `read:admin`). Immediately revokes the designated token.

---

## 7. Developer Experience (DX) & Ease of Use Enhancements

1. **Auto-Environment Detection**: Client SDKs (such as `elizaos-plugin-conxian`) automatically inspect the token prefix (`cx_live_` vs `cx_test_`) to select the appropriate base URL (`https://api.conxian-labs.com` vs `https://testnet.api.conxian-labs.com`).
2. **Secret Scanner Immunity**: Distinct prefixes (`cx_live_` and `cx_test_`) allow automated CI workflows (e.g. Gitleaks, GitHub Secret Scanning) to flag accidental commits of production tokens before PR merge.
3. **Zero-Downtime Key Rotation**: Developers can issue a secondary token, update their application configurations, and revoke the legacy token without service disruption.
