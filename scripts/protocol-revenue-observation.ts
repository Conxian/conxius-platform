/**
* Pure validation for the protocol revenue and founder-rights observation
* contract. This module performs no network, filesystem, process, or mutation
* work. Callers provide the observation and the comparison time explicitly.
*/

export const PROTOCOL_REVENUE_OBSERVATION_SCHEMA = 'conxian.protocol-revenue-observation.v1' as const;
export const PROTOCOL_REVENUE_OBSERVATION_VERSION = '1.0.0' as const;
export const BPS_DENOMINATOR = 10_000 as const;
export const DEFAULT_MAX_EVIDENCE_AGE_SECONDS = 86_400 as const;

export const DEPLOYMENT_STAGES = [
  'source-only',
  'plan',
  'preflight',
  'broadcast',
  'confirmed',
  'live-interface-verified',
] as const;
export type DeploymentStage = (typeof DEPLOYMENT_STAGES)[number];

export const EVIDENCE_KINDS = [
  'source',
  'proposal',
  'approval',
  'deployment-plan',
  'deployment-preflight',
  'deployment-broadcast',
  'deployment-confirmation',
  'interface-verification',
  'collector-authorization',
  'source-authorization',
  'route-verification',
  'burn-anchor',
  'governance',
  'gateway-observation',
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export type PolicyAuthorityKind = 'source' | 'proposal' | 'approved';
export type PolicyApprovalStatus = 'not-applicable' | 'unratified' | 'ratified' | 'revoked' | 'unresolved';
export type CompensationStatus = 'none-observed' | 'proposed' | 'approved' | 'active' | 'disabled' | 'unresolved';
export type RouteState = 'not-configured' | 'declared' | 'verified' | 'blocked' | 'unresolved';

export interface ObservationWindow {
  observed_at: string;
  expires_at: string;
  evidence_ids: string[];
}

export interface Evidence {
  evidence_id: string;
  kind: EvidenceKind;
  url?: string;
  external_id?: string;
  repository?: string;
  ref?: string;
  commit_sha?: string;
  observed_at: string;
  claim: string;
}

export type ProvenanceRole =
  | 'protocol-source'
  | 'governance-proposal'
  | 'governance-approval'
  | 'deployment-record'
  | 'gateway-observation'
  | 'interface-observation';

export interface Provenance {
  provenance_id: string;
  repository: string;
  ref: string;
  commit_sha: string;
  artifact_path: string;
  role: ProvenanceRole;
  evidence_ids: string[];
}

export interface PolicyAuthority {
  kind: PolicyAuthorityKind;
  approval_status: PolicyApprovalStatus;
  owner_scope: 'protocol';
  provenance_id: string;
  approval_evidence_ids: string[];
}

export interface Asset {
  asset_id: string;
  decimals: number;
}

export interface FeeBase {
  kind: 'gross-volume' | 'eligible-fee-base' | 'transaction-amount';
  unit: 'asset-smallest-units';
  asset: Asset;
}

export interface EffectiveWindow {
  status: 'exact' | 'unresolved';
  start_burn_block_height: number | null;
  end_burn_block_height: number | null;
}

export interface FeeRate {
  label: string;
  rate_bps: number;
  denominator_bps: typeof BPS_DENOMINATOR;
  effective_window: EffectiveWindow;
}

export interface FeePolicy {
  fee_base: FeeBase;
  denominator_bps: typeof BPS_DENOMINATOR;
  rates: FeeRate[];
  schedule_status: 'observed' | 'resolved' | 'unresolved';
}

export interface BeneficiaryDisclosure {
  status: 'disclosed' | 'not-disclosed' | 'unresolved';
  reference_kind: 'evidence-id' | 'repository-path' | 'governance-record' | 'on-chain-reference' | 'not-applicable';
  reference: string | null;
}

export interface ScheduleEntry {
  schedule_id: string;
  rate_bps: number;
  denominator_bps: typeof BPS_DENOMINATOR;
  rate_basis: 'protocol-fee' | 'gross-volume';
  effective_window: EffectiveWindow;
}

export interface CompensationSchedule {
  status: 'resolved' | 'unresolved';
  entries: ScheduleEntry[];
}

export interface CompensationTrack {
  status: CompensationStatus;
  beneficiary_disclosure: BeneficiaryDisclosure;
  schedule: CompensationSchedule;
  route_state: RouteState;
}

export interface Compensation {
  founder: CompensationTrack;
  builder: CompensationTrack;
}

export interface Deployment {
  stage: DeploymentStage;
  environment: 'mainnet' | 'testnet' | 'simnet' | 'unknown';
  source_provenance_id: string;
  transaction_id: string | null;
  confirmed_burn_block_height: number | null;
  evidence_ids: string[];
  interface_evidence_ids: string[];
}

export interface RouteEndpoint {
  reference: string;
  owner_scope: 'protocol';
  authorization: 'declared' | 'verified' | 'unverified' | 'missing';
  evidence_ids: string[];
}

export interface AuthorizedSource extends RouteEndpoint {}

export interface Routing {
  collector: RouteEndpoint;
  distributor: RouteEndpoint;
  authorized_sources: AuthorizedSource[];
  platform_substitution: false;
}

export interface BitcoinAnchor {
  bitcoin_burn_block_height: number;
  observed_at: string;
  evidence_id: string;
}

export interface Payout {
  route_state: RouteState;
  payout_enabled: boolean;
  evidence_ids: string[];
  reason: string | null;
}

export interface ProtocolRevenueObservation {
  schema: typeof PROTOCOL_REVENUE_OBSERVATION_SCHEMA;
  version: string;
  observation_id: string;
  observation: ObservationWindow;
  policy_authority: PolicyAuthority;
  provenance: Provenance[];
  fee_policy: FeePolicy;
  compensation: Compensation;
  deployment: Deployment;
  routing: Routing;
  anchor: BitcoinAnchor;
  payout: Payout;
  custody_claim: false;
  evidence: Evidence[];
}

export type ProtocolRevenueObservationErrorCode =
  | 'INVALID_CONTRACT'
  | 'UNKNOWN_FIELD'
  | 'INVALID_VERSION'
  | 'INVALID_IDENTIFIER'
  | 'INVALID_TIMESTAMP'
  | 'STALE_EVIDENCE'
  | 'MISSING_EVIDENCE'
  | 'INVALID_AUTHORITY'
  | 'AMBIGUOUS_UNIT'
  | 'INVALID_DENOMINATOR'
  | 'INVALID_SCHEDULE'
  | 'INVALID_COMPENSATION'
  | 'INVALID_DEPLOYMENT'
  | 'INVALID_ROUTING'
  | 'COLLECTOR_SUBSTITUTION'
  | 'PAYOUT_NOT_ELIGIBLE'
  | 'CUSTODY_CLAIM';

export class ProtocolRevenueObservationError extends Error {
  public readonly code: ProtocolRevenueObservationErrorCode;
  public readonly path: string | undefined;

  public constructor(code: ProtocolRevenueObservationErrorCode, message: string, path?: string) {
    super(message);
    this.name = 'ProtocolRevenueObservationError';
    this.code = code;
    this.path = path;
  }
}

export interface ObservationValidationOptions {
  now: string;
  maxEvidenceAgeSeconds?: number;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function fail(code: ProtocolRevenueObservationErrorCode, message: string, path?: string): never {
  throw new ProtocolRevenueObservationError(code, `${path === undefined ? '' : `${path}: `}${message}`, path);
}

function expectRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) fail('INVALID_CONTRACT', 'must be a JSON object', path);
  return value;
}

