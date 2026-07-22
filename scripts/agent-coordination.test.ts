import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { buildDiscoveryTrustAnchor, discoverRepository } from './agent-discovery';
import { discoveryAttestationScope, discoveryDigestFor } from './agent-discovery-contract';

import {
  AGGREGATE_STATUSES,
  SWARM_PROTOCOL,
  SWARM_SCHEMAS,
  CoordinationError,
  ContextAllowlist,
  ContextAllowlistOverrides,
  ContextInput,
  ContextLimits,
  ContextSnapshot,
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
  deriveContextAllowlist,
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
const DISCOVERY = discoverRepository(process.cwd(), { includeOptional: true });
const TRUSTED_DISCOVERY_ANCHOR = buildDiscoveryTrustAnchor(DISCOVERY);
const DISCOVERY_ANCHORS = [
  { path: '.agents/manifest.json', tier: 'CANONICAL' as const, required: false },
  { path: '.agents/skills/registry.json', tier: 'CANONICAL' as const, required: false },
];

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

const emptyAllowlist: ContextAllowlist = deriveContextAllowlist(DISCOVERY, {
  trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR,
  repository_paths: DISCOVERY_ANCHORS,
});

function makeAllowlist(overrides: ContextAllowlistOverrides = {}): ContextAllowlist {
  const repositoryPaths = overrides.repository_paths === undefined ? DISCOVERY_ANCHORS : [...DISCOVERY_ANCHORS, ...overrides.repository_paths];
  return deriveContextAllowlist(DISCOVERY, { ...overrides, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, repository_paths: repositoryPaths });
}

function provenance(allowlist: ContextAllowlist = emptyAllowlist) {
  return { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR };
}

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
  return packageContext([], { allowlist: emptyAllowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW });
}

test('schema is strict, versioned, and defines all protocol object families', () => {
  const schema = JSON.parse(readFileSync('schemas/agent-swarm.schema.json', 'utf8')) as {
    $id: string;
    $defs: Record<string, { additionalProperties?: boolean }>;
  };
  assert.match(schema.$id, /agent-swarm\.schema\.json$/);
  for (const name of ['envelope', 'taskGraph', 'taskResult', 'handover', 'contextSnapshot']) assert.equal(schema.$defs[name]?.additionalProperties, false, name);
  const trustSchema = JSON.parse(readFileSync('schemas/agent-discovery-trust.schema.json', 'utf8')) as Record<string, unknown>;
  const trustAjv = new Ajv2020({ allErrors: true, strict: false });
  const validateTrust = trustAjv.compile(trustSchema);
  assert.equal(validateTrust(DISCOVERY.attestation), true, JSON.stringify(validateTrust.errors));
  assert.equal(validateTrust(TRUSTED_DISCOVERY_ANCHOR), true, JSON.stringify(validateTrust.errors));
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
  const missingConstraint = {
    agent_id: 'agent-missing-constraint',
    capabilities: [{ capability_id: 'rust.build', version: '1.1.0', constraints: {} }],
    declared_priority: 0,
    links: [],
  };
  const mismatchedConstraint = {
    agent_id: 'agent-mismatched-constraint',
    capabilities: [{ capability_id: 'rust.build', version: '1.1.0', constraints: { target: 'darwin' } }],
    declared_priority: 0,
    links: [],
  };
  const ranked = matchCapabilities(requirements, [...candidates, missingConstraint, mismatchedConstraint]);
  const rankedAgain = matchCapabilities(requirements, [mismatchedConstraint, ...candidates, missingConstraint]);
  assert.deepEqual(ranked.candidates.map((candidate) => candidate.agent_id), rankedAgain.candidates.map((candidate) => candidate.agent_id));
  assert.equal(ranked.candidates.find((candidate) => candidate.agent_id === 'agent-missing-constraint')?.unmet_required_count, 1);
  assert.equal(ranked.candidates.find((candidate) => candidate.agent_id === 'agent-mismatched-constraint')?.unmet_required_count, 1);
  assert.equal(ranked.candidates.find((candidate) => candidate.agent_id === 'agent-missing-constraint')?.unmet_requirements[0]?.capability_id, 'rust.build');
  assert.equal(matchCapabilities([{ capability_id: 'rust.build', version_range: '2.0.0', constraints: {} }], candidates).blocked, true);
  expectCode(() => matchCapabilities([{ capability_id: 'rust.build', version_range: '1.0.0 || 2.0.0', constraints: {} }], candidates), 'CAPABILITY_MISMATCH');
  expectCode(() => matchCapabilities(requirements, [{ ...candidates[0], capabilities: [...candidates[0].capabilities, candidates[0].capabilities[0]] }]), 'INVALID_CONTRACT');
});

