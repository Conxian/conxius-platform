# Conxius Admin Dashboard

This service is the internal backend/frontend orchestration layer for the Conxian platform. It provides real-time telemetry from the Unified Gateway Engine and allows for management of operational configurations.

## Status

**Active development.** Deployed to Render as an internal control-plane surface. Versioning follows the platform root `0.2.4` standard.

## Positioning

This service provides non-custodial administrative interfaces and orchestration logic; it does not take possession of customer funds.

## Purpose

Provide an internal administrative interface for monitoring platform health, managing institutional configurations, and orchestrating multidimensional operations.

## ⚠️ SECURITY WARNING

**This dashboard is for internal, local, or high-privilege administrative use only.**

- **Configuration Exposure**: The `/settings` page allows viewing and modifying institutional configurations (NPM, GCP, GitHub, etc.).
- **Access Control**: The management API requires a valid `ADMIN_DASHBOARD_API_KEY` for writing configurations. This should be used in conjunction with network-level isolation (e.g., VPN, mTLS) and local-only access where possible.
- **Environment Hygiene**: Use `.env.admin` for local development ONLY. This file is intentionally ignored by Git to prevent accidental leakage of institutional credentials.
- **Next.js Env Exposure**: Never store institutional secrets in `NEXT_PUBLIC_*` env vars and never read secrets from client-side code. Keep configuration access server-side only (Route Handlers / Server Components).

## 🔐 Security Hardening

To maintain the security of this platform:
1. **Local Only**: By default, run the dashboard on `localhost`.
2. **Template Usage**: Use `.env.admin.example` as a base for your local configuration.
3. **File Permissions**: For local persistence, restrict `.env.admin` to the current user (e.g., `chmod 600 .env.admin`).
4. **Audit Logs**: Future versions will include automated logging of all modifications to the Nexus Glass Node for auditability.
5. **Configuration Storage**: The dashboard currently saves settings to `.env.admin` for local persistence. In production environments, it is recommended to use a secure vault.

## Features

- **Infrastructure Pulse**: Real-time monitoring of Gateway health, Engine version, and request throughput.
- **Multidimensional Platform Pulse**: High-fidelity dashboard for Treasury (BTC/sBTC), AI Resource Allocation, L2 Settlements, and UBI Distribution.
- **Sovereign Financial Office (SFO)**: Integrated command center for fiscal orchestration, yield harvesting, and symmetry management.
- **Nexus "Glass Node" State**: Visibility into Merkle roots and synchronization status with Stacks L1.
- **Sovereign Services Tracking**: Real-time status monitoring for Stacks (L2), Bisq (P2P), RGB, BitVM, and Lightning Network via the UI-BFF Telemetry API.
- **Configuration Management**: Interface for provisioning institutional settings (accessible via `/settings`).
- **SIDL Audit Persistence**: Governance vote events/tallies and Cart Mandate checkout lifecycle state are persisted locally for restart durability and auditing.

## Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **UI Components**: Earthy Corporate Design System (Forest Green #2E403B, Nakamoto Gold #D4A017)

## ⚖️ Governance

- Follows [SECURITY.md](../../SECURITY.md) for reporting.
- Adheres to [CONTRIBUTING.md](../../CONTRIBUTING.md) monorepo guidelines.
- Complies with [CODEOWNERS](../../CODEOWNERS) service ownership.

---
© 2026 Conxian Labs. Sovereign Autonomous Business.