function assertKeys(record: JsonRecord, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) fail('UNKNOWN_FIELD', `unknown field '${key}'`, `${path}.${key}`);
  }
}

function requireKeys(record: JsonRecord, required: readonly string[], path: string): void {
  for (const key of required) {
    if (!(key in record)) fail('INVALID_CONTRACT', 'missing required field', `${path}.${key}`);
  }
}

function readString(record: JsonRecord, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) fail('INVALID_CONTRACT', 'must be a non-empty string', `${path}.${key}`);
  return value;
}

function readNullableString(record: JsonRecord, key: string, path: string): string | null {
  const value = record[key];
  if (value !== null && (typeof value !== 'string' || value.length === 0)) {
    fail('INVALID_CONTRACT', 'must be null or a non-empty string', `${path}.${key}`);
  }
  return value as string | null;
}

function readBoolean(record: JsonRecord, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') fail('INVALID_CONTRACT', 'must be a boolean', `${path}.${key}`);
  return value;
}

function readInteger(record: JsonRecord, key: string, path: string, maximum?: number): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail('INVALID_CONTRACT', 'must be a non-negative safe integer', `${path}.${key}`);
  }
  if (maximum !== undefined && value > maximum) fail('INVALID_CONTRACT', `must be <= ${maximum}`, `${path}.${key}`);
  return value;
}

function readNullableInteger(record: JsonRecord, key: string, path: string): number | null {
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    fail('INVALID_CONTRACT', 'must be null or a non-negative safe integer', `${path}.${key}`);
  }
  return value;
}

function readArray(record: JsonRecord, key: string, path: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) fail('INVALID_CONTRACT', 'must be an array', `${path}.${key}`);
  return value;
}

function readEnum<T extends string>(record: JsonRecord, key: string, values: readonly T[], path: string): T {
  const value = record[key];
  if (typeof value !== 'string' || !values.includes(value as T)) {
    fail('INVALID_CONTRACT', `must be one of ${values.join(', ')}`, `${path}.${key}`);
  }
  return value as T;
}

function readIdentifier(record: JsonRecord, key: string, path: string, prefix?: string): string {
  const value = readString(record, key, path);
  const pattern = prefix === undefined ? /^[a-z0-9][a-z0-9._:-]+$/ : new RegExp(`^${prefix}[a-z0-9][a-z0-9._:-]+$`);
  if (value.length > 128 || !pattern.test(value)) fail('INVALID_IDENTIFIER', 'has an invalid identifier format', `${path}.${key}`);
  return value;
}

function readDateTime(record: JsonRecord, key: string, path: string): string {
  const value = readString(record, key, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value))) {
    fail('INVALID_TIMESTAMP', 'must be an RFC 3339 UTC timestamp with milliseconds', `${path}.${key}`);
  }
  return value;
}

function readRepository(record: JsonRecord, key: string, path: string): string {
  const value = readString(record, key, path);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) fail('INVALID_CONTRACT', 'must use owner/repository form', `${path}.${key}`);
  return value;
}

function readCommitSha(record: JsonRecord, key: string, path: string): string {
  const value = readString(record, key, path);
  if (!/^[0-9a-f]{40}$/.test(value)) fail('INVALID_CONTRACT', 'must be a full lowercase 40-character commit SHA', `${path}.${key}`);
  return value;
}

function readRelativePath(record: JsonRecord, key: string, path: string): string {
  const value = readString(record, key, path);
  if (value.startsWith('/') || value.split('/').includes('..')) fail('INVALID_CONTRACT', 'must be a safe relative path', `${path}.${key}`);
  return value;
}

function readEvidenceId(record: JsonRecord, key: string, path: string): string {
  return readIdentifier(record, key, path, 'ev-');
}

function readProvenanceId(record: JsonRecord, key: string, path: string): string {
  return readIdentifier(record, key, path, 'prov-');
}

