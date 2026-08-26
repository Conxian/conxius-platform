# Live Provider Connection Alignment

## Decision

The Conxian Platform uses one evidence model for configured providers. Configuration is inventory only; live status requires a bounded server-side probe or an explicit evidence-only state.

## Canonical runtime rules

- `GATEWAY_URL` is the canonical Gateway endpoint.
- `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` are equivalent aliases; server code prefers `SUPABASE_URL`.
- `NEON_DATABASE_URL` and `DATABASE_URL` identify the SQL persistence contract; neither is probed over HTTP.
- `UPSTASH_KV_KV_REST_API_URL` is the canonical Upstash REST endpoint.
- Stacks, Oracle, Tableland, Kwil, and Nostr are provider-owned adapters and remain fail-closed when no safe endpoint contract is declared.
- AWS Aurora, ERP attestation, and database credentials are configuration/evidence-only until their owner supplies a supported health contract.

## Safety

The `/api/status` route is dynamic, no-store, bounded to five seconds per provider, and never returns credentials or response bodies. It does not mutate external systems, write secrets, execute protocol operations, or claim custody.

## Remaining owner actions

Confirm endpoint-specific health paths and authentication contracts for Gateway, Nexus, Oracle, Tableland, Kwil, and Nostr. Confirm the authoritative SQL provider and deployment of the current dashboard branch before treating production status as complete.
