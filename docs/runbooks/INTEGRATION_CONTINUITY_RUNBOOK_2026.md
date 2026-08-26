# Integration Continuity Runbook

## Purpose

`platform/integrations.registry.json` is the source of truth for connected providers across sessions. Read it before changing data access, authentication, storage, telemetry, or upstream adapters.

## Provider matrix

| Provider | Canonical role | Rule |
| --- | --- | --- |
| Neon | Primary relational database and Better Auth backing store | Use only with explicit schema/query ownership and user scoping. |
| Supabase | Explicit auth, data, storage, or realtime workloads | Use native Auth and RLS; verify schema access before migrations. |
| Upstash Redis | Cache, rate limits, queues, or sessions | Never use as primary business storage. |
| Aurora PostgreSQL | Explicit AWS-owned relational workloads | Use only when the AWS integration and owning team assign the workload. |
| Gateway | Server-only live API and telemetry source | Use typed adapters, timeouts, provenance, and unavailable states. |

## Cross-session procedure

1. Check connected integrations before integration-dependent work.
2. Read the registry and identify the canonical provider and environment variable.
3. Never print or commit secret values; report only configured/missing or reachable/unreachable status.
4. Retrieve live schema through the provider MCP before writing migrations or queries.
5. Preserve aliases only for compatibility; do not silently merge providers.
6. Keep production pages live-or-unavailable; do not use synthetic fallback values.
7. Record any ownership, role, or migration decision in an OpenSpec change.

## Readiness

Use the protected `/api/readiness` endpoint for sanitized endpoint checks. A configured variable is not proof of a valid contract: endpoint reachability, authentication, response shape, freshness, and schema ownership must be verified separately.

## Current limitations

The registry does not contain credentials or schema snapshots. Integration schema access and GitHub Projects access may require a connected MCP or organization-authorized token in a future session.
