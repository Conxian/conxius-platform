# Design: CON-483 Contributor Claim Ledger Policy

## 1) Policy intent

The contributor claim ledger MUST provide deterministic, auditable recognition of contributor work before activation while explicitly preventing pre-activation monetary commitments. Conversion to payout eligibility is allowed only after activation gates are satisfied.

## 2) Taxonomy and base Claim Units (CU)

Each eligible artifact MUST be assigned one primary contribution category:

| Category                | Base CU |
| ----------------------- | ------: |
| `code`                  |       8 |
| `security`              |      12 |
| `reliability_ops`       |       6 |
| `product_docs_research` |       4 |
| `community`             |       3 |

## 3) Eligibility and contributor identity

A claim is eligible only when all requirements are met:

1. A tracked artifact exists (for example: merged PR, accepted issue resolution, security report, production incident response record, approved documentation/research artifact, or approved community program artifact).
2. Evidence is attached and auditable (artifact permalink, supporting references, reviewer notes).
3. Maintainer workflow is completed (`proposed -> verified -> approved`).
4. Contributor identity is normalized as `ubi:btc:{id}`.

Claims that fail any requirement MUST NOT receive CU.

## 4) CU award formula and multipliers

Awarded CU MUST be computed as:

`awardedCU = baseCU(category) × impactMultiplier × qualityMultiplier`

### 4.1 Impact multipliers

- `0.5` = low impact
- `1.0` = standard impact
- `1.5` = high impact
- `2.0` = critical impact

### 4.2 Quality multipliers

- `0.0` = rejected/invalid quality
- `0.7` = acceptable with significant remediation
- `1.0` = expected quality
- `1.2` = exceptional quality

If `qualityMultiplier = 0.0`, the claim MUST transition to `revoked` or remain non-eligible and MUST NOT generate recognized CU.

## 5) Guardrails

1. **Pre-activation non-monetary rule:** CU are recognition-only until activation gates are satisfied.
2. **Monthly cap:** recognized CU per contributor MUST NOT exceed `40 CU` per UTC calendar month before activation.
3. **Single primary category:** each artifact MUST map to exactly one primary category.

## 6) Append-only ledger model

The ledger MUST be append-only. Corrections MUST be recorded as new entries/events referencing prior records; in-place mutation is forbidden.

Minimum ledger fields:

- `ledgerEntryId`
- `claimId`
- `contributorId` (`ubi:btc:{id}`)
- `artifactRef` (permalink or canonical identifier)
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
- `supersedesLedgerEntryId` (optional, for corrections)
- `activationSnapshotHeight` (nullable until activation)
- `conversionRate` (nullable until conversion)
- `convertedAmount` (nullable until conversion)
- `settlementRef` (nullable until settlement)

## 7) State machine

Canonical lifecycle:

`proposed -> verified -> approved -> recognized (pre-mainnet) -> convertible (post-activation) -> converted -> settled`

Exception state: `revoked`

### 7.1 Transition constraints

- `proposed -> verified`: evidence and artifact validity confirmed.
- `verified -> approved`: maintainer approves category and multipliers.
- `approved -> recognized`: allowed pre-activation only; recognition is non-monetary.
- `recognized -> convertible`: allowed only after activation gates pass and `H_activate` is recorded.
- `convertible -> converted`: snapshot conversion applied.
- `converted -> settled`: payout pipeline reaches terminal settlement.
- `revoked`: may be entered from any non-settled state when fraud, invalid evidence, duplicate attribution, or governance reversal is proven.

## 8) Challenge window and disputes

- Every `recognized` claim MUST have a 14-day challenge window.
- Dispute records MUST be auditable and append-only.
- Dispute outcomes MUST be explicit (`upheld`, `adjusted`, `revoked`) and linked to evidence.
- `adjusted` and `revoked` outcomes MUST create corrective ledger events; historical entries remain immutable.

## 9) Activation gates and conversion model

Activation is valid only when all gates are satisfied:

1. mainnet stable for at least 60 days,
2. audited payout path enabled with `BOUNTY_PAYOUT_ACTIVE=true`,
3. treasury runway approval confirms at least 6 months runway post-allocation,
4. governance ratification records activation snapshot `H_activate`.

After activation, conversion MUST use:

- Fixed pool `P` (governance-approved).
- Snapshot total `totalEligibleCU_at_snapshot` computed at `H_activate`.
- Conversion rate: `conversionRate = P / totalEligibleCU_at_snapshot`.

Each eligible claim converts as:

`convertedAmount = eligibleCU_at_snapshot × conversionRate`

No pre-activation record may be interpreted as a guaranteed payout amount.
