import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  AGGREGATE_STATUSES,
  SWARM_PROTOCOL,
  SWARM_SCHEMAS,
  CoordinationError,
  ContextAllowlist,
  ContextInput,
  ContextLimits,
  TaskGraph,
  TaskNode,
  TaskResult,
  aggregateResults,
  assessHandoverResumability,
  canonicalJson,
  createEnvelope,
  createHandover,
  deduplicateEnvelopes,
  deduplicateResults,
  deterministicTopologicalOrder,
  digestFor,
  matchCapabilities,
  mergeContextSnapshots,
  packageContext,
  parseCanonicalJson,
  payloadDigest,
  redactSensitiveFields,
  resolveContextSnapshot,
  validateContextSnapshot,
  validateEnvelope,
  validateHandover,
  validateLifecycleTransition,
  validateTaskGraph,
  validateTaskResult,
} from './agent-coordination';

const NOW = '2026-07-22T12:00:00.000Z';
const LATER = '2026-07-22T13:00:00.000Z';
const FUTURE = '2026-07-23T12:00:00.000Z';
const DIGEST = digestFor('test', 'evidence');
const emptyLimits: ContextLimits = { max_items: 16, max_total_bytes: 4096, max_entry_bytes: 1024, max_depth: 8 };

function expectCode(callback: () => unknown, code: CoordinationError['code']): void {
  assert.throws(callback, (error: unknown) => error instanceof CoordinationError && error.code === code);
}

function links() { return []; }

function task(taskId: string, dependsOn: string[] = [], required = true, maxAttempts = 1): TaskNode {
  return {
    task_id: taskId,
    objective: `objective-${taskId}`,
    schema: 'task-objective.v1',
    depends_on: dependsOn,
    required,
    capabilities: [],
    retry: { max_attempts: maxAttempts, backoff_ms: 0, timeout_ms: 1000 },
    links: links(),
  };
}

function graphFixture(): TaskGraph {
  return {
    schema: SWARM_SCHEMAS.taskGraph,
    graph_id: 'graph-1',
    root_task_id: 'task-a',
    nodes: [task('task-c', ['task-b']), task('task-a'), task('task-b', ['task-a'])],
    limits: { max_nodes: 8, max_depth: 8, max_retry_budget: 4, max_timeout_ms: 10_000, max_context_bytes: 4096 },
    aggregation_policy: { optional_failure: 'PARTIAL', required_failure: 'FAILED', required_blocked: 'BLOCKED', conflict: 'CONFLICT', cancellation: 'CANCELLED' },
    links: links(),
  };
}

function result(taskId: string, payload: unknown, status: TaskResult['status'] = 'SUCCEEDED', resultId = `${taskId}-result`, attempt = 1, agentId = 'agent-a'): TaskResult {
  const normalizedPayload = payload as TaskResult['payload'];
  return {
    schema: SWARM_SCHEMAS.result,
    graph_id: 'graph-1',
    task_id: taskId,
    attempt,
    result_id: resultId,
    agent_id: agentId,
    status,
    payload: normalizedPayload,
    canonical_payload_digest: payloadDigest(normalizedPayload),
    completed_at: NOW,
    ...(status === 'SUCCEEDED' ? {} : { error: { code: `E_${status}`, message: `${status} for ${taskId}` } }),
    evidence: [],
    artifacts: [],
    links: links(),
  };
}

const emptyAllowlist: ContextAllowlist = {
  repository_paths: [],
  task_input_keys: [],
  required_task_input_keys: [],
  artifact_ids: [],
  required_artifact_ids: [],
  assumption_keys: [],
};

function contextInput(overrides: Partial<ContextInput> = {}): ContextInput {
  return {
    context_id: 'context-1',
    key: 'current.instructions',
    source: { kind: 'TASK_INPUT', key: 'instructions' },
    value: { plan: 'continue', access_token: 'must-not-leak' },
    classification: 'INTERNAL',
    sensitivity: 'NONE',
    captured_at: NOW,
    ...overrides,
  };
}

function emptyContext() {
  return packageContext([], { allowlist: emptyAllowlist, limits: emptyLimits, captured_at: NOW, now: NOW });
}

