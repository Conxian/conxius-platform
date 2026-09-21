# BitVM2 & MuSig2 Multi-Party Aggregation Hardening (G-11 & CON-1306)

## Context
BitVM2 utilizes a 1-of-N trust model where any single honest verifier can challenge and disprove a fraudulent execution. To scale this to institutional levels, the Conxian platform requires a multi-party aggregation layer (G-11) to coordinate signatures and challenges across a federation of verifiers using MuSig2 (BIP-327).

Prior in-memory session state lacked explicit capacity bounds and TTL expiration checks, which could allow unbounded memory growth or stale signing sessions to persist indefinitely.

## Goal
Harden the MuSig2 (BIP-327) Multi-Party Aggregation Engine (`services/admin-dashboard/src/lib/support/musig2.ts`) with strict capacity limits, TTL expiration, fail-closed participant validation, and comprehensive unit tests.

## Scope
- Enforce max active session capacity (1000 sessions) in `MuSig2Engine`.
- Enforce session TTL (24-hour retention window) and clear expired sessions automatically.
- Enforce strict participant check and non-empty participant set requirements.
- Add comprehensive Vitest test coverage in `services/admin-dashboard/src/tests/musig2.test.ts`.

## Non-goals
- No remote database or external RPC dependency required for local unit verification.
- No change to existing BIP-327 cryptographic formulas.

## Acceptance Criteria
- `MuSig2Engine` fails closed when exceeding session capacity or attempting operations on expired sessions.
- All unit tests pass in `services/admin-dashboard/src/tests/musig2.test.ts`.
- OpenSpec validation succeeds with zero errors under strict mode.
