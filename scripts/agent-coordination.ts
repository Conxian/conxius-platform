#!/usr/bin/env -S pnpm exec tsx

import { createHash } from 'node:crypto';
import type { DiscoveryResult } from './agent-discovery';
import {
  DISCOVERY_ATTESTATION_PROTOCOL,
  DISCOVERY_ATTESTATION_VERSION,
  DISCOVERY_TRUST_ANCHOR_PROTOCOL,
  DISCOVERY_TRUST_ANCHOR_VERSION,
  discoveryDigestFor,
  type DiscoveryAttestation,
  type DiscoveryTrustAnchor,
  type DiscoveryTrustContextEntry,
  type DiscoveryTrustSkillEntry,
  type DiscoveryTrustScope,
} from './agent-discovery-contract';

/**
* Transport-neutral coordination contracts for Conxian swarm agents.
* This module has no filesystem, network, process, environment, scheduler,
* or provider dependencies. Callers provide all context and make execution
* decisions; this module only normalizes and validates data.
*/

export const SWARM_PROTOCOL = 'conxian.swarm' as const;
export const SUPPORTED_PROTOCOL_MAJOR = 1 as const;
export const SWARM_SCHEMAS = {
  envelope: 'envelope.v1',
  taskGraph: 'task-graph.v1',
  result: 'result.v1',
  handover: 'handover.v1',
  context: 'context.v1',
} as const;
export const CONTEXT_ALLOWLIST_PROTOCOL = 'conxian.swarm.context-allowlist' as const;
export const CONTEXT_ALLOWLIST_VERSION = '1.0.0' as const;
export type TrustedDiscoveryAnchor = DiscoveryTrustAnchor;

export const MESSAGE_TYPES = ['task', 'ack', 'progress', 'result', 'handover', 'error', 'cancel'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export const LIFECYCLE_STATES = [
  'PROPOSED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED', 'REJECTED', 'EXPIRED',
] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export const RESULT_STATUSES = ['SUCCEEDED', 'FAILED', 'BLOCKED', 'CANCELLED', 'EXPIRED'] as const;
export type TaskResultStatus = (typeof RESULT_STATUSES)[number];

export const AGGREGATE_STATUSES = ['COMPLETE', 'PARTIAL', 'FAILED', 'BLOCKED', 'CONFLICT', 'CANCELLED'] as const;
export type AggregateStatus = (typeof AGGREGATE_STATUSES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = Record<string, unknown>;
export type Digest = `sha256:${string}`;

export type CoordinationErrorCode =
  | 'INVALID_CONTRACT' | 'UNSUPPORTED_VERSION' | 'UNKNOWN_FIELD' | 'INVALID_ID' | 'INVALID_LINK'
  | 'INVALID_TIMESTAMP' | 'EXPIRED' | 'INVALID_TRANSITION' | 'REPLAY_CONFLICT' | 'INVALID_DIGEST'
  | 'INVALID_GRAPH' | 'CAPABILITY_MISMATCH' | 'INVALID_RESULT' | 'INVALID_HANDOVER' | 'INVALID_CONTEXT'
  | 'CONTEXT_NOT_ALLOWED' | 'CONTEXT_LIMIT' | 'MISSING_CONTEXT' | 'STALE_CONTEXT' | 'AUTHENTICATION_REQUIRED'
  | 'INVALID_TRUST_ANCHOR' | 'MIXED_CONTEXT_PROVENANCE';

export class CoordinationError extends Error {
  public readonly code: CoordinationErrorCode;
  public readonly path: string | undefined;

  public constructor(code: CoordinationErrorCode, message: string, path?: string) {
    super(message);
    this.name = 'CoordinationError';
    this.code = code;
    this.path = path;
  }
}

export interface AgentIdentity { agent_id: string; instance_id?: string; }
export type Recipient = AgentIdentity | { capability: string; version_range?: string };
export interface ProtocolLink { relation: string; target_id: string; locator: string; digest?: Digest; }
export interface Lifecycle { state: LifecycleState; sequence: number; expires_at: string; }
export interface AuthenticationAssertion { scheme: 'transport' | 'signature'; verified: boolean; subject: string; expires_at?: string; }
export interface IntegrityMetadata { digest: Digest; authentication?: AuthenticationAssertion; }
export interface DigestIntegrityMetadata { digest: Digest; }
export interface ContextReference { context_id: string; digest: Digest; links: ProtocolLink[]; }
export interface FailureDetail { code: string; message: string; details?: string; }

export type CapabilityConstraint = Record<string, JsonPrimitive>;
export interface CapabilityRequirement { capability_id: string; version_range: string; constraints: CapabilityConstraint; }
export interface RetryPolicy { max_attempts: number; backoff_ms: number; timeout_ms: number; }
export interface TaskNode {
  task_id: string;
  objective: string;
  schema: string;
  depends_on: string[];
  required: boolean;
  capabilities: CapabilityRequirement[];
  retry: RetryPolicy;
  links: ProtocolLink[];
}
export interface GraphLimits {
  max_nodes: number;
  max_depth: number;
  max_retry_budget: number;
  max_timeout_ms: number;
  max_context_bytes: number;
}
export interface AggregationPolicy {
  optional_failure: 'PARTIAL';
  required_failure: 'FAILED';
  required_blocked: 'BLOCKED';
  conflict: 'CONFLICT';
  cancellation: 'CANCELLED';
}
export interface TaskGraph {
  schema: typeof SWARM_SCHEMAS.taskGraph;
  graph_id: string;
  root_task_id: string;
  nodes: TaskNode[];
  limits: GraphLimits;
  aggregation_policy: AggregationPolicy;
  links: ProtocolLink[];
}
export interface CapabilityOffer { capability_id: string; version: string; constraints: CapabilityConstraint; }
export interface CapabilityCandidate {
  agent_id: string;
  instance_id?: string;
  capabilities: CapabilityOffer[];
  declared_priority: number;
  links: ProtocolLink[];
}
export interface CapabilityMatch {
  agent_id: string;
  instance_id?: string;
  declared_priority: number;
  matched_capabilities: string[];
  unmet_requirements: CapabilityRequirement[];
  unmet_required_count: number;
  exact_version_match_count: number;
  links: ProtocolLink[];
}
export interface CapabilityMatchResult {
  requirements: CapabilityRequirement[];
  candidates: CapabilityMatch[];
  selected_candidates: CapabilityMatch[];
  blocked: boolean;
}

export const CONTEXT_TIERS = ['TASK', 'GOVERNANCE', 'CANONICAL', 'ARCHITECTURAL', 'OPERATIONAL', 'EVIDENCE', 'HISTORICAL', 'ASSUMPTION'] as const;
export type ContextTier = (typeof CONTEXT_TIERS)[number];
export const CONTEXT_PRECEDENCE: Readonly<Record<ContextTier, number>> = {
  TASK: 700, GOVERNANCE: 600, CANONICAL: 600, ARCHITECTURAL: 500,
  OPERATIONAL: 400, EVIDENCE: 300, HISTORICAL: 200, ASSUMPTION: 100,
};
export type ContextSource =
  | { kind: 'TASK_INPUT'; key: string }
  | { kind: 'DECLARED_REPOSITORY'; path: string; tier: Exclude<ContextTier, 'TASK' | 'ASSUMPTION'> }
  | { kind: 'ARTIFACT'; artifact_id: string; tier: Exclude<ContextTier, 'TASK' | 'ASSUMPTION'> }
  | { kind: 'ASSUMPTION'; key: string };
export const CLASSIFICATIONS = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];
export const SENSITIVITIES = ['NONE', 'SECRET', 'CREDENTIAL', 'PERSONAL_DATA', 'RESTRICTED'] as const;
export type Sensitivity = (typeof SENSITIVITIES)[number];
export type RedactionReason = 'SENSITIVE_FIELD' | 'SECRET' | 'CREDENTIAL' | 'PERSONAL_DATA' | 'RESTRICTED' | 'TRUNCATED';
export interface RedactionMetadata { redacted: boolean; fields: string[]; reason?: RedactionReason; }
export interface ContextAllowlistRepositoryPath { path: string; tier: Exclude<ContextTier, 'TASK' | 'ASSUMPTION'>; required: boolean; }
export interface ContextAllowlistProvenance {
  protocol: typeof CONTEXT_ALLOWLIST_PROTOCOL;
  version: typeof CONTEXT_ALLOWLIST_VERSION;
  discovery_protocol: 'conxian-agent-discovery';
  trusted_discovery_anchor_protocol: typeof DISCOVERY_TRUST_ANCHOR_PROTOCOL;
  trusted_discovery_anchor_version: typeof DISCOVERY_TRUST_ANCHOR_VERSION;
  trusted_discovery_anchor_digest: Digest;
  manifest_path: string;
  manifest_version: string;
  registry_path: string;
  registry_version: string;
  repository_paths: ContextAllowlistRepositoryPath[];
  repository_paths_digest: Digest;
  discovery_digest: Digest;
}
export interface ContextAllowlist {
  repository_paths: ContextAllowlistRepositoryPath[];
  task_input_keys: string[];
  required_task_input_keys: string[];
  artifact_ids: string[];
  required_artifact_ids: string[];
  assumption_keys: string[];
  provenance: ContextAllowlistProvenance;
}
export interface ContextProvenanceOptions {
  allowlist: ContextAllowlist;
  discovery: DiscoveryResult;
  trusted_discovery_anchor: TrustedDiscoveryAnchor;
}
export interface ContextLimits { max_items: number; max_total_bytes: number; max_entry_bytes: number; max_depth: number; }
export interface ContextInput {
  context_id: string;
  key: string;
  source: ContextSource;
  value: unknown;
  classification: Classification;
  sensitivity: Sensitivity;
  captured_at: string;
  stale_after?: string;
  expires_at?: string;
  truncated?: boolean;
  original_digest?: Digest;
  links?: ProtocolLink[];
}
export interface ContextEntry {
  context_id: string;
  key: string;
  source: ContextSource;
  value: JsonValue;
  classification: Classification;
  sensitivity: Sensitivity;
  redaction: RedactionMetadata;
  captured_at: string;
  stale_after?: string;
  expires_at?: string;
  precedence: number;
  byte_length: number;
  depth: number;
  truncated: boolean;
  original_digest?: Digest;
  provenance_digest: Digest;
  stale: boolean;
  expired: boolean;
  links: ProtocolLink[];
}
export interface ContextConflict {
  conflict_id: string;
  key: string;
  selected_context_id: string;
  discarded_context_ids: string[];
  reason: 'lower-precedence' | 'stale' | 'expired' | 'newer-capture' | 'digest-tiebreak';
  links: ProtocolLink[];
}
export interface ContextSnapshot {
  schema: typeof SWARM_SCHEMAS.context;
  captured_at: string;
  evaluated_at: string;
  entries: ContextEntry[];
  required_keys: string[];
  missing_required: string[];
  stale_required: string[];
  expired_required: string[];
  conflicts: ContextConflict[];
  warnings: string[];
  limits: ContextLimits;
  allowlist_digest: Digest;
  integrity: DigestIntegrityMetadata;
}
export interface ContextPackageOptions extends ContextProvenanceOptions {
  limits: ContextLimits;
  captured_at: string;
  now?: string;
  graph?: TaskGraph;
  allow_stale?: boolean;
  allow_truncation?: boolean;
  required_keys?: string[];
}
export interface ContextResolution {
  valid: boolean;
  entries: ContextEntry[];
  missing_required: string[];
  stale_required: string[];
  expired_required: string[];
  warnings: string[];
}

export interface EvidenceReference { evidence_id: string; kind: string; locator: string; digest: Digest; summary: string; links: ProtocolLink[]; }
export interface ArtifactReference { artifact_id: string; locator: string; media_type: string; digest: Digest; classification: Classification; links: ProtocolLink[]; }
export interface TaskResult {
  schema: typeof SWARM_SCHEMAS.result;
  graph_id: string;
  task_id: string;
  attempt: number;
  result_id: string;
  agent_id: string;
  status: TaskResultStatus;
  payload: JsonValue;
  canonical_payload_digest: Digest;
  completed_at: string;
  error?: FailureDetail;
  evidence: EvidenceReference[];
  artifacts: ArtifactReference[];
  links: ProtocolLink[];
}

export interface EnvelopePayloadTask { kind: 'task'; graph_id: string; task: TaskNode; links: ProtocolLink[]; }
export interface EnvelopePayloadAck { kind: 'ack'; for_message_id: string; accepted: boolean; reason?: string; links: ProtocolLink[]; }
export interface EnvelopePayloadProgress {
  kind: 'progress';
  graph_id: string;
  task_id: string;
  state: LifecycleState;
  progress_bps: number;
  evidence: EvidenceReference[];
  links: ProtocolLink[];
}
export interface EnvelopePayloadResult { kind: 'result'; result: TaskResult; links: ProtocolLink[]; }
export interface EnvelopePayloadHandover { kind: 'handover'; handover: HandoverDocument; links: ProtocolLink[]; }
export interface EnvelopePayloadError { kind: 'error'; code: string; message: string; affected_id: string; links: ProtocolLink[]; }
export interface EnvelopePayloadCancel { kind: 'cancel'; target_id: string; reason: string; links: ProtocolLink[]; }
export type EnvelopePayload =
  | EnvelopePayloadTask | EnvelopePayloadAck | EnvelopePayloadProgress | EnvelopePayloadResult
  | EnvelopePayloadHandover | EnvelopePayloadError | EnvelopePayloadCancel;
export interface Envelope {
  protocol: typeof SWARM_PROTOCOL;
  schema: typeof SWARM_SCHEMAS.envelope;
  message_id: string;
  message_type: MessageType;
  sender: AgentIdentity;
  recipient: Recipient;
  correlation_id: string;
  causation_id?: string;
  idempotency_scope: string;
  idempotency_key: string;
  lifecycle: Lifecycle;
  payload: EnvelopePayload;
  context?: ContextSnapshot | ContextReference[];
  links: ProtocolLink[];
  integrity: IntegrityMetadata;
}
export type CreateEnvelopeInput = Omit<Envelope, 'protocol' | 'schema' | 'integrity'> & {
  integrity?: Pick<IntegrityMetadata, 'authentication'>;
};
export interface EnvelopeValidationOptions {
  now?: string;
  require_authentication?: boolean;
  graph?: TaskGraph;
  allowlist?: ContextAllowlist;
  discovery?: DiscoveryResult;
  trusted_discovery_anchor?: TrustedDiscoveryAnchor;
}
export interface ContextValidationOptions extends ContextProvenanceOptions {
  now?: string;
  reject_stale_required?: boolean;
  graph?: TaskGraph;
}
export interface CreateEnvelopeOptions {
  graph?: TaskGraph;
  allowlist?: ContextAllowlist;
  discovery?: DiscoveryResult;
  trusted_discovery_anchor?: TrustedDiscoveryAnchor;
}
export interface DuplicateEnvelopeEvidence { replay_key: string; payload_digest: Digest; message_ids: string[]; delivery_count: number; }
export interface EnvelopeReplayConflict { replay_key: string; message_ids: string[]; payload_digests: Digest[]; }
export interface EnvelopeDeduplication { unique: Envelope[]; duplicates: DuplicateEnvelopeEvidence[]; conflicts: EnvelopeReplayConflict[]; }
export interface DuplicateResultEvidence { result_key: string; result_fingerprint: Digest; payload_digest: Digest; result_ids: string[]; delivery_count: number; }
export interface ResultConflict {
  conflict_id: string;
  result_key: string;
  graph_id: string;
  task_id: string;
  attempt: number;
  payload_digests: Digest[];
  result_fingerprints: Digest[];
  results: TaskResult[];
  links: ProtocolLink[];
}
export interface ResultDeduplication { unique: TaskResult[]; duplicates: DuplicateResultEvidence[]; conflicts: ResultConflict[]; }
export interface TaskAggregation {
  task_id: string;
  required: boolean;
  status: TaskResultStatus | 'PENDING' | 'CONFLICT';
  selected_result_id?: string;
  result_ids: string[];
  unresolved_reason?: string;
  dependency_impact: string[];
}
export interface AggregationResult {
  schema: 'aggregation.v1';
  graph_id: string;
  status: AggregateStatus;
  outcome: 'success' | 'partial' | 'failed' | 'blocked' | 'conflict' | 'cancelled';
  success: boolean;
  task_order: string[];
  tasks: TaskAggregation[];
  selected_results: TaskResult[];
  evidence: TaskResult[];
  duplicate_evidence: DuplicateResultEvidence[];
  conflicts: ResultConflict[];
  unresolved_task_ids: string[];
  failure_reasons: string[];
  dependency_impact: string[];
  cancellation_reason?: string;
}

export interface HandoverTaskReference {
  task_id: string;
  state: 'PROPOSED' | 'ACCEPTED' | 'STARTED' | 'COMPLETED' | 'BLOCKED';
  attempt?: number;
  reason?: string;
  links: ProtocolLink[];
}
export interface HandoverDecision { decision_id: string; sequence: number; key: string; value: JsonValue; rationale: string; links: ProtocolLink[]; }
export interface HandoverRisk {
  risk_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED';
  description: string;
  links: ProtocolLink[];
}
export interface ResumeInstruction {
  instruction_id: string;
  sequence: number;
  task_id: string;
  action: 'RESUME' | 'RETRY' | 'UNBLOCK' | 'VERIFY' | 'WAIT';
  depends_on: string[];
  acceptance: string;
  links: ProtocolLink[];
}
export interface HandoverConflict {
  conflict_id: string;
  object_id: string;
  payload_digests: Digest[];
  resolution_required: boolean;
  links: ProtocolLink[];
}
export interface HandoverDocument {
  schema: typeof SWARM_SCHEMAS.handover;
  handover_id: string;
  correlation_id: string;
  graph_id: string;
  graph_digest: Digest;
  source_agent?: AgentIdentity;
  target_agent?: AgentIdentity;
  captured_at: string;
  expires_at: string;
  lifecycle_state: LifecycleState;
  completed_tasks: HandoverTaskReference[];
  active_tasks: HandoverTaskReference[];
  blocked_tasks: HandoverTaskReference[];
  pending_tasks: HandoverTaskReference[];
  decisions: HandoverDecision[];
  artifacts: ArtifactReference[];
  unresolved_conflicts: HandoverConflict[];
  risks_and_blockers: HandoverRisk[];
  resume_instructions: ResumeInstruction[];
  context_snapshot: ContextSnapshot;
  links: ProtocolLink[];
  integrity: DigestIntegrityMetadata;
}
export type CreateHandoverInput = Omit<HandoverDocument, 'schema' | 'graph_digest' | 'integrity'>;
export interface HandoverAssessment {
  valid: boolean;
  resumable: boolean;
  blocked_task_ids: string[];
  pending_task_ids: string[];
  stale_context_ids: string[];
  missing_required_context: string[];
  expired_required_context: string[];
  unresolved_conflict_ids: string[];
}

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTEXT_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const CAPABILITY_PATTERN = /^[a-z0-9]+(?:[._/-][a-z0-9]+)*$/;
const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const RFC3339_PATTERN = /^(?!0000-)(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const CANONICAL_TIMESTAMP_PATTERN = /^(?!0000-)(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)\.\d{3}Z$/;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SENSITIVE_KEY_PATTERN = /(?:secret|token|password|credential|private.?key|api.?key|authorization|cookie)/i;
const MAX_INTEGER = 2_147_483_647;

function isPlainRecord(value: unknown): value is JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function fail(code: CoordinationErrorCode, message: string, path?: string): never {
  throw new CoordinationError(code, `${path === undefined ? '' : `${path}: `}${message}`, path);
}
function requireRecord(value: unknown, path: string): JsonRecord {
  if (!isPlainRecord(value)) fail('INVALID_CONTRACT', 'must be a plain object', path);
  return value;
}
function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail('INVALID_CONTRACT', 'must be an array', path);
  return value;
}
function requireString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    fail('INVALID_CONTRACT', allowEmpty ? 'must be a string' : 'must be a non-empty string', path);
  }
  if (/\p{Cc}/u.test(value)) fail('INVALID_CONTRACT', 'must not contain control characters', path);
  return value;
}
function requireTextContent(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) fail('INVALID_CONTRACT', 'must be a non-empty text string', path);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) fail('INVALID_CONTRACT', 'must not contain disallowed control characters', path);
  return value;
}
function requireBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail('INVALID_CONTRACT', 'must be a boolean', path);
  return value;
}
function requireInteger(value: unknown, path: string, minimum = 0, maximum = MAX_INTEGER): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    fail('INVALID_CONTRACT', `must be an integer between ${minimum} and ${maximum}`, path);
  }
  return value;
}
function assertKeys(record: JsonRecord, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) if (!allowedSet.has(key)) fail('UNKNOWN_FIELD', `unsupported field '${key}'`, path);
}
function requireKeys(record: JsonRecord, required: readonly string[], path: string): void {
  for (const key of required) if (!Object.prototype.hasOwnProperty.call(record, key)) fail('INVALID_CONTRACT', `missing required field '${key}'`, path);
}
function setOwnProperty(record: JsonRecord, key: string, value: unknown): void {
  Object.defineProperty(record, key, { configurable: true, enumerable: true, writable: true, value });
}
function compareStrings(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function sortedStrings(values: readonly string[]): string[] { return [...values].sort(compareStrings); }
function assertUnique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) fail('INVALID_CONTRACT', 'contains duplicate values', path);
}
function normalizeIdentifier(value: unknown, path: string): string {
  const identifier = requireString(value, path);
  if (!IDENTIFIER_PATTERN.test(identifier)) fail('INVALID_ID', 'must match the stable identifier format', path);
  return identifier;
}
function normalizeContextKey(value: unknown, path: string): string {
  const key = requireString(value, path);
  if (!CONTEXT_KEY_PATTERN.test(key)) fail('INVALID_ID', 'must match the stable context-key format', path);
  return key;
}
function normalizeCapabilityId(value: unknown, path: string): string {
  const capability = requireString(value, path).trim().toLowerCase();
  if (!CAPABILITY_PATTERN.test(capability)) fail('CAPABILITY_MISMATCH', 'must be a normalized lowercase capability identifier', path);
  return capability;
}
function normalizeTimestamp(value: unknown, path: string): string {
  const timestamp = requireString(value, path);
  const match = RFC3339_PATTERN.exec(timestamp);
  if (match === null) fail('INVALID_TIMESTAMP', 'must be a valid RFC 3339 date-time with at most millisecond precision', path);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0) fail('INVALID_TIMESTAMP', 'year zero is not supported', path);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  if (day > daysInMonth) fail('INVALID_TIMESTAMP', 'contains an impossible calendar date', path);
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) fail('INVALID_TIMESTAMP', 'must be a valid RFC 3339 date-time', path);
  const canonical = new Date(parsed).toISOString();
  if (!CANONICAL_TIMESTAMP_PATTERN.test(canonical)) fail('INVALID_TIMESTAMP', 'timezone conversion must remain within the supported four-digit year range', path);
  return canonical;
}
function normalizeDigest(value: unknown, path: string): Digest {
  const digest = requireString(value, path);
  if (!DIGEST_PATTERN.test(digest)) fail('INVALID_DIGEST', 'must be a lowercase sha256 digest', path);
  return digest as Digest;
}
function normalizeLocator(value: unknown, path: string): string {
  const locator = requireString(value, path);
  if (locator.includes('\0') || /\p{Cc}/u.test(locator)) fail('INVALID_LINK', 'must not contain control characters', path);
  return locator;
}
function toJsonValue(value: unknown, path = 'value'): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('INVALID_CONTRACT', 'numbers must be finite', path);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => toJsonValue(entry, `${path}[${index}]`));
  if (isPlainRecord(value)) {
    const output: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value)) setOwnProperty(output, key, toJsonValue(value[key], `${path}.${key}`));
    return output;
  }
  fail('INVALID_CONTRACT', 'must be JSON-compatible data', path);
}

