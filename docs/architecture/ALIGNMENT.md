# Conxian Labs: Unified Alignment Strategy

This document serves as the authoritative guide for aligning business logic, design, and authority across all Conxian Labs repositories.

**Note:** This project uses OpenSpec for specification-driven development. See
the [active OpenSpec changes](../../openspec/changes/) for current requirements
and designs. Archived changes are historical and are not active authority.

**Authority coordination:** Current documents contain conflicting Protocol,
Nexus, Gateway, and Platform authority statements. This document does not
resolve them; owner-level reconciliation remains deferred to issue
[#1167](https://github.com/Conxian/conxius-platform/issues/1167).

## 1. Business Logic Alignment (The "Fusion")

- **Gateway direction**: The **Conxian Gateway** is described as a target
  domain-specific Backend-for-Frontend (BFF) topology for routed services. Its
  exact authority relative to Protocol and Nexus remains deferred to #1167.
- **Core Primitives**: All shared cryptographic and protocol logic resides in `lib-conxian-core`. No duplication of logic across clients.
- **Protocol State**: Clients (UI, Wallet) interact with the Gateway for state monitoring and compliance pipes.
- **Interoperability**: Components are "Root-Up" compliant, following Clarinet SDK and Vitest standards.

## 2. Design Alignment (Sovereign Earthy v4.0)

- **Theme**: All interfaces follow the **Earthy Corporate Finance** theme (Professional Light).
- **Palette**: Forest Green (#2E403B), Nakamoto Gold (#D4A017), Ivory White (#F9FAFB).
- **Typography**: Outfit / Inter (Sans-serif) for high-fidelity readability.
- **Assets**: Canonical mark is `conxian-mark-b.svg`.

## 3. Authority Alignment (Sovereign Autonomous Business)

- **Orchestration target**: NixOS-driven declarative control is proposed, not a
  supported deployment surface in this repository.
- **Secrets target**: Decentralized secret management is proposed;
  `scripts/provision-secrets.sh` remains the current local helper.
- **Deployment boundary**: Render, GCP, and Conxius Orbit are external or target
  surfaces. This repository does not provide a unified production deployment.
- **Code is Law**: Decisions are encoded in Rust and Clarity.

- **Anchoring**: All temporal logic is anchored to Bitcoin burn-block-height (Nakamoto Consensus).
- **Sovereign Services**: Native integration with Bisq, RGB, BitVM, and Lightning.
- **L2 Synergy**: Utilizing Stacks L2 and sBTC for trustless liquidity.

## Repo-Specific Directives

- **conxius-platform**: Use canonical components; no token drift.
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
