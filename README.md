# Conxian Platform: Master Orchestrator

The `conxius-platform` repository is the central point of orchestration for the Conxian ecosystem. It manages services, environment secrets, and Docker-based local development.

## 📖 Technical Documentation Map

For deep technical insights into the Conxian architecture, refer to the following authoritative documents:

- [**Whitepaper**](./WHITEPAPER.md) - Vision, ethos, and core Bitcoin sovereign finance layer.
- [**System Architecture Graph**](./SYSTEM_GRAPH.md) - Holistic organization-wide component mapping.
- [**Alignment Strategy**](./ALIGNMENT.md) - Unified strategy for business logic, design, and authority.
- [**Ecosystem Synergy**](./SYNERGY.md) - Details on inter-repository workflows and the "Core Loop."
- [**Gap Analysis (GAPS.md)**](./GAPS.md) - Real-time tracking of Phase 6 implementation and technical debt.
- [**Fail-Closed BOS Payments + AP/AR Spec (CON-439)**](./openspec/specs/fail-closed-bos-payments-apar.spec.md) - Normative fail-closed control model for BOS payment and AP/AR settlement.

## Purpose

Make it easy to run, compose, and deploy the Conxian stack (Gateway, UI, and operational services) with consistent local and CI environments.

## Status

**Production-Ready (v0.2.1-aligned).** The platform is fully aligned with Phase 6 sovereign primitives including AI Allocation, Universal Bitcoin Identity (UBI), and the Global Liquidity Mesh.

## Ownership

Ownership and review requirements are defined in [`CODEOWNERS`](./CODEOWNERS).

## Audience

- Platform engineers running the full stack locally or in hosted environments.
- Contributors who need a single entry point for wiring and dependency management.
- Operators validating observability, secrets, and deployment workflows.

## Relationship to the Conxian stack

- **Core Orchestrator**: Pins and coordinates the core services (Gateway, UI, Admin) as a runnable system.
- **Sovereign Primitives**: Facilitates Phase 6 features including **AI-Driven Asset Allocation**, **Universal Bitcoin Identity (UBI)**, and **Nexus Glass Node** synchronization.
- **Market Readiness**: Integrates **ALEX Method B** (sovereign custody) and **Structured Finance** (Ops Loans) capabilities.
- **Deployment & Ops**: Integrates deployment workflows (StacksOrbit/GCP/Render) and shared institutional libraries like `lib-conxian-core`.

## 🚀 Quick Start

Ensure you have Docker and Git installed.

```bash
make init           # Initialize and update all submodules
make auth           # Provision .env with secure random secrets
make start          # Build and start the entire stack
make bench          # Run performance benchmarks
```

## 📂 Repository Structure

- **services/lib-conxian-core**: Shared Rust/TS libraries and the **Conxian Gateway**.
- **services/conxian-ui**: The primary Next.js dashboard for users.
- **services/admin-dashboard**: Internal telemetry and system monitoring.
- **services/admin-pulse-bos**: Dev-only BOS pulse prototype (not production-wired).
- **services/elizaos-plugin-conxian**: ElizaOS plugin for Conxian Gateway and social interfaces.
- **openspec/**: Specifications for all system changes and Phase 5/6 alignment.
- **docs/PRODUCTION_BOUNDARY.md**: Owner surface + production boundary for BOS-related work in this repo.

## ⚖️ Governance

- [LICENSE](LICENSE) (MIT)
- [SECURITY.md](SECURITY.md) - Vulnerability reporting process
- [CONTRIBUTING.md](CONTRIBUTING.md) - Monorepo development guidelines
- [CODEOWNERS](CODEOWNERS) - Service-level ownership

## 🛠️ Operating Model

This repository follows the **OpenSpec First** directive. All architectural changes must be proposed and reviewed within the `openspec/` directory before implementation.

## 🎨 Design Language

Conxian uses the **Earthy Corporate Finance** theme:
- Primary: **Forest Green** (#2E403B)
- Secondary: **Gold** (#D4A017)
