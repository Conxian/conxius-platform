# Design: M2M Service-Key Rotation v1

## 1. Design intent

The rotation system is a control-plane capability owned by the admin dashboard.
It manages the dashboard's view of service credentials and exposes a safe,
auditable way for an administrator to generate a replacement. It does not own
the deployment mechanisms of the services that consume those credentials.

The central invariant is:

```text
environment bootstrap -> dashboard registry -> hash-only validation
                              │
                              ├── active generation
                              ├── previous generation during grace
                              ├── revision + audit event
                              └── expiry threshold state
```

The registry is authoritative per service. Environment values are an initial
compatibility input, not a continuously merged source of truth.

## 2. Ownership and trust boundaries

### 2.1 Dashboard ownership

The admin dashboard owns:

- the registry state;
- generation and revision sequencing;
- hash computation and timing-safe validation;
- rotation authorization and transactionality;
- audit-event persistence; and
- Prometheus-compatible metrics and expiry threshold state.

The dashboard does **not** own:

- the plaintext secret after the rotation response has been delivered;
- the secret stores or manifests of other repositories;
- deployment rollout of consuming services; or
- external notification routing.

### 2.2 Supported service IDs

V1 rotates internal service keys for the existing service registry IDs:

| Service ID | Environment variable |
| --- | --- |
| `gateway` | `SERVICE_KEY_GATEWAY` |
| `elizaos` | `SERVICE_KEY_ELIZAOS` |
| `nexus` | `SERVICE_KEY_NEXUS` |
| `orbit` | `SERVICE_KEY_ORBIT` |
| `wallet` | `SERVICE_KEY_WALLET` |
| `ui` | `SERVICE_KEY_UI` |
| `admin-dashboard` | `SERVICE_KEY_ADMIN_DASHBOARD` |
| `pulse-bos` | `SERVICE_KEY_PULSE_BOS` |

`external` remains the separate `EXTERNAL_API_KEYS` mechanism and is not a
rotatable service-key record in v1. A request for `external` MUST be rejected
as an unsupported service ID; the implementation MUST NOT reinterpret external
keys as service-key registry records.

`SERVICE_KEY_ADMIN_DASHBOARD` and `ADMIN_DASHBOARD_API_KEY` are separate
credentials. The former authenticates the dashboard as a service and is managed
by this registry; the latter authorizes admin API operations, is not stored in
this registry, and is not rotated by v1.

## 3. Registry state model

The file backend stores one schema-versioned document. A representative shape
is:

```json
{
  "schemaVersion": 1,
  "revision": 12,
  "lastCommitId": "commit_01J...",
  "services": {
    "gateway": {
      "generation": 2,
      "active": {
        "hash": "sha256:<64 lowercase hex characters>",
        "createdAt": "2026-07-22T12:00:00Z",
        "expiresAt": null
      },
      "previous": {
        "generation": 1,
        "hash": "sha256:<64 lowercase hex characters>",
        "createdAt": "2026-06-01T12:00:00Z",
        "graceUntil": "2026-07-23T12:00:00Z",
        "expiresAt": null
      },
      "source": "registry",
      "updatedAt": "2026-07-22T12:00:00Z"
    }
  },
  "notificationState": {
    "gateway:2:active:24h": {
      "crossedAt": "2026-07-22T12:00:00Z"
    }
  },
  "auditEvents": []
}
```

The shape is illustrative; the canonical field requirements are defined in the
specification. In all cases:

- `hash` is the only credential representation persisted;
- the plaintext secret, authorization headers, and request bodies containing
  secrets MUST NOT be present in the document;
- file permissions MUST restrict the registry to the dashboard process owner;
- `revision` is a monotonically increasing integer for every committed state
  mutation;
- `lastCommitId` identifies the transaction that committed the current document
  revision; and
- audit events and notification markers are part of the same persisted state
  transaction as the mutation they describe.

## 4. Secret generation and validation

### 4.1 Generated secret

For every successful rotation, the server obtains exactly 32 bytes from the
operating-system cryptographically secure random source. It encodes those bytes
as unpadded base64url for transport. The encoded value contains no colon, so it
can be used after the service ID in the existing `X-Service-Key` format.

The generated secret is held only for the request/response lifetime and is not
written to the registry, audit events, logs, metrics, traces, error objects, or
any response other than the successful rotation response.

