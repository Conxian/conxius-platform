/**
 * Autonomous Cross-Repository Knowledge Store & OpenSpec Alignment Diagnostic Engine (G-71)
 *
 * Provides fail-closed evaluation of Gap Register status classifications,
 * OpenSpec change proposal alignment validation, multidimensional candidate scoring,
 * and structured diagnostic health report generation.
 */

import { createLogger } from "./logger";

const logger = createLogger("kb-sentinel");

export type GapStatusClassification =
  | "Implemented"
  | "Active Scaffolding"
  | "Fail-Closed Boundary"
  | "Research/Draft"
  | "Deprecated";

export interface GapEntry {
  gapId: string;
  title: string;
  sourceDoc: string;
  status: GapStatusClassification;
  details: string;
  linkedOpenSpec?: string;
  rustTarget?: string;
}

export interface CandidateMetrics {
  gapCoverage: number;           // 1 to 10
  implementationCost: number;    // 1 to 10
  riskScore: number;             // 1 to 10
  testabilityScore: number;      // 1 to 10
  architectureAlignment: number; // 1 to 10
}

export interface WeightedScoreResult {
  gapId: string;
  rawScoreSum: number;
  weightedScore: number; // 0.00 to 5.00
  isEligible: boolean;   // True if weightedScore >= 3.0
}

export interface OpenSpecProposal {
  id: string;
  path: string;
  hasDeltas: boolean;
  linkedGapId?: string;
}

export interface AlignmentDiscrepancy {
  type: "missing_openspec" | "unlinked_openspec" | "status_mismatch" | "invalid_entry";
  gapId?: string;
  proposalId?: string;
  description: string;
  severity: "error" | "warning";
}

export interface SentinelDiagnosticReport {
  evaluatedAtIso: string;
  totalGapsCount: number;
  implementedCount: number;
  scaffoldingCount: number;
  failClosedCount: number;
  researchCount: number;
  averageAlignmentScore: number;
  discrepancies: AlignmentDiscrepancy[];
  recommendations: string[];
}

export class KBSentinelEngine {
  private readonly MAX_GAP_CAPACITY = 500;

  /**
   * Enforces fail-closed input validation on gap entries.
   */
  public validateGapEntry(entry: GapEntry): void {
    if (!entry.gapId || typeof entry.gapId !== "string" || !entry.gapId.trim().startsWith("G-")) {
      logger.error(`[G-71] Invalid gapId provided: ${entry?.gapId}`);
      throw new Error(`[kb-sentinel] Invalid gapId: '${entry?.gapId}'. Gap IDs must follow format 'G-XX'.`);
    }

    const validStatuses: GapStatusClassification[] = [
      "Implemented",
      "Active Scaffolding",
      "Fail-Closed Boundary",
      "Research/Draft",
      "Deprecated",
    ];

    if (!validStatuses.includes(entry.status)) {
      logger.error(`[G-71] Invalid status '${entry.status}' for gap ${entry.gapId}`);
      throw new Error(`[kb-sentinel] Invalid status '${entry.status}' for gap ${entry.gapId}.`);
    }
  }

  /**
   * Computes multidimensional weighted strategic alignment score.
   * Score weights:
   * - gapCoverage: 30%
   * - implementationCost: 20% (inverted: lower cost = higher score)
   * - riskScore: 20% (inverted: lower risk = higher score)
   * - testabilityScore: 15%
   * - architectureAlignment: 15%
   */
  public calculateWeightedScore(gapId: string, metrics: CandidateMetrics): WeightedScoreResult {
    const validateMetric = (name: string, val: number) => {
      if (typeof val !== "number" || isNaN(val) || val < 1 || val > 10) {
        throw new Error(`[kb-sentinel] Metric '${name}' for gap ${gapId} must be a number between 1 and 10.`);
      }
    };

    validateMetric("gapCoverage", metrics.gapCoverage);
    validateMetric("implementationCost", metrics.implementationCost);
    validateMetric("riskScore", metrics.riskScore);
    validateMetric("testabilityScore", metrics.testabilityScore);
    validateMetric("architectureAlignment", metrics.architectureAlignment);

    // Invert cost and risk scores (10 is best for cost/risk, meaning low cost and low risk)
    const invertedCost = 11 - metrics.implementationCost;
    const invertedRisk = 11 - metrics.riskScore;

    const weightedScore = Number(
      (
        (metrics.gapCoverage / 10) * 0.30 * 5 +
        (invertedCost / 10) * 0.20 * 5 +
        (invertedRisk / 10) * 0.20 * 5 +
        (metrics.testabilityScore / 10) * 0.15 * 5 +
        (metrics.architectureAlignment / 10) * 0.15 * 5
      ).toFixed(2)
    );

    const rawScoreSum =
      metrics.gapCoverage +
      invertedCost +
      invertedRisk +
      metrics.testabilityScore +
      metrics.architectureAlignment;

    return {
      gapId,
      rawScoreSum,
      weightedScore,
      isEligible: weightedScore >= 3.0,
    };
  }

