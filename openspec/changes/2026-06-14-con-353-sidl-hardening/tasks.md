# Tasks: CON-353 Harden SIDL auth and abuse controls

## Implementation checklist

- [x] Create CON-353 OpenSpec change artifacts (`proposal.md`, `tasks.md`).
- [x] Implement `validateAdminAuth` utility in `services/admin-dashboard/src/lib/support/auth.ts`.
- [x] Integrate API key check into `votes` API route.
- [x] Integrate API key check into `checkout` API route.
- [x] Update existing tests (`sidlPersistence.test.ts`) to include the required auth header.
- [x] Verify all tests pass locally.
- [x] **Expanded scope (2026-07-03):** Standardize all admin API routes to use `validateAdminAuth()`.
  - Converted 6 inline `X-Admin-API-Key` checks to `validateAdminAuth()`.
  - Added auth to 11 previously unprotected routes.
  - 22/23 admin routes now authenticated (only `/api/health` is intentionally public).
  - See commit `86677eb`.

## Acceptance criteria (testable)

- [x] **AC-1 (Auth Enforcement):** SIDL endpoints return 401 Unauthorized when the `X-Admin-API-Key` header is missing or incorrect.
- [x] **AC-2 (Regression Check):** Valid API keys allow the endpoints to function as expected.
- [x] **AC-3 (Observability):** Unauthorized attempts are correctly logged via the SIDL observability layer.
- [x] **AC-4 (Full Coverage):** All non-health admin API routes enforce auth via the canonical `validateAdminAuth()`. (Added 2026-07-03)
