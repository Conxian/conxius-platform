# Proposal: Correct UBI endpoint shape in `GAPS.md`

## Problem
`GAPS.md` documents the Universal Bitcoin Identity (UBI) endpoint as `/api/v1/identity/ubi`. The Gateway implementation and feature description are address-scoped (`/api/v1/identity/ubi/{address}`), so the current doc reads like a collection endpoint and can mislead integrators.

## Decision
- Update the UBI bullet in `GAPS.md` to reference the address-scoped endpoint: `/api/v1/identity/ubi/{address}`.

## Non-goals
- Changing Gateway routing or adding new endpoints.
- Expanding the gap analysis beyond this documentation correction.
