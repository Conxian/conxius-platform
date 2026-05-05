# Conxian Repository Taxonomy & Map

## 1. Flagship Repositories
These are the primary user-facing and orchestrator repositories.
- **Conxian/Conxian**: The master monorepo (Orchestrator).
- **conxius-platform**: Decentralized control plane and business unit orchestrator.
- **conxian-ui**: Primary web-based institutional dashboard.
- **conxius-wallet**: Mobile secure enclave for sovereign signing.

## 2. Infrastructure & Routing
- **lib-conxian-core**: Shared protocol primitives, Gateway, and institutional handlers.
- **conxian-nexus**: Glass Node / State Sync. Verified state root generation.
- **stacksorbit**: TUI Deployment and terminal monitoring tool.

## 3. Integration & Add-ons
- **elizaos-plugin-conxian**: Autonomous agent integration via ElizaOS.
- **admin-dashboard**: Internal telemetry and secret management dashboard.
- **admin-pulse-bos**: Experimental BOS orchestration surface (isolated).

## 4. Documentation & Site
- **conxian-labs-site**: Public-facing organization website.

## 5. Temporary Exceptions & Transitional States Register (Living)
This register tracks repository states that intentionally diverge from the target sovereign architecture while migration or restructuring work is in progress.

Update this table when an exception is added, re-scoped, or closed. Keep entries factual and linked to an existing tracked artifact.

| Repository | Owner | Type / Status | Rationale (documented) | Intended end state | Review timing | Tracking reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `conxius-platform` | `Conxian` | Transitional architecture migration (in progress) | `SYSTEM_GRAPH.md` and Phase 7 planning document migration away from centralized orchestration and imperative secret provisioning toward declarative infrastructure. | Operate as declarative NixOS control plane (no master orchestrator role). | Phase 7 Sovereign Redesign (`2026-Q3` target). | `CON-556`; `GAPS.md` §4 |
| `conxian-ui` | `Conxian` | Transitional restructuring + workspace exception (in progress) | Phase 7 defines migration to local-first micro-frontend federation. `CONTRIBUTING.md` also records a temporary workspace exclusion to avoid lockfile churn when submodule is initialized locally. | Federated local-first UI modules with normalized workspace integration. | Phase 7 Sovereign Redesign (`2026-Q3` target); workspace-normalization timing `TBD`. | `GAPS.md` §4; `docs/architecture/SOVEREIGN_REPR_2026.md`; `CONTRIBUTING.md` note |
| `admin-dashboard` | `Conxian` | Transitional client-layer restructuring (planned/in progress) | Architecture redesign requires Admin Dashboard migration away from cloud-hosted monolithic structure to local-first model. | Local-first modular Admin Dashboard aligned to BFF topology. | Phase 7 Sovereign Redesign (`2026-Q3` target). | `docs/architecture/SOVEREIGN_REPR_2026.md`; `GAPS.md` §4 |
| `lib-conxian-core` | `Conxian` | Transitional protocol standardization (planned/in progress) | Redesign defines this repository as shared source of truth for cryptographic/protocol logic, compiled to Wasm for client and middleware reuse. | Unified shared primitives/Wasm SDK across UI, wallet, and BFF components. | Phase 7 Sovereign Redesign (`2026-Q3` target). | `docs/architecture/SOVEREIGN_REPR_2026.md`; `GAPS.md` §4 |
| `conxian-nexus` | `Conxian` | Transitional indexer redesign (planned) | Phase 7 tracks Nexus transition from current indexer role to IVC-based Nexus OS design. | Nexus OS / IVC-driven verifiable off-chain computation interface. | Phase 7 Sovereign Redesign (`2026-Q3` target). | `GAPS.md` §4; `SYSTEM_GRAPH.md` repository roles |
| `admin-pulse-bos` | `Conxian` | Intentional dev-only exception (active) | Explicitly designated as dev-only and excluded from production boundary wiring. | Remain isolated from production unless production-boundary policy is explicitly revised. | `TBD` (review cadence not yet documented). | `docs/PRODUCTION_BOUNDARY.md` (Dev-only surfaces) |
| `TBD` (visibility-boundary scope) | `TBD` | Documentation gap for repository-level visibility exceptions | `CON-324` records visibility-boundary audit completion, but current docs do not enumerate repository-by-repository visibility decisions for ongoing review. | Replace this row with repository-specific visibility entries once documented. | `TBD` | `docs/FINAL_ALIGNMENT_REPORT.md` (`CON-324`) |
