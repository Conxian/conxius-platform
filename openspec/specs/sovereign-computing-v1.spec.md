# Specification: Sovereign Computing Platform V1 (Phase 6 / Phase 7 Transition)

**Status**: Canonical | **Supersedes**: `system-v2.spec.md` (Phase 5, deprecated)
**Last updated**: 2026-07-03 | **Phase**: 6 implementation, 7 transition

## 1. Overview

The Conxian Platform is a sovereign computing ecosystem anchored to Bitcoin.
Phase 6 delivered the foundational sovereign components; Phase 7 transitions
toward fully autonomous operation. This specification defines the canonical
architecture that replaces the centralized Phase 5 model.

### 1.1 Core Principles

- **Bitcoin Anchoring**: All economic finality derives from Bitcoin L1.
- **Sovereign Execution**: No centralized orchestration — components operate
  autonomously within cryptographically enforced boundaries.
- **Local-First**: Clients validate independently; the platform provides
  verifiable proofs, not authoritative state.
- **Declarative Infrastructure**: NixOS-defined, content-addressed, reproducible.

## 2. Component Architecture

### 2.1 Conxian Pulse

The event-driven heartbeat of the platform. Pulse monitors Bitcoin L1 and L2
state transitions, emitting structured events consumed by all downstream
components. It replaces the Phase 5 "Master Control Center" with a
non-authoritative observation layer.

- **Inputs**: Bitcoin mempool, L2 sequencer feeds, bridge events
- **Outputs**: `ShadowEvent` stream (block, transaction, bridge status)
- **Implementation**: `src/conxian_nexus/monitoring/shadow.py` (ShadowMonitor)
- **Adapters**: Citrea (`src/conxian_nexus/adapters/citrea.py`),
  Strata (`src/conxian_nexus/adapters/strata.py`)

### 2.2 Sovereign Financial Office (SFO)

The treasury and liquidity management component. SFO tracks cross-chain asset
positions, yield strategies, and institutional mandates. It operates on
verifiable on-chain data with no custodial control.

- **Implementation**: `services/admin-pulse-bos/src/SovereignFinancialOffice.tsx`
- **Capabilities**: Reserve tracking, yield harvesting, asset rebalancing
- **Boundary**: Read-only observation; never holds keys

### 2.3 Conxient AgentOps

Autonomous AI agent operations framework. Agents execute within defined
capability boundaries, interacting with the platform through the Gateway API.

- **Implementation**: `services/elizaos-plugin-conxian/`
- **Actions**: Cart checkout (x402), AI allocation, UBI identity, settlement
- **Boundary**: Agent keys never touch platform infrastructure

### 2.4 Universal Bitcoin Identity (UBI)

Self-sovereign identity anchored to Bitcoin addresses via BIP-322
signature verification. UBI provides the identity substrate for
governance voting, contributor claims, and institutional mandates.

- **Implementation**: `services/admin-dashboard/src/lib/support/bip322.ts`
- **Standards**: BIP-322 (generic signed messages), BIP-353 (DNS payment
  identifiers)

### 2.5 Admin Dashboard

The operational interface for platform management, governance, and monitoring.

- **Implementation**: `services/admin-dashboard/` (Next.js 15, React 19, Tailwind CSS 4)
- **Modules**: Governance voting, operator registry, deployment blueprints,
  settlement engine, FDC3 console, telemetry dashboards
- **Auth**: Admin API key via `validateAdminAuth` (CON-353)

## 3. Infrastructure Architecture

### 3.1 Gateway (lib-conxian-core)

The Rust-based core library serves as the canonical implementation of all
cryptographic operations and protocol logic. Compiles to both native and WASM
targets for consistent client/server validation.

### 3.2 NixOS Control Plane

Declarative, reproducible infrastructure defined in `flake.nix` and
`nixos/`. Integrates `nix-bitcoin` for Bitcoin node management and
`sops-nix` for secret encryption.

### 3.3 Monitoring & Observability

- **Prometheus**: Scrapes Gateway and Admin Dashboard metrics (15s intervals)
- **Alert Rules**: SIDL admin dashboard health, Bitcoin tx lifecycle states
- **Telemetry**: SIDL endpoint monitoring, usage validation instrumentation

## 4. Protocol Integration

| Protocol | Role | Adapter |
|---|---|---|
| Citrea | Type-2 zkEVM rollup, Clementine bridge | `conxian_nexus.adapters.citrea` |
| Strata | Validity rollup with privacy | `conxian_nexus.adapters.strata` |
| BitVM/BitVM2/BitVMX | Optimistic verification, multi-party challenges | `lib/support/bitvm*.ts` |
| RGB | Client-side validation, PSBT signing | Docker profile |
| Ark | v-UTXO protocol | `lib/support/ark.ts` |
| x402 | HTTP 402 payment protocol | `lib/sidl/x402.ts` |
| Nostr Wallet Connect | Lightning/ecash integration | `lib/support/nwc.ts` |
| ERC-7683 | Cross-chain solver selection | `lib/support/solver.ts` |

## 5. Security Boundaries

- **Key Isolation**: Platform infrastructure never holds application private keys
- **PSBT Signing**: Wallet signs; platform relays. No raw key material transits
  the Gateway.
- **Auth**: All admin endpoints use `validateAdminAuth` (X-Admin-API-Key header)
- **Fail-Closed**: Payment and bridge operations default to rejection on error
  (see `fail-closed-bos-payments-apar.spec.md`)
- **Production Boundary**: BOS components are guarded against contamination from
  non-production code (see `docs/PRODUCTION_BOUNDARY.md`)

## 6. Governance Integration

- **Three-Lane Model**: Governance Baseline → Live Issue-Execution → Historical
  Context (see `GOVERNANCE.md`)
- **OpenSpec-First**: All architectural changes require an OpenSpec proposal
- **Contributor Claims**: On-chain ledger for contribution tracking
  (see `contributor-claim-ledger-policy.spec.md`)

## 7. Migration from Phase 5

| Phase 5 (deprecated) | Phase 6/7 (current) |
|---|---|
| Master Control Center | Conxian Pulse (observation only) |
| Monolithic Gateway | Domain-specific BFF + lib-conxian-core WASM |
| MeshModule / NexusModule / ComplianceModule | Pulse / SFO / Conxient |
| IntentManager | Conxius Wallet (local-first TEE) |
| Imperative `provision-secrets.sh` | NixOS + sops-nix (declarative) |
| Centralized CI/CD Runner | NixOS-defined, content-addressed builds |

## 8. References

- `docs/architecture/SOVEREIGN_REPR_2026.md` — Full architectural analysis
- `docs/architecture/ALIGNMENT.md` — Implementation drift tracking
- `docs/INFORMATION_HIERARCHY.md` — Documentation model
- `docs/PRODUCTION_BOUNDARY.md` — Production safety constraints
- `GOVERNANCE.md` — Three-lane governance model
