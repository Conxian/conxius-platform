# Conxian Platform: Gap Analysis & Technical Debt

This document outlines the current stubs, placeholders, and missing components identified during the full operational review.

## 1. Service Gaps

### Conxian Gateway
- **Status**: ✅ Functional Axum server implemented.
- **Implemented**:
    - Real authentication logic (JWT generation and validation middleware).
    - Proxy logic for Hiro API (v2/info mocked).
    - Swagger/OpenAPI documentation integrated via Utoipa.
- **Missing**:
    - Real Database integration (Postgres/Redis connection strings ready but no CRUD yet).
    - Full proxy logic for sovereign nodes (Bisq, RGB, BitVM).

### Sovereign Nodes
- **Status**: Disabled in `docker-compose.yml`.
- **Missing**:
    - Valid public images for `bisq/bisq-node`, `lncm/rgb-node`, and `conxian/bitvm-node`.
    - Configuration and orchestration for these nodes.

### Admin Dashboard
- **Status**: ✅ Consolidated into Conxian UI.
- **Implemented**: Admin page in UI with infrastructure monitoring and node status visualization.

## 2. Infrastructure & Operations

### Docker Orchestration
- **Status**: Functional but dependent on external images.
- **Issue**: Vulnerable to Docker Hub rate limits in CI/CD environments.
- **Recommendation**: Mirror essential images to a private registry (GCR/Artifact Registry).

### Benchmarking
- **Status**: Manual verification performed.
- **Missing**: Automated benchmark suite (KPIs: latency, throughput, TVL simulation).

## 3. Documentation

- **Status**: Improved.
- **Implemented**:
    - Detailed API documentation (Swagger/OpenAPI) available at `/swagger-ui` on the Gateway.
- **Missing**:
    - Deployment guides for GCP/Render.
    - Contributor guide for the Rust Core.

## 4. UI Polish (P0)
- **Status**: ✅ Resolved.
- **Fixed**:
    - Standardized design tokens for status colors (success, warning, error).
    - Removed design-token drift and hardcoded styling in ConnectWallet, Toast, Badge, etc.
    - Full transition to `conxian-mark-b.svg` completed.