function parseEvidence(value: unknown, path: string): Evidence {
  const record = expectRecord(value, path);
  assertKeys(record, ['evidence_id', 'kind', 'url', 'external_id', 'repository', 'ref', 'commit_sha', 'observed_at', 'claim'], path);
  requireKeys(record, ['evidence_id', 'kind', 'observed_at', 'claim'], path);
  const evidence: Evidence = {
    evidence_id: readEvidenceId(record, 'evidence_id', path),
    kind: readEnum(record, 'kind', EVIDENCE_KINDS, path),
    observed_at: readDateTime(record, 'observed_at', path),
    claim: readString(record, 'claim', path),
  };
  if ('url' in record) {
    const url = readString(record, 'url', path);
    try {
      new URL(url);
    } catch {
      fail('INVALID_CONTRACT', 'must be an absolute evidence URL', `${path}.url`);
    }
    evidence.url = url;
  }
  if ('external_id' in record) evidence.external_id = readString(record, 'external_id', path);
  if (evidence.url === undefined && evidence.external_id === undefined) fail('MISSING_EVIDENCE', 'must include url or external_id', path);
  if ('repository' in record) evidence.repository = readRepository(record, 'repository', path);
  if ('ref' in record) evidence.ref = readString(record, 'ref', path);
  if ('commit_sha' in record) evidence.commit_sha = readCommitSha(record, 'commit_sha', path);
  return evidence;
}

function parseEvidenceIds(record: JsonRecord, key: string, path: string): string[] {
  const values = readArray(record, key, path);
  const ids = values.map((value, index) => {
    if (typeof value !== 'string') fail('INVALID_IDENTIFIER', 'must be an evidence ID', `${path}.${key}[${index}]`);
    if (!/^ev-[a-z0-9][a-z0-9._:-]+$/.test(value) || value.length > 128) fail('INVALID_IDENTIFIER', 'has an invalid evidence ID format', `${path}.${key}[${index}]`);
    return value;
  });
  if (new Set(ids).size !== ids.length) fail('INVALID_IDENTIFIER', 'contains duplicate evidence IDs', `${path}.${key}`);
  return ids;
}

function parseProvenance(value: unknown, path: string): Provenance {
  const record = expectRecord(value, path);
  assertKeys(record, ['provenance_id', 'repository', 'ref', 'commit_sha', 'artifact_path', 'role', 'evidence_ids'], path);
  requireKeys(record, ['provenance_id', 'repository', 'ref', 'commit_sha', 'artifact_path', 'role', 'evidence_ids'], path);
  return {
    provenance_id: readProvenanceId(record, 'provenance_id', path),
    repository: readRepository(record, 'repository', path),
    ref: readString(record, 'ref', path),
    commit_sha: readCommitSha(record, 'commit_sha', path),
    artifact_path: readRelativePath(record, 'artifact_path', path),
    role: readEnum(record, 'role', ['protocol-source', 'governance-proposal', 'governance-approval', 'deployment-record', 'gateway-observation', 'interface-observation'] as const, path),
    evidence_ids: parseEvidenceIds(record, 'evidence_ids', path),
  };
}

function parseObservation(value: unknown, path: string): ObservationWindow {
  const record = expectRecord(value, path);
  assertKeys(record, ['observed_at', 'expires_at', 'evidence_ids'], path);
  requireKeys(record, ['observed_at', 'expires_at', 'evidence_ids'], path);
  const evidenceIds = parseEvidenceIds(record, 'evidence_ids', path);
  if (evidenceIds.length === 0) fail('MISSING_EVIDENCE', 'observation must reference at least one evidence record', `${path}.evidence_ids`);
  return {
    observed_at: readDateTime(record, 'observed_at', path),
    expires_at: readDateTime(record, 'expires_at', path),
    evidence_ids: evidenceIds,
  };
}

function parsePolicyAuthority(value: unknown, path: string): PolicyAuthority {
  const record = expectRecord(value, path);
  assertKeys(record, ['kind', 'approval_status', 'owner_scope', 'provenance_id', 'approval_evidence_ids'], path);
  requireKeys(record, ['kind', 'approval_status', 'owner_scope', 'provenance_id', 'approval_evidence_ids'], path);
  const authority: PolicyAuthority = {
    kind: readEnum(record, 'kind', ['source', 'proposal', 'approved'] as const, path),
    approval_status: readEnum(record, 'approval_status', ['not-applicable', 'unratified', 'ratified', 'revoked', 'unresolved'] as const, path),
    owner_scope: 'protocol',
    provenance_id: readProvenanceId(record, 'provenance_id', path),
    approval_evidence_ids: parseEvidenceIds(record, 'approval_evidence_ids', path),
  };
  if (record.owner_scope !== 'protocol') fail('INVALID_AUTHORITY', 'only protocol authority is accepted', `${path}.owner_scope`);
  if (authority.kind === 'source' && (authority.approval_status !== 'not-applicable' || authority.approval_evidence_ids.length > 0)) {
    fail('INVALID_AUTHORITY', 'source evidence cannot carry ratification claims', path);
  }
  if (authority.kind === 'proposal' && (!['unratified', 'unresolved', 'revoked'].includes(authority.approval_status) || authority.approval_evidence_ids.length > 0)) {
    fail('INVALID_AUTHORITY', 'proposal evidence cannot be treated as ratified', path);
  }
  if (authority.kind === 'approved' && (authority.approval_status !== 'ratified' || authority.approval_evidence_ids.length === 0)) {
    fail('INVALID_AUTHORITY', 'approved authority requires ratified status and approval evidence', path);
  }
  return authority;
}

function parseAsset(value: unknown, path: string): Asset {
  const record = expectRecord(value, path);
  assertKeys(record, ['asset_id', 'decimals'], path);
  requireKeys(record, ['asset_id', 'decimals'], path);
  return {
    asset_id: readString(record, 'asset_id', path),
    decimals: readInteger(record, 'decimals', path, 38),
  };
}

function parseFeeBase(value: unknown, path: string): FeeBase {
  const record = expectRecord(value, path);
  assertKeys(record, ['kind', 'unit', 'asset'], path);
  requireKeys(record, ['kind', 'unit', 'asset'], path);
  const unit = record.unit;
  if (unit !== 'asset-smallest-units') fail('AMBIGUOUS_UNIT', 'fee base unit must be explicit asset-smallest-units', `${path}.unit`);
  return {
    kind: readEnum(record, 'kind', ['gross-volume', 'eligible-fee-base', 'transaction-amount'] as const, path),
    unit: 'asset-smallest-units',
    asset: parseAsset(record.asset, `${path}.asset`),
  };
}

