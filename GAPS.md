# Conxian Platform: Gap Analysis & Technical Debt

This document outlines the current stubs, placeholders, and missing components identified during the full operational review.

## 1. Service Gaps

### Conxian Gateway
- **Status**: ✅ Functional Actix-web server implemented (Migrated from Axum for better ecosystem alignment).
- **Implemented**:
    - Real authentication logic (JWT validation middleware via `actix-web-httpauth`).
    - Unified API entry point for all sovereign services.
    - Hiro API Compatibility Layer (Status, Mempool, Balances, Contract Interfaces) for seamless UI integration.
    - Swagger/OpenAPI documentation integrated via Utoipa, available at `/swagger-ui/`.
- **Missing**:
    - Real Database integration (Postgres/Redis connection strings ready but CRUD logic is still stubs in Engine).
    - Full proxy logic for sovereign nodes (Currently returning simulated state).

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
- **Status**: ✅ Automated benchmark suite implemented in `scripts/run-benchmarks.sh`.
- **Capabilities**: Measures Gateway latency, build performance, and resource usage.

## 3. Documentation

- **Status**: Improved.
- **Implemented**:
    - Detailed API documentation (Swagger/OpenAPI) available at `/swagger-ui/` on the Gateway.
    - Deployment guides (Planned for `DEPLOYMENT.md`).
- **Missing**:
    - Contributor guide for the Rust Core (`CONTRIBUTING.md` planned).

## 4. UI Polish (P0)
- **Status**: ✅ Resolved.
- **Fixed**:
    - Standardized design tokens for status colors (success, warning, error).
    - Removed design-token drift and hardcoded styling in ConnectWallet, Toast, Badge, etc.
    - Full transition to `conxian-mark-b.svg` completed.
