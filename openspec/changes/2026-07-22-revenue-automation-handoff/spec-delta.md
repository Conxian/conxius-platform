# Spec Delta: Revenue Automation Policy and Protocol Handoff

This change adds the canonical policy boundary at
`openspec/specs/revenue-automation-policy.spec.md` and aligns the platform
runbook and knowledge base with the protocol-owned implementation.

## Normative additions

1. `Conxian/Conxian` owns Clarity contract semantics, protocol tests, deployment
   policy, fee-bearing flow registration, canonical on-chain contract state,
   contract-generated outcomes, and economic-policy changes.
2. The Conxian Gateway remains the platform-facing authoritative interface/source
   for observed protocol state and routing/business logic. Gateway MUST derive
   and report fee outcomes from canonical on-chain contract state and registered
   flow metadata. `conxius-platform` owns operational routing, feature flags,
   runbooks, and platform payout-operation disablement. Neither platform layer
   may deploy or modify a Clarity contract, calculate a conflicting canonical
   fee, or claim custody.
3. The current observed upstream `100` bps / `1%` implementation baseline MUST
   be documented as an observation rather than an immutable policy. Fee-rate
   changes require protocol governance; the alternative in protocol issue #488
   is explicitly not adopted.
4. A fee-bearing flow MUST define its fee base, asset, collector/distributor,
   trigger, authorized callers, and replay key before platform activation.
5. Protocol implementations MUST define exactly-once behavior per replay key,
   deterministic integer rounding, zero-fee outcomes, principal authorization,
   pause/fail-closed behavior, atomic accounting/transfers, audit events, and
   deterministic failure semantics.
6. Acceptance scenarios MUST distinguish these normative requirements from the
   current observed upstream implementation and track incomplete hardening in
   [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538), including
   the no-op paths described in [protocol issue #469](https://github.com/Conxian/Conxian/issues/469).

## Explicit non-goals

- No platform-local Clarity contract.
- No Clarity implementation, test, or deployment change in this repository.
- No fee-rate or allocation change.
- No platform custody or competing fee ledger.

## Related artifacts

- [Platform issue #1164](https://github.com/Conxian/conxius-platform/issues/1164)
- [Platform alignment issue #1167](https://github.com/Conxian/conxius-platform/issues/1167)
- [Protocol handoff issue #538](https://github.com/Conxian/Conxian/issues/538)
