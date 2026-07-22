# Design: Deterministic, Transport-Neutral Swarm Coordination Protocol

## 1. Design intent and boundaries

The protocol is a validation and interchange layer, not a centralized runtime or scheduler. It defines data, state transitions, ordering, and failure semantics that can be embedded in different orchestrators or used by standalone tooling. It does not open connections, select a provider, execute a task, or maintain a central queue.

```text
producer / transport adapter / local file
                  │
                  ▼
       canonical envelope + validator
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      DAG       results   handover
    validator  aggregator  validator
                  │
                  ▼
       bounded context resolver
```

Issue #1162 supplies the repository-local discovery boundary. The #1163 layer consumes only its declared, repository-relative allowlist and inert discovery output; it does not alter the manifest, registry, skill format, or discovery algorithm.

## 2. Protocol objects

### 2.1 Versioned envelope

Every inter-agent message is represented by an `Envelope` with a fixed core schema:

| Field | Requirement | Semantics |
| --- | --- | --- |
| `protocol` | Required | Literal protocol namespace `conxian.swarm` |
| `schema` | Required | Versioned schema identifier such as `envelope.v1` |
| `message_id` | Required | Globally unique opaque message identity; never used as an ordering tie-breaker |
| `message_type` | Required | One of the registered core types: `task`, `ack`, `progress`, `result`, `handover`, `error`, `cancel` |
| `sender` | Required | Stable opaque `agent_id` plus optional `instance_id`; identity is not authentication by itself |
| `recipient` | Required | Stable agent identity or a normalized capability selector; no provider address is part of the core contract |
| `correlation_id` | Required | Root workflow/task correlation identity shared across delegation and retries |
| `causation_id` | Optional | Prior message identity that caused this message |
| `idempotency_key` | Required | Scope-local key for safe retry/replay handling |
| `lifecycle` | Required | State, monotonic sequence, and expiration metadata |
| `payload` | Required | Message-type-specific object validated by its schema |
| `context` | Optional | Bounded context references or a validated snapshot, never an implicit environment dump |
| `integrity` | Required | Canonical digest and deployment-profile authentication result/requirement |

The sender MAY generate IDs using any collision-resistant mechanism. The validator treats IDs as opaque strings with schema constraints and never derives trust, ordering, or authority from lexical order alone.

### 2.2 Lifecycle state machine

The operation lifecycle is explicit and monotonic:

```text
PROPOSED ──> ACCEPTED ──> STARTED ──> COMPLETED
    │            │           ├──────> FAILED
    │            │           ├──────> BLOCKED ──> STARTED
    │            │           ├──────> CANCELLED
    │            │           └──────> EXPIRED
    │            ├──────> CANCELLED / EXPIRED
    └──────> REJECTED / EXPIRED
```

- `PROPOSED`, `ACCEPTED`, `STARTED`, and `BLOCKED` are non-terminal.
- `COMPLETED`, `FAILED`, `CANCELLED`, `REJECTED`, and `EXPIRED` are terminal.
- A terminal state cannot be reopened. A correction or retry creates a new message/attempt linked by `causation_id` and the same `correlation_id`.
- `lifecycle.sequence` MUST increase by one for an accepted state transition. Duplicate delivery of the same sequence and canonical digest is idempotent; a different payload at the same sequence is a conflict.
- A message past `expires_at` is rejected for active processing but may be retained as audit evidence.

### 2.3 Identity, correlation, and idempotency

`agent_id` identifies a logical agent; `instance_id` identifies a running instance when the producer has one. Neither field proves authenticity. Authentication and key management are transport/deployment responsibilities exposed to the validator through a profile:

- `integrity.digest` is always required and is computed from canonical envelope bytes with the digest field excluded from the input.
- A deployment profile MAY require a signature or authenticated transport assertion.
- If a profile requires authentication and the assertion is missing, invalid, expired, or for a different identity, validation fails closed.
- The tuple `(idempotency_scope, idempotency_key, canonical_payload_digest)` identifies a replay-safe operation.
- Reusing the same idempotency key with a different canonical payload digest is `REPLAY_CONFLICT`; arrival order never selects a winner.

