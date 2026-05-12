# Tasks: CON-483 Contributor Claim Ledger and Activation Policy

## Baseline deliverables

- [x] Create change folder `openspec/changes/2026-05-12-con-483-contributor-claim-ledger-policy/`.
- [x] Add concrete policy artifacts: `proposal.md`, `design.md`, and `tasks.md`.
- [x] Add canonical policy specification: `openspec/specs/contributor-claim-ledger-policy.spec.md`.
- [x] Define contribution taxonomy, deterministic CU formula, and multiplier constants.
- [x] Define recognition eligibility workflow and evidence requirements.
- [x] Define anti-concentration and anti-double-counting guardrails.
- [x] Define append-only ledger schema and state machine.
- [x] Define disputes/revocations and audit event requirements.
- [x] Define activation gates and snapshot conversion model with explicit pre-activation non-binding language.

## Acceptance criteria (testable)

- [x] **AC-1 (taxonomy constants):** Spec SHALL define all five policy categories with exact base CU values (`8, 12, 6, 4, 3`).
  - **Pass when:** all categories and constants are explicitly enumerated and versioned.
  - **Fail when:** categories or CU constants are implicit, missing, or inconsistent.

- [x] **AC-2 (eligibility gate):** Claims SHALL require tracked artifact, verifiable evidence, maintainer verification flow, and `ubi:btc:{id}` contributor identity.
  - **Pass when:** all four checks are normative requirements.
  - **Fail when:** any check is optional for entry approval.

- [x] **AC-3 (deterministic CU computation):** `awardedCU` SHALL be derived by deterministic formula using fixed multiplier sets.
  - **Pass when:** integer-based computation avoids floating ambiguity and identical inputs produce identical output.
  - **Fail when:** discretionary weighting or implicit rounding can change outcomes.

- [x] **AC-4 (anti-concentration + anti-double-counting):** Policy SHALL enforce pre-activation monthly cap and single primary category per contributor artifact.
  - **Pass when:** cap and duplicate handling are explicit and deterministic.
  - **Fail when:** duplicate category claims or uncapped concentration are possible.

- [x] **AC-5 (append-only lifecycle):** Ledger SHALL be append-only with explicit state transitions and event history.
  - **Pass when:** destructive edits are forbidden and disputes/revocations are represented as appended events.
  - **Fail when:** claim history can be overwritten without audit trail.

- [x] **AC-6 (activation fail-closed):** Conversion SHALL remain blocked unless all four activation gates are true.
  - **Pass when:** mainnet stability, audited payout path + `BOUNTY_PAYOUT_ACTIVE=true`, treasury runway, and governance ratification are all required.
  - **Fail when:** conversion can proceed while any gate is false.

- [x] **AC-7 (snapshot conversion determinism):** Conversion SHALL use only snapshot-frozen eligible CU and one ratified pool `P`.
  - **Pass when:** `conversionRate = P / totalEligibleCuAtSnapshot` and contributor allocation formula are explicit.
  - **Fail when:** conversion can use mutable post-snapshot inputs.

- [x] **AC-8 (pre-activation non-binding language):** Policy SHALL explicitly state that pre-activation CU are recognition-only and not payout promises.
  - **Pass when:** non-binding language is normative in both design and canonical spec.
  - **Fail when:** language can be interpreted as guaranteed pre-activation bounty commitment.

## Open review checklist

- [ ] Governance confirms policy constants and multiplier tables.
- [ ] Treasury confirms runway methodology for the 6-month post-allocation gate.
- [ ] Security/compliance confirms revocation reason taxonomy and anti-sybil review process.
- [ ] Maintainers confirm evidence URI standards and reviewer-role ownership.
- [ ] Ops confirms objective Mainnet stability signal source for the 60-day gate.
