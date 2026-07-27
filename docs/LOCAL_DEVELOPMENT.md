# Local Development

**Status:** Supported local contributor guidance; not a production deployment guide.

**Last verified:** 2026-07-27

**Authority:** [`GOVERNANCE.md`](../GOVERNANCE.md) and
[`PRODUCTION_BOUNDARY.md`](./PRODUCTION_BOUNDARY.md). Current alignment change:
[`2026-07-27-documentation-authority-and-operator-accuracy`](../openspec/changes/2026-07-27-documentation-authority-and-operator-accuracy/).

This repository provides direct package development and a Docker Compose
control-plane/integration harness. Neither path is a full Conxian protocol stack
or evidence of production readiness.

## Prerequisites

- Node.js `>=20.19.0`
- Corepack with pnpm `9.15.5`
- Docker with Compose v2 for the integration harness
- OpenSSL for local secret generation

```bash
corepack enable
pnpm install --frozen-lockfile
make init
```

## Direct Admin Dashboard development

Run the dashboard package directly when working on its application code:

```bash
pnpm --filter admin-dashboard dev
```

The default URL is `http://localhost:3001`. Set `PORT` to override it. This
process is distinct from every Compose service below.

Useful repository commands include:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter admin-dashboard run typecheck
pnpm --filter admin-dashboard run test:phase7
pnpm run docs:check
```

## Docker Compose integration harness

Provision a development environment file, then start the harness:

```bash
make auth
make start
```

The host URLs are:

| Surface | Host URL | Meaning |
| --- | --- | --- |
| Admin Dashboard | `http://localhost:3002` | Host port `3002` maps to dashboard container port `3001` |
| Grafana | `http://localhost:3001` | Host port `3001` maps to Grafana container port `3000`; this is not the direct dashboard process |
| Prometheus | `http://localhost:9090` | Local metrics UI/API |
| Conxian UI slot | `http://localhost:3000` by default | External dependency slot; the default image is a placeholder |
| Gateway slot | `http://localhost:8080` by default | External dependency slot; the default image is a placeholder |

`docker-compose.yml` defaults both the Gateway and Conxian UI slots to
`nginx:1.27-alpine`. Operators must supply real external images through
`GATEWAY_IMAGE` and `UI_IMAGE` when integration with those repositories is
required. The optional `bisq`, `rgb`, and `bitvm` profiles are Nginx-backed RPC
stubs for harness testing, not Bisq/RGB/BitVM nodes or production runtimes.

The Compose topology therefore validates local wiring only. Missing or stubbed
dependencies must remain unavailable and must not be interpreted as successful
routing, settlement, protocol execution, or deployment.

## What `make auth` does

For the default development profile, `make auth` runs
`scripts/provision-secrets.sh` with `.env.schema` and `.env` unless the caller
overrides those paths.

It:

- copies `.env.schema` to `.env` only when `.env` does not exist;
- generates absent `GATEWAY_JWT_SECRET`, `GATEWAY_ADMIN_API_KEY`,
  `POSTGRES_PASSWORD`, and `GRAFANA_PASSWORD` values;
- supplies supported Postgres defaults and derives `CORE_DB_URI` when absent;
- creates or validates the configured Prometheus scrape-password file with
  restrictive permissions;
- rejects selected placeholder Postgres/Grafana values and inconsistent
  Postgres URI credentials; and
- treats GitHub CLI authentication as optional context, not as a credential
  source.

It does **not** generate `ADMIN_DASHBOARD_API_KEY` or any `SERVICE_KEY_*`
values. It also does not retrieve dashboard, third-party, wallet, protocol,
cloud, or production credentials; distribute rotated keys to consumers;
establish complete M2M authentication; or deploy anything. Review the resulting
local file without printing secret values and populate remaining development
fields through an approved secret source.

`make auth-prod` selects the production schema and output filename, but it is
still an operator-sensitive local provisioning script. It is not a production
deployment or production-readiness mechanism.

## Stopping and diagnostics

```bash
make logs
make stop
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the boundary between current local,
external-owner, and target/proposed deployment surfaces.
