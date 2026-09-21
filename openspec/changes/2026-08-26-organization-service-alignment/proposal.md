# Organization Service Alignment

## Decision
Treat every repository as an explicitly classified service, SDK, protocol, product, governance, documentation, infrastructure, or archived surface. Capability availability is evidence-scoped and must be consumed through the owning repository's versioned contract.

## Authority
`conxian-business` owns portfolio governance and approval policy. `conxius-platform` owns neutral orchestration, observation, reconciliation, capability negotiation, and evidence aggregation. Core/SDK repositories own primitives and signing. Gateway/Nexus own provider execution and verification. Wallet owns custody and signing. Market owns product economics. Archived Orbit is not an active dependency.

## Safety
No universal platform service may custody assets, hold keys, construct wallet transactions, set pricing, collect protocol fees, operate yield, execute trades, or mutate protocol state. Existing resources and repositories are preserved; unsupported capabilities are marked unavailable rather than deleted or implicitly delegated.

## Evidence
Each service must publish owner, role, contract version, runtime entrypoint, health/readiness behavior, persistence, security boundary, deployment evidence, rollback evidence, and dependency compatibility. Missing evidence is `Unavailable` or `Owner-action`.
