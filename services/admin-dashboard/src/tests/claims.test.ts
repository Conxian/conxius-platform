import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CATEGORY_BASE_CU,
  IMPACT_MULTIPLIERS,
  QUALITY_MULTIPLIERS,
  validateClaimRequirements,
  proposeClaim,
  transitionClaimStatus,
  disputeClaim,
  evaluateActivationGates,
  performGlobalSnapshotConversion,
  loadClaimsState,
  persistClaimsState,
  ClaimsState,
} from "../lib/governance/claims";
import fs from "node:fs";

const TEST_STATE_FILE = ".claims-state-test.json";

describe("CON-483: Contributor Claim Ledger and Activation Policy Tests", () => {
  beforeEach(() => {
    process.env.CLAIMS_STATE_FILE = TEST_STATE_FILE;
    if (fs.existsSync(TEST_STATE_FILE)) {
      fs.unlinkSync(TEST_STATE_FILE);
    }
    // Set standard env vars to false/disabled by default for fail-closed behavior
    process.env.MAINNET_STABILITY_GTE_60 = "false";
    process.env.BOUNTY_PAYOUT_ACTIVE = "false";
    process.env.TREASURY_RUNWAY_GTE_6MO = "false";
    process.env.GOVERNANCE_RATIFIED_ACTIVATION = "false";
  });

  afterEach(() => {
    if (fs.existsSync(TEST_STATE_FILE)) {
      fs.unlinkSync(TEST_STATE_FILE);
    }
    delete process.env.CLAIMS_STATE_FILE;
    delete process.env.MAINNET_STABILITY_GTE_60;
    delete process.env.BOUNTY_PAYOUT_ACTIVE;
    delete process.env.TREASURY_RUNWAY_GTE_6MO;
    delete process.env.GOVERNANCE_RATIFIED_ACTIVATION;
  });

  describe("AC-1: Taxonomy and Category Constants", () => {
    it("should define all five contribution categories with correct base CU", () => {
      expect(CATEGORY_BASE_CU.CORE_PROTOCOL_CODE).toBe(8);
      expect(CATEGORY_BASE_CU.SECURITY_HARDENING).toBe(12);
      expect(CATEGORY_BASE_CU.RELIABILITY_OPS).toBe(6);
      expect(CATEGORY_BASE_CU.PRODUCT_DOCS_RESEARCH).toBe(4);
      expect(CATEGORY_BASE_CU.COMMUNITY_ENABLEMENT).toBe(3);
    });

    it("should define exact multiplier sets", () => {
      expect(IMPACT_MULTIPLIERS.MINOR).toBe(50);
      expect(IMPACT_MULTIPLIERS.STANDARD).toBe(100);
      expect(IMPACT_MULTIPLIERS.HIGH).toBe(150);
      expect(IMPACT_MULTIPLIERS.CRITICAL).toBe(200);

      expect(QUALITY_MULTIPLIERS.REJECTED).toBe(0);
      expect(QUALITY_MULTIPLIERS.PARTIAL_REWORK).toBe(70);
      expect(QUALITY_MULTIPLIERS.ACCEPTED).toBe(100);
      expect(QUALITY_MULTIPLIERS.ACCEPTED_REUSED).toBe(120);
    });
  });

  describe("AC-2: Eligibility and Identity Validation", () => {
    it("should pass validation for valid ubi format and non-empty evidence list", () => {
      const res = validateClaimRequirements("ubi:btc:contributor-1", [
        { type: "pull_request", uri: "https://github.com/Conxian/1", capturedAt: new Date().toISOString() },
      ]);
      expect(res.valid).toBe(true);
    });

    it("should reject invalid contributor identity formats", () => {
      const res = validateClaimRequirements("invalid-id", [
        { type: "pull_request", uri: "https://github.com/Conxian/1", capturedAt: new Date().toISOString() },
      ]);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("Must match ubi:btc:{id}");
    });

    it("should reject claims with empty evidence payloads", () => {
      const res = validateClaimRequirements("ubi:btc:contributor-1", []);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("evidence list cannot be empty");
    });
  });

  describe("AC-3: Deterministic Claim Unit Calculations in Hundredths", () => {
    it("should correctly compute standard awarded CU without floating-point drift", () => {
      const claim = proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-1", url: "https://github.com/1" },
        category: "CORE_PROTOCOL_CODE", // base CU = 8
        impactMultiplierBps: IMPACT_MULTIPLIERS.STANDARD, // 100
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED, // 100
        evidence: [
          { type: "pull_request", uri: "https://github.com/1", capturedAt: new Date().toISOString() },
        ],
        proposedBy: "steward-alice",
      });

      // (8 * 100 * 100) / 100 = 800 hundredths
      expect(claim.awardedCuHundredths).toBe(800);
      expect(claim.recognizedCuHundredths).toBe(800);
    });

    it("should apply partial rework and critical multipliers properly", () => {
      const claim = proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-2", url: "https://github.com/2" },
        category: "SECURITY_HARDENING", // base CU = 12
        impactMultiplierBps: IMPACT_MULTIPLIERS.CRITICAL, // 200
        qualityMultiplierBps: QUALITY_MULTIPLIERS.PARTIAL_REWORK, // 70
        evidence: [
          { type: "pull_request", uri: "https://github.com/2", capturedAt: new Date().toISOString() },
        ],
        proposedBy: "steward-alice",
      });

      // (12 * 200 * 70) / 100 = 1680 hundredths (16.80 CU)
      expect(claim.awardedCuHundredths).toBe(1680);
      expect(claim.recognizedCuHundredths).toBe(1680);
    });
  });

  describe("AC-4: Anti-Concentration Monthly Cap and Anti-Double-Counting", () => {
    it("should cap recognized Claim Units at 40.00 CU per contributor per month", () => {
      // First propose 30 CU
      proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-1", url: "https://github.com/1" },
        category: "SECURITY_HARDENING", // 12
        impactMultiplierBps: IMPACT_MULTIPLIERS.CRITICAL, // 200 => (12 * 200 * 100)/100 = 24.00 CU
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
        evidence: [{ type: "doc", uri: "https://github.com/1", capturedAt: new Date().toISOString() }],
        proposedBy: "steward-alice",
      });

      // Propose another 24 CU. Total = 48 CU, should cap recognized at 40 CU (deferred = 8 CU)
      const claim2 = proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-2", url: "https://github.com/2" },
        category: "SECURITY_HARDENING",
        impactMultiplierBps: IMPACT_MULTIPLIERS.CRITICAL,
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
        evidence: [{ type: "doc", uri: "https://github.com/2", capturedAt: new Date().toISOString() }],
        proposedBy: "steward-alice",
      });

      expect(claim2.awardedCuHundredths).toBe(2400);
      expect(claim2.recognizedCuHundredths).toBe(1600); // 4000 - 2400 = 1600 hundredths remaining
      expect(claim2.deferredCuHundredths).toBe(800);

      const state = loadClaimsState();
      const capDeferredEvent = state.events.find((ev) => ev.eventType === "CAP_DEFERRED");
      expect(capDeferredEvent).toBeDefined();
      expect(capDeferredEvent?.payload.deferredCuHundredths).toBe(800);
    });

    it("should reject duplicate claims for the same contributor and artifact", () => {
      proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-unique", url: "https://github.com/unique" },
        category: "CORE_PROTOCOL_CODE",
        impactMultiplierBps: IMPACT_MULTIPLIERS.STANDARD,
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
        evidence: [{ type: "doc", uri: "https://github.com/unique", capturedAt: new Date().toISOString() }],
        proposedBy: "steward-alice",
      });

      expect(() => {
        proposeClaim({
          contributorId: "ubi:btc:contributor-1",
          artifactRef: { system: "GitHub", id: "pr-unique", url: "https://github.com/unique" },
          category: "RELIABILITY_OPS",
          impactMultiplierBps: IMPACT_MULTIPLIERS.STANDARD,
          qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
          evidence: [{ type: "doc", uri: "https://github.com/unique", capturedAt: new Date().toISOString() }],
          proposedBy: "steward-alice",
        });
      }).toThrow("already has a claim for artifact");
    });
  });

  describe("AC-5: Append-Only Event Audit Trail & State Transitions", () => {
    it("should record append-only state transitions without overwriting history", () => {
      const claim = proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-1", url: "https://github.com/1" },
        category: "CORE_PROTOCOL_CODE",
        impactMultiplierBps: IMPACT_MULTIPLIERS.STANDARD,
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
        evidence: [{ type: "doc", uri: "https://github.com/1", capturedAt: new Date().toISOString() }],
        proposedBy: "steward-alice",
      });

      const updated = transitionClaimStatus(claim.entryId, "verified", "steward-bob");
      expect(updated.status).toBe("verified");
      expect(updated.reviewers.verifiedBy).toBe("steward-bob");
      expect(updated.timestamps.verifiedAt).toBeDefined();

      const approved = transitionClaimStatus(claim.entryId, "approved", "steward-charlie");
      expect(approved.status).toBe("approved");

      const state = loadClaimsState();
      expect(state.events.some((ev) => ev.eventType === "CLAIM_PROPOSED")).toBe(true);
      expect(state.events.some((ev) => ev.eventType === "CLAIM_VERIFIED")).toBe(true);
      expect(state.events.some((ev) => ev.eventType === "CLAIM_APPROVED")).toBe(true);
    });

    it("should handle disputes and revocations", () => {
      const claim = proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-1", url: "https://github.com/1" },
        category: "CORE_PROTOCOL_CODE",
        impactMultiplierBps: IMPACT_MULTIPLIERS.STANDARD,
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
        evidence: [{ type: "doc", uri: "https://github.com/1", capturedAt: new Date().toISOString() }],
        proposedBy: "steward-alice",
      });

      transitionClaimStatus(claim.entryId, "verified", "steward-bob");
      transitionClaimStatus(claim.entryId, "approved", "steward-bob");

      const disputed = disputeClaim(claim.entryId, "challenger-dave", "Plagiarism suspected");
      expect(disputed.status).toBe("disputed");
      expect(disputed.stateReason).toBe("Plagiarism suspected");

      const revoked = transitionClaimStatus(claim.entryId, "revoked", "steward-council", {
        revocationReason: "PLAGIARISM",
      });
      expect(revoked.status).toBe("revoked");
      expect(revoked.stateReason).toBe("PLAGIARISM");
      expect(revoked.reviewers.revokedBy).toBe("steward-council");
    });
  });

  describe("AC-6: Fail-Closed Activation Gates", () => {
    it("should return false for evaluateActivationGates when environment variable gates are false", () => {
      const gates = evaluateActivationGates();
      expect(gates.mainnetStability60Days).toBe(false);
      expect(gates.auditedPayoutPathActive).toBe(false);
      expect(gates.treasuryRunway6Months).toBe(false);
      expect(gates.governanceRatified).toBe(false);
    });

    it("should block global snapshot conversion if any activation gate fails", () => {
      expect(() => {
        performGlobalSnapshotConversion(1000000, 10000, "steward-council");
      }).toThrow("fail-closed activation gates are not satisfied");
    });
  });

  describe("AC-7: Snapshot-Based Deterministic Conversion", () => {
    it("should compute global conversion rate and contributor allocations deterministically when gates are true", () => {
      // Set all gates to true
      process.env.MAINNET_STABILITY_GTE_60 = "true";
      process.env.BOUNTY_PAYOUT_ACTIVE = "true";
      process.env.TREASURY_RUNWAY_GTE_6MO = "true";
      process.env.GOVERNANCE_RATIFIED_ACTIVATION = "true";

      const gates = evaluateActivationGates();
      expect(Object.values(gates).every((g) => g === true)).toBe(true);

      // Create recognized claims
      const claim1 = proposeClaim({
        contributorId: "ubi:btc:contributor-1",
        artifactRef: { system: "GitHub", id: "pr-1", url: "https://github.com/1" },
        category: "CORE_PROTOCOL_CODE", // 8 CU
        impactMultiplierBps: IMPACT_MULTIPLIERS.STANDARD,
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
        evidence: [{ type: "doc", uri: "https://github.com/1", capturedAt: new Date().toISOString() }],
        proposedBy: "steward-alice",
      });

      const claim2 = proposeClaim({
        contributorId: "ubi:btc:contributor-2",
        artifactRef: { system: "GitHub", id: "pr-2", url: "https://github.com/2" },
        category: "SECURITY_HARDENING", // 12 CU
        impactMultiplierBps: IMPACT_MULTIPLIERS.STANDARD,
        qualityMultiplierBps: QUALITY_MULTIPLIERS.ACCEPTED,
        evidence: [{ type: "doc", uri: "https://github.com/2", capturedAt: new Date().toISOString() }],
        proposedBy: "steward-alice",
      });

      // Transition both claims to recognized
      transitionClaimStatus(claim1.entryId, "verified", "steward-bob");
      transitionClaimStatus(claim1.entryId, "approved", "steward-charlie");
      transitionClaimStatus(claim1.entryId, "recognized", "steward-charlie");

      transitionClaimStatus(claim2.entryId, "verified", "steward-bob");
      transitionClaimStatus(claim2.entryId, "approved", "steward-charlie");
      transitionClaimStatus(claim2.entryId, "recognized", "steward-charlie");

      // Global conversion pool P = 50,000 sats
      // Total CU = 8 + 12 = 20 CU
      // conversionRate = 50,000 / 20 = 2,500 sats/CU
      const conversion = performGlobalSnapshotConversion(50000, 15000, "steward-council");

      expect(conversion.totalEligibleCu).toBe(20);
      expect(conversion.conversionRate).toBe(2500);
      expect(conversion.contributorAllocations["ubi:btc:contributor-1"]).toBe(8 * 2500); // 20,000
      expect(conversion.contributorAllocations["ubi:btc:contributor-2"]).toBe(12 * 2500); // 30,000

      // Verify that claims are now convertible and frozen with snapshots
      const finalState = loadClaimsState();
      expect(finalState.entries[claim1.entryId].status).toBe("convertible");
      expect(finalState.entries[claim1.entryId].activationSnapshotHeight).toBe(15000);
      expect(finalState.entries[claim1.entryId].convertedAmount).toBe(20000);
    });
  });
});
