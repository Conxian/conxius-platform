# Protocol Revenue Observation and Founder-Rights Evidence v1

## 1. Purpose and authority

This specification defines a machine-readable, fail-closed observation boundary
for protocol revenue and founder-rights status. It records evidence available to
the platform at an observation time; it does not ratify a policy, create a
beneficiary right, authorize a payout, or prove a deployment without the
required evidence.

`Conxian/Conxian` is the owner of Clarity semantics, protocol economic policy,
governance ratification, canonical on-chain state, deployment, and protocol
payout behavior. The Gateway is the platform-facing interface for observed
protocol state and routing/business logic. `conxius-platform` owns this
observation validator and operational fail-closed controls. No layer may use
this specification to bypass protocol governance.

This specification does not adopt the proposals in platform issue #1168 or
protocol issue #488 and does not resolve protocol issue #538.

## 2. Snapshot envelope

An implementation MUST conform to
[`schemas/protocol-revenue-observation.schema.json`](../../schemas/protocol-revenue-observation.schema.json)
and use schema identifier `conxian.protocol-revenue-observation.v1` with an
explicit semantic version. A snapshot MUST include:

- observation and expiry timestamps;
- policy authority and repository/ref/commit provenance;
- fee base, asset, denominator, and integer bps rates;
- founder and builder compensation status;
- deployment stage and evidence;
- protocol-owned routing endpoints;
- Bitcoin burn-block anchor;
- payout gate and reason;
- `custody_claim: false`; and
- evidence records with stable IDs and URLs or external IDs.

Unknown fields MUST be rejected by the schema and reference validator.

## 3. Authority and provenance

Authority has three classes:

1. `source` identifies protocol implementation or source evidence and has no
   ratification status.
2. `proposal` identifies a proposed or unresolved governance claim and cannot
   be active.
3. `approved` identifies protocol governance approval evidence and MUST have
   `ratified` status and approval evidence.

The authority provenance role MUST match the class. Each provenance record MUST
include repository, ref, full commit SHA, safe relative artifact path, role, and
evidence IDs. A platform document, UI label, or Gateway fallback cannot be
substituted for protocol authority.

## 4. Units and rates

Fee bases MUST identify an asset and use integer `asset-smallest-units`. Rates
MUST be non-negative integer `rate_bps` values with explicit
`denominator_bps: 10000`. The validator MUST reject ambiguous units, floats,
missing denominators, or alternate implicit scales. This contract records
observations and does not choose which observed protocol rate is authoritative.

Resolved fee and compensation schedules MUST use exact burn-block-height
boundaries. An unresolved schedule MUST carry null boundaries and MUST NOT
support active compensation or payout.

## 5. Freshness and Bitcoin anchor

Every snapshot MUST provide `observed_at` and `expires_at`; expiry MUST be after
observation time and after the validator's comparison time. Referenced evidence
MUST exist, be no newer than the snapshot, and be within the configured maximum
age. A snapshot MUST include the observed Bitcoin burn-block height, observation
time, and evidence ID. Stale, missing, or future-dated evidence MUST fail
closed.

## 6. Deployment stages

The allowed stages are:

- `source-only`: source evidence, no deployment claim;
- `plan`: a deployment plan exists;
- `preflight`: deployment preconditions were checked;
- `broadcast`: a transaction reference and broadcast evidence exist;
- `confirmed`: confirmation evidence and a confirmed burn-block height exist;
- `live-interface-verified`: confirmed deployment plus live interface/source
  evidence exists.

Only the final stage can satisfy the deployment gate for payout. A plan,
preflight, broadcast, or repository manifest is not confirmation. A confirmed
stage is not live-interface verification.

## 7. Compensation and routing

An active compensation track MUST have ratified protocol authority, a disclosed
non-PII beneficiary reference, a verified route state, and a resolved exact
schedule. The reference may identify an evidence record, repository path,
governance record, or on-chain reference; it MUST NOT embed PII in the snapshot.

Collector, distributor, and authorized-source endpoints MUST have
`owner_scope: protocol`. Endpoint authorization and evidence are separate from
the platform's operational flags. `platform_substitution` MUST be `false`.

## 8. Payout gate and custody

`payout_enabled: true` is valid only when all of the following are observed:

1. policy authority is approved and ratified;
2. fee policy schedule is resolved with exact windows;
3. at least one compensation track is active and satisfies section 7;
4. deployment is `live-interface-verified`;
5. collector, distributor, and every authorized source are verified;
6. payout evidence is fresh and has an allowed route/approval/interface kind;
   and
7. payout route state is verified.

The gate is an observation result, not a payment instruction. The platform MUST
not claim custody, hold a protocol collector balance, or replace the protocol
route. `custody_claim` is always `false`.

## 9. Purity and failure behavior

The reference validator MUST be deterministic for the same input and explicit
comparison time. It MUST have no network, filesystem, process, custody, or
mutation side effects. It MUST fail closed on malformed structure, unknown
fields, missing references, stale evidence, authority mismatch, ambiguous
units, invalid denominators, unresolved active schedules, incomplete deployment
evidence, collector substitution, custody claims, and ineligible payouts.

Returning a validated snapshot means only that the supplied evidence satisfies
this observation contract. It does not assert legal status, protocol
governance validity, beneficiary entitlement, or mainnet deployment beyond the
evidence explicitly supplied.
