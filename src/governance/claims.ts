import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ContributionCategory =
  | "CORE_PROTOCOL_CODE"
  | "SECURITY_HARDENING"
  | "RELIABILITY_OPS"
  | "PRODUCT_DOCS_RESEARCH"
  | "COMMUNITY_ENABLEMENT";

export const CATEGORY_BASE_CU: Record<ContributionCategory, number> = {
  CORE_PROTOCOL_CODE: 8,
  SECURITY_HARDENING: 12,
  RELIABILITY_OPS: 6,
  PRODUCT_DOCS_RESEARCH: 4,
  COMMUNITY_ENABLEMENT: 3,
};

export type ImpactMultiplierBps = 50 | 100 | 150 | 200;
export const IMPACT_MULTIPLIERS = {
  MINOR: 50 as ImpactMultiplierBps,
  STANDARD: 100 as ImpactMultiplierBps,
  HIGH: 150 as ImpactMultiplierBps,
  CRITICAL: 200 as ImpactMultiplierBps,
};

export type QualityMultiplierBps = 0 | 70 | 100 | 120;
export const QUALITY_MULTIPLIERS = {
  REJECTED: 0 as QualityMultiplierBps,
  PARTIAL_REWORK: 70 as QualityMultiplierBps,
  ACCEPTED: 100 as QualityMultiplierBps,
  ACCEPTED_REUSED: 120 as QualityMultiplierBps,
};

export type ClaimStatus =
  | "proposed"
  | "verified"
  | "approved"
  | "recognized"
  | "convertible"
  | "converted"
  | "settled"
  | "disputed"
  | "revoked";

export type RevocationReason =
  | "FRAUD"
  | "PLAGIARISM"
  | "SYBIL_CONFIRMED"
  | "EVIDENCE_FALSIFIED";

export interface ArtifactRef {
  system: string;
  id: string;
  url: string;
}

export interface ClaimEvidence {
  type: "commit" | "pull_request" | "review" | "issue" | "incident_report" | "doc" | "runbook";
  uri: string;
  capturedAt: string;
  digest?: string;
}

export interface ClaimLedgerEntry {
  entryId: string;
  claimId: string;
  contributorId: string; // MUST match /^ubi:btc:[^\s]+$/
  artifactRef: ArtifactRef;
  category: ContributionCategory;
  baseCu: number;
  impactMultiplierBps: ImpactMultiplierBps;
  qualityMultiplierBps: QualityMultiplierBps;
  awardedCuHundredths: number;
  recognizedCuHundredths: number;
  deferredCuHundredths: number;
  status: ClaimStatus;
  stateReason?: string;
  reviewers: {
    proposedBy: string;
    verifiedBy?: string;
    approvedBy?: string;
    revokedBy?: string;
  };
  timestamps: {
    proposedAt: string;
    verifiedAt?: string;
    approvedAt?: string;
    recognizedAt?: string;
    convertedAt?: string;
    settledAt?: string;
    revokedAt?: string;
  };
  evidence: ClaimEvidence[];
  notes?: string;
  activationSnapshotHeight?: number;
  conversionRate?: number;
  convertedAmount?: number;
  settlementRef?: string;
}

export interface ClaimLedgerEvent {
  eventId: string;
  entryId: string;
  eventType: string;
  actorId: string;
  occurredAt: string;
  payload: any;
}

export interface ActivationGates {
  mainnetStability60Days: boolean;
  auditedPayoutPathActive: boolean;
  treasuryRunway6Months: boolean;
  governanceRatified: boolean;
}

export interface ClaimsState {
  schemaVersion: number;
  entries: Record<string, ClaimLedgerEntry>;
  events: ClaimLedgerEvent[];
  activationSnapshotHeight?: number;
  activationRate?: number;
  activationPool?: number;
  activatedAtIso?: string;
}

const DEFAULT_CLAIMS_STATE_FILE = ".claims-state.json";
let _writeBusy = false;

function withWriteLock<T>(fn: () => T): T {
  while (_writeBusy) { /* spin */ }
  _writeBusy = true;
  try {
    return fn();
  } finally {
    _writeBusy = false;
  }
}

