# Phase 7 BFF Topology Scaffolding (CON-800 Alignment)

This document describes the Backend-for-Frontend (BFF) topology implemented in the Admin Dashboard to support sovereign, non-custodial operations.

## 1. Overview
The BFF layer acts as a lightweight coordination and caching surface between the Conxian UI/Wallet and the underlying protocol engines (Gateway, Nexus, Bitcoin L1/L2).

## 2. Core Components

### A. UI-BFF (`/api/v1/ui/telemetry`)
- **Role**: Aggregates service health and performance metrics for the Pulse dashboard.
- **Data Sources**: Gateway `/status`, Nexus sync state, and direct L2 node queries.
- **Enforcement**: Read-only, public-access (cached).

### B. Wallet-BFF (`/api/v1/wallet/psbt`)
- **Role**: Facilitates PSBT (Partially Signed Bitcoin Transaction) coordination for multi-sig institutional signing.
- **Workflow**:
  1. UI drafts a transaction intent.
  2. Wallet-BFF assembles the PSBT and returns it for signing.
  3. UI/Wallet signs and returns the PSBT.
  4. Wallet-BFF verifies attestations and prepares for broadcast via Gateway.
- **Security**: Requires `X-Admin-API-Key` for state-changing operations.

### C. Nostr-Proxy (`/api/v1/nostr/pl`)
- **Role**: Provides decentralized P&L telemetry using Nostr Event Kind 20626.
- **Benefit**: Enables institutional auditability without centralized dependencies.

## 3. Event Bus Delivery Runtime
Implemented in `services/admin-dashboard/src/lib/support/event-bus.ts`, the delivery runtime ensures:
- **Sequence Integrity**: Events are processed in strict order.
- **Retry Logic**: Automatic exponential backoff for failed deliveries.
- **Offset Tracking**: Persistent tracking of consumer progress.

## 4. Roadmap
- **Wasm Integration**: Transition PSBT assembly to client-side Wasm in `lib-conxian-core`.
- **NixOS Declarative Deployment**: Move BFF services to NixOS containers for hermetic isolation.

---
© 2026 Conxian Labs. Sovereign Autonomous Business.