### 4.2 Hash representation

The registry stores `sha256:<lowercase-hex-digest>` for the exact UTF-8 bytes of
the secret string presented to the service-key validator. Hashing the encoded
transport value keeps bootstrap compatible with existing opaque environment
values while retaining 256 bits of entropy for new generated secrets.

Bootstrap values MAY be legacy opaque strings, but they MUST be non-empty. New
rotation values MUST be generated as described above.

### 4.3 Timing-safe validation

Validation MUST:

1. parse the service ID and secret without logging the header;
2. hash the presented secret using the same canonical UTF-8 procedure;
3. compare fixed-length digests with a timing-safe equality primitive;
4. evaluate active and previous candidates without using ordinary string
   equality for secret material; and
5. apply expiry and grace checks before accepting the matched generation.

An invalid, expired, or unknown key MUST produce the same generic unauthorized
result to the caller; it MUST NOT disclose whether a service ID, generation, or
previous key exists.

The existing `X-Service-Key` header is parsed as `serviceId:secret`, splitting
at the first colon only. The service ID MUST be lowercase, the secret MUST be
non-empty with no leading/trailing whitespace, and the header service ID MUST
match the service being authenticated. Additional colons in legacy opaque
secrets are part of the secret; generated base64url secrets contain none. Only
the secret portion is hashed, and malformed/duplicate/mismatched headers return
the same generic `401` result without logging the raw header.

## 5. Bootstrap and authority transition

### 5.1 Initial bootstrap

When the registry is absent, the store MUST create a valid empty document and
atomically import every non-empty configured `SERVICE_KEY_*` value from the
supported mapping, including `SERVICE_KEY_ADMIN_DASHBOARD`. Each imported key
starts at generation `1`, has no previous key, has no expiry, and is marked with
`source: "bootstrap"`. Bootstrap advances the registry revision exactly once
for the transaction and persists one `SERVICE_KEY_BOOTSTRAPPED` audit event per
imported service in that same transaction. Initial bootstrap is the only
automatic environment import path in v1.

All services imported in the initial batch share that revision. If no service
environment keys are configured, an empty registry is valid. A supported service
with no environment key or existing record is intentionally not rotatable in v1;
it must be provisioned through initial bootstrap or a future explicit registration
capability before rotation.

If
the store cannot create or persist the initial document, service-key validation
and rotation MUST fail closed; the implementation MUST NOT continue in an
environment-only mode.

### 5.2 Existing registry

On restart, a valid registry is loaded first. A configured environment value MUST
NOT overwrite an existing service record, even if it differs from the registry.
Once a valid registry exists, v1 MUST NOT automatically import a newly configured
service from the environment. A service without a registry record requires a
future explicit registration capability; environment changes alone MUST NOT
create or resurrect a record.

After a service has been rotated, its registry record is authoritative for that
service. Later changes to `SERVICE_KEY_<SERVICE>` or
`SERVICE_KEY_ADMIN_DASHBOARD` MUST NOT change validation until an explicit
rotation or rollback transaction updates the record.

Malformed, unreadable, schema-incompatible, or unwritable registry state MUST
not trigger a fallback to environment values.

## 6. Key lifecycle semantics

Each service has one active generation and at most one previous generation.

### 6.1 Rotation transition

Given service generation `N`, a successful rotation:

1. creates generation `N + 1` with a new 32-byte-generated secret;
2. moves the prior active record to `previous`;
3. sets `previous.graceUntil` to `now + gracePeriod`, capped by the prior
   active key's expiry when one exists;
4. applies the requested optional expiry to the new active key;
5. increments the registry revision exactly once; and
6. appends one `SERVICE_KEY_ROTATED` audit event in the same transaction.

If a previous key already exists, it is no longer accepted once the new
rotation commits. V1 intentionally supports only active plus one previous
grace key; repeated rotations MUST NOT create an unbounded accepted-key list.

### 6.2 Acceptance rules

- The active key is accepted only while its optional `expiresAt` is in the
  future.
- The previous key is accepted only while both `now < graceUntil` and its
  optional `expiresAt` is in the future.
- A key that reaches either its expiry or grace boundary is rejected at and
  after that instant.
- A key with no `expiresAt` does not expire on its own; grace still governs a
  previous key.
