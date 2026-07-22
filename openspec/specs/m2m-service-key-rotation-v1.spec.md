# Specification: M2M Service-Key Rotation v1

## 1. Overview

This specification defines the v1 contract for rotating internal machine-to-
machine service keys managed by the Conxian admin dashboard.

The dashboard owns the registry and the rotation transaction. It does not own or
automatically mutate the secret stores, manifests, or deployments of other
repositories or services. Operators use the one-time response to update a
consumer through the deployment's approved secret-delivery process.

Implementations that create, validate, rotate, audit, expose, or alert on these
service keys MUST use this document as the source of truth.

## 2. Normative terms

The key words **MUST**, **MUST NOT**, **SHALL**, **SHALL NOT**, **SHOULD**,
**SHOULD NOT**, and **MAY** are to be interpreted as normative requirements.

## 3. Ownership and supported services

### 3.1 Registry ownership

The admin dashboard MUST own one authoritative service-key registry. V1 MUST NOT
automatically mutate secrets, manifests, CI variables, deployment platforms,
or running processes in another repository or environment.

The registry is authoritative per service after that service's record is
persisted. Environment values are bootstrap inputs only and MUST NOT silently
overwrite a valid registry record.

### 3.2 Supported service IDs

The rotatable v1 service IDs and their bootstrap variables are:

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

`external` is not a rotatable service-key ID in v1. `EXTERNAL_API_KEYS` remains
the separate external-key mechanism and MUST NOT be imported into this registry.

## 4. Credential representation and security

### 4.1 Hash-only storage

The private registry persistence document MAY contain hashes and metadata. Audit
state, notification state, backups, logs, traces, metrics, and error responses
MUST contain metadata only and MUST NOT contain hashes or plaintext. No surface
other than the private registry document may contain a credential digest. None
of these surfaces may contain:

- plaintext service-key values;
- `X-Service-Key`, `X-Admin-API-Key`, or other authorization headers;
- raw request bodies that may contain credential material; or
- reversible/encrypted copies of service-key plaintext.

The persisted digest format MUST be:

```text
sha256:<64 lowercase hexadecimal characters>
```

The digest is SHA-256 over the exact UTF-8 bytes of the secret string presented
in the transport header. This permits legacy opaque bootstrap values while
preserving full entropy for newly generated values.

### 4.2 Generated replacement secret

Every successful rotation MUST obtain exactly 32 bytes from the operating-system
cryptographically secure random source. The server MUST encode the bytes as
unpadded base64url for the response and existing `X-Service-Key` transport
format. The encoded secret MUST contain no colon or whitespace.

The generated plaintext MAY exist in process memory only for the request and
successful response lifetime. It MUST NOT be written to the registry, audit
events, metrics, logs, traces, exception objects, caches, or any subsequent API
response.

### 4.3 Timing-safe validation

Service-key validation MUST hash the presented secret using the canonical
procedure and compare fixed-length digest values with a timing-safe equality
primitive. Implementations MUST NOT use ordinary string equality for secret
material. Active and previous candidates MUST be evaluated without disclosing
which generation matched.

Malformed, unknown, mismatched, expired, and grace-ended credentials MUST return
the same generic unauthorized result to the caller. They MUST NOT disclose
whether the service or a previous generation exists.

### 4.4 Service-key transport grammar

The service-key header MUST use the existing grammar:

```text
X-Service-Key = serviceId ":" secret
```

The parser MUST split at the first colon only. `serviceId` MUST be one of the
lowercase supported IDs in Section 3.2, and `secret` MUST be non-empty with no
leading or trailing whitespace. Additional colons in a legacy opaque bootstrap
secret are part of the secret and MUST be hashed; generated base64url secrets
do not contain colons. The header service ID MUST match the service identity
being authenticated. A mismatch, empty value, duplicate header, or malformed
header MUST produce the same generic `401 Unauthorized` result as any other
invalid key.

Only the `secret` portion after the first colon is hashed. The service ID is
never included in the digest. Header parsing and validation MUST NOT log the raw
header.

## 5. Bootstrap and authority

### 5.1 Missing registry bootstrap

When the registry does not exist, the backend MUST create a valid schema-v1
document and atomically import every configured non-empty environment service
key from Section 3.2. Bootstrap:

