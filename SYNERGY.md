# Conxian Ecosystem Synergy

This document details the interconnected workflows and synergy between the various repositories under the Conxian organization.

## 1. The Core Loop
The primary flow of state and authority follows this hierarchy:
1.  **Conxian (Contracts)**: Defines the rules and state on-chain (Stacks/Bitcoin).
2.  **Conxian Gateway (in lib-conxian-core)**: Proxies, aggregates, and authenticates access to the on-chain state and sovereign nodes.
3.  **Conxian UI / Conxius Wallet**: Provide user-facing interfaces that consume the Gateway APIs for a unified experience.

## 2. Technical Synergies

### Gateway & Nexus (Glass Node)
- **Shared Primitives**: Both leverage `lib-conxian-core` for cryptographic verification and Merkle Tree logic.
- **State Proofs**: Gateway provides the API entry point, while Nexus (or the Nexus module within Core) provides the cryptographic proofs (Merkle roots) to verify state against Stacks L1.

### StacksOrbit & Conxian (Contracts)
- **Deployment Loop**: StacksOrbit is the specialized tool for deploying and monitoring the Conxian protocol suite.
- **Verification**: StacksOrbit uses the "Sentinel" pattern to ensure that secrets are never leaked during deployment and that contract interfaces are verified post-deploy.

### Wallet & Gateway
- **Mobile Enclave Auth**: The Conxius Wallet uses secure enclave storage to sign requests that are then validated by the Gateway's JWT/Auth middleware.
- **Institutional Bridge**: The Wallet allows retail users to access the same institutional-grade services (shielded payments, sBTC vaults) exposed by the Gateway.

## 3. Operational Synergy (conxius-platform)
The `conxius-platform` repository serves as the "Fusion" point where:
- **Environment Parity**: `provision-secrets.sh` ensures that local development matches production security requirements.
- **Orchestration**: Docker Compose spins up the UI, Gateway, and Postgres/Redis dependencies in a unified network (`conxian-network`).
- **Benchmarking**: Integrated scripts measure the performance of the entire stack, from contract execution to UI latency.

## 4. Vision Alignment: "Full Bitcoin Network Oriented"
The synergy is driven by a singular goal: **Making Bitcoin a productive asset.**
- **Contracts** focus on Bitcoin-anchored DeFi.
- **Gateway** connects to Bitcoin protocols (Bisq, RGB).
- **Wallet** secures Bitcoin L1 and L2 assets.
- **UI** simplifies the Bitcoin-native financial experience.
