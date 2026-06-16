# Conxius Platform

The `conxius-platform` repository contains platform, orchestration, and environment scaffolding for composing parts of the broader Conxian ecosystem locally and in managed environments.

## Status

**Active development.** This is a platform and orchestration repository and should be read primarily as contributor and operator infrastructure rather than as a protocol source of truth or end-user product surface.

This repository uses formal versioned releases tracked in `CHANGELOG.md` and published via GitHub Releases.

## Positioning

Conxian provides zero-custody, zero-raw-data infrastructure. This repository supports deployment, composition, and operational scaffolding around that model rather than owning protocol economics or governance.

## Purpose

Provide platform configuration, orchestration, CI/release automation, and environment scaffolding for contributors and maintainers working across the Conxian ecosystem.

[![Secret Scan](https://github.com/Conxian/conxius-platform/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/secret-scan.yml) [![Repository Hygiene Guard](https://github.com/Conxian/conxius-platform/actions/workflows/hygiene.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/hygiene.yml) [![Lifecycle Control Gates](https://github.com/Conxian/conxius-platform/actions/workflows/lifecycle-control-gates.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/lifecycle-control-gates.yml)

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

`conxius-platform` is a platform and orchestration repository. Keep root-level content focused on:

- environment and runtime orchestration
- CI and release automation
- integration harnesses and developer tooling
- platform architecture and repository-boundary guidance

Out of scope here: protocol governance authority, community treasury logic, portfolio strategy narratives, legal or financial operations material, and non-platform product planning.

## Governance relation

This repository is maintained by Conxian-Labs. It supports development and operational enablement around Conxian, but it is not itself a governance authority for the protocol.

## Relationship to the Conxian stack

- `Conxian` is the protocol and DAO-facing layer.
- `conxius-wallet` is the sovereign wallet and reference client.
- `conxian-gateway` and `conxian-nexus` provide middleware and verification support.
- `conxian-labs-site` is the Conxian-Labs portfolio and discovery surface.

## Quick start

```bash
make init
make auth
make start
make bench
```

Use templates and generated local secrets for development only. Do not commit real credentials.

## Release posture

- This repository follows Semantic Versioning via annotated tags (`vX.Y.Z`).
- Changes are recorded in `CHANGELOG.md`.
- Releases are triggered by tags and verified by the [`release.yml`](./.github/workflows/release.yml) workflow.

## Policies

- [LICENSE](LICENSE)
- [SECURITY.md](SECURITY.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [GOVERNANCE.md](GOVERNANCE.md)
- [SUPPORT.md](SUPPORT.md)
- [REVIEWS.md](REVIEWS.md)
- [CODEOWNERS](CODEOWNERS)

## Contact

- Support: [SUPPORT.md](SUPPORT.md) | [support@conxian-labs.com](mailto:support@conxian-labs.com)
- Security: [security@conxian-labs.com](mailto:security@conxian-labs.com)
- General: [info@conxian-labs.com](mailto:info@conxian-labs.com)