- creates generation `1`;
- creates no previous key;
- sets no expiry;
- marks the source as `bootstrap`;
- advances the registry revision exactly once for the bootstrap transaction; and
- persists one `SERVICE_KEY_BOOTSTRAPPED` audit event per imported service in
  the same transaction.

Existing environment values MAY be opaque legacy strings. They MUST be hashed
as presented; bootstrap MUST NOT log or return them.

All imported services in one initial bootstrap transaction share that one
revision, while each service receives its own audit event. Initial bootstrap is
the only automatic environment import path in v1.

An empty registry with no configured service keys is valid. A supported service
without an environment key or existing registry record is intentionally not
rotatable in v1; it MUST be provisioned through environment bootstrap or a
future explicit registration capability before rotation. The rotate endpoint
MUST NOT invent an initial key for an unregistered service because no consumer
secret exists to replace.

If the backend cannot
create, validate, or durably persist the initial state, service-key validation
and rotation MUST fail closed. The implementation MUST NOT operate in an
environment-only fallback mode.

### 5.2 Restart and drift behavior

On restart, a valid registry MUST be loaded before environment bootstrap is
considered. An environment value MUST NOT replace an existing record, even if it
differs. Once a valid registry exists, v1 MUST NOT automatically import a newly
configured service from the environment. A service without a registry record
requires a future explicit registration capability; environment changes alone
MUST NOT create or resurrect a record.

After a service is rotated, its registry record is authoritative. Changing
`SERVICE_KEY_<SERVICE>` or `SERVICE_KEY_ADMIN_DASHBOARD` MUST NOT affect
validation until an explicit rotation or rollback transaction changes the
record.

Malformed, unreadable, schema-incompatible, or unwritable state MUST NOT trigger
environment fallback.

## 6. Registry state and transactions

### 6.1 Required state

The v1 registry MUST contain:

- `schemaVersion`, equal to `1`;
- a monotonic integer `revision`;
- `lastCommitId`, identifying the transaction that committed the current
  document revision;
- per-service active and optional previous records;
- persisted notification threshold state; and
- append-only audit events.

Each service record MUST contain:

- `generation`, a positive integer;
- active hash and creation time;
- optional active expiry;
- optional previous generation, hash, creation time, grace boundary, and expiry;
- bootstrap/registry source metadata; and
- last update time.

Hashes MAY be present only in the private persistence document. They MUST never
appear in API responses, logs, metrics, traces, backups, notification state, or
audit events.

### 6.2 Atomic mutation protocol

Every mutating operation MUST:

1. acquire an inter-process writer lock with a bounded wait;
2. read and schema-validate the current document;
3. verify the requested service and generation precondition while holding the
   lock;
4. construct the new service state, revision, notification markers, and audit
   event in memory;
5. write a mode-restricted candidate and a separate mode-restricted durable
   journal copy in the same directory, flush both files, and flush their
   containing directory;
6. write and flush the commit marker; the durable marker is the commit point;
7. atomically rename the candidate to the active registry and flush the
   containing directory;
8. remove and flush the marker and journal only after the active registry is in
   place and its containing directory is durable;
9. preserve the prior valid state if any step before the marker fails; and
10. release the lock before returning.

The audit event MUST be committed in the same transaction as its key mutation.
If audit persistence, state serialization, lock acquisition, or any durability
step before the commit marker fails, the mutation MUST abort and preserve the
prior valid registry. Once the commit marker is durably flushed, the mutation is
committed: a later rename, directory-flush, process, or response failure MUST
NOT decrement the revision or roll the mutation back. The API MUST NOT return a
successful rotation response unless the committed active state is durably
available to the request; a non-success response after the marker is
response-unknown and MUST be recovered from the marker-qualified state.

`revision` MUST increment exactly once per committed mutation. A failed or
conflicting request that fails before the marker MUST NOT increment it. A
post-marker non-success response MAY accompany an already-incremented revision.

The file backend MUST use an explicit commit marker so a valid temporary JSON
file is not, by itself, evidence of a committed transaction. For a commit ID
`C` and next revision `R`, it MUST:

1. write and flush a mode-restricted candidate containing the complete next
   document, `lastCommitId: C`, and `revision: R`;
2. durably write and flush a marker containing `C`, `R`, the expected predecessor
   revision and predecessor `lastCommitId` (or `revision: 0` and a null
   predecessor for initial bootstrap), and a reference to a durable journal copy
   of the candidate; the flushed marker is the commit point;
