# OpenSpec Proposal: Micro-Frontend Federation for Admin Dashboard

## 1. Abstract and Problem Statement
The Admin Dashboard is currently a monolithic Next.js application. As Phase 7 expands domain scope (BitVM monitoring, RGB asset management, settlement orchestration, AI allocation, governance, and institutional integrations), the monolith increases deployment bottlenecks, regression blast radius, and coordination friction.

This proposal defines a transition to a federated Micro-Frontend (MFE) architecture to improve scalability, local-first resilience, and independent delivery.

## 2. Motivation
A federated architecture enables:
- **Independent Release Cycles**: Ship updates to one domain (e.g., Liquidity Pulse or Settlement Engine) without full-dashboard revalidation.
- **Resilience**: Localized failures in one module do not crash the entire admin experience.
- **Local-First Development/Execution**: Teams can run and evolve individual MFEs in isolation.
- **Technology Agnosticism**: Select modules can evolve toward Rust/Wasm where heavy verification is required.

## 3. Proposed Architecture
### Key MFEs
- **Core-Shell**: Shared layout, navigation, authentication, and global orchestration.
- **Liquidity-Pulse**: Unified telemetry for BTC, sBTC, and L2 liquidity/yield.
- **Settlement-Engine**: USI intent drafting, cross-chain swap orchestration, and PSBT coordination.
- **Governance-Console**: DAO governance, treasury controls, and policy management.

### Technical Requirements
- **Framework**: Next.js with Webpack 5 Module Federation (or `@module-federation/nextjs-mf`) and/or Next.js Multi-Zones where route isolation is preferable.
- **Shared Library**: Common primitives and types from `@conxian/core-sdk`.
- **Cross-MFE Communication**: Custom Events or shared Redux/Zustand slices for global context (e.g., auth, active asset).

## 4. Implementation Path
1. Build an initial federation POC between Core-Shell and Liquidity-Pulse.
2. Use Next.js Multi-Zones for early route-level decomposition.
3. Introduce Module Federation for runtime component sharing across MFEs.
4. Establish shared CI gates for cross-MFE integration and regression control.
5. Migrate existing monolithic pages incrementally into federated zones.
6. Integrate Wasm-based verification modules where protocol-heavy logic benefits.

## 5. Verification and Testing
- Each MFE must maintain isolated unit/integration test coverage and a play-only/local mode.
- Shell-level integration tests validate orchestration across federated boundaries.
- Shared CI should enforce compatibility contracts between Core-Shell and domain MFEs.

## 6. Timeline
- **Q3 2026**: Core-Shell + Liquidity-Pulse federation prototype.
- **Q4 2026**: Full federation across the four primary modules.

---
*Proposed by Jules (Sovereign Engineering Agent)*
