import { describe, it, expect } from "vitest";
import {
  initDKG,
  produceCommitment,
  validateSigningPackage,
  verifyAggregatedSignature,
  validateVaultConfig,
  type FROSTParameters,
  type SigningPackage,
  type AggregationResult,
  type FrostVaultConfig,
} from "../lib/support/frost";

describe("FROST Threshold Signatures (G-14)", () => {
  describe("initDKG", () => {
    it("should initialize a DKG state with correct participants in round 1", () => {
      const params: FROSTParameters = { threshold: 2, totalParticipants: 3 };
      const dkgState = initDKG(params);

      expect(dkgState.phase).toBe("round1");
      if (dkgState.phase === "round1") {
        expect(dkgState.participants).toEqual([1, 2, 3]);
        expect(dkgState.commitments).toEqual([]);
      }
    }
  );

    it("should handle single participant threshold configuration if requested", () => {
      const params: FROSTParameters = { threshold: 1, totalParticipants: 1 };
      const dkgState = initDKG(params);

      expect(dkgState.phase).toBe("round1");
      if (dkgState.phase === "round1") {
        expect(dkgState.participants).toEqual([1]);
      }
    });
  });

  describe("produceCommitment", () => {
    it("should generate hiding and binding commitments for a given participant", () => {
      const participantId = 1;
      const commitment = produceCommitment(participantId);

      expect(commitment.participantId).toBe(participantId);
      expect(commitment.hiding).toContain("commit_hiding_1_");
      expect(commitment.binding).toContain("commit_binding_1_");
    });
  });

  describe("validateSigningPackage", () => {
    it("should validate a correct signing package with 32-byte message hash (64 hex characters)", () => {
      const validPackage: SigningPackage = {
        messageHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        commitments: [
          { participantId: 1, hiding: "h1", binding: "b1" },
          { participantId: 2, hiding: "h2", binding: "b2" },
        ],
        groupVerifyingKey: "02abc123groupkey",
      };

      expect(validateSigningPackage(validPackage)).toBe(true);
    });

    it("should reject a package with invalid message hash length", () => {
      const invalidPackage: SigningPackage = {
        messageHash: "invalidhash",
        commitments: [{ participantId: 1, hiding: "h1", binding: "b1" }],
        groupVerifyingKey: "02abc123groupkey",
      };

      expect(validateSigningPackage(invalidPackage)).toBe(false);
    });

    it("should reject a package with empty commitments", () => {
      const invalidPackage: SigningPackage = {
        messageHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        commitments: [],
        groupVerifyingKey: "02abc123groupkey",
      };

      expect(validateSigningPackage(invalidPackage)).toBe(false);
    });

    it("should reject a package with missing group verifying key", () => {
      const invalidPackage: SigningPackage = {
        messageHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        commitments: [{ participantId: 1, hiding: "h1", binding: "b1" }],
        groupVerifyingKey: "",
      };

      expect(validateSigningPackage(invalidPackage)).toBe(false);
    });
  });

  describe("verifyAggregatedSignature", () => {
    it("should verify a valid 64-byte Schnorr threshold signature (128 hex chars)", () => {
      const validSignature = "a".repeat(128);
      const result: AggregationResult = {
        groupSignature: validSignature,
        messageHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        includedSigners: [1, 2],
        verified: true,
      };

      expect(verifyAggregatedSignature(result, "02abc123groupkey")).toBe(true);
    });

    it("should reject when result.verified is false", () => {
      const validSignature = "a".repeat(128);
      const result: AggregationResult = {
        groupSignature: validSignature,
        messageHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        includedSigners: [1, 2],
        verified: false,
      };

      expect(verifyAggregatedSignature(result, "02abc123groupkey")).toBe(false);
    });

    it("should reject a signature with incorrect string length", () => {
      const shortSignature = "a".repeat(64);
      const result: AggregationResult = {
        groupSignature: shortSignature,
        messageHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        includedSigners: [1, 2],
        verified: true,
      };

      expect(verifyAggregatedSignature(result, "02abc123groupkey")).toBe(false);
    });
  });

  describe("validateVaultConfig", () => {
    it("should accept a valid testnet vault configuration", () => {
      const config: FrostVaultConfig = {
        vaultId: "vault-test-1",
        parameters: { threshold: 2, totalParticipants: 3 },
        groupPublicKey: "02abc123groupkey",
        participantMapping: {
          "operator-1": 1,
          "operator-2": 2,
          "operator-3": 3,
        },
        dkgCompletedAtIso: new Date().toISOString(),
        network: "testnet",
      };

      const validation = validateVaultConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("should flag threshold < 2", () => {
      const config: FrostVaultConfig = {
        vaultId: "vault-test-2",
        parameters: { threshold: 1, totalParticipants: 3 },
        groupPublicKey: "02abc123groupkey",
        participantMapping: {
          "operator-1": 1,
          "operator-2": 2,
          "operator-3": 3,
        },
        dkgCompletedAtIso: new Date().toISOString(),
        network: "testnet",
      };

      const validation = validateVaultConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Threshold must be at least 2 for any multisig");
    });

    it("should flag threshold > totalParticipants", () => {
      const config: FrostVaultConfig = {
        vaultId: "vault-test-3",
        parameters: { threshold: 4, totalParticipants: 3 },
        groupPublicKey: "02abc123groupkey",
        participantMapping: {
          "operator-1": 1,
          "operator-2": 2,
          "operator-3": 3,
        },
        dkgCompletedAtIso: new Date().toISOString(),
        network: "testnet",
      };

      const validation = validateVaultConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Threshold cannot exceed total participants");
    });

    it("should flag participant mapping length mismatch", () => {
      const config: FrostVaultConfig = {
        vaultId: "vault-test-4",
        parameters: { threshold: 2, totalParticipants: 3 },
        groupPublicKey: "02abc123groupkey",
        participantMapping: {
          "operator-1": 1,
          "operator-2": 2,
        },
        dkgCompletedAtIso: new Date().toISOString(),
        network: "testnet",
      };

      const validation = validateVaultConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Participant mapping must include all total participants");
    });

    it("should require threshold >= 3 for mainnet vaults", () => {
      const config: FrostVaultConfig = {
        vaultId: "vault-mainnet-1",
        parameters: { threshold: 2, totalParticipants: 3 },
        groupPublicKey: "02abc123groupkey",
        participantMapping: {
          "operator-1": 1,
          "operator-2": 2,
          "operator-3": 3,
        },
        dkgCompletedAtIso: new Date().toISOString(),
        network: "mainnet",
      };

      const validation = validateVaultConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Mainnet vaults should use threshold >= 3 for production security");
    });
  });
});