3. atomically rename the candidate to the active registry and flush the
   containing directory; and
4. validate the active registry, remove and flush the marker and journal only
   after the active registry is in place, and flush the containing directory.

The journal copy MUST remain available until the active registry and its
containing directory have been flushed and validated. It is the recovery source
if the atomic rename succeeds ambiguously or a later directory flush fails; the
implementation MUST NOT rely on a candidate path that was already moved away.

On startup, no marker means that orphan candidates are uncommitted and MUST be
ignored or removed under the writer lock; the prior active document remains
authoritative. If a marker exists, the marker, journal, candidate when present,
and active document MUST be validated together. The marker MUST contain exactly
the committed tuple `(C, R)` and its expected predecessor `(P, R-1)` for a normal
mutation, or `(null, 0)` for initial bootstrap. The journal/candidate MUST have
`revision: R` and `lastCommitId: C`. If the marker matches a valid candidate at
revision `R` and the active document is still at the exact predecessor revision
`R-1` with the marker's predecessor `lastCommitId: P`, startup MUST promote that
journal/candidate under the writer lock. For initial bootstrap, the active
document MUST be absent and the marker MUST identify `R = 1` with a null
predecessor. If the active document is already at revision `R` with
`lastCommitId: C`, startup MUST retain it. A
candidate may be absent only in those already-active cases because the rename
has completed; any other missing journal/candidate, active revision,
predecessor identity, or marker mismatch MUST fail closed. If the active document
at `R`/`C` has no recovery event, startup MUST append one
`SERVICE_KEY_REGISTRY_RECOVERED` event keyed by `C` in a separate atomic state
transaction with a new recovery commit ID `D`; the resulting document is
revision `R+1`, has `lastCommitId: D`, and records `recoveredCommitId: C` on that
event. If the active document is at revision `R+1` and contains the recovery
event with `recoveredCommitId: C`, the marker and journal are stale
post-recovery artifacts and MAY be removed without another revision. A document
at `R` that already claims the recovery event, or a higher revision without the
marker-qualified recovery event, violates the recovery invariant and MUST fail
closed. A crash after the recovery event but before marker/journal cleanup
recognizes the existing event on the next startup. A missing or malformed marker
MUST fail closed. A missing journal/candidate is allowed only when the active
document already proves `R`/`C` or the `R+1` recovery state; otherwise it MUST
fail closed. The system MUST NOT select an arbitrary higher-revision temporary
file or fall back to environment values. A crash before
the durable marker leaves the prior revision authoritative; a crash after the
marker is a committed transaction even if the response is lost.

If marker durability succeeds but rename, active-directory flush, marker/journal
cleanup, or response finalization fails, the backend MUST latch a
`recovery_required` health state before releasing the writer lock unless it has
already loaded and switched to the committed active document. While latched,
service-key validation, rotation, rollback, and metadata reads MUST return
`503 m2m_registry_unavailable` and MUST NOT use a stale in-memory snapshot or
accept another mutation. The latch is cleared only after marker-qualified
recovery validates the committed document and completes the required recovery
event/cleanup transaction.

### 6.3 Single-writer limitation

The v1 file backend supports one writer process per registry file on a
persistent volume with documented inter-process locking and atomic rename
semantics. Multi-writer active-active deployment is unsupported. Deployment
validation MUST either enforce one writer or fail/alert visibly before rotation
is enabled.

The production registry path MUST be supplied by an explicit
`M2M_SERVICE_KEY_REGISTRY_PATH` configuration pointing to persistent storage.
The lock path MUST be derived from that path and use the same ownership boundary.
The file and lock SHOULD be mode `0600`; a different mode requires an equivalent
process-owner restriction. The default lock wait MUST be bounded at 5 seconds.
Lock contention MUST return `503 m2m_registry_busy` with `Retry-After: 5`.
Stale lock cleanup MUST be conservative: an implementation MAY remove a lock
only when it can prove the recorded owner is no longer alive; otherwise it MUST
remain fail-closed and return the busy error.

Routes and validators MUST depend on a backend abstraction that can later be
implemented by a database or secret manager. Future backends MUST preserve
hash-only storage, transaction/audit atomicity, generation conflicts, one-time
response behavior, and fail-closed errors.

