# Conxian Labs: Unified Alignment Strategy

This document serves as the authoritative guide for aligning business logic, design, and authority across all Conxian Labs repositories.

## 1. Business Logic Alignment (The "Fusion")

- **Single Source of Truth**: The **Conxian Gateway** is the unified entry point for all protocol state and sovereign services (Bisq, RGB, BitVM, Changelly).
- **Core Primitives**: All shared cryptographic and protocol logic resides in `lib-conxian-core`. No duplication of logic across clients.
- **Protocol State**: Clients (UI, Wallet) should interact with the Gateway for state monitoring and compliance pipes rather than raw contract RPC where possible.

## 2. Design Alignment (Earthy Corporate Finance)

- **Theme**: All interfaces follow the **Tier0 light theme**.
- **Palette**: Professional, grounded, precise.
  - Primary: `#2E403B` (Forest Green)
  - Accent: `#D4A017` (Gold)
  - Background: `#F5F5F5` / `#FFFFFF`
  - Text: `#333333`
- **Typography**: Inter (Sans-serif) for professional clarity.
- **Assets**: Use `conxian-mark-b.svg` (outlined shield) as the canonical mark.

## 3. Authority Alignment (Sovereign Autonomous Business)

- **Orchestration**: `conxius-platform` is the master control center. Use it to spin up the entire ecosystem.
- **Secrets Management**: All sensitive keys must be provisioned via `scripts/provision-secrets.sh`. Zero-trust local development.
- **Deployment**: Unified deployment via Render (UI/Admin) and GCP (Gateway/Core).
- **Code is Law**: Decisions are encoded in Rust and Clarity. Human discretion is replaced by mathematical certainty.

## Repo-Specific Directives

- **Conxian_UI**: Use canonical components (`Button`, `Input`, `Card`). No design-token drift.
- **lib-conxian-core**: Maintain audit-ready Rust binaries and shared TypeScript libraries.
- **conxian-gateway**: Consolidate all sovereign service APIs.

## 4. Resource Registry

- **Conxius Wallet**: Sovereign Android Vault.
- **Conxian Finance**: Stacks-native DeFi engine.
- **Conxian Gateway**: Unified institutional backend.
- **Conxian Nexus**: API bridge for legacy integrations.
- **lib-conxian-core**: Shared crypto/protocol primitives.

## 📈 Business Model & Market Strategy
*This section defines the commercial logic that drives our technical architecture, based on 2026 market data.*

### Market Opportunity (TAM, SAM, SOM)
- **Total Addressable Market (TAM):** The global Bitcoin Layer 2 market, which has stabilized with over **$10 billion in Total Value Locked (TVL)** in 2026 [citation:1]. This represents the vast pool of Bitcoin capital seeking productive yield.
- **Serviceable Addressable Market (SAM):** The Stacks ecosystem, a leading Bitcoin L2 for smart contracts. As of early 2026, Stacks has a TVL of approximately **$130 million** and growing demand, evidenced by a futures Open Interest of **$27.8 million** [citation:6].
- **Serviceable Obtainable Market (SOM):** Our realistic 24-month target. Aligned with sector growth rates of 300-500% for L2s and 40% for DeFi users [citation:5][citation:10], we aim to capture **10%** of the Stacks TVL and **5,000** active users, projecting an initial revenue opportunity of **$1.5 million**.

### Financial Drivers (COGS, OPEX, EBITDA)
- **Revenue Streams:**
    - **Protocol Fees (Conxian Finance):** Modeled on standard DeFi fees (e.g., **0.3% per swap**) or variable fees (e.g., **4 bps**) for automated operations [citation:2][citation:7].
    - **Premium Features (Conxius Wallet):** Freemium model with paid tiers for advanced features, leveraging the Lightning Network's near-zero marginal cost per transaction [citation:3].
    - **Institutional API (Conxian Gateway):** Tiered subscriptions, potentially exploring "pay-per-request" models with instant stablecoin settlement, or fixed "wholesale" rates (e.g., **$1 per billion Compute Units**) for high-volume access [citation:4][citation:9].
- **Cost of Goods Sold (COGS):** Direct costs = RPC node infrastructure (benchmarked at **$1 per billion compute units** [citation:4]), cloud hosting, and security audits. The Lightning Network's low fees make micro-transaction COGS negligible [citation:3].
- **EBITDA Path:** With Bitcoin L2s generating **12–18% APR** on BTC [citation:1], our protocol fee capture on this yield provides a clear path to profitability. We project reaching monthly EBITDA positivity upon achieving **$100,000 in MRR from Gateway or $20 million in TVL on Finance**.

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
