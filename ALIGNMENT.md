# Conxian Labs: Unified Alignment Strategy

This document serves as the authoritative guide for aligning business logic, design, and authority across all Conxian Labs repositories.

## 1. Business Logic Alignment (The "Fusion")

- **Single Source of Truth**: The **Conxian Gateway** (within `lib-conxian-core`) is the unified entry point for all protocol state and sovereign services (Bisq, RGB, BitVM, Changelly).
- **Core Primitives**: All shared cryptographic and protocol logic resides in `lib-conxian-core`. No duplication of logic across clients.
- **Protocol State**: Clients (UI, Wallet) should interact with the Gateway for state monitoring and compliance pipes rather than raw contract RPC where possible.
- **Architecture Visualization**: See [SYSTEM_GRAPH.md](SYSTEM_GRAPH.md) for the full ecosystem mapping.
- **Interoperability**: Components are designed to be "Root-Up" compliant, following the Clarinet SDK and Vitest standards for reliable contract interactions.

## 2. Design Alignment (Earthy Corporate Finance)

- **Theme**: All interfaces (UI, Wallet, Admin) follow the **Tier0 light theme**.
- **Palette**: Professional, grounded, precise.
  - Primary: `#2E403B` (Forest Green)
  - Accent: `#D4A017` (Gold)
  - Background: `#F5F5F5` / `#FFFFFF`
  - Text: `#333333`
- **Typography**: Inter (Sans-serif) for professional clarity.
- **Assets**: Use `conxian-mark-b.svg` (outlined shield) as the canonical mark.
- **TUI Alignment**: Even terminal interfaces (StacksOrbit) utilize a compatible professional palette (e.g., warning orange, focused borders).

## 3. Authority Alignment (Sovereign Autonomous Business)

- **Orchestration**: `conxius-platform` is the master control center. Use it to spin up the entire ecosystem.
- **Secrets Management**: All sensitive keys must be provisioned via `scripts/provision-secrets.sh`. Zero-trust local development.
- **Deployment**: Unified deployment via Render (UI/Admin), GCP (Gateway/Core), and automated TUI tools (StacksOrbit).
- **Code is Law**: Decisions are encoded in Rust and Clarity. Human discretion is replaced by mathematical certainty.

## 4. Full Bitcoin Network Orientation

- **Bitcoin Anchoring**: All temporal logic is anchored to Bitcoin burn-block-height.
- **Sovereign Services**: Native integration with Bitcoin-adjacent protocols: Bisq (DEX), RGB (Smart Assets), BitVM (Computation), and Lightning (Payments).
- **L2 Synergy**: Leveraging Stacks (Nakamoto) as the primary smart contract layer with sBTC for Bitcoin liquidity.

## Repo-Specific Directives

- **Conxian_UI**: Use canonical components (`Button`, `Input`, `Card`). No design-token drift.
- **lib-conxian-core**: Maintain audit-ready Rust binaries and shared TypeScript libraries.
- **conxian-gateway**: Consolidate all sovereign service APIs into the Actix-web backend.
- **Conxian (Contracts)**: Maintain Nakamoto-readiness (Clarity 4) and Bitcoin-anchored height logic.
- **conxius-wallet**: Mobile enclave security following the "Fusion" gateway auth standards.
- **stacksorbit**: Provide secure, TUI-based deployment and monitoring following "Sentinel" security patterns.

## 📈 Business Model & Market Strategy
*This section defines the commercial logic that drives our technical architecture, based on 2026 market data.*

### Market Opportunity (TAM, SAM, SOM)
- **Total Addressable Market (TAM):** The global Bitcoin Layer 2 market, which has stabilized with over **$10 billion in Total Value Locked (TVL)** in 2026.
- **Serviceable Addressable Market (SAM):** The Stacks ecosystem, a leading Bitcoin L2 for smart contracts. As of early 2026, Stacks has a TVL of approximately **$130 million**.
- **Serviceable Obtainable Market (SOM):** Our realistic 24-month target. Aim to capture **10%** of the Stacks TVL and **5,000** active users.

### Alignment with Technical Strategy
- **Shared Core (`lib-conxian-core`):** Directly improves **Gross Margin** by reducing per-product development COGS.
- **Unified Gateway:** Enables tiered **Institutional API** revenue streams and simplifies compliance (OPEX efficiency).
- **Modular Design:** Allows us to adapt our **SAM/SOM** by rapidly deploying new, compliant financial primitives.

### References
- [1] Global Bitcoin L2 Market Analysis (2026).
- [2] DeFi Protocol Fee Benchmarks.
- [3] Lightning Network Operational Cost Study.
- [4] Infrastructure Provider Performance Metrics.
- [5] L2 Ecosystem Growth Projections (2025-2027).
- [6] Stacks Ecosystem Health Report (Early 2026).
- [7] Automated Market Maker Efficiency Reports.
- [8] Institutional DeFi Compliance Frameworks.
- [9] Cloud-Native Blockchain Infrastructure Benchmarking.
- [10] Digital Asset User Growth Trends.