## 7. Active and previous key semantics

Each service MUST have at most one accepted active generation and one accepted
previous generation during grace.

### 7.1 Rotation transition

For current generation `N`, a successful rotation MUST:

1. create generation `N + 1` with a newly generated secret;
2. move generation `N` to `previous`;
3. set `previous.graceUntil` to `now + gracePeriod`, capped at the old active
   key's expiry when one exists;
4. apply the optional requested expiry to generation `N + 1`;
5. increment the registry revision exactly once; and
6. append one `SERVICE_KEY_ROTATED` audit event in the same transaction.

If a previous record already exists, it MUST no longer authenticate after the new
rotation commits. V1 MUST NOT accumulate an unbounded list of accepted keys.

### 7.2 Validation boundaries

- Active generation is accepted only while `now < active.expiresAt` when an
  expiry exists.
- Previous generation is accepted only while `now < previous.graceUntil` and,
  when present, `now < previous.expiresAt`.
- A key is rejected at and after its expiry or grace boundary.
- A missing expiry means no time-based expiry for that active record.
- An expired previous record MAY remain as metadata until the next rotation but
  MUST never authenticate.

### 7.3 Grace period and optional expiry

`gracePeriodSeconds` is optional and defaults to `86400` seconds (24 hours).
It MUST be an integer in the inclusive range `300` (5 minutes) through `604800`
(7 days). Fractional, negative, zero, non-numeric, and out-of-range values MUST
be rejected.

`expiresAt` is optional. When supplied, it MUST be an RFC 3339/ISO-8601
timestamp with an explicit timezone and MUST be strictly in the future at commit
time. Malformed or past values MUST be rejected. V1 does not mandate a maximum
future lifetime.

For a previous key, the effective acceptance/alert deadline is:

```text
effectivePreviousUntil = min(previous.graceUntil, previous.expiresAt when set)
```

If `previous.expiresAt` is absent, `effectivePreviousUntil` equals
`previous.graceUntil`. Authentication, expiry metrics, threshold markers, and
the `previousState` metadata MUST use this effective deadline. A grace boundary
therefore produces the `expired` threshold even when the old key's configured
expiry is later.

## 8. HTTP API

### 8.1 Rotation endpoint

```text
POST /api/v1/m2m/service-keys/:serviceId/rotate
```

The endpoint MUST accept only a valid `X-Admin-API-Key`. It MUST ignore
`X-Service-Key`, `X-External-Key`, JWT, and other credentials for authorization.

The request body MUST be JSON with:

```json
{
  "expectedGeneration": 1,
  "gracePeriodSeconds": 86400,
  "expiresAt": "2026-08-21T00:00:00Z"
}
```

`expectedGeneration` is required and MUST be a positive integer. A
bootstrapped service's first rotation therefore uses `1`. The implementation
MUST re-check the value while holding the writer lock.

On success the endpoint MUST return `201 Created`, set `Cache-Control: no-store`,
and return:

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

The exact timestamp values vary per request. `secret` is the only plaintext
service key the system MAY return and it MUST appear only in this successful
response. The server MUST NOT provide a retrieval or replay endpoint.

### 8.2 Optional metadata endpoint

The implementation MAY expose:

```text
GET /api/v1/m2m/service-keys
```

If exposed, the endpoint MUST require `X-Admin-API-Key`, return `200 OK` with
`Content-Type: application/json`, `Cache-Control: no-store`, and a
server-generated `X-Request-ID`, and return exactly a metadata-only object with
top-level `revision` and `services`. Each service object MUST contain
`serviceId`, active `generation`, `source`, `activeCreatedAt`, `activeExpiresAt`,
`previousGeneration`, `previousCreatedAt`, `previousExpiresAt`,
`previousGraceUntil`, `previousEffectiveUntil`, `previousState`, and `updatedAt`.
`previousState` MUST be one of `none`, `grace`, or `expired`; all previous fields
MUST be `null` when the state is `none`, and `previousEffectiveUntil` MUST equal
the minimum of the previous grace and optional expiry deadlines otherwise.
`activeExpiresAt` MUST be `null` when the active key has no expiry. The endpoint
MUST NOT return plaintext secrets, hashes, encoded hashes, authorization headers,
or reversible credential material.

