# End-to-end ITIL 4 connection review

## Scope

The dashboard serves only neutral platform operations: overview, service inventory, connection evidence, pulse telemetry, service operations, support, and settings. Product, wallet, signing, custody, treasury, pricing, protocol, and market actions remain provider-owned or unavailable until verified.

## Connection chain

`dashboard page → dashboard route/client → environment variable → provider contract → authenticated health/evidence → fail-closed UI`

## Current evidence

- Gateway: `GATEWAY_URL` and `ADMIN_DASHBOARD_API_KEY` are present; live health and contract verification remain deployment evidence.
- Nexus: `NEXUS_ADMIN_API_TOKEN` is present; authenticated freshness and state verification remain deployment evidence.
- Neon/Postgres: Neon and generic Postgres variables are present; one authoritative store, schema ownership, migrations, backups, and least-privilege role must be selected and evidenced.
- Supabase: project URL and key names are present; schema and RLS verification is required before enabling Supabase-backed pages.
- Upstash: REST variables are present; use only for ephemeral cache, rate limiting, or queue state, never as a system of record.
- AWS Aurora PostgreSQL: resource and connection variables are present; treat as an alternative SQL provider until ownership and failover are documented.
- Stacks, Oracle, Tableland, Kwil: endpoint-specific health, auth, and version evidence is required before exposing actions.

## ITIL 4 operating model

- **Incident management:** record impact, source, timestamp, and safe remediation.
- **Service request management:** require supported request, owner, approval, and completion evidence.
- **Problem management:** link recurring failures to root-cause ownership and corrective change.
- **Change enablement:** require OpenSpec scope, checks, rollback, and post-change evidence.
- **Service configuration management:** maintain owner, contract, variables, boundary, and state for each service.
- **Monitoring and event management:** consume provider observations; never synthesize healthy telemetry.
- **Continual improvement:** convert every gap into an owned, reviewable action.

## Residual gaps

Production health, provider schema/RLS, Docker/Compose startup, rollback, branch protection, and external repository changes require owner or deployment evidence outside this repository.