  /**
   * Evaluates a collection of gaps and OpenSpec proposals for alignment discrepancies.
   */
  public runDiagnostic(
    gaps: GapEntry[],
    proposals: OpenSpecProposal[]
  ): SentinelDiagnosticReport {
    if (!Array.isArray(gaps) || gaps.length === 0) {
      logger.error("[G-71] Diagnostic execution failed: Gaps array is empty or undefined");
      throw new Error("[kb-sentinel] Cannot execute diagnostic on empty or undefined gaps array.");
    }

    if (gaps.length > this.MAX_GAP_CAPACITY) {
      logger.error(`[G-71] Gap count (${gaps.length}) exceeds capacity limit (${this.MAX_GAP_CAPACITY})`);
      throw new Error(`[kb-sentinel] Capacity limit exceeded: ${gaps.length} gaps provided (max ${this.MAX_GAP_CAPACITY}).`);
    }

    const discrepancies: AlignmentDiscrepancy[] = [];
    const proposalMap = new Map<string, OpenSpecProposal>();
    for (const prop of proposals) {
      proposalMap.set(prop.id, prop);
    }

    let implementedCount = 0;
    let scaffoldingCount = 0;
    let failClosedCount = 0;
    let researchCount = 0;

    const proposalUsageSet = new Set<string>();

    for (const gap of gaps) {
      this.validateGapEntry(gap);

      switch (gap.status) {
        case "Implemented":
          implementedCount++;
          break;
        case "Active Scaffolding":
          scaffoldingCount++;
          break;
        case "Fail-Closed Boundary":
          failClosedCount++;
          break;
        case "Research/Draft":
          researchCount++;
          break;
      }

      // Check for linked OpenSpec requirement
      if (gap.status === "Implemented" || gap.status === "Active Scaffolding") {
        if (!gap.linkedOpenSpec) {
          discrepancies.push({
            type: "missing_openspec",
            gapId: gap.gapId,
            description: `Gap ${gap.gapId} (${gap.status}) does not have a linked OpenSpec change proposal.`,
            severity: "warning",
          });
        } else {
          proposalUsageSet.add(gap.linkedOpenSpec);
          if (!proposalMap.has(gap.linkedOpenSpec)) {
            discrepancies.push({
              type: "status_mismatch",
              gapId: gap.gapId,
              proposalId: gap.linkedOpenSpec,
              description: `Gap ${gap.gapId} links to OpenSpec proposal '${gap.linkedOpenSpec}' which was not found in the workspace.`,
              severity: "error",
            });
          }
        }
      }
    }

    // Identify unlinked OpenSpec proposals
    for (const prop of proposals) {
      if (!proposalUsageSet.has(prop.id) && !prop.linkedGapId) {
        discrepancies.push({
          type: "unlinked_openspec",
          proposalId: prop.id,
          description: `OpenSpec proposal '${prop.id}' is active in the workspace but not linked to any Gap Register entry.`,
          severity: "warning",
        });
      }
    }

    const totalEvaluated = gaps.length;
    const avgScore = Number(
      (
        ((implementedCount * 1.0 + scaffoldingCount * 0.8 + failClosedCount * 0.9 + researchCount * 0.5) /
          totalEvaluated) *
        100
      ).toFixed(1)
    );

    const recommendations: string[] = [];
    if (discrepancies.some((d) => d.type === "missing_openspec")) {
      recommendations.push("Draft OpenSpec change proposals for active scaffolding/implemented gaps missing specifications.");
    }
    if (discrepancies.some((d) => d.type === "unlinked_openspec")) {
      recommendations.push("Link unassigned OpenSpec proposals in openspec/changes/ to their respective Gap IDs in docs/GAPS.md.");
    }
    if (discrepancies.some((d) => d.type === "status_mismatch")) {
      recommendations.push("Reconcile missing or broken OpenSpec references noted in discrepancy report.");
    }
    if (recommendations.length === 0) {
      recommendations.push("Platform alignment is 100% synchronized across Knowledge Store and OpenSpec specifications.");
    }

    return {
      evaluatedAtIso: new Date().toISOString(),
      totalGapsCount: gaps.length,
      implementedCount,
      scaffoldingCount,
      failClosedCount,
      researchCount,
      averageAlignmentScore: avgScore,
      discrepancies,
      recommendations,
    };
  }

  /**
   * Generates a Markdown summary from a diagnostic report.
   */
  public exportReportMarkdown(report: SentinelDiagnosticReport): string {
    return [
      `# Knowledge Store & OpenSpec Alignment Diagnostic Report`,
      ``,
      `**Evaluated At:** ${report.evaluatedAtIso}`,
      `**Total Gaps Evaluated:** ${report.totalGapsCount}`,
      `**Alignment Score:** ${report.averageAlignmentScore}%`,
      ``,
      `### Status Breakdown`,
      `- Implemented: ${report.implementedCount}`,
      `- Active Scaffolding: ${report.scaffoldingCount}`,
      `- Fail-Closed Boundary: ${report.failClosedCount}`,
      `- Research / Draft: ${report.researchCount}`,
      ``,
      `### Identified Discrepancies (${report.discrepancies.length})`,
      report.discrepancies.length === 0
        ? `No alignment discrepancies found.`
        : report.discrepancies
            .map(
              (d) =>
                `- **[${d.severity.toUpperCase()}]** (${d.type}) ${d.description}`
            )
            .join("\n"),
      ``,
      `### Recommendations`,
      report.recommendations.map((r) => `- ${r}`).join("\n"),
    ].join("\n");
  }
}
