# Conxius Platform

The `conxius-platform` repository contains development and control-plane scaffolding for composing parts of the Conxian stack locally and in managed environments.

## Purpose

Provide platform configuration, orchestration, CI/release automation, and environment scaffolding for contributors and maintainers working across the Conxian ecosystem.

## Status

**Active development.** This is a platform control-plane repository and should be read primarily as contributor and operator infrastructure rather than as an end-user product surface.

There are currently **no published GitHub releases** for this repository. Until a formal release policy is established, external readers should treat the repository as actively maintained platform infrastructure rather than a versioned public product.

## Audience

Use this repository if you need:

- local or managed environment scaffolding
- control-plane and orchestration assets
- CI and release automation references
- developer tooling that spans multiple Conxian repositories

For protocol logic, wallet/client behavior, or public site content, use the owning repository directly.

## CI source of truth

GitHub Actions workflows in [`.github/workflows`](./.github/workflows) are the sole CI source of truth for this repository. Legacy CircleCI configuration has been intentionally removed.

## Scope

`conxius-platform` is a platform control-plane repository. Keep root-level content focused on:

- environment and runtime orchestration
- CI and release automation
- integration harnesses and developer tooling
- platform architecture and repository-boundary guidance

Out of scope here: portfolio strategy narratives, legal or financial operations material, and non-platform product planning. Route those to the owning repository in [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md) or the Conxian Linear `CON` workspace.

## Governance relation

This repository is maintained by Conxian Labs. It supports development and operational enablement around the public Conxian stack, but it is not itself a governance authority for the protocol.

## Relationship to the Conxian stack

- `Conxian` is the protocol and public ecosystem layer.
- `conxius-wallet` is the sovereign wallet and reference client.
- `conxian-gateway` and `conxian-nexus` provide middleware and service-side coordination surfaces.
- `conxian-labs-site` is the public narrative and discovery surface.

## Technical documentation map

- [Conxian Unified Theory v2](./docs/CONXIAN_UNIFIED_THEORY_v2.md)
- [Sovereign Computing Redesign (2026)](./docs/architecture/SOVEREIGN_REPR_2026.md)
- [Whitepaper](./WHITEPAPER.md)
- [System Architecture Graph](./SYSTEM_GRAPH.md)
- [Alignment Strategy](./ALIGNMENT.md)
- [Ecosystem Synergy](./SYNERGY.md)
- [Gap Analysis](./GAPS.md)
- [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md)
- [ADR 001: Repo Ownership](./docs/architecture/ADR-001_REPO_OWNERSHIP_AND_BOUNDARIES.md)
- [Repository Evolution Plan](./docs/architecture/REPO_EVOLUTION_PLAN.md)
- [Alignment Blueprint 2026](./ALIGNMENT_BLUEPRINT_2026.md)

## Quick start

```bash
make init
make auth
make start
make bench
```

Use templates and generated local secrets for development only. Do not commit real credentials.

## Release posture

- If this repository becomes release-tracked, publish annotated GitHub releases in the form `vX.Y.Z`.
- Keep release-facing changes recorded in `CHANGELOG.md` when that workflow is adopted.
- If the repository remains non-release-tracked, keep that explicit in the README so public readers do not infer missing hygiene.

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
