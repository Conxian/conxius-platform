import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  BPS_DENOMINATOR,
  ProtocolRevenueObservationError,
  type ProtocolRevenueObservation,
  validateProtocolRevenueObservation,
} from './protocol-revenue-observation';

const NOW = '2026-07-22T12:00:00.000Z';
const EXPIRES = '2026-07-22T13:00:00.000Z';
const COMMIT_SOURCE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const COMMIT_GOVERNANCE = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const COMMIT_DEPLOYMENT = 'cccccccccccccccccccccccccccccccccccccccc';

function evidence(
  evidenceId: string,
  kind: ProtocolRevenueObservation['evidence'][number]['kind'],
  claim: string,
  externalId = evidenceId,
): ProtocolRevenueObservation['evidence'][number] {
  return {
    evidence_id: evidenceId,
    kind,
    external_id: externalId,
    observed_at: NOW,
    claim,
  };
}

function observedSnapshot(): ProtocolRevenueObservation {
  return {
    schema: 'conxian.protocol-revenue-observation.v1',
    version: '1.0.0',
    observation_id: 'observation-source-1168',
    observation: {
      observed_at: NOW,
      expires_at: EXPIRES,
      evidence_ids: ['ev-source', 'ev-anchor'],
    },
    policy_authority: {
      kind: 'source',
      approval_status: 'not-applicable',
      owner_scope: 'protocol',
      provenance_id: 'prov-source',
      approval_evidence_ids: [],
    },
    provenance: [
      {
        provenance_id: 'prov-source',
        repository: 'Conxian/Conxian',
        ref: 'refs/heads/main',
        commit_sha: COMMIT_SOURCE,
        artifact_path: 'contracts/treasury/revenue-automation.clar',
        role: 'protocol-source',
        evidence_ids: ['ev-source'],
      },
    ],
    fee_policy: {
      fee_base: {
        kind: 'eligible-fee-base',
        unit: 'asset-smallest-units',
        asset: { asset_id: 'stx', decimals: 6 },
      },
      denominator_bps: BPS_DENOMINATOR,
      rates: [
        {
          label: 'observed-implementation-baseline',
          rate_bps: 100,
          denominator_bps: BPS_DENOMINATOR,
          effective_window: {
            status: 'unresolved',
            start_burn_block_height: null,
            end_burn_block_height: null,
          },
        },
      ],
      schedule_status: 'observed',
    },
    compensation: {
      founder: {
        status: 'unresolved',
        beneficiary_disclosure: {
          status: 'unresolved',
          reference_kind: 'not-applicable',
          reference: null,
        },
        schedule: { status: 'unresolved', entries: [] },
        route_state: 'unresolved',
      },
      builder: {
        status: 'none-observed',
        beneficiary_disclosure: {
          status: 'not-disclosed',
          reference_kind: 'not-applicable',
          reference: null,
        },
        schedule: { status: 'unresolved', entries: [] },
        route_state: 'not-configured',
      },
    },
    deployment: {
      stage: 'source-only',
      environment: 'mainnet',
      source_provenance_id: 'prov-source',
      transaction_id: null,
      confirmed_burn_block_height: null,
      evidence_ids: ['ev-source'],
      interface_evidence_ids: [],
    },
    routing: {
      collector: {
        reference: '.protocol-fee-collector',
        owner_scope: 'protocol',
        authorization: 'declared',
        evidence_ids: ['ev-source'],
      },
      distributor: {
        reference: '.revenue-distributor',
        owner_scope: 'protocol',
        authorization: 'declared',
        evidence_ids: ['ev-source'],
      },
      authorized_sources: [
        {
          reference: '.revenue-automation',
          owner_scope: 'protocol',
          authorization: 'declared',
          evidence_ids: ['ev-source'],
        },
      ],
      platform_substitution: false,
    },
    anchor: {
      bitcoin_burn_block_height: 0,
      observed_at: NOW,
      evidence_id: 'ev-anchor',
    },
    payout: {
      route_state: 'blocked',
      payout_enabled: false,
      evidence_ids: ['ev-source'],
      reason: 'Founder-rights authority, deployment, and payout evidence are unresolved.',
    },
    custody_claim: false,
    evidence: [
      evidence('ev-source', 'source', 'Protocol source contains the observed implementation baseline.'),
      evidence('ev-anchor', 'burn-anchor', 'Observation is anchored to an explicitly observed Bitcoin burn-block height.'),
    ],
  };
}

