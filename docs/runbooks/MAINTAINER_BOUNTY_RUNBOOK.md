# Maintainer Bounty Payout Enablement Runbook

## Objective
Define the maintainer steps required to activate bounty payouts on mainnet and verify the ALEX-funded path.

## Prerequisites
- Administrative access to the ALEX treasury vault.
- Access to the Conxian-Labs Linear workspace.
- Production environment secrets provisioned.

## Protocol implementation reference

The community-owned protocol repository owns Clarity contract semantics,
deployment policy, canonical on-chain contract state, and contract-generated fee
outcomes. The Conxian Gateway remains the platform-facing authoritative
interface/source for observed protocol state and routing/business logic. The
Gateway MUST derive and report fee outcomes from canonical on-chain contract
state and registered flow metadata; it MUST NOT invent a conflicting fee
calculation or claim custody. The implementation reference is the
[`contracts/treasury/revenue-automation.clar`](https://github.com/Conxian/Conxian/blob/main/contracts/treasury/revenue-automation.clar)
in `Conxian/Conxian`, not this repository. The current observed upstream
baseline is 100 bps / 1%; it is not a platform policy or a commitment to a
future fee rate. Protocol implementation, tests, deployment policy, economic
policy, and hardening follow-up are tracked in the
[protocol handoff issue #538](https://github.com/Conxian/Conxian/issues/538),
with the platform boundary recorded in the
[canonical revenue automation policy spec](../../openspec/specs/revenue-automation-policy.spec.md).

Operators MUST NOT deploy or modify the Clarity contract from `conxius-platform`.
Preserve the Gateway routing and `BOUNTY_PAYOUT_ACTIVE` controls below; they are
operational controls only and do not confer custody or protocol ownership. The
platform handoff originated in
[platform issue #1164](https://github.com/Conxian/conxius-platform/issues/1164)
and is aligned with
[platform issue #1167](https://github.com/Conxian/conxius-platform/issues/1167).

## Verification Steps
1. **Confirm Funding**: Verify that the ALEX vault principal (`SP...`) has sufficient sBTC/STX balance for the current bounty cycle.
2. **Keep payouts disabled during audit**: Confirm that `BOUNTY_PAYOUT_ACTIVE` remains `false` in the production orchestrator while the evidence below is collected.
3. **Verify registered flow**: Confirm that the fee-bearing flow has a complete, versioned protocol-owned registration covering its flow ID, fee base and units, asset/contract identity, collector/distributor, trigger, authorized callers, and replay key.
4. **Match canonical output**: Verify that the Gateway observation and reported fee outcome match the canonical on-chain contract state and contract-generated output for the registered flow. Record the relevant transaction/block reference, contract state/output, Gateway observation, and any version identifiers.
5. **Verify authorization and replay controls**: Confirm that the required caller authorization and replay protections are satisfied, or that explicit upstream acceptance evidence has been recorded from the authorized protocol owners under [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538).
6. **Identity Verification**: Confirm that the bounty claimer has a verified Universal Bitcoin Identity (UBI) linked to their Stacks address.

If any registration, canonical-output match, authorization, replay, or identity
evidence is missing, inconsistent, or unverifiable, do not enable payouts. Keep
`BOUNTY_PAYOUT_ACTIVE=false` and escalate through the protocol handoff rather
than bypassing the gate.

## Enablement Action
Only after every verification step passes and the evidence is recorded, set the
`BOUNTY_PAYOUT_ACTIVE` environment variable to `true` in the production
orchestrator. This enables platform routing only; it does not mutate or pause
protocol state.

## Rollback Action
If a payout anomaly is detected:
1. Set `BOUNTY_PAYOUT_ACTIVE` to `false`.
2. Verify that payout routing is disabled, then use only documented Gateway
   admin route-disablement or maintenance controls as needed.
3. Any protocol pause or protocol-state change MUST be performed only by
   authorized protocol owners using the governed procedure in `Conxian/Conxian`.
   Gateway admin actions MUST NOT be described or used as mutating protocol
   state.

## Evidence Requirements
- Transaction hash of the funding event.
- Complete registered-flow record and version identifier.
- Canonical on-chain state/contract-generated output reference and matching Gateway observation.
- Authorization/replay verification or explicit upstream acceptance evidence.
- Screenshot of the verified UBI status for the first recipient.
- CI pass for the mainnet deployment branch.
