# conxian-labs.com domain runbook

## Canonical routing

- Canonical host: `https://www.conxian-labs.com`
- Apex host: `https://conxian-labs.com` redirects to the canonical host with HTTP 308.
- Platform owner: `Conxian/conxius-platform`, service `admin-dashboard`.
- Machine-readable map: `platform/domain-service-map.json`.

## End-to-end checks

1. Request `/` and confirm HTTP 200 from the canonical host.
2. Request `/api/health` and confirm HTTP 200 without exposing response secrets.
3. Confirm `robots.txt` and `sitemap.xml` are served by the same deployment.
4. Confirm protected data routes return `401` when no admin credential is supplied; a `401` is an expected security response, not a deployment failure.
5. Confirm configured provider evidence is reported as configured/reachable only after safe authenticated checks.

## Current boundary

The dashboard is a neutral control plane. Gateway, Nexus, protocol, wallet, custody, signing, treasury, yield, pricing, trading, and protocol-economics capabilities remain owned by their respective repositories or providers. The platform must not fabricate availability or claim custody.

## Failure handling

- A root `500` is a deployment/runtime incident. Inspect the Vercel deployment logs and deployment commit first; do not mask it with client fallbacks.
- A protected API `401` is expected without `ADMIN_DASHBOARD_API_KEY` or an equivalent admin credential.
- A provider `503` means unavailable/unconfigured and should retain source and observation metadata.
- DNS, domain assignment, and external repository deployments require the owning Vercel/GitHub administrator when they are outside this repository.

## Review lens

Use ITIL 4 only for review evidence: incident, service request, problem, change enablement, configuration, monitoring/event, and continual-improvement observations. It is not the platform architecture.
