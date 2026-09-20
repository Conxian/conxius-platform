/**
 * Autonomous Submodule Health & Cross-Repository Synchronization Engine (G-70)
 *
 * Provides fail-closed inspection, commit drift detection, branch alignment,
 * and dirty working tree diagnostics for git submodules and cross-repository dependencies.
 */

import { createLogger } from "./logger";

const logger = createLogger("submodule-sync");

export type SubmoduleHealthState = "synchronized" | "drifted" | "detached" | "dirty" | "missing";

export interface SubmoduleSpec {
  name: string;
  path: string;
  expectedCommitSha: string;
  expectedBranch?: string;
}

export interface SubmoduleStatus {
  name: string;
  path: string;
  actualCommitSha: string;
  expectedCommitSha: string;
  actualBranch?: string;
  expectedBranch?: string;
  state: SubmoduleHealthState;
  isHeadDetached: boolean;
  hasUncommittedChanges: boolean;
  untrackedFilesCount: number;
}

export interface SyncDiagnosticReport {
  overallSyncScore: number;
  totalSubmodules: number;
  synchronizedCount: number;
  driftedCount: number;
  missingCount: number;
  dirtyCount: number;
  passed: boolean;
  submodules: SubmoduleStatus[];
  timestampIso: string;
}

const MAX_SYNC_REPORTS = 1000;
const syncReportHistory: SyncDiagnosticReport[] = [];

/**
 * Validates SHA-1 format (40 hex characters)
 */
export function isValidSha(sha: string): boolean {
  return typeof sha === "string" && /^[0-9a-fA-F]{40}$/.test(sha);
}

/**
 * Evaluates the status of a single submodule against its specification.
 */
export function evaluateSubmoduleStatus(
  spec: SubmoduleSpec,
  actualCommitSha: string,
  options: {
    actualBranch?: string;
    isHeadDetached?: boolean;
    hasUncommittedChanges?: boolean;
    untrackedFilesCount?: number;
    exists?: boolean;
  } = {}
): SubmoduleStatus {
  const {
    actualBranch,
    isHeadDetached = false,
    hasUncommittedChanges = false,
    untrackedFilesCount = 0,
    exists = true,
  } = options;

  if (!spec || !spec.name || !spec.path) {
    logger.error("Invalid submodule specification provided", { spec });
    throw new Error("[G-70] Invalid submodule specification");
  }

  if (!exists) {
    logger.warn(`Submodule missing at path: ${spec.path}`, { name: spec.name });
    return {
      name: spec.name,
      path: spec.path,
      actualCommitSha: "",
      expectedCommitSha: spec.expectedCommitSha || "",
      state: "missing",
      isHeadDetached: false,
      hasUncommittedChanges: false,
      untrackedFilesCount: 0,
    };
  }

  if (!isValidSha(spec.expectedCommitSha) || !isValidSha(actualCommitSha)) {
    logger.error("Invalid SHA provided for submodule status evaluation", {
      specSha: spec.expectedCommitSha,
      actualSha: actualCommitSha,
    });
    throw new Error("[G-70] Invalid SHA format");
  }

  let state: SubmoduleHealthState = "synchronized";

  if (hasUncommittedChanges || untrackedFilesCount > 0) {
    state = "dirty";
  } else if (actualCommitSha.toLowerCase() !== spec.expectedCommitSha.toLowerCase()) {
    state = "drifted";
  } else if (isHeadDetached && spec.expectedBranch && actualBranch !== spec.expectedBranch) {
    state = "detached";
  }

  logger.debug(`Evaluated submodule status for ${spec.name}`, { state, actualCommitSha });

  return {
    name: spec.name,
    path: spec.path,
    actualCommitSha,
    expectedCommitSha: spec.expectedCommitSha,
    actualBranch,
    expectedBranch: spec.expectedBranch,
    state,
    isHeadDetached,
    hasUncommittedChanges,
    untrackedFilesCount,
  };
}

/**
 * Generates an end-to-end synchronization diagnostic report across multiple submodules.
 */
export function generateSyncDiagnosticReport(
  statuses: SubmoduleStatus[]
): SyncDiagnosticReport {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    logger.error("No submodule status items provided for diagnostic report");
    throw new Error("[G-70] Empty or invalid submodule statuses");
  }

  let synchronizedCount = 0;
  let driftedCount = 0;
  let missingCount = 0;
  let dirtyCount = 0;

  for (const status of statuses) {
    switch (status.state) {
      case "synchronized":
        synchronizedCount++;
        break;
      case "drifted":
      case "detached":
        driftedCount++;
        break;
      case "missing":
        missingCount++;
        break;
      case "dirty":
        dirtyCount++;
        break;
    }
  }

  const totalSubmodules = statuses.length;
  const overallSyncScore = Math.round((synchronizedCount / totalSubmodules) * 100);
  const passed = synchronizedCount === totalSubmodules;

  const report: SyncDiagnosticReport = {
    overallSyncScore,
    totalSubmodules,
    synchronizedCount,
    driftedCount,
    missingCount,
    dirtyCount,
    passed,
    submodules: statuses,
    timestampIso: new Date().toISOString(),
  };

  if (syncReportHistory.length >= MAX_SYNC_REPORTS) {
    syncReportHistory.shift();
  }
  syncReportHistory.push(report);

  logger.info("Generated submodule synchronization report", {
    totalSubmodules,
    overallSyncScore,
    passed,
  });

  return report;
}

/**
 * Retrieves historical sync diagnostic reports.
 */
export function getSyncReportHistory(): SyncDiagnosticReport[] {
  return [...syncReportHistory];
}

/**
 * Clears historical sync diagnostic reports (intended for test environments).
 */
export function clearSyncReportHistory(): void {
  syncReportHistory.length = 0;
  logger.debug("Cleared sync report history");
}
