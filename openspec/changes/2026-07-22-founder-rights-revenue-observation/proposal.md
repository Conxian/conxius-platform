# OpenSpec Proposal: Founder-Rights Revenue Observation and Evidence Contract

**Date**: 2026-07-22
**Status**: Proposed platform observation contract; protocol governance and deployment remain unresolved
**Trigger**: [Conxian/conxius-platform#1168](https://github.com/Conxian/conxius-platform/issues/1168) and the [selected candidate comment](https://github.com/Conxian/conxius-platform/issues/1168#issuecomment-5050732992)
**Related platform alignment**: [Conxian/conxius-platform#1167](https://github.com/Conxian/conxius-platform/issues/1167)
**Protocol follow-up**: [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538) and unresolved proposal [Conxian/Conxian#488](https://github.com/Conxian/Conxian/issues/488)

## Why

Cross-repository review found multiple observed or proposed economic models:
the protocol source contains a legacy 100 bps implementation baseline, a
separate collector contains a 200/150/100 bps schedule, the treasury source
contains a 45/30/15/5/5/0 allocation, and platform, Gateway, and core documents
describe additional models. Founder-vault behavior and deployment evidence are
also incomplete. These artifacts cannot safely be collapsed into an approved,
active, or payout-enabled founder-rights claim.

The safe Phase 4 candidate is therefore an observation boundary, not an
economic decision. It records authority, provenance, units, deployment stage,
routing ownership, evidence freshness, and payout eligibility in a
machine-readable form. A pure validator fails closed when the evidence is
ambiguous, stale, incomplete, substituted, or unresolved.

## What changes

1. Add a versioned JSON Schema for observed protocol revenue and founder-rights
   status snapshots.
2. Add a zero-network, side-effect-free TypeScript validator with semantic
   invariants beyond the schema.
3. Add focused tests for observed-only success and fail-closed cases.
4. Add a canonical OpenSpec capability contract and a dated research/evidence
   report that records the cross-repository contradictions and ownership.
5. Update active gap/scoring documents and append the required session log.

## Ownership and boundary

- `Conxian/Conxian` owns Clarity semantics, fee and allocation policy,
  beneficiary authority, governance ratification, deployment, canonical
  on-chain state, and protocol payout behavior.
- The Gateway remains the platform-facing authority for observed protocol state
  and routing/business logic. A future adapter may consume this contract, but it
  must not invent a competing fee calculation or replace protocol collector or
  distributor endpoints.
- `conxius-platform` owns observation validation, operational feature flags,
  evidence presentation, and fail-closed payout disablement. It does not hold
  custody or execute protocol governance.

## Explicit non-goals

This change does **not**:

- ratify issue #1168, issue #1167, or any founder-rights proposal;
- choose or change a fee percentage, allocation, beneficiary, or compensation
  schedule;
- add or change Clarity, deploy a contract, verify a mainnet deployment, or
  claim a confirmed live interface without evidence;
- create custody, a payout route, a treasury ledger, or a platform collector;
- decide legal, tax, securities, money-transmission, sanctions, or other
  regulatory questions; or
- replace protocol governance, protocol tests, or protocol issue #538/#488.

## Arithmetic clarification

The report and tests use explicit integer/basis-point semantics. For the
illustrative scenario in which a builder share is 2.5% of a 1% protocol fee:

```text
builder share of gross volume = 0.025 × 0.01 = 0.00025
$84,000 / 0.00025 = $336,000,000 gross volume per year
$336,000,000 × 0.01 = $3,360,000 protocol fee revenue
```

This is a corrected scenario calculation, not an adopted fee or compensation
policy.

## Acceptance criteria

- **AC-1 — Authority**: source, proposal, and approved authority are distinct;
  proposed or unratified founder rights cannot be active.
- **AC-2 — Provenance and units**: every policy observation has repository,
  ref, full commit, artifact path, explicit asset-smallest-unit fee base, and
  integer bps denominator/rates.
- **AC-3 — Deployment evidence**: source-only, plan, preflight, broadcast,
  confirmed, and live-interface-verified are distinct; only confirmed evidence
  can claim confirmation, and live status requires interface/source evidence.
- **AC-4 — Routing and custody**: collector, distributor, and authorized source
  endpoints remain protocol-owned; platform substitution is always false and
  custody claims are always false.
- **AC-5 — Freshness**: missing, unknown, expired, or stale evidence fails
  closed against an explicit observation time and expiry window.
- **AC-6 — Schedules**: active compensation requires exact burn-height windows;
  unresolved schedules cannot be treated as active.
- **AC-7 — Payout gate**: payout cannot be enabled before ratified authority,
  resolved schedule, live-interface verification, verified protocol routes, and
  fresh evidence.
- **AC-8 — Purity**: the validator performs no network, filesystem, process, or
  mutation work.

## Follow-up outside this change

Protocol maintainers and governance must decide whether any economic policy is
approved, implement and test it in `Conxian/Conxian`, and provide independently
verifiable deployment and interface evidence. A future Gateway integration must
be separately specified and must remain read-only and protocol-owned.