test('result validation enforces IDs, statuses, payload digest, and failure linkage', () => {
  const success = validateTaskResult(result('task-a', { output: 'ok' }));
  assert.equal(success.status, 'SUCCEEDED');
  assert.equal(validateTaskResult({ ...success, completed_at: '2026-07-22T08:00:00-04:00' }).completed_at, NOW);
  assert.equal(validateTaskResult({ ...success, completed_at: '2026-07-22T12:00:00.1Z' }).completed_at, '2026-07-22T12:00:00.100Z');
  assert.equal(validateTaskResult({ ...success, completed_at: '2026-07-22T12:00:00.12Z' }).completed_at, '2026-07-22T12:00:00.120Z');
  const firstMillisecond = validateTaskResult({ ...success, completed_at: '2026-07-22T12:00:00.123Z' });
  const nextMillisecond = validateTaskResult({ ...success, completed_at: '2026-07-22T12:00:00.124Z' });
  assert.notEqual(digestFor('test.timestamp', firstMillisecond.completed_at), digestFor('test.timestamp', nextMillisecond.completed_at));
  for (const timestamp of [
    '2026-02-29T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-13-01T00:00:00Z',
    '2026-01-01T24:00:00Z',
    '2026-01-01T00:00:00+01:60',
    '0000-01-01T00:00:00Z',
    '0001-01-01T00:00:00+01:00',
    '9999-12-31T23:59:59-01:00',
    '2026-01-01T00:00:00.1234Z',
    '2026-01-01T00:00:00.12345Z',
    '2026-01-01T00:00:00.123456Z',
    '2026-01-01T00:00:00.1234567Z',
    '2026-01-01T00:00:00.12345678Z',
    '2026-01-01T00:00:00.123456789Z',
  ]) {
    expectCode(() => validateTaskResult({ ...success, completed_at: timestamp }), 'INVALID_TIMESTAMP');
  }
  expectCode(() => validateTaskResult({ ...success, schema: 'result.v2' }), 'UNSUPPORTED_VERSION');
  expectCode(() => validateTaskResult({ ...success, canonical_payload_digest: DIGEST }), 'INVALID_DIGEST');
  expectCode(() => validateTaskResult({ ...success, status: 'FAILED' }), 'INVALID_RESULT');
  expectCode(() => validateTaskResult({ ...success, task_id: 'bad id' }), 'INVALID_ID');
  expectCode(() => validateTaskResult({ ...success, extra: true }), 'UNKNOWN_FIELD');
});

test('result deduplication collapses identical deliveries and preserves conflicting attempts', () => {
  const duplicateA = result('task-a', { output: 'same' }, 'SUCCEEDED', 'result-a-1', 1, 'agent-a');
  const duplicateB = { ...duplicateA, result_id: 'result-a-2' };
  const conflict = result('task-a', { output: 'different' }, 'SUCCEEDED', 'result-a-3', 1, 'agent-c');
  const forward = deduplicateResults([conflict, duplicateB, duplicateA]);
  const reverse = deduplicateResults([duplicateA, duplicateB, conflict]);
  assert.equal(forward.duplicates[0]?.delivery_count, 2);
  assert.equal(forward.conflicts.length, 1);
  assert.deepEqual(forward.conflicts[0]?.payload_digests, reverse.conflicts[0]?.payload_digests);
  assert.deepEqual(forward.unique.map((entry) => entry.canonical_payload_digest), reverse.unique.map((entry) => entry.canonical_payload_digest));
});

