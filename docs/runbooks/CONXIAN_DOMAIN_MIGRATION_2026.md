# Conxian domain migration runbook

## Approved target

- Canonical public site: `www.conxian-labs.com`
- Apex `conxian-labs.com`: redirect to `www`
- `conxian.io`: redirect or approved secondary brand domain
- Control plane: `app.conxian-labs.com`
- Public API: `api.conxian-labs.com`
- Gateway: `gateway.conxian-labs.com`
- Nexus: `nexus.conxian-labs.com`
- Market: `market.conxian-labs.com`
- SDK: `sdk.conxian-labs.com`
- Documentation: `docs.conxian-labs.com`
- Status: `status.conxian-labs.com`

The machine-readable source of truth is `platform/domains.registry.json`.

## Current discovery

Vercel currently reports `conxia-labs.com` assigned to `conxius-platform-admin-dashboard` and `conxian-labs.com` assigned to `conxian-business-control-plane`. The similarly named `conxia-labs.com` assignment must be confirmed as intentional or retired; do not remove it until traffic, DNS ownership, and rollback evidence exist.

## Execution order

1. Confirm DNS and legal ownership of `conxian-labs.com` and `conxian.io`.
2. Confirm the Vercel team owns every target project and identify the production deployment for each repository.
3. Add staging hosts first, using `*.staging.conxian-labs.com` or equivalent project-specific staging domains.
4. For each service, configure the canonical hostname, TLS, health path, API origin, CORS allowlist, OAuth callbacks, webhook URLs, cookies, OpenAPI server URLs, and observability labels.
5. Validate health, redirects, TLS, CORS, authentication, webhooks, and metrics from an external runner.
6. Cut over one service at a time with rollback to the previous hostname.
7. Keep old hosts redirecting until access logs show no supported callers and the owning repository approves retirement.
8. Retire `conxia-labs.com` only after DNS, traffic, and rollback evidence are recorded.

## Cross-repository coordination

Create one issue per repository using the checklist below. Link all issues to the organization domain-migration project once Projects API access is available.

- [ ] Confirm owner and production deployment
- [ ] Replace hardcoded domain/API origins
- [ ] Update CORS and callback allowlists
- [ ] Update webhook and OpenAPI URLs
- [ ] Add health endpoint and uptime probe
- [ ] Add staging hostname validation
- [ ] Add rollback and traffic evidence
- [ ] Document cutover and retirement decision

## Important constraint

DNS, Vercel domain assignments, GitHub issues/projects, and external repository changes are not mutated by this repository change. The current GitHub token lacks Projects write/read access, and Vercel domain assignment changes require explicit operator execution with DNS ownership confirmed.