function canonicalize(value: unknown, path = 'value'): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('INVALID_CONTRACT', 'numbers must be finite', path);
    return Object.is(value, -0) ? '0' : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry, index) => canonicalize(entry, `${path}[${index}]`)).join(',')}]`;
  if (isPlainRecord(value)) {
    const keys = Object.keys(value).sort(compareStrings);
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key], `${path}.${key}`)}`).join(',')}}`;
  }
  fail('INVALID_CONTRACT', 'must be JSON-compatible data', path);
}

/** Stable UTF-8 JSON with lexicographically sorted object keys. */
export function canonicalJson(value: unknown): string { return canonicalize(value); }

export function digestFor(domain: string, value: unknown): Digest {
  const normalizedDomain = requireString(domain, 'domain');
  return `sha256:${createHash('sha256').update(`${normalizedDomain}\u0000${canonicalJson(value)}`, 'utf8').digest('hex')}` as Digest;
}
export function payloadDigest(value: unknown): Digest { return digestFor('conxian.swarm.payload.v1', value); }

class StrictJsonParser {
  private index = 0;
  public constructor(private readonly source: string) {}
  public parse(): JsonValue {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.source.length) fail('INVALID_CONTRACT', 'contains trailing JSON data', 'json');
    return value;
  }
  private parseValue(): JsonValue {
    this.skipWhitespace();
    const character = this.source[this.index];
    if (character === '{') return this.parseObject();
    if (character === '[') return this.parseArray();
    if (character === '"') return this.parseString();
    if (character === 't' && this.consumeLiteral('true')) return true;
    if (character === 'f' && this.consumeLiteral('false')) return false;
    if (character === 'n' && this.consumeLiteral('null')) return null;
    return this.parseNumber();
  }
  private parseObject(): JsonValue {
    this.expect('{');
    const output: { [key: string]: JsonValue } = {};
    const keys = new Set<string>();
    this.skipWhitespace();
    if (this.consume('}')) return output;
    while (true) {
      this.skipWhitespace();
      if (this.source[this.index] !== '"') fail('INVALID_CONTRACT', 'object keys must be JSON strings', 'json');
      const key = this.parseString();
      if (keys.has(key)) fail('INVALID_CONTRACT', `duplicate object key '${key}'`, 'json');
      keys.add(key);
      this.skipWhitespace();
      this.expect(':');
      setOwnProperty(output, key, this.parseValue());
      this.skipWhitespace();
      if (this.consume('}')) return output;
      this.expect(',');
    }
  }
  private parseArray(): JsonValue {
    this.expect('[');
    const output: JsonValue[] = [];
    this.skipWhitespace();
    if (this.consume(']')) return output;
    while (true) {
      output.push(this.parseValue());
      this.skipWhitespace();
      if (this.consume(']')) return output;
      this.expect(',');
    }
  }
  private parseString(): string {
    const start = this.index;
    this.expect('"');
    let escaped = false;
    while (this.index < this.source.length) {
      const character = this.source[this.index];
      this.index += 1;
      if (escaped) { escaped = false; continue; }
      if (character === '\\') escaped = true;
      else if (character === '"') {
        const token = this.source.slice(start, this.index);
        try {
          const parsed = JSON.parse(token) as unknown;
          if (typeof parsed !== 'string') fail('INVALID_CONTRACT', 'invalid JSON string', 'json');
          return parsed;
        } catch (error: unknown) {
          if (error instanceof CoordinationError) throw error;
          fail('INVALID_CONTRACT', 'invalid JSON string', 'json');
        }
      } else if (character < ' ') fail('INVALID_CONTRACT', 'control character in JSON string', 'json');
    }
    fail('INVALID_CONTRACT', 'unterminated JSON string', 'json');
  }
  private parseNumber(): number {
    const matcher = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    matcher.lastIndex = this.index;
    const match = matcher.exec(this.source);
    if (match === null) fail('INVALID_CONTRACT', 'invalid JSON value', 'json');
    this.index += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) fail('INVALID_CONTRACT', 'JSON number must be finite', 'json');
    return Object.is(value, -0) ? 0 : value;
  }
  private skipWhitespace(): void { while (this.index < this.source.length && /\s/.test(this.source[this.index] ?? '')) this.index += 1; }
  private consume(expected: string): boolean {
    if (this.source[this.index] === expected) { this.index += 1; return true; }
    return false;
  }
  private expect(expected: string): void { if (!this.consume(expected)) fail('INVALID_CONTRACT', `expected '${expected}'`, 'json'); }
  private consumeLiteral(literal: string): boolean {
    if (this.source.slice(this.index, this.index + literal.length) === literal) { this.index += literal.length; return true; }
    return false;
  }
}

/** Parses JSON while rejecting duplicate object keys before normalization. */
export function parseCanonicalJson(source: string): JsonValue {
  if (typeof source !== 'string') fail('INVALID_CONTRACT', 'must be a string', 'json');
  return new StrictJsonParser(source).parse();
}

function normalizeLinks(value: unknown, path: string): ProtocolLink[] {
  const links = requireArray(value, path).map((entry, index) => {
    const record = requireRecord(entry, `${path}[${index}]`);
    assertKeys(record, ['relation', 'target_id', 'locator', 'digest'], `${path}[${index}]`);
    requireKeys(record, ['relation', 'target_id', 'locator'], `${path}[${index}]`);
    const link: ProtocolLink = {
      relation: requireString(record.relation, `${path}[${index}].relation`),
      target_id: normalizeIdentifier(record.target_id, `${path}[${index}].target_id`),
      locator: normalizeLocator(record.locator, `${path}[${index}].locator`),
    };
    if (record.digest !== undefined) link.digest = normalizeDigest(record.digest, `${path}[${index}].digest`);
    return link;
  });
  const keys = links.map((link) => `${link.relation}\u0000${link.target_id}\u0000${link.locator}\u0000${link.digest ?? ''}`);
  assertUnique(keys, path);
  return links.sort((left, right) => compareStrings(
    `${left.relation}\u0000${left.target_id}\u0000${left.locator}\u0000${left.digest ?? ''}`,
    `${right.relation}\u0000${right.target_id}\u0000${right.locator}\u0000${right.digest ?? ''}`,
  ));
}

function normalizeAgentIdentity(value: unknown, path: string): AgentIdentity {
  const record = requireRecord(value, path);
  assertKeys(record, ['agent_id', 'instance_id'], path);
  requireKeys(record, ['agent_id'], path);
  const identity: AgentIdentity = { agent_id: normalizeIdentifier(record.agent_id, `${path}.agent_id`) };
  if (record.instance_id !== undefined) identity.instance_id = normalizeIdentifier(record.instance_id, `${path}.instance_id`);
  return identity;
}

function normalizeRecipient(value: unknown, path: string): Recipient {
  const record = requireRecord(value, path);
  assertKeys(record, ['agent_id', 'instance_id', 'capability', 'version_range'], path);
  const hasAgent = record.agent_id !== undefined;
  const hasCapability = record.capability !== undefined;
  if (hasAgent === hasCapability) fail('INVALID_CONTRACT', 'must identify exactly one agent or capability selector', path);
  if (hasAgent) return normalizeAgentIdentity(record, path);
  const recipient: { capability: string; version_range?: string } = { capability: normalizeCapabilityId(record.capability, `${path}.capability`) };
  if (record.version_range !== undefined) recipient.version_range = normalizeVersionRange(record.version_range, `${path}.version_range`);
  return recipient;
}

function normalizeLifecycle(value: unknown, path: string): Lifecycle {
  const record = requireRecord(value, path);
  assertKeys(record, ['state', 'sequence', 'expires_at'], path);
  requireKeys(record, ['state', 'sequence', 'expires_at'], path);
  const state = requireString(record.state, `${path}.state`);
  if (!(LIFECYCLE_STATES as readonly string[]).includes(state)) fail('INVALID_TRANSITION', `unknown lifecycle state '${state}'`, `${path}.state`);
  return { state: state as LifecycleState, sequence: requireInteger(record.sequence, `${path}.sequence`), expires_at: normalizeTimestamp(record.expires_at, `${path}.expires_at`) };
}

function normalizeAuthentication(value: unknown, path: string): AuthenticationAssertion {
  const record = requireRecord(value, path);
  assertKeys(record, ['scheme', 'verified', 'subject', 'expires_at'], path);
  requireKeys(record, ['scheme', 'verified', 'subject'], path);
  const scheme = requireString(record.scheme, `${path}.scheme`);
  if (scheme !== 'transport' && scheme !== 'signature') fail('AUTHENTICATION_REQUIRED', 'scheme must be transport or signature', `${path}.scheme`);
  const authentication: AuthenticationAssertion = { scheme, verified: requireBoolean(record.verified, `${path}.verified`), subject: normalizeIdentifier(record.subject, `${path}.subject`) };
  if (record.expires_at !== undefined) authentication.expires_at = normalizeTimestamp(record.expires_at, `${path}.expires_at`);
  return authentication;
}
function normalizeIntegrity(value: unknown, path: string): IntegrityMetadata {
  const record = requireRecord(value, path);
  assertKeys(record, ['digest', 'authentication'], path);
  requireKeys(record, ['digest'], path);
  const integrity: IntegrityMetadata = { digest: normalizeDigest(record.digest, `${path}.digest`) };
  if (record.authentication !== undefined) integrity.authentication = normalizeAuthentication(record.authentication, `${path}.authentication`);
  return integrity;
}
function normalizeDigestIntegrity(value: unknown, path: string): DigestIntegrityMetadata {
  const record = requireRecord(value, path);
  assertKeys(record, ['digest'], path);
  requireKeys(record, ['digest'], path);
  return { digest: normalizeDigest(record.digest, `${path}.digest`) };
}
function compareTimestamp(left: string, right: string): number { return compareStrings(left, right); }
function assertNotExpired(timestamp: string, now: string | undefined, path: string): void {
  if (now !== undefined && compareTimestamp(timestamp, normalizeTimestamp(now, 'now')) <= 0) fail('EXPIRED', 'has expired', path);
}
function validateAuthentication(authentication: AuthenticationAssertion | undefined, sender: AgentIdentity, options: EnvelopeValidationOptions): void {
  if (options.require_authentication === true && (authentication === undefined || !authentication.verified || authentication.subject !== sender.agent_id)) {
    fail('AUTHENTICATION_REQUIRED', 'verified authentication for the sender is required', 'integrity.authentication');
  }
  if (authentication?.expires_at !== undefined && options.now !== undefined && compareTimestamp(authentication.expires_at, normalizeTimestamp(options.now, 'now')) <= 0) {
    fail('EXPIRED', 'authentication assertion has expired', 'integrity.authentication.expires_at');
  }
}
function validateFailureDetail(value: unknown, path: string): FailureDetail {
  const record = requireRecord(value, path);
  assertKeys(record, ['code', 'message', 'details'], path);
  requireKeys(record, ['code', 'message'], path);
  const detail: FailureDetail = { code: requireString(record.code, `${path}.code`), message: requireString(record.message, `${path}.message`) };
  if (record.details !== undefined) detail.details = requireString(record.details, `${path}.details`);
  return detail;
}

function normalizeCapabilityConstraint(value: unknown, path: string): CapabilityConstraint {
  const record = requireRecord(value, path);
  const output: CapabilityConstraint = {};
  for (const key of Object.keys(record).sort(compareStrings)) {
    const entry = record[key];
    if (entry === null || typeof entry === 'string' || typeof entry === 'boolean') setOwnProperty(output, key, entry);
    else if (typeof entry === 'number' && Number.isFinite(entry)) setOwnProperty(output, key, Object.is(entry, -0) ? 0 : entry);
    else fail('CAPABILITY_MISMATCH', 'constraints must contain scalar JSON values', `${path}.${key}`);
  }
  return output;
}
interface ParsedVersion { major: number; minor: number; patch: number; }
function parseVersion(value: unknown, path: string): ParsedVersion {
  const version = requireString(value, path);
  const match = SEMVER_PATTERN.exec(version);
  if (match === null) fail('CAPABILITY_MISMATCH', 'must use MAJOR.MINOR.PATCH form', path);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}
function compareVersion(left: ParsedVersion, right: ParsedVersion): number { return left.major - right.major || left.minor - right.minor || left.patch - right.patch; }
function versionRangeTokens(range: string, path: string): string[] {
  if (range === '*') return ['*'];
  if (range.length === 0 || range.includes('|') || range.includes(',')) fail('CAPABILITY_MISMATCH', 'version ranges must be a single unambiguous AND expression', path);
  const tokens = range.split(/\s+/).filter((token) => token.length > 0);
  for (const token of tokens) if (!/^(\^|~|>=|<=|>|<)?\d+\.\d+\.\d+$/.test(token)) fail('CAPABILITY_MISMATCH', `unsupported version range token '${token}'`, path);
  return tokens;
}
function normalizeVersionRange(value: unknown, path: string): string {
  const range = requireString(value, path).trim();
  versionRangeTokens(range, path);
  return range;
}
function versionSatisfies(version: ParsedVersion, range: string): boolean {
  for (const token of versionRangeTokens(range, 'version_range')) {
    if (token === '*') continue;
    const match = /^(\^|~|>=|<=|>|<)?(\d+)\.(\d+)\.(\d+)$/.exec(token);
    if (match === null) return false;
    const operator = match[1] ?? '=';
    const target: ParsedVersion = { major: Number(match[2]), minor: Number(match[3]), patch: Number(match[4]) };
    const comparison = compareVersion(version, target);
    if (operator === '=' && comparison !== 0) return false;
    if (operator === '>' && comparison <= 0) return false;
    if (operator === '>=' && comparison < 0) return false;
    if (operator === '<' && comparison >= 0) return false;
    if (operator === '<=' && comparison > 0) return false;
    if (operator === '^') {
      if (comparison < 0) return false;
      const upper = target.major > 0 ? { major: target.major + 1, minor: 0, patch: 0 } : target.minor > 0 ? { major: 0, minor: target.minor + 1, patch: 0 } : { major: 0, minor: 0, patch: target.patch + 1 };
      if (compareVersion(version, upper) >= 0) return false;
    }
    if (operator === '~' && (comparison < 0 || compareVersion(version, { major: target.major, minor: target.minor + 1, patch: 0 }) >= 0)) return false;
  }
  return true;
}
function normalizeCapabilityRequirement(value: unknown, path: string): CapabilityRequirement {
  const record = requireRecord(value, path);
  assertKeys(record, ['capability_id', 'version_range', 'constraints'], path);
  requireKeys(record, ['capability_id', 'version_range', 'constraints'], path);
  return {
    capability_id: normalizeCapabilityId(record.capability_id, `${path}.capability_id`),
    version_range: normalizeVersionRange(record.version_range, `${path}.version_range`),
    constraints: normalizeCapabilityConstraint(record.constraints, `${path}.constraints`),
  };
}
function normalizeRetryPolicy(value: unknown, path: string): RetryPolicy {
  const record = requireRecord(value, path);
  assertKeys(record, ['max_attempts', 'backoff_ms', 'timeout_ms'], path);
  requireKeys(record, ['max_attempts', 'backoff_ms', 'timeout_ms'], path);
  return {
    max_attempts: requireInteger(record.max_attempts, `${path}.max_attempts`, 1, 64),
    backoff_ms: requireInteger(record.backoff_ms, `${path}.backoff_ms`, 0, 86_400_000),
    timeout_ms: requireInteger(record.timeout_ms, `${path}.timeout_ms`, 1, 86_400_000),
  };
}
function normalizeTaskNode(value: unknown, path: string): TaskNode {
  const record = requireRecord(value, path);
  assertKeys(record, ['task_id', 'objective', 'schema', 'depends_on', 'required', 'capabilities', 'retry', 'links'], path);
  requireKeys(record, ['task_id', 'objective', 'schema', 'depends_on', 'required', 'capabilities', 'retry', 'links'], path);
  const dependsOn = requireArray(record.depends_on, `${path}.depends_on`).map((entry, index) => normalizeIdentifier(entry, `${path}.depends_on[${index}]`));
  assertUnique(dependsOn, `${path}.depends_on`);
  const capabilities = requireArray(record.capabilities, `${path}.capabilities`).map((entry, index) => normalizeCapabilityRequirement(entry, `${path}.capabilities[${index}]`));
  assertUnique(capabilities.map((entry) => `${entry.capability_id}\u0000${entry.version_range}`), `${path}.capabilities`);
  return {
    task_id: normalizeIdentifier(record.task_id, `${path}.task_id`),
    objective: requireString(record.objective, `${path}.objective`),
    schema: requireString(record.schema, `${path}.schema`),
    depends_on: sortedStrings(dependsOn),
    required: requireBoolean(record.required, `${path}.required`),
    capabilities: capabilities.sort((left, right) => compareStrings(`${left.capability_id}\u0000${left.version_range}`, `${right.capability_id}\u0000${right.version_range}`)),
    retry: normalizeRetryPolicy(record.retry, `${path}.retry`),
    links: normalizeLinks(record.links, `${path}.links`),
  };
}
function normalizeGraphLimits(value: unknown, path: string): GraphLimits {
  const record = requireRecord(value, path);
  assertKeys(record, ['max_nodes', 'max_depth', 'max_retry_budget', 'max_timeout_ms', 'max_context_bytes'], path);
  requireKeys(record, ['max_nodes', 'max_depth', 'max_retry_budget', 'max_timeout_ms', 'max_context_bytes'], path);
  return {
    max_nodes: requireInteger(record.max_nodes, `${path}.max_nodes`, 1, 10_000),
    max_depth: requireInteger(record.max_depth, `${path}.max_depth`, 1, 10_000),
    max_retry_budget: requireInteger(record.max_retry_budget, `${path}.max_retry_budget`, 0, 100_000),
    max_timeout_ms: requireInteger(record.max_timeout_ms, `${path}.max_timeout_ms`, 1, 86_400_000),
    max_context_bytes: requireInteger(record.max_context_bytes, `${path}.max_context_bytes`, 1, 100_000_000),
  };
}
function normalizeAggregationPolicy(value: unknown, path: string): AggregationPolicy {
  const record = requireRecord(value, path);
  assertKeys(record, ['optional_failure', 'required_failure', 'required_blocked', 'conflict', 'cancellation'], path);
  requireKeys(record, ['optional_failure', 'required_failure', 'required_blocked', 'conflict', 'cancellation'], path);
  const policy = {
    optional_failure: requireString(record.optional_failure, `${path}.optional_failure`),
    required_failure: requireString(record.required_failure, `${path}.required_failure`),
    required_blocked: requireString(record.required_blocked, `${path}.required_blocked`),
    conflict: requireString(record.conflict, `${path}.conflict`),
    cancellation: requireString(record.cancellation, `${path}.cancellation`),
  };
  if (policy.optional_failure !== 'PARTIAL' || policy.required_failure !== 'FAILED' || policy.required_blocked !== 'BLOCKED' || policy.conflict !== 'CONFLICT' || policy.cancellation !== 'CANCELLED') {
    fail('INVALID_GRAPH', 'aggregation policy must use the v1 deterministic statuses', path);
  }
  return policy as AggregationPolicy;
}
function graphTopologicalOrder(graph: TaskGraph): string[] {
  const indegree = new Map(graph.nodes.map((node) => [node.task_id, node.depends_on.length]));
  const dependents = new Map<string, string[]>();
  for (const node of graph.nodes) for (const dependency of node.depends_on) dependents.set(dependency, [...(dependents.get(dependency) ?? []), node.task_id]);
  const ready = graph.nodes.filter((node) => (indegree.get(node.task_id) ?? 0) === 0).map((node) => node.task_id).sort(compareStrings);
  const order: string[] = [];
  while (ready.length > 0) {
    const current = ready.shift();
    if (current === undefined) break;
    order.push(current);
    for (const dependent of (dependents.get(current) ?? []).sort(compareStrings)) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) { ready.push(dependent); ready.sort(compareStrings); }
    }
  }
  if (order.length !== graph.nodes.length) fail('INVALID_GRAPH', 'task graph contains a dependency cycle', 'nodes');
  return order;
}

/** Validates a task DAG and returns its normalized form. */
export function validateTaskGraph(value: unknown): TaskGraph {
  const record = requireRecord(value, 'graph');
  assertKeys(record, ['schema', 'graph_id', 'root_task_id', 'nodes', 'limits', 'aggregation_policy', 'links'], 'graph');
  requireKeys(record, ['schema', 'graph_id', 'root_task_id', 'nodes', 'limits', 'aggregation_policy', 'links'], 'graph');
  if (record.schema !== SWARM_SCHEMAS.taskGraph) fail('UNSUPPORTED_VERSION', `schema must be '${SWARM_SCHEMAS.taskGraph}'`, 'graph.schema');
  const limits = normalizeGraphLimits(record.limits, 'graph.limits');
  const nodes = requireArray(record.nodes, 'graph.nodes').map((entry, index) => normalizeTaskNode(entry, `graph.nodes[${index}]`));
  if (nodes.length === 0 || nodes.length > limits.max_nodes) fail('INVALID_GRAPH', `node count must be between 1 and ${limits.max_nodes}`, 'graph.nodes');
  assertUnique(nodes.map((node) => node.task_id), 'graph.nodes');
  const nodeIds = new Set(nodes.map((node) => node.task_id));
  for (const node of nodes) {
    for (const dependency of node.depends_on) {
      if (!nodeIds.has(dependency)) fail('INVALID_GRAPH', `dependency '${dependency}' does not exist`, `graph.nodes.${node.task_id}.depends_on`);
      if (dependency === node.task_id) fail('INVALID_GRAPH', 'a task cannot depend on itself', `graph.nodes.${node.task_id}.depends_on`);
    }
    if (node.retry.timeout_ms > limits.max_timeout_ms) fail('INVALID_GRAPH', 'task timeout exceeds graph limit', `graph.nodes.${node.task_id}.retry.timeout_ms`);
  }
  const graph: TaskGraph = {
    schema: SWARM_SCHEMAS.taskGraph,
    graph_id: normalizeIdentifier(record.graph_id, 'graph.graph_id'),
    root_task_id: normalizeIdentifier(record.root_task_id, 'graph.root_task_id'),
    nodes: nodes.sort((left, right) => compareStrings(left.task_id, right.task_id)),
    limits,
    aggregation_policy: normalizeAggregationPolicy(record.aggregation_policy, 'graph.aggregation_policy'),
    links: normalizeLinks(record.links, 'graph.links'),
  };
  if (!nodeIds.has(graph.root_task_id)) fail('INVALID_GRAPH', 'root_task_id must reference a task node', 'graph.root_task_id');
  if (graph.nodes.reduce((total, node) => total + node.retry.max_attempts - 1, 0) > graph.limits.max_retry_budget) fail('INVALID_GRAPH', 'task retry policies exceed graph retry budget', 'graph.limits.max_retry_budget');
  const order = graphTopologicalOrder(graph);
  const depth = new Map<string, number>();
  for (const taskId of order) {
    const node = graph.nodes.find((candidate) => candidate.task_id === taskId);
    if (node === undefined) fail('INVALID_GRAPH', 'topological order references unknown task');
    const taskDepth = node.depends_on.length === 0 ? 1 : Math.max(...node.depends_on.map((dependency) => depth.get(dependency) ?? 0)) + 1;
    depth.set(taskId, taskDepth);
    if (taskDepth > graph.limits.max_depth) fail('INVALID_GRAPH', 'task graph exceeds max_depth', 'graph.limits.max_depth');
  }
  return graph;
}
export function deterministicTopologicalOrder(graph: TaskGraph): string[] { return graphTopologicalOrder(validateTaskGraph(graph)); }
export function taskGraphDigest(value: TaskGraph): Digest {
  return digestFor('conxian.swarm.task-graph.v1', validateTaskGraph(value));
}

function normalizeCapabilityOffer(value: unknown, path: string): CapabilityOffer {
  const record = requireRecord(value, path);
  assertKeys(record, ['capability_id', 'version', 'constraints'], path);
  requireKeys(record, ['capability_id', 'version', 'constraints'], path);
  const parsed = parseVersion(record.version, `${path}.version`);
  return { capability_id: normalizeCapabilityId(record.capability_id, `${path}.capability_id`), version: `${parsed.major}.${parsed.minor}.${parsed.patch}`, constraints: normalizeCapabilityConstraint(record.constraints, `${path}.constraints`) };
}
function normalizeCandidate(value: unknown, path: string): CapabilityCandidate {
  const record = requireRecord(value, path);
  assertKeys(record, ['agent_id', 'instance_id', 'capabilities', 'declared_priority', 'links'], path);
  requireKeys(record, ['agent_id', 'capabilities', 'declared_priority', 'links'], path);
  const capabilities = requireArray(record.capabilities, `${path}.capabilities`).map((entry, index) => normalizeCapabilityOffer(entry, `${path}.capabilities[${index}]`));
  assertUnique(capabilities.map((entry) => entry.capability_id), `${path}.capabilities`);
  const candidate: CapabilityCandidate = {
    agent_id: normalizeIdentifier(record.agent_id, `${path}.agent_id`),
    capabilities: capabilities.sort((left, right) => compareStrings(left.capability_id, right.capability_id)),
    declared_priority: requireInteger(record.declared_priority, `${path}.declared_priority`, 0, 1_000_000),
    links: normalizeLinks(record.links, `${path}.links`),
  };
  if (record.instance_id !== undefined) candidate.instance_id = normalizeIdentifier(record.instance_id, `${path}.instance_id`);
  return candidate;
}
function constraintsMatch(required: CapabilityConstraint, offered: CapabilityConstraint): boolean {
  return Object.keys(required).every((key) =>
    Object.prototype.hasOwnProperty.call(offered, key) && canonicalJson(required[key]) === canonicalJson(offered[key]),
  );
}

/** Matches capabilities and returns evidence/candidates, never a scheduling decision. */
export function matchCapabilities(requirements: readonly CapabilityRequirement[], candidates: readonly CapabilityCandidate[]): CapabilityMatchResult {
  const normalizedRequirements = requirements.map((entry, index) => normalizeCapabilityRequirement(entry, `requirements[${index}]`));
  assertUnique(normalizedRequirements.map((entry) => `${entry.capability_id}\u0000${entry.version_range}`), 'requirements');
  const normalizedCandidates = candidates.map((entry, index) => normalizeCandidate(entry, `candidates[${index}]`));
  assertUnique(normalizedCandidates.map((entry) => `${entry.agent_id}\u0000${entry.instance_id ?? ''}`), 'candidates');
  const matches = normalizedCandidates.map((candidate): CapabilityMatch => {
    const matched: string[] = [];
    const unmet: CapabilityRequirement[] = [];
    let exactVersionMatchCount = 0;
    for (const requirement of normalizedRequirements) {
      const offer = candidate.capabilities.find((entry) => entry.capability_id === requirement.capability_id);
      if (offer === undefined || !versionSatisfies(parseVersion(offer.version, 'candidate.version'), requirement.version_range) || !constraintsMatch(requirement.constraints, offer.constraints)) unmet.push(requirement);
      else { matched.push(requirement.capability_id); if (requirement.version_range === offer.version) exactVersionMatchCount += 1; }
    }
    return {
      agent_id: candidate.agent_id,
      ...(candidate.instance_id === undefined ? {} : { instance_id: candidate.instance_id }),
      declared_priority: candidate.declared_priority,
      matched_capabilities: sortedStrings(matched),
      unmet_requirements: unmet.sort((left, right) => compareStrings(`${left.capability_id}\u0000${left.version_range}`, `${right.capability_id}\u0000${right.version_range}`)),
      unmet_required_count: unmet.length,
      exact_version_match_count: exactVersionMatchCount,
      links: candidate.links,
    };
  });
  matches.sort((left, right) => left.unmet_required_count - right.unmet_required_count || right.exact_version_match_count - left.exact_version_match_count || left.declared_priority - right.declared_priority || compareStrings(left.agent_id, right.agent_id) || compareStrings(left.instance_id ?? '', right.instance_id ?? ''));
  const selectedCandidates = matches.filter((candidate) => candidate.unmet_required_count === 0);
  return {
    requirements: normalizedRequirements.sort((left, right) => compareStrings(`${left.capability_id}\u0000${left.version_range}`, `${right.capability_id}\u0000${right.version_range}`)),
    candidates: matches,
    selected_candidates: selectedCandidates,
    blocked: selectedCandidates.length === 0 && normalizedRequirements.length > 0,
  };
}

function normalizeEvidence(value: unknown, path: string): EvidenceReference {
  const record = requireRecord(value, path);
  assertKeys(record, ['evidence_id', 'kind', 'locator', 'digest', 'summary', 'links'], path);
  requireKeys(record, ['evidence_id', 'kind', 'locator', 'digest', 'summary', 'links'], path);
  return {
    evidence_id: normalizeIdentifier(record.evidence_id, `${path}.evidence_id`),
    kind: requireString(record.kind, `${path}.kind`),
    locator: normalizeLocator(record.locator, `${path}.locator`),
    digest: normalizeDigest(record.digest, `${path}.digest`),
    summary: requireString(record.summary, `${path}.summary`, true),
    links: normalizeLinks(record.links, `${path}.links`),
  };
}
function normalizeArtifact(value: unknown, path: string): ArtifactReference {
  const record = requireRecord(value, path);
  assertKeys(record, ['artifact_id', 'locator', 'media_type', 'digest', 'classification', 'links'], path);
  requireKeys(record, ['artifact_id', 'locator', 'media_type', 'digest', 'classification', 'links'], path);
  const classification = requireString(record.classification, `${path}.classification`);
  if (!(CLASSIFICATIONS as readonly string[]).includes(classification)) fail('INVALID_CONTRACT', 'unknown artifact classification', `${path}.classification`);
  return {
    artifact_id: normalizeIdentifier(record.artifact_id, `${path}.artifact_id`),
    locator: normalizeLocator(record.locator, `${path}.locator`),
    media_type: requireString(record.media_type, `${path}.media_type`),
    digest: normalizeDigest(record.digest, `${path}.digest`),
    classification: classification as Classification,
    links: normalizeLinks(record.links, `${path}.links`),
  };
}

/** Validates a result and verifies its declared payload digest. */
export function validateTaskResult(value: unknown): TaskResult {
  const record = requireRecord(value, 'result');
  assertKeys(record, ['schema', 'graph_id', 'task_id', 'attempt', 'result_id', 'agent_id', 'status', 'payload', 'canonical_payload_digest', 'completed_at', 'error', 'evidence', 'artifacts', 'links'], 'result');
  requireKeys(record, ['schema', 'graph_id', 'task_id', 'attempt', 'result_id', 'agent_id', 'status', 'payload', 'canonical_payload_digest', 'completed_at', 'evidence', 'artifacts', 'links'], 'result');
  if (record.schema !== SWARM_SCHEMAS.result) fail('UNSUPPORTED_VERSION', `schema must be '${SWARM_SCHEMAS.result}'`, 'result.schema');
  const status = requireString(record.status, 'result.status');
  if (!(RESULT_STATUSES as readonly string[]).includes(status)) fail('INVALID_RESULT', `unknown result status '${status}'`, 'result.status');
  const payload = toJsonValue(record.payload, 'result.payload');
  const canonicalPayloadDigest = normalizeDigest(record.canonical_payload_digest, 'result.canonical_payload_digest');
  if (payloadDigest(payload) !== canonicalPayloadDigest) fail('INVALID_DIGEST', 'canonical_payload_digest does not match payload', 'result.canonical_payload_digest');
  const result: TaskResult = {
    schema: SWARM_SCHEMAS.result,
    graph_id: normalizeIdentifier(record.graph_id, 'result.graph_id'),
    task_id: normalizeIdentifier(record.task_id, 'result.task_id'),
    attempt: requireInteger(record.attempt, 'result.attempt', 1, 64),
    result_id: normalizeIdentifier(record.result_id, 'result.result_id'),
    agent_id: normalizeIdentifier(record.agent_id, 'result.agent_id'),
    status: status as TaskResultStatus,
    payload,
    canonical_payload_digest: canonicalPayloadDigest,
    completed_at: normalizeTimestamp(record.completed_at, 'result.completed_at'),
    evidence: requireArray(record.evidence, 'result.evidence').map((entry, index) => normalizeEvidence(entry, `result.evidence[${index}]`)),
    artifacts: requireArray(record.artifacts, 'result.artifacts').map((entry, index) => normalizeArtifact(entry, `result.artifacts[${index}]`)),
    links: normalizeLinks(record.links, 'result.links'),
  };
  if (record.error !== undefined) result.error = validateFailureDetail(record.error, 'result.error');
  if (result.status === 'SUCCEEDED' && result.error !== undefined) fail('INVALID_RESULT', 'successful results must not include an error', 'result.error');
  if (result.status !== 'SUCCEEDED' && result.error === undefined) fail('INVALID_RESULT', 'non-success results require an error', 'result.error');
  assertUnique(result.evidence.map((entry) => entry.evidence_id), 'result.evidence');
  assertUnique(result.artifacts.map((entry) => entry.artifact_id), 'result.artifacts');
  return result;
}

function normalizeContextReference(value: unknown, path: string): ContextReference {
  const record = requireRecord(value, path);
  assertKeys(record, ['context_id', 'digest', 'links'], path);
  requireKeys(record, ['context_id', 'digest', 'links'], path);
  return { context_id: normalizeIdentifier(record.context_id, `${path}.context_id`), digest: normalizeDigest(record.digest, `${path}.digest`), links: normalizeLinks(record.links, `${path}.links`) };
}
function normalizeEnvelopePayload(value: unknown, path: string, options: EnvelopeValidationOptions): EnvelopePayload {
  const record = requireRecord(value, path);
  const kind = requireString(record.kind, `${path}.kind`);
  switch (kind) {
    case 'task':
      assertKeys(record, ['kind', 'graph_id', 'task', 'links'], path); requireKeys(record, ['kind', 'graph_id', 'task', 'links'], path);
      return { kind, graph_id: normalizeIdentifier(record.graph_id, `${path}.graph_id`), task: normalizeTaskNode(record.task, `${path}.task`), links: normalizeLinks(record.links, `${path}.links`) };
    case 'ack': {
      assertKeys(record, ['kind', 'for_message_id', 'accepted', 'reason', 'links'], path); requireKeys(record, ['kind', 'for_message_id', 'accepted', 'links'], path);
      const payload: EnvelopePayloadAck = { kind, for_message_id: normalizeIdentifier(record.for_message_id, `${path}.for_message_id`), accepted: requireBoolean(record.accepted, `${path}.accepted`), links: normalizeLinks(record.links, `${path}.links`) };
      if (record.reason !== undefined) payload.reason = requireString(record.reason, `${path}.reason`);
      return payload;
    }
    case 'progress': {
      assertKeys(record, ['kind', 'graph_id', 'task_id', 'state', 'progress_bps', 'evidence', 'links'], path); requireKeys(record, ['kind', 'graph_id', 'task_id', 'state', 'progress_bps', 'evidence', 'links'], path);
      const state = requireString(record.state, `${path}.state`);
      if (!(LIFECYCLE_STATES as readonly string[]).includes(state)) fail('INVALID_TRANSITION', 'unknown progress lifecycle state', `${path}.state`);
      return { kind, graph_id: normalizeIdentifier(record.graph_id, `${path}.graph_id`), task_id: normalizeIdentifier(record.task_id, `${path}.task_id`), state: state as LifecycleState, progress_bps: requireInteger(record.progress_bps, `${path}.progress_bps`, 0, 10_000), evidence: requireArray(record.evidence, `${path}.evidence`).map((entry, index) => normalizeEvidence(entry, `${path}.evidence[${index}]`)), links: normalizeLinks(record.links, `${path}.links`) };
    }
    case 'result':
      assertKeys(record, ['kind', 'result', 'links'], path); requireKeys(record, ['kind', 'result', 'links'], path);
      return { kind, result: validateTaskResult(record.result), links: normalizeLinks(record.links, `${path}.links`) };
    case 'handover':
      assertKeys(record, ['kind', 'handover', 'links'], path); requireKeys(record, ['kind', 'handover', 'links'], path);
      if (options.graph === undefined) fail('INVALID_HANDOVER', 'handover payload validation requires the referenced task graph', `${path}.handover`);
      const provenance = normalizeContextProvenance(options, `${path}.handover.context_snapshot`, true);
      if (provenance === undefined) fail('CONTEXT_NOT_ALLOWED', 'handover payload validation requires #1162 context provenance', `${path}.handover.context_snapshot`);
      return { kind, handover: validateHandover(record.handover, { graph: options.graph, ...provenance, reject_stale_required: false }), links: normalizeLinks(record.links, `${path}.links`) };
    case 'error':
      assertKeys(record, ['kind', 'code', 'message', 'affected_id', 'links'], path); requireKeys(record, ['kind', 'code', 'message', 'affected_id', 'links'], path);
      return { kind, code: requireString(record.code, `${path}.code`), message: requireString(record.message, `${path}.message`), affected_id: normalizeIdentifier(record.affected_id, `${path}.affected_id`), links: normalizeLinks(record.links, `${path}.links`) };
    case 'cancel':
      assertKeys(record, ['kind', 'target_id', 'reason', 'links'], path); requireKeys(record, ['kind', 'target_id', 'reason', 'links'], path);
      return { kind, target_id: normalizeIdentifier(record.target_id, `${path}.target_id`), reason: requireString(record.reason, `${path}.reason`), links: normalizeLinks(record.links, `${path}.links`) };
    default:
      fail('INVALID_CONTRACT', `unknown payload kind '${kind}'`, `${path}.kind`);
  }
}
function envelopeDigestInput(envelope: Omit<Envelope, 'integrity'>, authentication: AuthenticationAssertion | undefined): JsonValue {
  return toJsonValue({ ...envelope, integrity: authentication === undefined ? {} : { authentication } }, 'envelope-digest');
}
function normalizeEnvelopeCore(value: unknown, options: EnvelopeValidationOptions): Omit<Envelope, 'integrity'> & { authentication?: AuthenticationAssertion } {
  const record = requireRecord(value, 'envelope');
  assertKeys(record, ['protocol', 'schema', 'message_id', 'message_type', 'sender', 'recipient', 'correlation_id', 'causation_id', 'idempotency_scope', 'idempotency_key', 'lifecycle', 'payload', 'context', 'links', 'integrity'], 'envelope');
  requireKeys(record, ['protocol', 'schema', 'message_id', 'message_type', 'sender', 'recipient', 'correlation_id', 'idempotency_scope', 'idempotency_key', 'lifecycle', 'payload', 'links'], 'envelope');
  if (record.protocol !== SWARM_PROTOCOL) fail('UNSUPPORTED_VERSION', `protocol must be '${SWARM_PROTOCOL}'`, 'envelope.protocol');
  if (record.schema !== SWARM_SCHEMAS.envelope) fail('UNSUPPORTED_VERSION', `schema must be '${SWARM_SCHEMAS.envelope}'`, 'envelope.schema');
  const messageType = requireString(record.message_type, 'envelope.message_type');
  if (!(MESSAGE_TYPES as readonly string[]).includes(messageType)) fail('INVALID_CONTRACT', `unknown message type '${messageType}'`, 'envelope.message_type');
  const core: Omit<Envelope, 'integrity'> & { authentication?: AuthenticationAssertion } = {
    protocol: SWARM_PROTOCOL,
    schema: SWARM_SCHEMAS.envelope,
    message_id: normalizeIdentifier(record.message_id, 'envelope.message_id'),
    message_type: messageType as MessageType,
    sender: normalizeAgentIdentity(record.sender, 'envelope.sender'),
    recipient: normalizeRecipient(record.recipient, 'envelope.recipient'),
    correlation_id: normalizeIdentifier(record.correlation_id, 'envelope.correlation_id'),
    idempotency_scope: normalizeIdentifier(record.idempotency_scope, 'envelope.idempotency_scope'),
    idempotency_key: normalizeIdentifier(record.idempotency_key, 'envelope.idempotency_key'),
    lifecycle: normalizeLifecycle(record.lifecycle, 'envelope.lifecycle'),
    payload: normalizeEnvelopePayload(record.payload, 'envelope.payload', options),
    links: normalizeLinks(record.links, 'envelope.links'),
  };
  if (record.causation_id !== undefined) {
    core.causation_id = normalizeIdentifier(record.causation_id, 'envelope.causation_id');
    if (core.causation_id === core.message_id) fail('INVALID_ID', 'causation_id must not equal message_id', 'envelope.causation_id');
  }
  if (record.context !== undefined) {
    if (Array.isArray(record.context)) core.context = record.context.map((entry, index) => normalizeContextReference(entry, `envelope.context[${index}]`));
    else {
      const provenance = normalizeContextProvenance(options, 'envelope.context', true);
      if (provenance === undefined) fail('CONTEXT_NOT_ALLOWED', 'embedded envelope context requires #1162 context provenance', 'envelope.context');
      core.context = validateContextSnapshot(record.context, { reject_stale_required: false, graph: options.graph, ...provenance });
    }
  }
  if (core.payload.kind !== core.message_type) fail('INVALID_CONTRACT', 'message_type must match payload.kind', 'envelope.message_type');
  return core;
}

/** Builds an envelope and calculates its integrity digest. */
export function createEnvelope(input: CreateEnvelopeInput, options: CreateEnvelopeOptions = {}): Envelope {
  const core = normalizeEnvelopeCore({ ...input, protocol: SWARM_PROTOCOL, schema: SWARM_SCHEMAS.envelope }, options);
  const authentication = input.integrity?.authentication === undefined
    ? undefined
    : normalizeAuthentication(input.integrity.authentication, 'envelope.integrity.authentication');
  const digest = digestFor('conxian.swarm.envelope.v1', envelopeDigestInput(core, authentication));
  return validateEnvelope({ ...core, integrity: { digest, ...(authentication === undefined ? {} : { authentication }) } }, options);
}
/** Validates envelope identity, linkage, expiry, authentication, payload, and digest. */
export function validateEnvelope(value: unknown, options: EnvelopeValidationOptions = {}): Envelope {
  const core = normalizeEnvelopeCore(value, options);
  const record = requireRecord(value, 'envelope');
  const integrity = normalizeIntegrity(record.integrity, 'envelope.integrity');
  const normalized: Envelope = { ...core, integrity };
  assertNotExpired(normalized.lifecycle.expires_at, options.now, 'envelope.lifecycle.expires_at');
  validateAuthentication(integrity.authentication, normalized.sender, options);
  const expectedDigest = digestFor('conxian.swarm.envelope.v1', envelopeDigestInput(core, integrity.authentication));
  if (expectedDigest !== integrity.digest) fail('INVALID_DIGEST', 'integrity digest does not match the canonical envelope', 'envelope.integrity.digest');
  return normalized;
}
/** Validates lifecycle transitions; terminal states cannot be reopened. */
export function validateLifecycleTransition(from: LifecycleState, to: LifecycleState, fromSequence: number, toSequence: number): void {
  const transitions: Readonly<Record<LifecycleState, readonly LifecycleState[]>> = {
    PROPOSED: ['ACCEPTED', 'REJECTED', 'EXPIRED'], ACCEPTED: ['STARTED', 'CANCELLED', 'EXPIRED'], STARTED: ['COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED', 'EXPIRED'], BLOCKED: ['STARTED'],
    COMPLETED: [], FAILED: [], CANCELLED: [], REJECTED: [], EXPIRED: [],
  };
  try {
    requireInteger(fromSequence, 'fromSequence');
    requireInteger(toSequence, 'toSequence');
  } catch (error: unknown) {
    if (error instanceof CoordinationError) fail('INVALID_TRANSITION', error.message);
    throw error;
  }
  if (!(LIFECYCLE_STATES as readonly string[]).includes(from) || !(LIFECYCLE_STATES as readonly string[]).includes(to) || !transitions[from].includes(to) || toSequence !== fromSequence + 1) fail('INVALID_TRANSITION', `transition ${from} -> ${to} must advance sequence by exactly one`);
}

function envelopeReplayKey(envelope: Envelope): string { return `${envelope.idempotency_scope}\u0000${envelope.idempotency_key}`; }
/** Deduplicates replay-safe envelope deliveries without choosing a conflict winner. */
export function deduplicateEnvelopes(values: readonly Envelope[], options: EnvelopeValidationOptions = {}): EnvelopeDeduplication {
  const normalized = values.map((entry) => validateEnvelope(entry, options));
  const groups = new Map<string, Envelope[]>();
  for (const envelope of normalized) groups.set(envelopeReplayKey(envelope), [...(groups.get(envelopeReplayKey(envelope)) ?? []), envelope]);
  const unique: Envelope[] = [];
  const duplicates: DuplicateEnvelopeEvidence[] = [];
  const conflicts: EnvelopeReplayConflict[] = [];
  for (const [replayKey, group] of [...groups.entries()].sort(([left], [right]) => compareStrings(left, right))) {
    const byDigest = new Map<Digest, Envelope[]>();
    for (const envelope of group) {
      const digest = payloadDigest(envelope.payload);
      byDigest.set(digest, [...(byDigest.get(digest) ?? []), envelope]);
    }
    const digests = [...byDigest.keys()].sort(compareStrings) as Digest[];
    if (digests.length > 1) {
      conflicts.push({ replay_key: replayKey, message_ids: sortedStrings(group.map((entry) => entry.message_id)), payload_digests: digests });
      continue;
    }
    const digest = digests[0];
    const digestGroup = digest === undefined ? undefined : byDigest.get(digest);
    if (digest === undefined || digestGroup === undefined) continue;
    unique.push([...digestGroup].sort((left, right) => compareStrings(canonicalJson(left), canonicalJson(right)))[0]);
    if (digestGroup.length > 1) duplicates.push({ replay_key: replayKey, payload_digest: digest, message_ids: sortedStrings(digestGroup.map((entry) => entry.message_id)), delivery_count: digestGroup.length });
  }
  unique.sort((left, right) => compareStrings(envelopeReplayKey(left), envelopeReplayKey(right)) || compareStrings(left.message_id, right.message_id));
  return { unique, duplicates, conflicts };
}
function resultReplayKey(result: TaskResult): string { return `${result.graph_id}\u0000${result.task_id}\u0000${result.attempt}`; }
function resultSemanticFingerprint(result: TaskResult): Digest {
  const { result_id: _deliveryId, ...semanticResult } = result;
  return digestFor('conxian.swarm.result-semantic.v1', semanticResult);
}
/** Deduplicates transport deliveries while retaining semantic conflicts as evidence. */
export function deduplicateResults(values: readonly TaskResult[]): ResultDeduplication {
  const normalized = values.map((entry) => validateTaskResult(entry));
  const groups = new Map<string, TaskResult[]>();
  for (const result of normalized) groups.set(resultReplayKey(result), [...(groups.get(resultReplayKey(result)) ?? []), result]);
  const unique: TaskResult[] = [];
  const duplicates: DuplicateResultEvidence[] = [];
  const conflicts: ResultConflict[] = [];
  for (const [resultKey, group] of [...groups.entries()].sort(([left], [right]) => compareStrings(left, right))) {
    const byFingerprint = new Map<Digest, TaskResult[]>();
    for (const result of group) {
      const fingerprint = resultSemanticFingerprint(result);
      byFingerprint.set(fingerprint, [...(byFingerprint.get(fingerprint) ?? []), result]);
    }
    const fingerprints = [...byFingerprint.keys()].sort(compareStrings) as Digest[];
    const representatives: TaskResult[] = [];
    for (const fingerprint of fingerprints) {
      const fingerprintGroup = byFingerprint.get(fingerprint);
      if (fingerprintGroup === undefined) continue;
      const representative = [...fingerprintGroup].sort((left, right) => compareStrings(canonicalJson(left), canonicalJson(right)))[0];
      if (representative === undefined) continue;
      representatives.push(representative);
      unique.push(representative);
      if (fingerprintGroup.length > 1) {
        duplicates.push({
          result_key: resultKey,
          result_fingerprint: fingerprint,
          payload_digest: representative.canonical_payload_digest,
          result_ids: sortedStrings(fingerprintGroup.map((entry) => entry.result_id)),
          delivery_count: fingerprintGroup.length,
        });
      }
    }
    if (fingerprints.length > 1) {
      const first = group[0];
      if (first !== undefined) conflicts.push({
        conflict_id: digestFor('conxian.swarm.result-conflict.v1', { result_key: resultKey, result_fingerprints: fingerprints }),
        result_key: resultKey,
        graph_id: first.graph_id,
        task_id: first.task_id,
        attempt: first.attempt,
        payload_digests: sortedStrings(representatives.map((result) => result.canonical_payload_digest)) as Digest[],
        result_fingerprints: fingerprints,
        results: representatives.sort((left, right) => compareStrings(resultSemanticFingerprint(left), resultSemanticFingerprint(right))),
        links: [],
      });
    }
  }
  unique.sort((left, right) => compareStrings(resultReplayKey(left), resultReplayKey(right)) || compareStrings(resultSemanticFingerprint(left), resultSemanticFingerprint(right)));
  return { unique, duplicates, conflicts };
}

function normalizeStatus(value: unknown, path: string): LifecycleState {
  const status = requireString(value, path);
  if (!(LIFECYCLE_STATES as readonly string[]).includes(status)) fail('INVALID_CONTRACT', 'unknown lifecycle state', path);
  return status as LifecycleState;
}
function normalizeContextTier(value: unknown, path: string): Exclude<ContextTier, 'TASK' | 'ASSUMPTION'> {
  const tier = requireString(value, path);
  if (tier === 'TASK' || tier === 'ASSUMPTION' || !(CONTEXT_TIERS as readonly string[]).includes(tier)) fail('INVALID_CONTEXT', 'repository/artifact source tier is invalid', path);
  return tier as Exclude<ContextTier, 'TASK' | 'ASSUMPTION'>;
}
function isKnownDiscoverySource(candidate: string): boolean {
  return candidate === '.agents/manifest.json'
    || candidate === '.agents/skills/registry.json'
    || /^\.agents\/skills\/[A-Za-z0-9][A-Za-z0-9._-]*\/SKILL\.md$/.test(candidate);
}
function validateRelativePath(value: unknown, path: string, allowlistedHiddenPaths: readonly string[] = []): string {
  const candidate = requireString(value, path);
  const segments = candidate.split('/');
  const hasUnsafeSegment = segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..');
  const hasUnlistedHiddenSegment = segments.some((segment) => segment.startsWith('.'))
    && !allowlistedHiddenPaths.includes(candidate)
    && !isKnownDiscoverySource(candidate);
  if (candidate.startsWith('/') || candidate.startsWith('\\') || /^[A-Za-z]:/.test(candidate) || candidate.includes('\\') || candidate.includes('\0') || hasUnsafeSegment || hasUnlistedHiddenSegment) {
    fail('CONTEXT_NOT_ALLOWED', 'must be a safe repository-relative POSIX path', path);
  }
  return candidate;
}
function normalizeContextSource(value: unknown, path: string, allowlistedHiddenPaths: readonly string[] = []): ContextSource {
  const record = requireRecord(value, path);
  const kind = requireString(record.kind, `${path}.kind`);
  switch (kind) {
    case 'TASK_INPUT':
      assertKeys(record, ['kind', 'key'], path); requireKeys(record, ['kind', 'key'], path);
      return { kind, key: normalizeContextKey(record.key, `${path}.key`) };
    case 'DECLARED_REPOSITORY':
      assertKeys(record, ['kind', 'path', 'tier'], path); requireKeys(record, ['kind', 'path', 'tier'], path);
      return { kind, path: validateRelativePath(record.path, `${path}.path`, allowlistedHiddenPaths), tier: normalizeContextTier(record.tier, `${path}.tier`) };
    case 'ARTIFACT':
      assertKeys(record, ['kind', 'artifact_id', 'tier'], path); requireKeys(record, ['kind', 'artifact_id', 'tier'], path);
      return { kind, artifact_id: normalizeIdentifier(record.artifact_id, `${path}.artifact_id`), tier: normalizeContextTier(record.tier, `${path}.tier`) };
    case 'ASSUMPTION':
      assertKeys(record, ['kind', 'key'], path); requireKeys(record, ['kind', 'key'], path);
      return { kind, key: normalizeContextKey(record.key, `${path}.key`) };
    default:
      fail('INVALID_CONTEXT', `unknown context source kind '${kind}'`, `${path}.kind`);
  }
}
interface DiscoveryProjection {
  manifest_path: string;
  manifest_version: string;
  manifest_content_digest: Digest;
  registry_path: string;
  registry_version: string;
  registry_content_digest: Digest;
  repository_paths: ContextAllowlistRepositoryPath[];
  discovery_digest: Digest;
  attestation: DiscoveryAttestation;
}
export interface ContextAllowlistOverrides {
  repository_paths?: readonly ContextAllowlistRepositoryPath[];
  task_input_keys?: readonly string[];
  required_task_input_keys?: readonly string[];
  artifact_ids?: readonly string[];
  required_artifact_ids?: readonly string[];
  assumption_keys?: readonly string[];
}
function normalizeDiscoveryVersion(value: unknown, path: string): string {
  const version = requireString(value, path);
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (match === null || Number(match[1]) !== 1) fail('CONTEXT_NOT_ALLOWED', 'discovery versions must use supported major 1 semver', path);
  return version;
}
function discoveryTierForPath(path: string): Exclude<ContextTier, 'TASK' | 'ASSUMPTION'> {
  if (path === 'GOVERNANCE.md') return 'GOVERNANCE';
  return path === '.agents/manifest.json' || path === '.agents/skills/registry.json' ? 'CANONICAL' : 'ARCHITECTURAL';
}
function normalizeDiscoveryContextEntry(value: unknown, path: string): { path: string; priority: number; description: string; content_digest: Digest } {
  const record = requireRecord(value, path);
  assertKeys(record, ['path', 'priority', 'description', 'content'], path);
  requireKeys(record, ['path', 'priority', 'description', 'content'], path);
  return {
    path: validateRelativePath(record.path, `${path}.path`),
    priority: requireInteger(record.priority, `${path}.priority`, 1),
    description: requireString(record.description, `${path}.description`),
    content_digest: digestFor('conxian-agent-discovery.context-content.v1', requireTextContent(record.content, `${path}.content`)),
  };
}
function normalizeDiscoverySkill(value: unknown, path: string): { metadata: JsonValue; path: string; content_digest: Digest } {
  const record = requireRecord(value, path);
  assertKeys(record, ['metadata', 'content'], path);
  requireKeys(record, ['metadata', 'content'], path);
  const metadata = requireRecord(record.metadata, `${path}.metadata`);
  assertKeys(metadata, ['id', 'name', 'description', 'path', 'status', 'default', 'activation', 'loadPolicy', 'contentFormat', 'capabilities', 'metadata'], `${path}.metadata`);
  requireKeys(metadata, ['id', 'name', 'description', 'path', 'status', 'default', 'activation', 'loadPolicy', 'contentFormat', 'capabilities', 'metadata'], `${path}.metadata`);
  const skillPath = validateRelativePath(metadata.path, `${path}.metadata.path`);
  if (!isKnownDiscoverySource(skillPath) || skillPath === '.agents/manifest.json' || skillPath === '.agents/skills/registry.json') fail('CONTEXT_NOT_ALLOWED', 'selected discovery skills must use a declared .agents skill path', `${path}.metadata.path`);
  const skillId = normalizeIdentifier(metadata.id, `${path}.metadata.id`);
  if (skillPath !== `.agents/skills/${skillId}/SKILL.md`) fail('CONTEXT_NOT_ALLOWED', 'selected discovery skill path must match its declared id', `${path}.metadata.path`);
  if (requireString(metadata.status, `${path}.metadata.status`) !== 'active') fail('CONTEXT_NOT_ALLOWED', 'selected discovery skills must be active', `${path}.metadata.status`);
  if (metadata.activation !== 'manual' || metadata.loadPolicy !== 'content-only') fail('CONTEXT_NOT_ALLOWED', 'selected discovery skills must remain inert', `${path}.metadata`);
  requireArray(metadata.capabilities, `${path}.metadata.capabilities`).forEach((entry, index) => requireString(entry, `${path}.metadata.capabilities[${index}]`));
  const metadataVersion = requireRecord(metadata.metadata, `${path}.metadata.metadata`);
  assertKeys(metadataVersion, ['version', 'owner'], `${path}.metadata.metadata`);
  normalizeDiscoveryVersion(metadataVersion.version, `${path}.metadata.metadata.version`);
  requireString(metadata.name, `${path}.metadata.name`);
  requireString(metadata.description, `${path}.metadata.description`);
  requireBoolean(metadata.default, `${path}.metadata.default`);
  requireString(metadata.contentFormat, `${path}.metadata.contentFormat`);
  requireString(metadataVersion.owner, `${path}.metadata.metadata.owner`);
  const content = requireTextContent(record.content, `${path}.content`);
  const normalizedMetadata = toJsonValue(metadata);
  return {
    metadata: normalizedMetadata,
    path: skillPath,
    content_digest: digestFor('conxian-agent-discovery.skill-content.v1', content),
  };
}
function normalizeDiscoveryTrustContextEntry(value: unknown, path: string): DiscoveryTrustContextEntry {
  const record = requireRecord(value, path);
  assertKeys(record, ['path', 'tier', 'required', 'priority', 'description', 'content_digest'], path);
  requireKeys(record, ['path', 'tier', 'required', 'priority', 'description', 'content_digest'], path);
  return {
    path: validateRelativePath(record.path, `${path}.path`),
    tier: normalizeContextTier(record.tier, `${path}.tier`),
    required: requireBoolean(record.required, `${path}.required`),
    priority: requireInteger(record.priority, `${path}.priority`, 1),
    description: requireString(record.description, `${path}.description`),
    content_digest: normalizeDigest(record.content_digest, `${path}.content_digest`),
  };
}
function normalizeDiscoveryTrustSkillEntry(value: unknown, path: string): DiscoveryTrustSkillEntry {
  const record = requireRecord(value, path);
  assertKeys(record, ['id', 'path', 'metadata_digest', 'content_digest'], path);
  requireKeys(record, ['id', 'path', 'metadata_digest', 'content_digest'], path);
  const id = normalizeIdentifier(record.id, `${path}.id`);
  const skillPath = validateRelativePath(record.path, `${path}.path`);
  if (skillPath !== `.agents/skills/${id}/SKILL.md`) fail('CONTEXT_NOT_ALLOWED', 'trust-anchor skill path must match its declared id', `${path}.path`);
  return {
    id,
    path: skillPath,
    metadata_digest: normalizeDigest(record.metadata_digest, `${path}.metadata_digest`),
    content_digest: normalizeDigest(record.content_digest, `${path}.content_digest`),
  };
}
function normalizeDiscoveryScope(value: unknown, path: string): DiscoveryTrustScope {
  const record = requireRecord(value, path);
  assertKeys(record, ['repository', 'manifest', 'registry', 'context', 'skills'], path);
  requireKeys(record, ['repository', 'manifest', 'registry', 'context', 'skills'], path);
  const repository = requireRecord(record.repository, `${path}.repository`);
  assertKeys(repository, ['root'], `${path}.repository`); requireKeys(repository, ['root'], `${path}.repository`);
  if (repository.root !== '.') fail('CONTEXT_NOT_ALLOWED', 'discovery repository root must be repository-relative', `${path}.repository.root`);
  const manifest = requireRecord(record.manifest, `${path}.manifest`);
  assertKeys(manifest, ['path', 'version', 'content_digest'], `${path}.manifest`); requireKeys(manifest, ['path', 'version', 'content_digest'], `${path}.manifest`);
  const manifestPath = validateRelativePath(manifest.path, `${path}.manifest.path`);
  if (manifestPath !== '.agents/manifest.json') fail('CONTEXT_NOT_ALLOWED', 'discovery manifest path is not canonical', `${path}.manifest.path`);
  const registry = requireRecord(record.registry, `${path}.registry`);
  assertKeys(registry, ['path', 'version', 'content_digest'], `${path}.registry`); requireKeys(registry, ['path', 'version', 'content_digest'], `${path}.registry`);
  const registryPath = validateRelativePath(registry.path, `${path}.registry.path`);
  if (registryPath !== '.agents/skills/registry.json') fail('CONTEXT_NOT_ALLOWED', 'discovery registry path is not canonical', `${path}.registry.path`);
  const context = requireRecord(record.context, `${path}.context`);
  assertKeys(context, ['required', 'optional'], `${path}.context`); requireKeys(context, ['required', 'optional'], `${path}.context`);
  const required = requireArray(context.required, `${path}.context.required`).map((entry, index) => normalizeDiscoveryTrustContextEntry(entry, `${path}.context.required[${index}]`));
  const optional = requireArray(context.optional, `${path}.context.optional`).map((entry, index) => normalizeDiscoveryTrustContextEntry(entry, `${path}.context.optional[${index}]`));
  assertUnique(required.map((entry) => entry.path), `${path}.context.required`);
  assertUnique(optional.map((entry) => entry.path), `${path}.context.optional`);
  if (new Set([...required, ...optional].map((entry) => entry.path)).size !== required.length + optional.length) fail('CONTEXT_NOT_ALLOWED', 'discovery context path appears in both required and optional sets', `${path}.context`);
  const skills = requireRecord(record.skills, `${path}.skills`);
  assertKeys(skills, ['selected'], `${path}.skills`); requireKeys(skills, ['selected'], `${path}.skills`);
  const selected = requireArray(skills.selected, `${path}.skills.selected`).map((entry, index) => normalizeDiscoveryTrustSkillEntry(entry, `${path}.skills.selected[${index}]`));
  assertUnique(selected.map((entry) => entry.path), `${path}.skills.selected`);
  return {
    repository: { root: '.' },
    manifest: { path: manifestPath, version: normalizeDiscoveryVersion(manifest.version, `${path}.manifest.version`), content_digest: normalizeDigest(manifest.content_digest, `${path}.manifest.content_digest`) },
    registry: { path: registryPath, version: normalizeDiscoveryVersion(registry.version, `${path}.registry.version`), content_digest: normalizeDigest(registry.content_digest, `${path}.registry.content_digest`) },
    context: {
      required: required.sort((left, right) => compareStrings(left.path, right.path)),
      optional: optional.sort((left, right) => compareStrings(left.path, right.path)),
    },
    skills: { selected: selected.sort((left, right) => compareStrings(left.path, right.path)) },
  };
}
function normalizeDiscoveryAttestation(value: unknown, path: string): DiscoveryAttestation {
  const record = requireRecord(value, path);
  assertKeys(record, ['protocol', 'version', 'repository', 'manifest', 'registry', 'context', 'skills', 'digest'], path);
  requireKeys(record, ['protocol', 'version', 'repository', 'manifest', 'registry', 'context', 'skills', 'digest'], path);
  if (record.protocol !== DISCOVERY_ATTESTATION_PROTOCOL || record.version !== DISCOVERY_ATTESTATION_VERSION) fail('INVALID_TRUST_ANCHOR', 'discovery attestation protocol/version is unsupported', path);
  const { protocol: _protocol, version: _version, digest: _digest, ...scopeRecord } = record;
  const scope = normalizeDiscoveryScope(scopeRecord, path);
  const digest = normalizeDigest(record.digest, `${path}.digest`);
  if (discoveryDigestFor('conxian-agent-discovery.attestation.v1', scope) !== digest) fail('INVALID_DIGEST', 'discovery attestation digest does not match its content', `${path}.digest`);
  return { protocol: DISCOVERY_ATTESTATION_PROTOCOL, version: DISCOVERY_ATTESTATION_VERSION, ...scope, digest };
}
function normalizeTrustedDiscoveryAnchor(value: unknown, path: string): TrustedDiscoveryAnchor {
  const record = requireRecord(value, path);
  assertKeys(record, ['protocol', 'version', 'repository', 'manifest', 'registry', 'context', 'skills', 'digest'], path);
  requireKeys(record, ['protocol', 'version', 'repository', 'manifest', 'registry', 'context', 'skills', 'digest'], path);
  if (record.protocol !== DISCOVERY_TRUST_ANCHOR_PROTOCOL || record.version !== DISCOVERY_TRUST_ANCHOR_VERSION) fail('INVALID_TRUST_ANCHOR', 'trusted discovery anchor protocol/version is unsupported', path);
  const { protocol: _protocol, version: _version, digest: _digest, ...scopeRecord } = record;
  const scope = normalizeDiscoveryScope(scopeRecord, path);
  const digest = normalizeDigest(record.digest, `${path}.digest`);
  if (discoveryDigestFor('conxian-agent-discovery.trust-anchor.v1', scope) !== digest) fail('INVALID_TRUST_ANCHOR', 'trusted discovery anchor digest does not match its content', `${path}.digest`);
  return { protocol: DISCOVERY_TRUST_ANCHOR_PROTOCOL, version: DISCOVERY_TRUST_ANCHOR_VERSION, ...scope, digest };
}
function compareDiscoveryScopes(left: unknown, right: unknown, path: string): void {
  if (canonicalJson(left) !== canonicalJson(right)) fail('CONTEXT_NOT_ALLOWED', 'discovery result does not match the trusted #1162 discovery anchor', path);
}
function assertDiscoverySubset(actual: readonly DiscoveryTrustContextEntry[] | readonly DiscoveryTrustSkillEntry[], allowed: readonly DiscoveryTrustContextEntry[] | readonly DiscoveryTrustSkillEntry[], path: string): void {
  for (const entry of actual) {
    const expected = allowed.find((candidate) => 'id' in entry && 'id' in candidate ? candidate.id === entry.id : candidate.path === entry.path);
    if (expected === undefined) fail('CONTEXT_NOT_ALLOWED', 'discovery result contains a path or skill not declared by the trusted #1162 anchor', path);
    compareDiscoveryScopes(entry, expected, path);
  }
}
function verifyDiscoveryAgainstTrustedAnchor(projection: DiscoveryProjection, anchor: TrustedDiscoveryAnchor): void {
  compareDiscoveryScopes(projection.attestation.manifest, anchor.manifest, 'discovery.manifest');
  compareDiscoveryScopes(projection.attestation.registry, anchor.registry, 'discovery.registry');
  compareDiscoveryScopes(projection.attestation.context.required, anchor.context.required, 'discovery.context.required');
  assertDiscoverySubset(projection.attestation.context.optional, anchor.context.optional, 'discovery.context.optional');
  assertDiscoverySubset(projection.attestation.skills.selected, anchor.skills.selected, 'discovery.skills.selected');
}
function normalizeDiscoveryResult(value: DiscoveryResult): DiscoveryProjection {
  const record = requireRecord(value as unknown, 'discovery');
  assertKeys(record, ['ok', 'protocol', 'repository', 'manifest', 'context', 'skills', 'attestation', 'warnings'], 'discovery');
  requireKeys(record, ['ok', 'protocol', 'repository', 'manifest', 'context', 'skills', 'attestation', 'warnings'], 'discovery');
  if (record.ok !== true || record.protocol !== 'conxian-agent-discovery') fail('CONTEXT_NOT_ALLOWED', 'allowlist provenance must come from a successful #1162 discovery result', 'discovery');
  const repository = requireRecord(record.repository, 'discovery.repository');
  assertKeys(repository, ['root'], 'discovery.repository'); requireKeys(repository, ['root'], 'discovery.repository');
  if (repository.root !== '.') fail('CONTEXT_NOT_ALLOWED', 'discovery repository root must be repository-relative', 'discovery.repository.root');
  const manifest = requireRecord(record.manifest, 'discovery.manifest');
  assertKeys(manifest, ['path', 'version'], 'discovery.manifest'); requireKeys(manifest, ['path', 'version'], 'discovery.manifest');
  const manifestPath = validateRelativePath(manifest.path, 'discovery.manifest.path');
  if (manifestPath !== '.agents/manifest.json') fail('CONTEXT_NOT_ALLOWED', 'discovery manifest path is not canonical', 'discovery.manifest.path');
  const manifestVersion = normalizeDiscoveryVersion(manifest.version, 'discovery.manifest.version');
  const context = requireRecord(record.context, 'discovery.context');
  assertKeys(context, ['required', 'optional'], 'discovery.context'); requireKeys(context, ['required', 'optional'], 'discovery.context');
  const required = requireArray(context.required, 'discovery.context.required').map((entry, index) => normalizeDiscoveryContextEntry(entry, `discovery.context.required[${index}]`));
  const optional = requireArray(context.optional, 'discovery.context.optional').map((entry, index) => normalizeDiscoveryContextEntry(entry, `discovery.context.optional[${index}]`));
  const skills = requireRecord(record.skills, 'discovery.skills');
  assertKeys(skills, ['registry', 'selected'], 'discovery.skills'); requireKeys(skills, ['registry', 'selected'], 'discovery.skills');
  const registry = requireRecord(skills.registry, 'discovery.skills.registry');
  assertKeys(registry, ['path', 'version'], 'discovery.skills.registry'); requireKeys(registry, ['path', 'version'], 'discovery.skills.registry');
  const registryPath = validateRelativePath(registry.path, 'discovery.skills.registry.path');
  if (registryPath !== '.agents/skills/registry.json') fail('CONTEXT_NOT_ALLOWED', 'discovery registry path is not canonical', 'discovery.skills.registry.path');
  const registryVersion = normalizeDiscoveryVersion(registry.version, 'discovery.skills.registry.version');
  const selected = requireArray(skills.selected, 'discovery.skills.selected').map((entry, index) => normalizeDiscoverySkill(entry, `discovery.skills.selected[${index}]`));
  assertUnique(selected.map((entry) => entry.path), 'discovery.skills.selected');
  const warnings = requireArray(record.warnings, 'discovery.warnings').map((entry, index) => requireString(entry, `discovery.warnings[${index}]`));
  const attestation = normalizeDiscoveryAttestation(record.attestation, 'discovery.attestation');
  const expectedAttestationContext = {
    required: required.map((entry) => ({ path: entry.path, tier: discoveryTierForPath(entry.path), required: true, priority: entry.priority, description: entry.description, content_digest: entry.content_digest })).sort((left, right) => compareStrings(left.path, right.path)),
    optional: optional.map((entry) => ({ path: entry.path, tier: discoveryTierForPath(entry.path), required: false, priority: entry.priority, description: entry.description, content_digest: entry.content_digest })).sort((left, right) => compareStrings(left.path, right.path)),
  };
  const expectedAttestationSkills = selected.map((entry) => {
    const metadata = requireRecord(entry.metadata, 'discovery.skills.selected.metadata');
    return {
      id: normalizeIdentifier(metadata.id, 'discovery.skills.selected.metadata.id'),
      path: entry.path,
      metadata_digest: digestFor('conxian-agent-discovery.skill-metadata.v1', entry.metadata),
      content_digest: entry.content_digest,
    };
  }).sort((left, right) => compareStrings(left.path, right.path));
  compareDiscoveryScopes(attestation.manifest, { path: manifestPath, version: manifestVersion, content_digest: attestation.manifest.content_digest }, 'discovery.attestation.manifest');
  compareDiscoveryScopes(attestation.registry, { path: registryPath, version: registryVersion, content_digest: attestation.registry.content_digest }, 'discovery.attestation.registry');
  compareDiscoveryScopes(attestation.context.required, expectedAttestationContext.required, 'discovery.attestation.context.required');
  compareDiscoveryScopes(attestation.context.optional, expectedAttestationContext.optional, 'discovery.attestation.context.optional');
  compareDiscoveryScopes(attestation.skills.selected, expectedAttestationSkills, 'discovery.attestation.skills.selected');
  const paths = new Map<string, ContextAllowlistRepositoryPath>();
  const addPath = (path: string, tier: Exclude<ContextTier, 'TASK' | 'ASSUMPTION'>, requiredPath: boolean): void => {
    const existing = paths.get(path);
    if (existing !== undefined && existing.tier !== tier) fail('CONTEXT_NOT_ALLOWED', 'discovery source has conflicting context tiers', `discovery.${path}`);
    paths.set(path, { path, tier, required: existing?.required === true || requiredPath });
  };
  addPath(manifestPath, 'CANONICAL', true);
  addPath(registryPath, 'CANONICAL', true);
  for (const entry of [...attestation.context.required, ...attestation.context.optional]) addPath(entry.path, entry.tier, entry.required);
  for (const skill of attestation.skills.selected) addPath(skill.path, 'ARCHITECTURAL', true);
  const repositoryPaths = [...paths.values()].sort((left, right) => compareStrings(left.path, right.path));
  return {
    manifest_path: manifestPath,
    manifest_version: manifestVersion,
    manifest_content_digest: attestation.manifest.content_digest,
    registry_path: registryPath,
    registry_version: registryVersion,
    registry_content_digest: attestation.registry.content_digest,
    repository_paths: repositoryPaths,
    discovery_digest: attestation.digest,
    attestation,
  };
}
function normalizeRepositoryPathEntries(value: unknown, path: string): ContextAllowlistRepositoryPath[] {
  const entries = requireArray(value, path).map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const item = requireRecord(entry, itemPath);
    assertKeys(item, ['path', 'tier', 'required'], itemPath); requireKeys(item, ['path', 'tier', 'required'], itemPath);
    return { path: validateRelativePath(item.path, `${itemPath}.path`), tier: normalizeContextTier(item.tier, `${itemPath}.tier`), required: requireBoolean(item.required, `${itemPath}.required`) };
  });
  assertUnique(entries.map((entry) => entry.path), path);
  return entries.sort((left, right) => compareStrings(left.path, right.path));
}
function normalizeAllowlist(value: unknown): ContextAllowlist {
  const record = requireRecord(value, 'allowlist');
  assertKeys(record, ['repository_paths', 'task_input_keys', 'required_task_input_keys', 'artifact_ids', 'required_artifact_ids', 'assumption_keys', 'provenance'], 'allowlist');
  requireKeys(record, ['repository_paths', 'task_input_keys', 'required_task_input_keys', 'artifact_ids', 'required_artifact_ids', 'assumption_keys', 'provenance'], 'allowlist');
  const repositoryPaths = normalizeRepositoryPathEntries(record.repository_paths, 'allowlist.repository_paths');
  const taskInputKeys = requireArray(record.task_input_keys, 'allowlist.task_input_keys').map((entry, index) => normalizeContextKey(entry, `allowlist.task_input_keys[${index}]`));
  const requiredTaskInputKeys = requireArray(record.required_task_input_keys, 'allowlist.required_task_input_keys').map((entry, index) => normalizeContextKey(entry, `allowlist.required_task_input_keys[${index}]`));
  const artifactIds = requireArray(record.artifact_ids, 'allowlist.artifact_ids').map((entry, index) => normalizeIdentifier(entry, `allowlist.artifact_ids[${index}]`));
  const requiredArtifactIds = requireArray(record.required_artifact_ids, 'allowlist.required_artifact_ids').map((entry, index) => normalizeIdentifier(entry, `allowlist.required_artifact_ids[${index}]`));
  const assumptionKeys = requireArray(record.assumption_keys, 'allowlist.assumption_keys').map((entry, index) => normalizeContextKey(entry, `allowlist.assumption_keys[${index}]`));
  assertUnique(taskInputKeys, 'allowlist.task_input_keys'); assertUnique(requiredTaskInputKeys, 'allowlist.required_task_input_keys');
  assertUnique(artifactIds, 'allowlist.artifact_ids'); assertUnique(requiredArtifactIds, 'allowlist.required_artifact_ids'); assertUnique(assumptionKeys, 'allowlist.assumption_keys');
  for (const key of requiredTaskInputKeys) if (!taskInputKeys.includes(key)) fail('CONTEXT_NOT_ALLOWED', 'required task input must be allowlisted', 'allowlist.required_task_input_keys');
  for (const artifactId of requiredArtifactIds) if (!artifactIds.includes(artifactId)) fail('CONTEXT_NOT_ALLOWED', 'required artifact must be allowlisted', 'allowlist.required_artifact_ids');
  const provenanceRecord = requireRecord(record.provenance, 'allowlist.provenance');
  assertKeys(provenanceRecord, ['protocol', 'version', 'discovery_protocol', 'trusted_discovery_anchor_protocol', 'trusted_discovery_anchor_version', 'trusted_discovery_anchor_digest', 'manifest_path', 'manifest_version', 'registry_path', 'registry_version', 'repository_paths', 'repository_paths_digest', 'discovery_digest'], 'allowlist.provenance');
  requireKeys(provenanceRecord, ['protocol', 'version', 'discovery_protocol', 'trusted_discovery_anchor_protocol', 'trusted_discovery_anchor_version', 'trusted_discovery_anchor_digest', 'manifest_path', 'manifest_version', 'registry_path', 'registry_version', 'repository_paths', 'repository_paths_digest', 'discovery_digest'], 'allowlist.provenance');
  if (provenanceRecord.protocol !== CONTEXT_ALLOWLIST_PROTOCOL || provenanceRecord.version !== CONTEXT_ALLOWLIST_VERSION || provenanceRecord.discovery_protocol !== 'conxian-agent-discovery') fail('CONTEXT_NOT_ALLOWED', 'allowlist provenance protocol/version is invalid', 'allowlist.provenance');
  if (provenanceRecord.trusted_discovery_anchor_protocol !== DISCOVERY_TRUST_ANCHOR_PROTOCOL || provenanceRecord.trusted_discovery_anchor_version !== DISCOVERY_TRUST_ANCHOR_VERSION) fail('INVALID_TRUST_ANCHOR', 'allowlist provenance trust-anchor protocol/version is invalid', 'allowlist.provenance');
  const manifestPath = validateRelativePath(provenanceRecord.manifest_path, 'allowlist.provenance.manifest_path');
  const registryPath = validateRelativePath(provenanceRecord.registry_path, 'allowlist.provenance.registry_path');
  if (manifestPath !== '.agents/manifest.json') fail('CONTEXT_NOT_ALLOWED', 'allowlist provenance must identify .agents/manifest.json', 'allowlist.provenance.manifest_path');
  if (registryPath !== '.agents/skills/registry.json') fail('CONTEXT_NOT_ALLOWED', 'allowlist provenance must identify .agents/skills/registry.json', 'allowlist.provenance.registry_path');
  const provenancePaths = normalizeRepositoryPathEntries(provenanceRecord.repository_paths, 'allowlist.provenance.repository_paths');
  if (canonicalJson(repositoryPaths) !== canonicalJson(provenancePaths)) fail('CONTEXT_NOT_ALLOWED', 'allowlist repository paths do not match provenance', 'allowlist.provenance.repository_paths');
  if (!repositoryPaths.some((entry) => entry.path === manifestPath) || !repositoryPaths.some((entry) => entry.path === registryPath)) fail('CONTEXT_NOT_ALLOWED', 'allowlist provenance paths must include manifest and registry', 'allowlist.repository_paths');
  const repositoryPathsDigest = normalizeDigest(provenanceRecord.repository_paths_digest, 'allowlist.provenance.repository_paths_digest');
  if (repositoryPathsDigest !== digestFor('conxian.swarm.context-allowlist-paths.v1', repositoryPaths)) fail('INVALID_DIGEST', 'allowlist repository path digest does not match provenance', 'allowlist.provenance.repository_paths_digest');
  const provenance: ContextAllowlistProvenance = {
    protocol: CONTEXT_ALLOWLIST_PROTOCOL,
    version: CONTEXT_ALLOWLIST_VERSION,
    discovery_protocol: 'conxian-agent-discovery',
    trusted_discovery_anchor_protocol: DISCOVERY_TRUST_ANCHOR_PROTOCOL,
    trusted_discovery_anchor_version: DISCOVERY_TRUST_ANCHOR_VERSION,
    trusted_discovery_anchor_digest: normalizeDigest(provenanceRecord.trusted_discovery_anchor_digest, 'allowlist.provenance.trusted_discovery_anchor_digest'),
    manifest_path: manifestPath,
    manifest_version: normalizeDiscoveryVersion(provenanceRecord.manifest_version, 'allowlist.provenance.manifest_version'),
    registry_path: registryPath,
    registry_version: normalizeDiscoveryVersion(provenanceRecord.registry_version, 'allowlist.provenance.registry_version'),
    repository_paths: provenancePaths,
    repository_paths_digest: repositoryPathsDigest,
    discovery_digest: normalizeDigest(provenanceRecord.discovery_digest, 'allowlist.provenance.discovery_digest'),
  };
  return {
    repository_paths: repositoryPaths,
    task_input_keys: sortedStrings(taskInputKeys), required_task_input_keys: sortedStrings(requiredTaskInputKeys),
    artifact_ids: sortedStrings(artifactIds), required_artifact_ids: sortedStrings(requiredArtifactIds), assumption_keys: sortedStrings(assumptionKeys),
    provenance,
  };
}
export interface ContextAllowlistDerivationOptions extends ContextAllowlistOverrides {
  trusted_discovery_anchor: TrustedDiscoveryAnchor;
}

export function deriveContextAllowlist(discovery: DiscoveryResult, options: ContextAllowlistDerivationOptions): ContextAllowlist {
  const trustedAnchor = normalizeTrustedDiscoveryAnchor(options.trusted_discovery_anchor, 'options.trusted_discovery_anchor');
  const projection = normalizeDiscoveryResult(discovery);
  verifyDiscoveryAgainstTrustedAnchor(projection, trustedAnchor);
  const overrides: ContextAllowlistOverrides = options;
  const projectedByPath = new Map(projection.repository_paths.map((entry) => [entry.path, entry]));
  const requestedRepositoryPaths = overrides.repository_paths === undefined
    ? projection.repository_paths
    : [...overrides.repository_paths].map((entry, index) => {
      const path = validateRelativePath(entry.path, `overrides.repository_paths[${index}].path`);
      const projected = projectedByPath.get(path);
      if (projected === undefined || projected.tier !== entry.tier) {
        fail('CONTEXT_NOT_ALLOWED', 'repository path permissions must match a #1162 discovery source', `overrides.repository_paths[${index}]`);
      }
      return { ...projected, required: entry.required };
    });
  const selectedPaths = new Map(requestedRepositoryPaths.map((entry) => [entry.path, entry]));
  for (const anchor of projection.repository_paths.filter((entry) => entry.path === '.agents/manifest.json' || entry.path === '.agents/skills/registry.json')) {
    if (!selectedPaths.has(anchor.path)) selectedPaths.set(anchor.path, anchor);
  }
  const repositoryPaths = [...selectedPaths.values()].sort((left, right) => compareStrings(left.path, right.path));
  const allowlist: ContextAllowlist = {
    repository_paths: repositoryPaths,
    task_input_keys: [...(overrides.task_input_keys ?? [])].map((entry, index) => normalizeContextKey(entry, `overrides.task_input_keys[${index}]`)),
    required_task_input_keys: [...(overrides.required_task_input_keys ?? [])].map((entry, index) => normalizeContextKey(entry, `overrides.required_task_input_keys[${index}]`)),
    artifact_ids: [...(overrides.artifact_ids ?? [])].map((entry, index) => normalizeIdentifier(entry, `overrides.artifact_ids[${index}]`)),
    required_artifact_ids: [...(overrides.required_artifact_ids ?? [])].map((entry, index) => normalizeIdentifier(entry, `overrides.required_artifact_ids[${index}]`)),
    assumption_keys: [...(overrides.assumption_keys ?? [])].map((entry, index) => normalizeContextKey(entry, `overrides.assumption_keys[${index}]`)),
    provenance: {
      protocol: CONTEXT_ALLOWLIST_PROTOCOL,
      version: CONTEXT_ALLOWLIST_VERSION,
      discovery_protocol: 'conxian-agent-discovery',
      trusted_discovery_anchor_protocol: trustedAnchor.protocol,
      trusted_discovery_anchor_version: trustedAnchor.version,
      trusted_discovery_anchor_digest: trustedAnchor.digest,
      manifest_path: projection.manifest_path,
      manifest_version: projection.manifest_version,
      registry_path: projection.registry_path,
      registry_version: projection.registry_version,
      repository_paths: repositoryPaths,
      repository_paths_digest: digestFor('conxian.swarm.context-allowlist-paths.v1', repositoryPaths),
      discovery_digest: projection.discovery_digest,
    },
  };
  return normalizeAllowlist(allowlist);
}
function validateAllowlistAgainstDiscovery(allowlist: ContextAllowlist, discovery: DiscoveryResult, trustedAnchor: TrustedDiscoveryAnchor): void {
  const expected = deriveContextAllowlist(discovery, {
    trusted_discovery_anchor: trustedAnchor,
    repository_paths: allowlist.repository_paths,
    task_input_keys: allowlist.task_input_keys,
    required_task_input_keys: allowlist.required_task_input_keys,
    artifact_ids: allowlist.artifact_ids,
    required_artifact_ids: allowlist.required_artifact_ids,
    assumption_keys: allowlist.assumption_keys,
  });
  if (canonicalJson(allowlist) !== canonicalJson(expected)) {
    fail('CONTEXT_NOT_ALLOWED', 'allowlist repository paths or provenance do not match the validated #1162 discovery result', 'allowlist.provenance');
  }
}
function normalizeContextProvenance(
  options: { allowlist?: ContextAllowlist; discovery?: DiscoveryResult; trusted_discovery_anchor?: TrustedDiscoveryAnchor } | undefined,
  path: string,
  required: boolean,
): ContextProvenanceOptions | undefined {
  const allowlist = options?.allowlist;
  const discovery = options?.discovery;
  const trustedAnchor = options?.trusted_discovery_anchor;
  if (allowlist === undefined && discovery === undefined && trustedAnchor === undefined) {
    if (required) fail('CONTEXT_NOT_ALLOWED', 'validated #1162 allowlist and discovery provenance are required', path);
    return undefined;
  }
  if (allowlist === undefined || discovery === undefined || trustedAnchor === undefined) {
    fail('CONTEXT_NOT_ALLOWED', 'trusted #1162 discovery anchor, discovery result, and allowlist must be supplied together', path);
  }
  const normalizedAnchor = normalizeTrustedDiscoveryAnchor(trustedAnchor, `${path}.trusted_discovery_anchor`);
  const normalizedAllowlist = normalizeAllowlist(allowlist);
  validateAllowlistAgainstDiscovery(normalizedAllowlist, discovery, normalizedAnchor);
  return { allowlist: normalizedAllowlist, discovery, trusted_discovery_anchor: normalizedAnchor };
}
function normalizeLimits(value: unknown, path: string): ContextLimits {
  const record = requireRecord(value, path);
  assertKeys(record, ['max_items', 'max_total_bytes', 'max_entry_bytes', 'max_depth'], path);
  requireKeys(record, ['max_items', 'max_total_bytes', 'max_entry_bytes', 'max_depth'], path);
  const limits = {
    max_items: requireInteger(record.max_items, `${path}.max_items`, 1, 10_000),
    max_total_bytes: requireInteger(record.max_total_bytes, `${path}.max_total_bytes`, 1, 100_000_000),
    max_entry_bytes: requireInteger(record.max_entry_bytes, `${path}.max_entry_bytes`, 1, 100_000_000),
    max_depth: requireInteger(record.max_depth, `${path}.max_depth`, 1, 64),
  };
  if (limits.max_entry_bytes > limits.max_total_bytes) fail('CONTEXT_LIMIT', 'max_entry_bytes must not exceed max_total_bytes', `${path}.max_entry_bytes`);
  return limits;
}
function effectiveContextLimits(limits: ContextLimits, graphValue: TaskGraph | undefined): ContextLimits {
  if (graphValue === undefined) return limits;
  const graph = validateTaskGraph(graphValue);
  return { ...limits, max_total_bytes: Math.min(limits.max_total_bytes, graph.limits.max_context_bytes) };
}
function normalizeClassification(value: unknown, path: string): Classification {
  const classification = requireString(value, path);
  if (!(CLASSIFICATIONS as readonly string[]).includes(classification)) fail('INVALID_CONTEXT', 'unknown classification', path);
  return classification as Classification;
}
function normalizeSensitivity(value: unknown, path: string): Sensitivity {
  const sensitivity = requireString(value, path);
  if (!(SENSITIVITIES as readonly string[]).includes(sensitivity)) fail('INVALID_CONTEXT', 'unknown sensitivity', path);
  return sensitivity as Sensitivity;
}
function redactionMarker(reason: RedactionReason): JsonValue { return { redacted: true, reason }; }
function redactionReasonForSensitivity(sensitivity: Sensitivity): RedactionReason | undefined {
  switch (sensitivity) {
    case 'NONE': return undefined;
    case 'SECRET': return 'SECRET';
    case 'CREDENTIAL': return 'CREDENTIAL';
    case 'PERSONAL_DATA': return 'PERSONAL_DATA';
    case 'RESTRICTED': return 'RESTRICTED';
  }
}
function isRedactionMarker(value: JsonValue, reason: RedactionReason): boolean {
  if (!isPlainRecord(value)) return false;
  const keys = Object.keys(value).sort(compareStrings);
  return keys.length === 2 && keys[0] === 'reason' && keys[1] === 'redacted' && value.redacted === true && value.reason === reason;
}
export interface RedactionResult { value: JsonValue; fields: string[]; }
/** Redacts sensitive object keys without consulting environment or process state. */
export function redactSensitiveFields(value: unknown): RedactionResult {
  const jsonValue = toJsonValue(value);
  const fields: string[] = [];
  function walk(current: JsonValue, path: string): JsonValue {
    if (Array.isArray(current)) return current.map((entry, index) => walk(entry, `${path}[${index}]`));
    if (!isPlainRecord(current)) return current;
    const output: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(current).sort(compareStrings)) {
      const fieldPath = path.length === 0 ? key : `${path}.${key}`;
      if (SENSITIVE_KEY_PATTERN.test(key)) { setOwnProperty(output, key, redactionMarker('SENSITIVE_FIELD')); fields.push(fieldPath); }
      else setOwnProperty(output, key, walk(current[key] as JsonValue, fieldPath));
    }
    return output;
  }
  return { value: walk(jsonValue, ''), fields: sortedStrings(fields) };
}
function contextSourceTier(source: ContextSource): ContextTier {
  switch (source.kind) {
    case 'TASK_INPUT': return 'TASK';
    case 'ASSUMPTION': return 'ASSUMPTION';
    case 'DECLARED_REPOSITORY': return source.tier;
    case 'ARTIFACT': return source.tier;
  }
}
function contextRequirementToken(source: ContextSource): string {
  switch (source.kind) {
    case 'TASK_INPUT': return `task:${source.key}`;
    case 'DECLARED_REPOSITORY': return `repo:${source.path}`;
    case 'ARTIFACT': return `artifact:${source.artifact_id}`;
    case 'ASSUMPTION': return `assumption:${source.key}`;
  }
}
function valueDepth(value: JsonValue): number {
  if (!Array.isArray(value) && !isPlainRecord(value)) return 1;
  const children = Array.isArray(value) ? value : Object.values(value) as JsonValue[];
  return 1 + (children.length === 0 ? 0 : Math.max(...children.map(valueDepth)));
}
function byteLength(value: JsonValue): number { return Buffer.byteLength(canonicalJson(value), 'utf8'); }
interface ContextEntryMetrics { byte_length: number; depth: number; }
function measureContextEntry(value: JsonValue): ContextEntryMetrics { return { byte_length: byteLength(value), depth: valueDepth(value) }; }
function enforceContextEntryLimits(value: JsonValue, limits: ContextLimits, path: string): ContextEntryMetrics {
  const metrics = measureContextEntry(value);
  if (metrics.byte_length > limits.max_entry_bytes || metrics.depth > limits.max_depth) fail('CONTEXT_LIMIT', 'entry exceeds byte or depth bound', path);
  return metrics;
}

function truncateJsonValue(value: JsonValue, maxBytes: number, maxDepth: number): JsonValue {
  if (byteLength(value) <= maxBytes && valueDepth(value) <= maxDepth) return value;
  const marker = redactionMarker('TRUNCATED');
  if (byteLength(marker) > maxBytes) fail('CONTEXT_LIMIT', 'truncation marker exceeds max_entry_bytes');
  if (maxDepth <= 1) return marker;
  if (typeof value === 'string') {
    let low = 0; let high = value.length; let best = '';
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = value.slice(0, middle);
      if (byteLength(candidate) <= maxBytes) { best = candidate; low = middle + 1; } else high = middle - 1;
    }
    return best.length > 0 ? best : marker;
  }
  if (Array.isArray(value)) {
    const output: JsonValue[] = [];
    for (const entry of value) {
      const candidate = truncateJsonValue(entry, maxBytes, maxDepth - 1);
      const next = [...output, candidate];
      if (byteLength(next) > maxBytes) break;
      output.push(candidate);
    }
    return output.length > 0 ? output : marker;
  }
  if (isPlainRecord(value)) {
    const output: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(value).sort(compareStrings)) {
      const candidate = truncateJsonValue(value[key] as JsonValue, maxBytes, maxDepth - 1);
      const next: { [key: string]: JsonValue } = {};
      for (const existingKey of Object.keys(output)) setOwnProperty(next, existingKey, output[existingKey]);
      setOwnProperty(next, key, candidate);
      if (byteLength(next) > maxBytes) break;
      setOwnProperty(output, key, candidate);
    }
    return Object.keys(output).length > 0 ? output : marker;
  }
  return marker;
}
function contextEntryDigestInput(entry: Omit<ContextEntry, 'provenance_digest'>): JsonValue {
  return toJsonValue({
    context_id: entry.context_id,
    key: entry.key,
    source: entry.source,
    value: entry.value,
    classification: entry.classification,
    sensitivity: entry.sensitivity,
    redaction: entry.redaction,
    captured_at: entry.captured_at,
    ...(entry.stale_after === undefined ? {} : { stale_after: entry.stale_after }),
    ...(entry.expires_at === undefined ? {} : { expires_at: entry.expires_at }),
    precedence: entry.precedence,
    byte_length: entry.byte_length,
    depth: entry.depth,
    truncated: entry.truncated,
    ...(entry.original_digest === undefined ? {} : { original_digest: entry.original_digest }),
    stale: entry.stale,
    expired: entry.expired,
    links: entry.links,
  }, 'context-entry-digest');
}
function normalizeContextInput(value: unknown, options: ContextPackageOptions, path: string): ContextEntry {
  const record = requireRecord(value, path);
  assertKeys(record, ['context_id', 'key', 'source', 'value', 'classification', 'sensitivity', 'captured_at', 'stale_after', 'expires_at', 'truncated', 'original_digest', 'links'], path);
  requireKeys(record, ['context_id', 'key', 'source', 'value', 'classification', 'sensitivity', 'captured_at'], path);
  const contextId = normalizeIdentifier(record.context_id, `${path}.context_id`);
  const key = normalizeContextKey(record.key, `${path}.key`);
  const source = normalizeContextSource(record.source, `${path}.source`, options.allowlist.provenance.repository_paths.map((entry) => entry.path));
  const classification = normalizeClassification(record.classification, `${path}.classification`);
  const sensitivity = normalizeSensitivity(record.sensitivity, `${path}.sensitivity`);
  const capturedAt = normalizeTimestamp(record.captured_at, `${path}.captured_at`);
  const staleAfter = record.stale_after === undefined ? undefined : normalizeTimestamp(record.stale_after, `${path}.stale_after`);
  const expiresAt = record.expires_at === undefined ? undefined : normalizeTimestamp(record.expires_at, `${path}.expires_at`);
  if (staleAfter !== undefined && compareTimestamp(staleAfter, capturedAt) <= 0) fail('INVALID_CONTEXT', 'stale_after must be after captured_at', `${path}.stale_after`);
  if (expiresAt !== undefined && compareTimestamp(expiresAt, capturedAt) <= 0) fail('INVALID_CONTEXT', 'expires_at must be after captured_at', `${path}.expires_at`);
  const rawValue = toJsonValue(record.value, `${path}.value`);
  let safeValue: JsonValue;
  let redactedFields: string[];
  if (sensitivity !== 'NONE') {
    const reason = redactionReasonForSensitivity(sensitivity);
    if (reason === undefined) fail('INVALID_CONTEXT', 'sensitive context requires a redaction reason', `${path}.sensitivity`);
    safeValue = redactionMarker(reason);
    redactedFields = ['$'];
  } else {
    const redaction = redactSensitiveFields(rawValue);
    safeValue = redaction.value;
    redactedFields = redaction.fields;
  }
  let truncated = record.truncated === undefined ? false : requireBoolean(record.truncated, `${path}.truncated`);
  let originalDigest = record.original_digest === undefined ? undefined : normalizeDigest(record.original_digest, `${path}.original_digest`);
  if (truncated && originalDigest === undefined) fail('CONTEXT_LIMIT', 'truncated entries require original_digest', `${path}.original_digest`);
  if (!truncated && originalDigest !== undefined) fail('INVALID_CONTEXT', 'original_digest is only valid for truncated entries', `${path}.original_digest`);
  if (options.allow_truncation === true && (byteLength(safeValue) > options.limits.max_entry_bytes || valueDepth(safeValue) > options.limits.max_depth)) {
    if (!truncated) originalDigest = digestFor('conxian.swarm.context-original.v1', safeValue);
    safeValue = truncateJsonValue(safeValue, options.limits.max_entry_bytes, options.limits.max_depth);
    truncated = true;
  }
  const { byte_length: entryBytes, depth: entryDepth } = enforceContextEntryLimits(safeValue, options.limits, path);
  const evaluationNow = normalizeTimestamp(options.now ?? options.captured_at, `${path}.evaluation_now`);
  const stale = staleAfter !== undefined && compareTimestamp(staleAfter, evaluationNow) <= 0;
  const expired = expiresAt !== undefined && compareTimestamp(expiresAt, evaluationNow) <= 0;
  const links = record.links === undefined ? [] : normalizeLinks(record.links, `${path}.links`);
  const withoutDigest: Omit<ContextEntry, 'provenance_digest'> = {
    context_id: contextId, key, source, value: safeValue, classification, sensitivity,
    redaction: {
      redacted: redactedFields.length > 0, fields: redactedFields,
      ...(redactedFields.length === 0 ? {} : { reason: sensitivity === 'NONE' ? 'SENSITIVE_FIELD' : sensitivity === 'SECRET' ? 'SECRET' : sensitivity === 'CREDENTIAL' ? 'CREDENTIAL' : sensitivity === 'PERSONAL_DATA' ? 'PERSONAL_DATA' : 'RESTRICTED' }),
    },
    captured_at: capturedAt,
    ...(staleAfter === undefined ? {} : { stale_after: staleAfter }),
    ...(expiresAt === undefined ? {} : { expires_at: expiresAt }),
    precedence: CONTEXT_PRECEDENCE[contextSourceTier(source)], byte_length: entryBytes, depth: entryDepth,
    truncated, ...(originalDigest === undefined ? {} : { original_digest: originalDigest }), stale, expired, links,
  };
  return { ...withoutDigest, provenance_digest: digestFor('conxian.swarm.context-entry.v1', contextEntryDigestInput(withoutDigest)) };
}
function contextEntryRank(entry: ContextEntry, now: string): [number, number, number, number, string] {
  const current = normalizeTimestamp(now, 'now');
  const expired = entry.expires_at !== undefined && compareTimestamp(entry.expires_at, current) <= 0;
  const stale = entry.stale_after !== undefined && compareTimestamp(entry.stale_after, current) <= 0;
  return [expired ? 0 : 1, stale ? 0 : 1, entry.precedence, Date.parse(entry.captured_at), entry.provenance_digest];
}
function compareContextRank(left: ContextEntry, right: ContextEntry, now: string): number {
  const leftRank = contextEntryRank(left, now); const rightRank = contextEntryRank(right, now);
  return rightRank[0] - leftRank[0] || rightRank[1] - leftRank[1] || rightRank[2] - leftRank[2] || rightRank[3] - leftRank[3] || compareStrings(leftRank[4], rightRank[4]);
}
function contextConflictFor(key: string, selected: ContextEntry, discarded: ContextEntry[], reason: ContextConflict['reason']): ContextConflict {
  const discardedIds = sortedStrings(discarded.map((entry) => entry.context_id));
  return {
    conflict_id: digestFor('conxian.swarm.context-conflict.v1', { key, selected_context_id: selected.context_id, discarded_context_ids: discardedIds }),
    key, selected_context_id: selected.context_id, discarded_context_ids: discardedIds, reason, links: [],
  };
}
function resolveEntries(entries: readonly ContextEntry[], now: string): { entries: ContextEntry[]; conflicts: ContextConflict[] } {
  const byKey = new Map<string, ContextEntry[]>();
  for (const entry of entries) byKey.set(entry.key, [...(byKey.get(entry.key) ?? []), entry]);
  const winners: ContextEntry[] = []; const conflicts: ContextConflict[] = [];
  for (const [key, group] of [...byKey.entries()].sort(([left], [right]) => compareStrings(left, right))) {
    const sorted = [...group].sort((left, right) => compareContextRank(left, right, now));
    const selected = sorted[0]; if (selected === undefined) continue;
    winners.push(selected);
    const discarded = sorted.slice(1);
    if (discarded.length > 0) {
      const selectedRank = contextEntryRank(selected, now); const discardedRank = contextEntryRank(discarded[0], now);
      const reason: ContextConflict['reason'] = selectedRank[0] !== discardedRank[0] ? 'expired' : selectedRank[1] !== discardedRank[1] ? 'stale' : selectedRank[2] !== discardedRank[2] ? 'lower-precedence' : selectedRank[3] !== discardedRank[3] ? 'newer-capture' : 'digest-tiebreak';
      conflicts.push(contextConflictFor(key, selected, discarded, reason));
    }
  }
  winners.sort((left, right) => compareStrings(left.key, right.key) || compareStrings(left.context_id, right.context_id));
  conflicts.sort((left, right) => compareStrings(left.conflict_id, right.conflict_id));
  return { entries: winners, conflicts };
}
function requiredTokensForAllowlist(allowlist: ContextAllowlist): string[] {
  return [...allowlist.repository_paths.filter((entry) => entry.required).map((entry) => `repo:${entry.path}`), ...allowlist.required_task_input_keys.map((key) => `task:${key}`), ...allowlist.required_artifact_ids.map((artifactId) => `artifact:${artifactId}`)];
}
function sourceAllowed(source: ContextSource, allowlist: ContextAllowlist): boolean {
  switch (source.kind) {
    case 'TASK_INPUT': return allowlist.task_input_keys.includes(source.key);
    case 'DECLARED_REPOSITORY': return allowlist.repository_paths.some((entry) => entry.path === source.path && entry.tier === source.tier);
    case 'ARTIFACT': return allowlist.artifact_ids.includes(source.artifact_id);
    case 'ASSUMPTION': return allowlist.assumption_keys.includes(source.key);
  }
}
function contextSnapshotDigestInput(snapshot: Omit<ContextSnapshot, 'integrity'>): JsonValue { return toJsonValue(snapshot, 'context-snapshot-digest'); }

function normalizeContextEntry(value: unknown, path: string, evaluatedAt: string, allowlistedHiddenPaths: readonly string[] = []): ContextEntry {
  const record = requireRecord(value, path);
  assertKeys(record, ['context_id', 'key', 'source', 'value', 'classification', 'sensitivity', 'redaction', 'captured_at', 'stale_after', 'expires_at', 'precedence', 'byte_length', 'depth', 'truncated', 'original_digest', 'provenance_digest', 'stale', 'expired', 'links'], path);
  requireKeys(record, ['context_id', 'key', 'source', 'value', 'classification', 'sensitivity', 'redaction', 'captured_at', 'precedence', 'byte_length', 'depth', 'truncated', 'provenance_digest', 'stale', 'expired', 'links'], path);
  const source = normalizeContextSource(record.source, `${path}.source`, allowlistedHiddenPaths);
  const redactionRecord = requireRecord(record.redaction, `${path}.redaction`);
  assertKeys(redactionRecord, ['redacted', 'fields', 'reason'], `${path}.redaction`); requireKeys(redactionRecord, ['redacted', 'fields'], `${path}.redaction`);
  const redaction: RedactionMetadata = { redacted: requireBoolean(redactionRecord.redacted, `${path}.redaction.redacted`), fields: requireArray(redactionRecord.fields, `${path}.redaction.fields`).map((entry, index) => requireString(entry, `${path}.redaction.fields[${index}]`)) };
  assertUnique(redaction.fields, `${path}.redaction.fields`);
  if (redactionRecord.reason !== undefined) {
    const reason = requireString(redactionRecord.reason, `${path}.redaction.reason`);
    if (!(['SENSITIVE_FIELD', 'SECRET', 'CREDENTIAL', 'PERSONAL_DATA', 'RESTRICTED', 'TRUNCATED'] as readonly string[]).includes(reason)) fail('INVALID_CONTEXT', 'unknown redaction reason', `${path}.redaction.reason`);
    redaction.reason = reason as RedactionReason;
  }
  const entry: ContextEntry = {
    context_id: normalizeIdentifier(record.context_id, `${path}.context_id`),
    key: normalizeContextKey(record.key, `${path}.key`),
    source,
    value: toJsonValue(record.value, `${path}.value`),
    classification: normalizeClassification(record.classification, `${path}.classification`),
    sensitivity: normalizeSensitivity(record.sensitivity, `${path}.sensitivity`),
    redaction,
    captured_at: normalizeTimestamp(record.captured_at, `${path}.captured_at`),
    precedence: requireInteger(record.precedence, `${path}.precedence`, 1, 1_000),
    byte_length: requireInteger(record.byte_length, `${path}.byte_length`, 1, 100_000_000),
    depth: requireInteger(record.depth, `${path}.depth`, 1, 64),
    truncated: requireBoolean(record.truncated, `${path}.truncated`),
    provenance_digest: normalizeDigest(record.provenance_digest, `${path}.provenance_digest`),
    stale: requireBoolean(record.stale, `${path}.stale`),
    expired: requireBoolean(record.expired, `${path}.expired`),
    links: normalizeLinks(record.links, `${path}.links`),
  };
  if (record.stale_after !== undefined) entry.stale_after = normalizeTimestamp(record.stale_after, `${path}.stale_after`);
  if (record.expires_at !== undefined) entry.expires_at = normalizeTimestamp(record.expires_at, `${path}.expires_at`);
  if (record.original_digest !== undefined) entry.original_digest = normalizeDigest(record.original_digest, `${path}.original_digest`);
  if (entry.precedence !== CONTEXT_PRECEDENCE[contextSourceTier(source)]) fail('INVALID_CONTEXT', 'precedence does not match source tier', `${path}.precedence`);
  const expectedSensitivityReason = redactionReasonForSensitivity(entry.sensitivity);
  if (expectedSensitivityReason === undefined) {
    const redacted = redactSensitiveFields(entry.value);
    if (canonicalJson(redacted.value) !== canonicalJson(entry.value)) fail('INVALID_CONTEXT', 'sensitive fields must be redacted before serialization', `${path}.value`);
    if (redaction.redacted !== (redacted.fields.length > 0) || canonicalJson(redaction.fields) !== canonicalJson(redacted.fields) || (redacted.fields.length > 0 && redaction.reason !== 'SENSITIVE_FIELD') || (redacted.fields.length === 0 && redaction.reason !== undefined)) {
      fail('INVALID_CONTEXT', 'redaction metadata does not match the serialized value', `${path}.redaction`);
    }
  } else if (!isRedactionMarker(entry.value, expectedSensitivityReason) || !redaction.redacted || canonicalJson(redaction.fields) !== '["$"]' || redaction.reason !== expectedSensitivityReason) {
    fail('INVALID_CONTEXT', 'sensitive context must contain only its typed redaction marker', `${path}`);
  }
  if (entry.truncated !== (entry.original_digest !== undefined)) fail('CONTEXT_LIMIT', 'truncated and original_digest must be provided together', path);
  const metrics = measureContextEntry(entry.value);
  if (entry.byte_length !== metrics.byte_length || entry.depth !== metrics.depth) fail('CONTEXT_LIMIT', 'byte/depth accounting does not match value', path);
  if (entry.stale_after !== undefined && compareTimestamp(entry.stale_after, entry.captured_at) <= 0) fail('INVALID_CONTEXT', 'stale_after must be after captured_at', `${path}.stale_after`);
  if (entry.expires_at !== undefined && compareTimestamp(entry.expires_at, entry.captured_at) <= 0) fail('INVALID_CONTEXT', 'expires_at must be after captured_at', `${path}.expires_at`);
  const expectedStale = entry.stale_after !== undefined && compareTimestamp(entry.stale_after, evaluatedAt) <= 0;
  const expectedExpired = entry.expires_at !== undefined && compareTimestamp(entry.expires_at, evaluatedAt) <= 0;
  if (entry.stale !== expectedStale || entry.expired !== expectedExpired) fail('INVALID_CONTEXT', 'stale/expired flags do not match snapshot evaluation time', path);
  const withoutDigest: Omit<ContextEntry, 'provenance_digest'> = { ...entry };
  delete (withoutDigest as { provenance_digest?: Digest }).provenance_digest;
  if (digestFor('conxian.swarm.context-entry.v1', contextEntryDigestInput(withoutDigest)) !== entry.provenance_digest) fail('INVALID_DIGEST', 'provenance_digest does not match entry', `${path}.provenance_digest`);
  return entry;
}
function normalizeContextConflict(value: unknown, path: string): ContextConflict {
  const record = requireRecord(value, path);
  assertKeys(record, ['conflict_id', 'key', 'selected_context_id', 'discarded_context_ids', 'reason', 'links'], path);
  requireKeys(record, ['conflict_id', 'key', 'selected_context_id', 'discarded_context_ids', 'reason', 'links'], path);
  const reason = requireString(record.reason, `${path}.reason`);
  if (!(['lower-precedence', 'stale', 'expired', 'newer-capture', 'digest-tiebreak'] as readonly string[]).includes(reason)) fail('INVALID_CONTEXT', 'unknown conflict reason', `${path}.reason`);
  const discarded = requireArray(record.discarded_context_ids, `${path}.discarded_context_ids`).map((entry, index) => normalizeIdentifier(entry, `${path}.discarded_context_ids[${index}]`));
  assertUnique(discarded, `${path}.discarded_context_ids`);
  return { conflict_id: normalizeDigest(record.conflict_id, `${path}.conflict_id`), key: normalizeContextKey(record.key, `${path}.key`), selected_context_id: normalizeIdentifier(record.selected_context_id, `${path}.selected_context_id`), discarded_context_ids: sortedStrings(discarded), reason: reason as ContextConflict['reason'], links: normalizeLinks(record.links, `${path}.links`) };
}
function contextSnapshotIntegrity(snapshot: Omit<ContextSnapshot, 'integrity'>): DigestIntegrityMetadata { return { digest: digestFor('conxian.swarm.context.v1', contextSnapshotDigestInput(snapshot)) }; }

/**
* Normalizes structural context data for internal composition only.
*
* This helper is intentionally private and non-authoritative: it does not
* establish #1162 provenance or prove that an allowlist came from a trusted
* deployment boundary. Handover, envelope, resumability, and public context
* validation must use validateContextSnapshot instead.
*/
function normalizeContextSnapshotStructure(
  value: unknown,
  options: { graph?: TaskGraph; allowlist?: ContextAllowlist } = {},
): ContextSnapshot {
  const record = requireRecord(value, 'context');
  assertKeys(record, ['schema', 'captured_at', 'evaluated_at', 'entries', 'required_keys', 'missing_required', 'stale_required', 'expired_required', 'conflicts', 'warnings', 'limits', 'allowlist_digest', 'integrity'], 'context');
  requireKeys(record, ['schema', 'captured_at', 'evaluated_at', 'entries', 'required_keys', 'missing_required', 'stale_required', 'expired_required', 'conflicts', 'warnings', 'limits', 'allowlist_digest', 'integrity'], 'context');
  if (record.schema !== SWARM_SCHEMAS.context) fail('UNSUPPORTED_VERSION', `schema must be '${SWARM_SCHEMAS.context}'`, 'context.schema');
  const capturedAt = normalizeTimestamp(record.captured_at, 'context.captured_at');
  const evaluatedAt = normalizeTimestamp(record.evaluated_at, 'context.evaluated_at');
  const declaredLimits = normalizeLimits(record.limits, 'context.limits');
  const effectiveLimits = effectiveContextLimits(declaredLimits, options.graph);
  const allowlist = options.allowlist;
  const allowlistedHiddenPaths = allowlist?.repository_paths.map((entry) => entry.path) ?? [];
  const entries = requireArray(record.entries, 'context.entries').map((entry, index) => normalizeContextEntry(entry, `context.entries[${index}]`, evaluatedAt, allowlistedHiddenPaths));
  entries.forEach((entry, index) => enforceContextEntryLimits(entry.value, declaredLimits, `context.entries[${index}]`));
  if (allowlist !== undefined) {
    entries.forEach((entry, index) => {
      if (!sourceAllowed(entry.source, allowlist)) fail('CONTEXT_NOT_ALLOWED', 'source is not declared by the validated #1162 allowlist', `context.entries[${index}].source`);
    });
  }
  if (entries.length > declaredLimits.max_items || entries.length > effectiveLimits.max_items) fail('CONTEXT_LIMIT', 'entry count exceeds context bound', 'context.entries');
  assertUnique(entries.map((entry) => entry.context_id), 'context.entries'); assertUnique(entries.map((entry) => entry.key), 'context.entries');
  const totalBytes = entries.reduce((total, entry) => total + entry.byte_length, 0);
  if (totalBytes > declaredLimits.max_total_bytes || totalBytes > effectiveLimits.max_total_bytes) fail('CONTEXT_LIMIT', 'total context bytes exceed context or graph max_context_bytes', 'context.entries');
  const normalizeKeyList = (field: string): string[] => {
    const values = requireArray(record[field], `context.${field}`).map((entry, index) => requireString(entry, `context.${field}[${index}]`));
    assertUnique(values, `context.${field}`); return sortedStrings(values);
  };
  const requiredKeys = normalizeKeyList('required_keys'); const missingRequired = normalizeKeyList('missing_required'); const staleRequired = normalizeKeyList('stale_required'); const expiredRequired = normalizeKeyList('expired_required');
  for (const missing of [...missingRequired, ...staleRequired, ...expiredRequired]) if (!requiredKeys.includes(missing)) fail('INVALID_CONTEXT', 'required-status key must be listed in required_keys', 'context');
  const conflicts = requireArray(record.conflicts, 'context.conflicts').map((entry, index) => normalizeContextConflict(entry, `context.conflicts[${index}]`));
  const warnings = requireArray(record.warnings, 'context.warnings').map((entry, index) => requireString(entry, `context.warnings[${index}]`, true));
  const withoutIntegrity: Omit<ContextSnapshot, 'integrity'> = {
    schema: SWARM_SCHEMAS.context, captured_at: capturedAt, evaluated_at: evaluatedAt, entries: entries.sort((left, right) => compareStrings(left.key, right.key)),
    required_keys: requiredKeys, missing_required: missingRequired, stale_required: staleRequired, expired_required: expiredRequired,
    conflicts: conflicts.sort((left, right) => compareStrings(left.conflict_id, right.conflict_id)), warnings: sortedStrings(warnings), limits: declaredLimits,
    allowlist_digest: normalizeDigest(record.allowlist_digest, 'context.allowlist_digest'),
  };
  const integrity = normalizeDigestIntegrity(record.integrity, 'context.integrity');
  if (digestFor('conxian.swarm.context.v1', contextSnapshotDigestInput(withoutIntegrity)) !== integrity.digest) fail('INVALID_DIGEST', 'context integrity digest does not match snapshot', 'context.integrity.digest');
  const snapshot: ContextSnapshot = { ...withoutIntegrity, integrity };
  if (allowlist !== undefined && snapshot.allowlist_digest !== digestFor('conxian.swarm.context-allowlist.v1', allowlist)) fail('INVALID_DIGEST', 'context allowlist digest does not match supplied provenance', 'context.allowlist_digest');
  const sourceTokens = new Set(entries.map((entry) => contextRequirementToken(entry.source)));
  const expectedMissing = requiredKeys.filter((key) => !sourceTokens.has(key));
  const expectedStale = requiredKeys.filter((key) => {
    const entry = entries.find((candidate) => contextRequirementToken(candidate.source) === key);
    return entry !== undefined && entry.stale;
  });
  const expectedExpired = requiredKeys.filter((key) => {
    const entry = entries.find((candidate) => contextRequirementToken(candidate.source) === key);
    return entry !== undefined && entry.expired;
  });
  if (canonicalJson(missingRequired) !== canonicalJson(expectedMissing) || canonicalJson(staleRequired) !== canonicalJson(expectedStale) || canonicalJson(expiredRequired) !== canonicalJson(expectedExpired)) {
    fail('INVALID_CONTEXT', 'required context status lists do not match entries', 'context');
  }
  return snapshot;
}

/**
* Validates a bounded context snapshot against mandatory #1162 provenance.
* The trusted anchor is supplied by an adapter/deployment boundary; this
* library verifies its content binding but cannot authenticate that boundary.
*/
export function validateContextSnapshot(value: unknown, options: ContextValidationOptions): ContextSnapshot {
  const provenance = normalizeContextProvenance(options, 'context.provenance', true);
  if (provenance === undefined) fail('CONTEXT_NOT_ALLOWED', 'authoritative context validation requires #1162 anchor, discovery, and allowlist provenance', 'context.provenance');
  const snapshot = normalizeContextSnapshotStructure(value, { graph: options.graph, allowlist: provenance.allowlist });
  if (snapshot.allowlist_digest !== digestFor('conxian.swarm.context-allowlist.v1', provenance.allowlist)) {
    fail('INVALID_DIGEST', 'context allowlist digest does not match supplied provenance', 'context.allowlist_digest');
  }
  if (options.now !== undefined || options.reject_stale_required === true) {
    const resolution = resolveContextSnapshot(snapshot, options.now ?? snapshot.evaluated_at, provenance);
    if (options.reject_stale_required === true && !resolution.valid) {
      if (resolution.missing_required.length > 0) fail('MISSING_CONTEXT', 'required context is missing', 'context');
      fail('STALE_CONTEXT', 'required context is stale or expired', 'context');
    }
  }
  return snapshot;
}

/** Packages caller-provided allowlisted context with deterministic redaction and bounds. */
export function packageContext(values: readonly ContextInput[], options: ContextPackageOptions): ContextSnapshot {
  const provenance = normalizeContextProvenance(options, 'options.provenance', true);
  if (provenance === undefined) fail('CONTEXT_NOT_ALLOWED', 'context packaging requires #1162 anchor, discovery, and allowlist provenance', 'options.provenance');
  const allowlist = provenance.allowlist;
  const limits = effectiveContextLimits(normalizeLimits(options.limits, 'options.limits'), options.graph);
  const capturedAt = normalizeTimestamp(options.captured_at, 'options.captured_at'); const now = normalizeTimestamp(options.now ?? capturedAt, 'options.now');
  const requiredKeys = sortedStrings([...requiredTokensForAllowlist(allowlist), ...(options.required_keys ?? []).map((entry, index) => requireString(entry, `options.required_keys[${index}]`))]);
  assertUnique(requiredKeys, 'options.required_keys');
  const entries = values.map((entry, index) => normalizeContextInput(entry, { ...options, allowlist, limits, captured_at: capturedAt, now, graph: options.graph }, `contextInputs[${index}]`));
  assertUnique(entries.map((entry) => entry.context_id), 'contextInputs');
  for (const entry of entries) if (!sourceAllowed(entry.source, allowlist)) fail('CONTEXT_NOT_ALLOWED', 'source is not declared by the #1162 allowlist', `contextInputs.${entry.context_id}.source`);
  if (entries.length > limits.max_items) fail('CONTEXT_LIMIT', 'entry count exceeds max_items', 'contextInputs');
  const resolved = resolveEntries(entries, now); const tokenToEntry = new Map(resolved.entries.map((entry) => [contextRequirementToken(entry.source), entry]));
  const missingRequired = requiredKeys.filter((token) => !tokenToEntry.has(token));
  const staleRequired = requiredKeys.filter((token) => { const entry = tokenToEntry.get(token); return entry !== undefined && entry.stale; });
  const expiredRequired = requiredKeys.filter((token) => { const entry = tokenToEntry.get(token); return entry !== undefined && entry.expired; });
  if (missingRequired.length > 0) fail('MISSING_CONTEXT', `missing required context: ${missingRequired.join(', ')}`, 'contextInputs');
  if (expiredRequired.length > 0) fail('STALE_CONTEXT', `expired required context: ${expiredRequired.join(', ')}`, 'contextInputs');
  if (staleRequired.length > 0 && options.allow_stale !== true) fail('STALE_CONTEXT', `stale required context: ${staleRequired.join(', ')}`, 'contextInputs');
  const warnings = [
    ...resolved.entries.filter((entry) => entry.stale && !requiredKeys.includes(contextRequirementToken(entry.source))).map((entry) => `Stale context '${entry.key}' was retained for provenance.`),
    ...resolved.entries.filter((entry) => entry.expired && !requiredKeys.includes(contextRequirementToken(entry.source))).map((entry) => `Expired context '${entry.key}' cannot satisfy current requirements.`),
  ];
  if (resolved.entries.reduce((total, entry) => total + entry.byte_length, 0) > limits.max_total_bytes) fail('CONTEXT_LIMIT', 'total context bytes exceed max_total_bytes', 'contextInputs');
  const withoutIntegrity: Omit<ContextSnapshot, 'integrity'> = {
    schema: SWARM_SCHEMAS.context, captured_at: capturedAt, evaluated_at: now, entries: resolved.entries, required_keys: requiredKeys,
    missing_required: sortedStrings(missingRequired), stale_required: sortedStrings(staleRequired), expired_required: sortedStrings(expiredRequired),
    conflicts: resolved.conflicts, warnings: sortedStrings(warnings), limits, allowlist_digest: digestFor('conxian.swarm.context-allowlist.v1', allowlist),
  };
  return validateContextSnapshot(
    { ...withoutIntegrity, integrity: contextSnapshotIntegrity(withoutIntegrity) },
    { ...provenance, graph: options.graph, reject_stale_required: false },
  );
}

function reevaluateContextEntry(entry: ContextEntry, evaluatedAt: string): ContextEntry {
  const stale = entry.stale_after !== undefined && compareTimestamp(entry.stale_after, evaluatedAt) <= 0;
  const expired = entry.expires_at !== undefined && compareTimestamp(entry.expires_at, evaluatedAt) <= 0;
  const withoutDigest: Omit<ContextEntry, 'provenance_digest'> = { ...entry, stale, expired };
  return { ...withoutDigest, provenance_digest: digestFor('conxian.swarm.context-entry.v1', contextEntryDigestInput(withoutDigest)) };
}

/** Re-evaluates freshness at a caller-supplied time without mutating the snapshot. */
export function resolveContextSnapshot(snapshotValue: ContextSnapshot, nowValue: string, provenance: ContextProvenanceOptions): ContextResolution {
  const snapshot = validateContextSnapshot(snapshotValue, { reject_stale_required: false, ...provenance });
  const now = normalizeTimestamp(nowValue, 'now');
  const missing: string[] = []; const stale: string[] = []; const expired: string[] = [];
  for (const token of snapshot.required_keys) {
    const entry = snapshot.entries.find((candidate) => contextRequirementToken(candidate.source) === token);
    if (entry === undefined) { missing.push(token); continue; }
    if (entry.expires_at !== undefined && compareTimestamp(entry.expires_at, now) <= 0) expired.push(token);
    else if (entry.stale_after !== undefined && compareTimestamp(entry.stale_after, now) <= 0) stale.push(token);
  }
  return {
    valid: missing.length === 0 && stale.length === 0 && expired.length === 0,
    entries: [...snapshot.entries], missing_required: sortedStrings(missing), stale_required: sortedStrings(stale), expired_required: sortedStrings(expired),
    warnings: sortedStrings([...snapshot.warnings, ...stale.map((token) => `Required context '${token}' is stale.`), ...expired.map((token) => `Required context '${token}' is expired.`), ...missing.map((token) => `Required context '${token}' is missing.`)]),
  };
}
export interface ContextMergeOptions extends ContextProvenanceOptions {
  now: string;
  captured_at?: string;
  limits?: ContextLimits;
  graph?: TaskGraph;
}

/** Merges snapshots with one mandatory, shared authoritative provenance. */
export function mergeContextSnapshots(values: readonly ContextSnapshot[], options: ContextMergeOptions): ContextSnapshot {
  if (values.length === 0) fail('INVALID_CONTEXT', 'at least one context snapshot is required');
  const graph = options.graph === undefined ? undefined : validateTaskGraph(options.graph);
  const provenance: ContextProvenanceOptions = {
    allowlist: options.allowlist,
    discovery: options.discovery,
    trusted_discovery_anchor: options.trusted_discovery_anchor,
  };
  const snapshots = values.map((entry) => validateContextSnapshot(entry, { reject_stale_required: false, graph, ...provenance }));
  const now = normalizeTimestamp(options.now, 'options.now');
  const limits = effectiveContextLimits(normalizeLimits(options.limits ?? snapshots[0]?.limits, 'options.limits'), graph);
  const resolvedEntries = resolveEntries(snapshots.flatMap((snapshot) => snapshot.entries), now);
  const resolved = { ...resolvedEntries, entries: resolvedEntries.entries.map((entry) => reevaluateContextEntry(entry, now)) };
  if (resolved.entries.length > limits.max_items) fail('CONTEXT_LIMIT', 'merged entries exceed max_items', 'options.limits.max_items');
  if (resolved.entries.reduce((total, entry) => total + entry.byte_length, 0) > limits.max_total_bytes) fail('CONTEXT_LIMIT', 'merged context exceeds max_total_bytes', 'options.limits.max_total_bytes');
  const requiredKeys = sortedStrings([...new Set(snapshots.flatMap((snapshot) => snapshot.required_keys))]);
  const tokenToEntry = new Map(resolved.entries.map((entry) => [contextRequirementToken(entry.source), entry]));
  const missingRequired = requiredKeys.filter((token) => !tokenToEntry.has(token));
  const staleRequired = requiredKeys.filter((token) => { const entry = tokenToEntry.get(token); return entry !== undefined && entry.stale; });
  const expiredRequired = requiredKeys.filter((token) => { const entry = tokenToEntry.get(token); return entry !== undefined && entry.expired; });
  const capturedAt = options.captured_at === undefined
    ? [...snapshots].map((snapshot) => snapshot.captured_at).sort(compareStrings).at(-1) ?? now
    : normalizeTimestamp(options.captured_at, 'options.captured_at');
  const withoutIntegrity: Omit<ContextSnapshot, 'integrity'> = {
    schema: SWARM_SCHEMAS.context, captured_at: capturedAt, evaluated_at: now, entries: resolved.entries, required_keys: requiredKeys,
    missing_required: sortedStrings(missingRequired), stale_required: sortedStrings(staleRequired), expired_required: sortedStrings(expiredRequired),
    conflicts: resolved.conflicts, warnings: sortedStrings(snapshots.flatMap((snapshot) => snapshot.warnings)), limits,
    allowlist_digest: digestFor('conxian.swarm.context-allowlist.v1', provenance.allowlist),
  };
  return validateContextSnapshot(
    { ...withoutIntegrity, integrity: contextSnapshotIntegrity(withoutIntegrity) },
    { ...provenance, graph, reject_stale_required: false },
  );
}

function normalizeTaskResultForGraph(result: TaskResult, graph: TaskGraph): void {
  const node = graph.nodes.find((candidate) => candidate.task_id === result.task_id);
  if (node === undefined) fail('INVALID_RESULT', 'result references an unknown task', 'result.task_id');
  if (result.graph_id !== graph.graph_id) fail('INVALID_RESULT', 'result graph_id does not match graph', 'result.graph_id');
  if (result.attempt > node.retry.max_attempts) fail('INVALID_RESULT', 'result attempt exceeds task retry policy', 'result.attempt');
}
function aggregateOutcome(status: AggregateStatus): AggregationResult['outcome'] {
  switch (status) { case 'COMPLETE': return 'success'; case 'PARTIAL': return 'partial'; case 'FAILED': return 'failed'; case 'BLOCKED': return 'blocked'; case 'CONFLICT': return 'conflict'; case 'CANCELLED': return 'cancelled'; }
}
/** Aggregates results deterministically; duplicate and conflict evidence are preserved. */
export function aggregateResults(graphValue: TaskGraph, resultValues: readonly TaskResult[], options: { cancellation_reason?: string } = {}): AggregationResult {
  const graph = validateTaskGraph(graphValue); const deduplicated = deduplicateResults(resultValues);
  for (const result of deduplicated.unique) normalizeTaskResultForGraph(result, graph);
  const order = graphTopologicalOrder(graph); const byTask = new Map<string, TaskResult[]>();
  for (const result of deduplicated.unique) byTask.set(result.task_id, [...(byTask.get(result.task_id) ?? []), result]);
  const conflictTaskIds = new Set(deduplicated.conflicts.map((conflict) => conflict.task_id));
  const taskSummaries: TaskAggregation[] = []; const selectedResults: TaskResult[] = []; const states = new Map<string, TaskAggregation['status']>();
  const failureReasons: string[] = []; const dependencyImpact: string[] = [];
  for (const taskId of order) {
    const node = graph.nodes.find((candidate) => candidate.task_id === taskId); if (node === undefined) fail('INVALID_GRAPH', 'task order references unknown task');
    const results = (byTask.get(taskId) ?? []).sort((left, right) => left.attempt - right.attempt || compareStrings(left.canonical_payload_digest, right.canonical_payload_digest) || compareStrings(left.result_id, right.result_id));
    const failedDependencies = node.depends_on.filter((dependency) => { const state = states.get(dependency); return state !== undefined && state !== 'SUCCEEDED'; });
    let summary: TaskAggregation;
    if (conflictTaskIds.has(taskId)) {
      summary = { task_id: taskId, required: node.required, status: 'CONFLICT', result_ids: results.map((result) => result.result_id).sort(compareStrings), unresolved_reason: 'conflicting results for the same task attempt', dependency_impact: sortedStrings(failedDependencies) };
      failureReasons.push(`${taskId}: conflicting result digests`);
    } else if (failedDependencies.length > 0) {
      summary = { task_id: taskId, required: node.required, status: 'BLOCKED', result_ids: results.map((result) => result.result_id).sort(compareStrings), unresolved_reason: `blocked by dependencies: ${failedDependencies.join(', ')}`, dependency_impact: sortedStrings(failedDependencies) };
      dependencyImpact.push(`${taskId} <- ${failedDependencies.join(',')}`);
    } else {
      const successful = results.filter((result) => result.status === 'SUCCEEDED').sort((left, right) => left.attempt - right.attempt || compareStrings(left.result_id, right.result_id));
      const selected = successful[0] ?? results[0];
      if (selected === undefined) summary = { task_id: taskId, required: node.required, status: 'PENDING', result_ids: [], unresolved_reason: 'no result was supplied', dependency_impact: [] };
      else {
        summary = { task_id: taskId, required: node.required, status: selected.status, selected_result_id: successful[0]?.result_id ?? selected.result_id, result_ids: results.map((result) => result.result_id).sort(compareStrings), ...(selected.status === 'FAILED' || selected.status === 'BLOCKED' || selected.status === 'CANCELLED' || selected.status === 'EXPIRED' ? { unresolved_reason: selected.error?.message ?? selected.status } : {}), dependency_impact: [] };
        if (successful[0] !== undefined) selectedResults.push(successful[0]);
        if (selected.status !== 'SUCCEEDED') failureReasons.push(`${taskId}: ${selected.error?.code ?? selected.status}`);
      }
    }
    taskSummaries.push(summary); states.set(taskId, summary.status);
  }
  const required = taskSummaries.filter((summary) => summary.required); const optional = taskSummaries.filter((summary) => !summary.required);
  const status: AggregateStatus = deduplicated.conflicts.length > 0 ? 'CONFLICT' : options.cancellation_reason !== undefined || taskSummaries.some((summary) => summary.status === 'CANCELLED') ? 'CANCELLED' : required.some((summary) => summary.status === 'FAILED' || summary.status === 'EXPIRED') ? 'FAILED' : required.some((summary) => summary.status === 'BLOCKED' || summary.status === 'PENDING') ? 'BLOCKED' : optional.some((summary) => summary.status !== 'SUCCEEDED') ? 'PARTIAL' : 'COMPLETE';
  const evidence = [...deduplicated.unique].sort((left, right) => order.indexOf(left.task_id) - order.indexOf(right.task_id) || left.attempt - right.attempt || compareStrings(left.canonical_payload_digest, right.canonical_payload_digest) || compareStrings(left.result_id, right.result_id));
  return {
    schema: 'aggregation.v1', graph_id: graph.graph_id, status, outcome: aggregateOutcome(status), success: status === 'COMPLETE', task_order: order, tasks: taskSummaries,
    selected_results: selectedResults.sort((left, right) => order.indexOf(left.task_id) - order.indexOf(right.task_id) || left.attempt - right.attempt), evidence,
    duplicate_evidence: deduplicated.duplicates.sort((left, right) => compareStrings(left.result_key, right.result_key) || compareStrings(left.payload_digest, right.payload_digest)),
    conflicts: deduplicated.conflicts.sort((left, right) => compareStrings(left.conflict_id, right.conflict_id)), unresolved_task_ids: taskSummaries.filter((summary) => summary.status !== 'SUCCEEDED').map((summary) => summary.task_id),
    failure_reasons: sortedStrings(failureReasons), dependency_impact: sortedStrings(dependencyImpact), ...(options.cancellation_reason === undefined ? {} : { cancellation_reason: options.cancellation_reason }),
  };
}

function normalizeHandoverTaskReference(value: unknown, path: string): HandoverTaskReference {
  const record = requireRecord(value, path);
  assertKeys(record, ['task_id', 'state', 'attempt', 'reason', 'links'], path); requireKeys(record, ['task_id', 'state', 'links'], path);
  const state = requireString(record.state, `${path}.state`);
  if (!(['PROPOSED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'BLOCKED'] as readonly string[]).includes(state)) fail('INVALID_HANDOVER', 'invalid handover task state', `${path}.state`);
  const task: HandoverTaskReference = { task_id: normalizeIdentifier(record.task_id, `${path}.task_id`), state: state as HandoverTaskReference['state'], links: normalizeLinks(record.links, `${path}.links`) };
  if (record.attempt !== undefined) task.attempt = requireInteger(record.attempt, `${path}.attempt`, 1, 64);
  if (record.reason !== undefined) task.reason = requireString(record.reason, `${path}.reason`);
  return task;
}
function normalizeHandoverDecision(value: unknown, path: string): HandoverDecision {
  const record = requireRecord(value, path);
  assertKeys(record, ['decision_id', 'sequence', 'key', 'value', 'rationale', 'links'], path); requireKeys(record, ['decision_id', 'sequence', 'key', 'value', 'rationale', 'links'], path);
  return { decision_id: normalizeIdentifier(record.decision_id, `${path}.decision_id`), sequence: requireInteger(record.sequence, `${path}.sequence`, 1), key: normalizeContextKey(record.key, `${path}.key`), value: toJsonValue(record.value, `${path}.value`), rationale: requireString(record.rationale, `${path}.rationale`), links: normalizeLinks(record.links, `${path}.links`) };
}
function normalizeHandoverRisk(value: unknown, path: string): HandoverRisk {
  const record = requireRecord(value, path);
  assertKeys(record, ['risk_id', 'severity', 'status', 'description', 'links'], path); requireKeys(record, ['risk_id', 'severity', 'status', 'description', 'links'], path);
  const severity = requireString(record.severity, `${path}.severity`); const status = requireString(record.status, `${path}.status`);
  if (!(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as readonly string[]).includes(severity)) fail('INVALID_HANDOVER', 'invalid risk severity', `${path}.severity`);
  if (!(['OPEN', 'MITIGATED', 'ACCEPTED'] as readonly string[]).includes(status)) fail('INVALID_HANDOVER', 'invalid risk status', `${path}.status`);
  return { risk_id: normalizeIdentifier(record.risk_id, `${path}.risk_id`), severity: severity as HandoverRisk['severity'], status: status as HandoverRisk['status'], description: requireString(record.description, `${path}.description`), links: normalizeLinks(record.links, `${path}.links`) };
}
function normalizeResumeInstruction(value: unknown, path: string): ResumeInstruction {
  const record = requireRecord(value, path);
  assertKeys(record, ['instruction_id', 'sequence', 'task_id', 'action', 'depends_on', 'acceptance', 'links'], path); requireKeys(record, ['instruction_id', 'sequence', 'task_id', 'action', 'depends_on', 'acceptance', 'links'], path);
  const action = requireString(record.action, `${path}.action`);
  if (!(['RESUME', 'RETRY', 'UNBLOCK', 'VERIFY', 'WAIT'] as readonly string[]).includes(action)) fail('INVALID_HANDOVER', 'invalid resume action', `${path}.action`);
  const dependsOn = requireArray(record.depends_on, `${path}.depends_on`).map((entry, index) => normalizeIdentifier(entry, `${path}.depends_on[${index}]`));
  assertUnique(dependsOn, `${path}.depends_on`);
  return { instruction_id: normalizeIdentifier(record.instruction_id, `${path}.instruction_id`), sequence: requireInteger(record.sequence, `${path}.sequence`, 1), task_id: normalizeIdentifier(record.task_id, `${path}.task_id`), action: action as ResumeInstruction['action'], depends_on: sortedStrings(dependsOn), acceptance: requireString(record.acceptance, `${path}.acceptance`), links: normalizeLinks(record.links, `${path}.links`) };
}
function normalizeHandoverConflict(value: unknown, path: string): HandoverConflict {
  const record = requireRecord(value, path);
  assertKeys(record, ['conflict_id', 'object_id', 'payload_digests', 'resolution_required', 'links'], path); requireKeys(record, ['conflict_id', 'object_id', 'payload_digests', 'resolution_required', 'links'], path);
  const digests = requireArray(record.payload_digests, `${path}.payload_digests`).map((entry, index) => normalizeDigest(entry, `${path}.payload_digests[${index}]`));
  assertUnique(digests, `${path}.payload_digests`);
  if (digests.length < 2) fail('INVALID_HANDOVER', 'handover conflicts require at least two distinct payload digests', `${path}.payload_digests`);
  return { conflict_id: normalizeIdentifier(record.conflict_id, `${path}.conflict_id`), object_id: normalizeIdentifier(record.object_id, `${path}.object_id`), payload_digests: sortedStrings(digests) as Digest[], resolution_required: requireBoolean(record.resolution_required, `${path}.resolution_required`), links: normalizeLinks(record.links, `${path}.links`) };
}
function handoverDigestInput(handover: Omit<HandoverDocument, 'integrity'>): JsonValue {
  return toJsonValue(handover, 'handover-digest');
}
function normalizeHandoverCore(value: unknown, graph: TaskGraph, provenance: ContextProvenanceOptions): Omit<HandoverDocument, 'integrity'> {
  const record = requireRecord(value, 'handover');
  assertKeys(record, ['schema', 'handover_id', 'correlation_id', 'graph_id', 'graph_digest', 'source_agent', 'target_agent', 'captured_at', 'expires_at', 'lifecycle_state', 'completed_tasks', 'active_tasks', 'blocked_tasks', 'pending_tasks', 'decisions', 'artifacts', 'unresolved_conflicts', 'risks_and_blockers', 'resume_instructions', 'context_snapshot', 'links', 'integrity'], 'handover');
  requireKeys(record, ['schema', 'handover_id', 'correlation_id', 'graph_id', 'graph_digest', 'captured_at', 'expires_at', 'lifecycle_state', 'completed_tasks', 'active_tasks', 'blocked_tasks', 'pending_tasks', 'decisions', 'artifacts', 'unresolved_conflicts', 'risks_and_blockers', 'resume_instructions', 'context_snapshot', 'links'], 'handover');
  if (record.schema !== SWARM_SCHEMAS.handover) fail('UNSUPPORTED_VERSION', `schema must be '${SWARM_SCHEMAS.handover}'`, 'handover.schema');
  const core: Omit<HandoverDocument, 'integrity'> = {
    schema: SWARM_SCHEMAS.handover, handover_id: normalizeIdentifier(record.handover_id, 'handover.handover_id'), correlation_id: normalizeIdentifier(record.correlation_id, 'handover.correlation_id'), graph_id: normalizeIdentifier(record.graph_id, 'handover.graph_id'), graph_digest: normalizeDigest(record.graph_digest, 'handover.graph_digest'), captured_at: normalizeTimestamp(record.captured_at, 'handover.captured_at'), expires_at: normalizeTimestamp(record.expires_at, 'handover.expires_at'), lifecycle_state: normalizeStatus(record.lifecycle_state, 'handover.lifecycle_state'),
    completed_tasks: requireArray(record.completed_tasks, 'handover.completed_tasks').map((entry, index) => normalizeHandoverTaskReference(entry, `handover.completed_tasks[${index}]`)), active_tasks: requireArray(record.active_tasks, 'handover.active_tasks').map((entry, index) => normalizeHandoverTaskReference(entry, `handover.active_tasks[${index}]`)), blocked_tasks: requireArray(record.blocked_tasks, 'handover.blocked_tasks').map((entry, index) => normalizeHandoverTaskReference(entry, `handover.blocked_tasks[${index}]`)), pending_tasks: requireArray(record.pending_tasks, 'handover.pending_tasks').map((entry, index) => normalizeHandoverTaskReference(entry, `handover.pending_tasks[${index}]`)), decisions: requireArray(record.decisions, 'handover.decisions').map((entry, index) => normalizeHandoverDecision(entry, `handover.decisions[${index}]`)), artifacts: requireArray(record.artifacts, 'handover.artifacts').map((entry, index) => normalizeArtifact(entry, `handover.artifacts[${index}]`)), unresolved_conflicts: requireArray(record.unresolved_conflicts, 'handover.unresolved_conflicts').map((entry, index) => normalizeHandoverConflict(entry, `handover.unresolved_conflicts[${index}]`)), risks_and_blockers: requireArray(record.risks_and_blockers, 'handover.risks_and_blockers').map((entry, index) => normalizeHandoverRisk(entry, `handover.risks_and_blockers[${index}]`)), resume_instructions: requireArray(record.resume_instructions, 'handover.resume_instructions').map((entry, index) => normalizeResumeInstruction(entry, `handover.resume_instructions[${index}]`)), context_snapshot: validateContextSnapshot(record.context_snapshot, { reject_stale_required: false, graph, ...provenance }), links: normalizeLinks(record.links, 'handover.links'),
  };
  if (record.source_agent !== undefined) core.source_agent = normalizeAgentIdentity(record.source_agent, 'handover.source_agent');
  if (record.target_agent !== undefined) core.target_agent = normalizeAgentIdentity(record.target_agent, 'handover.target_agent');
  if (core.expires_at <= core.captured_at) fail('INVALID_HANDOVER', 'expires_at must be after captured_at', 'handover.expires_at');
  assertUnique([...core.completed_tasks, ...core.active_tasks, ...core.blocked_tasks, ...core.pending_tasks].map((entry) => entry.task_id), 'handover task state');
  assertUnique(core.decisions.map((entry) => entry.decision_id), 'handover.decisions'); assertUnique(core.risks_and_blockers.map((entry) => entry.risk_id), 'handover.risks_and_blockers');
  assertUnique(core.resume_instructions.map((entry) => entry.instruction_id), 'handover.resume_instructions'); assertUnique(core.artifacts.map((entry) => entry.artifact_id), 'handover.artifacts'); assertUnique(core.unresolved_conflicts.map((entry) => entry.conflict_id), 'handover.unresolved_conflicts');
  for (const task of core.completed_tasks) if (task.state !== 'COMPLETED') fail('INVALID_HANDOVER', 'completed_tasks entries must be COMPLETED', 'handover.completed_tasks');
  for (const task of core.blocked_tasks) if (task.state !== 'BLOCKED') fail('INVALID_HANDOVER', 'blocked_tasks entries must be BLOCKED', 'handover.blocked_tasks');
  for (const task of core.pending_tasks) if (task.state !== 'PROPOSED') fail('INVALID_HANDOVER', 'pending_tasks entries must be PROPOSED', 'handover.pending_tasks');
  for (const task of core.active_tasks) if (task.state !== 'ACCEPTED' && task.state !== 'STARTED') fail('INVALID_HANDOVER', 'active_tasks entries must be ACCEPTED or STARTED', 'handover.active_tasks');
  return core;
}
function sortHandoverByGraph(core: Omit<HandoverDocument, 'integrity'>, graph: TaskGraph): void {
  const order = graphTopologicalOrder(graph); const rank = (taskId: string): number => order.indexOf(taskId);
  const taskComparator = (left: HandoverTaskReference, right: HandoverTaskReference): number => rank(left.task_id) - rank(right.task_id) || compareStrings(left.task_id, right.task_id);
  core.completed_tasks.sort(taskComparator); core.active_tasks.sort(taskComparator); core.blocked_tasks.sort(taskComparator); core.pending_tasks.sort(taskComparator);
  core.decisions.sort((left, right) => left.sequence - right.sequence || compareStrings(left.decision_id, right.decision_id)); core.artifacts.sort((left, right) => compareStrings(left.artifact_id, right.artifact_id)); core.unresolved_conflicts.sort((left, right) => compareStrings(left.conflict_id, right.conflict_id)); core.risks_and_blockers.sort((left, right) => compareStrings(left.risk_id, right.risk_id)); core.resume_instructions.sort((left, right) => left.sequence - right.sequence || compareStrings(left.instruction_id, right.instruction_id));
}
function validateHandoverTaskGraphReferences(core: Omit<HandoverDocument, 'integrity'>, graph: TaskGraph): void {
  const taskIds = new Set(graph.nodes.map((node) => node.task_id));
  for (const task of [...core.completed_tasks, ...core.active_tasks, ...core.blocked_tasks, ...core.pending_tasks]) if (!taskIds.has(task.task_id)) fail('INVALID_HANDOVER', 'handover references unknown task', `handover.${task.task_id}`);
  for (const instruction of core.resume_instructions) { if (!taskIds.has(instruction.task_id)) fail('INVALID_HANDOVER', 'resume instruction references unknown task', `handover.${instruction.instruction_id}`); for (const dependency of instruction.depends_on) if (!taskIds.has(dependency)) fail('INVALID_HANDOVER', 'resume instruction references unknown dependency', `handover.${instruction.instruction_id}.depends_on`); }
}

/** Builds a self-describing handover and calculates its integrity digest. */
export function createHandover(input: CreateHandoverInput, graph: TaskGraph, provenanceOptions: ContextProvenanceOptions): HandoverDocument {
  const normalizedGraph = validateTaskGraph(graph);
  const provenance = normalizeContextProvenance(provenanceOptions, 'handover.context_snapshot', true);
  if (provenance === undefined) fail('CONTEXT_NOT_ALLOWED', 'handover creation requires #1162 context provenance', 'handover.context_snapshot');
  const core = normalizeHandoverCore({ ...input, schema: SWARM_SCHEMAS.handover, graph_digest: taskGraphDigest(normalizedGraph) }, normalizedGraph, provenance);
  if (core.graph_id !== normalizedGraph.graph_id) fail('INVALID_HANDOVER', 'graph_id does not match supplied graph', 'handover.graph_id');
  validateHandoverTaskGraphReferences(core, normalizedGraph);
  sortHandoverByGraph(core, normalizedGraph);
  const digest = digestFor('conxian.swarm.handover.v1', handoverDigestInput(core));
  return validateHandover({ ...core, integrity: { digest } }, { graph: normalizedGraph, ...provenance, reject_stale_required: true });
}
export interface HandoverValidationOptions extends ContextProvenanceOptions {
  graph: TaskGraph;
  now?: string;
  reject_stale_required?: boolean;
}
/** Validates handover state, graph linkage, digest, expiry, and mandatory context freshness. */
export function validateHandover(value: unknown, options: HandoverValidationOptions): HandoverDocument {
  if (options === undefined) fail('CONTEXT_NOT_ALLOWED', 'handover validation requires #1162 context provenance', 'handover.context_snapshot');
  const graph = validateTaskGraph(options.graph);
  const provenance = normalizeContextProvenance(options, 'handover.context_snapshot', true);
  if (provenance === undefined) fail('CONTEXT_NOT_ALLOWED', 'handover validation requires #1162 context provenance', 'handover.context_snapshot');
  const core = normalizeHandoverCore(value, graph, provenance); const record = requireRecord(value, 'handover'); const integrity = normalizeDigestIntegrity(record.integrity, 'handover.integrity');
  if (core.graph_id !== graph.graph_id) fail('INVALID_HANDOVER', 'graph_id does not match supplied graph', 'handover.graph_id');
  if (core.graph_digest !== taskGraphDigest(graph)) fail('INVALID_HANDOVER', 'graph_digest does not match supplied graph', 'handover.graph_digest');
  validateHandoverTaskGraphReferences(core, graph); sortHandoverByGraph(core, graph);
  assertNotExpired(core.expires_at, options.now, 'handover.expires_at');
  if (digestFor('conxian.swarm.handover.v1', handoverDigestInput(core)) !== integrity.digest) fail('INVALID_DIGEST', 'handover integrity digest does not match', 'handover.integrity.digest');
  const resolution = resolveContextSnapshot(core.context_snapshot, options.now ?? core.captured_at, provenance);
  if (options.reject_stale_required !== false && !resolution.valid) fail('INVALID_HANDOVER', 'handover context is missing, stale, or expired', 'handover.context_snapshot');
  return { ...core, integrity };
}
/** Returns resumability evidence without silently treating stale context as current. */
export function assessHandoverResumability(value: unknown, options: HandoverValidationOptions): HandoverAssessment {
  try {
    const handover = validateHandover(value, { ...options, reject_stale_required: false });
    const resolution = resolveContextSnapshot(handover.context_snapshot, options.now ?? handover.captured_at, options);
    return {
      valid: true,
      resumable: resolution.valid && handover.unresolved_conflicts.every((conflict) => !conflict.resolution_required),
      blocked_task_ids: handover.blocked_tasks.map((task) => task.task_id).sort(compareStrings), pending_task_ids: handover.pending_tasks.map((task) => task.task_id).sort(compareStrings),
      stale_context_ids: resolution.stale_required.sort(compareStrings), missing_required_context: resolution.missing_required.sort(compareStrings), expired_required_context: resolution.expired_required.sort(compareStrings),
      unresolved_conflict_ids: handover.unresolved_conflicts.filter((conflict) => conflict.resolution_required).map((conflict) => conflict.conflict_id).sort(compareStrings),
    };
  } catch (error: unknown) {
    if (error instanceof CoordinationError) return { valid: false, resumable: false, blocked_task_ids: [], pending_task_ids: [], stale_context_ids: [], missing_required_context: [], expired_required_context: [], unresolved_conflict_ids: [] };
    throw error;
  }
}
