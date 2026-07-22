# Specification: Transport-Neutral Swarm Coordination v1

**Status:** Canonical
**Reference:** Issue #1163
**Dependency:** Issue #1162 (`conxian-agent-discovery`)
**Implementation:** [`scripts/agent-coordination.ts`](../../scripts/agent-coordination.ts)
**Schema:** [`schemas/agent-swarm.schema.json`](../../schemas/agent-swarm.schema.json)

## 1. Purpose and normative language

This specification defines the canonical, transport-neutral interchange and
validation contract for Conxian swarm coordination. It covers envelopes,
lifecycle transitions, task graphs, capability matching, result aggregation,
machine-readable handover, and bounded session context.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**,
**SHOULD**, **SHOULD NOT**, and **MAY** are normative requirements.

The protocol namespace is `conxian.swarm`. The v1 object schemas are
`envelope.v1`, `task-graph.v1`, `result.v1`, `handover.v1`, and `context.v1`.
Implementations MUST reject an unsupported major version, an unknown required
field, malformed data, or a failed integrity/provenance check. Implementations
MUST be deterministic, zero-network, and side-effect free.

## 2. Scope and ownership boundary

This specification defines data contracts and pure validation/evidence
functions. It does not define or require:

- a scheduler, worker pool, queue, broker, or centralized coordination
  service;
- a delivery transport or provider adapter (including GitHub, Slack, Linear,
  HTTP, NATS, or Redis);
- provider-side retries, reservations, executor selection, or task execution;
- authentication or key issuance outside the envelope authentication assertion;
- automatic skill execution, dynamic code loading, or shell/tool invocation;
- protocol/funds logic, custody, user-data processing, or distributed
  consensus.

Consumers own transport delivery, deployment authentication profiles, provider
retry policy, and runtime scheduling. A capability match is evidence for a
consumer; it is never a scheduling command.

## 3. Canonical serialization and integrity

Normative objects MUST use UTF-8 canonical JSON with lexicographically sorted
object keys, preserved semantic array ordering, finite numbers, and no
duplicate object keys. `-0` MUST normalize to `0`. Hashes MUST be
domain-separated SHA-256 values encoded as `sha256:` followed by 64 lowercase
hexadecimal characters.

Digest fields are excluded from the object being digested. Authentication is
included in an envelope digest when present. Handover and context integrity
use digest-only metadata; authentication is not a handover or context field.

JSON parsing and normalization MUST preserve own properties named `__proto__`,
`constructor`, and `prototype`, or reject them consistently. It MUST NOT
mutate an object prototype, pollute global prototypes, or silently discard
those JSON keys. Implementations SHOULD use null-prototype records or explicit
own-property definition when constructing normalized records.

## 4. Strict timestamps

Every normative timestamp MUST be an RFC 3339 date-time with:

- a four-digit non-zero year;
- month `01`–`12`, valid day for that month and year, hour `00`–`23`, minute
  and second `00`–`59`;
- optional fractional seconds with one to three digits (millisecond profile); and
- `Z` or a numeric offset whose hour is `00`–`23` and minute is `00`–`59`.

Impossible calendar dates, including non-leap-year February 29 and April 31,
and invalid month/day/hour/offset values MUST be rejected. A valid timestamp
MUST normalize deterministically to UTC ISO form with exactly three fractional
digits before comparison or hashing. Fractional precision from four through
nine digits MUST be rejected rather than rounded or silently truncated. Offset
normalization MUST also remain within the supported four-digit, non-zero year
range.
Date parser rollover behavior MUST NOT be used as validation.

## 5. Envelope, lifecycle, and replay semantics (AC-1)

### 5.1 Envelope

An `envelope.v1` object MUST contain:

- `protocol: "conxian.swarm"` and `schema: "envelope.v1"`;
- stable `message_id`, `message_type`, `sender`, and `recipient`;
- `correlation_id`, optional `causation_id`, `idempotency_scope`, and
  `idempotency_key`;
- `lifecycle.state`, `lifecycle.sequence`, and `lifecycle.expires_at`;
- a message-type-specific `payload`;
- optional bounded context or context references;
- links; and
- `integrity.digest`.

The payload kind MUST equal `message_type`. `causation_id` MUST identify a
prior message and MUST NOT equal `message_id`. IDs are opaque claims and MUST
NOT be used as ordering or trust signals.

### 5.2 Lifecycle

The core transitions are:

