# Proposal: Remove stubbed BOS wallet mapping from Admin Dashboard

## Problem
The Admin Dashboard `/settings` page currently displays a hardcoded “BOS Wallet Mapping” list (including testnet-style `ST*` addresses) and marks them as “REGISTERED”.

This is stub content and can be mistaken for production configuration, which conflicts with the repository’s mainnet-only production standard.

## Decision
- Remove the hardcoded BOS wallet mapping section from the Admin Dashboard settings UI.
- Keep the `/settings` page scoped to institutional secret provisioning only.

## Non-goals
- Implementing a production BOS wallet registry or state machine.
- Adding runtime integrations to external repos (for example `conxian-business`).
