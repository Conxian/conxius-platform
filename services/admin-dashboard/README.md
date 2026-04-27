# Conxius Admin Dashboard

This service is the internal backend/frontend orchestration layer for the Conxian platform. It provides real-time telemetry from the Unified Gateway Engine and allows for management of operational configurations.

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
- **Nexus "Glass Node" State**: Visibility into Merkle roots and synchronization status with Stacks L1.
- **Sovereign Services Tracking**: Status monitoring for Stacks (L2), Bisq (P2P), RGB, BitVM, and Lightning Network.
- **Configuration Management**: Interface for provisioning institutional settings (accessible via `/settings`).
- **SIDL Audit Persistence**: Governance vote events/tallies and Cart Mandate checkout lifecycle state are persisted locally for restart durability and auditing.

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript

## ⚖️ Governance

- Follows [SECURITY.md](../../SECURITY.md) for reporting.
- Adheres to [CONTRIBUTING.md](../../CONTRIBUTING.md) monorepo guidelines.
- Complies with [CODEOWNERS](../../CODEOWNERS) service ownership.

---
© 2026 Conxian Labs. Sovereign Autonomous Business.