```text
PROPOSED -> ACCEPTED -> STARTED -> COMPLETED
                              -> FAILED | BLOCKED | CANCELLED | EXPIRED
                    ACCEPTED -> CANCELLED | EXPIRED
          PROPOSED -> REJECTED | EXPIRED
          BLOCKED  -> STARTED
```

Terminal states (`COMPLETED`, `FAILED`, `CANCELLED`, `REJECTED`, and
`EXPIRED`) MUST NOT be reopened. A valid transition MUST advance the sequence
by exactly one. Sequence values MUST be integers in the envelope lifecycle
bounds: `0` through `2,147,483,647`. Negative, fractional, and out-of-range
values MUST be rejected. A retry or correction creates a new linked message
and does not mutate a terminal message.

An envelope whose expiry is at or before the effective validation time MUST be
rejected for active processing. It MAY be retained as audit evidence.

### 5.3 Idempotency and authentication

Envelope replay identity is `(idempotency_scope, idempotency_key)`. Identical
canonical payload digests are duplicate deliveries and MUST collapse while
retaining delivery evidence. Reuse of that tuple with a different payload
digest MUST produce a machine-readable replay conflict; arrival order MUST NOT
select a winner.

The envelope `integrity.authentication` assertion is the only authentication
field in v1. A deployment profile MAY require verified transport or signature
authentication. When required, missing, unverified, expired, or wrong-subject
authentication MUST fail closed. Handover and context schemas MUST NOT expose
an authentication option; any such field is an unknown field.

## 6. Task decomposition and capability matching (AC-2)

### 6.1 Task graph

`task-graph.v1` MUST contain a unique `graph_id`, a `root_task_id`, one or
more unique task nodes, graph limits, an explicit aggregation policy, and
links. Each node MUST declare an objective/schema, sorted unique dependencies,
required/optional status, capability requirements, retry policy, timeout, and
links.

Validation MUST reject duplicate IDs, missing dependencies, self-dependencies,
cycles, empty/invalid identifiers, invalid retry or timeout bounds, retry
budgets above graph limits, and graph depth above `max_depth`.

`GraphLimits.max_context_bytes` is normative. When a graph is supplied while
packaging or validating a context snapshot, the effective total context byte
budget MUST be the minimum of the context profile's `max_total_bytes` and the
graph's `max_context_bytes`. Exceeding that effective budget MUST fail closed.

### 6.2 Deterministic ordering

Topological order MUST be computed by a deterministic Kahn-style algorithm
whose ready queue is ordered by normalized `task_id`. The result MUST be
independent of input or transport order.

Capability identifiers MUST be normalized lowercase identifiers. A requirement
contains a capability ID, an unambiguous supported-version range, and scalar
JSON constraints. A candidate offering the capability with an unsupported
version or a mismatching constraint is unmet. **A missing offered constraint
key is also unmet and MUST NOT throw.** Extra offered constraints are allowed
when every required constraint matches.

Candidate evidence MUST be ordered by:

1. ascending unmet required count;
2. descending exact-version match count;
3. ascending declared priority;
4. lexicographic agent ID; and
5. lexicographic instance ID.

The result MUST expose unmet requirements and selected full matches. It MUST
NOT reserve, start, or otherwise schedule a candidate.

## 7. Results and deterministic aggregation (AC-3)

### 7.1 Result identity

`result.v1` MUST include graph/task/attempt identity, a delivery `result_id`,
`agent_id`, status, payload, canonical payload digest, completion timestamp,
failure details when non-successful, evidence, artifacts, and links.

The transport duplicate key is `(graph_id, task_id, attempt)`. Semantic
deduplication MUST use an exact result fingerprint over every normative result
field except `result_id`, which is delivery identity. The fingerprint therefore
includes, as applicable, status, error, agent identity, payload digest,
completion timestamp, evidence, artifacts, and links.

Same payload with different status, error, agent, evidence, artifact, link, or
other semantic metadata MUST be a conflict, even when its canonical payload
digest is identical. Identical semantic results with different delivery IDs
MUST remain duplicate evidence. All representatives and conflict fingerprints
MUST be retained; no arrival-order or provider preference may resolve a
conflict.

### 7.2 Aggregate outcomes

The pure aggregator MUST produce `COMPLETE`, `PARTIAL`, `FAILED`, `BLOCKED`,
`CONFLICT`, or `CANCELLED` according to the graph policy. Required failures
and dependency impact MUST remain visible. Optional unresolved work MAY yield
`PARTIAL`; cancellation MUST preserve completed work and its cause. Reordering
inputs, duplicating transport delivery, or changing transport MUST NOT change
the aggregate status, ordered evidence, or conflict set.

