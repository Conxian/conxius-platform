# Specification: Contributor Claim Ledger and Activation Policy

## 1. Overview

This specification defines normative requirements for contributor claim recognition and post-activation conversion in the Conxius platform.

Before activation, Claim Units (CU) are recognition-only and non-monetary. Monetary conversion is permitted only after all activation gates are satisfied and governance records activation snapshot coordinates (`H_activate`, optional `T_activate`).

The policy provides deterministic scoring, append-only auditability, and a fail-closed activation boundary between:

- pre-activation recognition accounting, and
- post-activation conversion to governance-ratified payout allocations.

## 2. Normative terms

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** indicate normative requirements.

## 3. Contribution taxonomy and base CU

### 3.1 Category constants

The policy MUST define the following contribution categories with fixed base Claim Units (`baseCu`):

| Category key            | Description                                               | Base CU |
| ----------------------- | --------------------------------------------------------- | ------- |
| `CORE_PROTOCOL_CODE`    | Core protocol/code delivery (merged PRs with tests)       | `8`     |
| `SECURITY_HARDENING`    | Accepted vulnerability fix/report                         | `12`    |
| `RELIABILITY_OPS`       | Incident mitigation, reliability fixes, runbooks          | `6`     |
| `PRODUCT_DOCS_RESEARCH` | Accepted specs, architecture docs, research docs          | `4`     |
| `COMMUNITY_ENABLEMENT`  | Support/onboarding/QA coordination with accepted outcomes | `3`     |

Category constants MUST be treated as versioned policy data and MUST NOT be modified without governance ratification.

Each artifact MUST map to exactly one primary category.

## 4. Eligibility and evidence requirements

A claim MUST be eligible only when all conditions are satisfied:

1. Claim links to a tracked artifact (`GitHub`, `Linear`, or approved runbook/spec task).
2. Claim includes at least one verifiable evidence record.
3. Claim completes maintainer verification workflow (`proposed -> verified -> approved`).
4. Claim is attributed to normalized contributor identity format `ubi:btc:{id}`.

### 4.1 Evidence payload minimum

`evidence[]` MUST be non-empty. Each evidence object MUST include:

- `type` (`commit` | `pull_request` | `review` | `issue` | `incident_report` | `doc` | `runbook`),
- `uri` (canonical permalink),
- `capturedAt` (UTC timestamp).

Each evidence object MAY include `digest` for immutable archival proofs.

## 5. Deterministic claim-unit formula

### 5.1 Multiplier constants

`impactMultiplierBps`:

- `MINOR = 50` (`0.5`)
- `STANDARD = 100` (`1.0`)
- `HIGH = 150` (`1.5`)
- `CRITICAL = 200` (`2.0`)

`qualityMultiplierBps`:

- `REJECTED = 0` (`0.0`)
- `PARTIAL_REWORK = 70` (`0.7`)
- `ACCEPTED = 100` (`1.0`)
- `ACCEPTED_REUSED = 120` (`1.2`)

### 5.2 Exact calculation

To prevent floating-point drift, implementations MUST compute claim units in integer hundredths:

- `awardedCuHundredths = (baseCu * impactMultiplierBps * qualityMultiplierBps) / 100`
- `awardedCU = awardedCuHundredths / 100`

`qualityMultiplierBps = 0` MUST NOT produce recognized CU.

Implementations MUST NOT use discretionary overrides outside defined constants.

## 6. Anti-concentration and anti-double-counting guardrails

### 6.1 Pre-activation monthly concentration cap

Before global activation, recognized CU for a contributor MUST be capped to `40.00 CU` per UTC calendar month.

Implementations MUST apply:

- `monthlyCapHundredths = 4000`
- `remainingCap = max(0, monthlyCapHundredths - recognizedMonthToDateHundredths)`
- `recognizedCuHundredths = min(awardedCuHundredths, remainingCap)`
- `deferredCuHundredths = awardedCuHundredths - recognizedCuHundredths`

If `deferredCuHundredths > 0`, implementation MUST append a `CAP_DEFERRED` event with month key and deferred amount.

### 6.2 Anti-double-counting

- A contributor MUST have only one primary category per `(contributorId, artifactRef)`.
- A second claim for the same `(contributorId, artifactRef)` with different category MUST be rejected unless prior claim is terminal `REVOKED`.
- Multiple contributors MAY reference the same artifact only if each claim has independently verifiable evidence.

## 7. Append-only ledger schema

### 7.1 `ClaimLedgerEntry`

Each claim entry MUST include:

