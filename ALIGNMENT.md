# Conxian Labs: Unified Alignment Strategy

This document serves as the authoritative guide for aligning business logic, design, and authority across all Conxian Labs repositories.

**Note: This project utilizes the OpenSpec framework for specification-driven development. For detailed requirements and designs, see [openspec/changes/system-alignment-v2/](openspec/changes/system-alignment-v2/).**

## 1. Business Logic Alignment (The "Fusion")

- **Single Source of Truth**: The **Conxian Gateway** is being refactored into a domain-specific Backend-for-Frontend (BFF) topology for all protocol state and sovereign services (Bisq, RGB, BitVM, Changelly).
- **Core Primitives**: All shared cryptographic and protocol logic resides in `lib-conxian-core`. No duplication of logic across clients.
- **Protocol State**: Clients (UI, Wallet) interact with the Gateway for state monitoring and compliance pipes.
- **Interoperability**: Components are "Root-Up" compliant, following Clarinet SDK and Vitest standards.

## 2. Design Alignment (Sovereign Earthy v4.0)

- **Theme**: All interfaces follow the **Earthy Corporate Finance** theme (Professional Light).
- **Palette**: Forest Green (#2E403B), Nakamoto Gold (#D4A017), Ivory White (#F9FAFB).
- **Typography**: Outfit / Inter (Sans-serif) for high-fidelity readability.
- **Assets**: Canonical mark is `conxian-mark-b.svg`.

## 3. Authority Alignment (Sovereign Autonomous Business)

- **Orchestration**: `conxius-platform` is transitioning to a NixOS-driven declarative control plane.
- **Secrets**: Moving toward decentralized secret management (DSM); `provision-secrets.sh` is deprecated.
- **Deployment**: Unified via Render (Pulse), GCP (Sovereign Service), and Conxius Orbit (legacy: StacksOrbit) (TUI).
- **Code is Law**: Decisions are encoded in Rust and Clarity.

- **Anchoring**: All temporal logic is anchored to Bitcoin burn-block-height (Nakamoto Consensus).
- **Sovereign Services**: Native integration with Bisq, RGB, BitVM, and Lightning.
- **L2 Synergy**: Utilizing Stacks L2 and sBTC for trustless liquidity.

## Repo-Specific Directives

- **Conxian_UI**: Use canonical components; no token drift.
- **lib-conxian-core**: Maintain audit-ready Rust binaries and shared TypeScript libraries.
- **conxian-gateway**: Consolidate all sovereign service APIs.
- **Conxian (Contracts)**: Nakamoto-readiness (Clarity 4).

## 📈 Business Model & Market Strategy

- **TAM:** $10B (Global Bitcoin L2, 2026).
- **SAM:** $130M (Stacks TVL).
- **SOM:** 10% of Stacks TVL within 24 months.

- **Umbrella Products**:
  - **Nexus**: The authoritative Glass Node.
  - **Conxius**: Sovereign Mobile Identity.
  - **Conclave**: ZK/TEE Enclave SDK.
  - **Conxius Orbit**: Managed Stacks Infrastructure.
  - **SYI**: Sovereign Yield Index.
  - **BOS**: Sovereign Business Operations System.
