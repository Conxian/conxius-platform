# Specification: Contributor Claim Ledger Policy

## 1. Overview

This specification defines normative requirements for contributor claim recognition and post-activation conversion.

Before activation, Claim Units (CU) are recognition-only and non-monetary. Monetary conversion is permitted only after all activation gates are satisfied and a governance snapshot height `H_activate` is recorded.

## 2. Normative language

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are interpreted as normative requirements.

## 3. Taxonomy and CU calculation

### 3.1 Base CU by category

Implementations MUST use these base CU values:

- `code = 8`
- `security = 12`
- `reliability_ops = 6`
- `product_docs_research = 4`
- `community = 3`

Each artifact MUST map to exactly one primary category.

### 3.2 Formula

CU awards MUST be computed as:

`awardedCU = baseCU(category) × impactMultiplier × qualityMultiplier`

Allowed multipliers:

- `impactMultiplier ∈ {0.5, 1.0, 1.5, 2.0}`
- `qualityMultiplier ∈ {0.0, 0.7, 1.0, 1.2}`

`qualityMultiplier=0.0` MUST NOT produce recognized CU.

## 4. Eligibility and workflow

A claim MUST include all of the following:

1. Tracked artifact reference (`artifactRef`) with stable identifier/permalink.
2. Auditable evidence bundle (`evidenceRefs`).
3. Maintainer review workflow completion: `proposed -> verified -> approved`.
4. Normalized contributor identity `contributorId` in `ubi:btc:{id}` format.

Claims missing any required element MUST NOT transition to `recognized`.

## 5. Pre-activation guardrails

Before activation:

1. CU MUST be recognition-only and MUST NOT be represented as a payout commitment.
2. Recognized CU per contributor MUST NOT exceed `40 CU` per UTC calendar month.
3. One artifact MUST NOT receive CU under more than one primary category.

## 6. Append-only ledger requirements

The claim ledger MUST be append-only.

Required fields per entry:

- `ledgerEntryId`
- `claimId`
- `contributorId`
- `artifactRef`
- `primaryCategory`
- `baseCU`
- `impactMultiplier`
- `qualityMultiplier`
- `awardedCU`
- `state`
- `stateReason`
- `evidenceRefs`
- `reviewerIds`
- `createdAt`
- `createdBy`

Optional activation/conversion/settlement fields:

- `supersedesLedgerEntryId`
- `activationSnapshotHeight`
- `conversionRate`
- `convertedAmount`
- `settlementRef`

Corrections and dispute outcomes MUST be recorded as new ledger events referencing prior entries; in-place edits are forbidden.

## 7. State machine

Canonical state flow:

`proposed -> verified -> approved -> recognized -> convertible -> converted -> settled`

Exception state: `revoked`

State requirements:

- `recognized` is pre-activation recognition state.
- `convertible` is reachable only after activation.
- `revoked` MAY be entered from any non-settled state when invalidity or policy breach is proven.
- Terminal settlement state is `settled`.

## 8. Challenge and dispute policy

- Every `recognized` claim MUST support a 14-day challenge window.
- Disputes MUST produce auditable outcomes with explicit decision (`upheld`, `adjusted`, `revoked`) and evidence references.
- `adjusted` or `revoked` outcomes MUST create append-only corrective ledger events.

## 9. Activation gates

Activation MUST require all conditions:

1. mainnet stability of at least 60 days,
2. audited payout path enabled with `BOUNTY_PAYOUT_ACTIVE=true`,
3. treasury runway approval confirming at least 6 months runway post-allocation,
4. governance ratification that records `H_activate`.

If any gate is unmet, conversion MUST NOT be enabled.

## 10. Conversion model

Upon activation:

- Governance MUST define a fixed conversion pool `P`.
- `totalEligibleCU_at_snapshot` MUST be computed at `H_activate` from non-revoked eligible CU.
- Conversion rate MUST be:

`conversionRate = P / totalEligibleCU_at_snapshot`

Per-claim conversion MUST use snapshot CU:

`convertedAmount = eligibleCU_at_snapshot × conversionRate`

Pre-activation CU records MUST NOT be interpreted as guaranteed payout amounts.
