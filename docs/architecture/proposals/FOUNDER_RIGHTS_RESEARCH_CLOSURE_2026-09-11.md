# Founder-Rights Research Closure and Decision Handoff

**Date**: 2026-09-11
**Status**: Platform research complete; protocol/legal decision pending
**Trigger**: [Conxian/conxius-platform#1168](https://github.com/Conxian/conxius-platform/issues/1168)
**Prior observation contract**: [FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md](./FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md) via [PR #1197](https://github.com/Conxian/conxius-platform/pull/1197)
**Proposal fixture**: [`fixtures/protocol-revenue/issue-1168-proposed-builder-carve.observation.json`](../../../fixtures/protocol-revenue/issue-1168-proposed-builder-carve.observation.json)

## Executive conclusion

Platform work for issue #1168 is research-complete. The fail-closed observation
contract already prevents unratified founder/builder claims from becoming
payout authority. This closure package records the issue's recommended decay
model as an explicit **proposal** observation, refreshes source evidence pins,
and hands remaining decisions to protocol governance and legal owners.

This document does **not** approve the 2.5%→0.75% model, choose between
competing fee schedules, authorize a beneficiary, configure a multi-sig, set a
launch date, or change Clarity.

## Recommended model recorded as proposal only

Issue #1168 recommends a direct builder carve from total protocol fees:

| Phase | Builder share of protocol fee | Community remainder | Internal routing (proposal text) |
| --- | ---: | ---: | --- |
| Launch survival (Y1–3) | 2.5% (250 bps) | 97.5% | 1.5% ops + 1.0% contributor pool |
| Community transition (Y3–5) | 1.5% (150 bps) | 98.5% | 1.0% ops + 0.5% open-source multi-sig |
| Maintenance (Y5+) | 1.0% (100 bps), 0.75% floor (75 bps) | ≥99.0% | 100% open-source funding |

Illustrative CXIP-013 comparison from the issue (not ratified here):

```text
Current observed treasury targets: 45 / 30 / 15 / 5 / 5 / 0
Issue #1168 proposed direct carve: 42.5 treasury + 2.5 builder + unchanged bounty/LP/grants/buyback
```

Implementation paths named by the issue remain protocol-owned:

1. direct carve in `revenue-automation.clar`; or
2. treasury reduction in `cxd-treasury.clar`; plus
3. decay schedule in `founder-vault.clar`.

## Corrected sustainability arithmetic

The issue text equated `$84k/year` operations to roughly `$3.4M` volume. That
omits the protocol-fee and builder-share multipliers. Correct scenario math for
a 1% protocol fee and 2.5% builder share of that fee:

```text
required gross volume = 84_000 / (0.01 × 0.025) = $336,000,000 / year
required fee revenue  = $336,000,000 × 0.01 = $3,360,000 / year
```

These figures are scenario analysis only. They are not adopted policy.

## Evidence refresh (2026-09-11)

Protocol `main` tip inspected:
`ff9746065e9b849a243207c4e6e73774b430d572`.

| Artifact | Observed fact | Safe interpretation |
| --- | --- | --- |
| `contracts/treasury/revenue-automation.clar` | `PROTOCOL_FEE_BPS u100` | Source observation only |
| `contracts/treasury/protocol-fee-collector.clar` | Launch/growth/mature rates `u200` / `u150` / `u100` | Competing source schedule; not selected here |
| `contracts/treasury/cxd-treasury.clar` | Target shares `4500/3000/1500/500/500` | No direct builder carve in source |
| `Conxian/Conxian#488` | Open proposal for 2% fee and 50/30/20 allocation | Competing unresolved proposal |
| `Conxian/Conxian#538` | Closed handoff for revenue-automation ownership | Hardening/deployment evidence still external |
| Platform observation contract | Schema + validator + tests from PR #1197 | Fail-closed; no ratification |

## Competing models (do not collapse)

| Model | Fee / allocation signal | Authority class |
| --- | --- | --- |
| Revenue automation source | 100 bps fee | `source` |
| Protocol fee collector source | 200 → 150 → 100 bps fee phases | `source` |
| CXIP-013 treasury targets | 45/30/15/5/5 allocation of fee proceeds | `source` |
| Issue #1168 | Direct builder 250 → 150 → 100 → 75 bps of fee | `proposal` |
| Issue #488 | 2% fee and 50/30/20 ops/founders/ecosystem | `proposal` |

The platform records all of the above and selects none.

## Decision checklist (owner-gated)

| # | Decision | Owner | Status |
| ---: | --- | --- | --- |
| 1 | Confirm or reject the 2.5%→1.5%→1.0%→0.75% decay model and its denominator (`protocol-fee` vs `gross-volume`) | Protocol governance / legal | Unresolved |
| 2 | Choose implementation path (direct carve vs treasury reduction) and reconcile with collector 200/150/100 schedule | `Conxian/Conxian` maintainers | Unresolved |
| 3 | Publish exact Bitcoin burn-block windows, floor, sunset, pause/increase powers, and recusal rules | Protocol governance | Unresolved |
| 4 | Disclose non-PII beneficiary / multi-sig reference and routing authorization evidence | Protocol ops + legal | Unresolved |
| 5 | Provide staged deployment evidence through `live-interface-verified` | Protocol deployment operators | Unresolved |
| 6 | Set Phase 1 start only after ratification + live evidence | Protocol governance | Unresolved |
| 7 | Optional later: Gateway/Nexus read-only observation adapter (G-59) | Gateway/Nexus maintainers | Not started |

Issue #1168 can be closed as **research-complete / decision-pending** once owners
acknowledge this handoff. Economic activation remains blocked until checklist
items 1–6 produce ratified authority and live-interface evidence that satisfy
the observation payout gate.

## Platform artifacts

| Artifact | Role |
| --- | --- |
| [`schemas/protocol-revenue-observation.schema.json`](../../../schemas/protocol-revenue-observation.schema.json) | Versioned observation schema |
| [`scripts/protocol-revenue-observation.ts`](../../../scripts/protocol-revenue-observation.ts) | Pure fail-closed validator |
| [`fixtures/protocol-revenue/issue-1168-proposed-builder-carve.observation.json`](../../../fixtures/protocol-revenue/issue-1168-proposed-builder-carve.observation.json) | Checked-in #1168 proposal snapshot |
| [`openspec/specs/protocol-revenue-observation-v1.spec.md`](../../../openspec/specs/protocol-revenue-observation-v1.spec.md) | Canonical observation capability |
| This document | Research closure and decision handoff |

## Explicit non-claims

- No founder or builder entitlement is approved.
- No platform custody or fee ledger is created.
- No Clarity, deployment, multi-sig, or launch-date change is made.
- No legal, tax, sanctions, or securities conclusion is drawn.
