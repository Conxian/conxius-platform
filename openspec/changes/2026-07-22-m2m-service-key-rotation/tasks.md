# Tasks: M2M Service-Key Rotation v1

## Phase 1 artifact baseline

- [x] Create the dated change directory for issue #1161.
- [x] Create `proposal.md` with ownership, scope, non-goals, and rollout gates.
- [x] Create `design.md` with lifecycle, API, persistence, concurrency, and
  recovery decisions.
- [x] Create `spec-delta.md` describing the new normative capability.
- [x] Create `openspec/specs/m2m-service-key-rotation-v1.spec.md` as the canonical
  v1 specification.
- [x] Keep this phase documentation-only; do not implement runtime code or
  change deployment configuration.

## Follow-up implementation tasks

- [x] **T1 — Define the storage abstraction and file backend.** Implement a
  versioned registry store with hash-only service records, monotonic revisions,
  atomic write/rename, mode-restricted files, bounded inter-process locking,
  durable candidate/journal and commit-marker recovery, recovery-required health
  latching, explicit persistent-path configuration, and future-backend seams.
- [x] **T2 — Implement environment bootstrap.** Map all supported environment
  keys, including `SERVICE_KEY_ADMIN_DASHBOARD`, into generation-1 records only
  when creating the registry for the first time; persist bootstrap audit events
  atomically; never overwrite or later auto-create registry records from
  environment drift.
- [x] **T3 — Implement secret generation and validation.** Generate 32 random
  bytes from the OS CSPRNG, encode as unpadded base64url, hash the exact
  transport value, compare digests with timing-safe equality, and enforce active
  versus previous grace/expiry semantics.
- [x] **T4 — Implement admin-only rotation.** Add
  `POST /api/v1/m2m/service-keys/:serviceId/rotate`, require the admin API key
  only, validate request bounds, re-check `expectedGeneration` under lock, and
  return the generated secret exactly once with `Cache-Control: no-store`.
  Implement the documented JSON error envelope and conflict recovery metadata.
- [x] **T5 — Implement the optional metadata endpoint.** If enabled, add
  `GET /api/v1/m2m/service-keys` with admin-only authorization and metadata-only
  serialization; prove that hashes and secrets cannot appear in the response.
- [x] **T6 — Implement audit and expiry state.** Persist successful bootstrap,
  rotation, rollback, threshold, and registry-recovery events in the same
  transaction as registry state; use effective previous deadlines; expose the
  required bounded Prometheus metrics; make threshold markers idempotent; do not
  add Slack/email calls.
- [x] **T7 — Implement failure and recovery behavior.** Return the exact error
  codes/statuses, fail closed on malformed/unwritable state, surface lock
  contention as retryable `503` with `Retry-After`, recover only a
  marker-qualified candidate after a crash, distinguish pre-marker aborts from
  post-marker committed-but-response-unknown failures, and provide the
  operator-only rollback contract for a committed rotation whose one-time
  response was lost.
- [ ] **T8 — Add unit, integration, and concurrency tests.** Cover bootstrap,
  generated entropy, timing-safe validation, active/previous transitions,
  bounds, effective expiry, metadata/error redaction, first-colon header parsing,
  atomic audit writes, malformed state, initial-bootstrap crash recovery,
  post-marker failure latching, journal/candidate recovery, lock contention,
  same-generation races, restart authority, rollback input/deadline/target
  conflicts, exact metadata responses, and lost-response recovery.
  - [x] Phase 3A coverage: expiry-boundary and effective-deadline behavior,
    second-rotation invalidation, rollback conflicts and expiry caps, malformed
    and wrong-version fail-closed behavior, route validation/redaction, marker
    idempotency, marker-qualified recovery, and inter-process same-generation
    races.

  - [x] Phase 3B coverage: protected metrics scrape success, invalid scrape
    credentials, missing scrape configuration, and continued admin-key access.
  - [x] Phase 3C coverage: marker recovery journal/predecessor/audit evidence,
    initial-bootstrap and post-rename recovery, recovery-event idempotence,
    health/readiness failure states, readiness-aware metrics, and production
    health redaction.
- [x] **T9 — Document deployment and compatibility operations.** Record the
  persistent-volume/single-writer requirement, consumer update sequence, admin
  dashboard self-key procedure, distinction between service and admin API keys,
  rollback runbook, registry path/lock settings, and secret redaction rules.
- [ ] **T10 — Validate the implementation.** Run the repository's applicable
  typecheck, lint, unit/integration tests, OpenSpec checks if available,
  `git diff --check`, and a deployment-specific persistence/lock validation.
  - [x] Phase 3B local validation: focused M2M tests, metrics/auth tests,
    admin-dashboard typecheck, full admin-dashboard tests, configuration
    structure checks, and `git diff --check`.
  - [ ] Docker/Compose persistence, named-volume restart, and live Prometheus
    scrape validation — **blocked in this devbox because Docker and promtool
    are unavailable; rerun in Docker-enabled CI or an operations environment**.
  - [x] Phase 3C local review-fix validation: provisioning shell syntax and
    smoke checks, YAML structure checks, focused/full dashboard tests,
    readiness/metrics/auth coverage, typecheck, and diff hygiene.
  - [x] CI workflow repair: both affected Compose workflows provision the
    repository-owned Prometheus scrape secret and assert a regular mode-600
    host file before Compose startup; hosted execution remains the final
    Docker/Compose validation gate.

