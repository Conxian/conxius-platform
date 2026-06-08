# Conxius Repository Taxonomy (2026 Revision)

This document defines the roles, boundaries, and authoritative sources of truth for the repositories within the Conxian ecosystem.

## 1. Primary Repositories

### conxius-platform (Authoritative Monorepo)
- **Role**: Platform orchestration, control-plane scaffolding, and multidimensional environment management.
- **Scope**: Deployment blueprints, maintenance scripts, service integration, and platform-wide documentation.
- **Active Services**: `admin-dashboard`, `admin-pulse-bos`, `elizaos-plugin-conxian`.

### conxian-ui (Externalized)
- **Role**: Client-facing user interface for the Conxian protocol.
- **Scope**: User dashboards, wallet integration, and DeFi interaction surfaces.

### conxian-gateway (Externalized)
- **Role**: Authoritative protocol engine and settlement orchestrator.
- **Scope**: Rust-based Gateway logic, Mesh networking, and compliance enforcement.

### conxian-nexus (Externalized)
- **Role**: Decentralized state anchor and Glass Node.
- **Scope**: Merkle root management, L1/L2 synchronization, and immutable audit logs.

## 2. Ownership & Governance
Ownership is defined via `CODEOWNERS` files in each repository. Cross-repo alignment is maintained via the **OpenSpec** process and verified by the **Automated Test Suite (ATS)**.

## 3. Implementation Standards
- All services must include `README.md`, `LICENSE`, and `SECURITY.md`.
- Identity follows the `ubi:btc:{id}` standard.
- Telemetry utilizes Nostr Kind 20626 for P&L and Kind 20627 for operational pulses.

---
© 2026 Conxian Labs.