function parseEffectiveWindow(value: unknown, path: string): EffectiveWindow {
  const record = expectRecord(value, path);
  assertKeys(record, ['status', 'start_burn_block_height', 'end_burn_block_height'], path);
  requireKeys(record, ['status', 'start_burn_block_height', 'end_burn_block_height'], path);
  const status = readEnum(record, 'status', ['exact', 'unresolved'] as const, path);
  const start = readNullableInteger(record, 'start_burn_block_height', path);
  const end = readNullableInteger(record, 'end_burn_block_height', path);
  if (status === 'exact' && (start === null || end === null)) fail('INVALID_SCHEDULE', 'exact windows require both start and end burn-block heights', path);
  if (status === 'unresolved' && (start !== null || end !== null)) fail('INVALID_SCHEDULE', 'unresolved windows must not include block boundaries', path);
  if (start !== null && end !== null && end < start) fail('INVALID_SCHEDULE', 'end height must not precede start height', path);
  return { status, start_burn_block_height: start, end_burn_block_height: end };
}

function parseFeePolicy(value: unknown, path: string): FeePolicy {
  const record = expectRecord(value, path);
  assertKeys(record, ['fee_base', 'denominator_bps', 'rates', 'schedule_status'], path);
  requireKeys(record, ['fee_base', 'denominator_bps', 'rates', 'schedule_status'], path);
  const denominator = readInteger(record, 'denominator_bps', path);
  if (denominator !== BPS_DENOMINATOR) fail('INVALID_DENOMINATOR', `must be ${BPS_DENOMINATOR}`, `${path}.denominator_bps`);
  const rates = readArray(record, 'rates', path).map((entry, index) => {
    const rateRecord = expectRecord(entry, `${path}.rates[${index}]`);
    assertKeys(rateRecord, ['label', 'rate_bps', 'denominator_bps', 'effective_window'], `${path}.rates[${index}]`);
    requireKeys(rateRecord, ['label', 'rate_bps', 'denominator_bps', 'effective_window'], `${path}.rates[${index}]`);
    const rateDenominator = readInteger(rateRecord, 'denominator_bps', `${path}.rates[${index}]`);
    if (rateDenominator !== BPS_DENOMINATOR) fail('INVALID_DENOMINATOR', `must be ${BPS_DENOMINATOR}`, `${path}.rates[${index}].denominator_bps`);
    return {
      label: readString(rateRecord, 'label', `${path}.rates[${index}]`),
      rate_bps: readInteger(rateRecord, 'rate_bps', `${path}.rates[${index}]`, BPS_DENOMINATOR),
      denominator_bps: BPS_DENOMINATOR,
      effective_window: parseEffectiveWindow(rateRecord.effective_window, `${path}.rates[${index}].effective_window`),
    };
  });
  if (rates.length === 0) fail('INVALID_CONTRACT', 'must contain at least one fee rate', `${path}.rates`);
  const scheduleStatus = readEnum(record, 'schedule_status', ['observed', 'resolved', 'unresolved'] as const, path);
  if (scheduleStatus === 'resolved' && rates.some((rate) => rate.effective_window.status !== 'exact')) {
    fail('INVALID_SCHEDULE', 'resolved fee policies require exact rate windows', `${path}.schedule_status`);
  }
  return {
    fee_base: parseFeeBase(record.fee_base, `${path}.fee_base`),
    denominator_bps: BPS_DENOMINATOR,
    rates,
    schedule_status: scheduleStatus,
  };
}

function parseBeneficiaryDisclosure(value: unknown, path: string): BeneficiaryDisclosure {
  const record = expectRecord(value, path);
  assertKeys(record, ['status', 'reference_kind', 'reference'], path);
  requireKeys(record, ['status', 'reference_kind', 'reference'], path);
  const status = readEnum(record, 'status', ['disclosed', 'not-disclosed', 'unresolved'] as const, path);
  const referenceKind = readEnum(record, 'reference_kind', ['evidence-id', 'repository-path', 'governance-record', 'on-chain-reference', 'not-applicable'] as const, path);
  const reference = readNullableString(record, 'reference', path);
  if (status === 'disclosed' && (reference === null || referenceKind === 'not-applicable')) {
    fail('INVALID_COMPENSATION', 'disclosed beneficiaries require a non-PII disclosure reference', path);
  }
  if (status === 'not-disclosed' && reference !== null) fail('INVALID_COMPENSATION', 'not-disclosed beneficiaries must not include a reference', path);
  return { status, reference_kind: referenceKind, reference };
}

function parseSchedule(value: unknown, path: string): CompensationSchedule {
  const record = expectRecord(value, path);
  assertKeys(record, ['status', 'entries'], path);
  requireKeys(record, ['status', 'entries'], path);
  const status = readEnum(record, 'status', ['resolved', 'unresolved'] as const, path);
  const entries = readArray(record, 'entries', path).map((entry, index) => {
    const entryPath = `${path}.entries[${index}]`;
    const entryRecord = expectRecord(entry, entryPath);
    assertKeys(entryRecord, ['schedule_id', 'rate_bps', 'denominator_bps', 'rate_basis', 'effective_window'], entryPath);
    requireKeys(entryRecord, ['schedule_id', 'rate_bps', 'denominator_bps', 'rate_basis', 'effective_window'], entryPath);
    const denominator = readInteger(entryRecord, 'denominator_bps', entryPath);
    if (denominator !== BPS_DENOMINATOR) fail('INVALID_DENOMINATOR', `must be ${BPS_DENOMINATOR}`, `${entryPath}.denominator_bps`);
    return {
      schedule_id: readIdentifier(entryRecord, 'schedule_id', entryPath),
      rate_bps: readInteger(entryRecord, 'rate_bps', entryPath, BPS_DENOMINATOR),
      denominator_bps: BPS_DENOMINATOR,
      rate_basis: readEnum(entryRecord, 'rate_basis', ['protocol-fee', 'gross-volume'] as const, entryPath),
      effective_window: parseEffectiveWindow(entryRecord.effective_window, `${entryPath}.effective_window`),
    };
  });
  if (status === 'resolved' && entries.length === 0) fail('INVALID_SCHEDULE', 'resolved schedules require at least one entry', path);
  if (status === 'unresolved' && entries.length > 0) fail('INVALID_SCHEDULE', 'unresolved compensation schedules must not contain candidate entries', path);
  return { status, entries };
}

