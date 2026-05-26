# Conxian Ecosystem Synergy

This document details the interconnected workflows and synergy between the various repositories under the Conxian organization.

> **Scope note:** This file documents cross-repository interaction patterns. For current execution status, use [README.md](./README.md) and [GAPS.md](./GAPS.md). For architecture baseline, use [Sovereign Computing Redesign (2026)](./docs/architecture/SOVEREIGN_REPR_2026.md).

## 1. The Core Loop (Phase 5 baseline; referenced during Phase 7 transition)
The primary flow of state and authority follows this hierarchy:
1.  **Conxian (Contracts)**: Defines on-chain state; now anchored to Nakamoto/sBTC logic.
2.  **Conxian Gateway (Middleware)**: The **Unified Orchestrator**. Implements the Global Liquidity Mesh, Risk Oracle, and Nexus state synchronization.
3.  **Conxian UI / Wallet (Clients)**: Standardized interfaces consuming Gateway APIs for real-time mesh telemetry and compliance.

## 2. Technical Synergies

### Gateway & Nexus (The Glass Node)
- **State Proofs**: The Gateway exposes Nexus-derived Merkle proofs (\`/api/v1/nexus/state\`) to verify off-chain transactions against Stacks L1.
- **ZK-Verification**: Direct integration with bellman-based ZKP verification for privacy-preserving compliance.

### Global Liquidity Mesh
- **Atomic Mobility**: Seamlessly moving BTC value between Stacks, Liquid, and Rootstock via HTLCs managed by the Gateway's MeshModule.
- **Mesh Telemetry**: Live swap tracking available via the Gateway (\`/api/v1/mesh/swaps\`) and visualized in the UI.

### Enclave Security
- **Intent Signing**: Conxius Wallet signs intents in a mobile secure enclave; Gateway verifies these signatures before dispatching to the Mesh or Contracts.

## 3. Operational Synergy (conxius-platform)
- **Spec-Driven Design**: Using **OpenSpec** to ensure that every code change is aligned with the unified proposal, specs, and design artifacts.
- **Unified Deployment**: Docker Compose orchestrates the entire stack, while GCP/Render handle production scaling for the Gateway and UI respectively.

## 4. Vision Alignment: "Full Bitcoin Network Oriented"
The synergy is driven by a singular goal: **Making Bitcoin a productive asset.**
- **Contracts** focus on Bitcoin-anchored DeFi.
- **Gateway** orchestrates cross-chain mobility and verification.
- **Wallet** secures local private keys and enclave intents.
- **UI** provides high-fidelity visibility into the global Bitcoin ecosystem.
