# Tasks: System Alignment V2

## Phase 1: Artifact Alignment
- [x] Update ALIGNMENT.md to reference OpenSpec artifacts as the primary source of truth.
- [x] Revise WHITEPAPER.md to include Phase 5 "Global Liquidity Mesh" technical details.
- [x] Refactor PRD.md to align with the new Module/Submodule definitions.
- [x] Update AGENTS.md for OpenSpec and Phase 5 alignment.
- [x] Update SYNERGY.md for refined Core Loop and Mesh details.

## Phase 2: Gateway Remediation
- [x] Replace simulated values in `gateway/src/engine/mod.rs` with persistent state placeholders and version 0.1.1.
- [x] Implement the missing `/api/v1/compliance/mvcr` handler in the API layer.
- [x] Implement `/api/v1/nexus/state` and `/api/v1/mesh/swaps` endpoints.
- [x] Standardize all Bitcoin layer risk assessments in the Engine.

## Phase 3: UI Alignment
- [x] Verify `conxian-ui/src/lib/coreApi.ts` implements all Phase 5 endpoints (SystemInfo, Layers, RiskProof, NexusState, MeshSwaps).
- [x] Update `StatusIndicator` components to handle all new status types (e.g., 'mesh_active', 'proof_verified').
- [x] Audit `NetworkPage` to ensure all Bitcoin layers are displayed with correct trust models.