function parseCompensationTrack(value: unknown, path: string): CompensationTrack {
  const record = expectRecord(value, path);
  assertKeys(record, ['status', 'beneficiary_disclosure', 'schedule', 'route_state'], path);
  requireKeys(record, ['status', 'beneficiary_disclosure', 'schedule', 'route_state'], path);
  return {
    status: readEnum(record, 'status', ['none-observed', 'proposed', 'approved', 'active', 'disabled', 'unresolved'] as const, path),
    beneficiary_disclosure: parseBeneficiaryDisclosure(record.beneficiary_disclosure, `${path}.beneficiary_disclosure`),
    schedule: parseSchedule(record.schedule, `${path}.schedule`),
    route_state: readEnum(record, 'route_state', ['not-configured', 'declared', 'verified', 'blocked', 'unresolved'] as const, path),
  };
}

function parseCompensation(value: unknown, path: string): Compensation {
  const record = expectRecord(value, path);
  assertKeys(record, ['founder', 'builder'], path);
  requireKeys(record, ['founder', 'builder'], path);
  return {
    founder: parseCompensationTrack(record.founder, `${path}.founder`),
    builder: parseCompensationTrack(record.builder, `${path}.builder`),
  };
}

function parseDeployment(value: unknown, path: string): Deployment {
  const record = expectRecord(value, path);
  assertKeys(record, ['stage', 'environment', 'source_provenance_id', 'transaction_id', 'confirmed_burn_block_height', 'evidence_ids', 'interface_evidence_ids'], path);
  requireKeys(record, ['stage', 'environment', 'source_provenance_id', 'transaction_id', 'confirmed_burn_block_height', 'evidence_ids', 'interface_evidence_ids'], path);
  return {
    stage: readEnum(record, 'stage', DEPLOYMENT_STAGES, path),
    environment: readEnum(record, 'environment', ['mainnet', 'testnet', 'simnet', 'unknown'] as const, path),
    source_provenance_id: readProvenanceId(record, 'source_provenance_id', path),
    transaction_id: readNullableString(record, 'transaction_id', path),
    confirmed_burn_block_height: readNullableInteger(record, 'confirmed_burn_block_height', path),
    evidence_ids: parseEvidenceIds(record, 'evidence_ids', path),
    interface_evidence_ids: parseEvidenceIds(record, 'interface_evidence_ids', path),
  };
}

function parseRouteEndpoint(value: unknown, path: string): RouteEndpoint {
  const record = expectRecord(value, path);
  assertKeys(record, ['reference', 'owner_scope', 'authorization', 'evidence_ids'], path);
  requireKeys(record, ['reference', 'owner_scope', 'authorization', 'evidence_ids'], path);
  if (record.owner_scope !== 'protocol') fail('COLLECTOR_SUBSTITUTION', 'collector, distributor, and source routes must remain protocol-owned', `${path}.owner_scope`);
  return {
    reference: readString(record, 'reference', path),
    owner_scope: 'protocol',
    authorization: readEnum(record, 'authorization', ['declared', 'verified', 'unverified', 'missing'] as const, path),
    evidence_ids: parseEvidenceIds(record, 'evidence_ids', path),
  };
}

function parseRouting(value: unknown, path: string): Routing {
  const record = expectRecord(value, path);
  assertKeys(record, ['collector', 'distributor', 'authorized_sources', 'platform_substitution'], path);
  requireKeys(record, ['collector', 'distributor', 'authorized_sources', 'platform_substitution'], path);
  if (record.platform_substitution !== false) fail('COLLECTOR_SUBSTITUTION', 'platform substitution must always be false', `${path}.platform_substitution`);
  const sources = readArray(record, 'authorized_sources', path).map((source, index) => parseRouteEndpoint(source, `${path}.authorized_sources[${index}]`));
  if (sources.length === 0) fail('INVALID_ROUTING', 'at least one authorized source must be observed', `${path}.authorized_sources`);
  return {
    collector: parseRouteEndpoint(record.collector, `${path}.collector`),
    distributor: parseRouteEndpoint(record.distributor, `${path}.distributor`),
    authorized_sources: sources,
    platform_substitution: false,
  };
}

function parseAnchor(value: unknown, path: string): BitcoinAnchor {
  const record = expectRecord(value, path);
  assertKeys(record, ['bitcoin_burn_block_height', 'observed_at', 'evidence_id'], path);
  requireKeys(record, ['bitcoin_burn_block_height', 'observed_at', 'evidence_id'], path);
  return {
    bitcoin_burn_block_height: readInteger(record, 'bitcoin_burn_block_height', path),
    observed_at: readDateTime(record, 'observed_at', path),
    evidence_id: readEvidenceId(record, 'evidence_id', path),
  };
}

function parsePayout(value: unknown, path: string): Payout {
  const record = expectRecord(value, path);
  assertKeys(record, ['route_state', 'payout_enabled', 'evidence_ids', 'reason'], path);
  requireKeys(record, ['route_state', 'payout_enabled', 'evidence_ids', 'reason'], path);
  return {
    route_state: readEnum(record, 'route_state', ['not-configured', 'declared', 'verified', 'blocked', 'unresolved'] as const, path),
    payout_enabled: readBoolean(record, 'payout_enabled', path),
    evidence_ids: parseEvidenceIds(record, 'evidence_ids', path),
    reason: readNullableString(record, 'reason', path),
  };
}

