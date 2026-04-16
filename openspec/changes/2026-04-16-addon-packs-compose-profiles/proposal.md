# Add-on packs (bisq/rgb/bitvm) as Docker Compose profiles

## Goal

Define a minimal, stable packaging interface for optional add-ons so distributions (Compose now; Helm / Node OS later) can expose the same contract.

This change is intentionally limited to:

- A clear RPC endpoint contract (environment variables)
- Minimal Docker Compose wiring via Compose profiles

This is a dependency of the unified config surface defined in CON-479.

## Pack contract (v1)

Each add-on pack defines its RPC endpoint via `HOST` + `PORT` environment variables.

- Bisq
  - `BISQ_RPC_HOST`
  - `BISQ_RPC_PORT`
- RGB
  - `RGB_RPC_HOST`
  - `RGB_RPC_PORT`
- BitVM
  - `BITVM_RPC_HOST`
  - `BITVM_RPC_PORT`

When running under Docker Compose, `*_RPC_HOST` should resolve to a service name on the Compose network.

## Compose profile interface

The platform Compose baseline (`docker-compose.yml`) exposes three profiles:

- `bisq`
- `rgb`
- `bitvm`

Enabling a profile starts a corresponding `*-node` service on the internal Compose network without changing any core services.

For v1, the `*-node` services are explicit RPC stubs (HTTP 503) so the endpoint contract is stable even before real node images are pinned.

## Usage

```bash
# core stack only
docker compose up -d

# core stack + bisq add-on
docker compose --profile bisq up -d

# core stack + all add-ons
docker compose --profile bisq --profile rgb --profile bitvm up -d
```