test('schema is strict, versioned, and defines all protocol object families', () => {
  const schema = JSON.parse(readFileSync('schemas/agent-swarm.schema.json', 'utf8')) as {
    $id: string;
    $defs: Record<string, { additionalProperties?: boolean }>;
  };
  assert.match(schema.$id, /agent-swarm\.schema\.json$/);
  for (const name of ['envelope', 'taskGraph', 'taskResult', 'handover', 'contextSnapshot']) assert.equal(schema.$defs[name]?.additionalProperties, false, name);
  assert.equal(SWARM_PROTOCOL, 'conxian.swarm');
  assert.deepEqual(AGGREGATE_STATUSES, ['COMPLETE', 'PARTIAL', 'FAILED', 'BLOCKED', 'CONFLICT', 'CANCELLED']);
});

test('canonical JSON sorts objects, preserves arrays, normalizes negative zero, and rejects duplicate keys', () => {
  assert.equal(canonicalJson({ z: 1, a: [2, { d: true, c: null }] }), '{"a":[2,{"c":null,"d":true}],"z":1}');
  assert.equal(canonicalJson(-0), '0');
  assert.deepEqual(parseCanonicalJson('{"b":2,"a":1}'), { b: 2, a: 1 });
  expectCode(() => parseCanonicalJson('{"a":1,"a":2}'), 'INVALID_CONTRACT');
  expectCode(() => canonicalJson(Number.NaN), 'INVALID_CONTRACT');
});

test('task graph validation rejects unsupported versions, duplicate IDs, missing dependencies, cycles, and invalid limits', () => {
  const graph = validateTaskGraph(graphFixture());
  assert.deepEqual(deterministicTopologicalOrder(graph), ['task-a', 'task-b', 'task-c']);
  expectCode(() => validateTaskGraph({ ...graphFixture(), schema: 'task-graph.v2' }), 'UNSUPPORTED_VERSION');
  expectCode(() => validateTaskGraph({ ...graphFixture(), nodes: [task('task-a'), task('task-a')] }), 'INVALID_CONTRACT');
  expectCode(() => validateTaskGraph({ ...graphFixture(), nodes: [task('task-a'), task('task-b', ['missing'])] }), 'INVALID_GRAPH');
  expectCode(() => validateTaskGraph({ ...graphFixture(), nodes: [task('task-a', ['task-a'])] }), 'INVALID_GRAPH');
  const cyclic = { ...graphFixture(), nodes: [task('task-a', ['task-b']), task('task-b', ['task-a'])] };
  expectCode(() => validateTaskGraph(cyclic), 'INVALID_GRAPH');
  expectCode(() => validateTaskGraph({ ...graphFixture(), nodes: [task('task-a', [], true, 2), task('task-b', ['task-a']), task('task-c', ['task-b'])], limits: { ...graphFixture().limits, max_retry_budget: 0 } }), 'INVALID_GRAPH');
  expectCode(() => validateTaskGraph({ ...graphFixture(), limits: { ...graphFixture().limits, max_depth: 2 } }), 'INVALID_GRAPH');
});

test('task graph ordering is independent of node input order and capability requirements are deterministic', () => {
  const first = deterministicTopologicalOrder(graphFixture());
  const reversed = graphFixture();
  reversed.nodes.reverse();
  assert.deepEqual(deterministicTopologicalOrder(reversed), first);
  const requirements = [{ capability_id: 'Rust.Build', version_range: '>=1.0.0 <2.0.0', constraints: { target: 'linux' } }];
  const candidates = [
    { agent_id: 'agent-z', capabilities: [{ capability_id: 'rust.build', version: '1.2.0', constraints: { target: 'linux' } }], declared_priority: 5, links: [] },
    { agent_id: 'agent-a', capabilities: [{ capability_id: 'rust.build', version: '1.0.0', constraints: { target: 'linux' } }], declared_priority: 2, links: [] },
  ];
  const matches = matchCapabilities(requirements, candidates);
  assert.deepEqual(matches.selected_candidates.map((candidate) => candidate.agent_id), ['agent-a', 'agent-z']);
  assert.equal(matches.blocked, false);
  assert.equal(matchCapabilities([{ capability_id: 'rust.build', version_range: '2.0.0', constraints: {} }], candidates).blocked, true);
  expectCode(() => matchCapabilities([{ capability_id: 'rust.build', version_range: '1.0.0 || 2.0.0', constraints: {} }], candidates), 'CAPABILITY_MISMATCH');
  expectCode(() => matchCapabilities(requirements, [{ ...candidates[0], capabilities: [...candidates[0].capabilities, candidates[0].capabilities[0]] }]), 'INVALID_CONTRACT');
});

