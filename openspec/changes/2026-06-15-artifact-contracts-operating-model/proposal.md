# OpenSpec Proposal: Repo-by-Repo Production Artifact Contracts

## 1. Abstract
This proposal defines the required release artifacts, publish destinations, and install verification paths for each production-relevant repository in the Conxian ecosystem, supporting CON-1204.

## 2. Artifact Definitions

### conxius-platform (Control Plane)
- **Artifact**: Git Tag + GitHub Release.
- **Publish Destination**: GitHub.
- **Verification Path**: `pnpm run check:lifecycle-control`.
- **Rollback**: Git revert + Tag move.

### admin-dashboard (BFF / UI)
- **Artifact**: Docker Image + Render Deployment.
- **Publish Destination**: Render / Docker Hub.
- **Verification Path**: `GET /api/v1/nexus/state`.
- **Rollback**: Render dashboard "Rollback to previous" button.

### conxian-gateway (Native Rust)
- **Artifact**: Wasm Binary + Native Binary.
- **Publish Destination**: GitHub Releases / internal registry.
- **Verification Path**: `gateway --version` + checksum verification.

## 3. Operating Model Alignment
- All production repos must have a protected `main` branch.
- No direct merges to `main` without passing CI gates and promotion evidence.

---
*Proposed by Jules (Sovereign Engineering Agent)*
