# Conxian Platform: Control Plane

The `conxius-platform` repository is the declarative control plane for the Conxian ecosystem. It manages the orchestration of services, environment security, and the transition toward a decentralized, local-first operational topology.

## 📖 Technical Documentation Map

For architecture context and current execution status, use the following canonical documents:

- [**Conxian Unified Theory v2 (Canonical Index)**](./docs/CONXIAN_UNIFIED_THEORY_v2.md) - Entry point for strategy, architecture, and execution-status sources.
- [**Sovereign Computing Redesign (2026)**](./docs/architecture/SOVEREIGN_REPR_2026.md) - The paradigmatic shift to local-first, BFF-driven architecture (Phase 7).
- [**Whitepaper**](./WHITEPAPER.md) - Vision, ethos, and the core Bitcoin sovereign finance layer.
- [**System Architecture Graph**](./SYSTEM_GRAPH.md) - Holistic organization-wide component mapping.
- [**Alignment Strategy**](./ALIGNMENT.md) - Unified strategy for business logic, design, and authority.
- [**Ecosystem Synergy**](./SYNERGY.md) - Details on inter-repository workflows and the "Core Loop."
- [**Gap Analysis (GAPS.md)**](./GAPS.md) - Active gap tracker and transition backlog.
- [**Fail-Closed BOS Payments + AP/AR Spec (CON-439)**](./openspec/specs/fail-closed-bos-payments-apar.spec.md) - Normative fail-closed control model.
- [**Repository Taxonomy**](./docs/REPOSITORY_TAXONOMY.md) - Canonical map of repository roles, ownership, and status.
- [**SIDL Release Readiness Runbook (CON-355)**](./docs/runbooks/SIDL_RELEASE_READINESS_RUNBOOK.md) - Maintainer rollout and verification guidance.

## Purpose

The Control Plane provides the necessary scaffolding to compose and deploy the Conxian stack (Gateway, UI, and operational services) while enforcing architectural alignment through declarative infrastructure (NixOS) and standardized configuration.

## Status

**Phase 7 Sovereign Redesign transition is in progress.** The platform is migrating from a centralized "Master Orchestrator" model to a decentralized "Control Plane" based on NixOS and a Backend-for-Frontend (BFF) topology. For active execution status and open work, use [GAPS.md](./GAPS.md) and change artifacts in [`openspec/changes/`](./openspec/changes/).

## 🚀 Quick Start (Development)

Ensure you have Docker and Git installed. Note that while we are transitioning to declarative NixOS, development environments still utilize the following imperative loop:

```bash
make init           # Initialize and update all submodules
make auth           # Provision .env with secure random secrets
make start          # Build and start the entire stack
make bench          # Run performance benchmarks
```

## 📂 Repository Structure

- **services/lib-conxian-core**: Shared Rust/TS libraries and the **Conxian Gateway** (BFF).
- **services/conxian-ui**: The primary Next.js dashboard for users.
- **services/admin-dashboard**: Internal telemetry and system monitoring.
- **services/admin-pulse-bos**: Dev-only BOS pulse prototype (excluded from production).
- **services/elizaos-plugin-conxian**: ElizaOS plugin for Conxian Gateway integration.
- **openspec/**: Specifications for all system changes and architectural alignment.
- **nixos/**: Declarative configuration for the Phase 7 transition.

## ⚖️ Governance

- **[LICENSE](LICENSE)** (MIT)
- **[SECURITY.md](SECURITY.md)** - Vulnerability reporting process
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Monorepo development guidelines
- **[GOVERNANCE.md](GOVERNANCE.md)** - Operational governance and ownership
- **[CODEOWNERS](CODEOWNERS)** - Service-level ownership mapping

## 🛠️ Operating Model

This repository follows the **OpenSpec First** directive. All architectural changes must be proposed and reviewed within the `openspec/` directory before implementation.

## 🎨 Design Language

Conxian uses the **Earthy Corporate Finance** theme:
- Primary: **Forest Green** (#2E403B)
- Secondary: **Gold** (#D4A017)

## 📞 Support & Communication

- **Technical Support**: Open a [GitHub Issue](https://github.com/Conxian/conxius-platform/issues) or contact `dev@conxian.com`.
- **Security**: Refer to [SECURITY.md](SECURITY.md) for reporting vulnerabilities.
- **Institutional Inquiries**: Contact `labs@conxian.com` for partnership and institutional integration.
