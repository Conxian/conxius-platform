# Proposal: Admin Dashboard secret hygiene

## Problem

The Admin Dashboard persists long-lived institutional secrets in a service-scoped `.env.admin` file. Including those keys in the root `.env.schema` (which is copied into the platform-wide `.env` via `make auth`) increases the chance that high-privilege tokens are accidentally placed into the global runtime environment.

Separately, the Admin Dashboard needs a dotenv-safe way to represent GCP service-account credentials, since raw JSON strings are easy to paste in an inconsistent format.

## Decision

- Keep institutional secret keys **service-scoped** to `services/admin-dashboard/.env.admin` (gitignored) and document the flow via `services/admin-dashboard/.env.admin.example`.
- Keep the root `.env.schema` focused on platform-wide runtime configuration and avoid listing admin-only tokens there.
- Provide a dotenv-safe example format for `GCP_CREDENTIALS` and document newline escaping.
- Explicitly warn about Next.js client-side env exposure (e.g., `NEXT_PUBLIC_*`) and recommend tightening local `.env.admin` file permissions.

## Non-goals

- Introducing a managed secret store (Vault / cloud secret managers).
- Adding RBAC/authentication to the Admin Dashboard.
