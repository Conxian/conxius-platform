# Tasks: Issue #965 Orbit CLI canonical surface & Python/Node split

## Implementation checklist

- [x] Fix `stacksorbit` → `conxius-orbit` in Makefile deploy target
- [x] Fix `stacksorbit` → `conxius-orbit` in SYSTEM_GRAPH.md repository roles table
- [x] Document canonical CLI surface and Python/Node role split in AGENTS.md
- [x] Add Orbit CLI contract reference to README.md technical documentation map
- [x] Create `docs/architecture/ORBIT_CLI_CONTRACT.md` with command coverage map,
  compatibility/deprecation decisions, and automation contract
- [x] Create OpenSpec change artifact (this directory)

## Acceptance criteria

- [x] **AC-1 (Naming purge):** No `stacksorbit` references remain in active
  operational surfaces (Makefile, SYSTEM_GRAPH.md)
- [x] **AC-2 (Canonical declaration):** Python declared as canonical
  implementation surface, Node as stable user-facing entry point
- [x] **AC-3 (Role split documented):** Python/Node role split documented in
  AGENTS.md and ORBIT_CLI_CONTRACT.md
- [x] **AC-4 (Command coverage mapped):** Full command coverage map with gaps
  identified
- [x] **AC-5 (Compatibility explicit):** Compatible, node-only, and deprecated
  command categories declared
- [x] **AC-6 (No ambiguity):** README and agent docs point to authoritative
  ORBIT_CLI_CONTRACT.md
- [x] **AC-7 (Stable automation contract):** Automation paths directed to
  `conxius-orbit` Node binary as stable contract