function resolveStatePath(): string {
  const envFile = process.env.CLAIMS_STATE_FILE?.trim();
  return envFile ? path.resolve(envFile) : path.resolve(process.cwd(), DEFAULT_CLAIMS_STATE_FILE);
}

export function loadClaimsState(): ClaimsState {
  const filePath = resolveStatePath();
  if (!fs.existsSync(filePath)) {
    const initialState: ClaimsState = {
      schemaVersion: 1,
      entries: {},
      events: [],
    };
    persistClaimsState(initialState);
    return initialState;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

export function persistClaimsState(state: ClaimsState): void {
  const filePath = resolveStatePath();
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
}

/**
 * Validates the ubi:btc:{id} pattern and evidence list requirements.
 */
export function validateClaimRequirements(
  contributorId: string,
  evidence: ClaimEvidence[]
): { valid: boolean; error?: string } {
  const ubiPattern = /^ubi:btc:[^\s]+$/;
  if (!ubiPattern.test(contributorId)) {
    return { valid: false, error: `Invalid contributor identity format: ${contributorId}. Must match ubi:btc:{id}` };
  }
  if (!evidence || evidence.length === 0) {
    return { valid: false, error: "Verifiable evidence list cannot be empty." };
  }
  for (const ev of evidence) {
    if (!ev.type || !ev.uri || !ev.capturedAt) {
      return { valid: false, error: "Evidence must contain non-empty type, uri, and capturedAt fields." };
    }
  }
  return { valid: true };
}

/**
 * Computes Month-to-date CU recognized hundredths for a contributor in a UTC month.
 */
export function getMonthToDateRecognizedHundredths(
  entries: Record<string, ClaimLedgerEntry>,
  contributorId: string,
  dateIso: string
): number {
  const targetDate = new Date(dateIso);
  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = targetDate.getUTCMonth();

  let total = 0;
  for (const entry of Object.values(entries)) {
    if (entry.contributorId !== contributorId) continue;
    if (entry.status === "revoked") continue;

    const proposedDate = new Date(entry.timestamps.proposedAt);
    if (
      proposedDate.getUTCFullYear() === targetYear &&
      proposedDate.getUTCMonth() === targetMonth
    ) {
      total += entry.recognizedCuHundredths;
    }
  }
  return total;
}

/**
 * Proposes a new claim in the ledger.
 */
export function proposeClaim(input: {
  contributorId: string;
  artifactRef: ArtifactRef;
  category: ContributionCategory;
  impactMultiplierBps: ImpactMultiplierBps;
  qualityMultiplierBps: QualityMultiplierBps;
  evidence: ClaimEvidence[];
  notes?: string;
  proposedBy: string;
}): ClaimLedgerEntry {
  const validation = validateClaimRequirements(input.contributorId, input.evidence);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const baseCu = CATEGORY_BASE_CU[input.category];
  if (baseCu === undefined) {
    throw new Error(`Invalid contribution category: ${input.category}`);
  }

  return withWriteLock(() => {
    const state = loadClaimsState();

    // Anti-double-counting guardrail
    const artifactKey = `${input.artifactRef.system}:${input.artifactRef.id}`;
    const duplicate = Object.values(state.entries).find(
      (entry) =>
        entry.contributorId === input.contributorId &&
        entry.status !== "revoked" &&
        `${entry.artifactRef.system}:${entry.artifactRef.id}` === artifactKey
    );
    if (duplicate) {
      throw new Error(
        `Contributor ${input.contributorId} already has a claim for artifact ${artifactKey} in category ${duplicate.category}`
      );
    }

    const proposedAt = new Date().toISOString();
    const entryId = `entry-${randomUUID()}`;
    const claimId = `claim-${randomUUID()}`;

    // Exact calculations in integer hundredths
    const awardedCuHundredths = (baseCu * input.impactMultiplierBps * input.qualityMultiplierBps) / 100;

    // Apply pre-activation monthly concentration cap (40.00 CU)
    const mtdHundredths = getMonthToDateRecognizedHundredths(state.entries, input.contributorId, proposedAt);
    const monthlyCapHundredths = 4000;
    const remainingCap = Math.max(0, monthlyCapHundredths - mtdHundredths);

    const recognizedCuHundredths = Math.min(awardedCuHundredths, remainingCap);
    const deferredCuHundredths = awardedCuHundredths - recognizedCuHundredths;

    const entry: ClaimLedgerEntry = {
      entryId,
      claimId,
      contributorId: input.contributorId,
      artifactRef: input.artifactRef,
      category: input.category,
      baseCu,
      impactMultiplierBps: input.impactMultiplierBps,
      qualityMultiplierBps: input.qualityMultiplierBps,
      awardedCuHundredths,
      recognizedCuHundredths,
      deferredCuHundredths,
      status: "proposed",
      reviewers: {
        proposedBy: input.proposedBy,
      },
      timestamps: {
        proposedAt,
      },
      evidence: input.evidence,
      notes: input.notes,
    };

    state.entries[entryId] = entry;

    state.events.push({
      eventId: `event-${randomUUID()}`,
      entryId,
      eventType: "CLAIM_PROPOSED",
      actorId: input.proposedBy,
      occurredAt: proposedAt,
      payload: { ...entry },
    });

    if (deferredCuHundredths > 0) {
      const monthKey = `${new Date(proposedAt).getUTCFullYear()}-${String(new Date(proposedAt).getUTCMonth() + 1).padStart(2, "0")}`;
      state.events.push({
        eventId: `event-${randomUUID()}`,
        entryId,
        eventType: "CAP_DEFERRED",
        actorId: "system",
        occurredAt: proposedAt,
        payload: {
          monthKey,
          deferredCuHundredths,
          awardedCuHundredths,
          recognizedCuHundredths,
        },
      });
    }

    persistClaimsState(state);
    return entry;
  });
}

/**
 * Transitions a claim's status with event-logging and validation checks.
 */
export function transitionClaimStatus(
  entryId: string,
  newStatus: ClaimStatus,
  actorId: string,
  opts?: {
    stateReason?: string;
    revocationReason?: RevocationReason;
  }
): ClaimLedgerEntry {
  const occurredAt = new Date().toISOString();

  return withWriteLock(() => {
    const state = loadClaimsState();
    const entry = state.entries[entryId];
    if (!entry) {
      throw new Error(`Claim ledger entry ${entryId} not found.`);
    }

    if (entry.status === "revoked") {
      throw new Error("Cannot transition a revoked claim.");
    }

    // State machine constraints validation
    const allowedTransitions: Record<ClaimStatus, ClaimStatus[]> = {
      proposed: ["verified", "disputed", "revoked"],
      verified: ["approved", "disputed", "revoked"],
      approved: ["recognized", "disputed", "revoked"],
      recognized: ["convertible", "disputed", "revoked"],
      convertible: ["converted", "disputed", "revoked"],
      converted: ["settled", "revoked"],
      settled: [],
      disputed: ["approved", "revoked"],
      revoked: [],
    };

    const allowed = allowedTransitions[entry.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid claim transition: ${entry.status} -> ${newStatus}`);
    }

    // Record reviewers and timestamps based on state
    entry.status = newStatus;
    if (opts?.stateReason) {
      entry.stateReason = opts.stateReason;
    }

    if (newStatus === "verified") {
      entry.reviewers.verifiedBy = actorId;
      entry.timestamps.verifiedAt = occurredAt;
    } else if (newStatus === "approved") {
      entry.reviewers.approvedBy = actorId;
      entry.timestamps.approvedAt = occurredAt;
    } else if (newStatus === "recognized") {
      entry.timestamps.recognizedAt = occurredAt;
    } else if (newStatus === "revoked") {
      entry.reviewers.revokedBy = actorId;
      entry.timestamps.revokedAt = occurredAt;
      if (opts?.revocationReason) {
        entry.stateReason = opts.revocationReason;
      }
    }

    state.entries[entryId] = entry;

    state.events.push({
      eventId: `event-${randomUUID()}`,
      entryId,
      eventType: `CLAIM_${newStatus.toUpperCase()}`,
      actorId,
      occurredAt,
      payload: {
        newStatus,
        stateReason: entry.stateReason,
        revocationReason: opts?.revocationReason,
      },
    });

    persistClaimsState(state);
    return entry;
  });
}

/**
 * Dispute a claim.
 */
export function disputeClaim(entryId: string, actorId: string, rationale: string): ClaimLedgerEntry {
  const occurredAt = new Date().toISOString();
  return withWriteLock(() => {
    const state = loadClaimsState();
    const entry = state.entries[entryId];
    if (!entry) {
      throw new Error(`Claim ledger entry ${entryId} not found.`);
    }

    if (entry.status !== "approved" && entry.status !== "recognized" && entry.status !== "convertible") {
      throw new Error(`Cannot dispute a claim in status ${entry.status}.`);
    }

    entry.status = "disputed";
    entry.stateReason = rationale;
    state.entries[entryId] = entry;

    state.events.push({
      eventId: `event-${randomUUID()}`,
      entryId,
      eventType: "CLAIM_DISPUTED",
      actorId,
      occurredAt,
      payload: { rationale },
    });

    persistClaimsState(state);
    return entry;
  });
}

/**
 * Checks all 4 fail-closed activation gates.
 */
export function evaluateActivationGates(): ActivationGates {
  // Production / env config verification
  const mainnetStability60Days = process.env.MAINNET_STABILITY_GTE_60 === "true";
  const auditedPayoutPathActive = process.env.BOUNTY_PAYOUT_ACTIVE === "true";
  const treasuryRunway6Months = process.env.TREASURY_RUNWAY_GTE_6MO === "true";
  const governanceRatified = process.env.GOVERNANCE_RATIFIED_ACTIVATION === "true";

  return {
    mainnetStability60Days,
    auditedPayoutPathActive,
    treasuryRunway6Months,
    governanceRatified,
  };
}

/**
 * Triggers global snapshot conversion of Claim Units to payout allocations.
 */
export function performGlobalSnapshotConversion(
  poolSize: number,
  snapshotHeight: number,
  actorId: string
): {
  conversionRate: number;
  totalEligibleCu: number;
  contributorAllocations: Record<string, number>;
} {
  const gates = evaluateActivationGates();
  const allGatesPassed = Object.values(gates).every((gate) => gate === true);
  if (!allGatesPassed) {
    throw new Error("Cannot activate conversion: fail-closed activation gates are not satisfied.");
  }

  const occurredAt = new Date().toISOString();

  return withWriteLock(() => {
    const state = loadClaimsState();

    if (state.activatedAtIso) {
      throw new Error("Global snapshot conversion has already been activated.");
    }

    // Freeze eligible recognized CU at snapshot
    const eligibleEntries = Object.values(state.entries).filter(
      (entry) => entry.status === "recognized"
    );

    const totalEligibleCuHundredths = eligibleEntries.reduce(
      (sum, entry) => sum + entry.recognizedCuHundredths,
      0
    );

    if (totalEligibleCuHundredths === 0) {
      throw new Error("No recognized Claim Units available at snapshot height.");
    }

    const totalEligibleCu = totalEligibleCuHundredths / 100;
    const conversionRate = poolSize / totalEligibleCu;

    // Apply conversion to each claim and group allocations by contributor
    const contributorAllocations: Record<string, number> = {};

    for (const entry of eligibleEntries) {
      const entryCu = entry.recognizedCuHundredths / 100;
      entry.status = "convertible";
      entry.activationSnapshotHeight = snapshotHeight;
      entry.conversionRate = conversionRate;
      entry.convertedAmount = entryCu * conversionRate;

      contributorAllocations[entry.contributorId] =
        (contributorAllocations[entry.contributorId] ?? 0) + entry.convertedAmount;
    }

    state.activationSnapshotHeight = snapshotHeight;
    state.activationRate = conversionRate;
    state.activationPool = poolSize;
    state.activatedAtIso = occurredAt;

    state.events.push({
      eventId: `event-${randomUUID()}`,
      entryId: "global",
      eventType: "GLOBAL_SNAPSHOT_CONVERSION",
      actorId,
      occurredAt,
      payload: {
        poolSize,
        snapshotHeight,
        totalEligibleCu,
        conversionRate,
        contributorAllocations,
      },
    });

    persistClaimsState(state);
    return {
      conversionRate,
      totalEligibleCu,
      contributorAllocations,
    };
  });
}
