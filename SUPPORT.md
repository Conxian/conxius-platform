# Support Policy

This document outlines the support expectations, repository taxonomy, release support lifecycle, and communication channels for the `conxius-platform` repository and its workspace services.

## Repository & Service Taxonomy

`conxius-platform` is a monorepo containing core platform orchestration tooling alongside workspace services under `services/`. Support expectations vary by service classification:

| Directory / Service | Classification | Purpose | Support Expectations |
| :--- | :--- | :--- | :--- |
| **Root Platform & Tooling** (`/`, `docs/`, `scripts/`, `nixos/`) | Platform Core | Compose harnesses, CI/CD pipelines, and environment scaffolding | Fully supported for maintainers, contributors, and institutional operators |
| **`services/admin-dashboard`** | Institutional Control Plane | Internal control-plane dashboard and UI-BFF telemetry | Fully supported for institutional operators and internal deployments |
| **`services/admin-pulse-bos`** | Dev-Only Supporting Surface | Specialized Sovereign Financial Office (SFO) command pulse components | Supported for internal developer testing and fiscal coordination experiments |
| **`services/elizaos-plugin-conxian`** | Integration Surface | ElizaOS plugin exposing Gateway and SIDL actions to AI agents | Supported for AI agent developers and ecosystem integrators |

For broader repository boundaries across the Conxian ecosystem, refer to [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md).

## Support Tiers

### 1. Community Support (Public)
For general technical questions, feature requests, or public bug reports:
- **Channel**: [GitHub Issues](https://github.com/Conxian/conxius-platform/issues)
- **Scope**: Platform orchestration, CI workflows, workspace service integrations, and environment setup.
- **SLA**: Addressed by maintainers on a best-effort basis.

### 2. Institutional & Operator Support
For Conxian Labs partners, node operators, and institutional users:
- **Channel**: [support@conxian-labs.com](mailto:support@conxian-labs.com)
- **Scope**: Managed environment deployment, operator runbooks, M2M key rotation, and control-plane setup.
- **SLA**: Acknowledged within 2 business days.

### 3. Security Support
For reporting vulnerabilities, secret exposure, or sensitive security concerns:
- **Channel**: GitHub Private Vulnerability Reporting or [security@conxian-labs.com](mailto:security@conxian-labs.com)
- **Policy**: See [SECURITY.md](SECURITY.md) for vulnerability submission guidelines and response procedures.
- **SLA**: Immediate triage and coordinated private remediation.

## Release Support Lifecycle & Versioning

- **Versioning Baseline**: All workspace packages and root references are synchronized to the platform version line (currently `0.2.5`).
- **Supported Versions**: Security patches and critical bug fixes are provided for the latest active minor release line (`v0.2.x`). Historical minor versions are deprecated upon new minor releases unless formally designated as LTS.
- **LTS Policy**: Long-Term Support tracks (`lts/x.y`) are opened only after meeting formal stability gates (30+ days in production without rollback, zero HIGH/CRITICAL issues, and maintainer sign-off) as defined in [RELEASE_POLICY.md](RELEASE_POLICY.md).
- **Release Controls**: Production release promotion gates and evidence requirements follow [RELEASE_CONTROL.md](RELEASE_CONTROL.md) and [RELEASING.md](RELEASING.md).

## Issue Routing Matrix

| Topic / Issue Type | Target Location / Action |
| :--- | :--- |
| **Platform Orchestration, CI, Compose, Workspace Services** | Open an issue in [`conxius-platform` Issues](https://github.com/Conxian/conxius-platform/issues) |
| **Security & Vulnerability Disclosure** | Submit via [GitHub Private Vulnerability Reporting](https://github.com/Conxian/conxius-platform/security/advisories) or email `security@conxian-labs.com` |
| **Protocol Logic / On-Chain Contracts** | See `lib-conxian-core` or `conxian-nexus` in [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md) |
| **Sovereign Wallet & Client Logic** | See `conxius-wallet` in [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md) |
| **API Gateway & Ingress** | See `conxian-gateway` in [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md) |
| **Public Website / Marketing** | See `conxian-labs-site` in [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md) |

## Non-Custodial & Operational Boundaries

- **Non-Custodial Architecture**: Conxian software and services are strictly non-custodial. The platform does not take possession of customer funds, store private keys, or maintain raw customer-data systems of record.
- **Support Limits**: Support channels cannot assist with private key recovery, transaction execution reversals, or account password resets.
- **Environment Hygiene**: Local credentials, M2M keys, and `.env` configuration are maintained solely by operators. Do not share private keys or production secrets in support tickets.
