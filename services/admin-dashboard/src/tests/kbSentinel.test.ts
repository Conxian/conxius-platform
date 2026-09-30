import { describe, it, expect } from "vitest";
import {
  KBSentinelEngine,
  GapEntry,
  CandidateMetrics,
  OpenSpecProposal,
} from "../lib/support/kbSentinel";

describe("Autonomous Knowledge Store & OpenSpec Alignment Diagnostic Engine (G-71)", () => {
  const sentinel = new KBSentinelEngine();

  describe("Gap Entry Validation & Input Security", () => {
    it("should accept valid gap entries", () => {
      const validEntry: GapEntry = {
        gapId: "G-71",
        title: "Autonomous Knowledge Store & OpenSpec Alignment Diagnostic Engine",
        sourceDoc: "REPOSITORY_TAXONOMY.md",
        status: "Implemented",
        details: "Diagnostic engine for gap register and OpenSpec alignment.",
        linkedOpenSpec: "2026-09-26-g71-kb-openspec-alignment-sentinel",
      };

      expect(() => sentinel.validateGapEntry(validEntry)).not.toThrow();
    });

    it("should fail-closed on invalid gapId formats", () => {
      const invalidGapId: any = {
        gapId: "INVALID-71",
        title: "Invalid Gap",
        sourceDoc: "DOC.md",
        status: "Implemented",
        details: "Invalid gap id format.",
      };

      expect(() => sentinel.validateGapEntry(invalidGapId)).toThrow(
        "[kb-sentinel] Invalid gapId: 'INVALID-71'"
      );
    });

    it("should fail-closed on invalid gap status classifications", () => {
      const invalidStatus: any = {
        gapId: "G-99",
        title: "Unknown Status Gap",
        sourceDoc: "DOC.md",
        status: "NonExistentStatus",
        details: "Invalid status test.",
      };

      expect(() => sentinel.validateGapEntry(invalidStatus)).toThrow(
        "[kb-sentinel] Invalid status 'NonExistentStatus'"
      );
    });
  });

  describe("Multidimensional Candidate Scoring Strategy", () => {
    it("should compute accurate weighted scores for valid candidate metrics", () => {
      const metrics: CandidateMetrics = {
        gapCoverage: 10,
        implementationCost: 6, // Inverted to 5 (11 - 6)
        riskScore: 2,          // Inverted to 9 (11 - 2)
        testabilityScore: 9,
        architectureAlignment: 10,
      };

      const result = sentinel.calculateWeightedScore("G-71", metrics);

      expect(result.gapId).toBe("G-71");
      expect(result.weightedScore).toBeGreaterThanOrEqual(3.0);
      expect(result.isEligible).toBe(true);
    });

    it("should flag candidate as ineligible if weighted score is below 3.0", () => {
      const poorMetrics: CandidateMetrics = {
        gapCoverage: 2,
        implementationCost: 10, // Inverted to 1
        riskScore: 10,          // Inverted to 1
        testabilityScore: 2,
        architectureAlignment: 2,
      };

      const result = sentinel.calculateWeightedScore("G-00", poorMetrics);

      expect(result.weightedScore).toBeLessThan(3.0);
      expect(result.isEligible).toBe(false);
    });

    it("should fail-closed on invalid metric values out of 1-10 range", () => {
      const invalidMetrics: CandidateMetrics = {
        gapCoverage: 15, // Out of range
        implementationCost: 5,
        riskScore: 5,
        testabilityScore: 5,
        architectureAlignment: 5,
      };

      expect(() => sentinel.calculateWeightedScore("G-01", invalidMetrics)).toThrow(
        "[kb-sentinel] Metric 'gapCoverage' for gap G-01 must be a number between 1 and 10."
      );
    });
  });

  describe("Diagnostic Evaluation & OpenSpec Cross-Validation", () => {
    it("should execute diagnostic evaluation successfully and generate report", () => {
      const mockGaps: GapEntry[] = [
        {
          gapId: "G-65",
          title: "API Tokens",
          sourceDoc: "CONXIAN_API_TOKEN_SPEC.md",
          status: "Implemented",
          details: "Unified API Tokens",
          linkedOpenSpec: "2026-07-22-issue-1160-m2m-jwt-auth",
        },
        {
          gapId: "G-70",
          title: "Submodule Sync",
          sourceDoc: "REPOSITORY_TAXONOMY.md",
          status: "Implemented",
          details: "Autonomous submodule sync",
          linkedOpenSpec: "2026-09-08-client-onboarding-and-unified-installer-spec",
        },
        {
          gapId: "G-71",
          title: "KB Sentinel",
          sourceDoc: "REPOSITORY_TAXONOMY.md",
          status: "Implemented",
          details: "KB Sentinel Diagnostic Engine",
          linkedOpenSpec: "2026-09-26-g71-kb-openspec-alignment-sentinel",
        },
      ];

      const mockProposals: OpenSpecProposal[] = [
        {
          id: "2026-07-22-issue-1160-m2m-jwt-auth",
          path: "openspec/changes/2026-07-22-issue-1160-m2m-jwt-auth",
          hasDeltas: true,
        },
        {
          id: "2026-09-08-client-onboarding-and-unified-installer-spec",
          path: "openspec/changes/2026-09-08-client-onboarding-and-unified-installer-spec",
          hasDeltas: true,
        },
        {
          id: "2026-09-26-g71-kb-openspec-alignment-sentinel",
          path: "openspec/changes/2026-09-26-g71-kb-openspec-alignment-sentinel",
          hasDeltas: true,
        },
      ];

      const report = sentinel.runDiagnostic(mockGaps, mockProposals);

      expect(report.totalGapsCount).toBe(3);
      expect(report.implementedCount).toBe(3);
      expect(report.discrepancies.length).toBe(0);
      expect(report.averageAlignmentScore).toBe(100);

      const markdown = sentinel.exportReportMarkdown(report);
      expect(markdown).toContain("# Knowledge Store & OpenSpec Alignment Diagnostic Report");
      expect(markdown).toContain("**Total Gaps Evaluated:** 3");
    });

    it("should detect missing OpenSpec proposals for implemented gaps", () => {
      const mockGaps: GapEntry[] = [
        {
          gapId: "G-99",
          title: "Unspecified Gap",
          sourceDoc: "DOC.md",
          status: "Implemented",
          details: "No OpenSpec linked",
        },
      ];

      const report = sentinel.runDiagnostic(mockGaps, []);

      expect(report.discrepancies.length).toBe(1);
      expect(report.discrepancies[0].type).toBe("missing_openspec");
      expect(report.discrepancies[0].severity).toBe("warning");
    });

    it("should detect unlinked OpenSpec proposals", () => {
      const mockGaps: GapEntry[] = [
        {
          gapId: "G-71",
          title: "KB Sentinel",
          sourceDoc: "DOC.md",
          status: "Implemented",
          details: "KB Sentinel",
          linkedOpenSpec: "2026-09-26-g71-kb-openspec-alignment-sentinel",
        },
      ];

      const mockProposals: OpenSpecProposal[] = [
        {
          id: "2026-09-26-g71-kb-openspec-alignment-sentinel",
          path: "openspec/changes/2026-09-26-g71-kb-openspec-alignment-sentinel",
          hasDeltas: true,
        },
        {
          id: "2026-09-99-unlinked-proposal",
          path: "openspec/changes/2026-09-99-unlinked-proposal",
          hasDeltas: true,
        },
      ];

      const report = sentinel.runDiagnostic(mockGaps, mockProposals);

      expect(report.discrepancies.some((d) => d.type === "unlinked_openspec")).toBe(true);
    });

    it("should enforce capacity bounds and fail-closed", () => {
      const oversizedGaps: GapEntry[] = Array.from({ length: 501 }, (_, i) => ({
        gapId: `G-${i + 100}`,
        title: `Gap ${i}`,
        sourceDoc: "DOC.md",
        status: "Research/Draft",
        details: "Oversized gap array test",
      }));

      expect(() => sentinel.runDiagnostic(oversizedGaps, [])).toThrow(
        "[kb-sentinel] Capacity limit exceeded: 501 gaps provided (max 500)."
      );
    });
  });
});
