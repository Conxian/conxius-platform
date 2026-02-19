# Conxian Platform: Gap Analysis & Technical Debt

This document outlines the current stubs, placeholders, and missing components identified during the full operational review.

## 1. Service Gaps

### Conxian Gateway
- **Status**: Basic functional stub (Axum).
-  **Missing**:
    - Real authentication logic (JWT validation).
    - Database integration (Postgres/Redis).
    - Proxy logic for sovereign nodes (Bisq, RGB, BitVM).
    - Full Hiro API compatibility (currently only status/mempool/info are mocked).

### Sovereign Nodes
- **Status**: Disabled in `docker-compose.yml`.
- **Missing**:
    - Valid public images for `bisq/bisq-node`, `lncm/rgb-node`, and `conxian/bitvm-node`.
    - Configuration and orchestration for these nodes.

### Admin Dashboard
- **Status**: Placeholder directory.
- **Missing**: All implementation. Logic is currently being consolidated into the Gateway.

## 2. Infrastructure & Operations

### Docker Orchestration
- **Status**: Functional but dependent on external images.
- **Issue**: Vulnerable to Docker Hub rate limits in CI/CD environments.
- **Recommendation**: Mirror essential images to a private registry (GCR/Artifact Registry).

### Benchmarking
- **Status**: Manual verification performed.
- **Missing**: Automated benchmark suite (KPIs: latency, throughput, TVL simulation).

## 3. Documentation

- **Status**: High-level alignment is good.
- **Missing**:
    - Detailed API documentation (Swagger/OpenAPI).
    - Deployment guides for GCP/Render.
    - Contributor guide for the Rust Core.

## 4. Next Steps for Sign-off
1.  Provision/Release public images for sovereign nodes.
2.  Implement the first "real" feature in the Gateway (e.g., Auth or simple DB CRUD).
3.  Implement the basic Admin Dashboard or officially deprecate it in favor of UI-integrated admin tools.

## 5. UI Polish (P0)
- **Status**: Mostly functional but has design-token drift.
- **Identified Drift**:
    - Use of `bg-paper` instead of `bg-background-paper`.
    - Use of `text-light` instead of theme tokens.
    - Hardcoded gray/white styling in several components (ConnectWallet, Toast, Badge, etc.).
    - Legacy raster branding still in use in some places (needs full transition to `conxian-mark-b.svg`).