test('result validation enforces IDs, statuses, payload digest, and failure linkage', () => {
  const success = validateTaskResult(result('task-a', { output: 'ok' }));
  assert.equal(success.status, 'SUCCEEDED');
  expectCode(() => validateTaskResult({ ...success, schema: 'result.v2' }), 'UNSUPPORTED_VERSION');
  expectCode(() => validateTaskResult({ ...success, canonical_payload_digest: DIGEST }), 'INVALID_DIGEST');
  expectCode(() => validateTaskResult({ ...success, status: 'FAILED' }), 'INVALID_RESULT');
  expectCode(() => validateTaskResult({ ...success, task_id: 'bad id' }), 'INVALID_ID');
  expectCode(() => validateTaskResult({ ...success, extra: true }), 'UNKNOWN_FIELD');
});

test('result deduplication collapses identical deliveries and preserves conflicting attempts', () => {
  const duplicateA = result('task-a', { output: 'same' }, 'SUCCEEDED', 'result-a-1', 1, 'agent-a');
  const duplicateB = { ...duplicateA, result_id: 'result-a-2', agent_id: 'agent-b' };
  const conflict = result('task-a', { output: 'different' }, 'SUCCEEDED', 'result-a-3', 1, 'agent-c');
  const forward = deduplicateResults([conflict, duplicateB, duplicateA]);
  const reverse = deduplicateResults([duplicateA, duplicateB, conflict]);
  assert.equal(forward.duplicates[0]?.delivery_count, 2);
  assert.equal(forward.conflicts.length, 1);
  assert.deepEqual(forward.conflicts[0]?.payload_digests, reverse.conflicts[0]?.payload_digests);
  assert.deepEqual(forward.unique.map((entry) => entry.canonical_payload_digest), reverse.unique.map((entry) => entry.canonical_payload_digest));
});

test('envelope construction validates message linkage, expiry, authentication, and replay conflicts', () => {
  const make = (messageId: string, objective: string, key = 'retry-key') => createEnvelope({
    message_id: messageId,
    message_type: 'task',
    sender: { agent_id: 'agent-a', instance_id: 'instance-1' },
    recipient: { agent_id: 'agent-b' },
    correlation_id: 'correlation-1',
    idempotency_scope: 'workflow-1',
    idempotency_key: key,
    lifecycle: { state: 'PROPOSED', sequence: 0, expires_at: FUTURE },
    payload: { kind: 'task', graph_id: 'graph-1', task: { ...task('task-a'), objective }, links: [] },
    links: [{ relation: 'objective', target_id: 'task-a', locator: `urn:objective:${objective}` }],
  });
  const first = make('message-1', 'one');
  const duplicate = make('message-2', 'one');
  const conflict = make('message-3', 'two', 'retry-key');
  assert.equal(validateEnvelope(first).protocol, SWARM_PROTOCOL);
  assert.equal(deduplicateEnvelopes([duplicate, first]).duplicates[0]?.delivery_count, 2);
  assert.equal(deduplicateEnvelopes([first, conflict]).conflicts.length, 1);
  expectCode(() => validateEnvelope({ ...first, schema: 'envelope.v2' }), 'UNSUPPORTED_VERSION');
  expectCode(() => validateEnvelope({ ...first, unknown_required: true }), 'UNKNOWN_FIELD');
  expectCode(() => createEnvelope({ ...first, message_id: 'message-4', causation_id: 'message-4', integrity: undefined }), 'INVALID_ID');
  expectCode(() => validateEnvelope(first, { now: FUTURE }), 'EXPIRED');
  expectCode(() => validateEnvelope(first, { require_authentication: true }), 'AUTHENTICATION_REQUIRED');
});

