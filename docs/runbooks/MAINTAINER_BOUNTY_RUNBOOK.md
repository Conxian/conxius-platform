# Maintainer Bounty Payout Enablement Runbook

## Objective
Define the maintainer steps required to activate bounty payouts on mainnet and verify the ALEX-funded path.

## Prerequisites
- Administrative access to the ALEX treasury vault.
- Access to the Conxian-Labs Linear workspace.
- Production environment secrets provisioned.

## Verification Steps
1. **Confirm Funding**: Verify that the ALEX vault principal (`SP...`) has sufficient sBTC/STX balance for the current bounty cycle.
2. **Path Audit**: Verify that the payout routing logic in `revenue-automation.clar` is active and points to the correct mainnet destinations.
3. **Identity Verification**: Confirm that the bounty claimer has a verified Universal Bitcoin Identity (UBI) linked to their Stacks address.

## Enablement Action
To enable payouts, set the `BOUNTY_PAYOUT_ACTIVE` environment variable to `true` in the production orchestrator.

## Rollback Action
If a payout anomaly is detected:
1. Set `BOUNTY_PAYOUT_ACTIVE` to `false`.
2. Initiate a protocol-level pause if the `revenue-automation.clar` contract supports it.

## Evidence Requirements
- Transaction hash of the funding event.
- Screenshot of the verified UBI status for the first recipient.
- CI pass for the mainnet deployment branch.
