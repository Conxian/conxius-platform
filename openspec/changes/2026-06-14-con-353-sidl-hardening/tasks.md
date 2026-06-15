# Tasks: CON-353 Harden SIDL auth and abuse controls

## Implementation checklist

- [x] Create CON-353 OpenSpec change artifacts (`proposal.md`, `tasks.md`).
- [x] Implement `validateAdminAuth` utility in `services/admin-dashboard/src/lib/support/auth.ts`.
- [x] Integrate API key check into `votes` API route.
- [x] Integrate API key check into `checkout` API route.
- [x] Update existing tests (`sidlPersistence.test.ts`) to include the required auth header.
- [x] Verify all tests pass locally.

## Acceptance criteria (testable)

- [x] **AC-1 (Auth Enforcement):** SIDL endpoints return 401 Unauthorized when the `X-Admin-API-Key` header is missing or incorrect.
- [x] **AC-2 (Regression Check):** Valid API keys allow the endpoints to function as expected.
- [x] **AC-3 (Observability):** Unauthorized attempts are correctly logged via the SIDL observability layer.
