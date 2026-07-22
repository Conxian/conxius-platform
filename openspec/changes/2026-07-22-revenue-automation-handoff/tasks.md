# Tasks: Revenue Automation Protocol Handoff and Policy Boundary

## Platform scope

- [x] Confirm the upstream contract exists at
  `Conxian/Conxian/contracts/treasury/revenue-automation.clar` and record the
  observed 100 bps / 1% baseline without adopting a new rate.
- [x] Search for a dedicated protocol handoff issue and create
  [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538).
- [x] Create the dated OpenSpec change directory and its proposal, design,
  tasks, and spec-delta artifacts.
- [x] Add the canonical
  `openspec/specs/revenue-automation-policy.spec.md`.
- [x] Update `docs/runbooks/MAINTAINER_BOUNTY_RUNBOOK.md` with protocol
  ownership and implementation-reference boundaries while preserving Gateway
  and `BOUNTY_PAYOUT_ACTIVE` operations.
- [x] Correct active `AGENTS.md` gap/status claims without rewriting historical
  session logs, then append the 2026-07-22 session entry.

## Normative acceptance criteria

- [x] **AC-1 (ownership):** The canonical spec MUST assign Clarity,
  deployment, tests, and economic-policy ownership to `Conxian/Conxian` and
  routing, flags, and runbooks to `conxius-platform`.
- [x] **AC-2 (baseline):** The canonical spec MUST identify 100 bps / 1% as a
  current observed implementation baseline, not an immutable policy, and MUST
  defer rate changes to protocol governance and issue #488.
- [x] **AC-3 (flow registration):** The canonical spec MUST require fee base,
  asset, collector/distributor, trigger, caller authorization, and replay key
  before a fee-bearing flow is enabled.
- [x] **AC-4 (execution safety):** The canonical spec MUST define exactly-once
  replay behavior, deterministic integer rounding, zero-fee handling,
  authorization, pause/fail-closed behavior, atomic effects, events/audit
  fields, and deterministic failure semantics.
- [x] **AC-5 (platform boundary):** The canonical spec MUST prohibit a
  conflicting platform fee calculation and custody claim while allowing
  operational payout disablement.
- [x] **AC-6 (acceptance scenarios):** The canonical spec MUST include Given /
  When / Then scenarios that distinguish normative requirements from current
  upstream implementation gaps.
- [x] **AC-7 (non-goals):** The change MUST NOT add or modify Clarity code or
  change the fee rate.

## Upstream follow-up (not completed by this PR)

- [ ] Protocol maintainers implement and test registered trigger coverage,
  exactly-once/replay semantics, authorization, pause/fail-closed behavior,
  atomic accounting/transfers, events, rounding, and zero-fee behavior.
- [ ] Protocol maintainers reconcile the treasury README `initialize`
  documentation with the actual contract interface and initialization behavior.
- [ ] Protocol maintainers resolve the no-op fee paths tracked by
  [protocol issue #469](https://github.com/Conxian/Conxian/issues/469).
- [ ] Protocol governance decides whether any fee-rate change is appropriate;
  this platform change does not adopt [protocol issue #488](https://github.com/Conxian/Conxian/issues/488).

## Validation evidence

- [x] `git diff --check` passed; a focused assertion script confirmed all
  required policy/runbook sections, local relative files, valid linked GitHub
  resources, and no changed `.clar` path.
- [x] `pnpm run test:agent-discovery` passed: 12 tests.
- [x] `pnpm run typecheck` passed: root discovery typecheck plus all three
  workspace typechecks.
- [x] `pnpm run lint` passed; the only configured workspace lint output is the
  existing admin-pulse-bos no-lint notice.
- [x] `pnpm test` passed: 12 discovery tests, 22 admin-dashboard files / 117
  tests, 1 admin-pulse-bos file / 6 tests, and 1 ElizaOS plugin file / 7 tests.
- [x] `pnpm run check:lifecycle-control` passed all four gates:
  lifecycle-control, BOS production boundary, submodule integrity, and
  contamination guard.
- [x] `python3 scripts/maintenance/system_audit.py` passed all security,
  hygiene, governance, service, and drift audits. It emitted the repository's
  existing manual-review warnings for generic `password:`, `api_key:`,
  `secret:`, and `PRIVATE KEY` patterns; no audit failed.
- [x] A direct HTTP check returned `200` for the linked platform issues,
  protocol handoff/related issues, upstream contract, and `Clarinet.toml`.
- [x] OpenSpec metadata was checked against existing `.openspec.yaml` files.
  No `openspec` executable or repository validator script is available, so no
  unavailable validator is claimed as passed.

Upstream Clarity implementation, hardening, and audit are intentionally not
claimed as validation for this repository; they remain protocol issue #538
scope.
