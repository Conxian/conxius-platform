import { describe, it, expect, vi } from 'vitest';
import {
  evaluateGap,
  calculateStrategicScore,
  generateSentinelDiagnosticReport,
  GapEvaluationSpec,
} from '../lib/support/kbSentinel';

// Mock server-only module for Vitest component import compatibility if referenced
vi.mock('server-only', () => ({}));

describe('G-71 Autonomous Knowledge Base & OpenSpec Alignment Sentinel Engine', () => {
  describe('calculateStrategicScore', () => {
    it('should correctly calculate total strategic score for valid dimensions', () => {
      const score = calculateStrategicScore(10, 7, 9);
      expect(score).toBe(26);
    });

    it('should cap total score at 30', () => {
      const score = calculateStrategicScore(10, 10, 10);
      expect(score).toBe(30);
    });

    it('should throw an error if any dimension is less than 1 or greater than 10', () => {
      expect(() => calculateStrategicScore(0, 5, 5)).toThrow(/out of bounds/i);
      expect(() => calculateStrategicScore(11, 5, 5)).toThrow(/out of bounds/i);
      expect(() => calculateStrategicScore(5, -1, 5)).toThrow(/out of bounds/i);
    });
  });

  describe('evaluateGap', () => {
    it('should evaluate a valid Gap specification accurately', () => {
      const spec: GapEvaluationSpec = {
        id: 'G-71',
        title: 'Autonomous KB & OpenSpec Alignment Sentinel Engine',
        state: 'implemented',
        strategicAlignment: 10,
        complexity: 7,
        validationSignal: 9,
        specPath: 'openspec/changes/2026-09-26-g71-kb-openspec-alignment-sentinel/specs/kb-openspec-alignment-sentinel.spec.md',
        primaryReference: 'SELF_EVOLVING_KB.md',
      };

      const result = evaluateGap(spec);
      expect(result.id).toBe('G-71');
      expect(result.scores.totalScore).toBe(26);
      expect(result.isFailClosed).toBe(true);
      expect(result.specValid).toBe(true);
      expect(result.state).toBe('implemented');
    });

    it('should reject invalid Gap ID format', () => {
      const invalidSpec: GapEvaluationSpec = {
        id: 'INVALID-ID',
        title: 'Test Gap',
        state: 'implemented',
        strategicAlignment: 8,
        complexity: 5,
        validationSignal: 8,
      };

      expect(() => evaluateGap(invalidSpec)).toThrow(/Invalid Gap ID format/i);
    });

    it('should reject missing title', () => {
      const invalidSpec: GapEvaluationSpec = {
        id: 'G-99',
        title: '   ',
        state: 'implemented',
        strategicAlignment: 8,
        complexity: 5,
        validationSignal: 8,
      };

      expect(() => evaluateGap(invalidSpec)).toThrow(/missing a title/i);
    });

    it('should reject invalid gap state', () => {
      const invalidSpec = {
        id: 'G-99',
        title: 'Test Gap',
        state: 'unknown_state' as any,
        strategicAlignment: 8,
        complexity: 5,
        validationSignal: 8,
      };

      expect(() => evaluateGap(invalidSpec)).toThrow(/invalid state/i);
    });
  });

  describe('generateSentinelDiagnosticReport', () => {
    it('should generate an OK diagnostic report when alignment >= 80%', () => {
      const specs: GapEvaluationSpec[] = [
        {
          id: 'G-65',
          title: 'API Tokens',
          state: 'implemented',
          strategicAlignment: 9,
          complexity: 6,
          validationSignal: 10,
          specPath: 'openspec/specs/api-tokens.md',
        },
        {
          id: 'G-70',
          title: 'Submodule Sync Engine',
          state: 'implemented',
          strategicAlignment: 10,
          complexity: 6,
          validationSignal: 10,
          specPath: 'openspec/specs/submodule-sync.md',
        },
        {
          id: 'G-71',
          title: 'KB Sentinel Engine',
          state: 'implemented',
          strategicAlignment: 10,
          complexity: 7,
          validationSignal: 9,
          specPath: 'openspec/specs/kb-sentinel.md',
        },
      ];

      const report = generateSentinelDiagnosticReport(specs, 25, 50);

      expect(report.totalGapsEvaluated).toBe(3);
      expect(report.alignmentPercentage).toBe(100);
      expect(report.status).toBe('OK');
      expect(report.kbEntriesCount).toBe(25);
      expect(report.openSpecProposalCount).toBe(50);
    });

    it('should generate a WARN status when alignment is between 50% and 79%', () => {
      const specs: GapEvaluationSpec[] = [
        {
          id: 'G-01',
          title: 'BitVM Floor',
          state: 'fail_closed_boundary',
          strategicAlignment: 10,
          complexity: 9,
          validationSignal: 7,
        },
        {
          id: 'G-02',
          title: 'FDC3 Resolver',
          state: 'unresolved_drift',
          strategicAlignment: 9,
          complexity: 6,
          validationSignal: 8,
        },
      ];

      const report = generateSentinelDiagnosticReport(specs);
      expect(report.alignmentPercentage).toBe(50);
      expect(report.status).toBe('WARN');
    });

    it('should generate a FAIL status when alignment < 50%', () => {
      const specs: GapEvaluationSpec[] = [
        {
          id: 'G-01',
          title: 'BitVM Floor',
          state: 'unresolved_drift',
          strategicAlignment: 10,
          complexity: 9,
          validationSignal: 7,
        },
        {
          id: 'G-02',
          title: 'FDC3 Resolver',
          state: 'not_implemented',
          strategicAlignment: 9,
          complexity: 6,
          validationSignal: 8,
        },
      ];

      const report = generateSentinelDiagnosticReport(specs);
      expect(report.alignmentPercentage).toBe(0);
      expect(report.status).toBe('FAIL');
    });

    it('should throw an error if empty gap list is provided', () => {
      expect(() => generateSentinelDiagnosticReport([])).toThrow(
        /No gap specifications provided/i
      );
    });
  });
});
