# Spec Delta: M2M Service-Key Rotation v1

This change introduces the new canonical specification:

- `openspec/specs/m2m-service-key-rotation-v1.spec.md`

No existing canonical specification is modified by this Phase 1 change.

## Added normative requirements

1. The admin dashboard MUST own the service-key registry; v1 MUST NOT
   automatically mutate secrets, manifests, or deployments in other repositories
   or environments.
2. The registry MUST persist hashes and metadata only. Plaintext service keys,
   authorization headers, and reversible credential material MUST NOT be stored.
3. A successful rotation MUST generate exactly 32 bytes from an OS CSPRNG and
   return the encoded secret at most once in the successful response.
4. Service-key validation MUST use timing-safe digest comparison.
5. Initial bootstrap MUST support the configured environment service keys,
   including `SERVICE_KEY_ADMIN_DASHBOARD`; a persisted record becomes
   authoritative for that service and environment drift MUST NOT overwrite it.
   Initial bootstrap is the only automatic environment import path in v1; later
   environment changes MUST NOT create or resurrect registry records.
6. `POST /api/v1/m2m/service-keys/:serviceId/rotate` MUST require the admin API
   key only and MUST use an optimistic generation precondition.
7. The rotate endpoint MUST return `409 generation_conflict` for a stale
   generation and MUST return no secret for a conflict.
8. Grace periods MUST default to 24 hours and be bounded inclusively between 5
   minutes and 7 days.
9. A rotation MAY set a future expiry; malformed or non-future expiry values
   MUST be rejected.
10. The active key and at most one previous key MUST have the specified grace and
    expiry acceptance semantics.
11. An optional `GET /api/v1/m2m/service-keys` surface MUST be admin-only and
    metadata-only if implemented.
12. Registry updates, revision changes, audit events, and notification markers
    MUST be persisted atomically under an inter-process lock.
13. Malformed, unreadable, unwritable, or lock-invalid state MUST fail closed;
    environment fallback MUST NOT bypass a persisted registry.
14. The v1 file backend MUST document and enforce a single-writer persistent
    volume limitation and expose a backend abstraction for future database or
    secret-manager storage.
15. Expiry notifications MUST use Prometheus-compatible alertable metrics and
    idempotent persisted threshold state; v1 MUST NOT assume Slack/email
    integrations.
16. The API MUST define exact status/error/recovery behavior for authentication,
    invalid input, unknown services, generation conflicts, storage failure, lock
    contention, and lost responses.
17. Lost-response recovery MUST never re-deliver or persist plaintext; it MUST
    use metadata, grace, and an explicit serialized rollback path when needed.
18. Acceptance coverage MUST include bootstrap, redaction, timing safety,
    concurrency, atomic audit persistence, restart authority, expiration, lock
    failure, and lost-response behavior.
19. The service-key transport grammar MUST split `X-Service-Key` at the first
    colon, hash only the secret portion, reject path/header service mismatches,
    and preserve legacy opaque values containing later colons.
20. The optional metadata endpoint MUST NOT be required for lost-response
    recovery; `409 generation_conflict` MUST carry exact current generation,
    revision, previous-generation, grace/deadline, and active-expiry metadata
    with defined `null` behavior.
21. V1 MUST define a complete operator-only rollback contract with current and
    target generation preconditions, a sanitized reason, non-reused generation
    numbers, no plaintext response, atomic audit, and explicit window/target
    conflict errors.
22. Previous-key acceptance and expiry alerting MUST use the effective deadline
    `min(graceUntil, expiresAt when set)`.
23. File persistence MUST define marker-qualified crash-candidate recovery,
    explicit production registry-path handling, bounded lock wait, and
    `Retry-After` behavior for lock contention.
24. Error responses MUST define a JSON envelope, safe request ID, content type,
    and redaction guarantees; admin API and service identity credentials MUST be
    explicitly distinct.
25. Rollback MUST cap the new active key's expiry at the target previous key's
    effective deadline and MUST NOT extend that key's original acceptance window.
26. File persistence MUST use an explicit durable commit marker: unmarked
    temporary files are uncommitted, marker-matched candidates are deterministically
    promoted when the active document is still prior, mismatches fail closed, and
    `SERVICE_KEY_REGISTRY_RECOVERED` is idempotent by recovered commit ID before
    the marker is removed.
27. The registry MUST persist a durable `lastCommitId` for the current revision.
    A failure before the marker is durable aborts the mutation; after the marker,
    the mutation is committed even if rename, directory flush, process, or
    response handling fails. Recovery MUST NOT decrement the revision.
28. A recovery-event transaction MUST use its own commit ID and revision while
    retaining the recovered rotation ID as `recoveredCommitId`.
29. Rollback MUST return `409 generation_conflict` for a stale active-generation
    precondition and MUST define the new record's generation, timestamps, source,
    rollback metadata, capped expiry, and cleared previous record.
30. Every response on the rotation/metadata/rollback routes MUST carry a
    server-generated `X-Request-ID`; JSON errors MUST repeat it as `requestId`.
31. The file backend MUST flush the candidate and durable journal before marker
    durability, flush the marker directory before treating the marker as the
    commit point, retain the journal through active-file validation and directory
    flush, and latch `recovery_required` after a post-marker failure rather than
    serving a stale snapshot.
32. Initial-bootstrap crash recovery MUST treat an absent active document as the
    exact revision-0 predecessor and MUST permit only a marker-qualified
    revision-1 promotion with a null predecessor identity.
33. If exposed, `GET /api/v1/m2m/service-keys` MUST have an exact `200` JSON
    response with `no-store`, `X-Request-ID`, fixed lifecycle fields, and defined
    previous-state enum/nullability.
34. Rollback input validation, commit-time deadline re-checking, metadata-only
    success response, and explicit `rollbackOfGeneration` /
    `rollbackTargetGeneration` fields MUST be normative.
35. Prometheus labels MUST remain bounded: generation belongs in persisted
    threshold/audit state and current-generation gauge values, not long-lived
    label values.
