# Phase 7 BFF Topology Scaffolding (CON-800 Alignment)

This document describes the Backend-for-Frontend (BFF) topology implemented in the Admin Dashboard to support sovereign, non-custodial operations.

## 1. Overview
The BFF layer acts as a lightweight coordination and caching surface between the Conxian UI/Wallet and the underlying protocol engines (Gateway, Nexus, Bitcoin L1/L2).

## 2. Core Components

### A. UI-BFF (`/api/v1/ui/telemetry`)
- **Role**: Aggregates service health and performance metrics for the Pulse dashboard.
- **Data Sources**: Gateway `/status`, Nexus sync state, and direct L2 node queries.
- **Readiness Signals**: Includes USI, Nexus OS (IVC), and MFE federation status.
- **Enforcement**: Read-only, public-access (cached).

### B. Wallet-BFF (`/api/v1/wallet/psbt`)
- **Role**: Facilitates PSBT (Partially Signed Bitcoin Transaction) coordination for multi-sig institutional signing and USI intents.
- **Workflow**:
  1. UI drafts a transaction intent (e.g., `usi-settlement`).
  2. Wallet-BFF assembles the PSBT and returns it for signing, along with any required IVC proofs.
  3. UI/Wallet signs and returns the PSBT.
  4. Wallet-BFF verifies attestations and prepares for broadcast via Gateway.
- **Security**: Requires `X-Admin-API-Key` for state-changing operations.

### C. Settlement-Engine-BFF (`/api/v1/settlement-engine`)
- **Role**: Orchestrates multi-step cross-chain settlement jobs.
- **Job Types**: Bitcoin-Lock, Stacks-Mint, RGB-Transfer.
- **Security**: Authenticated via management API key.

### D. Governance-Console-BFF (`/api/v1/governance-console`)
- **Role**: Interface for protocol governance and multi-sig treasury control.
- **Capabilities**: Proposal tracking, threshold signing coordination.

### E. Nostr-Proxy (`/api/v1/nostr/pl`)
- **Role**: Provides decentralized P&L telemetry using Nostr Event Kind 20626.
- **Benefit**: Enables institutional auditability without centralized dependencies.

## 3. Event Bus Delivery Runtime
Implemented in `services/admin-dashboard/src/lib/support/event-bus.ts`, the delivery runtime ensures:
- **Sequence Integrity**: Events are processed in strict order.
- **Retry Logic**: Automatic exponential backoff for failed deliveries.
- **Offset Tracking**: Persistent tracking of consumer progress.
- **USI Integration**: Tracks the lifecycle of cross-chain settlement jobs.

## 4. Roadmap
- **Wasm Integration**: Transition PSBT assembly to client-side Wasm in `lib-conxian-core`.
- **MFE Federation**: Decompose the dashboard into independent zones (Core, Pulse, Engine, Console).
- **NixOS Declarative Deployment**: Move BFF services to NixOS containers for hermetic isolation.

---
© 2026 Conxian Labs. Sovereign Autonomous Business.
