# Conxian Platform Connection Audit — 2026-08-26

## Scope
Repository code, knowledge-base and governance documents, OpenSpec artifacts, Compose, CI, service manifests, and declared database/application connection families were reviewed. External mutations were not performed because no per-target migration record, backup strategy, or target schema approval was available.

## Findings

| Severity | Area | Finding | Status |
|---|---|---|---|
| P1 | Live integrations | Gateway, Oracle, Stacks, Tableland, and Kwil endpoint variables are not present in the runtime environment inventory used by the audit shell. | Blocked by configuration/credential availability |
| P1 | Compose | `gateway` and `conxian-ui` use nginx placeholders while exposing non-nginx ports; their probes target nginx port 80 and are intentionally placeholder-only. | Documented existing boundary; Docker validation unavailable |
| P1 | Live integrations | Supabase base URL responded at the network layer; root path returned HTTP 404, which is expected for a project API root and is not an auth/schema probe. | Reachable; deeper MCP schema validation pending |
| P1 | Live integrations | Upstash REST endpoint returned HTTP 401 without an authenticated request. | Reachable; credential-safe probe confirms auth is required |
| P2 | Tooling | The initial audit command used `check:dependencies`, but the repository exposed only `check:dependency-consistency`. | Remediated with compatibility alias |
| P2 | Runtime | Docker is unavailable in the sandbox, so Compose config/startup and container health could not be executed. | Deferred to Docker-enabled runner |
| P2 | Security | Hardened audit found no tracked secrets, private keys, or generated artifacts. | Passed |
| P2 | Governance | Existing OpenSpec service-readiness proposal already covers placeholder probes, ESM mode, truthful validation, and secret setup. | Used as governing change artifact |

## Connection matrix summary

- **Local Postgres/Redis:** declared by Compose; healthchecks are present; runtime startup is unverified without Docker.
- **Neon/Postgres:** environment inventory contains multiple Neon/Postgres aliases; this repository's executable services do not show a direct Neon client adapter in the audited source paths.
- **Supabase:** project URL and publishable/secret key names are available; no live schema or RLS mutation was attempted.
- **Upstash/Redis:** REST endpoint is reachable and correctly rejects unauthenticated access; no data operation was performed.
- **Gateway/Nexus/Stacks/Oracle/Tableland/Kwil:** configuration names are documented/consumed in code, but endpoint-specific live probes are blocked by absent endpoint variables in the shell audit environment.
- **Nostr/ERP/attestation:** code and tests are present; no external mutation was attempted; trust material was treated as secret configuration.
- **Observability:** Prometheus and Grafana are Compose-managed; Prometheus scrape secret is file-backed and not committed.

## Remediation performed

- Added `check:dependencies` as a compatibility alias to the canonical `check:dependency-consistency` script.
- Preserved existing OpenSpec and Compose boundaries; did not replace external dependency slots with fake protocol implementations.
- Recorded live probe results without printing credentials or response bodies.

## Verification

- `python3 scripts/maintenance/system_audit.py` — passed.
- `python3 scripts/maintenance/hardened_audit.py` — passed; nginx placeholder reminder only.
- `pnpm install --frozen-lockfile` — passed.
- `pnpm run check:dependency-consistency` — passed.
- `pnpm test` — passed (full output captured by the runner).
- Supabase root probe — HTTP 404, reachable.
- Upstash REST root probe — HTTP 401, reachable and auth-protected.
- Docker Compose validation — unavailable because Docker is not installed.

## Deferred actions

1. Run Compose config/startup and health verification on a Docker-enabled runner.
2. Enable the relevant database/protocol MCPs or provide non-secret endpoint configuration for schema and metadata checks.
3. Create an explicit per-target migration record before any live DDL or configuration mutation.
4. Resolve cross-repository authority questions through issue #1167 rather than changing local ownership claims.
5. Append this audit to the repository session continuity log during the final implementation pass.

No user data, funds, wallets, credentials, or external database records were modified by this audit.
