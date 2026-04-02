# Proposal: Admin Dashboard secret hygiene

## Problem
The Admin Dashboard persists high-privilege institutional secrets locally for administrative workflows. Listing those keys in the repo root `.env.schema` (which is commonly copied into the platform-wide `.env`) increases the risk that long-lived tokens end up in the global runtime environment or CI.

Separately, representing GCP service-account credentials as raw multi-line JSON in `.env` files is error-prone across common dotenv loaders.

## Decision
- Keep Admin Dashboard secrets service-scoped to `services/admin-dashboard/.env.admin` (gitignored), with a copy-safe template in `services/admin-dashboard/.env.admin.example`.
- Avoid listing admin-only tokens in the repo root `.env.schema`; keep that schema focused on platform-wide runtime configuration.
- Standardize admin-only secret keys with an `ADMIN_` prefix (including `ADMIN_GCP_SA_KEY_JSON`) to reduce ambiguity.
- When the Admin Dashboard persists `.env.admin`, write values in a dotenv-friendly format (quoted + escaped).
- Treat secret values as strings (empty string allowed); reject non-string values to avoid accidental persistence of unexpected payloads.
- For `ADMIN_GCP_SA_KEY_JSON`, canonicalize input by parsing and re-stringifying JSON before writing (keeps pretty-printed JSON safe and consistent).

## Non-goals
- Introducing a managed secret store (Vault / cloud secret managers).
- Adding authentication/RBAC to the Admin Dashboard.
