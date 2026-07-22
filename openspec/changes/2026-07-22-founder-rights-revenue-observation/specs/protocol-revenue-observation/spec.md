# Capability: Protocol Revenue Observation and Founder-Rights Evidence

## ADDED Requirements

### Requirement: Authority and provenance MUST distinguish observation from ratification

The platform MUST represent source, proposal, and approved protocol authority as
distinct states. Every authority claim MUST reference repository/ref/commit
provenance and evidence. A proposal or source-only artifact MUST NOT be
reported as ratified, active founder compensation, or payout-enabled.
When authority is `approved` with `ratified` status, its approval evidence list
MUST be non-empty and every referenced evidence record MUST use the explicit
`approval` kind; source, proposal, or generic governance evidence is
insufficient.

#### Scenario: Source implementation is observed without approval

- **GIVEN** a protocol source artifact contains a fee or beneficiary reference
- **WHEN** the platform creates an observation snapshot
- **THEN** authority is `source` with `not-applicable` approval status
- **AND** founder compensation remains non-active unless independent ratified
  protocol approval evidence exists

#### Scenario: Proposed rights are not ratified

- **GIVEN** a governance proposal describes founder compensation
- **WHEN** no protocol ratification evidence is present
- **THEN** the snapshot uses `proposal` with an unratified or unresolved status
- **AND** the validator rejects any active compensation or payout claim

#### Scenario: Source evidence is relabeled as approval

- **GIVEN** an authority record points `approval_evidence_ids` at a `source`,
  `proposal`, or generic `governance` evidence record
- **WHEN** validation runs
- **THEN** validation fails closed as invalid authority

### Requirement: Fee units, denominators, and rates MUST be explicit integers

The observation MUST identify the fee-base kind, asset, smallest-unit
representation, integer basis-point rates, and denominator. The platform MUST
NOT infer units, denominators, rounding, or a fee policy from display text.

#### Scenario: Ambiguous fee unit is supplied

- **GIVEN** a snapshot omits the asset-smallest-unit representation or uses an
  ambiguous unit
- **WHEN** validation runs
- **THEN** validation fails closed with an ambiguous-unit error

#### Scenario: Non-canonical denominator is supplied

- **GIVEN** a fee rate or schedule uses a denominator other than 10,000 bps
- **WHEN** validation runs
- **THEN** validation fails closed and no payout gate can be enabled

### Requirement: Deployment stages MUST be supported by fresh evidence

The observation MUST distinguish source-only, plan, preflight, broadcast,
confirmed, and live-interface-verified stages. Confirmation requires a
transaction reference, confirmation evidence, and a Bitcoin burn-block height.
Live-interface verification additionally requires interface/source evidence.
Evidence MUST be referenced, time-bounded, and fresh at validation time.
Timestamps MUST use the strict UTC profile `YYYY-MM-DDTHH:mm:ss.sssZ`, represent
real Gregorian calendar dates, and be validated before freshness calculations.

#### Scenario: A deployment plan is mistaken for a live deployment

- **GIVEN** only source, plan, or preflight evidence is available
- **WHEN** a caller attempts to report a confirmed or live status
- **THEN** validation fails closed

#### Scenario: Evidence has expired

- **GIVEN** the snapshot or one of its referenced evidence records is expired or
  older than the configured observation window
- **WHEN** validation runs
- **THEN** validation fails closed as stale evidence

### Requirement: Protocol routing ownership and custody boundaries MUST be preserved

Collector, distributor, and authorized-source endpoints MUST remain
protocol-owned and explicitly authorized. A verified endpoint MUST have a
non-empty evidence reference list whose records use the endpoint's allowed
collector, distributor, or source route kinds. The platform substitution flag
and custody claim MUST always be false.

#### Scenario: Verified route has no evidence

- **GIVEN** a collector, distributor, or authorized source is marked `verified`
  with an empty evidence list
- **WHEN** validation runs
- **THEN** validation fails closed as missing evidence

#### Scenario: Platform supplies its own collector

- **GIVEN** a snapshot names a platform-owned collector or distributor
- **WHEN** validation runs
- **THEN** validation fails closed as collector substitution

#### Scenario: Snapshot asserts custody

- **GIVEN** a snapshot claims that the platform holds or controls routed funds
- **WHEN** validation runs
- **THEN** validation fails closed and the observation is rejected

### Requirement: Compensation schedules and payout eligibility MUST fail closed

Active compensation MUST require ratified protocol authority, a disclosed
non-PII beneficiary reference, a verified route, and a resolved schedule with
exact burn-height boundaries. Payout MUST additionally require live-interface
verification, a resolved fee schedule, verified protocol collector/distributor
and source authorization, a non-empty payout evidence list with allowed
route/interface/approval kinds, and fresh route evidence.

#### Scenario: Unresolved schedule is reported active

- **GIVEN** a compensation track has an unresolved or boundary-free schedule
- **WHEN** the track is reported as active
- **THEN** validation fails closed

#### Scenario: Payout is enabled before all gates pass

- **GIVEN** a snapshot sets `payout_enabled` to true before ratification,
  confirmation, live-interface verification, or verified routes
- **WHEN** validation runs
- **THEN** validation fails closed with a payout-not-eligible error

#### Scenario: Enabled payout has no evidence

- **GIVEN** a snapshot satisfies the other payout gates but sets
  `payout_enabled` to `true` with an empty `evidence_ids` list
- **WHEN** validation runs
- **THEN** validation fails closed with a payout-not-eligible error

### Requirement: The validator MUST be pure and side-effect-free

The reference validator MUST accept a snapshot and explicit comparison time,
perform structural and semantic checks, and return the validated snapshot or a
typed error. It MUST NOT perform network, filesystem, process, custody, or
mutation operations.

#### Scenario: Validation runs in an isolated test

- **GIVEN** only an in-memory snapshot and explicit current time
- **WHEN** validation runs
- **THEN** the result is deterministic and no external service is contacted