function parseRoot(value: unknown): ProtocolRevenueObservation {
  const record = expectRecord(value, 'observation');
  assertKeys(record, ['schema', 'version', 'observation_id', 'observation', 'policy_authority', 'provenance', 'fee_policy', 'compensation', 'deployment', 'routing', 'anchor', 'payout', 'custody_claim', 'evidence'], 'observation');
  requireKeys(record, ['schema', 'version', 'observation_id', 'observation', 'policy_authority', 'provenance', 'fee_policy', 'compensation', 'deployment', 'routing', 'anchor', 'payout', 'custody_claim', 'evidence'], 'observation');
  if (record.schema !== PROTOCOL_REVENUE_OBSERVATION_SCHEMA) fail('INVALID_VERSION', `schema must be '${PROTOCOL_REVENUE_OBSERVATION_SCHEMA}'`, 'observation.schema');
  const version = readString(record, 'version', 'observation');
  if (version !== PROTOCOL_REVENUE_OBSERVATION_VERSION) fail('INVALID_VERSION', `version must be '${PROTOCOL_REVENUE_OBSERVATION_VERSION}'`, 'observation.version');
  if (record.custody_claim !== false) fail('CUSTODY_CLAIM', 'platform observations must always state custody_claim=false', 'observation.custody_claim');
  const evidenceValues = readArray(record, 'evidence', 'observation');
  if (evidenceValues.length === 0) fail('MISSING_EVIDENCE', 'at least one evidence record is required', 'observation.evidence');
  return {
    schema: PROTOCOL_REVENUE_OBSERVATION_SCHEMA,
    version,
    observation_id: readIdentifier(record, 'observation_id', 'observation'),
    observation: parseObservation(record.observation, 'observation.observation'),
    policy_authority: parsePolicyAuthority(record.policy_authority, 'observation.policy_authority'),
    provenance: readArray(record, 'provenance', 'observation').map((entry, index) => parseProvenance(entry, `observation.provenance[${index}]`)),
    fee_policy: parseFeePolicy(record.fee_policy, 'observation.fee_policy'),
    compensation: parseCompensation(record.compensation, 'observation.compensation'),
    deployment: parseDeployment(record.deployment, 'observation.deployment'),
    routing: parseRouting(record.routing, 'observation.routing'),
    anchor: parseAnchor(record.anchor, 'observation.anchor'),
    payout: parsePayout(record.payout, 'observation.payout'),
    custody_claim: false,
    evidence: evidenceValues.map((entry, index) => parseEvidence(entry, `observation.evidence[${index}]`)),
  };
}

function milliseconds(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail('INVALID_TIMESTAMP', 'must be a valid timestamp');
  return parsed;
}

function assertReferencedIdsExist(ids: readonly string[], evidence: ReadonlyMap<string, Evidence>, path: string): void {
  for (const id of ids) {
    if (!evidence.has(id)) fail('MISSING_EVIDENCE', `references unknown evidence '${id}'`, path);
  }
}

function assertFreshEvidence(observation: ProtocolRevenueObservation, options: ObservationValidationOptions, evidence: ReadonlyMap<string, Evidence>): void {
  const now = milliseconds(options.now);
  const observedAt = milliseconds(observation.observation.observed_at);
  const expiresAt = milliseconds(observation.observation.expires_at);
  if (expiresAt <= observedAt) fail('INVALID_TIMESTAMP', 'observation expiry must be after observation time', 'observation.observation.expires_at');
  if (expiresAt <= now) fail('STALE_EVIDENCE', 'observation evidence window has expired', 'observation.observation.expires_at');
  if (observedAt > now) fail('INVALID_TIMESTAMP', 'observation cannot be from the future', 'observation.observation.observed_at');
  const maxAgeSeconds = options.maxEvidenceAgeSeconds ?? DEFAULT_MAX_EVIDENCE_AGE_SECONDS;
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds <= 0) fail('INVALID_TIMESTAMP', 'maxEvidenceAgeSeconds must be a positive safe integer');
  for (const item of evidence.values()) {
    const itemTime = milliseconds(item.observed_at);
    if (itemTime > observedAt || itemTime > now) fail('INVALID_TIMESTAMP', 'evidence cannot be newer than the snapshot or current time', `evidence.${item.evidence_id}.observed_at`);
    if (now - itemTime > maxAgeSeconds * 1000) fail('STALE_EVIDENCE', 'evidence exceeds the allowed observation age', `evidence.${item.evidence_id}.observed_at`);
  }
}

function assertEvidenceKinds(ids: readonly string[], allowedKinds: readonly EvidenceKind[], evidence: ReadonlyMap<string, Evidence>, path: string): void {
  for (const id of ids) {
    const item = evidence.get(id);
    if (item === undefined) fail('MISSING_EVIDENCE', `references unknown evidence '${id}'`, path);
    if (!allowedKinds.includes(item.kind)) fail('INVALID_CONTRACT', `evidence '${id}' has kind '${item.kind}', expected ${allowedKinds.join(', ')}`, path);
  }
}

function assertExactSchedule(schedule: CompensationSchedule, path: string): void {
  if (schedule.status !== 'resolved' || schedule.entries.length === 0) fail('INVALID_SCHEDULE', 'active compensation requires a resolved, non-empty schedule', path);
  const entries = [...schedule.entries].sort((left, right) => (left.effective_window.start_burn_block_height ?? 0) - (right.effective_window.start_burn_block_height ?? 0));
  let previousEnd: number | null = null;
  for (const entry of entries) {
    const window = entry.effective_window;
    if (window.status !== 'exact' || window.start_burn_block_height === null) fail('INVALID_SCHEDULE', 'active compensation requires exact burn-block boundaries', path);
    if (previousEnd !== null && window.start_burn_block_height <= previousEnd) fail('INVALID_SCHEDULE', 'compensation schedule windows must not overlap', path);
    if (window.end_burn_block_height === null && entry !== entries[entries.length - 1]) fail('INVALID_SCHEDULE', 'an open-ended compensation window must be the final entry', path);
    previousEnd = window.end_burn_block_height;
  }
}

