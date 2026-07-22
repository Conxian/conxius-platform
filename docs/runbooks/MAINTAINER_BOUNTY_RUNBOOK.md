# Maintainer Bounty Payout Enablement Runbook

## Objective
Define the maintainer steps required to activate bounty payouts on mainnet and verify the ALEX-funded path.

## Prerequisites
- Administrative access to the ALEX treasury vault.
- Access to the Conxian-Labs Linear workspace.
- Production environment secrets provisioned.

## Protocol implementation reference

The authoritative implementation is the community-owned
[`contracts/treasury/revenue-automation.clar`](https://github.com/Conxian/Conxian/blob/main/contracts/treasury/revenue-automation.clar)
in `Conxian/Conxian`, not this repository. The current observed upstream
baseline is 100 bps / 1%; it is not a platform policy or a commitment to a
future fee rate. Protocol implementation, tests, deployment policy, economic
policy, and hardening follow-up are tracked in the
[protocol handoff issue #538](https://github.com/Conxian/Conxian/issues/538),
with the platform boundary recorded in the
[canonical revenue automation policy spec](../../openspec/specs/revenue-automation-policy.spec.md).

Operators MUST NOT deploy or modify the Clarity contract from `conxius-platform`.
Protocol state and protocol-authoritative fee outputs remain the source of
truth. Preserve the Gateway routing and `BOUNTY_PAYOUT_ACTIVE` controls below;
they are operational controls only and do not confer custody or protocol
ownership. The platform handoff originated in
[platform issue #1164](https://github.com/Conxian/conxius-platform/issues/1164)
and is aligned with
[platform issue #1167](https://github.com/Conxian/conxius-platform/issues/1167).

## Verification Steps
1. **Confirm Funding**: Verify that the ALEX vault principal (`SP...`) has sufficient sBTC/STX balance for the current bounty cycle.
2. **Path Audit**: Verify that the `BOUNTY_PAYOUT_ACTIVE` environment variable is set to `true` in the production orchestrator and that payout destinations are configured correctly in the Gateway's bounty routing module.
3. **Identity Verification**: Confirm that the bounty claimer has a verified Universal Bitcoin Identity (UBI) linked to their Stacks address.

## Enablement Action
To enable payouts, set the `BOUNTY_PAYOUT_ACTIVE` environment variable to `true` in the production orchestrator.

## Rollback Action
If a payout anomaly is detected:
1. Set `BOUNTY_PAYOUT_ACTIVE` to `false`.
2. Initiate a protocol-level pause via the Gateway admin API if available.

## Evidence Requirements
- Transaction hash of the funding event.
- Screenshot of the verified UBI status for the first recipient.
- CI pass for the mainnet deployment branch.
