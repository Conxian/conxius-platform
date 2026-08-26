# Conxian Labs domain reality remediation

## Why

The owned domain currently resolves to a separate Vercel project/deployment from the repository-owned admin dashboard. The production build logs show `apps/control-plane` and a missing `BETTER_AUTH_SECRET`, while this repository deploys `services/admin-dashboard`. This creates a domain-to-repository mismatch and a production HTTP 500.

## Scope

- Establish a machine-readable domain-to-service ownership map.
- Add robots and sitemap metadata routes to the repository-owned dashboard.
- Document canonical host routing, health checks, connection evidence, and escalation boundaries.
- Do not mutate DNS, domain assignment, external repositories, or the inaccessible Vercel project from this change.

## Acceptance criteria

- Repository build, typecheck, and tests pass.
- The dashboard has explicit canonical host metadata routes.
- Domain ownership and external service boundaries are documented.
- The external production 500 is reported with its exact owner action: align the domain with the intended deployment or configure the missing secret in the currently bound control-plane project.
