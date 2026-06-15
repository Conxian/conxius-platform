# Full Stack Bitcoin Research (Phase 7 Roadmap)

This document summarizes the research into the components required to achieve a "Full Bitcoin Stack" within the Conxian ecosystem.

## 1. RGB over Lightning
- **Concept**: Utilizing the Lightning Network as a transport and state-transition layer for RGB assets.
- **Benefits**: Enables private, high-throughput smart contracts on Bitcoin without bloating the L1.
- **Reference**: Iris Wallet patterns, RGB Daemon (Broker/Dispatcher model).
- **Status**: Research lane (Partner integration).

## 2. BitVM Bridge (BBN)
- **Concept**: Optimistic verification for trustless Bitcoin bridges.
- **Components**:
  - **Bridge App**: Peg-in/Peg-out interactions.
  - **Bridge Explorer**: Off-chain verification visibility.
  - **Bridge Dashboard**: Operational metrics.
- **Status**: Active scaffolding in UI-BFF and Wallet-BFF.

## 3. IVC-based Execution Layers (Nexus OS)
- **Concept**: Transitioning Nexus from a passive indexer to an Incrementally Verifiable Computation (IVC) machine.
- **Goal**: ZK-verifiable off-chain orchestration with rapid settlement.
- **Status**: Conceptual redesign (Nakamoto-Style integrity).

## 4. Decentralized Secret Management (DSM)
- **Concept**: Commit-and-reveal schemes (F3B architecture) to neutralize MEV and front-running on Stacks DEX Factory V2.
- **Mechanism**: Local encryption of transaction intents with committee-held decryption keys.

---
*Maintained by Jules (Sovereign Engineering Agent)*

## 5. SDK and Library Alignment (CON-1178)
- **Stacks JS**: Mostly converged on v7.4.x. Focus on bit-for-bit parity via Wasm.
- **Clarinet SDK**: Integration with Conxius Orbit for contract testing.
- **Enclave SDK**: Hardware-backed signing (StrongBox) for mobile/desktop.

## 6. Workflow Resilience
- **Fail-Closed Logic**: CI gates now enforce security and hygiene checks before any promotion.
- **Paths-Ignore**: Optimized to prevent documentation noise from blocking releases.
- **Self-Hosted Runners**: Transitioned to avoid external billing dependencies and increase execution speed.

## 7. Future Improvement Proposals
- **Wasm-First Gateway**: Transitioning performance-critical logic from Rust to Wasm for universal execution.
- **NixOS Declarative Control**: Moving from bash-based secret provisioning to SOPS/Nix for hermetic infrastructure.

---
*End of Research Update - June 2026*

## 8. Peer-Reviewed Foundations & Standards
- **FDC3 (Financial Desktop Connectivity and Collaboration Consortium)**:
  - Alignment for Conxian Gateway and UI to standard financial desktop contexts (Instrument, Contact).
  - Enables interoperability with Bloomberg Terminal, Symphony, and other institutional tools.
- **ISO 20022 Alignment**:
  - Bridging CJCS (Conxian Job Card Schema) to pacs.008/009 messages for tradfi integration.
- **BIP-174 (PSBT)**:
  - The core foundation for Wallet-BFF and multi-sig coordination.
- **Kind 20626 (Nostr P&L)**:
  - Leveraging the Nostr protocol for decentralized, censorship-resistant operational reporting.

## 9. Library Ecosystem
- **Stacks.js (v7.4+)**: Primary interface for Nakamoto-ready L2 interactions.
- **Iris Wallet / RGB-lib**: Patterns for client-side validation and Lightning integration.
- **Safe{Core} SDK**: Reference for multi-sig intent drafting and human-in-the-loop approvals.
- **Request Network SDK**: Basis for decentralized invoicing and payment tracking (BOS integration).

---
*Updated by Jules (Sovereign Engineering Agent) - 2026-06-14*
