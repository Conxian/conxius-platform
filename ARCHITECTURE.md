# Conxius Platform architecture

Bitcoin L1 is the canonical trust/finality root for universal-chain service. [Provider registration discovery](docs/architecture/PROVIDER_REGISTRATION_DISCOVERY_2026.md) adds diagnostic Gateway/Nexus evidence beside health, with bounded authenticated reads and no signing/execution qualification inferred from counts.

Conxius Platform is the commercial orchestration and operator-experience layer for Conxian-Labs. It composes versioned deployment intent, promotion gates, evidence, telemetry, and multi-tenant dashboards. It does not implement protocol verification, financial routing, custody, signing, or business/legal authority.

The public `conxian.org` responsibility remains in the owning protocol repositories: Nexus verifies state rooted in Bitcoin L1, Gateway translates and routes messages, and the Enclave SDK isolates signing. The `conxian-labs.com` responsibility is managed infrastructure, tenant operations, SLA evidence, integration, and support.

`platform/managed-nexus-deployment.schema.json` is a desired-state boundary for future AWS and GCP adapters. Passing its validator proves only that an intent is structurally and semantically admissible. A production claim requires separately captured deployment, health, failover, recovery, load, and provider evidence.

Conxian has no native token, staking asset, or speculative tokenomics. External-chain compatibility code is not a protocol trust root and must not be presented as one.
