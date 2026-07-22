# Design: Founder-Rights Revenue Observation and Evidence Contract

## 1. Boundary and data flow

```text
Conxian/Conxian
  ├─ protocol source, governance records, deployment records
  ├─ canonical contract state and contract-generated outcomes
  └─ protocol-owned collector/distributor/source authorization
              │ observed evidence; never replaced by the platform
              ▼
conxius-platform observation contract and validator
  ├─ normalize authority/provenance/unit/deployment evidence
  ├─ anchor observations to Bitcoin burn-block height and time
  ├─ fail closed on stale, incomplete, ambiguous, or substituted evidence
  └─ expose payout eligibility only as an observed gate, never as ratification
```

The root object is a snapshot, not a command. It describes what was observed
at a bounded time and what evidence supports that observation. It cannot grant
rights or move funds.

## 2. Authority classes

| Kind | Meaning | Allowed status | Active compensation |
| --- | --- | --- | --- |
| `source` | Protocol source or implementation evidence | `not-applicable` | Never |
| `proposal` | Governance proposal or source-only claim | `unratified`, `unresolved`, or `revoked` | Never |
| `approved` | Protocol governance approval evidence | `ratified` | Only after all other gates |

The validator requires the authority provenance role to match the class. This
prevents a repository path or proposal from being relabeled as approval.

## 3. Snapshot fields

- `observation`: observed/expiry timestamps and root evidence IDs.
- `policy_authority`: authority kind, approval status, protocol owner scope,
  provenance ID, and approval evidence IDs.
- `provenance`: repository, ref, full commit SHA, safe artifact path, role, and
  evidence IDs.
- `fee_policy`: fee-base kind, asset and decimals, explicit
  `asset-smallest-units`, integer `rate_bps`, fixed `denominator_bps=10000`,
  and exact or unresolved burn-height windows.
- `compensation`: founder and builder tracks, beneficiary disclosure reference
  without PII, route state, and exact or unresolved schedules.
- `deployment`: stage, environment, source provenance, transaction reference,
  confirmation burn height, deployment evidence, and interface evidence.
- `routing`: protocol-owned collector/distributor and authorized sources;
  `platform_substitution` is a schema-level constant `false`.
- `anchor`: observed Bitcoin burn-block height, observation time, and evidence.
- `payout`: an observed route state and boolean gate with evidence and reason;
  it is not a payment instruction.
- `custody_claim`: a schema-level constant `false`.
- `evidence`: stable evidence IDs with URLs or external IDs and observation
  timestamps.

## 4. Deployment stages

Stages are monotonic labels for evidence, not a deployment command:

| Stage | Permitted claim | Required evidence |
| --- | --- | --- |
| `source-only` | Source exists or describes behavior | Source evidence only |
| `plan` | A deployment plan exists | Plan evidence; no transaction/confirmation |
| `preflight` | Preconditions were checked | Preflight evidence; no transaction/confirmation |
| `broadcast` | A transaction was broadcast | Transaction reference and broadcast evidence |
| `confirmed` | A transaction is confirmed | Confirmation evidence and burn height |
| `live-interface-verified` | The live interface/source was observed | Confirmation plus interface/source evidence |

The validator rejects confirmation fields at earlier stages, requires a
transaction reference for broadcast-or-later stages, and refuses payout before
`live-interface-verified`.

## 5. Integer economics and schedule semantics

The contract does not carry currency floats. A fee base must identify its asset
and use smallest units. Rates are non-negative integer basis points with an
explicit 10,000 denominator. Compensation schedules use exact inclusive burn
height boundaries when resolved; an unresolved schedule must contain no
boundaries. The validator rejects overlapping windows and open-ended windows
that are not final.

## 6. Fail-closed behavior

The validator rejects:

- unknown fields, malformed IDs, missing references, invalid timestamps, or
  expired/stale evidence;
- source/proposal authority represented as ratified or active;
- ambiguous units, non-10,000 denominators, non-integer rates, or unresolved
  schedules used for active compensation;
- deployment claims that lack the stage-specific evidence;
- platform-owned or substituted collector/distributor/source routes;
- payout enabled before all authority, schedule, deployment, route, and
  evidence gates are verified; and
- any custody claim.

Returning a validated object means only that the supplied snapshot satisfies
the observation contract. It does not assert that the protocol is deployed,
that the economics are lawful, or that a payout should occur.

## 7. Future integration

A future Gateway/Nexus adapter may map canonical on-chain observations into the
snapshot. That adapter must be separately specified, use protocol evidence as
its source of truth, preserve evidence IDs and commit provenance, and keep the
platform payout operation disabled whenever a gate is not satisfied. No adapter
is included here.
