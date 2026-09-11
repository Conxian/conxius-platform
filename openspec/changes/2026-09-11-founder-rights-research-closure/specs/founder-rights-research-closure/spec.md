# Founder-Rights Research Closure Capability

## ADDED Requirements

### Requirement: Platform research closure without economic ratification
The platform MUST publish a research-closure package for issue #1168 that records
the proposed builder decay model as proposal-only evidence and MUST NOT treat that
package as ratified economic policy, custody authority, or payout authorization.

#### Scenario: Recording the proposed decay schedule as proposal evidence
- **GIVEN** issue #1168 describes a builder share decaying from 2.5% to 0.75% of protocol fees
- **WHEN** the research-closure fixture is validated
- **THEN** the snapshot MUST use `policy_authority.kind: proposal`, keep compensation non-active, keep `custody_claim: false`, and keep `payout_enabled: false`.

#### Scenario: Rejecting proposal evidence promoted to active payout
- **GIVEN** the issue #1168 proposal observation fixture
- **WHEN** an operator mutates it to claim active compensation or enabled payout without ratified authority
- **THEN** the existing protocol-revenue observation validator MUST fail closed.

### Requirement: Explicit governance decision handoff
The platform MUST publish an owner decision checklist that lists the remaining
protocol, legal, and deployment decisions required before any founder/builder
revenue route can be treated as ratified, without selecting those decisions in
this repository.

#### Scenario: Listing remaining owner decisions
- **GIVEN** platform observation research for issue #1168 is complete
- **WHEN** an operator reads the research-closure handoff
- **THEN** the document MUST identify remaining decisions (denominator, implementation path, burn-height schedule, beneficiary/multi-sig, launch boundary, legal review) with owning repository and unresolved status.