- Metadata MAY retain expired previous records until the next rotation, but
  expired records MUST never authenticate.

For a previous key, the effective acceptance and alert deadline is
`min(previous.graceUntil, previous.expiresAt when set)`. Metrics, threshold
markers, metadata state, and validation MUST use this effective deadline, so an
earlier grace boundary produces the `expired` threshold even when the old key's
configured expiry is later.

### 6.3 Grace period and expiry input

The request field `gracePeriodSeconds` is optional and defaults to `86400`
(24 hours). Accepted values are integer seconds in the inclusive range
`300` (5 minutes) through `604800` (7 days). Values outside the range, fractional
values, negative values, and non-numeric values are invalid.

The request field `expiresAt` is optional. When supplied, it MUST be an RFC
3339/ISO-8601 timestamp with an explicit timezone and MUST be strictly in the
future at commit time. A past or malformed timestamp is invalid. V1 does not
impose a maximum future lifetime, but operators SHOULD use a finite expiry for
high-risk or short-lived integrations.

## 7. API design

### 7.1 Rotate endpoint

`POST /api/v1/m2m/service-keys/:serviceId/rotate`

The route MUST accept only a valid `X-Admin-API-Key`. `X-Service-Key`,
`X-External-Key`, JWT, or any other credential MUST NOT authorize rotation.
Missing or invalid admin credentials return `401 Unauthorized`. An unset admin
credential configuration returns a fail-closed `503 Service Unavailable`.

The request body is:

```json
{
  "expectedGeneration": 1,
  "gracePeriodSeconds": 86400,
  "expiresAt": "2026-08-21T00:00:00Z"
}
```

`expectedGeneration` is required and MUST be a positive integer. For a
bootstrapped service, the first rotation uses `1`. The value is checked again
under the inter-process lock immediately before commit.

On success, the route returns `201 Created` with `Cache-Control: no-store` and a
server-generated `X-Request-ID` response header:

```json
{
  "serviceId": "gateway",
  "generation": 2,
  "secret": "<unpadded base64url encoding of 32 random bytes>",
  "rotatedAt": "2026-07-22T12:00:00Z",
  "previousGraceUntil": "2026-07-23T12:00:00Z",
  "expiresAt": "2026-08-21T00:00:00Z",
  "revision": 12
}
```

`secret` is the only plaintext service key the system may return, and it is
returned only in this successful response. The client MUST persist or deliver
it securely before the response is discarded. The server MUST NOT offer a
secret-retrieval endpoint.

### 7.2 Metadata endpoint

The implementation MAY expose:

`GET /api/v1/m2m/service-keys`

If exposed, it MUST require `X-Admin-API-Key`, return `200 OK` with
`Content-Type: application/json`, `Cache-Control: no-store`, and a
server-generated `X-Request-ID`, and return exactly a metadata-only object with
top-level `revision` and `services`. Each service object MUST contain
`serviceId`, active `generation`, `source`, `activeCreatedAt`, `activeExpiresAt`,
`previousGeneration`, `previousCreatedAt`, `previousExpiresAt`,
`previousGraceUntil`, `previousEffectiveUntil`, `previousState`, and `updatedAt`.
`previousState` is one of `none`, `grace`, or `expired`; all previous fields are
`null` when the state is `none`, and `previousEffectiveUntil` is the minimum of
the previous grace and optional expiry deadlines otherwise. `activeExpiresAt` is
`null` when the active key has no expiry. It MUST NOT include plaintext secrets,
hashes, encoded hashes, authorization headers, or any reversible credential
material.

Example shape:

```json
{
  "revision": 12,
  "services": [
    {
      "serviceId": "gateway",
      "generation": 2,
      "source": "registry",
      "activeCreatedAt": "2026-07-22T12:00:00Z",
      "activeExpiresAt": "2026-08-21T00:00:00Z",
      "previousGeneration": 1,
      "previousCreatedAt": "2026-06-01T12:00:00Z",
      "previousExpiresAt": null,
      "previousGraceUntil": "2026-07-23T12:00:00Z",
      "previousEffectiveUntil": "2026-07-23T12:00:00Z",
      "previousState": "grace",
      "updatedAt": "2026-07-22T12:00:00Z"
    }
  ]
}
```

