# Production boundary (BOS)

This document defines what `conxius-platform` is allowed to own for BOS-related work, and what code paths are considered “production boundary” for this repository.

## Owner surface

`conxius-platform` may own:

- Operator/admin services that ship from this repo (for example, `services/admin-dashboard`).
- Secrets provisioning and operator tooling that can affect production behavior (for example, `scripts/provision-secrets.sh`).
- Orchestration wiring (submodule pins, `docker-compose.yml`, CI workflows).

`conxius-platform` must not become the home for core Nexus/Gateway production logic. Those changes belong in their owning repositories.

## Production boundary

In this repository, the production boundary is:

- `services/admin-dashboard/` (excluding `services/admin-dashboard/src/tests/`)
- `scripts/provision-secrets.sh`

Anything in the production boundary must be fail-closed (no simulated-success defaults) and must not contain stub markers.

## Dev-only surfaces

The following paths are explicitly **dev-only** and must not be wired into production deployments:

- `services/admin-pulse-bos/`