The metadata endpoint is optional because operators MAY use an approved audit
or metrics reader instead. Lost-response recovery MUST NOT depend on this
endpoint: the `409 generation_conflict` response defined below MUST include the
current generation, current revision, `previousGeneration`,
`previousGraceUntil`, `previousEffectiveUntil`, and `activeExpiresAt` using the
exact nullability rules defined below.

### 8.3 Error envelope and authentication errors

Every JSON error response MUST use `Content-Type: application/json` and this
sanitized shape:

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
the request ID. It MUST be safe to log. Error responses MAY add documented
metadata fields, but MUST NOT echo authorization headers, request bodies, hashes,
or plaintext keys.

- Missing or invalid admin credentials MUST return `401 Unauthorized` with the
  generic code `unauthorized`.
- An unset admin API-key configuration MUST return fail-closed
  `503 Service Unavailable` with `admin_auth_unavailable`.
- A healthy registry with a missing, malformed, mismatched, expired, or grace-
  ended service key MUST return generic `401 Unauthorized`.
- An unavailable or invalid registry MUST return `503 Service Unavailable` with
  `m2m_registry_unavailable`, so operators can distinguish state failure from a
  bad credential without learning secret details.

### 8.4 Request and state errors

All error responses MUST use a stable `error` code and sanitized `message` and
MUST NOT echo secrets, hashes, authorization headers, or raw request bodies.

| Status | Error code | Required behavior |
| --- | --- | --- |
| `400` | `invalid_request` | Reject invalid JSON/body shape; no mutation. |
| `400` | `invalid_generation_precondition` | Reject missing/non-integer/non-positive `expectedGeneration`; no mutation. |
| `400` | `invalid_grace_period` | Reject values outside integer range `300..604800`; no mutation. |
| `400` | `invalid_expiry` | Reject malformed or non-future `expiresAt`; no mutation. |
| `401` | `unauthorized` | Reject missing or invalid admin credentials without revealing credential-check details. |
| `404` | `service_not_found` | Reject unsupported service ID or absent record; no mutation. |
| `409` | `generation_conflict` | Return current generation/revision and recovery metadata only; no new secret, revision, or audit event. |
| `409` | `rollback_window_expired` | The requested previous key is no longer within its effective rollback window; repair consumer delivery through a separate approved procedure. |
| `409` | `rollback_target_conflict` | The requested rollback target is not the current previous generation; re-read metadata and retry only with the current target. |
| `503` | `admin_auth_unavailable` | Admin API-key configuration is absent; repair deployment configuration before retrying. |
| `503` | `m2m_registry_unavailable` | Registry is malformed, unreadable, unwritable, or failed a transaction; repair storage/state and retry. |
| `503` | `m2m_registry_busy` | Lock timeout; leave state unchanged and permit a safe retry with refreshed generation. |

The `409 generation_conflict` body MUST include, in addition to the common
envelope, `serviceId`, `expectedGeneration`, `currentGeneration`,
`currentRevision`, `previousGeneration`, `previousGraceUntil`,
`previousEffectiveUntil`, and `activeExpiresAt`. The previous-generation and
previous-deadline fields MUST be `null` when no previous record exists, and
`activeExpiresAt` MUST be `null` when the active key has no expiry.
`previousEffectiveUntil` is the minimum of the previous grace and optional
expiry deadlines. These fields are metadata only.

### 8.5 Rollback endpoint

V1 MUST provide an operator-only rollback transaction, either through this
admin-only endpoint or an equivalent local operator command with the same
contract:

```text
POST /api/v1/m2m/service-keys/:serviceId/rollback
```

The endpoint, if exposed, MUST require `X-Admin-API-Key` only. Its request body
is:

```json
{
  "expectedGeneration": 2,
  "targetGeneration": 1,
  "reason": "rotation response was lost"
}
```

Missing or malformed `targetGeneration`, or a missing, empty, oversized, or
unsanitizable `reason`, MUST return `400 invalid_request` with no mutation.

`expectedGeneration` MUST match the current active generation,
`targetGeneration` MUST match the current previous generation, and `reason` MUST
be a non-empty sanitized string no longer than 512 characters. If
`expectedGeneration` is stale, the operation MUST return `409 generation_conflict`
with the exact conflict metadata defined in Section 8.4 and MUST create no new
generation, revision, audit event, or secret. The target must still be before its
`effectivePreviousUntil`. The implementation MUST re-check
`now < effectivePreviousUntil` while holding the writer lock immediately before
candidate construction and marker durability; otherwise it MUST return
`409 rollback_window_expired` with no mutation.