The metadata endpoint is optional because an approved audit/metrics reader may
serve the same recovery metadata. Lost-response recovery MUST NOT depend on the
endpoint: a `409 generation_conflict` response includes the current generation,
revision, previous generation/deadline when present, and active expiry metadata.

### 7.3 Error envelope and error contract

Every JSON error response uses `Content-Type: application/json` and a sanitized
shape such as:

```json
{
  "error": "generation_conflict",
  "message": "Service key generation precondition failed",
  "requestId": "req_01J..."
}
```

The server MUST generate an opaque request ID for every response on these routes,
using a UUID/ULID or equivalent non-secret identifier, and MUST return it in the
`X-Request-ID` response header. JSON error responses MUST also include the same
value in `requestId`. Caller-supplied correlation headers MUST NOT be echoed as
the request ID. Error responses MUST NOT echo authorization headers, request
bodies, hashes, or plaintext keys. A `503 m2m_registry_busy` response includes
`Retry-After: 5`.

Errors use a stable `error` code and a sanitized human-readable `message`.
Responses MUST NOT echo a secret, hash, authorization header, or raw request
body.

| Status | Error code | Meaning and recovery |
| --- | --- | --- |
| `400` | `invalid_request` | JSON/body shape is invalid; correct the request without retrying unchanged. |
| `400` | `invalid_generation_precondition` | `expectedGeneration` is missing or not a positive integer; read metadata and send a valid generation. |
| `400` | `invalid_grace_period` | Value is not an integer in `300..604800`; correct it. |
| `400` | `invalid_expiry` | `expiresAt` is malformed or not strictly future; correct it. |
| `401` | `unauthorized` | Admin credential is missing/invalid, or service-key validation failed; do not reveal which secret check failed. |
| `404` | `service_not_found` | Service ID is unknown, unsupported, or has no registered record; configure/bootstrap it before rotation. |
| `409` | `generation_conflict` | The current generation differs from `expectedGeneration`; return current generation/revision/recovery metadata only. No new secret is returned. The same code and metadata apply to a stale rollback precondition. |
| `409` | `rollback_window_expired` | The previous key is outside its effective rollback deadline; repair delivery through a separate approved procedure. |
| `409` | `rollback_target_conflict` | The requested target is not the current previous generation; re-read metadata before retrying. |
| `503` | `admin_auth_unavailable` | The admin API key is not configured; repair deployment configuration before retrying. |
| `503` | `m2m_registry_unavailable` | Registry is malformed, unreadable, unwritable, or failed its transaction; repair storage/state and retry. No environment fallback is allowed. |
| `503` | `m2m_registry_busy` | Lock acquisition timed out; retry with the same generation precondition after the writer finishes. |

An unavailable registry MUST be distinguishable from an invalid service key to
operators through status/metrics, while external authentication failures remain
generic `401` responses.

The `409 generation_conflict` body includes these exact metadata fields in
addition to the common error envelope: `serviceId`, `expectedGeneration`,
`currentGeneration`, `currentRevision`, `previousGeneration`,
`previousGraceUntil`, `previousEffectiveUntil`, and `activeExpiresAt`.
`previousGeneration`, `previousGraceUntil`, and `previousEffectiveUntil` are
`null` when no previous record exists; `activeExpiresAt` is `null` when the
active key has no expiry. `previousEffectiveUntil` is the minimum of the
previous grace and optional expiry deadlines. These fields never contain hashes
or secrets.

### 7.4 Rollback operation

V1 requires an operator-only rollback transaction. It MAY be exposed as:

`POST /api/v1/m2m/service-keys/:serviceId/rollback`

or as an equivalent local operator command using the same store contract. If
exposed as HTTP, it requires `X-Admin-API-Key` only and accepts:

```json
{
  "expectedGeneration": 2,
  "targetGeneration": 1,
  "reason": "rotation response was lost"
}
```

Missing or malformed `targetGeneration`, or a missing, empty, oversized, or
unsanitizable `reason`, MUST return `400 invalid_request` with no mutation.

The expected generation MUST match the active record, the target MUST match the
current previous generation, and the reason MUST be a sanitized non-empty string
of at most 512 characters. If the expected generation is stale, the operation
returns `409 generation_conflict` with the exact current-generation metadata
defined above and creates no generation, revision, audit event, or secret. The
target MUST still be before its effective previous deadline, and the
implementation MUST re-check `now < effectivePreviousUntil` while holding the
writer lock immediately before candidate construction and marker durability.
Otherwise the operation returns `409 rollback_window_expired` or
`409 rollback_target_conflict` with no mutation.

