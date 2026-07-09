# Phase 7: Market Repository Integration Specification

This specification documents the integration framework and architectural constraints for the future `conxian-market` repository under the **Phase 7 Sovereign Computing redesign**.

## 1. Role & Classification
- **Primary Classification**: Support / Application rail.
- **Purpose**: High-efficiency, non-custodial liquidity orchestration, token swaps, and decentralized lending routing.
- **Downstream Consumer**: Integrated via the platform Backend-for-Frontend (BFF) topology at `/api/v1/liquidity/unified`.

## 2. Immutable Cryptographic & Security Constraints
The `market` repository must align strictly with our zero-trust, local-first paradigm:
1. **Zero-Custody Principle**:
   - The repository's services and smart contracts **must never take custody of customer funds** or maintain private keys.
   - It must merely prepare, structure, and serialize Partially Signed Bitcoin Transactions (PSBTs) or Stacks transaction payloads.
2. **Local-First Verification**:
   - Cryptographic validation must execute client-side utilizing the WebAssembly (Wasm) target built from `lib-conxian-core`.
3. **No Private/Generated Artifacts in Version Control**:
   - Strict `.gitignore` rules must prevent the tracking of `.env*`, `dist/`, `node_modules`, or build logs.
   - Local deployment keys must not be hardcoded; leverage SOPS (`sops-nix`) or declarative age files inside the `conxius-platform` control plane.

## 3. Platform & Control Plane Gating
Any build or release in the `market` repository is subject to centralized platform checks:
- **Hardened CI Baseline**: The repository must consume the centralized platform workflows:
  ```yaml
  jobs:
    ci:
      uses: Conxian/conxius-platform/.github/workflows/reusable-ci.yml@main
    secret-scan:
      uses: Conxian/conxius-platform/.github/workflows/reusable-secret-scan.yml@main
  ```
- **Deployment Manifest Enforcement**:
  - Direct deployments to production from raw CI are forbidden.
  - Releases must emit a deterministic `deployment-manifest.json` file which is verified by `conxius-platform` to produce a `verification-result.json` gate.

## 4. Workload Breakdown (Incremental Execution Phases)
To prevent organizational drift and keep delivery highly structured, the implementation of the `conxian-market` repository is broken down into four distinct execution phases:

### Phase 1: Core Scaffolding & Hygiene
- Establish repository skeleton.
- Commit authoritative `GOVERNANCE.md`, `CONTRIBUTING.md`, `SECURITY.md`, and `CODEOWNERS` referencing the parent model.
- Configure root `pnpm-workspace.yaml` and prohibit redundant local lockfile duplication to maintain a single source of truth.

### Phase 2: Interface & API Contracts
- Standardize the API/RPC boundary using strict JSON schemas or Protobuf inputs.
- Register all market-centric capability nodes in `conxius-platform/schemas/capabilities.json`.
- Implement initial tests using mock-free local validation harnesses.

### Phase 3: Non-Custodial Swap & Lending Routing
- Build the core routing adapters to construct PSBTs/Stacks transactions.
- Integrate validation logic with `lib-conxian-core`.
- Zero stubs policy: Return loud, predictable `not_implemented` errors for incomplete/unverified features to prevent false assertions of readiness.

### Phase 4: Production Gating & Release Promotion
- Apply standard tagging rules (`vX.Y.Z`).
- Configure Render blueprint integration aligned with our `conxius-platform` declarative NixOS/SOPS infrastructure.
- Complete audit readiness checks with third-party reviewers.

---
*Created per portfolio audit and strategic alignment session — July 9, 2026*
