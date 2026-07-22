# Founder-Rights Revenue Observation and Evidence Report

**Date**: 2026-07-22
**Status**: Active operational research/evidence bundle for Phase 4; not a
canonical economic policy and not legal advice
**Trigger**: [Conxian/conxius-platform#1168](https://github.com/Conxian/conxius-platform/issues/1168) and the [selected candidate comment](https://github.com/Conxian/conxius-platform/issues/1168#issuecomment-5050732992)
**Related**: [Conxian/conxius-platform#1167](https://github.com/Conxian/conxius-platform/issues/1167), [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538), [Conxian/Conxian#488](https://github.com/Conxian/Conxian/issues/488)

## Executive conclusion

The safest selected Phase 4 candidate is a machine-readable observation and
evidence contract, implemented by:

- [`schemas/protocol-revenue-observation.schema.json`](../../../schemas/protocol-revenue-observation.schema.json);
- [`scripts/protocol-revenue-observation.ts`](../../../scripts/protocol-revenue-observation.ts); and
- [`scripts/protocol-revenue-observation.test.ts`](../../../scripts/protocol-revenue-observation.test.ts).

The implementation distinguishes source, proposal, and approved authority;
requires explicit integer units and basis points; records staged deployment
evidence; preserves protocol-owned collector/distributor routes; anchors an
observation to Bitcoin burn-block height and time; and fails closed on stale,
ambiguous, substituted, or incomplete evidence.

This report does **not** conclude that founder rights are approved, that any
fee or allocation is adopted, that a beneficiary is entitled to compensation,
that a protocol deployment is live, or that a payout should occur. Protocol
economics, Clarity behavior, governance, deployment, and payout authorization
remain owned by `Conxian/Conxian`.

## Verified evidence matrix

The following files and issues were inspected on 2026-07-22. Commit pins are
included so the observations are reproducible; a repository path or deployment
manifest is evidence of source or intent, not proof of a confirmed live
deployment.

| Owner/repository | Observed commit | Exact path or issue | Evidence observed | Canonical URL |
| --- | --- | --- | --- | --- |
| `Conxian/Conxian` | `db77aaf7b51814607fda2273721736d4a2b699ac` | `contracts/treasury/revenue-automation.clar` | Contains `PROTOCOL_FEE_BPS u100` and a 100 bps implementation baseline; transfers route through protocol contracts. | [source](https://github.com/Conxian/Conxian/blob/db77aaf7b51814607fda2273721736d4a2b699ac/contracts/treasury/revenue-automation.clar) |
| `Conxian/Conxian` | `db77aaf7b51814607fda2273721736d4a2b699ac` | `contracts/treasury/protocol-fee-collector.clar` | Defines a separate `BPS_DENOMINATOR u10000` and 200/150/100 bps phase constants, activation height, collector ingress, and authorized sources. | [source](https://github.com/Conxian/Conxian/blob/db77aaf7b51814607fda2273721736d4a2b699ac/contracts/treasury/protocol-fee-collector.clar) |
| `Conxian/Conxian` | `db77aaf7b51814607fda2273721736d4a2b699ac` | `contracts/treasury/cxd-treasury.clar` | Records 45/30/15/5/5/0 target shares in basis points; recipient configuration is not evidence of an approved founder route. | [source](https://github.com/Conxian/Conxian/blob/db77aaf7b51814607fda2273721736d4a2b699ac/contracts/treasury/cxd-treasury.clar) |
| `Conxian/Conxian` | `db77aaf7b51814607fda2273721736d4a2b699ac` | `contracts/treasury/founder-vault.clar` | Defines allocation storage and owner-controlled creation/transfer behavior; the inspected source did not establish a complete claim/vesting payout flow. | [source](https://github.com/Conxian/Conxian/blob/db77aaf7b51814607fda2273721736d4a2b699ac/contracts/treasury/founder-vault.clar) |
| `Conxian/Conxian` | `db77aaf7b51814607fda2273721736d4a2b699ac` | `deployments/mainnet-manifest-v1.yaml` | Contains a contract-publish plan; a plan is not broadcast or confirmation evidence. | [manifest](https://github.com/Conxian/Conxian/blob/db77aaf7b51814607fda2273721736d4a2b699ac/deployments/mainnet-manifest-v1.yaml) |
| `Conxian/Conxian` | `db77aaf7b51814607fda2273721736d4a2b699ac` | `deployments/mainnet-release-plan.yaml` | Readiness-gated disabled/no-op release plan with empty batches; it does not prove deployment. | [release plan](https://github.com/Conxian/Conxian/blob/db77aaf7b51814607fda2273721736d4a2b699ac/deployments/mainnet-release-plan.yaml) |
| `Conxian/Conxian` | issue state observed 2026-07-22 | Issue #538 | Protocol handoff says the 100 bps value is an observed baseline, not immutable policy; protocol hardening and deployment evidence remain open. | [issue #538](https://github.com/Conxian/Conxian/issues/538) |
| `Conxian/Conxian` | issue state observed 2026-07-22 | Issue #488 | Open proposal discusses 2%/200 bps, a 50/30/20 split, and a 2.0→1.5→1.0 schedule; it is not adopted by this platform change. | [issue #488](https://github.com/Conxian/Conxian/issues/488) |
| `Conxian/conxian-gateway` | `96de9c0e976caf1dd3592593073d1f53e58bc91b` | `internal/engine/src/treasury/mod.rs` | Treasury values are synthetic/stub observations using floating-point proxy values; a production oracle/feed is still needed. | [source](https://github.com/Conxian/conxian-gateway/blob/96de9c0e976caf1dd3592593073d1f53e58bc91b/internal/engine/src/treasury/mod.rs) |
| `Conxian/conxian-gateway` | `96de9c0e976caf1dd3592593073d1f53e58bc91b` | `apps/control-plane/app/treasury/page.tsx` | Control-plane UI displays treasury monitor/SYI-style values; presentation is not protocol authority. | [source](https://github.com/Conxian/conxian-gateway/blob/96de9c0e976caf1dd3592593073d1f53e58bc91b/apps/control-plane/app/treasury/page.tsx) |
| `Conxian/conxian-gateway` | `96de9c0e976caf1dd3592593073d1f53e58bc91b` | `docs/GAP_ANALYSIS_2026-07-22.md` | Documents an observability boundary and does not authorize a fee-model rewrite. | [analysis](https://github.com/Conxian/conxian-gateway/blob/96de9c0e976caf1dd3592593073d1f53e58bc91b/docs/GAP_ANALYSIS_2026-07-22.md) |
| `Conxian/lib-conxian-core` | `35432776a05cba6cd11bae9d6258ec7618a3138c` | `docs/architecture/ROUTING_ECONOMICS.md` | Describes a different routing-economics model (5% reserve, 5% Labs ops, 90% contributor stream); it is not evidence of protocol founder rights. | [document](https://github.com/Conxian/lib-conxian-core/blob/35432776a05cba6cd11bae9d6258ec7618a3138c/docs/architecture/ROUTING_ECONOMICS.md) |
| `Conxian/lib-conxian-core` | `35432776a05cba6cd11bae9d6258ec7618a3138c` | `src/control_model/mod.rs` | Defines routing/control types including integer sat/vbyte fee fields; it does not own Clarity protocol policy. | [source](https://github.com/Conxian/lib-conxian-core/blob/35432776a05cba6cd11bae9d6258ec7618a3138c/src/control_model/mod.rs) |
| `Conxian/lib-conxian-core` | `35432776a05cba6cd11bae9d6258ec7618a3138c` | `src/protocol/intent.rs` | Uses amount/fee satoshis and routing scores; these are not a founder compensation schedule. | [source](https://github.com/Conxian/lib-conxian-core/blob/35432776a05cba6cd11bae9d6258ec7618a3138c/src/protocol/intent.rs) |
| `Conxian/conxius-platform` | `2cd8eb727fdccb2a434bfd74c8bd0e4d4d73c0ef` | `openspec/specs/revenue-automation-policy.spec.md` | Existing handoff makes 100 bps an observation, keeps protocol ownership, and prohibits platform custody or a competing fee ledger. | [spec](https://github.com/Conxian/conxius-platform/blob/2cd8eb727fdccb2a434bfd74c8bd0e4d4d73c0ef/openspec/specs/revenue-automation-policy.spec.md) |
| `Conxian/conxius-platform` | `2cd8eb727fdccb2a434bfd74c8bd0e4d4d73c0ef` | `services/admin-dashboard/src/lib/sidl/gateway.ts` | Platform gateway snapshot types use numeric quantities and a data-source fallback; this report does not treat the fallback as protocol authority. | [source](https://github.com/Conxian/conxius-platform/blob/2cd8eb727fdccb2a434bfd74c8bd0e4d4d73c0ef/services/admin-dashboard/src/lib/sidl/gateway.ts) |

## Contradictions and safe interpretation

| Area | Observed contradiction | Safe Phase 4 interpretation | Owner |
| --- | --- | --- | --- |
| Fee rate | Revenue automation contains 100 bps while the collector contains a 200/150/100 bps schedule. | Record both as source observations with provenance; do not select a canonical rate in the platform. | Protocol governance and `Conxian/Conxian#538` |
| Allocation | Treasury source has 45/30/15/5/5/0 shares while issue #488 proposes 50/30/20. | Treat issue #488 as unresolved proposal evidence; do not convert either into founder entitlement. | Protocol governance |
| Founder route | Founder-vault storage/transfer behavior does not by itself establish complete vesting, claim, authorization, or payout behavior. | Require an explicit approved schedule, non-PII disclosure reference, protocol route, and exact boundaries before active status. | Protocol maintainers/governance |
| Deployment | Mainnet manifest is a plan and release plan is disabled/readiness-gated; neither is broadcast/confirmation/live-interface proof. | Use staged deployment states and require confirmation plus interface evidence for live status. | Protocol deployment/operator boundary |
| Gateway treasury | Gateway treasury module contains synthetic floating-point proxies. | Do not use UI/proxy metrics as canonical fee or founder-rights evidence; integrate a read-only observation adapter later. | Gateway maintainers |
| Core economics | Core routing documents describe a separate routing allocation model. | Preserve repository ownership boundaries and record drift as a gap instead of merging models. | Core/platform maintainers |
| Platform fallback | Platform reward/fallback data can be useful for UI continuity but is not protocol approval. | Mark data source and fail closed for active/payout claims when canonical evidence is absent or stale. | Platform |

## Corrected sustainability equations and scenarios

These calculations are illustrative scenario analysis only. They do not adopt a
fee rate, builder share, beneficiary, or payment obligation.

Let:

```text
F = gross protocol volume
r = protocol fee rate as a decimal
s = builder/founder share of protocol fee as a decimal
P = annual compensation target

protocol fee revenue = F × r
compensation = F × r × s
required gross volume = P / (r × s)
```

For a 1% protocol fee and a 2.5% share of that fee:

```text
r = 0.01
s = 0.025
r × s = 0.00025
P = $84,000
required gross volume = $84,000 / 0.00025 = $336,000,000/year
protocol fee revenue = $336,000,000 × 0.01 = $3,360,000/year
```

The incorrect shortcut of treating `$3.4M` as gross volume omits the 1% fee
and 2.5% share multipliers. For comparison only:

| Illustrative fee | Illustrative share of fee | Target | Required gross volume | Protocol fee revenue |
| ---: | ---: | ---: | ---: | ---: |
| 1.00% | 2.50% | $84,000/year | $336,000,000/year | $3,360,000/year |
| 2.00% | 2.50% | $84,000/year | $168,000,000/year | $3,360,000/year |
| 1.00% | 1.50% | $84,000/year | $560,000,000/year | $5,600,000/year |

These scenarios demonstrate denominator semantics only. They are not a
recommendation and must not be copied into protocol or platform policy.

## Prioritized gap and ownership matrix

| Priority | Gap | Current evidence | Owner/action | Status after this PR |
| --- | --- | --- | --- | --- |
| P0 | Founder-rights policy/approval is unresolved | Proposal and source artifacts conflict; no platform ratification authority. | Protocol governance must approve or reject a policy with exact schedule and authority evidence. | Observation gate implemented; decision remains open. |
| P0 | Protocol economic model drift | 100 bps source, 200/150/100 collector, 45/30/15/5/5/0 treasury, and issue #488 proposal differ. | Protocol maintainers/governance reconcile source, tests, deployment, and canonical documentation under #538. | Drift captured as operational gap; no rate selected. |
| P0 | Deployment/live-interface evidence | Manifest/plan evidence is not broadcast/confirmation/live evidence. | Protocol deployment/operator boundary must publish transaction, confirmation burn height, and interface evidence. | Validator stage gates implemented; no deployment asserted. |
| P1 | Gateway/Nexus observation integration | Gateway treasury values include synthetic/stub fields and no snapshot adapter for this contract. | Gateway/Nexus maintainers should add a separately specified read-only adapter. | Not implemented by this PR. |
| P1 | Compensation route and beneficiary disclosure | Founder-vault source does not establish complete payout semantics. | Protocol owner/governance must define route, authorization, disclosure reference, and exact block windows. | Validator requires those fields; no route approved. |
| P1 | Legal, tax, sanctions, and custody analysis | Facts and applicable law are not established by repository text. | Obtain qualified counsel and operational compliance review before any payout decision. | Explicitly unresolved; no legal conclusion. |

## Phase plan

1. **Phase 4 — Observation contract (this PR)**: schema, pure semantic
   validator, tests, provenance/evidence report, and operational gap updates.
2. **Phase 5 — Protocol decision and evidence**: protocol governance decides
   economic policy; maintainers implement/tests the chosen policy in
   `Conxian/Conxian`; deployment operators provide independently verifiable
   staged evidence. This platform PR does not perform those actions.
3. **Phase 6 — Read-only observation integration**: separately specify and
   implement a Gateway/Nexus adapter that consumes canonical protocol state,
   preserves commit/evidence IDs, and disables payout on any failed gate.
4. **Phase 7 — Operational/legal readiness**: qualified counsel and compliance
   owners assess entity, tax, sanctions, custody, disclosure, and governance
   controls; only then can authorized owners decide whether an operational
   payout feature should be enabled.

## Legal and governance unknowns

This section identifies questions for qualified owners; it does not answer
them or characterize any asset, person, or arrangement under law.

- Whether a particular protocol, administrator, router, beneficiary, or
  compensation arrangement creates obligations depends on facts, control,
  geography, customer interactions, and applicable law.
- FinCEN guidance distinguishes activities by facts and circumstances and states
  that its guidance does not address every other legal regime. It cannot be
  converted into a platform approval rule.
- IRS treatment, reporting, basis, and withholding questions require a tax
  analysis for the actual entity and transaction facts.
- OFAC guidance describes U.S. sanctions compliance and risk-based controls;
  this report does not conclude that any current route is compliant or
  non-compliant.
- A 2026 SEC interpretation or rule position may be relevant to a later legal
  review, but direct automated access can be unavailable or return 403. The
  report does not rely on a blocked fetch or make a securities conclusion.
- Governance questions remain open: the authoritative council or DAO, quorum,
  proposal lifecycle, timelock, emergency powers, beneficiary disclosure, and
  revocation/vesting rules must be identified by the protocol owner.
- OpenZeppelin timelocks, Safe thresholds, ENS governance, and the Aave example
  below are design examples, not universal requirements or adopted Conxian
  controls. Uniswap fee documentation is a protocol-fee concept example, not
  evidence of Conxian policy.

## Primary sources and examples

The following canonical sources were reviewed or recorded on 2026-07-22. They
are cited as research inputs; examples/proposals are explicitly not adopted
standards.

### Regulatory and tax sources

- [SEC 2026 interpretation/rule page](https://www.sec.gov/rules-regulations/2026/03/s7-2026-09) — access may be blocked for automated clients; no legal conclusion is drawn.
- [FinCEN 2013 administrator/exchanger guidance](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering) — facts-and-circumstances BSA guidance; not a complete legal analysis.
- [FinCEN 2019 certain business models guidance](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models) — FIN-2019-G001; not an approval of any Conxian model.
- [IRS digital asset transaction FAQs](https://www.irs.gov/individuals/international-taxpayers/frequently-asked-questions-on-digital-asset-transactions) — tax FAQ source, not entity-specific advice.
- [OFAC virtual currency guidance PDF](https://ofac.treasury.gov/system/files/126/virtual_currency_guidance_brochure.pdf) — sanctions compliance guidance and risk-based program concepts.

### Governance and protocol design examples

- [OpenZeppelin governance and timelock documentation](https://docs.openzeppelin.com/contracts/5.x/governance) — timelock and role-control example; not adopted here.
- [Safe smart account concepts](https://docs.safe.global/advanced/smart-account-concepts) — owner/threshold example; not evidence of a Conxian beneficiary or custody model.
- [ENS governance process](https://docs.ens.domains/dao/governance/process/) — proposal and executable governance process example.
- [Aave Temp Check / Will Win framework example](https://governance.aave.com/t/temp-check-aave-will-win-framework/24055) — community proposal example, not a universal compensation standard.
- [Uniswap protocol-fee concepts](https://developers.uniswap.org/docs/protocols/protocol-fee/concepts/fees) — distinction between LP and protocol fees; not an adopted Conxian fee model.

## Evidence limits and remaining risks

- The evidence matrix is a point-in-time repository/source review. It does not
  replace a chain explorer, transaction receipt, independent deployment proof,
  or protocol governance record.
- The validator's fully evidenced active fixture is synthetic test data used to
  exercise gates; it is not a claim about mainnet or any beneficiary.
- The platform currently has no Gateway/Nexus adapter for this contract, so this
  PR does not claim production observation coverage.
- A schema-valid object can still contain false external claims if its evidence
  source is unreliable; future adapters need source authentication and
  independent verification.
- No payout, custody, fee change, allocation change, beneficiary assignment,
  legal conclusion, or protocol deployment is made by this report or PR.
