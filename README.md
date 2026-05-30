# Conxius Platform

The `conxius-platform` repository contains development and control-plane scaffolding for composing parts of the Conxian stack locally and in managed environments.

## Purpose

Provide platform configuration, orchestration, and environment scaffolding for contributors and maintainers working across the Conxian ecosystem.

## Status

**Active development.** This repository is evolving alongside the broader platform architecture and may contain development-oriented control-plane material.

## Scope

This repository should contain platform and environment tooling only. Business administration, legal materials, financial operations, and other sensitive internal workflows should remain outside this public repository.

## Governance relation

This repository is maintained by Conxian Labs. It supports development and operational enablement around the public Conxian stack, but it is not itself a governance authority for the protocol.

## Technical documentation map

- [Conxian Unified Theory v2](./docs/CONXIAN_UNIFIED_THEORY_v2.md)
- [Sovereign Computing Redesign (2026)](./docs/architecture/SOVEREIGN_REPR_2026.md)
- [Whitepaper](./WHITEPAPER.md)
- [System Architecture Graph](./SYSTEM_GRAPH.md)
- [Alignment Strategy](./ALIGNMENT.md)
- [Ecosystem Synergy](./SYNERGY.md)
- [Gap Analysis](./GAPS.md)
- [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md)

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