## Acceptance criteria

- [ ] **AC-1 — Canonical ownership.** The dashboard-owned registry is the only
  v1 source of truth after a service record is persisted, and the implementation
  does not write secrets, manifests, or deployment configuration in other repos.
  - **Pass when:** source inspection and integration tests show no outbound
    mutation path and an environment change cannot replace an existing record.
  - **Fail when:** a rotation implicitly updates another service or silently
    re-imports an environment value over registry state.

- [ ] **AC-2 — Hash-only persistence.** Only the private registry persistence
  document may contain hashes; audit, notification, backup, log, metric, trace,
  and error paths contain metadata only; no plaintext service key is persisted.
  - **Pass when:** state inspection finds only the documented hash format and
    redaction tests find no generated secret, hash, or authorization header
    outside the private registry document.
  - **Fail when:** plaintext, reversible encryption, raw headers, or a secret
    appears outside the one successful rotation response.

- [ ] **AC-3 — Entropy and comparison.** Every generated key decodes to exactly
  32 random bytes and service-key comparisons use a timing-safe primitive.
  - **Pass when:** the generator is CSPRNG-backed, output is unpadded base64url,
    and unit tests cover fixed-length digest comparison.
  - **Fail when:** a general-purpose PRNG, predictable seed, ordinary string
    equality, or variable-length secret comparison is used.

- [ ] **AC-4 — Bootstrap compatibility.** A missing registry imports all
  configured service environment keys, including `SERVICE_KEY_ADMIN_DASHBOARD`,
  at generation 1 and persists bootstrap audit events atomically. This initial
  bootstrap is the only automatic environment import path in v1.
  - **Pass when:** legacy non-empty environment values authenticate after
    bootstrap, state contains hashes only, and restart preserves the records.
  - **Fail when:** admin-dashboard bootstrap is omitted, bootstrap is only
    in-memory, or malformed/unwritable state falls back to environment auth.

- [ ] **AC-5 — Rotation authorization and response.** The rotate endpoint accepts
  only `X-Admin-API-Key`, generates a new secret server-side, returns `201` with
  `Cache-Control: no-store`, and never returns the secret again.
  - **Pass when:** service, external, and JWT credentials are rejected; the
    response contains exactly one generated secret and no hash.
  - **Fail when:** another M2M credential authorizes rotation, the caller can
    retrieve a prior secret, or the secret is logged/persisted.

- [ ] **AC-6 — Generation conflict.** `expectedGeneration` is checked under the
  writer lock, must be positive, and stale requests return
  `409 generation_conflict` without a new key, revision, or audit event.
  - **Pass when:** two concurrent requests with the same generation produce one
    success and one conflict; the conflict includes current generation/revision,
    exact previous-generation/grace/effective-deadline fields, and active expiry
    metadata without a secret or hash; a stale rollback precondition uses the same
    conflict contract.
  - **Fail when:** both commit, the loser overwrites the winner, or the loser
    receives a secret.

- [ ] **AC-7 — Grace and expiry bounds.** Default grace is 24 hours; accepted
  bounds are 5 minutes through 7 days inclusive; optional expiry must be future.
  - **Pass when:** active and previous acceptance follows the exact grace and
    expiry boundaries, including the earlier of previous expiry and grace, and a
    rollback active key cannot outlive that effective deadline.
  - **Fail when:** zero/negative/overlong grace, malformed expiry, or an expired
    key is accepted.

- [ ] **AC-8 — Metadata redaction.** The optional list endpoint is admin-only and
  returns the exact `200` JSON lifecycle metadata contract with `X-Request-ID`
  and `Cache-Control: no-store`, without hashes, secrets, or headers.
  - **Pass when:** authorized metadata reads are useful for recovery, the
    documented `409` body remains sufficient when GET is omitted, and a
    response/body/log redaction test finds no credential material.
  - **Fail when:** a hash, plaintext key, or reversible key representation is
    exposed.

- [ ] **AC-9 — Atomic state and audit.** Registry mutation, revision advancement,
  audit append, and notification marker updates commit together or not at all.
  - **Pass when:** injected failures before marker durability leave the prior
    valid state, revision, and accepted key unchanged; a durable commit marker
    makes the matching candidate authoritative after crash; post-marker failures
    preserve the committed revision for recovery; the durable journal survives
    an ambiguous rename/directory flush; the live backend latches
    `recovery_required` instead of serving a stale snapshot; orphan/unmarked
    candidates are ignored; and recovery events are idempotent by recovered
    commit ID.
  - **Fail when:** a key update is visible without its audit event or a failed
    transaction reports success.

