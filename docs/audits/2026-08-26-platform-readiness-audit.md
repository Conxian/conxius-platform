# Cross-repository platform readiness audit — 2026-08-26

## Scope
Read-only inspection covered every Conxian organization repository visible to the authenticated GitHub CLI, plus local platform contracts, service catalog, lifecycle checks, governance, security, and validation commands.

## Organization inventory

| Repository | State | Workflows | Open PRs | Open issues | Platform disposition |
|---|---:|---:|---:|---:|---|
| `conxius-platform` | active | 19 | 0 | 7 | Control plane; locally validated |
| `conxius-wallet` | active | 5 | 2 | 3 | Wallet experience; owner validation required |
| `conxian-business` | active | 13 | 0 | 7 | Strategy/BOS authority; owner validation required |
| `conxian-nexus` | active | 7 | 1 | 1 | Proof/evidence layer; owner validation required |
| `lib-conxian-core` | active | 10 | 0 | 0 | Shared contracts; owner validation required |
| `conxian-gateway` | active | 10 | 2 | 1 | Runtime data plane; owner validation required |
| `conxius-enclave-sdk` | active | 14 | 0 | 7 | Security/signing boundary; owner validation required |
| `Conxian` | active | 11 | 0 | 9 | Organization metadata; owner validation required |
| `conxian_market` | active | 3 | 0 | 1 | Protocol documentation; owner validation required |
| `conxian_ui` | active | 4 | 0 | 1 | Product experience; owner validation required |
| `conxian-labs-site` | active | 3 | 0 | 0 | Public site; owner validation required |
| `conxian.github.io` | active | 1 | 0 | 1 | Documentation site; owner validation required |
| `.github` | active | 4 | 0 | 4 | Organization workflow/config authority |
| `.github-private` | active/private | 2 | 0 | 0 | Private organization controls |
| `conxius-orbit` | archived | 5 | 0 | 0 | Compatibility dependency only |

## Verified platform controls

The repeatable `pnpm run check:org-readiness` collector requires an authenticated `gh` session. If GitHub credentials are unavailable, it fails closed with an actionable error rather than producing incomplete organization evidence.

- Repository discovery protocol passed and attested the four required context files.
- Service catalog validation passed: 3 local services and 9 external repositories.
- Security/system audit passed: no tracked environment files, private keys, generated artifacts, or obvious hardcoded secrets.
- Hardened audit passed; it emitted only a deployment-configuration reminder for external Render ownership.
- Dependency consistency passed for Next.js 16.2.12 and TypeScript 6.0.3.
- Full test suite passed: 27 platform tests, 21 protocol-revenue tests, 240 admin-dashboard tests, 6 admin-pulse-bos tests, and 7 plugin tests.
- GitHub inventory found no available `main` branch protection data for any inspected repository. This is recorded as an external governance gap, not claimed as configured.

## Readiness assessment

**Platform repository:** code, catalog, governance, security, and test gates are correctly set up and passing locally. The platform is not fully organization-ready until external repository contracts and organization rulesets are confirmed by owners.

**External readiness:** not attestable from this read-only workspace. The inventory confirms repository existence and activity, but does not prove branch protection, required checks, deployment health, release evidence, secret scanning, or cross-repository compatibility.

## Required owner-coordinated actions

1. Configure and verify organization rulesets/branch protection on every active default branch, including required reviews, required CI, signed/protected changes, and push protection.
2. Publish machine-readable manifests and compatibility fixtures from Gateway, Core, Nexus, Enclave, Wallet, and Orbit ownership boundaries.
3. Adopt the platform lifecycle gate and reusable workflow through coordinated PRs; do not silently duplicate or absorb repository-owned workflows.
4. Confirm the archived Orbit compatibility policy and replacement owner before removing references.
5. Provide Docker-enabled Compose evidence and live Gateway/UI deployment evidence; local sandbox validation cannot establish those conditions.
6. Obtain GitHub Projects access to link lifecycle work to an approved organization roadmap.

## Boundary statement

`conxius-platform` orchestrates deployment, lifecycle gates, verification, and telemetry. It does not become authority for protocol state, proof, signing, custody, wallet execution, or business mandates. No remote repository, GitHub setting, issue, PR, external service, or secret was modified during this audit.

## Validation evidence

- `pnpm --silent agent-discovery --json`
- `python3 scripts/maintenance/system_audit.py`
- `python3 scripts/maintenance/hardened_audit.py`
- `pnpm run check:dependency-consistency`
- `pnpm run check:service-catalog`
- `pnpm test`

Docker/Compose startup and live external service checks remain environment-dependent and were not represented as passing.