## 8. Versioned handover and graph linkage (AC-4)

### 8.1 Required document

`handover.v1` MUST contain graph/correlation identity, `graph_digest`, capture
and expiry timestamps, lifecycle state, optional source/target identities,
completed/active/blocked/pending task references, decisions, artifacts with
digests, unresolved conflicts, risks/blockers, structured resume instructions,
a bounded `context_snapshot`, links, and digest-only integrity.

The handover builder and validator MUST receive the referenced `TaskGraph` as
validation input. Graph-aware validation is mandatory: `graph_id` and
`graph_digest` MUST match the supplied graph, every task/instruction reference
MUST resolve to that graph, and task arrays MUST use deterministic graph order.
A handover without a verifiable graph input MUST be rejected.

Envelope validation and envelope replay/deduplication that carry a handover
payload MUST receive the same referenced graph through their validation options;
they MUST reject the payload when that graph input is absent or does not match.

Handover creation, validation, resumability assessment, and envelope validation
or replay/deduplication of a handover MUST also receive the validated derived
`ContextAllowlist`, the successful #1162 `DiscoveryResult`, and the same
trusted discovery anchor that authorized that result. Each boundary MUST
revalidate the allowlist's internal path digest, anchor identity,
`discovery_digest`, manifest/registry identity and versions, and every embedded
context source against that allowlist. A locally recomputed context-entry,
snapshot, handover, or envelope digest MUST NOT make an unallowlisted source
authoritative. This provenance check is distinct from transport
authentication, which remains envelope-only.

Every handover conflict MUST contain at least two distinct `payload_digests`.
The JSON Schema and runtime validator MUST enforce this minimum.

Handover authentication is intentionally out of scope. Authentication is
validated only at the envelope boundary. A handover containing an
`integrity.authentication` field MUST be rejected as an unknown field rather
than accepted without enforcement.

### 8.2 Resumability

A handover is a snapshot, not shared mutable memory. Missing required state,
expired handover metadata, graph linkage failure, integrity failure, missing
or stale/expired mandatory context, or unresolved required conflicts MUST make
the handover invalid or non-resumable. A resumed process emits a new envelope
linked by correlation and causation identifiers.

## 9. Bounded context and #1162 provenance (AC-5)

### 9.1 Allowlist contract

Repository context MUST be derived from a validated successful #1162
`DiscoveryResult`; a free-form caller allowlist MUST NOT be authoritative.
The discovery result carries a content-addressed
`conxian-agent-discovery.attestation` version `1.0.0`. The trusted adapter or
deployment boundary MUST additionally supply a content-addressed
`conxian-agent-discovery.trust-anchor` version `1.0.0`, derived from the
validated checked-in manifest/registry content and the declared context/skill
content identities. The trust anchor is an out-of-band input and MUST NOT be
accepted from an untrusted swarm message. The pure coordination library
verifies the anchor and attestation digests and their binding, but it MUST NOT
claim to authenticate the adapter, repository checkout, or deployment that
decided to trust the anchor.

The v1 allowlist contract is versioned as
`conxian.swarm.context-allowlist` version `1.0.0` and MUST include:

- the #1162 discovery protocol identifier;
- the trusted discovery anchor protocol, version, and digest;
- canonical `.agents/manifest.json` and `.agents/skills/registry.json` paths
  with manifest/registry versions;
- the selected repository path permissions;
- `repository_paths_digest`; and
- `discovery_digest` derived from the validated discovery result.

The anchor scope MUST bind manifest/registry content digests, required context
entries exactly, and optional context plus selected skill entries by path,
tier, metadata/content digest, and declared identity. A supplied discovery
result MUST match the anchor's manifest/registry and required entries exactly;
optional context and selected skills MAY be a subset of the anchor, but an
injected, removed-required, re-tiered, or changed path/content entry MUST be
rejected. `packageContext()` and every public `validateContextSnapshot()` call
MUST receive and verify `{ allowlist, discovery, trusted_discovery_anchor }`.
The public validator MUST NOT expose structural-only validation as
authoritative; any internal structural normalizer is private and
non-authoritative. `mergeContextSnapshots()` MUST receive the same provenance
triple for every input, reject mixed provenance, preserve the standard
`conxian.swarm.context-allowlist.v1` digest, and return a snapshot accepted by
authoritative validation and handover paths. Task-input keys, artifact IDs,
and assumption keys MAY be explicitly provided by a caller, but repository
paths MUST be traceable to sources declared by #1162 with matching tier
metadata. The structural schema carries `allowlist_digest`; provenance remains
an explicit runtime validation input.

