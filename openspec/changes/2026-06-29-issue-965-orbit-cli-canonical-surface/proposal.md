# Proposal: Issue #965 Orbit CLI canonical surface & Python/Node split

## Problem
Operators and agents face ambiguity about which `conxius-orbit` CLI surface to
use. The repo ships both a Python CLI (`conxius_orbit_cli.py`) and a Node.js
binary (`bin/conxius-orbit.js`) with overlapping but non-identical command
sets. No documentation declares which surface is canonical, and residual
`stacksorbit` (legacy) references remain in active operational surfaces.

## Decision
- **Python is the canonical implementation surface.** All core deployment,
  monitoring, verification, and diagnostic logic lives in Python.
- **Node.js is the stable user-facing entry point and wrapper.** Automation,
  CI, and the Makefile target the `conxius-orbit` binary.
- The Node wrapper delegates deploy, monitor, verify, dashboard, diagnose,
  and detect to Python. It adds `config` and `wallet` commands with no Python
  equivalent.
- The deprecated `stacksorbit` binary name is purged from all active
  operational surfaces.

## Scope
- Fix residual `stacksorbit` references in Makefile and SYSTEM_GRAPH.md
- Document the canonical surface and Python/Node role split in AGENTS.md,
  README.md, and a new ORBIT_CLI_CONTRACT.md
- Create a command coverage map with compatibility and deprecation
  declarations
- Define the stable automation/CI contract (target `conxius-orbit` binary)

## Non-goals
- No code changes to `conxius-orbit` repo
- No removal or addition of CLI commands
- No change to npm package or Python package distribution

## Acceptance criteria
1. All `stacksorbit` references removed from active operational surfaces
2. Canonical CLI surface declared in AGENTS.md and ORBIT_CLI_CONTRACT.md
3. Python/Node role split documented with command coverage map
4. Compatibility/deprecation decisions explicit
5. README and agent docs no longer leave ambiguity about which surface to use
6. Automation paths can rely on a stable command contract

## References
- [conxius-platform#965](https://github.com/Conxian/conxius-platform/issues/965)
- [CON-1238](https://linear.app/conxian-labs/issue/CON-1238)
- [Artifact contracts operating model](../2026-06-15-artifact-contracts-operating-model/proposal.md)
- [Orbit CLI Canonical Surface Contract](../../docs/architecture/ORBIT_CLI_CONTRACT.md)
