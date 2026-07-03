# Orbit CLI Canonical Surface Contract

This document defines the canonical CLI surface for `conxius-orbit` and
clarifies the Python/Node role split. It is the authoritative reference for
operators, agents, and CI/automation paths that interact with Orbit.

Related: [conxius-platform#965](https://github.com/Conxian/conxius-platform/issues/965)

## Decision

**Python is the canonical implementation surface. The Node.js binary
(`conxius-orbit`) is the stable user-facing entry point and wrapper.**

This means:

- All core deployment, monitoring, verification, and diagnostic logic lives in
  Python (`conxius_orbit_cli.py` and supporting modules).
- The Node.js binary (`bin/conxius-orbit.js`, installed via npm/pnpm as
  `conxius-orbit`) provides the stable command contract that operators and
  automation should target.
- The Node wrapper delegates to Python for most operations and adds two
  commands (`config`, `wallet`) that have no Python equivalent.
- The deprecated binary name `stacksorbit` (legacy) must not appear in any
  active operational surface (Makefiles, CI, docs).

## Command coverage map

| Command | Python (`conxius_orbit_cli.py`) | Node (`conxius-orbit`) | Canonical surface |
|:---|:---|:---|:---|
| `setup` | Yes (interactive wizard) | No (npm script only) | Python |
| `deploy` | Yes (enhanced) | Yes (primary impl) | Node (wraps Python) |
| `monitor` | Yes | Yes | Node (wraps Python) |
| `verify` | Yes | No | Python |
| `dashboard` | Yes | No (npm script only) | Python |
| `diagnose` | Yes | No | Python |
| `detect` | Yes | No (npm script only) | Python |
| `template` | Yes | No | Python |
| `devnet` | Yes | No | Python |
| `test` | Yes | No | Python |
| `check` | No | Yes (pre-deployment checks) | Node |
| `config init` | No | Yes | **Node only** |
| `config validate` | No | Yes | **Node only** |
| `wallet generate` | No | Yes | **Node only** |
| `gui` | Yes (`conxius_orbit.py`) | Yes (spawns Python) | Node (delegates) |

## Compatibility and deprecation

### Must remain compatible

- `conxius-orbit deploy` — primary operator path, used in CI and Makefile
- `conxius-orbit monitor` — live deployment monitoring
- `conxius-orbit check` — pre-deployment validation gate

### Node-only commands (keep, no Python equivalent planned)

- `config init` and `config validate` — configuration management
- `wallet generate` — wallet bootstrap

### Deprecated

- `stacksorbit` — the legacy binary name. All operational surfaces now use
  `conxius-orbit`. The Makefile and SYSTEM_GRAPH.md have been updated.

## Automation and CI path

All automation, CI, and the `make deploy` target must use the Node entry point:

```bash
conxius-orbit deploy --all
```

The Node binary is the stable user-facing contract. Python commands may be
invoked directly for development and debugging, but automation paths must not
depend on internal Python module layout.

## Machine-readable output contract

The Python CLI supports JSON output via `--output json` and file output via
`--output-file <path>`. Automation consumers should prefer the JSON output
mode for structured result processing.

For checksum verification of deployment artifacts, see the artifact contracts
operating model in
[`openspec/changes/2026-06-15-artifact-contracts-operating-model/`](../../openspec/changes/2026-06-15-artifact-contracts-operating-model/proposal.md).

## References

- [Conxian/conxius-orbit](https://github.com/Conxian/conxius-orbit) — source repository
- [REPO_BOUNDARY_CONTRACT_V1.md](../REPO_BOUNDARY_CONTRACT_V1.md) — Platform–Orbit boundary contract (canonical)
- [Capability Registry](../../schemas/capabilities.json) — first-wave capability set with ownership and semantics
- [REPOSITORY_TAXONOMY.md](../REPOSITORY_TAXONOMY.md) — inventory and ownership
- [RELEASING.md](../../RELEASING.md) — cross-repo release discipline
- [GOVERNANCE.md](../../GOVERNANCE.md) — cross-repository control alignment
