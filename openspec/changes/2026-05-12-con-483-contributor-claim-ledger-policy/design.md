# Design: CON-483 Contributor Claim Ledger and Activation Policy

## 1) Architecture intent

Define a deterministic contributor-claim ledger that:

- records verifiable contribution recognition pre-activation,
- prevents concentration and double counting,
- preserves full auditability through append-only events,
- and only enables conversion after explicit Mainnet, payout, treasury, and governance gates are satisfied.

The design enforces a strict boundary between:

- **pre-activation recognition** (`CU` as non-monetary accounting units), and
- **post-activation conversion** (governance-ratified allocation process).

## 2) Contribution taxonomy (base CU constants)

| Category key            | Category description                                      | Base CU |
| ----------------------- | --------------------------------------------------------- | ------- |
| `CORE_PROTOCOL_CODE`    | Core protocol/code delivery (merged PRs with tests)       | `8`     |
| `SECURITY_HARDENING`    | Accepted vulnerability fix/report                         | `12`    |
| `RELIABILITY_OPS`       | Incident mitigation, reliability fixes, runbooks          | `6`     |
| `PRODUCT_DOCS_RESEARCH` | Accepted specs, architecture docs, research docs          | `4`     |
| `COMMUNITY_ENABLEMENT`  | Support/onboarding/QA coordination with accepted outcomes | `3`     |

These constants are versioned policy inputs and MUST NOT change without governance-approved policy revision.

## 3) Eligibility and evidence rules

A claim entry is eligible only if all conditions are true:

1. **Tracked artifact:** linked to a canonical artifact (`GitHub`, `Linear`, or approved runbook/spec task).
2. **Verifiable evidence:** at least one immutable evidence reference exists (commit/PR diff/review, accepted document, incident report).
3. **Maintainer verification flow:** claim passes `proposed -> verified -> approved`.
4. **Identity normalization:** contributor identifier is canonical `ubi:btc:{id}`.

### 3.1 Evidence minimum payload

Each claim must include an `evidence[]` array with at least one object containing:

- `type` (`commit`, `pull_request`, `review`, `issue`, `incident_report`, `doc`, `runbook`),
- `uri` (canonical permalink),
- `capturedAt` (UTC timestamp),
- optional `digest` (hash for immutable snapshots when available).

## 4) Deterministic claim-unit formula

### 4.1 Multiplier tables

`impactMultiplier` (basis points):

- `MINOR = 50`
- `STANDARD = 100`
- `HIGH = 150`
- `CRITICAL = 200`

`qualityMultiplier` (basis points):

- `REJECTED = 0`
- `PARTIAL_REWORK = 70`
- `ACCEPTED = 100`
- `ACCEPTED_REUSED = 120`

### 4.2 Exact computation

To eliminate floating-point drift, CU is computed in integer hundredths:

- `awardedCuHundredths = (baseCu * impactBps * qualityBps) / 100`
- `awardedCU = awardedCuHundredths / 100`

For current policy constants, `awardedCuHundredths` is always integral.

## 5) Guardrails

### 5.1 Anti-concentration (pre-activation)

Before activation, recognized CU per contributor is capped at `40 CU` per UTC month:

- `monthlyCapHundredths = 4000`
- `remainingCap = max(0, monthlyCapHundredths - recognizedMonthToDateHundredths)`
- `recognizedCuHundredths = min(awardedCuHundredths, remainingCap)`
- `deferredCuHundredths = awardedCuHundredths - recognizedCuHundredths`

If `deferredCuHundredths > 0`, the system MUST append a `CAP_DEFERRED` audit event.

### 5.2 Anti-double-counting

- A contributor may have only one primary category per `(contributorId, artifactRef)`.
- Claims for the same `(contributorId, artifactRef)` in multiple categories MUST be rejected unless prior entry is `REVOKED`.
- Shared artifacts across multiple contributors are allowed, but each contributor entry MUST carry independent evidence attribution.

## 6) Append-only ledger schema

Each `ClaimLedgerEntry` is immutable after creation except for appending state-transition metadata/events.

Required top-level fields:

- `entryId`
- `contributorId`
- `artifactRef`
- `category`
- `impactMultiplierBps`
- `qualityMultiplierBps`
- `awardedCuHundredths`
- `recognizedCuHundredths`
- `status`
- `reviewers`
- `timestamps`
- `evidence[]`
- `notes`

### 6.1 Supporting objects

- `reviewers`: `proposedBy`, `verifiedBy`, `approvedBy`, optional `revokedBy`
- `timestamps`: `proposedAt`, optional `verifiedAt`, `approvedAt`, `recognizedAt`, `convertedAt`, `settledAt`, `revokedAt`
- `artifactRef`: `system`, `id`, `url`

### 6.2 Event stream

State and governance actions are represented as append-only events:

- `CLAIM_PROPOSED`
- `CLAIM_VERIFIED`
- `CLAIM_APPROVED`
- `CLAIM_RECOGNIZED`
- `CLAIM_CONVERTIBLE`
- `CLAIM_CONVERTED`
- `CLAIM_SETTLED`
- `CLAIM_DISPUTED`
- `CLAIM_REVOKED`
- `CAP_DEFERRED`

## 7) Ledger state machine

Primary path:

`proposed -> verified -> approved -> recognized(pre-activation) -> convertible(post-activation) -> converted -> settled`

Dispute path:

- `approved|recognized|convertible -> disputed`
- `disputed -> approved` (challenge denied) or `disputed -> revoked` (challenge upheld)

Terminal exception state:

- `revoked` (reason required: fraud, plagiarism, sybil-confirmed, or falsified evidence)

## 8) Disputes and revocations

- Challenge window is `14 days` from `approvedAt`.
- A dispute MUST append `CLAIM_DISPUTED` with challenger identifier and rationale.
- Revocation MUST append `CLAIM_REVOKED` with reviewer identity, reason code, and supporting evidence.
- Revoked claims MUST be excluded from conversion eligibility and payout settlement.

## 9) Activation policy gates (fail-closed)

Global conversion activation is allowed only when all are true:

1. **Mainnet stability:** production Mainnet has operated for at least `60` consecutive days.
2. **Audited payout path active:** payout routing is audited and production control `BOUNTY_PAYOUT_ACTIVE=true` is enabled.
3. **Treasury runway:** governance-approved post-allocation runway remains at least `6 months`.
4. **Governance ratification:** governance ratifies activation and records snapshot coordinates (`H_activate`, `T_activate`).

If any gate is false, conversion MUST remain blocked.

## 10) Snapshot-based conversion model

At activation:

1. Freeze eligible recognized CU at governance-ratified snapshot (`H_activate`, `T_activate`).
2. Ratify one fixed conversion pool `P` (token units or payout credits).
3. Compute global conversion rate:
   - `conversionRate = P / totalEligibleCuAtSnapshot`
4. Compute contributor allocation:
   - `allocationContributor = eligibleCuContributor * conversionRate`

### 10.1 Post-snapshot integrity rules

- No retroactive category rewrites after snapshot.
- Disputes resolved after snapshot MUST be represented through append-only compensating entries.
- Conversion calculations MUST use snapshot-frozen eligibility only.

## 11) Pre-activation non-binding language

Before activation, CU entries are recognition records only.

They MUST NOT be interpreted as:

- guaranteed bounty amounts,
- enforceable token payout promises,
- or treasury obligations prior to governance-ratified activation.

Any historical pre-activation bounty language is non-binding unless explicitly re-ratified during activation governance.