function assertDeploymentEvidence(observation: ProtocolRevenueObservation, evidence: ReadonlyMap<string, Evidence>): void {
  const { deployment } = observation;
  assertReferencedIdsExist(deployment.evidence_ids, evidence, 'observation.deployment.evidence_ids');
  assertReferencedIdsExist(deployment.interface_evidence_ids, evidence, 'observation.deployment.interface_evidence_ids');
  if (deployment.evidence_ids.length === 0) fail('INVALID_DEPLOYMENT', `${deployment.stage} requires stage evidence`, 'observation.deployment.evidence_ids');
  if (deployment.stage === 'source-only' || deployment.stage === 'plan' || deployment.stage === 'preflight') {
    if (deployment.transaction_id !== null || deployment.confirmed_burn_block_height !== null || deployment.interface_evidence_ids.length > 0) {
      fail('INVALID_DEPLOYMENT', `${deployment.stage} cannot carry broadcast, confirmation, or interface evidence`, 'observation.deployment');
    }
    const expectedKind: EvidenceKind = deployment.stage === 'source-only'
      ? 'source'
      : deployment.stage === 'plan'
        ? 'deployment-plan'
        : 'deployment-preflight';
    assertEvidenceKinds(deployment.evidence_ids, [expectedKind], evidence, 'observation.deployment.evidence_ids');
    return;
  }
  if (deployment.evidence_ids.length === 0) fail('INVALID_DEPLOYMENT', `${deployment.stage} requires deployment evidence`, 'observation.deployment.evidence_ids');
  if (deployment.transaction_id === null) fail('INVALID_DEPLOYMENT', `${deployment.stage} requires a broadcast transaction reference`, 'observation.deployment.transaction_id');
  if (deployment.stage === 'broadcast') {
    if (deployment.confirmed_burn_block_height !== null) fail('INVALID_DEPLOYMENT', 'broadcast cannot claim confirmation', 'observation.deployment.confirmed_burn_block_height');
    assertEvidenceKinds(deployment.evidence_ids, ['deployment-broadcast'], evidence, 'observation.deployment.evidence_ids');
    if (deployment.interface_evidence_ids.length > 0) fail('INVALID_DEPLOYMENT', 'broadcast cannot claim interface verification', 'observation.deployment.interface_evidence_ids');
    return;
  }
  if (deployment.confirmed_burn_block_height === null) fail('INVALID_DEPLOYMENT', `${deployment.stage} requires a confirmed Bitcoin burn-block height`, 'observation.deployment.confirmed_burn_block_height');
  assertEvidenceKinds(deployment.evidence_ids, ['deployment-confirmation'], evidence, 'observation.deployment.evidence_ids');
  if (deployment.stage === 'confirmed' && deployment.interface_evidence_ids.length > 0) fail('INVALID_DEPLOYMENT', 'confirmed status cannot claim live interface verification', 'observation.deployment.interface_evidence_ids');
  if (deployment.stage === 'live-interface-verified') {
    if (deployment.interface_evidence_ids.length === 0) fail('INVALID_DEPLOYMENT', 'live status requires interface/source evidence', 'observation.deployment.interface_evidence_ids');
    assertEvidenceKinds(deployment.interface_evidence_ids, ['interface-verification', 'source'], evidence, 'observation.deployment.interface_evidence_ids');
  }
}

function assertProvenance(observation: ProtocolRevenueObservation, evidence: ReadonlyMap<string, Evidence>): ReadonlyMap<string, Provenance> {
  const byId = new Map<string, Provenance>();
  for (const item of observation.provenance) {
    if (byId.has(item.provenance_id)) fail('INVALID_IDENTIFIER', `duplicate provenance '${item.provenance_id}'`, 'observation.provenance');
    byId.set(item.provenance_id, item);
    assertReferencedIdsExist(item.evidence_ids, evidence, `provenance.${item.provenance_id}.evidence_ids`);
  }
  if (byId.size === 0) fail('MISSING_EVIDENCE', 'at least one repository/ref/commit provenance record is required', 'observation.provenance');
  const authority = byId.get(observation.policy_authority.provenance_id);
  if (authority === undefined) fail('MISSING_EVIDENCE', 'policy authority references unknown provenance', 'observation.policy_authority.provenance_id');
  const source = byId.get(observation.deployment.source_provenance_id);
  if (source === undefined) fail('MISSING_EVIDENCE', 'deployment references unknown source provenance', 'observation.deployment.source_provenance_id');
  if (source.role !== 'protocol-source') fail('INVALID_DEPLOYMENT', 'deployment source provenance must identify protocol source code', 'observation.deployment.source_provenance_id');
  if (observation.policy_authority.kind === 'approved' && authority.role !== 'governance-approval') fail('INVALID_AUTHORITY', 'approved policy authority must point to governance approval provenance', 'observation.policy_authority.provenance_id');
  if (observation.policy_authority.kind === 'proposal' && authority.role !== 'governance-proposal') fail('INVALID_AUTHORITY', 'proposal authority must point to governance proposal provenance', 'observation.policy_authority.provenance_id');
  if (observation.policy_authority.kind === 'source' && authority.role !== 'protocol-source') fail('INVALID_AUTHORITY', 'source authority must point to protocol source provenance', 'observation.policy_authority.provenance_id');
  return byId;
}

function assertEndpointEvidence(
  endpoint: RouteEndpoint,
  evidence: ReadonlyMap<string, Evidence>,
  path: string,
  allowedKinds: readonly EvidenceKind[],
): void {
  assertReferencedIdsExist(endpoint.evidence_ids, evidence, `${path}.evidence_ids`);
  if (endpoint.authorization === 'verified') assertEvidenceKinds(endpoint.evidence_ids, allowedKinds, evidence, `${path}.evidence_ids`);
}

