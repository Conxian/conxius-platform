# OpenSpec Proposal: Definitive Phase 6 Alignment & Gateway Repair

**Date**: 2026-05-05
**Author**: Jules (Agent)
**Status**: Implemented
**Scope**: Gateway Engine (`lib-conxian-core`), UI Dashboard (`conxian-ui`), System Documentation (`GAPS.md`, `SYSTEM_GRAPH.md`)

## 1. Problem Statement
Implementation drift between Phase 6 architectural documentation and the actual codebase has resulted in fragmented engine logic, missing UI components, and build failures.

## 2. Proposed Changes
- Consolidate AI Allocation, UBI, and Nexus State logic into the monolithic Gateway Engine.
- Restore all Phase 6 dashboard cards in the UI and align the API client.
- Update root-level documentation to reflect the resolved state.

## 3. Verification Results
- **Rust Build**: `cargo check` and `cargo test` pass for `conxian-gateway`.
- **UI Build**: `next build` passes for `conxian-ui`.
- **Visual Audit**: Playwright snapshots verify telemetry-driven dashboard alignment.