test('result semantic fingerprints preserve same-payload status, evidence, and artifact conflicts', () => {
  const base = result('task-a', { output: 'same' }, 'SUCCEEDED', 'semantic-base', 1, 'agent-a');
  const statusConflict = result('task-a', { output: 'same' }, 'FAILED', 'semantic-status', 1, 'agent-a');
  const evidenceConflict = {
    ...base,
    result_id: 'semantic-evidence',
    evidence: [{ evidence_id: 'evidence-1', kind: 'test', locator: 'urn:evidence:1', digest: DIGEST, summary: 'different evidence', links: [] }],
  };
  const artifactConflict = {
    ...base,
    result_id: 'semantic-artifact',
    artifacts: [{ artifact_id: 'artifact-1', locator: 'urn:artifact:1', media_type: 'text/plain', digest: DIGEST, classification: 'INTERNAL' as const, links: [] }],
  };
  const deduplicated = deduplicateResults([artifactConflict, statusConflict, evidenceConflict, base]);
  assert.equal(deduplicated.conflicts.length, 1);
  assert.equal(new Set(deduplicated.conflicts[0]?.payload_digests).size, 1);
  assert.equal(deduplicated.conflicts[0]?.result_fingerprints.length, 4);
  assert.deepEqual(deduplicated.duplicates, []);
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
  expectCode(() => validateLifecycleTransition('PROPOSED', 'ACCEPTED', -1, 0), 'INVALID_TRANSITION');
  expectCode(() => validateLifecycleTransition('PROPOSED', 'ACCEPTED', 0.5, 1.5), 'INVALID_TRANSITION');
  expectCode(() => validateLifecycleTransition('PROPOSED', 'ACCEPTED', 2_147_483_647, 2_147_483_648), 'INVALID_TRANSITION');
});

test('context packaging enforces #1162 allowlists, redacts sensitive fields, and records provenance', () => {
  const allowlist = makeAllowlist({
    repository_paths: [
      { path: 'AGENTS.md', tier: 'ARCHITECTURAL', required: true },
      { path: 'docs/REPOSITORY_TAXONOMY.md', tier: 'ARCHITECTURAL', required: false },
    ],
    task_input_keys: ['instructions'],
    required_task_input_keys: ['instructions'],
    artifact_ids: ['artifact-1'],
    required_artifact_ids: [],
    assumption_keys: ['assumption'],
  });
  const snapshot = packageContext([
    contextInput(),
    { context_id: 'context-agents', key: 'repo.agents', source: { kind: 'DECLARED_REPOSITORY', path: 'AGENTS.md', tier: 'ARCHITECTURAL' }, value: '# context', classification: 'INTERNAL', sensitivity: 'NONE', captured_at: NOW },
  ], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW });
  assert.deepEqual(snapshot.required_keys, ['repo:AGENTS.md', 'task:instructions']);
  assert.equal(snapshot.entries.length, 2);
  const instructions = snapshot.entries.find((entry) => entry.key === 'current.instructions');
  assert.equal(instructions?.redaction.redacted, true);
  assert.equal(canonicalJson(instructions?.value).includes('must-not-leak'), false);
  assert.equal(instructions?.provenance_digest.startsWith('sha256:'), true);
  assert.deepEqual(validateContextSnapshot(snapshot, provenance(allowlist)).entries.map((entry) => entry.key), ['current.instructions', 'repo.agents']);
  expectCode(() => packageContext([contextInput({ source: { kind: 'DECLARED_REPOSITORY', path: '.env.production', tier: 'OPERATIONAL' } })], { allowlist: { ...allowlist, repository_paths: [{ path: '.env.production', tier: 'OPERATIONAL', required: false }] }, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  expectCode(() => packageContext([contextInput({ source: { kind: 'DECLARED_REPOSITORY', path: 'docs/.secret.md', tier: 'OPERATIONAL' } })], { allowlist: { ...allowlist, repository_paths: [{ path: 'docs/.secret.md', tier: 'OPERATIONAL', required: false }] }, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  expectCode(() => packageContext([contextInput({ source: { kind: 'TASK_INPUT', key: 'unlisted' } })], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
});

test('context packaging rejects missing and stale required sources, while optional stale data is flagged', () => {
  const allowlist = makeAllowlist({
    repository_paths: [{ path: 'AGENTS.md', tier: 'ARCHITECTURAL', required: true }],
    task_input_keys: ['instructions'], required_task_input_keys: ['instructions'], artifact_ids: [], required_artifact_ids: [], assumption_keys: [],
  });
  expectCode(() => packageContext([contextInput()], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'MISSING_CONTEXT');
  const stale = contextInput({ captured_at: '2026-07-22T10:00:00Z', stale_after: '2026-07-22T11:00:00Z' });
  const agentsContext: ContextInput = {
    ...contextInput({ context_id: 'agents', key: 'agents', source: { kind: 'DECLARED_REPOSITORY', path: 'AGENTS.md', tier: 'ARCHITECTURAL' }, value: 'agents' }),
  };
  expectCode(() => packageContext([stale, agentsContext], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'STALE_CONTEXT');
  const retainedAgents: ContextInput = {
    ...contextInput({ context_id: 'agents-2', key: 'agents', source: { kind: 'DECLARED_REPOSITORY', path: 'AGENTS.md', tier: 'ARCHITECTURAL' }, value: 'agents' }),
  };
  const retained = packageContext([stale, retainedAgents], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW, allow_stale: true });
  const resolution = resolveContextSnapshot(retained, LATER, provenance(allowlist));
  assert.equal(resolution.valid, false);
  assert.deepEqual(resolution.stale_required, ['task:instructions']);
  assert.match(resolution.warnings.join(' '), /stale/);
  expectCode(() => validateContextSnapshot(retained, { ...provenance(allowlist), now: LATER, reject_stale_required: true }), 'STALE_CONTEXT');
});

test('context freshness uses effective now at the captured/stale boundary', () => {
  const allowlist = makeAllowlist({ task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] });
  const boundary = contextInput({ captured_at: '2026-07-22T10:00:00Z', stale_after: '2026-07-22T11:00:00Z' });
  const current = packageContext([boundary], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: '2026-07-22T10:00:00Z', now: '2026-07-22T10:30:00Z' });
  assert.equal(current.entries[0]?.stale, false);
  expectCode(() => packageContext([boundary], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: '2026-07-22T10:00:00Z', now: '2026-07-22T11:30:00Z' }), 'STALE_CONTEXT');
  const retained = packageContext([boundary], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: '2026-07-22T10:00:00Z', now: '2026-07-22T11:30:00Z', allow_stale: true });
  assert.equal(retained.entries[0]?.stale, true);
  assert.deepEqual(retained.stale_required, ['task:instructions']);
});

test('context bounds reject oversized values and support explicit deterministic truncation', () => {
  const allowlist = makeAllowlist({ task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] });
  const tiny: ContextLimits = { max_items: 2, max_total_bytes: 128, max_entry_bytes: 64, max_depth: 3 };
  expectCode(() => packageContext([contextInput({ value: 'a'.repeat(200) })], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: tiny, captured_at: NOW, now: NOW }), 'CONTEXT_LIMIT');
  const truncated = packageContext([contextInput({ value: 'a'.repeat(200) })], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: tiny, captured_at: NOW, now: NOW, allow_truncation: true });
  assert.equal(truncated.entries[0]?.truncated, true);
  assert.equal((truncated.entries[0]?.byte_length ?? 999) <= tiny.max_entry_bytes, true);
  assert.equal(validateContextSnapshot(truncated, provenance(allowlist)).entries[0]?.original_digest?.startsWith('sha256:'), true);
  expectCode(() => packageContext([contextInput({ value: { nested: { deeper: { value: true } } } })], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: { ...tiny, max_entry_bytes: 1024, max_total_bytes: 1024, max_depth: 2 }, captured_at: NOW, now: NOW }), 'CONTEXT_LIMIT');
});

