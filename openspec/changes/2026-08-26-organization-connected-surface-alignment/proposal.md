# Organization Connected Surface Alignment

## Why

The platform catalog and connected-provider surface need one unambiguous local source of truth after the full-platform reframing and live-provider work.

## Scope

- Audit all visible organization repositories and read-only GitHub evidence.
- Deduplicate provider aliases and correct repository ownership metadata.
- Make configuration-only, live-probed, unavailable, archived, and external states explicit.
- Record deployment, Docker, governance, schema, and provider verification blockers.

## Non-goals

- No remote repository, GitHub ruleset, deployment, DNS, database, secret, wallet, custody, protocol, or provider mutation.
- No health claims based solely on environment-variable names.

## Acceptance criteria

- Catalog references only existing local schemas or omits unsupported schema references.
- All visible organization repositories have explicit role and lifecycle state.
- Provider aliases and authority boundaries are documented once.
- Audit records evidence and owner-coordinated blockers.
- Existing local validation remains passing.
