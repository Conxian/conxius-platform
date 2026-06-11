# Conxius Platform

The `conxius-platform` repository contains development and control-plane scaffolding for composing parts of the Conxian stack locally and in managed environments.

## Purpose

Provide platform configuration, orchestration, and environment scaffolding for contributors and maintainers working across the Conxian ecosystem.

[![Secret Scan](https://github.com/Conxian/conxius-platform/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/secret-scan.yml) [![Repository Hygiene Guard](https://github.com/Conxian/conxius-platform/actions/workflows/hygiene.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/hygiene.yml) [![Lifecycle Control Gates](https://github.com/Conxian/conxius-platform/actions/workflows/lifecycle-control-gates.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/lifecycle-control-gates.yml)

## Status

**Active development.** This repository is evolving alongside the broader platform architecture and may contain development-oriented control-plane material.

## CI source of truth

GitHub Actions workflows in [`.github/workflows`](./.github/workflows) are the sole CI source of truth for this repository. Legacy CircleCI configuration has been intentionally removed.

## Scope

`conxius-platform` is a platform control-plane repository. Keep root-level content focused on:

- environment/runtime orchestration
- CI and release automation
- integration harnesses and developer tooling

Out of scope here: portfolio strategy narratives, legal/financial operations material, and non-platform product planning. Route those to the owning repository in [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md) or the Conxian Linear `CON` workspace.

## Governance relation

This repository is maintained by Conxian Labs. It supports development and operational enablement around the public Conxian stack, but it is not itself a governance authority for the protocol.

## Technical documentation map

- [Conxian Unified Theory v2](./docs/CONXIAN_UNIFIED_THEORY_v2.md)
- [Sovereign Computing Redesign (2026)](./docs/architecture/SOVEREIGN_REPR_2026.md)
- [Whitepaper](./docs/WHITEPAPER.md)
- [System Architecture Graph](./docs/architecture/SYSTEM_GRAPH.md)
- [Alignment Strategy](./docs/architecture/ALIGNMENT.md)
- [Ecosystem Synergy](./docs/architecture/SYNERGY.md)
- [Gap Analysis](./GAPS.md)
- [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md)
- [ADR 001: Repo Ownership](./docs/architecture/ADR-001_REPO_OWNERSHIP_AND_BOUNDARIES.md)
- [Repository Evolution Plan](./docs/architecture/REPO_EVOLUTION_PLAN.md)
- [Alignment Blueprint 2026](./docs/architecture/ALIGNMENT_BLUEPRINT_2026.md)

## Quick start

```bash
make init
make auth
make start
make bench
```

Use templates and generated local secrets for development only. Do not commit real credentials.

## Policies

- [LICENSE](LICENSE)
- [SECURITY.md](SECURITY.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [GOVERNANCE.md](GOVERNANCE.md)
- [CODEOWNERS](CODEOWNERS)

## Contact

- Support: [support@conxian-labs.com](mailto:support@conxian-labs.com)
- Security: [security@conxian-labs.com](mailto:security@conxian-labs.com)
- General: [info@conxian-labs.com](mailto:info@conxian-labs.com)