function assertCompensationGate(
  track: CompensationTrack,
  name: 'founder' | 'builder',
  observation: ProtocolRevenueObservation,
  evidence: ReadonlyMap<string, Evidence>,
): void {
  if (track.status === 'active') {
    if (observation.policy_authority.kind !== 'approved' || observation.policy_authority.approval_status !== 'ratified') {
      fail('INVALID_COMPENSATION', `${name} compensation cannot be active under proposed, source-only, or unratified authority`, `observation.compensation.${name}.status`);
    }
    assertExactSchedule(track.schedule, `observation.compensation.${name}.schedule`);
    if (track.route_state !== 'verified') fail('INVALID_COMPENSATION', 'active compensation requires a verified route', `observation.compensation.${name}.route_state`);
    if (track.beneficiary_disclosure.status !== 'disclosed') fail('INVALID_COMPENSATION', 'active compensation requires a disclosure reference without embedding PII', `observation.compensation.${name}.beneficiary_disclosure`);
    if (track.beneficiary_disclosure.reference_kind === 'evidence-id') {
      if (track.beneficiary_disclosure.reference === null || !evidence.has(track.beneficiary_disclosure.reference)) fail('MISSING_EVIDENCE', 'beneficiary disclosure reference must resolve to evidence', `observation.compensation.${name}.beneficiary_disclosure.reference`);
    }
    if (track.schedule.entries.some((entry) => entry.rate_basis === 'gross-volume' && entry.rate_bps > BPS_DENOMINATOR)) {
      fail('INVALID_COMPENSATION', 'compensation rate cannot exceed its explicit bps denominator', `observation.compensation.${name}.schedule`);
    }
  }
  if (track.status === 'approved' && (observation.policy_authority.kind !== 'approved' || observation.policy_authority.approval_status !== 'ratified')) {
    fail('INVALID_COMPENSATION', `${name} compensation cannot be approved under non-ratified authority`, `observation.compensation.${name}.status`);
  }
}

function assertPayoutGate(observation: ProtocolRevenueObservation, evidence: ReadonlyMap<string, Evidence>): void {
  if (!observation.payout.payout_enabled) return;
  if (observation.deployment.stage !== 'live-interface-verified') fail('PAYOUT_NOT_ELIGIBLE', 'source, plan, preflight, broadcast, and confirmed stages cannot enable payout', 'observation.payout.payout_enabled');
  if (observation.policy_authority.kind !== 'approved' || observation.policy_authority.approval_status !== 'ratified') fail('PAYOUT_NOT_ELIGIBLE', 'payout requires ratified protocol authority', 'observation.payout.payout_enabled');
  if (observation.fee_policy.schedule_status !== 'resolved' || observation.fee_policy.rates.some((rate) => rate.effective_window.status !== 'exact')) fail('PAYOUT_NOT_ELIGIBLE', 'payout requires resolved fee schedule boundaries', 'observation.fee_policy.schedule_status');
  if (observation.payout.route_state !== 'verified') fail('PAYOUT_NOT_ELIGIBLE', 'payout requires a verified route state', 'observation.payout.route_state');
  if (observation.compensation.founder.status !== 'active' && observation.compensation.builder.status !== 'active') fail('PAYOUT_NOT_ELIGIBLE', 'payout requires at least one active compensation track', 'observation.payout.payout_enabled');
  if (observation.routing.collector.authorization !== 'verified' || observation.routing.distributor.authorization !== 'verified') fail('PAYOUT_NOT_ELIGIBLE', 'collector and distributor authorization must be verified', 'observation.routing');
  if (observation.routing.authorized_sources.some((source) => source.authorization !== 'verified')) fail('PAYOUT_NOT_ELIGIBLE', 'all authorized sources must be verified', 'observation.routing.authorized_sources');
  assertEvidenceKinds(observation.payout.evidence_ids, ['route-verification', 'interface-verification', 'approval'], evidence, 'observation.payout.evidence_ids');
}

export function validateProtocolRevenueObservation(value: unknown, options: ObservationValidationOptions): ProtocolRevenueObservation {
  const observation = parseRoot(value);
  const evidenceById = new Map<string, Evidence>();
  for (const item of observation.evidence) {
    if (evidenceById.has(item.evidence_id)) fail('INVALID_IDENTIFIER', `duplicate evidence '${item.evidence_id}'`, 'observation.evidence');
    evidenceById.set(item.evidence_id, item);
  }
  assertReferencedIdsExist(observation.observation.evidence_ids, evidenceById, 'observation.observation.evidence_ids');
  assertReferencedIdsExist([observation.anchor.evidence_id], evidenceById, 'observation.anchor.evidence_id');
  assertReferencedIdsExist(observation.policy_authority.approval_evidence_ids, evidenceById, 'observation.policy_authority.approval_evidence_ids');
  assertReferencedIdsExist(observation.deployment.evidence_ids, evidenceById, 'observation.deployment.evidence_ids');
  assertReferencedIdsExist(observation.deployment.interface_evidence_ids, evidenceById, 'observation.deployment.interface_evidence_ids');
  assertReferencedIdsExist(observation.routing.collector.evidence_ids, evidenceById, 'observation.routing.collector.evidence_ids');
  assertReferencedIdsExist(observation.routing.distributor.evidence_ids, evidenceById, 'observation.routing.distributor.evidence_ids');
  for (const [index, source] of observation.routing.authorized_sources.entries()) assertReferencedIdsExist(source.evidence_ids, evidenceById, `observation.routing.authorized_sources[${index}].evidence_ids`);
  assertReferencedIdsExist(observation.payout.evidence_ids, evidenceById, 'observation.payout.evidence_ids');
  assertFreshEvidence(observation, options, evidenceById);
  assertProvenance(observation, evidenceById);
  assertDeploymentEvidence(observation, evidenceById);
  assertEndpointEvidence(observation.routing.collector, evidenceById, 'observation.routing.collector', ['collector-authorization', 'route-verification', 'interface-verification']);
  assertEndpointEvidence(observation.routing.distributor, evidenceById, 'observation.routing.distributor', ['route-verification', 'interface-verification']);
  for (const [index, source] of observation.routing.authorized_sources.entries()) assertEndpointEvidence(source, evidenceById, `observation.routing.authorized_sources[${index}]`, ['source-authorization', 'route-verification', 'interface-verification']);
  assertCompensationGate(observation.compensation.founder, 'founder', observation, evidenceById);
  assertCompensationGate(observation.compensation.builder, 'builder', observation, evidenceById);
  assertPayoutGate(observation, evidenceById);
  return observation;
}
