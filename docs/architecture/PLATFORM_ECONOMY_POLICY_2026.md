# Platform Economy Policy — 2026

## Authority
`conxian-business` governs portfolio policy and approvals. `conxius-platform` provides neutral infrastructure and does not become a protocol, market, wallet, treasury, or custodian.

## Default economics
No fee, spread, yield, reward, treasury allocation, trading policy, settlement margin, or client economic term is implied by the platform. Unsupported economic capabilities are `Unavailable` until an owner, legal review, configuration, and evidence contract exist.

## Permitted platform revenue
A separately approved infrastructure or service fee may be configured only as an explicit commercial contract. It must be:

- outside protocol monetary logic;
- disclosed to the affected customer;
- independently configured, not hardcoded in routing code;
- auditable with versioned policy and approval evidence;
- isolated from provider selection and transaction ordering;
- non-custodial and non-discretionary.

A missing fee configuration means no fee, not a fallback rate.

## Prohibited platform economics
The platform must not own or imply:

- liquidity or market-making;
- spreads, quotes, or proprietary solver selection;
- yield splitting or rewards allocation;
- treasury control or asset custody;
- founder, contributor, or protocol payouts;
- discretionary trade execution;
- wallet keys, signing authority, or user funds;
- protocol fee schedules or monetary policy.

These belong to separately governed clients or protocols. Wallet and enclave repositories remain external capability providers; their secrets and signing material never enter platform state.

## Evidence and upgrades
Every enabled capability requires an owner, schema version, provider identity, compatibility range, security classification, evidence timestamp, and rollback/revocation path. Governance approval does not substitute for runtime evidence. The platform must fail closed when the capability is missing, stale, ambiguous, or economically coupled.

## Migration rule
Historical revenue, treasury, wallet, market, and protocol references remain available for provenance but are not active platform behavior. New integrations must use neutral contracts and client-selected economic policy.