test('context merge applies precedence and retains deterministic conflict evidence', () => {
  const sharedAllowlist = makeAllowlist({ task_input_keys: ['decision'], required_task_input_keys: [], repository_paths: [{ path: 'docs/AGENT_ONBOARDING.md', tier: 'ARCHITECTURAL', required: false }] });
  const sharedProvenance = provenance(sharedAllowlist);
  const taskSnapshot = packageContext([contextInput({ context_id: 'task-decision', key: 'decision', source: { kind: 'TASK_INPUT', key: 'decision' }, value: 'current' })], { ...sharedProvenance, limits: emptyLimits, captured_at: NOW, now: NOW });
  const operationalSnapshot = packageContext([contextInput({ context_id: 'runbook-decision', key: 'decision', source: { kind: 'DECLARED_REPOSITORY', path: 'docs/AGENT_ONBOARDING.md', tier: 'ARCHITECTURAL' }, value: 'old' })], { ...sharedProvenance, limits: emptyLimits, captured_at: NOW, now: NOW });
  const merged = mergeContextSnapshots([operationalSnapshot, taskSnapshot], { ...sharedProvenance, now: NOW });
  assert.equal(merged.entries.find((entry) => entry.key === 'decision')?.value, 'current');
  assert.equal(merged.conflicts.length, 1);
  assert.equal(merged.conflicts[0]?.reason, 'lower-precedence');
  const reverse = mergeContextSnapshots([taskSnapshot, operationalSnapshot], { ...sharedProvenance, now: NOW });
  assert.equal(canonicalJson(merged), canonicalJson(reverse));
  assert.equal(merged.allowlist_digest, digestFor('conxian.swarm.context-allowlist.v1', sharedAllowlist));
  assert.doesNotThrow(() => createHandover({ handover_id: 'merge-handover', correlation_id: 'correlation-1', graph_id: 'graph-1', captured_at: NOW, expires_at: FUTURE, lifecycle_state: 'STARTED', completed_tasks: [], active_tasks: [], blocked_tasks: [], pending_tasks: [], decisions: [], artifacts: [], unresolved_conflicts: [], risks_and_blockers: [], resume_instructions: [], context_snapshot: merged, links: [] }, graphFixture(), sharedProvenance));
  const otherAllowlist = makeAllowlist({ task_input_keys: ['other'], required_task_input_keys: [] });
  const otherSnapshot = packageContext([contextInput({ source: { kind: 'TASK_INPUT', key: 'other' }, key: 'other', value: 'other' })], { ...provenance(otherAllowlist), limits: emptyLimits, captured_at: NOW, now: NOW });
  expectCode(() => mergeContextSnapshots([taskSnapshot, otherSnapshot], { ...sharedProvenance, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  const forged = { ...taskSnapshot, allowlist_digest: digestFor('conxian.swarm.context-allowlist.v1', otherAllowlist) };
  expectCode(() => mergeContextSnapshots([forged, taskSnapshot], { ...sharedProvenance, now: NOW }), 'INVALID_DIGEST');
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
  const duplicate = result('task-a', { value: 'a' }, 'SUCCEEDED', 'a-duplicate', 1, 'agent-a');
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
  }, graph, provenance());
  assert.equal(validateHandover(handover, { graph, ...provenance() }).handover_id, 'handover-1');
  assert.deepEqual(handover.completed_tasks.map((entry) => entry.task_id), ['task-a']);
  assert.deepEqual(handover.pending_tasks.map((entry) => entry.task_id), ['task-c']);
  assert.equal(handover.integrity.digest.startsWith('sha256:'), true);
  const assessment = assessHandoverResumability(handover, { graph, ...provenance(), now: NOW });
  assert.equal(assessment.valid, true);
  assert.equal(assessment.resumable, false);
  assert.deepEqual(assessment.unresolved_conflict_ids, ['conflict-1']);
});

test('handover validation rejects missing fields, bad task linkage, stale context, and invalid digests', () => {
  const graph = graphFixture();
  const base = createHandover({
    handover_id: 'handover-2', correlation_id: 'correlation-1', graph_id: 'graph-1', captured_at: NOW, expires_at: FUTURE, lifecycle_state: 'STARTED', completed_tasks: [], active_tasks: [], blocked_tasks: [], pending_tasks: [], decisions: [], artifacts: [], unresolved_conflicts: [], risks_and_blockers: [], resume_instructions: [], context_snapshot: emptyContext(), links: [],
  }, graph, provenance());
  const missing = { ...base } as Record<string, unknown>;
  delete missing.resume_instructions;
  expectCode(() => validateHandover(missing, { graph, ...provenance() }), 'INVALID_CONTRACT');
  expectCode(() => validateHandover({ ...base, graph_id: 'graph-other' }, { graph, ...provenance() }), 'INVALID_HANDOVER');
  expectCode(() => validateHandover({ ...base, integrity: { ...base.integrity, digest: DIGEST } }, { graph, ...provenance() }), 'INVALID_DIGEST');
  expectCode(() => createHandover({ ...base, handover_id: 'handover-3', completed_tasks: [{ task_id: 'missing', state: 'COMPLETED', links: [] }] }, graph, provenance()), 'INVALID_HANDOVER');
  const staleAllowlist = makeAllowlist({ task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] });
  const staleContext = packageContext([contextInput({ stale_after: '2026-07-22T12:30:00Z' })], { allowlist: staleAllowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW });
  const staleHandover = createHandover({ ...base, handover_id: 'handover-stale', context_snapshot: staleContext }, graph, provenance(staleAllowlist));
  const staleAssessment = assessHandoverResumability(staleHandover, { graph, ...provenance(staleAllowlist), now: LATER });
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
  const allowlist = makeAllowlist({ task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] });
  const snapshot = packageContext([contextInput({ sensitivity: 'SECRET', value: 'raw-secret' })], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW });
  const entry = snapshot.entries[0];
  assert.deepEqual(entry?.value, { redacted: true, reason: 'SECRET' });
  assert.deepEqual(entry?.redaction, { redacted: true, fields: ['$'], reason: 'SECRET' });
  const forged = {
    ...snapshot,
    entries: [{ ...entry, value: 'raw-secret', byte_length: Buffer.byteLength(JSON.stringify('raw-secret'), 'utf8'), depth: 1 }],
  };
  expectCode(() => validateContextSnapshot(forged, provenance(allowlist)), 'INVALID_CONTEXT');
});

