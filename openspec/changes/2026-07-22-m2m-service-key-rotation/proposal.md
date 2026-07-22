# OpenSpec Proposal: M2M Service-Key Rotation v1

**Date**: 2026-07-22
**Reference**: [Issue #1161](https://github.com/Conxian/conxius-platform/issues/1161) and [triggering comment](https://github.com/Conxian/conxius-platform/issues/1161#issuecomment-5045738826)
**Status**: Proposed
**Phase**: Phase 1 — specification and design only

## 1. Problem statement

The platform currently treats service-to-service keys as long-lived environment
values. Rotation is a manual, multi-deployment procedure: an operator must
generate a replacement, update the consuming deployment, update the source
deployment, and coordinate rollout before revoking the old value. The current
model does not provide a dashboard-owned registry, generation preconditions,
grace-period state, durable audit history, or a safe recovery path when a
rotation response is lost.

The existing M2M model also has an important ownership boundary. The admin
dashboard can manage the registry it owns, but Phase 1 MUST NOT silently mutate
secrets, manifests, or deployment configuration in the Gateway, Nexus, wallet,
Orbit, ElizaOS, UI, or any other repository. Operators remain responsible for
securely distributing the one-time replacement secret and deploying consumers.

Issue #1161 therefore needs a contract before runtime implementation begins.
The contract must make rotation fail-closed, preserve compatibility with
environment bootstrap, prevent plaintext persistence, and make concurrent and
lost-response behavior deterministic.

## 2. Goals

- Define a dashboard-owned service-key registry whose records contain hashes and
  metadata only; plaintext service keys MUST never be persisted.
- Preserve first-start compatibility by bootstrapping configured environment
  keys, including `SERVICE_KEY_ADMIN_DASHBOARD`, into the registry.
- Make the registry authoritative for a service after its record is created and
  especially after that service is rotated; later environment changes MUST NOT
  silently replace registry state.
- Generate replacement secrets from 32 bytes of operating-system CSPRNG output
  and return each generated secret at most once in the successful rotation
  response.
- Define active/previous-key validation, bounded grace periods, optional future
  expiry, timing-safe comparisons, and fail-closed behavior.
- Define an admin-API-key-only rotation endpoint with an optimistic generation
  precondition and deterministic `409 Conflict` behavior.
- Define an operator-only rollback transaction with non-reused generations for
  committed rotations whose one-time response was lost.
- Define an optional admin-only metadata endpoint that cannot disclose secrets or
  hashes.
- Make registry mutation, revision advancement, and audit-event persistence one
  atomic transaction protected by an inter-process lock.
- Define Prometheus-compatible expiry metrics and idempotent threshold state
  without assuming Slack or email integrations.
- Specify exact error responses, recovery expectations, compatibility limits,
  rollback considerations, deployment constraints, and acceptance tests.

## 3. Scope

### 3.1 Registry and lifecycle contract

The canonical v1 specification defines:

- supported service IDs and environment-variable mapping;
- bootstrap behavior for a missing or empty registry;
- the hash representation and generated-secret encoding;
- active and previous key semantics;
- per-service generations and registry revisions;
- optional expiry and the default/minimum/maximum grace period; and
- the audit and expiry-notification metadata required for durable operation.

### 3.2 API contract

The change specifies:

- `POST /api/v1/m2m/service-keys/:serviceId/rotate`;
- the `409` recovery metadata and operator-only rollback contract;
- the request body, response body, cache policy, and one-time-secret rule;
- admin API key-only authorization; and
- the optional admin-only `GET /api/v1/m2m/service-keys` metadata surface.

### 3.3 Persistence and operational contract

The change specifies a file-backed v1 store with:

- atomic write/rename;
- an inter-process lock;
- monotonic revisions;
- same-transaction audit events;
- crash recovery by a marker-qualified candidate or already-active committed
  document, never by an arbitrary temporary file;
- malformed/unwritable-state failure behavior; and
- a single-writer persistent-volume limitation.

The design also defines a backend abstraction so a future database or secret
manager can replace the file backend without changing route or validation
semantics.

### 3.4 Implementation boundary

This phase creates only OpenSpec artifacts. It does **not** implement routes,
storage, validation code, migrations, dashboards, deployment changes, secret
distribution, or cross-repository updates.

## 4. Non-goals

- Automatically updating secrets in other repositories, CI systems, deployment
  platforms, or running services.
- Rotating `ADMIN_DASHBOARD_API_KEY`, `EXTERNAL_API_KEYS`, or JWT secrets.
- Replacing the existing admin authentication policy outside the new route's
  explicit admin-API-key-only requirement.
- Introducing Slack, email, PagerDuty, or other notification integrations.
- Supporting multi-writer shared storage, active-active dashboard rotation, or
  distributed leader election in v1.
- Persisting encrypted or reversible copies of service-key plaintext. V1 stores
  hashes and metadata only.
- Requiring a database or external secret manager before the file-backed v1
  contract can be implemented.
- Implementing runtime code during this Phase 1 documentation task.

## 5. Deliverables

This Phase 1 change produces:

1. `proposal.md` — scope, goals, boundaries, risks, and rollout intent.
2. `design.md` — lifecycle, persistence, API, concurrency, recovery, and
   operational design.
3. `tasks.md` — implementation checklist and testable acceptance criteria.
4. `spec-delta.md` — normative delta introducing the canonical specification.
5. `openspec/specs/m2m-service-key-rotation-v1.spec.md` — the v1 source of
   truth for implementation and review.

The follow-up implementation MUST NOT begin until the artifacts are reviewed
and the acceptance criteria are approved.

## 6. Risks and mitigations

- **Lost one-time response:** The server cannot recover a plaintext secret from
  a hash-only registry. The design treats a committed rotation as real, keeps
  the old key valid only for the bounded effective deadline, and requires an
  explicit operator rollback with a new generation rather than replaying the
  secret.
- **Concurrent rotations:** Two operators can otherwise invalidate each
  other's assumptions. A per-service generation precondition, inter-process
  lock, and `409 Conflict` response ensure only one request commits for a given
  generation.
- **Registry corruption or storage failure:** Falling back to environment keys
  after a registry has become authoritative could resurrect revoked credentials.
  Malformed, unreadable, or unwritable registry state therefore fails closed.
- **Deployment topology mismatch:** Multiple dashboard writers can lose updates
  or violate lock guarantees on unsupported volumes. V1 explicitly requires a
  single writer and exposes storage/lock health for deployment alerting.
- **Environment bootstrap drift:** Existing deployments may use opaque legacy
  values rather than encoded 32-byte secrets. Bootstrap hashes the exact
  environment value for compatibility; only newly generated rotation secrets
  are required to use 32 random bytes.
- **Notification duplication:** Repeated expiry evaluations can produce noisy
  alerts. Threshold crossings are persisted idempotently and exposed through
  Prometheus-compatible metrics; external routing remains the alerting system's
  responsibility.

## 7. Rollout and decision gates

1. Review the canonical spec and confirm ownership of the dashboard registry.
2. Implement the file-backed store and unit tests without changing consumers.
3. Deploy with a persistent volume and one writer; verify bootstrap and health
   metrics before rotating any production service.
4. Rotate one low-risk service, securely update that consumer using the
   one-time response, and verify active/previous validation during grace.
5. Roll out service by service while monitoring conflicts, expiry metrics, audit
   revision, and lock/storage failures.
6. Treat a lost response as a recovery event, not as permission to issue an
   unguarded second rotation.

No rollout step grants the dashboard authority to mutate another repository or
deployment automatically.
