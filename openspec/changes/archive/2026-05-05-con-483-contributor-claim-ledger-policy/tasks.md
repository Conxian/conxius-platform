# Tasks: CON-483 Contributor Claim Ledger Policy

## Baseline deliverables

- [x] Add policy proposal for contributor claim ledger and activation model.
- [x] Define deterministic taxonomy, base CU values, and CU calculation formula.
- [x] Define eligibility requirements, maintainer workflow, and normalized contributor identity (`ubi:btc:{id}`).
- [x] Define pre-activation guardrails (non-monetary CU, monthly cap, single primary category).
- [x] Define append-only ledger fields and lifecycle state machine.
- [x] Define challenge/dispute handling and audit requirements.
- [x] Define activation gates and snapshot conversion model.
- [x] Add concise canonical specification under `openspec/specs/`.

## Acceptance criteria (AC-1..AC-7)

- [x] **AC-1 (pre-activation recognition only):** The policy SHALL state that CU are recognition-only prior to activation and MUST NOT imply payout commitments.
  - **Pass when:** proposal/design/spec all explicitly prohibit pre-activation payout promises.
  - **Fail when:** any artifact implies guaranteed monetary value before activation.

- [x] **AC-2 (activation gate completeness):** Activation SHALL require all four gates.
  - **Pass when:** documents require (1) mainnet >= 60 days stable, (2) audited payout path with `BOUNTY_PAYOUT_ACTIVE=true`, (3) treasury runway approval >= 6 months post-allocation, and (4) governance ratification with `H_activate`.
  - **Fail when:** any gate is optional, omitted, or weakened.

- [x] **AC-3 (taxonomy + formula determinism):** CU award logic SHALL define category base values and multiplier-driven formula.
  - **Pass when:** categories/base CU and `awardedCU = baseCU(category) × impactMultiplier × qualityMultiplier` are specified with allowed multiplier sets.
  - **Fail when:** category values or multipliers are undefined/ambiguous.

- [x] **AC-4 (eligibility + identity):** Claims SHALL require tracked artifact + auditable evidence + maintainer workflow + normalized identity.
  - **Pass when:** `proposed -> verified -> approved` and `ubi:btc:{id}` are mandatory.
  - **Fail when:** claims can be recognized without artifact/evidence/workflow/identity normalization.

- [x] **AC-5 (guardrails):** The policy SHALL enforce one primary category per artifact and a 40 CU monthly cap pre-activation.
  - **Pass when:** both constraints are normative in design/spec.
  - **Fail when:** double-category attribution or uncapped pre-activation CU is allowed.

- [x] **AC-6 (ledger + state machine):** The policy SHALL define append-only ledger requirements and canonical lifecycle states with `revoked` exception.
  - **Pass when:** lifecycle `proposed -> verified -> approved -> recognized -> convertible -> converted -> settled` plus `revoked` and append-only correction rules are explicit.
  - **Fail when:** states are missing or records can be edited in place.

- [x] **AC-7 (dispute + conversion model):** The policy SHALL require a 14-day challenge window and auditable dispute outcomes, and SHALL define conversion rate as `P / totalEligibleCU_at_snapshot`.
  - **Pass when:** challenge/dispute and conversion model are both explicit and normative.
  - **Fail when:** either dispute auditability or snapshot conversion formula is missing.