function activeSnapshot(): ProtocolRevenueObservation {
  return {
    schema: 'conxian.protocol-revenue-observation.v1',
    version: '1.0.0',
    observation_id: 'observation-active-fixture',
    observation: {
      observed_at: NOW,
      expires_at: EXPIRES,
      evidence_ids: ['ev-source', 'ev-approval', 'ev-confirmation', 'ev-interface', 'ev-anchor'],
    },
    policy_authority: {
      kind: 'approved',
      approval_status: 'ratified',
      owner_scope: 'protocol',
      provenance_id: 'prov-approval',
      approval_evidence_ids: ['ev-approval'],
    },
    provenance: [
      {
        provenance_id: 'prov-source',
        repository: 'Conxian/Conxian',
        ref: 'refs/heads/main',
        commit_sha: COMMIT_SOURCE,
        artifact_path: 'contracts/treasury/revenue-automation.clar',
        role: 'protocol-source',
        evidence_ids: ['ev-source'],
      },
      {
        provenance_id: 'prov-approval',
        repository: 'Conxian/Conxian',
        ref: 'refs/heads/main',
        commit_sha: COMMIT_GOVERNANCE,
        artifact_path: 'governance/approved-founder-rights.md',
        role: 'governance-approval',
        evidence_ids: ['ev-approval'],
      },
      {
        provenance_id: 'prov-proposal',
        repository: 'Conxian/Conxian',
        ref: 'refs/heads/main',
        commit_sha: COMMIT_GOVERNANCE,
        artifact_path: 'governance/proposed-founder-rights.md',
        role: 'governance-proposal',
        evidence_ids: ['ev-proposal'],
      },
      {
        provenance_id: 'prov-deployment',
        repository: 'Conxian/Conxian',
        ref: 'refs/heads/main',
        commit_sha: COMMIT_DEPLOYMENT,
        artifact_path: 'deployments/mainnet-manifest-v1.yaml',
        role: 'deployment-record',
        evidence_ids: ['ev-confirmation'],
      },
    ],
    fee_policy: {
      fee_base: {
        kind: 'eligible-fee-base',
        unit: 'asset-smallest-units',
        asset: { asset_id: 'stx', decimals: 6 },
      },
      denominator_bps: BPS_DENOMINATOR,
      rates: [
        {
          label: 'approved-fee-window',
          rate_bps: 100,
          denominator_bps: BPS_DENOMINATOR,
          effective_window: {
            status: 'exact',
            start_burn_block_height: 1000,
            end_burn_block_height: 1999,
          },
        },
      ],
      schedule_status: 'resolved',
    },
    compensation: {
      founder: {
        status: 'active',
        beneficiary_disclosure: {
          status: 'disclosed',
          reference_kind: 'evidence-id',
          reference: 'ev-beneficiary',
        },
        schedule: {
          status: 'resolved',
          entries: [
            {
              schedule_id: 'founder-window-1',
              rate_bps: 250,
              denominator_bps: BPS_DENOMINATOR,
              rate_basis: 'protocol-fee',
              effective_window: {
                status: 'exact',
                start_burn_block_height: 1000,
                end_burn_block_height: 1999,
              },
            },
          ],
        },
        route_state: 'verified',
      },
      builder: {
        status: 'none-observed',
        beneficiary_disclosure: {
          status: 'not-disclosed',
          reference_kind: 'not-applicable',
          reference: null,
        },
        schedule: { status: 'unresolved', entries: [] },
        route_state: 'not-configured',
      },
    },
    deployment: {
      stage: 'live-interface-verified',
      environment: 'mainnet',
      source_provenance_id: 'prov-source',
      transaction_id: '0xconfirmed-contract-publish',
      confirmed_burn_block_height: 1200,
      evidence_ids: ['ev-confirmation'],
      interface_evidence_ids: ['ev-interface'],
    },
    routing: {
      collector: {
        reference: '.protocol-fee-collector',
        owner_scope: 'protocol',
        authorization: 'verified',
        evidence_ids: ['ev-collector'],
      },
      distributor: {
        reference: '.revenue-distributor',
        owner_scope: 'protocol',
        authorization: 'verified',
        evidence_ids: ['ev-distributor'],
      },
      authorized_sources: [
        {
          reference: '.revenue-automation',
          owner_scope: 'protocol',
          authorization: 'verified',
          evidence_ids: ['ev-source-auth'],
        },
      ],
      platform_substitution: false,
    },
    anchor: {
      bitcoin_burn_block_height: 1200,
      observed_at: NOW,
      evidence_id: 'ev-anchor',
    },
    payout: {
      route_state: 'verified',
      payout_enabled: true,
      evidence_ids: ['ev-route'],
      reason: null,
    },
    custody_claim: false,
    evidence: [
      evidence('ev-source', 'source', 'Protocol source evidence.'),
      evidence('ev-approval', 'approval', 'Synthetic ratification evidence for validator coverage.'),
      evidence('ev-proposal', 'proposal', 'Synthetic proposal evidence for unratified rejection coverage.'),
      evidence('ev-confirmation', 'deployment-confirmation', 'Synthetic confirmed deployment evidence.'),
      evidence('ev-interface', 'interface-verification', 'Synthetic live interface/source evidence.'),
      evidence('ev-collector', 'collector-authorization', 'Synthetic protocol collector authorization evidence.'),
      evidence('ev-distributor', 'route-verification', 'Synthetic protocol distributor route evidence.'),
      evidence('ev-source-auth', 'source-authorization', 'Synthetic authorized source evidence.'),
      evidence('ev-route', 'route-verification', 'Synthetic payout route verification evidence.'),
      evidence('ev-beneficiary', 'governance', 'Synthetic non-PII beneficiary disclosure reference.'),
      evidence('ev-anchor', 'burn-anchor', 'Synthetic Bitcoin burn-block observation evidence.'),
    ],
  };
}