Rollback MUST:

1. create a new monotonically increasing generation rather than reusing an old
   generation number;
2. copy only the target credential hash from the previous record into the new
   active record;
3. set the new active record's `createdAt` and `updatedAt` to the current commit
   time, set `source: "rollback"`, and set
   `rollbackOfGeneration: expectedGeneration` and
   `rollbackTargetGeneration: targetGeneration`;
4. set the new active `expiresAt` to the previous key's effective deadline,
   which is `min(previous.expiresAt when set, previous.graceUntil)`, so rollback
   cannot extend the target key's original acceptance window;
5. clear the previous accepted record so the unknown failed-delivery key is not
   left active;
6. retain `rollbackOfGeneration` and `rollbackTargetGeneration` as the explicit
   rollback metadata fields;
7. increment revision once; and
8. append `SERVICE_KEY_ROLLED_BACK` in the same transaction.

Rollback returns `200 OK`, `Content-Type: application/json`,
`Cache-Control: no-store`, and a server-generated `X-Request-ID`, with this
metadata-only shape:

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

It MUST never return or reconstruct the target plaintext secret. A lost rollback
response is recovered by reading metadata; retrying with the old expected
generation returns `409 generation_conflict` and performs no second rollback.

## 9. Lost response and rollback

A committed rotation remains authoritative if the client loses the response.
Because the registry stores only a hash, the implementation MUST NOT recover or
re-deliver the plaintext secret.

The client/operator recovery contract is:

1. Use the `409 generation_conflict` metadata, the optional admin-only metadata
   endpoint, or approved audit/metrics tooling to identify the current generation
   and effective grace boundary.
2. Treat a retry with the stale generation as a conflict; it MUST return `409`
   and MUST create no second key.
3. Use the previous known key only until its documented grace boundary while
   repairing delivery.
4. If the new secret was not delivered, execute the rollback contract in
   Section 8.5 while the previous key remains within its effective deadline.
   Rollback is not an automatic cross-repository action and MUST be serialized
   through the same store transaction.
5. Retry rotation only after rollback is confirmed and use the current generation
   precondition.

Any future rollback endpoint or operator command MUST use the same transaction,
lock, audit, redaction, and revision rules. V1 MUST NOT resolve a lost response
by storing plaintext or issuing an unguarded second rotation.

## 10. Fail-closed and recovery requirements

Service-key validation and rotation MUST fail closed when the registry is:

- absent and unable to initialize;
- malformed or schema-incompatible;
- unreadable or permission-denied;
- unwritable when a transaction or audit append is required; or
- subject to a lock/revision invariant failure.

The implementation MUST NOT accept partial state, continue after a failed audit
append, report success before atomic durability, or fall back to environment
values after a registry record exists.

Operators recover by repairing the persistent volume, file ownership/mode,
lock support, or registry document and then restarting/reloading the dashboard
through the approved deployment process. Recovery MUST preserve valid prior
state when a write fails before the commit marker; after the marker, recovery
MUST preserve the committed marker-qualified transaction instead of rolling it
back.

## 11. Expiry notification semantics

Expiry notification is an observability contract, not a direct messaging
integration. For each finite active expiry and each previous effective deadline,
the implementation MUST expose alertable metrics with bounded labels containing
only the finite service ID and key role. Generation MUST remain in persisted
threshold markers and audit metadata, not in long-lived Prometheus label values;
the current generation MAY be exposed as a gauge value.

The default threshold set is:

- `30d`;
- `7d`;
- `24h`;
- `1h`; and
- `expired`.

When a threshold is crossed, the implementation MUST persist one idempotency
marker keyed by `serviceId:generation:keyRole:threshold` and MUST NOT append
duplicate crossing events on repeated evaluations. A marker is considered
delivered only after its state and audit event are durable. Marker-write failure
MUST be observable as a storage/observability failure. A previous key whose
grace ends before its configured expiry MUST use the grace deadline for both the
metric and the `expired` threshold.

The implementation MUST expose metrics equivalent to:

