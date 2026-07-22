# OpenSpec Proposal: Revenue Automation Protocol Handoff and Policy Boundary

**Date**: 2026-07-22
**Status**: Platform specification and handoff complete in this PR; protocol implementation, hardening, and audit remain open
**Platform issue**: [Conxian/conxius-platform#1164](https://github.com/Conxian/conxius-platform/issues/1164)
**Alignment issue**: [Conxian/conxius-platform#1167](https://github.com/Conxian/conxius-platform/issues/1167)
**Protocol handoff**: [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538)

## Context

Issue #1164 originally described `revenue-automation.clar` as missing from the
platform repository. The protocol-repository review confirmed that
[`contracts/treasury/revenue-automation.clar`](https://github.com/Conxian/Conxian/blob/main/contracts/treasury/revenue-automation.clar)
already exists in `Conxian/Conxian`, is registered in `Clarinet.toml` and the
mainnet manifest, and currently exposes a 100 basis-point (1%) implementation
baseline. That observation does not establish an immutable fee policy or prove
that all upstream fee paths are hardened.

Conxian/conxius-platform is the routing and control plane. It must not become a
second protocol implementation, calculate a competing canonical fee, hold
custody, or deploy Clarity contracts. Protocol contract behavior, tests,
deployment policy, and economic policy belong to the community-owned
`Conxian/Conxian` repository.

The authority model is layered: `Conxian/Conxian` owns Clarity semantics,
deployment policy, canonical on-chain contract state, and contract-generated
outcomes; the Conxian Gateway remains the platform-facing authoritative
interface/source for observed protocol state and routing/business logic. Gateway
fee outcomes must be derived and reported from canonical on-chain contract state
and registered flow metadata, never invented as a conflicting calculation or
used to claim custody.

## Goal

Create a durable, testable policy boundary and handoff so that:

1. The protocol repository owns Clarity implementation, tests, deployment
   decisions, and economic-policy changes.
2. The platform repository and Gateway own only the platform-facing routing
   interface, observed-state reporting, feature flags, runbooks, and the ability
   to disable platform payout operations; Gateway remains authoritative for
   observed protocol state and routing/business logic.
3. Fee-bearing flows are registered with enough information to support
   deterministic, exactly-once, fail-closed execution without inventing new
   concrete protocol flows in the platform repository.
4. The observed 100 bps baseline is documented without adopting the unresolved
   alternative schedule in [protocol issue #488](https://github.com/Conxian/Conxian/issues/488).
5. Known upstream gaps, including the no-op paths described by
   [protocol issue #469](https://github.com/Conxian/Conxian/issues/469), remain
   visible and are owned by the protocol handoff issue.

## Scope

This platform change includes:

- the dated OpenSpec proposal, design, task checklist, and spec delta;
- the canonical `openspec/specs/revenue-automation-policy.spec.md`;
- an ownership/reference section in
  `docs/runbooks/MAINTAINER_BOUNTY_RUNBOOK.md`;
- correction of active `AGENTS.md` status claims and an append-only session-log
  entry; and
- the durable protocol-repository handoff in
  [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538).

## Out of scope

- Adding or modifying any Clarity contract in `conxius-platform`.
- Implementing, testing, auditing, or deploying the upstream Clarity contract
  from this repository.
- Changing the fee rate, fee allocation, or other economic policy.
- Moving custody, keys, or user funds into the platform or Gateway.
- Inventing concrete fee-bearing triggers or flows that are not registered by
  the protocol repository.

## Truthful status

The platform specification, ownership clarification, runbook update, knowledge
base correction, and protocol issue handoff are the work delivered by this
change. Upstream implementation and audit work is **not** complete; it remains
tracked in [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538),
including trigger coverage, replay semantics, authorization, pause behavior,
atomic transfers, events, rounding, initialization documentation, and the
no-op paths from protocol issue #469.

## Deliverables

- `openspec/changes/2026-07-22-revenue-automation-handoff/proposal.md`
- `openspec/changes/2026-07-22-revenue-automation-handoff/design.md`
- `openspec/changes/2026-07-22-revenue-automation-handoff/tasks.md`
- `openspec/changes/2026-07-22-revenue-automation-handoff/spec-delta.md`
- `openspec/specs/revenue-automation-policy.spec.md`
- `docs/runbooks/MAINTAINER_BOUNTY_RUNBOOK.md`
- `AGENTS.md` active status correction and new session-log entry
