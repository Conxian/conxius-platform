# CON-483: Contributor Claim Ledger and Activation Policy

## Goal

Define a concrete, auditable contributor-recognition policy that tracks contribution value before payout activation and enables deterministic post-activation conversion only when explicit governance and treasury gates are satisfied.

## Problem

Issue [#509](https://github.com/Conxian/conxius-platform/issues/509) identified ambiguity in contributor-claims language. Prior discussions established policy intent, but the repository lacked canonical OpenSpec artifacts that make the rules enforceable and non-ambiguous.

Without a concrete policy spec, pre-activation Claim Units (CU) risk being interpreted as premature payout commitments instead of recognition-only accounting.

## Scope

This change set defines and locks:

1. Contribution categories and base CU constants.
2. Eligibility, verification workflow, and evidence requirements.
3. Deterministic CU computation, multiplier tables, and anti-concentration guardrails.
4. Anti-double-counting constraints (single primary category per artifact per contributor).
5. Append-only claim ledger schema and deterministic state machine.
6. Dispute/revocation lifecycle and audit requirements.
7. Activation gates for conversion unlock:
   - Mainnet stability window,
   - audited payout path including `BOUNTY_PAYOUT_ACTIVE=true`,
   - treasury runway threshold,
   - governance ratification of activation snapshot.
8. Snapshot-based conversion model and explicit non-binding language for pre-activation claims.

## Out of scope

- Runtime code implementation of ledger storage, workflows, or conversion execution.
- Retroactive category rewrites after the activation snapshot (except auditable dispute outcomes).
- Defining payout tokenomics amount (`P`) before governance ratification.

## Deliverables

- `openspec/changes/2026-05-12-con-483-contributor-claim-ledger-policy/proposal.md`
- `openspec/changes/2026-05-12-con-483-contributor-claim-ledger-policy/design.md`
- `openspec/changes/2026-05-12-con-483-contributor-claim-ledger-policy/tasks.md`
- `openspec/specs/contributor-claim-ledger-policy.spec.md`

## Policy decisions locked by this change

- Pre-activation CU are recognition-only units and do not constitute token/fiat payout promises.
- CU scoring uses deterministic constants and formulas only; discretionary multipliers are disallowed.
- Monthly pre-activation concentration limit is capped at 40 CU recognized per contributor (UTC month basis).
- Conversion remains fail-closed until all activation gates are true.
- Conversion rate is computed once from governance-ratified pool `P` and snapshot total eligible CU.
- Historical auditability is append-only; revocations and disputes are recorded as events, not destructive edits.

## Source context

- Issue: https://github.com/Conxian/conxius-platform/issues/509
- Draft policy comment: https://github.com/Conxian/conxius-platform/issues/509#issuecomment-4376566031
- OpenSpec skeleton comment: https://github.com/Conxian/conxius-platform/issues/509#issuecomment-4376785592