## 3. Task decomposition and capability matching

### 3.1 DAG contract

`TaskGraph` contains:

- `graph_id` and `root_task_id`;
- unique `TaskNode` entries with `task_id`, objective/schema reference, `depends_on`, required capabilities, optional/required status, timeout, and bounded retry policy;
- graph-level limits for node count, depth, retry budget, and context budget; and
- an explicit aggregation policy for each result-bearing node.

The validator MUST reject duplicate task IDs, unknown dependencies, self-dependencies, cycles, empty required objectives, negative/overflowing limits, and retry policies that exceed graph bounds. A graph is not executable merely because it validates.

### 3.2 Deterministic order

The validator computes a stable topological order using Kahn's algorithm. When more than one node is ready, it selects the lexicographically smallest normalized `task_id`. The resulting order is evidence for consumers; it is not a scheduling command.

Capability identifiers use a restricted normalized form (`lowercase` ASCII segments joined by `.`, `/`, `_`, or `-`). A capability requirement contains an identifier, a supported-version range, and an optional boolean constraint set. Candidate matching:

1. rejects malformed identifiers/ranges;
2. filters candidates that lack every required capability or fail the version range;
3. records unmet requirements rather than silently treating them as optional; and
4. sorts matches by the deterministic tuple `(unmet_required_count, -exact_version_match_count, declared_priority, agent_id, instance_id)`.

`declared_priority` is data supplied by the caller or registry, not a provider-specific scheduling policy. A match result is a candidate/evidence list. Choosing, reserving, or starting a candidate is out of scope.

## 4. Result aggregation

### 4.1 Result identity

Every `TaskResult` carries `graph_id`, `task_id`, `attempt`, `result_id`, `agent_id`, `status`, `canonical_payload_digest`, completion metadata, and optional evidence/artifact references. A result attempt is distinct from a delivery retry.

- Exact duplicates with the same `(graph_id, task_id, attempt, canonical_payload_digest)` collapse into one result with a delivery count.
- Results for the same task and attempt with different canonical digests are a `CONFLICT`; all conflicting digests and their provenance remain in the aggregate.
- Different attempts are retained separately until the task's declared retry policy determines which attempts are valid. There is no implicit last-writer-wins rule.

### 4.2 Aggregate status

Aggregation first orders tasks by deterministic topological order and then `task_id`. Within each task, it orders valid result records by `(attempt, canonical_payload_digest, agent_id, result_id)`. It then applies the graph's explicit policy:

| Condition | Aggregate status | Required behavior |
| --- | --- | --- |
| All required tasks have one valid, non-conflicting success and optional work is complete or explicitly omitted | `COMPLETE` | Include ordered outputs and evidence |
| Optional task failed/expired, or a bounded task remains unresolved while required work is valid | `PARTIAL` | Include unresolved task IDs and reasons |
| A required task has a terminal failure with no accepted alternate attempt | `FAILED` | Preserve failure and dependency impact |
| Required task results conflict or graph policy cannot select a valid attempt | `CONFLICT` | Preserve every conflicting result; never choose by arrival order |
| Cancellation policy terminates the graph before required completion | `CANCELLED` | Preserve completed work and cancellation cause |

The aggregator MUST be a pure function of validated inputs and policy. Reordering input messages, duplicating delivery, or changing transport cannot change the aggregate.

## 5. Machine-readable handover

`HandoverDocument` uses a versioned `handover.v1` schema and contains:

```text
handover_id
schema
correlation_id / graph_id
source_agent / target_agent (when known)
captured_at / expires_at
lifecycle_state
completed_tasks[]
active_tasks[]
blocked_tasks[]
pending_tasks[]
decisions[]
artifacts[]               # URI/locator, media type, byte/hash digest, classification
unresolved_conflicts[]
risks_and_blockers[]
resume_instructions[]     # structured action, dependency, and acceptance fields
context_snapshot
integrity
```

