# Market Analysis: Unified Bitcoin Wallet Infrastructure & SDKs

## 1. Overview
This document analyzes the current landscape of Bitcoin wallet infrastructure, routing SDKs, and custody abstractions, focusing on competitor positioning and integration friction.

## 2. Competitor Landscape

| Project | Focus | Key Strength | Integration Friction |
| :--- | :--- | :--- | :--- |
| **BDK (Bitcoin Dev Kit)** | On-chain (Descriptor-based) | Pure Rust, robust, backend agnostic | Descriptor complexity, PSBT coordination |
| **LDK (Lightning Dev Kit)** | Lightning Network | Highly modular, non-custodial | Liquidity management, node state storage |
| **Fedimint SDK** | Collaborative Custody (ecash) | Privacy, Wasm-native, multi-sig | Federation setup, experimental status |
| **VLS (Validating Signer)** | Security / Policy | Air-gapped signing logic | High implementation overhead, specialized use case |
| **Mutiny Wallet (VSS/LDK)** | Web-native UX | Instant setup via Wasm | Storage persistence (indexedDB), liquidity costs |

## 3. Integration Friction Points

### A. Technical Complexity
- **Descriptor Management**: Builders struggle with complex Output Descriptors and Miniscript.
- **PSBT Coordination**: Standardizing the flow between "Creator", "Updater", "Signer", and "Finalizer" remains brittle for multi-sig/hardware setups.
- **State Persistence**: Non-custodial wallets require reliable storage for peer state and channel backups, which is difficult in browser/mobile environments.

### B. Infrastructure Barriers
- **Backend Dependency**: Reliance on public Electrum/Esplora servers introduces privacy risks and downtime. Running full nodes is too heavy for most third-party developers.
- **Liquidity Onboarding**: The "Inbound Liquidity" problem remains the #1 barrier for new Lightning-enabled applications.

### C. Trust & Adoption Friction
- **"Experimental" Labels**: Most SDKs are still in alpha/beta, discouraging enterprise-grade implementations.
- **Custody Abstraction**: Developers find it hard to switch between non-custodial, hybrid, and federated models without complete rewrites.

## 4. Opportunity for Conxian
Conxian's **Backend-for-Frontend (BFF)** topology and **Nexus OS** provide a unique path by:
1. **Abstracting Complexity**: Moving the heavy lifting (descriptors, sync, routing) to a hardened BFF while the UI remains local-first via Wasm.
2. **Protocol Agnostic**: Providing a unified interface for L1 (Bitcoin), L2 (Lightning/Stacks), and Sidechains (Liquid/Rootstock).
3. **Verifiable State**: Using Nexus Glass Nodes to provide audit-grade evidence for off-chain state.
