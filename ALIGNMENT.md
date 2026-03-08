# Conxian Labs: Unified Alignment Strategy

This document serves as the authoritative guide for aligning business logic, design, and authority across all Conxian Labs repositories.

**Note: This project utilizes the OpenSpec framework for specification-driven development. For detailed requirements and designs, see [openspec/changes/system-alignment-v2/](openspec/changes/system-alignment-v2/).**

## 1. Business Logic Alignment (The "Fusion")

- **Single Source of Truth**: The **Conxian Gateway** (within `lib-conxian-core`) is the unified entry point for all protocol state and sovereign services (Bisq, RGB, BitVM, Changelly).
- **Core Primitives**: All shared cryptographic and protocol logic resides in `lib-conxian-core`. No duplication of logic across clients.
- **Protocol State**: Clients (UI, Wallet) interact with the Gateway for state monitoring and compliance pipes.
- **Interoperability**: Components are "Root-Up" compliant, following Clarinet SDK and Vitest standards.

## 2. Design Alignment (Earthy Corporate Finance)

- **Theme**: All interfaces follow the **Tier0 light theme**.
- **Palette**: Forest Green (#2E403B), Gold (#D4A017), Professional Background (#F5F5F5).
- **Typography**: Inter (Sans-serif).
- **Assets**: Canonical mark is `conxian-mark-b.svg`.

## 3. Authority Alignment (Sovereign Autonomous Business)

- **Orchestration**: `conxius-platform` is the master control center.
- **Secrets**: Provisioned via `scripts/provision-secrets.sh`.
- **Deployment**: Unified via Render (UI), GCP (Gateway), and StacksOrbit (TUI).
- **Code is Law**: Decisions are encoded in Rust and Clarity.

## 4. Full Bitcoin Network Orientation

- **Anchoring**: All temporal logic is anchored to Bitcoin burn-block-height.
- **Sovereign Services**: Native integration with Bisq, RGB, BitVM, and Lightning.
- **L2 Synergy**: Leveraging Stacks (Nakamoto) and sBTC for liquidity.

## Repo-Specific Directives

- **Conxian_UI**: Use canonical components; no token drift.
- **lib-conxian-core**: Maintain audit-ready Rust binaries and shared TypeScript libraries.
- **conxian-gateway**: Consolidate all sovereign service APIs.
- **Conxian (Contracts)**: Nakamoto-readiness (Clarity 4).

## 📈 Business Model & Market Strategy
- **TAM:** $10B (Global Bitcoin L2, 2026).
- **SAM:** $130M (Stacks TVL).
- **SOM:** 10% of Stacks TVL within 24 months.