Rollback copies only the target credential hash from the previous record. The new
active record MUST receive a new non-reused generation, current `createdAt` and
`updatedAt`, `source: "rollback"`,
`rollbackOfGeneration: expectedGeneration`,
`rollbackTargetGeneration: targetGeneration`, `expiresAt` equal to the target's
effective deadline, and no
previous accepted record. Its `expiresAt` is
`min(previous.expiresAt when set, previous.graceUntil)`, so rollback cannot extend
the target key's original acceptance window. It clears the previous accepted
record so the unknown failed-delivery key is not left active, advances revision
once, and appends `SERVICE_KEY_ROLLED_BACK` atomically. It returns `200 OK`,
`Content-Type: application/json`, `Cache-Control: no-store`, and a
server-generated `X-Request-ID` with metadata only:

```json
{
  "serviceId": "gateway",
  "generation": 3,
  "revision": 14,
  "source": "rollback",
  "rollbackOfGeneration": 2,
  "rollbackTargetGeneration": 1,
  "activeExpiresAt": "2026-07-23T12:00:00Z",
  "rolledBackAt": "2026-07-22T12:05:00Z"
}
```

It never returns or reconstructs plaintext. A lost rollback response is recovered
by metadata; retrying with the old generation conflicts and creates no second
rollback.

## 8. Transaction, locking, and revision protocol

Every mutating operation follows this sequence:

1. Acquire the inter-process writer lock with a bounded wait.
2. Read and validate the current document and schema version.
3. Verify the service record and `expectedGeneration` under the lock.
4. Generate the replacement secret in memory and compute its hash.
5. Construct the new service record, revision, notification markers, and audit
   event without including plaintext or hashes in audit/log payloads.
6. Write a mode-restricted candidate and a separate mode-restricted durable
   journal copy in the same directory, flush both files, and flush their
   containing directory.
7. Write and flush the commit marker; this is the durable commit point.
8. Atomically rename the candidate to the active registry and flush the
   containing directory. If this or the response fails after the marker, the
   marker-qualified transaction remains committed and is recovered on restart.
9. Validate the active file, remove and flush the commit marker and journal only
   after the active file is in place, and flush the containing directory.
10. Release the lock and return the one-time secret only after commit succeeds.

The lock and revision protect against both cooperating dashboard processes and
stale read-modify-write races. A failed audit write MUST abort the key mutation
before the commit marker is durable. A failure before the marker is durably
flushed MUST preserve the prior registry and revision and MUST NOT emit a
successful rotation response. Once the marker is durably flushed, the mutation
is committed: a later rename, directory-flush, process, or response failure MUST
NOT decrement the revision or roll the mutation back. The implementation MUST
retain the marker-qualified candidate for recovery and MUST report a non-success
storage outcome if the committed active state is not durably available to the
request. A client-visible failure after the marker is therefore response-unknown,
not proof that the rotation did not commit.

The file backend MUST use a commit marker so a valid temporary JSON file is not,
by itself, evidence of a committed transaction. For a commit ID `C` and next
revision `R`, it writes and flushes a complete candidate and a separate durable
journal copy whose `lastCommitId` is `C`, flushes their containing directory,
durably writes a marker containing `C`, `R`, the expected predecessor revision
and predecessor `lastCommitId` (or revision `0` with a null predecessor for
initial bootstrap), and a journal reference, and flushes the marker directory.
The marker is the commit point. It then atomically renames the candidate to the
active registry, flushes the active directory, and removes the marker and journal
only after the active file is validated and durable.

The journal copy MUST remain available through active-file validation and the
active-directory flush; recovery MUST NOT depend on a candidate path that was
already moved away.

