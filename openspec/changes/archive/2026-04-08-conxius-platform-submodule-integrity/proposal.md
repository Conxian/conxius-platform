# Proposal: Restore `lib-conxian-core` submodule integrity for production orchestration

## Problem
`conxius-platform` owns orchestration wiring (submodule pins, `docker-compose.yml`, CI workflows). Right now the repo tracks `services/lib-conxian-core` as a gitlink (submodule), but it is missing the corresponding `.gitmodules` entry.

Impact:

- `git submodule update --init --recursive` fails.
- GitHub Actions checkout with `submodules: recursive` fails.
- Local stack orchestration can drift because the gateway build context was pointed at an unpinned sibling checkout.

This is a production-path hygiene issue (submodule pins + orchestration determinism), not a change to Gateway/Nexus business logic.

## Decision

- Restore the missing `.gitmodules` mapping for `services/lib-conxian-core`.
- Point `docker-compose.yml` back at the pinned submodule path for the gateway build context.
- Add a lightweight repository guard script to ensure `.gitmodules` and gitlink entries stay in sync.

## Non-goals

- Changing Gateway/Nexus implementation (those belong in their owning repositories).
- Changing the pinned submodule SHAs (this proposal only restores the mapping/integrity).
