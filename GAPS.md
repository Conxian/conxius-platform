# Conxius Platform: Gap Analysis & Technical Debt (Phase 6 baseline, Phase 7 transition)

This document tracks the resolution of gaps and identifies new technical requirements.

> **Status framing:** Sections marked as resolved capture a historical baseline snapshot (not a current release tag). Use [README.md](./README.md) for repository-role status, [Sovereign Computing Redesign (2026)](./docs/architecture/SOVEREIGN_REPR_2026.md) for architecture baseline, and [`openspec/changes/`](./openspec/changes/) for change-by-change implementation records.

## 1. Service Gaps (Resolved 2026-04-26)
### Agentic Orchestration & Auditability (Phase 6 Additive)
- **Status**: ✅ Production-Aligned (v0.2.2-aligned).
- **Implemented**:
  - **Read-First Agentic Surface**: MCP-compatible endpoints for system auditability (`/api/v1/mcp/tools`).
  - **Agent Intent Drafting**: Standardized payload drafting for autonomous financial maneuvers (`/api/v1/agent/intent/draft`).
  - **Execution Simulation**: Pre-execution cost and policy validation endpoint (`/api/v1/settlement/simulate`).
  - **Sovereign Handshake**: UI component for human-in-the-loop verification and signing of agent-drafted transactions.
  - **Deterministic Blueprints**: Agent-readable deployment metadata export from the admin dashboard.

### Conxian Gateway & Nexus (Phase 5 & 6 Core Alignment)
- **Status**: ✅ Production-Grade Orchestrator (v0.2.2-aligned).
- **Implemented & Audited**:
  - **Kwil Transactional State**: Full migration from Neon to Kwil as the backing store for Nexus Glass Node state and history (public API: `/api/v1/nexus/state`). Kwil adapter diagnostics: `/api/v1/kwil/info`.
  - **Self-Healing Nexus**: Autonomous reconciliation against on-chain checkpoints every 144 blocks (`/post /api/v1/nexus/reconcile`).
  - **Sovereign AI Allocation**: Real-time compute weighting and status monitoring (`/api/v1/ai/allocation`).
  - **Universal Bitcoin Identity (UBI)**: DID-linked sovereign identity management (address-scoped) (`/api/v1/identity/ubi/{address}`).
  - **Global Liquidity Mesh**: Active HTLC-based atomic swap orchestration with live telemetry (`/api/v1/mesh/swaps`).
  - **Decentralized Risk Oracle**: Multi-factor risk scoring enhancement in `get_risk_assessments`.
  - **BOS Supply-Chain Verification**: Deterministic manifest verification and L1 checkpointing (`/api/v1/bos/*`).
  - **Deterministic Commitment Window**: Repeatable and verifiable checkpoint selection logic (`/api/v1/bos/window`).
  - **Institutional Metrics**: Real-time Glassnode integration for Profit Ratio and Unrealized PnL tracking (`/api/v1/treasury/metrics`).
  - **Nexus Glass Node State**: Merkle root management and state sync endpoints.
  - **ALEX Readiness (Method B)**: Direct contract-call transaction construction for sovereign custody (`/api/v1/alex/*`).
  - **Structured Finance**: Ops Loans with Junior/Senior tranches and Guardian intent verification.
  - **BOS Invoicing**: Request Network integration for decentralized invoice management (`/api/v1/finance/invoices`).
  - **Offline-First POS**: TEE-cached transaction queue and local mesh gossip (Bluetooth/WiFi) for load-shedding resilience.

### UI/UX Standardization
- **Status**: ✅ Fully Aligned & Integrated.
- **Implemented**:
  - **Unified Core API Client**: Native support for all Gateway proprietary endpoints, including Phase 6 AI Allocation, UBI, ALEX Method B, and POS Sync.
  - **Real-time Telemetry**: `SystemStatus` component consumes high-fidelity Gateway telemetry.
  - **Sovereign Dashboard**: Integrated `AiAllocationCard`, `NexusSyncStatus`, `UbiIdentityCard`, `AlexMethodB`, `OpsLoansCard`, `PosSyncStatus`, `InstitutionalMetricsCard`, `TreasuryHandshake`, `FinanceInvoices`, `BosSupplyChain`, and `AutonomousOperations`.

## 2. Tooling Integration

- **Supabase**: Primary persistence for financial intelligence and off-chain reporting.
- **Neon**: Serverless Postgres for Nexus state history and high-concurrency event logs.
- **Render**: Production hosting for Conxian UI and peripheral microservices.
- **Stitch**: AI-driven UI design system used for rapid prototyping and theme enforcement.

## 3. Pending / Next Steps (Phase 7)
- ✅ **Cross-repo integration harness MVP (Issue #591)**: Added `.github/workflows/cross-repo-integration-mvp.yml` and `scripts/ci/run-cross-repo-harness-mvp.sh` to verify Gateway readiness, Nexus state-path coverage, x402 payment-header contracts, and local-first transition checks.
- Expansion of BitVM2 verification verifiers to 50+ nodes.
- Mainnet launch of the 5-5-5 Autonomous Referral Engine.
- Integration of jurisdictional sharding for ZAR-linked settlements (Guardian: Sovereignty).
- SAB-owned wallet architecture transition (DAO handoff).

## 4. Phase 7: Sovereign Redesign (2026-Q3 Target)
Following the "Sovereign Computing Redesign" audit, the following new gaps have been identified for the next generation of the platform:

### Orchestration & Infrastructure
- [ ] **Declarative NixOS Migration**: Deprecate Master Control Center and `provision-secrets.sh` in favor of NixOS/nix-bitcoin declarative state.
- [ ] **Decentralized Secret Management (DSM)**: Implement commit-and-reveal (F3B) or committee-based secret management to eliminate centralized trust anchors.

### Middleware (Gateway refactor)
- [ ] **BFF Topology**: Split monolithic Gateway into:
    - `UI-BFF`: High-throughput telemetry/caching.
    - `Wallet-BFF`: Hardened PSBT/Attestation pipe.
    - `Sovereign-Proxy`: Isolated internal routing.
- [ ] **Nexus OS**: Transition indexer to an IVC machine design for verifiable off-chain computation.

### Client & Protocol
- [ ] **Local-First UI**: Port state transition logic to Wasm `lib-conxian-core` for execution in the browser.
- [ ] **Micro-Frontend Federation**: Decompose `conxian-ui` into federated modules (DEX, BitVM, sBTC).
- [ ] **Lightning-RGB Bridge**: Native RGB asset mobility over Lightning channels.
