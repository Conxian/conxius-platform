# Conxian Platform: Master Orchestrator

The `conxius-platform` repository is the central point of orchestration for the Conxian ecosystem. It manages services, environment secrets, and Docker-based local development.

## Purpose

Make it easy to run, compose, and deploy the Conxian stack (Gateway, UI, and operational services) with consistent local and CI environments.

## Status

Active. The orchestration layer evolves as flagship services mature and new integrations are added.

## Ownership

Ownership and review requirements are defined in [`CODEOWNERS`](./CODEOWNERS).

## Audience

- Platform engineers running the full stack locally or in hosted environments.
- Contributors who need a single entry point for wiring and dependency management.
- Operators validating observability, secrets, and deployment workflows.

## Relationship to the Conxian stack

- Pins and coordinates the core services (Gateway, UI, Admin) as a runnable system.
- Integrates deployment workflows (for example StacksOrbit for contract deployment) and shared libraries like `lib-conxian-core`.

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