function cloneSnapshot(snapshot: ProtocolRevenueObservation): Record<string, unknown> {
  return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
}

function recordAt(root: Record<string, unknown>, path: readonly string[]): Record<string, unknown> {
  let current: unknown = root;
  for (const key of path) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) throw new Error(`not a record at ${key}`);
    current = (current as Record<string, unknown>)[key];
  }
  if (current === null || typeof current !== 'object' || Array.isArray(current)) throw new Error(`not a record at ${path.join('.')}`);
  return current as Record<string, unknown>;
}

function appendEvidence(root: Record<string, unknown>, item: ProtocolRevenueObservation['evidence'][number]): void {
  const evidence = root.evidence;
  if (!Array.isArray(evidence)) throw new Error('fixture evidence must be an array');
  evidence.push(item);
}

function expectCode(value: unknown, code: ProtocolRevenueObservationError['code']): void {
  assert.throws(
    () => validateProtocolRevenueObservation(value, { now: NOW }),
    (error: unknown) => error instanceof ProtocolRevenueObservationError && error.code === code,
  );
}

test('accepts a source-only observed snapshot without treating founder rights as active', () => {
  const snapshot = observedSnapshot();
  const validated = validateProtocolRevenueObservation(snapshot, { now: NOW });
  assert.equal(validated.payout.payout_enabled, false);
  assert.equal(validated.policy_authority.kind, 'source');
  assert.equal(validated.compensation.founder.status, 'unresolved');
});

test('accepts a fully evidenced synthetic active snapshot only when every gate is explicit', () => {
  const validated = validateProtocolRevenueObservation(activeSnapshot(), { now: NOW });
  assert.equal(validated.deployment.stage, 'live-interface-verified');
  assert.equal(validated.payout.payout_enabled, true);
  assert.equal(validated.compensation.founder.schedule.entries[0]?.rate_bps, 250);
});

test('compiles the checked-in Draft 2020-12 schema and validates representative snapshots', () => {
  const schema = JSON.parse(readFileSync(resolve(process.cwd(), 'schemas/protocol-revenue-observation.schema.json'), 'utf8')) as Record<string, unknown>;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(observedSnapshot()), true, JSON.stringify(validate.errors));
  assert.equal(validate(activeSnapshot()), true, JSON.stringify(validate.errors));
});

test('rejects ambiguous fee units instead of inferring a denominator or asset unit', () => {
  const snapshot = cloneSnapshot(observedSnapshot());
  recordAt(snapshot, ['fee_policy', 'fee_base']).unit = 'unresolved';
  expectCode(snapshot, 'AMBIGUOUS_UNIT');
});

test('rejects missing observation evidence and unknown evidence references', () => {
  const missing = cloneSnapshot(observedSnapshot());
  recordAt(missing, ['observation']).evidence_ids = [];
  expectCode(missing, 'MISSING_EVIDENCE');

  const unknown = cloneSnapshot(observedSnapshot());
  recordAt(unknown, ['observation']).evidence_ids = ['ev-does-not-exist'];
  expectCode(unknown, 'MISSING_EVIDENCE');
});

test('rejects unratified founder rights reported as active', () => {
  const snapshot = cloneSnapshot(activeSnapshot());
  const authority = recordAt(snapshot, ['policy_authority']);
  authority.kind = 'proposal';
  authority.approval_status = 'unratified';
  authority.provenance_id = 'prov-proposal';
  authority.approval_evidence_ids = [];
  expectCode(snapshot, 'INVALID_COMPENSATION');
});

test('rejects stale observation evidence', () => {
  const snapshot = cloneSnapshot(observedSnapshot());
  const observation = recordAt(snapshot, ['observation']);
  observation.observed_at = '2026-07-22T11:00:00.000Z';
  observation.expires_at = '2026-07-22T11:59:59.999Z';
  const evidence = snapshot.evidence;
  if (!Array.isArray(evidence)) throw new Error('fixture evidence must be an array');
  for (const item of evidence) {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) throw new Error('fixture evidence item must be an object');
    (item as Record<string, unknown>).observed_at = '2026-07-22T11:00:00.000Z';
  }
  expectCode(snapshot, 'STALE_EVIDENCE');
});

