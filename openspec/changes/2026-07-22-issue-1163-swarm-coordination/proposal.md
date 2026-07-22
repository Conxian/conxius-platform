# OpenSpec Proposal: Deterministic, Transport-Neutral Swarm Coordination Protocol

**Date**: 2026-07-22
**Reference**: [Issue #1163](https://github.com/Conxian/conxius-platform/issues/1163)
**Dependency**: [Issue #1162](https://github.com/Conxian/conxius-platform/issues/1162), merged on the current `origin/main` at `f8a231baa8131398b27139a1fbbc22b2d0a3a290`
**Status**: Implemented; independent review/approval outstanding
**Phase**: Canonical specification, implementation, hardening, and validation

## 1. Problem statement

The repository documents several swarm coordination patterns, but it does not yet define interoperable contracts that independent agents can validate without sharing a provider-specific runtime. The current documentation does not establish:

- a versioned inter-agent message envelope with identity, correlation, idempotency, and lifecycle semantics;
- a deterministic representation of task decomposition and capability matching;
- a reproducible result aggregation policy for partial failure, conflicting results, and duplicates;
- a machine-readable handover record that another agent can resume without relying on prose or hidden state; or
- a bounded session-context format with explicit allowlisting, redaction, precedence, and staleness behavior.

Without these contracts, two agents can report superficially compatible data while disagreeing about ownership, retries, task dependencies, result validity, or which context is authoritative. A centralized scheduler would hide those differences but would create a new runtime dependency and provider lock-in. This change instead defines a transport-neutral protocol and validation layer that can be implemented by different orchestrators, CLIs, or future transports.

## 2. Goals

- Define a versioned `conxian.swarm` protocol with canonical, machine-readable envelopes.
- Make message validation, graph validation, capability matching, aggregation, handover, and context resolution deterministic and independently testable.
- Preserve stable identity and correlation across retries, delegation, handover, and resumed sessions.
- Make duplicate delivery safe and make conflicting or incomplete work visible rather than silently selecting a winner.
- Bound shared context to repository-approved sources and explicit size/depth limits, with redaction and staleness metadata.
- Establish security, compatibility, and failure semantics in a canonical specification and executable validators.
- Depend on the merged #1162 discovery protocol for repository-local allowlists and context discovery, without modifying #1162 artifacts or implementation.
- Provide and validate the implementation, tests, CI wiring, and documentation while keeping the runtime boundary transport-neutral.

## 3. Dependency and sequencing

Issue #1162 is a strict prerequisite for repository-local context discovery. The swarm protocol MAY consume the outputs of `.agents/manifest.json`, `.agents/skills/registry.json`, and the discovery CLI defined by #1162, including its safe relative-path and optional-context semantics. It MUST NOT change those contracts, execute discovered skills, or infer trust from discovery alone.

The dependency boundary is:

```text
#1162 discovery
  └─ safe repository root + declared context + selected inert skill content
       └─ #1163 bounded context snapshot + transport-neutral coordination contracts
```

Agent identity, authentication, transport delivery, and runtime scheduling remain separate concerns. The #1163 implementation must be usable by a local process, a CI job, or a future transport adapter without requiring any one of them.

## 4. Scope

### 4.1 In scope

1. A versioned inter-agent envelope containing protocol/schema version, message identity, sender/recipient identity, correlation and causation identifiers, idempotency key, lifecycle state, payload, expiry, and integrity metadata.
2. A lifecycle state machine with valid transitions, terminal states, replay behavior, cancellation, expiry, and fail-closed handling for invalid transitions.
3. A DAG task model with stable task identifiers, explicit dependencies, required capabilities, retry/timeout policy, optional versus required nodes, and deterministic topological ordering.
4. Capability matching rules that normalize capability identifiers, validate versions, reject ambiguous requirements, and return stable candidate order without scheduling or executing an agent.
5. A deterministic aggregation model that distinguishes complete, partial, failed, cancelled, duplicate, and conflict outcomes and retains enough evidence to explain the decision.
6. A machine-readable handover document with graph state, completed/active/blocked/pending work, artifacts and digests, unresolved conflicts, bounded context, risks, and resume instructions.
7. A bounded context snapshot derived only from #1162-allowlisted sources or explicitly supplied task data, with redaction markers, source precedence, capture/stale times, truncation indicators, and provenance digests.
8. Stable serialization and hashing rules for all normative objects.
9. Security, compatibility, and failure semantics, including unknown major versions, unknown required fields, replay conflicts, stale context, malformed DAGs, and provider-independent transport errors.
10. Canonical specification, source implementation, contract tests, CI checks, and documentation updates for the implementation phase.

### 4.2 Out of scope

- A centralized scheduler, worker pool, queue, broker, or always-on coordination service.
- A transport implementation or provider-specific adapter for Slack, GitHub, Linear, HTTP, NATS, Redis, or any other delivery system.
- Agent discovery, manifest, registry, or skill execution changes owned by #1162.
- Agent authentication/key issuance, secrets provisioning, wallet/signing, custody, protocol state, user data, or funds handling.
- Dynamic code execution, automatic skill execution, plugin installation, or arbitrary shell/tool invocation from a message.
- A universal policy for choosing the most capable or cheapest provider; matching produces deterministic evidence and candidates, not an execution decision.
- Distributed consensus, Byzantine fault tolerance, or a guarantee that an untrusted agent is truthful.
- UI, dashboard, or operator workflow changes beyond documentation of the contracts.
- Runtime transport, scheduling, provider adapters, and automatic skill execution remain out of scope; implementation is intentionally limited to pure contracts and validators in this repository.

## 5. Implemented contract surface

The following paths are the implemented contract surface:

| Area | Artifact | Purpose |
| --- | --- | --- |
| Canonical specification | `openspec/specs/swarm-coordination-v1.spec.md` | Normative protocol, schemas, state transitions, failure semantics, and compatibility rules |
| Protocol, validation, graph, aggregation, handover, and context logic | `scripts/agent-coordination.ts` | Strict types, pure validators, deterministic ordering, digests, evidence, provenance, and bounded context |
| Contract tests | `scripts/agent-coordination.test.ts` | Focused vectors, semantic conflicts, provenance/tamper checks, graph linkage, and JSON Schema fixtures |
| Machine-readable schema | `schemas/agent-swarm.schema.json` | Strict v1 interchange and allowlist definitions |
| CI | `.github/workflows/reusable-ci.yml` and root `package.json` | Run focused swarm validation and typechecking in the existing reusable CI baseline |
| Documentation | `docs/AGENT_ONBOARDING.md`, `docs/SESSION_CONTINUITY.md` | Link the normative protocol and explain how it composes with #1162 |

The implementation MUST keep the source and test modules transport-neutral and must not turn the control plane into a centralized runtime.

## 6. Acceptance criteria

The following criteria directly close the five unchecked issue items. They define the implementation contract; current completion status is recorded in `tasks.md`, while independent review/approval remains a separate gate.

### AC-1 — Inter-agent communication protocols

The canonical spec and validator MUST define a versioned envelope with stable `message_id`, `sender`, `recipient`, `correlation_id`, optional `causation_id`, `idempotency_key`, lifecycle state/sequence, expiry, payload schema, and integrity metadata. Invalid transitions, replay conflicts, unsupported major versions, unknown required fields, and malformed payloads MUST fail closed. The protocol MUST not require a particular transport or scheduler.

**Pass when** two independent implementations can validate the same canonical envelope and reach the same accept/reject result without provider context.

### AC-2 — Task decomposition patterns

The canonical spec and validator MUST represent a task graph as a DAG with unique stable node identifiers, explicit dependencies, required/optional nodes, capability requirements, and bounded retry/timeout policy. Cycles, missing dependencies, duplicate node IDs, ambiguous capability requirements, and invalid limits MUST be rejected. Topological order and capability candidate order MUST be deterministic.

**Pass when** the same graph and candidate set always produce the same validation result, graph order, and candidate ordering.

### AC-3 — Result aggregation mechanisms

The canonical spec and aggregator MUST define complete, partial, failed, cancelled, duplicate, and conflict outcomes. Identical duplicate results MUST collapse by stable identity/digest. Conflicting results for the same task/attempt MUST be retained as a conflict and MUST NOT be resolved by arrival order or an implicit provider preference. Required versus optional task policy MUST determine whether the aggregate is complete, partial, or failed.

**Pass when** reordered, retried, duplicated, or partially failing inputs produce the same aggregate status, ordered evidence, and conflict set.

### AC-4 — Agent-to-agent handover format

The canonical spec MUST define a versioned machine-readable handover document that includes source/target identity when known, graph and correlation IDs, lifecycle state, completed/active/blocked/pending tasks, artifact references with digests, decisions, risks/blockers, unresolved conflicts, bounded context snapshot, and deterministic resume instructions. A handover MUST be self-describing and MUST not depend on hidden process memory or prose-only fields.

**Pass when** a fresh validator can reject malformed or incomplete handovers and a fresh agent can identify exactly what is resumable, blocked, stale, or unresolved from the document alone.

### AC-5 — Session context sharing

The canonical spec and context validator MUST allow only #1162-declared repository sources or explicit task inputs, enforce item/byte/depth bounds, require provenance and redaction metadata, and expose precedence and staleness. Current task instructions and governance/canonical sources MUST outrank operational, evidence, historical, and agent-assumption context. Stale or truncated context MUST be marked and MUST NOT silently satisfy a current requirement.

**Pass when** the same context inputs produce the same resolved snapshot, conflicts are explained by precedence/freshness, unallowlisted or over-bound inputs fail closed, and no raw secret or hidden repository file is admitted.

### Cross-cutting deterministic/security criteria

- Normative objects MUST use stable UTF-8 canonical JSON and domain-separated SHA-256 digests.
- Unknown protocol major versions and unknown required fields MUST fail closed; compatible minor extensions MUST be explicitly namespaced and optional.
- Validators MUST be zero-network and side-effect free.
- The implementation MUST preserve evidence for duplicates, conflicts, stale context, and partial failure rather than silently discarding it.

## 7. Independent review and approval gate

Reviewers should confirm:

- the #1162 dependency boundary does not modify or execute discovery/skill artifacts;
- the protocol remains transport-neutral and does not become a scheduler;
- the canonical serialization and conflict semantics are precise enough for independent implementations;
- context precedence matches the repository governance and information hierarchy; and
- proposed source, test, CI, and documentation paths fit existing repository ownership.

This branch contains the implementation and validation work but does not modify issue state, push changes, or open a PR.