- [ ] **AC-10 — Fail-closed storage.** Malformed, unreadable, schema-incompatible,
  unwritable, or lock-violating state returns the documented `503` behavior and
  never silently uses environment fallback; a latched `recovery_required` state
  blocks validation, rotation, rollback, and metadata reads until recovery.
  - **Pass when:** service validation and rotation fail closed and recovery is
    possible after state/storage repair, including an initial-bootstrap crash.
  - **Fail when:** partial state is accepted or stale environment values are
    resurrected.

- [ ] **AC-11 — Lost-response recovery.** If the commit succeeds but the `201`
  response is lost, retrying with the stale generation returns `409`, no secret
  is reissued, the old key works only during grace, and the operator rollback
  path creates a new generation using only the previous hash and clears the
  unknown failed-delivery key atomically.
  - **Pass when:** a simulated dropped response cannot cause duplicate rotation
    or secret retrieval and the documented rollback sequence works.
  - **Fail when:** the server stores plaintext, replays a secret, or accepts an
    unguarded second rotation.

- [ ] **AC-12 — Lock and revision safety.** Inter-process locking serializes
  mutations, revision increments are monotonic, and lock timeout is retryable.
  - **Pass when:** a held lock produces `503 m2m_registry_busy` with
    `Retry-After: 5`, no partial file is observed, marker promotion requires the
    exact predecessor revision/commit identity, and concurrent updates cannot
    lose audit or state changes.
  - **Fail when:** two writers commit the same revision or a temp file becomes
    the visible registry after a failed transaction.

- [ ] **AC-13 — Expiry alert semantics.** Finite expiries expose bounded
  Prometheus-compatible metrics based on active expiry or the previous effective
  deadline, with generation kept in persisted threshold state rather than
  unbounded metric labels; threshold crossings are persisted once per
  service/generation/role/threshold.
  - **Pass when:** repeated evaluations do not duplicate crossing events and no
    Slack/email/provider call is made by the implementation.
  - **Fail when:** alert state is only in memory, generation/secret values are
    used as unbounded metric labels, or notification routing is implicitly
    coupled to rotation.

- [ ] **AC-14 — Deployment compatibility.** A restart reloads the registry,
  preserves generation/audit/notification state, and the documented single-writer
  persistent-volume/path/lock constraint is enforced or visibly reported.
  - **Pass when:** one writer can rotate safely across restart and unsupported
    multi-writer deployment is rejected or blocked by a health gate.
  - **Fail when:** a restart reboots from environment values or multiple writers
    can silently lose updates.

- [ ] **AC-15 — Transport and credential boundary.** Header parsing splits at the
  first colon, hashes only the secret portion, rejects path/header service
  mismatches, and keeps `SERVICE_KEY_ADMIN_DASHBOARD` distinct from
  `ADMIN_DASHBOARD_API_KEY`.
  - **Pass when:** legacy colon-containing secrets are handled as specified and
    only the admin API key authorizes rotation/rollback/metadata operations.
  - **Fail when:** the entire header is hashed, a mismatch is accepted, or the
    two credential lifecycles are conflated.

- [ ] **AC-16 — Rollback contract.** Rollback requires the current generation,
  current previous target, and a sanitized reason; it rejects an expired window
  or stale target, returns the exact generation-conflict metadata for a stale
  active precondition, never reuses a generation number, creates complete
  rollback metadata with a capped expiry, clears the unknown failed-delivery key,
  and appends an atomic rollback audit event.
  - **Pass when:** rollback returns metadata only and a lost rollback response
    cannot cause a second rollback; its active expiry is capped at the target's
    effective previous deadline.
  - **Fail when:** rollback reissues plaintext, revives an expired target, or
    silently reuses a previous generation number.

- [ ] **AC-17 — Error envelope and request identity.** Every route response uses
  a server-generated non-secret `X-Request-ID`, and JSON errors repeat it as
  `requestId` with the documented content type and stable sanitized code/message;
  caller correlation headers are not echoed.
  - **Pass when:** `503 m2m_registry_busy` includes `Retry-After: 5` and no error
    response contains a secret, hash, or raw request material.
  - **Fail when:** request IDs can contain credentials or retry guidance is
    ambiguous for lock contention.

## Review checklist

- [ ] Security confirms hash format, CSPRNG source, timing-safe comparison,
  redaction, and one-time response handling.
- [ ] Platform/operations confirms persistent-volume, atomic rename, lock, and
  single-writer assumptions.
- [ ] Service owners confirm the manual consumer-update sequence and grace
  period is operationally sufficient.
- [ ] Observability confirms metric names/labels, threshold idempotency, and
  Prometheus/Alertmanager ownership of notifications.
- [ ] Maintainers approve the lost-response rollback procedure before runtime
  implementation starts.