test('lifecycle transition validation is monotonic and terminal states cannot reopen', () => {
  validateLifecycleTransition('PROPOSED', 'ACCEPTED', 0, 1);
  validateLifecycleTransition('STARTED', 'BLOCKED', 2, 3);
  validateLifecycleTransition('BLOCKED', 'STARTED', 3, 4);
  expectCode(() => validateLifecycleTransition('COMPLETED', 'STARTED', 1, 2), 'INVALID_TRANSITION');
  expectCode(() => validateLifecycleTransition('PROPOSED', 'STARTED', 0, 1), 'INVALID_TRANSITION');
  expectCode(() => validateLifecycleTransition('PROPOSED', 'ACCEPTED', 0, 2), 'INVALID_TRANSITION');
});

test('context packaging enforces #1162 allowlists, redacts sensitive fields, and records provenance', () => {
  const allowlist: ContextAllowlist = {
    repository_paths: [
      { path: 'AGENTS.md', tier: 'ARCHITECTURAL', required: true },
      { path: 'docs/optional.md', tier: 'OPERATIONAL', required: false },
    ],
    task_input_keys: ['instructions'],
    required_task_input_keys: ['instructions'],
    artifact_ids: ['artifact-1'],
    required_artifact_ids: [],
    assumption_keys: ['assumption'],
  };
  const snapshot = packageContext([
    contextInput(),
    { context_id: 'context-agents', key: 'repo.agents', source: { kind: 'DECLARED_REPOSITORY', path: 'AGENTS.md', tier: 'ARCHITECTURAL' }, value: '# context', classification: 'INTERNAL', sensitivity: 'NONE', captured_at: NOW },
  ], { allowlist, limits: emptyLimits, captured_at: NOW, now: NOW });
  assert.deepEqual(snapshot.required_keys, ['repo:AGENTS.md', 'task:instructions']);
  assert.equal(snapshot.entries.length, 2);
  const instructions = snapshot.entries.find((entry) => entry.key === 'current.instructions');
  assert.equal(instructions?.redaction.redacted, true);
  assert.equal(canonicalJson(instructions?.value).includes('must-not-leak'), false);
  assert.equal(instructions?.provenance_digest.startsWith('sha256:'), true);
  assert.deepEqual(validateContextSnapshot(snapshot).entries.map((entry) => entry.key), ['current.instructions', 'repo.agents']);
  expectCode(() => packageContext([contextInput({ source: { kind: 'DECLARED_REPOSITORY', path: '.env.production', tier: 'OPERATIONAL' } })], { allowlist: { ...allowlist, repository_paths: [{ path: '.env.production', tier: 'OPERATIONAL', required: false }], required_task_input_keys: [] }, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  expectCode(() => packageContext([contextInput({ source: { kind: 'DECLARED_REPOSITORY', path: 'docs/.secret.md', tier: 'OPERATIONAL' } })], { allowlist: { ...allowlist, repository_paths: [{ path: 'docs/.secret.md', tier: 'OPERATIONAL', required: false }], required_task_input_keys: [] }, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  expectCode(() => packageContext([contextInput({ source: { kind: 'TASK_INPUT', key: 'unlisted' } })], { allowlist, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
});

test('context packaging rejects missing and stale required sources, while optional stale data is flagged', () => {
  const allowlist: ContextAllowlist = {
    repository_paths: [{ path: 'AGENTS.md', tier: 'ARCHITECTURAL', required: true }],
    task_input_keys: ['instructions'], required_task_input_keys: ['instructions'], artifact_ids: [], required_artifact_ids: [], assumption_keys: [],
  };
  expectCode(() => packageContext([contextInput()], { allowlist, limits: emptyLimits, captured_at: NOW, now: NOW }), 'MISSING_CONTEXT');
  const stale = contextInput({ captured_at: '2026-07-22T10:00:00Z', stale_after: '2026-07-22T11:00:00Z' });
  const agentsContext: ContextInput = {
    ...contextInput({ context_id: 'agents', key: 'agents', source: { kind: 'DECLARED_REPOSITORY', path: 'AGENTS.md', tier: 'ARCHITECTURAL' }, value: 'agents' }),
  };
  expectCode(() => packageContext([stale, agentsContext], { allowlist, limits: emptyLimits, captured_at: NOW, now: NOW }), 'STALE_CONTEXT');
  const retainedAgents: ContextInput = {
    ...contextInput({ context_id: 'agents-2', key: 'agents', source: { kind: 'DECLARED_REPOSITORY', path: 'AGENTS.md', tier: 'ARCHITECTURAL' }, value: 'agents' }),
  };
  const retained = packageContext([stale, retainedAgents], { allowlist, limits: emptyLimits, captured_at: NOW, now: NOW, allow_stale: true });
  const resolution = resolveContextSnapshot(retained, LATER);
  assert.equal(resolution.valid, false);
  assert.deepEqual(resolution.stale_required, ['task:instructions']);
  assert.match(resolution.warnings.join(' '), /stale/);
  expectCode(() => validateContextSnapshot(retained, { now: LATER, reject_stale_required: true }), 'STALE_CONTEXT');
});

test('context bounds reject oversized values and support explicit deterministic truncation', () => {
  const allowlist: ContextAllowlist = { ...emptyAllowlist, task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] };
  const tiny: ContextLimits = { max_items: 2, max_total_bytes: 128, max_entry_bytes: 64, max_depth: 3 };
  expectCode(() => packageContext([contextInput({ value: 'a'.repeat(200) })], { allowlist, limits: tiny, captured_at: NOW, now: NOW }), 'CONTEXT_LIMIT');
  const truncated = packageContext([contextInput({ value: 'a'.repeat(200) })], { allowlist, limits: tiny, captured_at: NOW, now: NOW, allow_truncation: true });
  assert.equal(truncated.entries[0]?.truncated, true);
  assert.equal((truncated.entries[0]?.byte_length ?? 999) <= tiny.max_entry_bytes, true);
  assert.equal(validateContextSnapshot(truncated).entries[0]?.original_digest?.startsWith('sha256:'), true);
  expectCode(() => packageContext([contextInput({ value: { nested: { deeper: { value: true } } } })], { allowlist, limits: { ...tiny, max_entry_bytes: 1024, max_total_bytes: 1024, max_depth: 2 }, captured_at: NOW, now: NOW }), 'CONTEXT_LIMIT');
});

test('context merge applies precedence and retains deterministic conflict evidence', () => {
  const taskAllowlist: ContextAllowlist = { ...emptyAllowlist, task_input_keys: ['decision'], required_task_input_keys: [] };
  const operationalAllowlist: ContextAllowlist = { ...emptyAllowlist, repository_paths: [{ path: 'runbook.md', tier: 'OPERATIONAL', required: false }] };
  const taskSnapshot = packageContext([contextInput({ context_id: 'task-decision', key: 'decision', source: { kind: 'TASK_INPUT', key: 'decision' }, value: 'current' })], { allowlist: taskAllowlist, limits: emptyLimits, captured_at: NOW, now: NOW });
  const operationalSnapshot = packageContext([contextInput({ context_id: 'runbook-decision', key: 'decision', source: { kind: 'DECLARED_REPOSITORY', path: 'runbook.md', tier: 'OPERATIONAL' }, value: 'old' })], { allowlist: operationalAllowlist, limits: emptyLimits, captured_at: NOW, now: NOW });
  const merged = mergeContextSnapshots([operationalSnapshot, taskSnapshot], { now: NOW });
  assert.equal(merged.entries.find((entry) => entry.key === 'decision')?.value, 'current');
  assert.equal(merged.conflicts.length, 1);
  assert.equal(merged.conflicts[0]?.reason, 'lower-precedence');
  const reverse = mergeContextSnapshots([taskSnapshot, operationalSnapshot], { now: NOW });
  assert.equal(canonicalJson(merged), canonicalJson(reverse));
});

test('aggregation classifies complete, partial, failed, blocked, conflict, and cancellation outcomes', () => {
  const graph = graphFixture();
  const complete = aggregateResults(graph, [result('task-a', { value: 'a' }), result('task-b', { value: 'b' }), result('task-c', { value: 'c' })]);
  assert.equal(complete.status, 'COMPLETE');
  assert.equal(complete.success, true);
  const optionalGraph = { ...graph, nodes: [...graph.nodes, task('optional', ['task-a'], false)] };
  const partial = aggregateResults(optionalGraph, [result('task-a', { value: 'a' }), result('task-b', { value: 'b' }), result('task-c', { value: 'c' })]);
  assert.equal(partial.status, 'PARTIAL');
  const failed = aggregateResults(graph, [result('task-a', { value: 'a' }), result('task-b', { error: 'no' }, 'FAILED')]);
  assert.equal(failed.status, 'FAILED');
  assert.equal(failed.tasks.find((entry) => entry.task_id === 'task-c')?.status, 'BLOCKED');
  const blocked = aggregateResults(graph, [result('task-a', { value: 'a' })]);
  assert.equal(blocked.status, 'BLOCKED');
  const conflict = aggregateResults(graph, [result('task-a', { value: 'a' }), result('task-b', { value: 'b' }, 'SUCCEEDED', 'b-1'), result('task-b', { value: 'different' }, 'SUCCEEDED', 'b-2')]);
  assert.equal(conflict.status, 'CONFLICT');
  assert.equal(conflict.conflicts.length, 1);
  const cancelled = aggregateResults(graph, [result('task-a', { value: 'a' }), result('task-b', { reason: 'stop' }, 'CANCELLED')], { cancellation_reason: 'operator requested stop' });
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.cancellation_reason, 'operator requested stop');
});

test('aggregation is invariant to input ordering and preserves duplicate evidence', () => {
  const duplicate = result('task-a', { value: 'a' }, 'SUCCEEDED', 'a-duplicate', 1, 'agent-b');
  const base = result('task-a', { value: 'a' }, 'SUCCEEDED', 'a-result', 1, 'agent-a');
  const values = [result('task-b', { value: 'b' }), result('task-c', { value: 'c' }), duplicate, base];
  const first = aggregateResults(graphFixture(), values);
  const second = aggregateResults(graphFixture(), [...values].reverse());
  assert.equal(first.duplicate_evidence[0]?.delivery_count, 2);
  assert.equal(canonicalJson(first), canonicalJson(second));
});

test('handover construction includes graph state, decisions, risks, conflicts, context, and resume instructions', () => {
  const graph = graphFixture();
  const handover = createHandover({
    handover_id: 'handover-1', correlation_id: 'correlation-1', graph_id: 'graph-1', source_agent: { agent_id: 'agent-a' }, target_agent: { agent_id: 'agent-b' }, captured_at: NOW, expires_at: FUTURE, lifecycle_state: 'STARTED',
    completed_tasks: [{ task_id: 'task-a', state: 'COMPLETED', attempt: 1, links: [] }],
    active_tasks: [{ task_id: 'task-b', state: 'STARTED', attempt: 1, links: [] }],
    blocked_tasks: [], pending_tasks: [{ task_id: 'task-c', state: 'PROPOSED', reason: 'waiting for task-b', links: [] }],
    decisions: [{ decision_id: 'decision-1', sequence: 1, key: 'strategy', value: 'resume', rationale: 'continue from the active task', links: [] }],
    artifacts: [{ artifact_id: 'artifact-1', locator: 'urn:artifact:one', media_type: 'text/plain', digest: DIGEST, classification: 'INTERNAL', links: [] }],
    unresolved_conflicts: [{ conflict_id: 'conflict-1', object_id: 'task-b', payload_digests: [digestFor('one', 1), digestFor('two', 2)], resolution_required: true, links: [] }],
    risks_and_blockers: [{ risk_id: 'risk-1', severity: 'MEDIUM', status: 'OPEN', description: 'task-b has unresolved evidence', links: [] }],
    resume_instructions: [{ instruction_id: 'resume-1', sequence: 1, task_id: 'task-b', action: 'VERIFY', depends_on: ['task-a'], acceptance: 'verify the selected evidence before retrying', links: [] }],
    context_snapshot: emptyContext(), links: [{ relation: 'graph', target_id: 'graph-1', locator: 'urn:graph:graph-1' }],
  }, graph);
  assert.equal(validateHandover(handover, { graph }).handover_id, 'handover-1');
  assert.deepEqual(handover.completed_tasks.map((entry) => entry.task_id), ['task-a']);
  assert.deepEqual(handover.pending_tasks.map((entry) => entry.task_id), ['task-c']);
  assert.equal(handover.integrity.digest.startsWith('sha256:'), true);
  const assessment = assessHandoverResumability(handover, graph, NOW);
  assert.equal(assessment.valid, true);
  assert.equal(assessment.resumable, false);
  assert.deepEqual(assessment.unresolved_conflict_ids, ['conflict-1']);
});

test('handover validation rejects missing fields, bad task linkage, stale context, and invalid digests', () => {
  const graph = graphFixture();
  const base = createHandover({
    handover_id: 'handover-2', correlation_id: 'correlation-1', graph_id: 'graph-1', captured_at: NOW, expires_at: FUTURE, lifecycle_state: 'STARTED', completed_tasks: [], active_tasks: [], blocked_tasks: [], pending_tasks: [], decisions: [], artifacts: [], unresolved_conflicts: [], risks_and_blockers: [], resume_instructions: [], context_snapshot: emptyContext(), links: [],
  }, graph);
  const missing = { ...base } as Record<string, unknown>;
  delete missing.resume_instructions;
  expectCode(() => validateHandover(missing), 'INVALID_CONTRACT');
  expectCode(() => validateHandover({ ...base, graph_id: 'graph-other' }, { graph }), 'INVALID_HANDOVER');
  expectCode(() => validateHandover({ ...base, integrity: { ...base.integrity, digest: DIGEST } }), 'INVALID_DIGEST');
  expectCode(() => createHandover({ ...base, handover_id: 'handover-3', completed_tasks: [{ task_id: 'missing', state: 'COMPLETED', links: [] }] }, graph), 'INVALID_HANDOVER');
  const staleContext = packageContext([contextInput({ stale_after: '2026-07-22T12:30:00Z' })], { allowlist: { ...emptyAllowlist, task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] }, limits: emptyLimits, captured_at: NOW, now: NOW });
  const staleHandover = createHandover({ ...base, handover_id: 'handover-stale', context_snapshot: staleContext });
  const staleAssessment = assessHandoverResumability(staleHandover, undefined, LATER);
  assert.equal(staleAssessment.resumable, false);
  assert.deepEqual(staleAssessment.stale_context_ids, ['task:instructions']);
});

test('redaction handles nested secrets and never emits the raw sensitive value', () => {
  const redaction = redactSensitiveFields({ public: 'ok', nested: { password: 'raw-password', apiKey: 'raw-api-key' }, list: [{ token: 'raw-token' }] });
  const serialized = canonicalJson(redaction.value);
  assert.equal(redaction.fields.length, 3);
  assert.equal(serialized.includes('raw-password'), false);
  assert.equal(serialized.includes('raw-api-key'), false);
  assert.equal(serialized.includes('raw-token'), false);
});

test('sensitive context is serialized as a typed marker and raw values fail validation', () => {
  const allowlist: ContextAllowlist = { ...emptyAllowlist, task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] };
  const snapshot = packageContext([contextInput({ sensitivity: 'SECRET', value: 'raw-secret' })], { allowlist, limits: emptyLimits, captured_at: NOW, now: NOW });
  const entry = snapshot.entries[0];
  assert.deepEqual(entry?.value, { redacted: true, reason: 'SECRET' });
  assert.deepEqual(entry?.redaction, { redacted: true, fields: ['$'], reason: 'SECRET' });
  const forged = {
    ...snapshot,
    entries: [{ ...entry, value: 'raw-secret', byte_length: Buffer.byteLength(JSON.stringify('raw-secret'), 'utf8'), depth: 1 }],
  };
  expectCode(() => validateContextSnapshot(forged), 'INVALID_CONTEXT');
});
