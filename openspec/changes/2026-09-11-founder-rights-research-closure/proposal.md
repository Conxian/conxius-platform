# OpenSpec Proposal: Founder-Rights Research Closure and Decision Handoff

**Date**: 2026-09-11
**Status**: Proposed platform research-closure artifact; protocol governance remains unresolved
**Trigger**: [Conxian/conxius-platform#1168](https://github.com/Conxian/conxius-platform/issues/1168)
**Prior platform work**: [PR #1197](https://github.com/Conxian/conxius-platform/pull/1197) observation contract (merged 2026-07-23)
**Related**: [Conxian/conxius-platform#1167](https://github.com/Conxian/conxius-platform/issues/1167), [Conxian/Conxian#488](https://github.com/Conxian/Conxian/issues/488), [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538)

## Why

Issue #1168 asked for founder revenue research with a launch-survival decay model
(`2.5% → 1.5% → 1.0% → 0.75%`). The platform already shipped the fail-closed
observation contract in PR #1197. Remaining issue checkboxes (confirm the decay
model, choose Clarity path, add on-chain schedules, configure multi-sig, set
launch date) are protocol/governance decisions outside `conxius-platform`.

This change closes the **platform research lane** by:

1. refreshing the evidence matrix against current protocol source pins;
2. recording the #1168 model as an explicit **proposal** observation fixture
   that cannot enable payout;
3. publishing a decision checklist owners must complete before any ratified
   economic change; and
4. marking G-56 research-complete / decision-pending without selecting a fee,
   beneficiary, or payout route.

## What changes

1. Add OpenSpec change-local requirements for research closure and handoff.
2. Add dated research-closure / decision-handoff document.
3. Add a checked-in proposal observation fixture for the #1168 decay schedule.
4. Extend focused validator tests so the fixture validates as proposal-only and
   rejects any attempt to treat it as active/payout-enabled.
5. Update gap, documentation index, and session continuity records.

## Ownership and boundary

- `Conxian/Conxian` owns fee policy, Clarity changes, beneficiaries, multi-sig,
  deployment evidence, and ratification.
- `conxius-platform` owns observation evidence, fail-closed validation, and
  research handoff documentation.
- No custody, fee calculation, or protocol payout logic is added here.

## Explicit non-goals

This change does **not**:

- ratify the 2.5%→0.75% model or any competing #488 / CXIP-013 schedule;
- modify Clarity contracts or deploy anything;
- configure a multi-sig, beneficiary, or launch date;
- implement the G-59 Gateway/Nexus adapter; or
- claim legal, tax, or securities conclusions.

## Acceptance criteria

- **AC-1 — Proposal-only**: the #1168 fixture validates with
  `policy_authority.kind: proposal`, non-active compensation, and
  `payout_enabled: false`.
- **AC-2 — Fail-closed**: mutating the fixture to claim active/payout status
  without ratified authority is rejected by the existing validator.
- **AC-3 — Decision checklist**: owners have an explicit list of remaining
  decisions with owning repository and blocker status.
- **AC-4 — Evidence refresh**: current protocol fee/allocation contradictions
  remain recorded without selecting a canonical rate.
- **AC-5 — Boundary**: no platform custody, fee engine, or Clarity change.

## Follow-up outside this change

Protocol governance must decide and implement any ratified economics in
`Conxian/Conxian`. A future Gateway/Nexus read-only adapter remains G-59.
