# Tasks: Issue #722 Conxius Orbit parent-control alignment

## Implementation checklist
- [x] Create OpenSpec change folder for issue #722.
- [x] Add policy bindings in taxonomy/governance/production-boundary/releasing docs.
- [x] Replace deprecated `StacksOrbit` naming with `Conxius Orbit` in active guidance docs.
- [x] Run lightweight verification commands and record exact commands used.

## Requirement-to-evidence map

| Issue #722 requirement theme | Implemented evidence | Verification evidence |
| :--- | :--- | :--- |
| Parent control and lifecycle alignment | `GOVERNANCE.md` "Cross-repository control alignment" section and `docs/REPOSITORY_TAXONOMY.md` control inheritance note | `rg -n "Cross-repository control alignment|Control inheritance for chain-specific deployment repos" GOVERNANCE.md docs/REPOSITORY_TAXONOMY.md` |
| Operator setup expectations | `docs/PRODUCTION_BOUNDARY.md` "Chain-specific operator/deployment repositories" section requires parent-approved runbooks/owners | `rg -n "parent-approved runbook|operator setup" docs/PRODUCTION_BOUNDARY.md` |
| Chain-specific deployment safety | `docs/PRODUCTION_BOUNDARY.md` adds fail-closed and bounded-change requirement for chain-specific deploy repos | `rg -n "fail-closed|bounded to deployment/operator concerns" docs/PRODUCTION_BOUNDARY.md` |
| Release discipline | `RELEASING.md` "Cross-repository release discipline" section ties operator/deployment releases to parent controls and evidence | `rg -n "Cross-repository release discipline|control-plane issue/spec" RELEASING.md` |
| Trust assumptions clarity | `GOVERNANCE.md` trust-assumption bullet requiring untrusted operator posture and explicit assumptions | `rg -n "trust assumption|untrusted operator" GOVERNANCE.md` |
| Strict scope boundaries | `docs/PRODUCTION_BOUNDARY.md` and `GOVERNANCE.md` explicitly prohibit expansion into protocol ownership | `rg -n "must not become protocol owners|must not expand into broad protocol ownership" docs/PRODUCTION_BOUNDARY.md GOVERNANCE.md` |

## Acceptance criteria (testable)
- [x] **AC-1 (policy binding):** each required policy doc includes additive language binding Conxius Orbit/chain-specific repos to parent controls.
- [x] **AC-2 (operator + safety):** docs now explicitly cover operator setup expectations and fail-closed deployment safety constraints.
- [x] **AC-3 (release discipline):** release doc requires traceable control-plane linkage for chain-specific operator/deployment releases.
- [x] **AC-4 (trust + scope):** docs explicitly state trust assumptions and scope boundaries preventing protocol-ownership expansion.
- [x] **AC-5 (naming):** required active guidance files use `Conxius Orbit` naming.
