# Cross-repository domain migration checklist

Use this checklist to open one coordinated issue in each owning repository. The platform registry is the source of truth: `platform/domains.registry.json`.

## conxian-labs-site
- [ ] Assign `www.conxian-labs.com` as production domain
- [ ] Redirect apex `conxian-labs.com` to `www`
- [ ] Replace canonical URLs, sitemap, robots, analytics, and OG URLs

## conxian-gateway
- [ ] Assign `api.conxian-labs.com` and `gateway.conxian-labs.com`
- [ ] Update CORS, auth audiences, webhook origins, OpenAPI servers, and health probes
- [ ] Publish versioned API contract and rollback host

## conxius-platform
- [ ] Assign `app.conxian-labs.com`
- [ ] Update Gateway origin, callbacks, cookies, CSP, readiness, and observability labels
- [ ] Validate all rendered routes against live service APIs

## conxian-nexus
- [ ] Assign `nexus.conxian-labs.com`
- [ ] Update proof/evidence API origin, callback policy, health and metrics probes

## conxian_market
- [ ] Assign `market.conxian-labs.com` and `docs.conxian-labs.com`
- [ ] Update documentation canonical links, API examples, sitemap, and release links

## conxius-enclave-sdk
- [ ] Assign `sdk.conxian-labs.com` to generated/reference documentation
- [ ] Update package metadata, release links, attestations, and security contact URLs

## deployment-monitoring
- [ ] Assign `status.conxian-labs.com`
- [ ] Monitor every registry host and publish incident/maintenance behavior

## Shared acceptance criteria
- [ ] DNS ownership confirmed
- [ ] TLS active
- [ ] Staging hostname validated
- [ ] Redirect and canonical URL verified
- [ ] CORS/auth/webhook behavior verified
- [ ] Health and metrics probes verified
- [ ] Traffic and rollback evidence recorded
- [ ] Old hostname retirement approved by owner

GitHub Projects alignment is pending organization Projects API access. Do not infer project state from repository issue lists alone.