- `m2m_service_key_expiry_timestamp_seconds`;
- `m2m_service_key_rotation_total`;
- `m2m_service_key_validation_total`;
- `m2m_service_key_generation`;
- `m2m_service_key_registry_revision`; and
- `m2m_service_key_registry_write_failures_total`.

Prometheus/Alertmanager owns routing and escalation. The implementation MUST NOT
implicitly call Slack, email, PagerDuty, or another notification provider.

## 12. Audit requirements

Successful bootstrap, rotation, rollback, expiry-threshold crossing, and state
recovery events MUST be append-only and persisted with sanitized metadata. The
v1 event taxonomy is:

- `SERVICE_KEY_BOOTSTRAPPED`;
- `SERVICE_KEY_ROTATED`;
- `SERVICE_KEY_ROLLED_BACK`;
- `SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED`; and
- `SERVICE_KEY_REGISTRY_RECOVERED` when startup promotes a valid marker-matched
  candidate or repairs a stale transaction temporary.

The events MUST include the following sanitized metadata:

- event ID and event type;
- transaction commit ID when the file transaction backend uses a commit marker;
- recovered commit ID for a registry-recovery event;
- service ID;
- generation and previous generation;
- registry revision;
- actor class (`admin-api-key` or `system`);
- server-generated request ID;
- UTC timestamps; and
- grace, expiry, or threshold metadata as applicable.

Threshold-marker and recovery-event mutations MUST advance the registry revision
once per transaction. A recovery transaction uses a new `lastCommitId` for its
new revision and retains the recovered rotation commit ID in
`recoveredCommitId`. A single initial bootstrap transaction may contain many
`SERVICE_KEY_BOOTSTRAPPED` events but advances revision only once.

Audit events MUST NOT include plaintext secrets, hashes, authorization headers,
raw request bodies, or secret-bearing environment values. Failed requests MAY be
represented by counters/logs with the same redaction rules but MUST NOT produce
a successful audit event or state mutation.

## 13. Compatibility, deployment, and rollback considerations

- Existing non-empty environment keys remain usable through hash-only bootstrap.
- New rotation secrets are generated and returned by the dashboard; consumers
  must be updated manually through their approved secret-delivery path.
- `SERVICE_KEY_ADMIN_DASHBOARD` and `ADMIN_DASHBOARD_API_KEY` are separate
  credentials. The former authenticates the dashboard as a service and is in
  this registry; the latter authorizes admin API operations, is not in this
  registry, and is not rotated by v1. Rotating `SERVICE_KEY_ADMIN_DASHBOARD`
  requires an operator to update the dashboard deployment with the one-time
  response; the dashboard MUST NOT mutate its own deployment automatically.
- The registry MUST live on a persistent volume with file ownership/mode
  controls, atomic rename support, and one writer process.
- Restart MUST preserve generations, active/previous semantics, revisions, audit
  events, and notification markers.
- Rollback MUST be explicit, serialized, audited, and used for lost-response or
  failed-consumer rollout recovery; it MUST NOT silently re-enable an old key
  without a revision and audit event.

## 14. Acceptance test obligations

An implementation is not conformant until tests cover at least:

1. bootstrap of every configured service, including
   `SERVICE_KEY_ADMIN_DASHBOARD`;
2. hash-only state and absence of secrets/hashes from logs and responses;
3. exactly 32 random bytes for new secrets and timing-safe digest comparison;
4. admin API key-only authorization for rotation and metadata reads;
5. default, minimum, maximum, invalid, and fractional grace values;
6. future, malformed, and past expiry values;
7. active acceptance, previous grace acceptance, and grace/expiry rejection;
8. metadata redaction and generic unauthorized errors;
9. atomic registry/audit/revision behavior under injected write failures;
10. malformed, unreadable, unwritable, and lock-contention fail-closed behavior;
11. two concurrent rotations with the same generation yielding one success and
    one `409 generation_conflict`;
12. a committed rotation with a lost response yielding no secret replay,
    conflict on stale retry, recovery metadata, and a working explicit rollback
    path with non-reused generation numbers;
13. rollback target/window conflicts and lost rollback responses;
14. restart authority when environment values drift;
15. monotonic revisions, candidate recovery, and no partial temp-file visibility;
16. exact transport parsing including first-colon legacy secrets and path/header
    service mismatches; and
17. idempotent expiry threshold state and absence of implicit Slack/email calls.