On restart, an absent marker means orphan candidates and journals are
uncommitted and MUST be ignored/removed under the writer lock. A present marker
must match a valid journal/candidate or already-active document; arbitrary
temporary files MUST NOT be
promoted. If the marker matches a valid journal/candidate at revision `R` and
the active document is at exactly `R-1` with the marker's predecessor
`lastCommitId: P`, startup MUST promote that journal/candidate under the writer
lock. For initial bootstrap, the active document MUST be absent and the marker
MUST identify `R = 1` with a null predecessor. If the active document is already
at revision `R` with
`lastCommitId: C`, startup MUST retain it. A candidate may be absent only in
that already-active case because the rename has completed; any other missing
`journal/candidate`, active revision, predecessor identity, or marker mismatch
fails closed. If the active document at `R`/`C` has no recovery event, startup keeps the
marker and appends one `SERVICE_KEY_REGISTRY_RECOVERED` event keyed by `C` in a
separate atomic transaction with a new recovery commit ID `D`; the resulting
document is revision `R+1`, has `lastCommitId: D`, and records
`recoveredCommitId: C` on that event. If the active document is at revision
`R+1` and contains the recovery event with `recoveredCommitId: C`, the marker is
a stale post-recovery marker and MAY be removed without another revision. A
document at `R` that already claims the recovery event, or a higher revision
without the marker-qualified recovery event, fails closed. A crash before the
recovery event retries without a duplicate; a crash after the event but before
marker removal recognizes the event on the next startup. A missing journal is
allowed only when the active document already proves `R`/`C` or the `R+1`
recovery state; otherwise recovery fails closed. A crash before the marker leaves
the old revision, while a crash after the marker means the rotation is committed
even if the response is lost.

If marker durability succeeds but rename, active-directory flush, marker/journal
cleanup, or response finalization fails, the backend MUST latch a
`recovery_required` health state before releasing the writer lock unless it has
already loaded and switched to the committed active document. While latched,
service-key validation, rotation, rollback, and metadata reads MUST return
`503 m2m_registry_unavailable` and MUST NOT use a stale in-memory snapshot or
accept another mutation. The latch is cleared only after marker-qualified
recovery validates the committed document and completes the required recovery
event/cleanup transaction.

The v1 file backend supports one writer process per registry file on a
persistent volume whose locking and atomic rename semantics are documented by
the deployment platform. Multi-writer active-active deployments are unsupported
without a future backend that provides distributed transaction and lock
semantics.

Production MUST set `M2M_SERVICE_KEY_REGISTRY_PATH` to a persistent path. The
lock path is derived from it and shares the same ownership boundary. The registry
and lock SHOULD use mode `0600` or an equivalent process-owner restriction. The
default lock wait is bounded at 5 seconds; timeout returns
`503 m2m_registry_busy` with `Retry-After: 5`. Stale locks may be removed only when
the recorded owner is provably no longer alive.

## 9. Lost-response and rollback recovery

A successful registry commit is authoritative even if the client times out or
loses the `201` response. Because only a hash is persisted, the server MUST NOT
reconstruct or re-deliver the generated secret.

The required recovery sequence is:

1. Use `409 generation_conflict` metadata, the optional admin-only metadata
   endpoint, or approved audit/metrics to identify the current generation and
   effective grace boundary.
2. Do not retry with the stale generation expecting the same secret; the retry
   returns `409 generation_conflict` and MUST create no second key.
3. Continue using the previous known key only until its effective previous
   deadline while the operator repairs delivery.
4. If the new secret cannot be delivered, execute the Section 7.4 rollback
   operation while the previous key remains within its effective deadline.
   Rollback is not an automatic cross-repository action and MUST be serialized
   through the same store transaction.
5. After rollback is confirmed, retry rotation with the current generation
   precondition and deliver the new one-time response through a verified channel.

The implementation MAY choose the HTTP or local-command surface described in
Section 7.4, but the rollback semantics are mandatory for v1 recovery support.
A lost response MUST never be resolved by storing plaintext or silently issuing
an unguarded second rotation.

## 10. Fail-closed behavior

The service-key validator and rotation routes MUST fail closed when the registry
is missing and cannot be initialized, malformed, unreadable, schema-incompatible,
or unwritable. They MUST NOT:

- fall back to an environment value after a registry record exists;
- accept a key using a partially parsed document;
- ignore a failed audit append;
- continue after a revision or lock invariant is violated; or
- report success before atomic persistence completes.

For a valid, healthy registry, a service-key mismatch, expired active key, or
expired previous key returns generic `401 Unauthorized`. Registry health failures
return `503` so operators can repair state instead of rotating credentials in an
unknown state.

## 11. Expiration notifications and Prometheus alignment

