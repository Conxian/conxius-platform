# Provider registration discovery

Platform is commercial deployment/orchestration infrastructure for conxian-labs.com, consuming the public conxian.org protocol spine. Bitcoin L1 remains the canonical trust/finality root for universal-chain service; no native Conxian token or custody authority is introduced.

Existing health probes remain transport diagnostics. Gateway/Nexus statuses now carry separate registration evidence from their authenticated registration endpoints. The reader requires configured HTTPS URLs and server-side credentials (`GATEWAY_API_TOKEN` / `NEXUS_ADMIN_API_TOKEN`), refuses redirects, uses no-store requests with five-second timeouts, bounds response bytes/rows, and validates owner, schema, root, scope and evidence vocabulary.

A valid registration reports diagnostic adapter count only, zero qualified operations, and `productionQualified: false`. Missing/invalid/unreachable data remains not-configured or unavailable; the SDK's 70 evidence rows cannot become runtime connections through fallback. Raw response bodies, URLs, and credentials are not returned in status details.

This is the diagnostic slice of Platform #1426. Qualified Core operation-manifest ingestion, producer/deployment authentication, artifact verification, freshness policy, HA rollout, SLA evidence and independent production acceptance remain open. Implemented primitives and enabled feature flags retain their independent gates.

## Incremental connection diagnostics

Nexus and Upstash liveness probes require both endpoint and server-side token. Supabase requires either supported URL name and one supported anonymous/publishable API-key name. Missing all configuration remains `not-configured`; supplying only part returns `degraded` with configuration evidence, missing names and no network request. Alternative names remain compatible. Complete configuration permits a bounded diagnostic probe, not qualified operations or paid entitlement. Each provider is evaluated independently; this status inventory does not weaken the separate M2M registry readiness gate or make every optional integration a global startup requirement.
