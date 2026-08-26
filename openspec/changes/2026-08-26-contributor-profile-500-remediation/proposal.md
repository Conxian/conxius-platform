# Contributor profile 500 remediation

## Problem
The launch and tiers pages call read-only contributor and community endpoints without authentication. Those routes invoked `validateAdminAuth`, which returned HTTP 500 when `ADMIN_DASHBOARD_API_KEY` was not configured, producing `Failed to fetch contributor profile: 500`.

## Change
Treat launch profile and community statistics as public read-only presentation endpoints. Remove the admin-key dependency from these two GET handlers while leaving all state-changing and administrative API routes protected by the existing authentication boundary.

## Verification
- `pnpm --dir services/admin-dashboard typecheck`
- `pnpm --dir services/admin-dashboard test`
- `git diff --check`

## Security boundary
The handlers return simulated aggregate launch data only. No user records, credentials, funds, or state-changing operations are exposed.