The coordination validator does not read the filesystem, environment, or
network and does not resolve symlinks. An adapter that loads content remains
responsible for applying filesystem/symlink safety before constructing a
validated discovery result. The selected #1162 skill content remains inert and
is never executed by this protocol.

### 9.2 Safe paths and sources

Declared repository paths MUST be repository-relative POSIX paths. Absolute
paths, drive paths, backslashes, NULs, empty segments, `.` segments, `..`
traversal, unlisted hidden segments, and arbitrary environment/configuration
paths MUST be rejected.

The following #1162-declared hidden sources MAY be explicitly selected:

- `.agents/manifest.json`;
- `.agents/skills/registry.json`; and
- `.agents/skills/<validated-skill-id>/SKILL.md`.

Other `.agents/...` paths remain unlisted and MUST be rejected. Allowlisting a
path does not authorize filesystem access; it only records provenance for
caller-supplied content.

### 9.3 Freshness, precedence, and bounds

Every context snapshot MUST record `captured_at` and `evaluated_at`. Stale and
expired flags MUST be evaluated against one documented effective time,
normally the caller's `now`, not against capture time. A boundary where
`captured_at < stale_after < now` MUST be marked stale. Required stale context
MUST fail packaging unless explicitly retained with `allow_stale`; retained
stale evidence MUST remain invalid for current resolution. Required expired
context MUST fail regardless of stale-retention mode.

Context precedence is task input, governance/canonical, architectural,
operational, evidence, historical, then assumption. Stale/expired status and
capture time provide deterministic tie-breaking, and discarded lower-precedence
values MUST remain in conflict evidence. Context item count, per-entry bytes,
total bytes, and depth MUST be enforced. When a graph is present, graph
`max_context_bytes` is the effective minimum budget.

Sensitive values MUST be represented by typed redaction markers; raw secrets,
credentials, personal data, and restricted values MUST NOT be serialized.
Explicit truncation MUST carry an original digest and `truncated: true`.

## 10. Compatibility and validation rules

Unknown core fields and unsupported core versions MUST be rejected. A future
minor extension MAY add explicitly namespaced optional fields only; unknown
required extensions MUST fail closed. Provider-specific behavior MUST remain
opaque to core validation.

The checked-in JSON Schema is a structural interchange contract. The
TypeScript runtime validators additionally enforce semantic graph linkage,
calendar validity, discovery provenance/digests, effective graph context
budgets, semantic result fingerprints, freshness at the effective time, and
prototype-safe normalization.

## 11. Acceptance criteria mapping

### AC-1 — Inter-agent communication protocols

Satisfied by Sections 3–5, the `envelope` schema, and
`createEnvelope()`, `validateEnvelope()`, `validateLifecycleTransition()`, and
`deduplicateEnvelopes()`. The contract covers identity, correlation,
idempotency, lifecycle, expiry, integrity, envelope-only authentication,
replay conflicts, strict fields/versions, and transport neutrality.

### AC-2 — Task decomposition patterns

Satisfied by Section 6, the `taskGraph`/`taskNode` schemas, and
`validateTaskGraph()`, `deterministicTopologicalOrder()`, and
`matchCapabilities()`. The contract covers DAG validity, graph bounds,
capabilities, missing offered constraints, deterministic ranking, and the
no-scheduling boundary.

### AC-3 — Result aggregation mechanisms

Satisfied by Section 7, the `taskResult` schema, and
`validateTaskResult()`, `deduplicateResults()`, and `aggregateResults()`. The
contract covers semantic fingerprints, same-payload metadata/status conflicts,
duplicate delivery evidence, deterministic outcomes, and dependency impact.

### AC-4 — Agent-to-agent handover format

Satisfied by Section 8, the `handover` schema, and `createHandover()`,
`validateHandover()`, and `assessHandoverResumability()`. Graph input and
`graph_digest` are mandatory, conflict payload digests have a minimum of two,
and authentication is not silently exposed on handovers.

### AC-5 — Session context sharing

Satisfied by Section 9, the `contextSnapshot` and `contextAllowlist` schema
definitions, and `packageContext()`, `validateContextSnapshot()`,
`resolveContextSnapshot()`, `mergeContextSnapshots()`, and
`redactSensitiveFields()`. The contract covers #1162 provenance, explicit
`.agents` exceptions, safe paths, effective-now freshness, precedence,
redaction, truncation, graph byte budgets, and deterministic conflicts.