Task arrays are sorted by graph order and then `task_id`; decisions, risks, and resume instructions have stable keys and explicit sequence numbers. Artifact locators are opaque references and do not grant access. A handover may identify a target agent, but it must remain valid when no target is known.

The handover is a snapshot, not mutable shared memory. A resumed agent emits a new envelope and links it to the handover through `causation_id` and `correlation_id`. Missing required state, an invalid graph reference, stale mandatory context, or a failed digest check makes the handover invalid rather than partially executable.

## 6. Bounded session context

### 6.1 Sources and allowlist

Context entries are admitted only when their provenance is one of:

1. explicit current task input;
2. governance baseline or canonical repository specification;
3. #1162-declared required/optional repository context;
4. an artifact referenced by a validated result or handover; or
5. an explicitly marked agent assumption.

Repository paths MUST be relative, in-root, and declared by #1162 when they come from the repository. Selected skill content remains inert. Environment variables, credentials, arbitrary hidden files, unlisted paths, and provider transcripts are not implicit context sources.

### 6.2 Context entry contract

Each `ContextEntry` includes:

- stable `context_id` and key;
- source kind, repository-relative path or artifact reference, and provenance digest;
- value or a typed redaction marker (`secret`, `credential`, `personal_data`, `restricted`, `omitted`);
- classification and sensitivity;
- `captured_at`, optional `stale_after`, and optional `expires_at`;
- `precedence` tier;
- byte/depth accounting; and
- `truncated: true` plus an original digest when bounded truncation occurred.

The context profile fixes maximum entry count, total bytes, value depth, and per-entry bytes. Exceeding a bound is a validation error unless the producer explicitly records truncation and preserves the original digest. Raw secret material is never an allowed value; it must be redacted before serialization.

### 6.3 Precedence and staleness

For shared context resolution, the precedence order is:

1. current task instructions/explicit inputs;
2. governance baseline and canonical specifications;
3. architectural repository context;
4. live execution/operational context;
5. immutable evidence;
6. historical context, which is reference-only; and
7. agent assumptions, which are never authoritative.

This ordering follows the repository governance and information hierarchy. The current task is outside the snapshot and retains task-level authority over supplemental context. When entries at the same precedence conflict, non-stale entries outrank stale entries, then the newest valid `captured_at`, then the lexicographically smallest provenance digest. The resolver MUST retain a conflict record whenever lower-precedence values were discarded.

Stale entries remain available for provenance but cannot satisfy a current required key unless the task explicitly opts into stale evidence. Expired entries cannot satisfy requirements at all. Unknown precedence, missing timestamps where required, or unparseable time values fail closed.

## 7. Stable serialization and hashing

All normative objects use a canonical JSON profile:

1. UTF-8 without a BOM and no insignificant whitespace.
2. Object keys sorted lexicographically using the RFC 8785 JSON Canonicalization Scheme (JCS) rules.
3. Arrays retain semantic order; set-like arrays are sorted by the field documented for that array.
4. Duplicate object keys, `NaN`, `Infinity`, non-finite numbers, and implementation-specific values are rejected.
5. Timestamps use RFC 3339 UTC with normalized precision; monetary/quantity values use integers or decimal strings rather than binary floating point.
6. Hashes are domain-separated SHA-256 values encoded as `sha256:<lowercase-hex>`.
7. An integrity digest is calculated over the canonical object with its digest/signature field omitted, preventing recursive hashing.

Message IDs, timestamps, and transport metadata may be different across executions; they are not used to claim that two payloads are equivalent. Equivalence is determined from the canonical payload and the explicitly defined identity tuple.

## 8. Security and compatibility