test('rejects incomplete confirmation or live-interface deployment evidence', () => {
  const confirmedWithoutEvidence = cloneSnapshot(activeSnapshot());
  const deployment = recordAt(confirmedWithoutEvidence, ['deployment']);
  deployment.stage = 'confirmed';
  deployment.interface_evidence_ids = [];
  deployment.evidence_ids = [];
  expectCode(confirmedWithoutEvidence, 'INVALID_DEPLOYMENT');

  const liveWithoutInterface = cloneSnapshot(activeSnapshot());
  recordAt(liveWithoutInterface, ['deployment']).interface_evidence_ids = [];
  expectCode(liveWithoutInterface, 'INVALID_DEPLOYMENT');
});

test('rejects collector or distributor substitution by the platform', () => {
  const snapshot = cloneSnapshot(activeSnapshot());
  recordAt(snapshot, ['routing', 'collector']).owner_scope = 'platform';
  expectCode(snapshot, 'COLLECTOR_SUBSTITUTION');
});

test('rejects unresolved compensation schedules from being treated as active', () => {
  const snapshot = cloneSnapshot(activeSnapshot());
  const schedule = recordAt(snapshot, ['compensation', 'founder', 'schedule']);
  schedule.status = 'unresolved';
  schedule.entries = [];
  expectCode(snapshot, 'INVALID_SCHEDULE');
});

test('rejects payout enablement before live interface verification', () => {
  const snapshot = cloneSnapshot(activeSnapshot());
  const deployment = recordAt(snapshot, ['deployment']);
  deployment.stage = 'confirmed';
  deployment.interface_evidence_ids = [];
  expectCode(snapshot, 'PAYOUT_NOT_ELIGIBLE');
});

test('rejects payout at every pre-live deployment stage', () => {
  const cases: Array<{ stage: 'source-only' | 'plan' | 'preflight' | 'broadcast' | 'confirmed'; evidenceId: string; evidenceKind: ProtocolRevenueObservation['evidence'][number]['kind'] }> = [
    { stage: 'source-only', evidenceId: 'ev-source', evidenceKind: 'source' },
    { stage: 'plan', evidenceId: 'ev-plan', evidenceKind: 'deployment-plan' },
    { stage: 'preflight', evidenceId: 'ev-preflight', evidenceKind: 'deployment-preflight' },
    { stage: 'broadcast', evidenceId: 'ev-broadcast', evidenceKind: 'deployment-broadcast' },
    { stage: 'confirmed', evidenceId: 'ev-confirmation', evidenceKind: 'deployment-confirmation' },
  ];

  for (const item of cases) {
    const snapshot = cloneSnapshot(activeSnapshot());
    const deployment = recordAt(snapshot, ['deployment']);
    deployment.stage = item.stage;
    deployment.interface_evidence_ids = [];
    deployment.evidence_ids = [item.evidenceId];
    if (item.evidenceId !== 'ev-source' && item.evidenceId !== 'ev-confirmation') {
      appendEvidence(snapshot, evidence(item.evidenceId, item.evidenceKind, `Synthetic ${item.stage} evidence.`));
    }
    if (item.stage === 'source-only' || item.stage === 'plan' || item.stage === 'preflight') {
      deployment.transaction_id = null;
      deployment.confirmed_burn_block_height = null;
    } else if (item.stage === 'broadcast') {
      deployment.transaction_id = '0xbroadcast-contract-publish';
      deployment.confirmed_burn_block_height = null;
    }
    expectCode(snapshot, 'PAYOUT_NOT_ELIGIBLE');
  }
});

test('rejects non-integer or non-basis-point denominators', () => {
  const snapshot = cloneSnapshot(observedSnapshot());
  recordAt(snapshot, ['fee_policy']).denominator_bps = 1000;
  expectCode(snapshot, 'INVALID_DENOMINATOR');
});

test('rejects custody claims even when all other evidence is valid', () => {
  const snapshot = cloneSnapshot(observedSnapshot());
  snapshot.custody_claim = true;
  expectCode(snapshot, 'CUSTODY_CLAIM');
});

test('rejects malformed evidence URLs instead of treating them as durable evidence', () => {
  const snapshot = cloneSnapshot(observedSnapshot());
  const evidenceRecords = snapshot.evidence;
  if (!Array.isArray(evidenceRecords)) throw new Error('fixture evidence must be an array');
  const first = evidenceRecords[0];
  if (first === null || typeof first !== 'object' || Array.isArray(first)) throw new Error('fixture evidence item must be an object');
  (first as Record<string, unknown>).url = 'not-an-absolute-url';
  expectCode(snapshot, 'INVALID_CONTRACT');
});
