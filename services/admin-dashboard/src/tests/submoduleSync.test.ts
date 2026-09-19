import { describe, it, expect, beforeEach } from "vitest";
import {
  isValidSha,
  evaluateSubmoduleStatus,
  generateSyncDiagnosticReport,
  getSyncReportHistory,
  clearSyncReportHistory,
  SubmoduleSpec,
} from "../lib/support/submoduleSync";

describe("Autonomous Submodule Health & Synchronization Engine (G-70)", () => {
  const validSha1 = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
  const validSha2 = "b2c3d4e5f60718293a4b5c6d7e8f901234567890";

  beforeEach(() => {
    clearSyncReportHistory();
  });

  describe("isValidSha", () => {
    it("should accept valid 40-character hex SHAs", () => {
      expect(isValidSha(validSha1)).toBe(true);
      expect(isValidSha(validSha2.toUpperCase())).toBe(true);
    });

    it("should reject invalid SHA formats", () => {
      expect(isValidSha("invalid-sha")).toBe(false);
      expect(isValidSha("a1b2c3")).toBe(false);
      expect(isValidSha("")).toBe(false);
      expect(isValidSha(null as unknown as string)).toBe(false);
    });
  });

  describe("evaluateSubmoduleStatus", () => {
    const spec: SubmoduleSpec = {
      name: "submodules/conxian-core",
      path: "submodules/conxian-core",
      expectedCommitSha: validSha1,
      expectedBranch: "main",
    };

    it("should return synchronized state when commit SHAs match", () => {
      const status = evaluateSubmoduleStatus(spec, validSha1, {
        actualBranch: "main",
      });

      expect(status.state).toBe("synchronized");
      expect(status.actualCommitSha).toBe(validSha1);
      expect(status.expectedCommitSha).toBe(validSha1);
      expect(status.hasUncommittedChanges).toBe(false);
    });

    it("should return drifted state when commit SHAs differ", () => {
      const status = evaluateSubmoduleStatus(spec, validSha2, {
        actualBranch: "main",
      });

      expect(status.state).toBe("drifted");
      expect(status.actualCommitSha).toBe(validSha2);
    });

    it("should return dirty state when uncommitted changes exist", () => {
      const status = evaluateSubmoduleStatus(spec, validSha1, {
        actualBranch: "main",
        hasUncommittedChanges: true,
      });

      expect(status.state).toBe("dirty");
      expect(status.hasUncommittedChanges).toBe(true);
    });

    it("should return missing state when submodule does not exist", () => {
      const status = evaluateSubmoduleStatus(spec, "", {
        exists: false,
      });

      expect(status.state).toBe("missing");
      expect(status.actualCommitSha).toBe("");
    });

    it("should return detached state when HEAD is detached and branch differs", () => {
      const status = evaluateSubmoduleStatus(spec, validSha1, {
        actualBranch: "feature-branch",
        isHeadDetached: true,
      });

      expect(status.state).toBe("detached");
      expect(status.isHeadDetached).toBe(true);
    });

    it("should fail-closed and throw on invalid spec or invalid SHA format", () => {
      expect(() =>
        evaluateSubmoduleStatus(null as unknown as SubmoduleSpec, validSha1)
      ).toThrow("[G-70] Invalid submodule specification");

      expect(() =>
        evaluateSubmoduleStatus(spec, "invalid-sha")
      ).toThrow("[G-70] Invalid SHA format");
    });
  });

  describe("generateSyncDiagnosticReport", () => {
    const spec1: SubmoduleSpec = {
      name: "submodules/conxian-core",
      path: "submodules/conxian-core",
      expectedCommitSha: validSha1,
    };
    const spec2: SubmoduleSpec = {
      name: "submodules/conxian-gateway",
      path: "submodules/conxian-gateway",
      expectedCommitSha: validSha2,
    };

    it("should calculate correct overall sync score and passed status", () => {
      const status1 = evaluateSubmoduleStatus(spec1, validSha1);
      const status2 = evaluateSubmoduleStatus(spec2, validSha2);

      const report = generateSyncDiagnosticReport([status1, status2]);

      expect(report.passed).toBe(true);
      expect(report.overallSyncScore).toBe(100);
      expect(report.totalSubmodules).toBe(2);
      expect(report.synchronizedCount).toBe(2);
      expect(report.driftedCount).toBe(0);
    });

    it("should record failed status and reduced score when drift exists", () => {
      const status1 = evaluateSubmoduleStatus(spec1, validSha1);
      const status2 = evaluateSubmoduleStatus(spec2, validSha1); // Drifted SHA

      const report = generateSyncDiagnosticReport([status1, status2]);

      expect(report.passed).toBe(false);
      expect(report.overallSyncScore).toBe(50);
      expect(report.synchronizedCount).toBe(1);
      expect(report.driftedCount).toBe(1);
    });

    it("should maintain report history up to capacity limit", () => {
      const status1 = evaluateSubmoduleStatus(spec1, validSha1);
      generateSyncDiagnosticReport([status1]);

      const history = getSyncReportHistory();
      expect(history.length).toBe(1);

      clearSyncReportHistory();
      expect(getSyncReportHistory().length).toBe(0);
    });

    it("should throw error on empty status list", () => {
      expect(() => generateSyncDiagnosticReport([])).toThrow(
        "[G-70] Empty or invalid submodule statuses"
      );
    });
  });
});
