# Proposal: CON-353 Harden SIDL auth and abuse controls

Refs #347
Linear: CON-353

## Problem

The current SIDL (Sovereign Infrastructure Description Language) endpoints in `admin-dashboard` lack production-grade authentication and abuse protections. Specifically, the vote and checkout endpoints are public and vulnerable to replay attacks or volume-based abuse.

## Goals

1. Implement API key authentication for state-changing SIDL endpoints.
2. Add rate-limiting scaffolding to prevent automated abuse.
3. Harden x402 payment header validation.
4. Document security assumptions for SIDL operations.

## Scope

- Update `services/admin-dashboard/src/app/api/cart/mandates/[id]/checkout/route.ts`.
- Update `services/admin-dashboard/src/app/api/governance/votes/route.ts`.
- Implement a shared auth utility in `services/admin-dashboard/src/lib/support/auth.ts`.

## Deliverables

- `openspec/changes/2026-06-14-con-353-sidl-hardening/proposal.md`
- Implementation of API key checks in SIDL routes.
- Documentation update in `README.md` or `SECURITY.md`.