- Validation is zero-network, side-effect free, and fail-closed by default.
- Identity fields are claims, not proof. A deployment profile must state whether authenticated transport or a signature is required.
- Expiry, idempotency, correlation, sequence, digest, classification, and redaction checks run before payload handling.
- A new major protocol version is incompatible and rejected unless a caller explicitly selects a supported profile.
- A new minor version may add only namespaced optional fields. Unknown required fields, unknown core message types, or unsupported extension namespaces are rejected.
- Extensions use an explicit namespace and are preserved as opaque data when the profile permits them; core validators must not infer provider behavior from them.
- A validator must never execute code, follow an artifact locator, load an undeclared file, or expose a redacted value.

## 9. Failure semantics

| Failure | Result |
| --- | --- |
| Malformed JSON, duplicate keys, unsafe path, or schema violation | Reject before processing; emit structured validation error |
| Unsupported major version or unknown required field | Reject as `INCOMPATIBLE_VERSION` |
| Invalid lifecycle transition or sequence regression | Reject as `INVALID_TRANSITION` |
| Same idempotency key with a different digest | Reject as `REPLAY_CONFLICT` and preserve both references |
| Duplicate identical delivery | Accept idempotently and increment evidence count |
| DAG cycle/missing dependency/invalid capability requirement | Reject graph as `INVALID_GRAPH` |
| No candidate satisfies a required capability | Mark task `BLOCKED` with unmet requirements; do not invent a match |
| Required result failure or unresolved conflict | Aggregate `FAILED` or `CONFLICT` according to graph policy |
| Optional result failure or bounded unresolved optional work | Aggregate `PARTIAL` |
| Stale/expired mandatory context or context bound violation | Reject snapshot or mark handover non-resumable; never silently continue |
| Handover digest/state mismatch | Reject handover as `INVALID_HANDOVER` |
| Transport timeout, duplicate callback, or provider outage | Record a transport-independent error/result; do not mutate sealed protocol state |

Every failure record includes a stable machine-readable code, the affected object ID, correlation ID, canonical input digest when available, and a redacted human-readable explanation.

## 10. Implemented validation surface and hardening decisions

The implementation is concentrated in `scripts/agent-coordination.ts` with
contract tests in `scripts/agent-coordination.test.ts`, structural contracts in
`schemas/agent-swarm.schema.json`, and focused root/CI commands. The canonical
normative source is `openspec/specs/swarm-coordination-v1.spec.md`.

The implementation validates:

- envelope schemas, lifecycle transitions, replay/idempotency, canonical serialization, and digest vectors;
- DAG cycles, deterministic topological order, capability version/ranking, and graph limits;
- aggregation under reorder, duplicate delivery, retries, partial failure, cancellation, and conflict;
- handover round-trip, required graph input and `graph_digest`, missing/invalid state, artifact digest, two-digest conflict minimum, envelope-only authentication, and resumability checks;
- context allowlist provenance/digests from #1162, explicit `.agents` source exceptions, redaction, bounds, graph context budgets, precedence, effective-now stale/expired values, truncation, and deterministic conflict records;
- semantic result fingerprints that include status, error, agent, evidence, artifacts, links, and all other normative metadata while excluding only delivery `result_id`;
- strict RFC 3339 calendar/offset validation, lifecycle sequence bounds, and prototype-key-safe JSON parsing/normalization;
- representative valid/invalid JSON Schema fixtures through explicitly declared Ajv 2020 dependencies;
- no-network and no-side-effect behavior, unknown-version rejection, and extension compatibility.

The existing `.github/workflows/reusable-ci.yml` runs focused swarm
tests/typechecking in addition to the repository's existing baseline.
Documentation links the canonical spec from onboarding and continuity guidance
without duplicating normative rules.

## 11. Explicit non-goals

This design does not define a scheduler, queue, transport, provider integration, credential system, execution sandbox, economic policy, consensus protocol, or automatic agent/skill execution. Those concerns may consume these contracts later but cannot be added implicitly through extensions.