test('context allowlists require #1162 provenance and permit only declared .agents sources', () => {
  const manifestAllowlist = makeAllowlist({ repository_paths: [{ path: '.agents/manifest.json', tier: 'CANONICAL', required: false }] });
  const manifestSnapshot = packageContext([contextInput({ context_id: 'manifest', key: 'manifest', source: { kind: 'DECLARED_REPOSITORY', path: '.agents/manifest.json', tier: 'CANONICAL' }, value: { protocol: 'conxian-agent-discovery' } })], { allowlist: manifestAllowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW });
  assert.equal(manifestSnapshot.entries[0]?.source.kind, 'DECLARED_REPOSITORY');

  expectCode(() => packageContext([contextInput({ source: { kind: 'DECLARED_REPOSITORY', path: '.agents/not-listed.md', tier: 'ARCHITECTURAL' } })], { allowlist: emptyAllowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  expectCode(() => packageContext([contextInput({ source: { kind: 'DECLARED_REPOSITORY', path: 'docs/../AGENTS.md', tier: 'ARCHITECTURAL' } })], { allowlist: emptyAllowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  expectCode(() => packageContext([contextInput({ source: { kind: 'DECLARED_REPOSITORY', path: 'docs//AGENTS.md', tier: 'ARCHITECTURAL' } })], { allowlist: emptyAllowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');

  const tamperedDigest = { ...emptyAllowlist, provenance: { ...emptyAllowlist.provenance, repository_paths_digest: digestFor('tampered-paths', emptyAllowlist.repository_paths) } };
  expectCode(() => packageContext([], { allowlist: tamperedDigest, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'INVALID_DIGEST');
  const tamperedDiscovery = { ...emptyAllowlist, provenance: { ...emptyAllowlist.provenance, discovery_digest: digestFor('tampered-discovery', DISCOVERY) } };
  expectCode(() => packageContext([], { allowlist: tamperedDiscovery, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_NOT_ALLOWED');
  const freeForm = { ...emptyAllowlist } as Record<string, unknown>;
  delete freeForm.provenance;
  expectCode(() => packageContext([], { allowlist: freeForm as unknown as ContextAllowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW }), 'INVALID_CONTRACT');
});

test('prototype-key JSON values round-trip and redact without prototype pollution', () => {
  const parsed = parseCanonicalJson('{"__proto__":{"polluted":true},"constructor":"constructor-value","prototype":"prototype-value"}');
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, '__proto__'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'constructor'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed, 'prototype'), true);
  assert.equal((Object.prototype as Record<string, unknown>).polluted, undefined);
  const redacted = redactSensitiveFields(parsed);
  assert.equal(typeof redacted.value === 'object' && redacted.value !== null && !Array.isArray(redacted.value), true);
  const redactedRecord = redacted.value as Record<string, unknown>;
  assert.deepEqual(Object.keys(redactedRecord).sort(), ['__proto__', 'constructor', 'prototype']);
  assert.deepEqual(parseCanonicalJson(canonicalJson(redacted.value)), redacted.value);
});

test('graph context budgets and handover graph/authentication/provenance boundaries are enforced', () => {
  const smallGraph = { ...graphFixture(), limits: { ...graphFixture().limits, max_context_bytes: 32 } };
  expectCode(() => packageContext([contextInput({ value: 'a'.repeat(128) })], { allowlist: makeAllowlist({ task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] }), discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, graph: smallGraph, limits: emptyLimits, captured_at: NOW, now: NOW }), 'CONTEXT_LIMIT');

  const graph = graphFixture();
  const handover = createHandover({ handover_id: 'boundary-handover', correlation_id: 'correlation-1', graph_id: 'graph-1', captured_at: NOW, expires_at: FUTURE, lifecycle_state: 'STARTED', completed_tasks: [], active_tasks: [], blocked_tasks: [], pending_tasks: [], decisions: [], artifacts: [], unresolved_conflicts: [], risks_and_blockers: [], resume_instructions: [], context_snapshot: emptyContext(), links: [] }, graph, provenance());
  expectCode(() => validateHandover({ ...handover, graph_digest: DIGEST }, { graph, ...provenance() }), 'INVALID_HANDOVER');
  expectCode(() => validateHandover({ ...handover, integrity: { ...handover.integrity, authentication: { scheme: 'signature', verified: true, subject: 'agent-a' } } }, { graph, ...provenance() }), 'UNKNOWN_FIELD');

  const handoverEnvelope = createEnvelope({
    message_id: 'handover-message-1', message_type: 'handover', sender: { agent_id: 'agent-a' }, recipient: { agent_id: 'agent-b' },
    correlation_id: 'correlation-1', idempotency_scope: 'workflow-1', idempotency_key: 'handover-key',
    lifecycle: { state: 'STARTED', sequence: 2, expires_at: FUTURE }, payload: { kind: 'handover', handover, links: [] }, links: [],
  }, { graph, ...provenance() });
  expectCode(() => deduplicateEnvelopes([handoverEnvelope]), 'INVALID_HANDOVER');
  expectCode(() => deduplicateEnvelopes([handoverEnvelope], { graph }), 'CONTEXT_NOT_ALLOWED');
  assert.equal(deduplicateEnvelopes([handoverEnvelope], { graph, ...provenance() }).unique.length, 1);
});

test('handover provenance rejects a self-consistent unallowlisted context after local digest recomputation', () => {
  const graph = graphFixture();
  const allowlist = makeAllowlist({ task_input_keys: ['instructions'], required_task_input_keys: ['instructions'] });
  const snapshot = packageContext([contextInput()], { allowlist, discovery: DISCOVERY, trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR, limits: emptyLimits, captured_at: NOW, now: NOW });
  const originalEntry = snapshot.entries[0];
  assert.ok(originalEntry);

  const forgedEntryRecord: Record<string, unknown> = {
    ...originalEntry,
    source: { kind: 'DECLARED_REPOSITORY', path: 'docs/not-allowlisted.md', tier: 'ARCHITECTURAL' },
    precedence: 500,
  };
  delete forgedEntryRecord.provenance_digest;
  const forgedEntry = {
    ...forgedEntryRecord,
    provenance_digest: digestFor('conxian.swarm.context-entry.v1', forgedEntryRecord),
  };
  const forgedSnapshotRecord: Record<string, unknown> = {
    ...snapshot,
    entries: [forgedEntry],
    required_keys: ['repo:docs/not-allowlisted.md'],
    missing_required: [],
    stale_required: [],
    expired_required: [],
  };
  delete forgedSnapshotRecord.integrity;
  const forgedSnapshot = {
    ...forgedSnapshotRecord,
    integrity: { digest: digestFor('conxian.swarm.context.v1', forgedSnapshotRecord) },
  } as unknown as ContextSnapshot;

  expectCode(() => validateContextSnapshot(forgedSnapshot, provenance(allowlist)), 'CONTEXT_NOT_ALLOWED');
  const validHandover = createHandover({
    handover_id: 'provenance-base', correlation_id: 'correlation-1', graph_id: 'graph-1', captured_at: NOW, expires_at: FUTURE, lifecycle_state: 'STARTED', completed_tasks: [], active_tasks: [], blocked_tasks: [], pending_tasks: [], decisions: [], artifacts: [], unresolved_conflicts: [], risks_and_blockers: [], resume_instructions: [], context_snapshot: snapshot, links: [],
  }, graph, provenance(allowlist));
  expectCode(() => createHandover({ ...validHandover, handover_id: 'provenance-forged', context_snapshot: forgedSnapshot }, graph, provenance(allowlist)), 'CONTEXT_NOT_ALLOWED');
});

test('trusted #1162 anchor rejects injected, removed, re-tiered, and changed discovery content', () => {
  const refreshAttestation = (result: typeof DISCOVERY): typeof DISCOVERY => {
    const attestation = result.attestation;
    const comparePaths = (left: { path: string }, right: { path: string }): number => left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
    attestation.context.required.sort(comparePaths);
    attestation.context.optional.sort(comparePaths);
    attestation.skills.selected.sort(comparePaths);
    attestation.digest = discoveryDigestFor('conxian-agent-discovery.attestation.v1', discoveryAttestationScope(attestation));
    return result;
  };

  assert.doesNotThrow(() => deriveContextAllowlist(DISCOVERY, { trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR }));

  const injected = structuredClone(DISCOVERY);
  const injectedContext = { path: 'docs/not-allowlisted.md', priority: 70, description: 'Forged context', content: 'forged-content' };
  injected.context.optional.push(injectedContext);
  injected.attestation.context.optional.push({
    path: injectedContext.path,
    tier: 'ARCHITECTURAL',
    required: false,
    priority: injectedContext.priority,
    description: injectedContext.description,
    content_digest: discoveryDigestFor('conxian-agent-discovery.context-content.v1', injectedContext.content),
  });
  expectCode(() => deriveContextAllowlist(refreshAttestation(injected), { trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR }), 'CONTEXT_NOT_ALLOWED');

  const removed = structuredClone(DISCOVERY);
  removed.context.required.pop();
  removed.attestation.context.required.pop();
  expectCode(() => deriveContextAllowlist(refreshAttestation(removed), { trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR }), 'CONTEXT_NOT_ALLOWED');

  const changedTier = structuredClone(DISCOVERY);
  const tierEntry = changedTier.attestation.context.required.find((entry) => entry.path === 'AGENTS.md');
  assert.ok(tierEntry);
  tierEntry.tier = 'GOVERNANCE';
  expectCode(() => deriveContextAllowlist(refreshAttestation(changedTier), { trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR }), 'CONTEXT_NOT_ALLOWED');

  const changedSkill = structuredClone(DISCOVERY);
  const selectedSkill = changedSkill.skills.selected[0];
  const attestedSkill = changedSkill.attestation.skills.selected[0];
  assert.ok(selectedSkill);
  assert.ok(attestedSkill);
  selectedSkill.content = `${selectedSkill.content}\nforged`;
  attestedSkill.content_digest = discoveryDigestFor('conxian-agent-discovery.skill-content.v1', selectedSkill.content);
  expectCode(() => deriveContextAllowlist(refreshAttestation(changedSkill), { trusted_discovery_anchor: TRUSTED_DISCOVERY_ANCHOR }), 'CONTEXT_NOT_ALLOWED');

  const changedAnchor = structuredClone(TRUSTED_DISCOVERY_ANCHOR);
  changedAnchor.digest = discoveryDigestFor('conxian-agent-discovery.tampered-anchor.v1', changedAnchor);
  expectCode(() => deriveContextAllowlist(DISCOVERY, { trusted_discovery_anchor: changedAnchor }), 'INVALID_TRUST_ANCHOR');
});

test('JSON Schema validation covers valid and invalid protocol fixtures', () => {
  const schema = JSON.parse(readFileSync('schemas/agent-swarm.schema.json', 'utf8')) as Record<string, unknown>;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const validEnvelope = createEnvelope({
    message_id: 'schema-message', message_type: 'task', sender: { agent_id: 'agent-a' }, recipient: { agent_id: 'agent-b' }, correlation_id: 'schema-correlation', idempotency_scope: 'schema-scope', idempotency_key: 'schema-key',
    lifecycle: { state: 'PROPOSED', sequence: 0, expires_at: FUTURE }, payload: { kind: 'task', graph_id: 'graph-1', task: task('task-a'), links: [] }, links: [],
  });
  const validGraph = graphFixture();
  const validResult = result('task-a', { output: 'schema' });
  const validContext = emptyContext();
  const validHandover = createHandover({ handover_id: 'schema-handover', correlation_id: 'schema-correlation', graph_id: 'graph-1', captured_at: NOW, expires_at: FUTURE, lifecycle_state: 'STARTED', completed_tasks: [], active_tasks: [], blocked_tasks: [], pending_tasks: [], decisions: [], artifacts: [], unresolved_conflicts: [], risks_and_blockers: [], resume_instructions: [], context_snapshot: validContext, links: [] }, validGraph, provenance());
  for (const fixture of [validEnvelope, validGraph, validResult, validHandover, validContext]) assert.equal(validate(fixture), true, JSON.stringify(validate.errors));

  const invalidFixtures: unknown[] = [
    { ...validEnvelope, integrity: undefined },
    { ...validGraph, nodes: [] },
    { ...validResult, attempt: 0 },
    { ...validResult, completed_at: '2026-07-22T12:00:00.1234Z' },
    { ...validHandover, graph_digest: undefined },
    { ...validContext, evaluated_at: undefined },
    { ...validHandover, unresolved_conflicts: [{ conflict_id: 'conflict-1', object_id: 'task-a', payload_digests: [DIGEST], resolution_required: true, links: [] }] },
  ];
  for (const fixture of invalidFixtures) assert.equal(validate(fixture), false, JSON.stringify(validate.errors));
});