- `entryId` (or implementation-equivalent `ledgerEntryId`)
- `claimId`
- `contributorId`
- `artifactRef`
- `category` (or implementation-equivalent `primaryCategory`)
- `baseCu`
- `impactMultiplierBps`
- `qualityMultiplierBps`
- `awardedCuHundredths` (or implementation-equivalent `awardedCU`)
- `recognizedCuHundredths`
- `status` (or implementation-equivalent `state`)
- `stateReason`
- `reviewers` (or implementation-equivalent `reviewerIds`)
- `timestamps`
- `evidence[]` (or implementation-equivalent `evidenceRefs`)
- `createdAt`
- `createdBy`
- `notes`

### 7.2 Activation/conversion/settlement fields

Implementations MAY include:

- `supersedesEntryId` (or implementation-equivalent `supersedesLedgerEntryId`)
- `activationSnapshotHeight`
- `conversionRate`
- `convertedAmount`
- `settlementRef`

### 7.3 Sub-objects

`artifactRef` MUST include `system`, `id`, `url`.

`reviewers` MUST include `proposedBy`, `verifiedBy`, `approvedBy`; it MAY include `revokedBy`.

`timestamps` MUST include `proposedAt`; it MUST include additional transition times when corresponding transitions occur (`verifiedAt`, `approvedAt`, `recognizedAt`, `convertedAt`, `settledAt`, `revokedAt`).

### 7.4 Append-only mutation model

Implementations MUST NOT overwrite prior state transitions.

Every transition, dispute, cap deferment, correction, and revocation MUST be represented by an appended event record with:

- `eventId`
- `entryId`
- `eventType`
- `actorId`
- `occurredAt`
- `payload`

## 8. Claim state machine

### 8.1 Primary path

`proposed -> verified -> approved -> recognized(pre-activation) -> convertible(post-activation) -> converted -> settled`

### 8.2 Dispute/revocation path

Allowed dispute transitions:

- `approved -> disputed`
- `recognized -> disputed`
- `convertible -> disputed`

Dispute resolution transitions:

- `disputed -> approved` (claim upheld)
- `disputed -> approved` with corrective event payload (claim adjusted)
- `disputed -> revoked` (claim revoked)

`revoked` is a terminal exception state.

### 8.3 Transition safeguards

- A claim MUST NOT transition to `approved` unless Section 4 requirements are satisfied.
- A claim MUST NOT transition to `convertible` before global activation gates are all true.
- Revoked claims MUST NOT transition to `converted` or `settled`.

## 9. Disputes and revocations

- Challenge window MUST be `14 days` from `approvedAt`.
- Dispute submission MUST append `CLAIM_DISPUTED` with rationale and challenger identity.
- Dispute outcomes MUST be auditable with explicit decision: `upheld`, `adjusted`, or `revoked`.
- Revocation MUST append `CLAIM_REVOKED` with reason code and evidence.
- Allowed reason codes MUST include at least: `FRAUD`, `PLAGIARISM`, `SYBIL_CONFIRMED`, `EVIDENCE_FALSIFIED`.
- `adjusted` or `revoked` outcomes MUST create append-only corrective ledger events.
- Revoked claims MUST be excluded from conversion eligibility and settlement.

## 10. Activation gates (fail-closed)

Global conversion activation MUST remain blocked unless all gates are true:

1. Mainnet stability has been continuously satisfied for at least `60` days.
2. Payout routing path has current audit evidence and runtime gate `BOUNTY_PAYOUT_ACTIVE=true`.
3. Treasury attestation confirms at least `6` months operating runway after proposed allocation.
4. Governance ratifies activation and snapshot coordinates (`H_activate`, optional `T_activate`).

If any gate is false or unverifiable, conversion MUST remain disabled.

## 11. Snapshot-based post-activation conversion

At ratified activation:

1. Freeze eligible recognized CU at snapshot (`H_activate`, optional `T_activate`).
2. Ratify fixed conversion pool `P`.
3. Compute global conversion rate:
   - `conversionRate = P / totalEligibleCuAtSnapshot`
4. Compute each contributor allocation:
   - `allocationContributor = eligibleCuContributor * conversionRate`
5. Compute per-claim converted amount:
   - `convertedAmount = eligibleCuClaimAtSnapshot * conversionRate`

`totalEligibleCuAtSnapshot` MUST include only non-revoked, recognized CU at snapshot boundaries.

### 11.1 Post-snapshot integrity

- Implementations MUST NOT retroactively rewrite categories after snapshot.
- Post-snapshot dispute outcomes MUST be represented via append-only compensating records.
- Conversion calculations MUST NOT consume mutable post-snapshot CU changes.

## 12. Pre-activation non-binding language

Before activation, CU MUST be treated as recognition-only accounting units.

Pre-activation CU MUST NOT be interpreted as:

- guaranteed bounty payouts,
- enforceable token or fiat payment obligations,
- treasury commitments before governance-ratified activation.

Historical pre-activation bounty wording is non-binding unless explicitly ratified during activation governance.
