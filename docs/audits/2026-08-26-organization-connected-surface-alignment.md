# Organization and Connected Surface Alignment Audit — 2026-08-26

## Scope

This audit reviewed the prior conversation, the active Conxian Platform repository, all visible Conxian organization repositories, repository setup contracts, provider aliases, and available read-only GitHub evidence. No remote repository, deployment, database, DNS, secret, or provider resource was mutated.

## Organization inventory

The organization exposes 15 repositories. Fourteen are active and `Conxian/conxius-orbit` is archived. All repositories report `main` as their default branch. The platform repository is the local implementation and evidence spine; Gateway, Nexus, core, wallet, enclave, business, market, UI, public-site, documentation, and organization-governance repositories remain external authorities.

## Corrections applied

- Removed the invalid `platform/services.catalog.schema.json` JSON Schema reference; no such schema exists in the repository.
- Corrected the plugin owner repository from the nonexistent `conxian-labs/conxius-platform` namespace to `Conxian/conxius-platform`.
- Added all 15 organization repositories to the machine-readable service catalog with explicit role and lifecycle state.
- Reframed the documentation index from control-plane language to platform language.

## Canonical configuration decisions

| Concern | Canonical source | Compatibility aliases | State |
| --- | --- | --- | --- |
| Gateway routing | `GATEWAY_URL` | `NEXT_PUBLIC_CORE_API_URL`, `CONXIAN_GATEWAY_URL` | Route through Gateway; do not infer provider authority |
| SQL persistence | `DATABASE_URL` or the explicitly selected provider URL | Neon/Postgres aliases | Select one authoritative store before writes |
| Supabase | `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` | Evidence-only until schema, RLS, and owner contract are verified |
| Upstash | `UPSTASH_KV_KV_REST_API_URL` + token | legacy KV aliases | Ephemeral state only |
| Protocol adapters | provider-specific endpoint variables | none | Fail closed until endpoint, auth, version, and owner evidence exist |
| Organization inventory | `platform/services.catalog.json` | none | Canonical local catalog |
| Platform identity | `platform/platform.manifest.json` | none | Canonical platform boundary |

## Organization evidence

The read-only GitHub token enumerated all repositories and open issues. Branch-protection API checks returned “Branch not protected” for the public repositories and an unavailable/plan-restricted response for the private governance repository. This is evidence of a current governance gap, not permission to mutate organization settings.

Relevant open organization actions include ruleset activation, CI validation completion, protocol handoff, and stale-branch review. These remain owner-coordinated because the available integration is read-only.

## Connected-surface interpretation

Project environment-variable names are available through the v0 project inventory, but shell commands cannot read their values. Therefore configuration presence must not be reported as live health. The status adapter remains fail-closed and redacts credentials and response bodies. Production route behavior also requires a deployment of the current branch; local repository alignment does not change the deployed artifact.

## Remaining blockers

1. Deploy the current branch before claiming the public `/status` and `/api/status` surfaces are live.
2. Confirm one authoritative SQL provider before enabling persistence writes.
3. Verify Gateway, Nexus, Stacks, Oracle, Tableland, Kwil, Nostr, Supabase, Upstash, Neon, and Aurora contracts in their owning environments.
4. Activate organization rulesets and branch protections through the organization owners.
5. Run Docker/Compose checks on a Docker-enabled runner.

## Conclusion

The repository setup is now less ambiguous and the catalog is deduplicated around explicit authority and compatibility aliases. All external connections remain evidence-gated; no unavailable provider is represented as healthy or connected merely because an environment-variable name exists.