V1 uses level-triggered metrics for alerting and persisted threshold markers for
idempotent crossing events. Metrics and markers use the active expiry or the
previous key's effective deadline `min(graceUntil, expiresAt when set)`. Metric
labels contain only finite service ID, key role, and other finite outcome
values; generation is persisted in markers/audit metadata and is not a
Prometheus label. The current generation may be exposed as a gauge value. The
default thresholds are:

- `30d`;
- `7d`;
- `24h`;
- `1h`; and
- `expired`.

For each finite expiry/deadline, the implementation MUST expose an alertable
expiry timestamp/remaining-time metric with bounded labels containing only
service ID, generation, and key role. When a threshold is crossed, the
implementation MUST persist one marker keyed by
`serviceId:generation:keyRole:threshold` and MUST NOT append duplicate crossing
events on repeated evaluations. If marker persistence fails, the system records
a storage/observability failure and does not claim the crossing was durably
recorded. A grace boundary therefore produces the `expired` threshold even when
the previous key's configured expiry is later.

The implementation MUST expose, at minimum, metrics equivalent to:

- `m2m_service_key_expiry_timestamp_seconds`;
- `m2m_service_key_rotation_total`;
- `m2m_service_key_validation_total`;
- `m2m_service_key_generation`;
- `m2m_service_key_registry_revision`; and
- `m2m_service_key_registry_write_failures_total`.

Prometheus or Alertmanager is responsible for routing alerts. V1 MUST NOT
implicitly call Slack, email, or another notification provider.

## 12. Audit and observability

Successful bootstrap, rotation, rollback, and threshold-marker events are
persisted in the same transaction as their registry mutation. A
`SERVICE_KEY_REGISTRY_RECOVERED` event is persisted in the separate guarded
startup recovery transaction described in Section 8. The recovery transaction
gets its own `commitId` and records the recovered rotation's `recoveredCommitId`.
The v1
event types are
`SERVICE_KEY_BOOTSTRAPPED`, `SERVICE_KEY_ROTATED`,
`SERVICE_KEY_ROLLED_BACK`, `SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED`, and
`SERVICE_KEY_REGISTRY_RECOVERED`. Audit records contain only sanitized metadata
such as:

- event ID and type;
- transaction commit ID when the file transaction backend uses a commit marker;
- recovered commit ID for a registry-recovery event;
- service ID;
- generation and previous generation;
- registry revision;
- actor class (`admin-api-key` or `system`);
- server-generated request ID;
- timestamps; and
- grace/expiry/threshold metadata.

Audit events MUST NOT contain plaintext secrets, hashes, authorization headers,
raw request bodies, or values from secret-bearing environment variables.

Logs and traces follow the same redaction rule. Safe operational fields include
service ID, generation, revision, outcome, lock/storage result, and sanitized
request ID. Metrics MUST use finite service/role/outcome labels and MUST NOT use
secret values or arbitrary user input as labels.

## 13. Compatibility and deployment

- Existing environment-backed service keys continue to work after first
  bootstrap because their exact values are hashed into the registry.
- After a service record exists, changing its environment variable does not
  change authentication; operators must use the rotation contract and then
  update the consumer deployment manually.
- A rotation rollout requires a persistent registry volume, file ownership and
  mode enforcement, atomic rename support, and exactly one writer process.
- A dashboard restart MUST reload the registry and preserve generations,
  previous grace, expiry, audit, and notification state.
- Consumer rollout SHOULD update the target service during the previous-key
  grace window, verify the new key, and only then allow the old key to expire.
- The dashboard's own `SERVICE_KEY_ADMIN_DASHBOARD` rotation requires the
  operator to update the dashboard deployment using the one-time response; the
  dashboard MUST NOT mutate its own deployment automatically.

## 14. Backend abstraction

Routes and validators MUST depend on a storage abstraction rather than a file
format. The abstraction needs operations equivalent to:

- load a validated snapshot and health state;
- execute a serialized read-modify-write transaction with revision checking;
- append audit and notification state atomically with the mutation; and
- report lock, durability, and writability failures without exposing secrets.

The file backend is the v1 implementation target. A future database or
secret-manager backend MUST preserve hash-only storage, one-time response
semantics, generation conflicts, audit atomicity, and fail-closed behavior.
