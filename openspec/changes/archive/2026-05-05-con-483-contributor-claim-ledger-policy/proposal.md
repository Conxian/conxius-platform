# Proposal: CON-483 Contributor Claim Ledger Policy

## Goal

Define a deterministic contributor-claim policy that recognizes work pre-activation through non-monetary Claim Units (CU), then allows controlled post-activation conversion using governance-approved gates and a snapshot-based model.

## Problem

Issue #509 identifies a policy gap: contribution recognition and future conversion are not yet codified in one normative artifact. Without a clear policy, contributors and maintainers can interpret eligibility, CU scoring, and activation conditions inconsistently, creating governance and treasury risk.

## Scope

This change defines the canonical policy for:

1. Contributor taxonomy and base CU values.
2. Eligibility requirements (tracked artifacts, evidence, maintainer workflow, normalized identity format).
3. CU award formula and multiplier model.
4. Guardrails for pre-activation behavior and anti-double-counting.
5. Append-only claim ledger fields and lifecycle state machine.
6. Challenge/dispute handling with auditable outcomes.
7. Activation gates and snapshot conversion model.

## Out of scope

- Any payout promise or disbursement behavior before activation gates are satisfied.
- Treasury pool sizing decisions beyond the fixed conversion pool value `P` approved by governance.
- UI implementation details for claim submission or dashboard presentation.
- Retroactive mutation of historical ledger entries.

## Deliverables

- `openspec/changes/2026-05-05-con-483-contributor-claim-ledger-policy/proposal.md`
- `openspec/changes/2026-05-05-con-483-contributor-claim-ledger-policy/design.md`
- `openspec/changes/2026-05-05-con-483-contributor-claim-ledger-policy/tasks.md`
- `openspec/specs/contributor-claim-ledger-policy.spec.md`

## Locked decisions

1. **Pre-activation CU are recognition-only:** CU accrued before activation are non-monetary and MUST NOT be represented as a payout commitment.
2. **Activation requires all gates:** activation is valid only when all of the following are true:
   - mainnet has operated stably for at least 60 days,
   - audited payout path is enabled with `BOUNTY_PAYOUT_ACTIVE=true`,
   - treasury runway approval confirms at least 6 months runway after planned allocation,
   - governance ratifies activation and records snapshot height `H_activate`.
3. **Conversion uses fixed pool + snapshot rate:** conversion uses fixed pool `P` and snapshot rate `P / totalEligibleCU_at_snapshot` at `H_activate`.
