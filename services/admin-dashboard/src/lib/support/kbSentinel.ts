/**
 * Autonomous Cross-Repository KB & OpenSpec Alignment Sentinel Engine (G-71)
 *
 * Provides a fail-closed, real-time diagnostic harness that bridges
 * Knowledge Base entries, OpenSpec proposals, and platform Gap Scoring Matrix items.
 */

import { createLogger } from './logger';

const logger = createLogger('kb-sentinel');

export type GapState =
  | 'implemented'
  | 'active_scaffolding'
  | 'fail_closed_boundary'
  | 'unresolved_drift'
  | 'not_implemented';

export interface GapEvaluationSpec {
  id: string;
  title: string;
  state: GapState;
  strategicAlignment: number;
  complexity: number;
  validationSignal: number;
  specPath?: string;
  primaryReference?: string;
}

export interface GapScores {
  strategicAlignment: number;
  complexity: number;
  validationSignal: number;
  totalScore: number;
}

export interface EvaluatedGap {
  id: string;
  title: string;
  state: GapState;
  scores: GapScores;
  isFailClosed: boolean;
  specValid: boolean;
  evaluatedAtIso: string;
}

export interface SentinelDiagnosticReport {
  timestampIso: string;
  totalGapsEvaluated: number;
  evaluatedGaps: EvaluatedGap[];
  alignmentPercentage: number;
  openSpecProposalCount: number;
  kbEntriesCount: number;
  status: 'OK' | 'WARN' | 'FAIL';
}

const GAP_ID_REGEX = /^G-\d{2,3}$/;

/**
 * Calculates strategic score based on the 30-point platform rubric.
 */
export function calculateStrategicScore(
  strategicAlignment: number,
  complexity: number,
  validationSignal: number
): number {
  if (
    strategicAlignment < 1 ||
    strategicAlignment > 10 ||
    complexity < 1 ||
    complexity > 10 ||
    validationSignal < 1 ||
    validationSignal > 10
  ) {
    logger.error('Strategic score dimension out of bounds [1-10]', {
      strategicAlignment,
      complexity,
      validationSignal,
    });
    throw new Error(
      `Strategic score dimension out of bounds [1-10]. Must be between 1 and 10. Received: alignment=${strategicAlignment}, complexity=${complexity}, validation=${validationSignal}`
    );
  }

  const total = strategicAlignment + complexity + validationSignal;
  return Math.min(total, 30);
}

/**
 * Evaluates a single Gap specification against fail-closed rules.
 */
export function evaluateGap(spec: GapEvaluationSpec): EvaluatedGap {
  if (!spec || typeof spec !== 'object') {
    logger.error('Invalid gap specification payload', { spec });
    throw new Error('Invalid gap specification payload provided to KB Sentinel');
  }

  if (!spec.id || !GAP_ID_REGEX.test(spec.id)) {
    logger.error('Invalid Gap ID format', { id: spec.id });
    throw new Error(`Invalid Gap ID format: '${spec.id}'. Must match pattern G-XX.`);
  }

  if (!spec.title || spec.title.trim() === '') {
    logger.error('Gap specification missing title', { id: spec.id });
    throw new Error(`Gap specification '${spec.id}' is missing a title.`);
  }

  const validStates: GapState[] = [
    'implemented',
    'active_scaffolding',
    'fail_closed_boundary',
    'unresolved_drift',
    'not_implemented',
  ];

  if (!validStates.includes(spec.state)) {
    logger.error('Invalid gap state', { id: spec.id, state: spec.state });
    throw new Error(`Gap '${spec.id}' has invalid state: '${spec.state}'.`);
  }

  const totalScore = calculateStrategicScore(
    spec.strategicAlignment,
    spec.complexity,
    spec.validationSignal
  );

  const isFailClosed =
    spec.state === 'fail_closed_boundary' ||
    spec.state === 'implemented' ||
    spec.state === 'active_scaffolding';

  const specValid = Boolean(spec.specPath && spec.specPath.trim().length > 0);

  return {
    id: spec.id,
    title: spec.title,
    state: spec.state,
    scores: {
      strategicAlignment: spec.strategicAlignment,
      complexity: spec.complexity,
      validationSignal: spec.validationSignal,
      totalScore,
    },
    isFailClosed,
    specValid,
    evaluatedAtIso: new Date().toISOString(),
  };
}

/**
 * Generates an end-to-end Sentinel Diagnostic Report.
 */
export function generateSentinelDiagnosticReport(
  specs: GapEvaluationSpec[],
  kbCount = 25,
  openSpecCount = 50
): SentinelDiagnosticReport {
  if (!Array.isArray(specs) || specs.length === 0) {
    logger.error('No gap specifications provided for diagnostic report');
    throw new Error('No gap specifications provided for KB Sentinel diagnostic report.');
  }

  const evaluatedGaps = specs.map(evaluateGap);

  const implementedOrVerified = evaluatedGaps.filter(
    (g) => g.state === 'implemented' || g.state === 'fail_closed_boundary'
  ).length;

  const alignmentPercentage = Number(
    ((implementedOrVerified / evaluatedGaps.length) * 100).toFixed(2)
  );

  let status: 'OK' | 'WARN' | 'FAIL' = 'OK';
  if (alignmentPercentage < 50) {
    status = 'FAIL';
  } else if (alignmentPercentage < 80) {
    status = 'WARN';
  }

  const report: SentinelDiagnosticReport = {
    timestampIso: new Date().toISOString(),
    totalGapsEvaluated: evaluatedGaps.length,
    evaluatedGaps,
    alignmentPercentage,
    openSpecProposalCount: openSpecCount,
    kbEntriesCount: kbCount,
    status,
  };

  logger.info('Generated KB Sentinel Diagnostic Report', {
    totalGaps: report.totalGapsEvaluated,
    alignmentPercentage: report.alignmentPercentage,
    status: report.status,
  });

  return report;
}
