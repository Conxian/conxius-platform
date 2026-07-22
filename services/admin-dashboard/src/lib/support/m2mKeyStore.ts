import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  recordM2MExpiryThresholdCrossed,
  recordM2MRegistryState,
  recordM2MRegistryUnavailable,
  recordM2MRegistryWriteFailure,
  recordM2MRotationOutcome,
  recordM2MRollbackOutcome,
  recordM2MValidationOutcome,
  type M2MMetricOutcome,
  type M2MMetricServiceState,
  type M2MRegistryFailureCategory,
  type M2MRegistryFailureStage,
} from "../sidl/observability";
import {
  DEFAULT_M2M_GRACE_PERIOD_SECONDS,
  DEFAULT_M2M_LOCK_WAIT_MS,
  MAX_M2M_GRACE_PERIOD_SECONDS,
  MIN_M2M_GRACE_PERIOD_SECONDS,
  M2MKeyStoreError,
  M2M_REGISTRY_SCHEMA_VERSION,
  ROTATABLE_SERVICE_IDS,
  SERVICE_KEY_ENV_VARS,
  type M2MAuditEvent,
  type M2MConflictMetadata,
  type M2MKeyStoreOptions,
  type M2MKeySource,
  type M2MPreviousKeyRecord,
  type M2MRegistryCommitMarker,
  type M2MRegistryDocument,
  type M2MRegistryMetadataResponse,
  type M2MRegistryReadiness,
  type M2MRotationResult,
  type M2MRollbackResult,
  type M2MServiceMetadata,
  type M2MServiceRecord,
  type M2MServiceValidationResult,
  type M2MStoreContext,
  type RotatableServiceId,
  isRotatableServiceId,
} from "./m2mKeyTypes";

const SHA256_PREFIX = "sha256:";
const HASH_HEX_LENGTH = 64;
const DIGEST_LENGTH = 32;
const EXPIRY_THRESHOLDS = [
  { name: "30d" as const, seconds: 30 * 24 * 60 * 60 },
  { name: "7d" as const, seconds: 7 * 24 * 60 * 60 },
  { name: "24h" as const, seconds: 24 * 60 * 60 },
  { name: "1h" as const, seconds: 60 * 60 },
];

export interface M2MRotateInput {
  serviceId: RotatableServiceId;
  expectedGeneration: number;
  gracePeriodSeconds?: number;
  expiresAt?: string;
  context: M2MStoreContext;
}

export interface M2MRollbackInput {
  serviceId: RotatableServiceId;
  expectedGeneration: number;
  targetGeneration: number;
  reason: string;
  context: M2MStoreContext;
}

export interface M2MKeyStoreBackend {
  validateServiceSecret(serviceId: RotatableServiceId, secret: string): M2MServiceValidationResult;
  listMetadata(requestId?: string): M2MRegistryMetadataResponse;
  readiness(): M2MRegistryReadiness;
  rotate(input: M2MRotateInput): M2MRotationResult;
  rollback(input: M2MRollbackInput): M2MRollbackResult;
}

interface ArtifactCleanup {
  candidateFile?: string;
  journalFile?: string;
}

interface ParsedServiceKeyHeader {
  serviceId: RotatableServiceId;
  secret: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !value || Number.isNaN(Date.parse(value))) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);
}

function isSafeRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}

function isSafeCommitId(value: unknown): value is string {
  return typeof value === "string" && /^commit_[0-9a-f-]{36}$/.test(value);
}

function isSha256Hash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function isSafeKeyId(value: unknown): value is string {
  return typeof value === "string" && /^key_[0-9a-f-]{36}$/.test(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isAuditEventType(value: unknown): M2MAuditEvent["eventType"] | null {
  if (
    value === "SERVICE_KEY_BOOTSTRAPPED" ||
    value === "SERVICE_KEY_ROTATED" ||
    value === "SERVICE_KEY_ROLLED_BACK" ||
    value === "SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED" ||
    value === "SERVICE_KEY_REGISTRY_RECOVERED"
  ) {
    return value;
  }

  return null;
}

function isKeySource(value: unknown): value is M2MKeySource {
  return value === "bootstrap" || value === "registry" || value === "rollback";
}

function isThreshold(value: unknown): value is NonNullable<M2MAuditEvent["threshold"]> {
  return value === "30d" || value === "7d" || value === "24h" || value === "1h" || value === "expired";
}

function isSecretFreeAuditEvent(value: Record<string, unknown>): boolean {
  const allowedKeys = new Set([
    "eventId",
    "eventType",
    "commitId",
    "recoveredCommitId",
    "serviceId",
    "generation",
    "previousGeneration",
    "registryRevision",
    "actor",
    "requestId",
    "occurredAt",
    "graceUntil",
    "expiresAt",
    "effectiveUntil",
    "keyRole",
    "threshold",
    "rollbackOfGeneration",
    "rollbackTargetGeneration",
    "reason",
  ]);

  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isValidActiveRecord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isSafeKeyId(value.keyId) &&
    isSha256Hash(value.hash) &&
    isIsoTimestamp(value.createdAt) &&
    (value.expiresAt === null || isIsoTimestamp(value.expiresAt))
  );
}

function isValidPreviousRecord(value: unknown): value is M2MPreviousKeyRecord {
  if (!isRecord(value) || !isValidActiveRecord(value)) return false;
  return isPositiveInteger(value.generation) && isIsoTimestamp(value.graceUntil);
}

function isValidServiceRecord(value: unknown): value is M2MServiceRecord {
  if (!isRecord(value) || !isPositiveInteger(value.generation) || !isValidActiveRecord(value.active)) {
    return false;
  }

  if (value.previous !== null && !isValidPreviousRecord(value.previous)) return false;
  if (!isKeySource(value.source) || !isIsoTimestamp(value.updatedAt)) return false;
  if (
    value.rollbackOfGeneration !== undefined &&
    !isPositiveInteger(value.rollbackOfGeneration)
  ) {
    return false;
  }
  if (
    value.rollbackTargetGeneration !== undefined &&
    !isPositiveInteger(value.rollbackTargetGeneration)
  ) {
    return false;
  }

  return true;
}

function isValidAuditEvent(value: unknown): value is M2MAuditEvent {
  if (!isRecord(value) || !isSecretFreeAuditEvent(value)) return false;
  if (
    typeof value.eventId !== "string" ||
    !value.eventId ||
    !isAuditEventType(value.eventType) ||
    !isSafeCommitId(value.commitId) ||
    !(
      value.serviceId === null ||
      (typeof value.serviceId === "string" && isRotatableServiceId(value.serviceId))
    ) ||
    !(value.generation === null || isPositiveInteger(value.generation)) ||
    !(value.previousGeneration === null || isPositiveInteger(value.previousGeneration)) ||
    typeof value.registryRevision !== "number" ||
    !Number.isInteger(value.registryRevision) ||
    value.registryRevision < 1 ||
    (value.actor !== "admin-api-key" && value.actor !== "system") ||
    !isSafeRequestId(value.requestId) ||
    !isIsoTimestamp(value.occurredAt)
  ) {
    return false;
  }

  if (value.recoveredCommitId !== undefined && !isSafeCommitId(value.recoveredCommitId)) return false;
  if (value.graceUntil !== undefined && !isIsoTimestamp(value.graceUntil)) return false;
  if (value.expiresAt !== undefined && value.expiresAt !== null && !isIsoTimestamp(value.expiresAt)) {
    return false;
  }
  if (value.effectiveUntil !== undefined && !isIsoTimestamp(value.effectiveUntil)) return false;
  if (value.keyRole !== undefined && value.keyRole !== "active" && value.keyRole !== "previous") {
    return false;
  }
  if (value.threshold !== undefined && !isThreshold(value.threshold)) return false;
  if (
    value.rollbackOfGeneration !== undefined &&
    !isPositiveInteger(value.rollbackOfGeneration)
  ) {
    return false;
  }
  if (
    value.rollbackTargetGeneration !== undefined &&
    !isPositiveInteger(value.rollbackTargetGeneration)
  ) {
    return false;
  }
  if (
    value.reason !== undefined &&
    (typeof value.reason !== "string" || value.reason.length > 512 || /[\u0000-\u001f\u007f]/.test(value.reason))
  ) {
    return false;
  }

  return true;
}

function validateRegistryDocument(value: unknown): M2MRegistryDocument {
  if (!isRecord(value)) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry is malformed");
  }

  if (
    value.schemaVersion !== M2M_REGISTRY_SCHEMA_VERSION ||
    typeof value.revision !== "number" ||
    !Number.isInteger(value.revision) ||
    value.revision < 1 ||
    !isSafeCommitId(value.lastCommitId) ||
    !isRecord(value.services) ||
    !isRecord(value.notificationState) ||
    !Array.isArray(value.auditEvents)
  ) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry is incompatible");
  }

  for (const [serviceId, service] of Object.entries(value.services)) {
    if (!isRotatableServiceId(serviceId) || !isValidServiceRecord(service)) {
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry is malformed");
    }
  }

  for (const marker of Object.values(value.notificationState)) {
    if (!isRecord(marker) || !isIsoTimestamp(marker.crossedAt)) {
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry is malformed");
    }
  }

  if (!value.auditEvents.every(isValidAuditEvent)) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry audit state is malformed");
  }

  return value as unknown as M2MRegistryDocument;
}

function validateCommitMarker(value: unknown, registryBaseName: string): M2MRegistryCommitMarker {
  if (!isRecord(value)) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry commit marker is malformed");
  }

  const candidateFile = value.candidateFile;
  const journalFile = value.journalFile;
  const validArtifact = (artifact: unknown, suffix: string): artifact is string =>
    typeof artifact === "string" &&
    path.basename(artifact) === artifact &&
    artifact.startsWith(`${registryBaseName}.commit_`) &&
    artifact.endsWith(suffix);

  if (
    value.schemaVersion !== M2M_REGISTRY_SCHEMA_VERSION ||
    !isSafeCommitId(value.commitId) ||
    typeof value.revision !== "number" ||
    !Number.isInteger(value.revision) ||
    value.revision < 1 ||
    typeof value.predecessorRevision !== "number" ||
    !Number.isInteger(value.predecessorRevision) ||
    value.predecessorRevision < 0 ||
    !(
      value.predecessorLastCommitId === null ||
      isSafeCommitId(value.predecessorLastCommitId)
    ) ||
    !validArtifact(candidateFile, ".candidate") ||
    !validArtifact(journalFile, ".journal")
  ) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry commit marker is invalid");
  }

  if (
    value.revision !== value.predecessorRevision + 1 ||
    (value.predecessorRevision === 0 && value.predecessorLastCommitId !== null) ||
    (value.predecessorRevision > 0 && value.predecessorLastCommitId === null)
  ) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry commit predecessor is invalid");
  }

  return value as unknown as M2MRegistryCommitMarker;
}

function cloneDocument(document: M2MRegistryDocument): M2MRegistryDocument {
  return JSON.parse(JSON.stringify(document)) as M2MRegistryDocument;
}

function isoNow(now: () => Date): string {
  return now().toISOString();
}

function newSystemRequestId(): string {
  return `system_${randomUUID()}`;
}

function effectivePreviousDeadline(previous: M2MPreviousKeyRecord): string {
  if (!previous.expiresAt) return previous.graceUntil;
  return new Date(previous.graceUntil).getTime() <= new Date(previous.expiresAt).getTime()
    ? previous.graceUntil
    : previous.expiresAt;
}

function isBeforeNow(timestamp: string, now: Date): boolean {
  return now.getTime() < new Date(timestamp).getTime();
}

function mutationOutcomeForError(error: unknown): M2MMetricOutcome {
  if (!(error instanceof M2MKeyStoreError)) return "failure";

  switch (error.code) {
    case "generation_conflict":
    case "rollback_window_expired":
    case "rollback_target_conflict":
      return "conflict";
    case "invalid_generation_precondition":
    case "invalid_grace_period":
    case "invalid_expiry":
    case "invalid_request":
    case "service_not_found":
      return "rejected";
    case "m2m_registry_busy":
    case "m2m_registry_unavailable":
      return "unavailable";
    default:
      return "failure";
  }
}

function hashSecret(secret: string): { formatted: string; digest: Buffer } {
  const digest = createHash("sha256").update(Buffer.from(secret, "utf8")).digest();
  return { formatted: `${SHA256_PREFIX}${digest.toString("hex")}`, digest };
}

function digestFromStoredHash(hash: string): Buffer {
  const hex = hash.slice(SHA256_PREFIX.length);
  if (hex.length !== HASH_HEX_LENGTH) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry hash is malformed");
  }

  const digest = Buffer.from(hex, "hex");
  if (digest.length !== DIGEST_LENGTH) {
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry hash is malformed");
  }

  return digest;
}

function timingSafeDigestEqual(left: Buffer, right: Buffer): boolean {
  if (left.length !== DIGEST_LENGTH || right.length !== DIGEST_LENGTH) return false;
  return timingSafeEqual(left, right);
}

function parseFutureExpiry(value: string | undefined, now: Date): string | null {
  if (value === undefined) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    throw new M2MKeyStoreError("invalid_expiry", "Expiry must be an RFC 3339 timestamp with a timezone");
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
    throw new M2MKeyStoreError("invalid_expiry", "Expiry must be in the future");
  }

  return parsed.toISOString();
}

function validateGeneration(value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new M2MKeyStoreError(
      "invalid_generation_precondition",
      "Expected generation must be a positive integer",
    );
  }
}

function validateGracePeriod(value: number | undefined): number {
  const grace = value ?? DEFAULT_M2M_GRACE_PERIOD_SECONDS;
  if (
    !Number.isInteger(grace) ||
    grace < MIN_M2M_GRACE_PERIOD_SECONDS ||
    grace > MAX_M2M_GRACE_PERIOD_SECONDS
  ) {
    throw new M2MKeyStoreError(
      "invalid_grace_period",
      "Grace period must be an integer between 300 and 604800 seconds",
    );
  }

  return grace;
}

function sanitizeRollbackReason(reason: string): string {
  if (
    typeof reason !== "string" ||
    !reason.trim() ||
    reason.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(reason)
  ) {
    throw new M2MKeyStoreError("invalid_request", "Rollback reason is invalid");
  }

  return reason.trim();
}

function parseServiceKeyHeader(
  headerValue: string | null,
  expectedServiceId?: RotatableServiceId,
): ParsedServiceKeyHeader | null {
  if (!headerValue) return null;

  const separatorIndex = headerValue.indexOf(":");
  if (separatorIndex <= 0) return null;

  const serviceId = headerValue.slice(0, separatorIndex);
  const secret = headerValue.slice(separatorIndex + 1);
  if (
    !isRotatableServiceId(serviceId) ||
    (expectedServiceId !== undefined && serviceId !== expectedServiceId) ||
    !secret ||
    secret.trim() !== secret
  ) {
    return null;
  }

  return { serviceId, secret };
}

function hasRecoveryCommitEvent(
  document: M2MRegistryDocument,
  commitId: string,
  revision: number,
): boolean {
  return document.auditEvents.some(
    (event) =>
      event.eventType === "SERVICE_KEY_REGISTRY_RECOVERED" &&
      event.commitId === commitId &&
      event.registryRevision === revision &&
      event.recoveredCommitId !== undefined &&
      event.recoveredCommitId !== commitId,
  );
}

function isOriginalMutationEvent(event: M2MAuditEvent): boolean {
  return (
    event.eventType === "SERVICE_KEY_BOOTSTRAPPED" ||
    event.eventType === "SERVICE_KEY_ROTATED" ||
    event.eventType === "SERVICE_KEY_ROLLED_BACK" ||
    event.eventType === "SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED"
  );
}

function isAppropriateMutationEvent(
  document: M2MRegistryDocument,
  event: M2MAuditEvent,
): boolean {
  if (!isOriginalMutationEvent(event)) return false;

  if (event.eventType === "SERVICE_KEY_BOOTSTRAPPED" && event.serviceId === null) {
    return (
      Object.keys(document.services).length === 0 &&
      document.revision === event.registryRevision &&
      event.generation === null &&
      event.previousGeneration === null
    );
  }

  if (!event.serviceId) return false;
  const service = document.services[event.serviceId];
  if (!service) return false;

  switch (event.eventType) {
    case "SERVICE_KEY_BOOTSTRAPPED":
      return (
        service.source === "bootstrap" &&
        service.generation === 1 &&
        event.generation === 1 &&
        event.previousGeneration === null
      );
    case "SERVICE_KEY_ROTATED":
      return (
        service.source === "registry" &&
        event.generation === service.generation &&
        event.previousGeneration === (service.previous?.generation ?? null) &&
        event.graceUntil === service.previous?.graceUntil &&
        event.expiresAt === service.active.expiresAt
      );
    case "SERVICE_KEY_ROLLED_BACK":
      return (
        service.source === "rollback" &&
        event.generation === service.generation &&
        event.previousGeneration !== null &&
        event.rollbackOfGeneration === service.rollbackOfGeneration &&
        event.rollbackTargetGeneration === service.rollbackTargetGeneration &&
        event.expiresAt === service.active.expiresAt &&
        event.effectiveUntil === service.active.expiresAt
      );
    case "SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED": {
      if (!event.keyRole || !event.threshold || event.generation === null) return false;
      const markerKey = `${event.serviceId}:${event.generation}:${event.keyRole}:${event.threshold}`;
      if (!document.notificationState[markerKey]) return false;
      return event.keyRole === "active"
        ? event.generation === service.generation && event.previousGeneration === null
        : event.generation === service.previous?.generation &&
            event.previousGeneration === service.previous?.generation;
    }
    default:
      return false;
  }
}

function hasMatchingMutationAuditEvent(
  document: M2MRegistryDocument,
  commitId: string,
  expectedRevision?: number,
): boolean {
  return document.auditEvents.some(
    (event) =>
      event.commitId === commitId &&
      (expectedRevision === undefined || event.registryRevision === expectedRevision) &&
      isOriginalMutationEvent(event) &&
      isAppropriateMutationEvent(document, event),
  );
}

function documentsMatch(left: M2MRegistryDocument, right: M2MRegistryDocument): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function affectedServicesForCommit(
  document: M2MRegistryDocument,
  commitId: string,
): RotatableServiceId[] {
  const serviceIds = new Set<RotatableServiceId>();
  for (const event of document.auditEvents) {
    if (event.commitId === commitId && event.serviceId) serviceIds.add(event.serviceId);
  }

  return [...serviceIds];
}

function buildConflictMetadata(
  serviceId: RotatableServiceId,
  expectedGeneration: number,
  revision: number,
  service: M2MServiceRecord,
): M2MConflictMetadata {
  const previous = service.previous;
  return {
    serviceId,
    expectedGeneration,
    currentGeneration: service.generation,
    currentRevision: revision,
    previousGeneration: previous?.generation ?? null,
    previousGraceUntil: previous?.graceUntil ?? null,
    previousEffectiveUntil: previous ? effectivePreviousDeadline(previous) : null,
    activeExpiresAt: service.active.expiresAt,
  };
}

function servicePreviousState(
  previous: M2MPreviousKeyRecord | null,
  now: Date,
): "none" | "grace" | "expired" {
  if (!previous) return "none";
  return isBeforeNow(effectivePreviousDeadline(previous), now) ? "grace" : "expired";
}

function metricServicesForDocument(document: M2MRegistryDocument): M2MMetricServiceState[] {
  return ROTATABLE_SERVICE_IDS.flatMap((serviceId) => {
    const service = document.services[serviceId];
    if (!service) return [];

    return [{
      serviceId,
      generation: service.generation,
      activeExpiresAt: service.active.expiresAt,
      previousEffectiveUntil: service.previous
        ? effectivePreviousDeadline(service.previous)
        : null,
    }];
  });
}

export class FileM2MKeyStore implements M2MKeyStoreBackend {
  private readonly environment: NodeJS.ProcessEnv;
  private readonly registryPath: string;
  private readonly directoryPath: string;
  private readonly lockPath: string;
  private readonly markerPath: string;
  private readonly registryBaseName: string;
  private readonly now: () => Date;
  private readonly lockWaitMs: number;
  private recoveryRequired = false;

  constructor(options: M2MKeyStoreOptions = {}) {
    this.environment = options.environment ?? process.env;
    const configuredPath = options.registryPath ?? this.environment.M2M_SERVICE_KEY_REGISTRY_PATH;

    if (!configuredPath && this.environment.NODE_ENV === "production") {
      throw new M2MKeyStoreError(
        "m2m_registry_unavailable",
        "M2M service-key registry path is not configured",
      );
    }

    const developmentDefault = path.join(
      os.tmpdir(),
      "conxius-platform",
      `m2m-${process.pid}`,
      "service-key-registry.json",
    );
    this.registryPath = path.resolve(configuredPath || developmentDefault);
    this.directoryPath = path.dirname(this.registryPath);
    this.lockPath = `${this.registryPath}.lock`;
    this.markerPath = `${this.registryPath}.marker`;
    this.registryBaseName = path.basename(this.registryPath);
    this.now = options.now ?? (() => new Date());
    this.lockWaitMs = options.lockWaitMs ?? DEFAULT_M2M_LOCK_WAIT_MS;
  }

  getPath(): string {
    return this.registryPath;
  }

  readiness(): M2MRegistryReadiness {
    if (this.recoveryRequired) {
      recordM2MRegistryUnavailable();
      return { status: "unavailable", state: "recovery-latched" };
    }

    try {
      const document = this.ensureReady();
      recordM2MRegistryState(document.revision, metricServicesForDocument(document));
      return {
        status: "healthy",
        state: Object.keys(document.services).length === 0 ? "valid-empty" : "ready",
      };
    } catch {
      recordM2MRegistryUnavailable();
      return {
        status: "unavailable",
        state: this.recoveryRequired ? "recovery-latched" : "unavailable",
      };
    }
  }

  private ensureReady(): M2MRegistryDocument {
    if (this.recoveryRequired) {
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry recovery is required");
    }

    if (this.fileExists(this.markerPath)) {
      return this.withWriterLock(() => {
        const recovered = this.recoverMarkerUnderLock();
        if (!recovered) {
          throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry recovery is required");
        }
        this.recoveryRequired = false;
        return recovered;
      });
    }

    const active = this.readActiveDocument();
    if (active) {
      if (!this.hasOrphanArtifacts()) return active;
      return this.withWriterLock(() => {
        const marker = this.readCommitMarker();
        if (marker) {
          const recovered = this.recoverMarkerUnderLock();
          if (!recovered) {
            throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry recovery is required");
          }
          this.recoveryRequired = false;
          return recovered;
        }
        this.cleanupOrphanArtifactsUnderLock();
        return this.readActiveDocument() ?? active;
      });
    }

    return this.withWriterLock(() => {
      const marker = this.readCommitMarker();
      if (marker) {
        const recovered = this.recoverMarkerUnderLock();
        if (!recovered) {
          throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry recovery is required");
        }
        this.recoveryRequired = false;
        return recovered;
      }

      const current = this.readActiveDocument();
      if (current) return current;

      this.cleanupOrphanArtifactsUnderLock();
      const initial = this.buildInitialDocument();
      this.commitDocumentUnderLock(null, initial, undefined, "bootstrap");
      return initial;
    });
  }

  private loadReadyDocument(): M2MRegistryDocument {
    try {
      const document = this.ensureReady();
      recordM2MRegistryState(document.revision, metricServicesForDocument(document));
      return document;
    } catch (error) {
      recordM2MRegistryUnavailable();
      throw error;
    }
  }

  validateServiceSecret(
    serviceId: RotatableServiceId,
    secret: string,
  ): M2MServiceValidationResult {
    let document: M2MRegistryDocument;
    try {
      document = this.ensureReady();
    } catch (error) {
      recordM2MRegistryUnavailable();
      recordM2MValidationOutcome(serviceId, "unavailable");
      throw error;
    }
    recordM2MRegistryState(document.revision, metricServicesForDocument(document));
    const service = document.services[serviceId];
    const presentedDigest = hashSecret(secret).digest;

    if (!service) {
      recordM2MValidationOutcome(serviceId, "invalid");
      return { valid: false, serviceId };
    }

    const activeMatch = timingSafeDigestEqual(presentedDigest, digestFromStoredHash(service.active.hash));
    const previousMatch = service.previous
      ? timingSafeDigestEqual(presentedDigest, digestFromStoredHash(service.previous.hash))
      : false;
    const currentTime = this.now();
    const activeAccepted = activeMatch &&
      (service.active.expiresAt === null || isBeforeNow(service.active.expiresAt, currentTime));
    const previousAccepted = previousMatch &&
      isBeforeNow(service.previous?.graceUntil ?? new Date(0).toISOString(), currentTime) &&
      (service.previous?.expiresAt === null ||
        service.previous?.expiresAt === undefined ||
        isBeforeNow(service.previous.expiresAt, currentTime));

    if (activeAccepted) {
      recordM2MValidationOutcome(serviceId, "success");
      return { valid: true, serviceId, generation: service.generation };
    }
    if (previousAccepted && service.previous) {
      recordM2MValidationOutcome(serviceId, "success");
      return { valid: true, serviceId, generation: service.previous.generation };
    }

    recordM2MValidationOutcome(
      serviceId,
      activeMatch || previousMatch ? "expired" : "invalid",
    );
    return { valid: false, serviceId };
  }

  listMetadata(requestId = newSystemRequestId()): M2MRegistryMetadataResponse {
    try {
      const document = this.loadReadyDocument();
      const evaluated = this.persistExpiryThresholds(document, requestId);
      recordM2MRegistryState(evaluated.revision, metricServicesForDocument(evaluated));
      const currentTime = this.now();
      const services = ROTATABLE_SERVICE_IDS
        .filter((serviceId) => evaluated.services[serviceId])
        .map((serviceId) => this.toServiceMetadata(serviceId, evaluated.services[serviceId]!, currentTime));

      return { revision: evaluated.revision, services };
    } catch (error) {
      recordM2MRegistryUnavailable();
      throw error;
    }
  }

  rotate(input: M2MRotateInput): M2MRotationResult {
    try {
      return this.rotateInternal(input);
    } catch (error) {
      if (error instanceof M2MKeyStoreError && error.code === "m2m_registry_unavailable") {
        recordM2MRegistryUnavailable();
      }
      if (isRotatableServiceId(input.serviceId)) {
        recordM2MRotationOutcome(input.serviceId, mutationOutcomeForError(error));
      }
      throw error;
    }
  }

  private rotateInternal(input: M2MRotateInput): M2MRotationResult {
    if (!isRotatableServiceId(input.serviceId)) {
      throw new M2MKeyStoreError("service_not_found", "Service key service not found");
    }
    validateGeneration(input.expectedGeneration);
    const gracePeriodSeconds = validateGracePeriod(input.gracePeriodSeconds);
    const ready = this.ensureReady();
    recordM2MRegistryState(ready.revision, metricServicesForDocument(ready));

    return this.withWriterLock(() => {
      const current = this.loadDocumentForMutationUnderLock();
      const service = current.services[input.serviceId];
      if (!service) {
        throw new M2MKeyStoreError("service_not_found", "Service key service not found");
      }

      if (service.generation !== input.expectedGeneration) {
        throw new M2MKeyStoreError(
          "generation_conflict",
          "Service key generation precondition failed",
          { conflict: buildConflictMetadata(input.serviceId, input.expectedGeneration, current.revision, service) },
        );
      }

      const rotatedAt = isoNow(this.now);
      const rotatedAtDate = new Date(rotatedAt);
      const expiresAt = parseFutureExpiry(input.expiresAt, rotatedAtDate);
      const generatedSecret = randomBytes(32).toString("base64url");
      if (Buffer.from(generatedSecret, "base64url").length !== 32) {
        throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M secret generation failed");
      }
      const generatedHash = hashSecret(generatedSecret).formatted;
      const previousGraceCandidate = new Date(
        rotatedAtDate.getTime() + gracePeriodSeconds * 1000,
      ).toISOString();
      const previousGraceUntil = service.active.expiresAt &&
        new Date(service.active.expiresAt).getTime() < new Date(previousGraceCandidate).getTime()
        ? service.active.expiresAt
        : previousGraceCandidate;
      const nextGeneration = service.generation + 1;
      const nextRevision = current.revision + 1;
      const nextCommitId = this.newCommitId();
      const nextService: M2MServiceRecord = {
        generation: nextGeneration,
        active: {
          keyId: this.newKeyId(),
          hash: generatedHash,
          createdAt: rotatedAt,
          expiresAt,
        },
        previous: {
          generation: service.generation,
          keyId: service.active.keyId,
          hash: service.active.hash,
          createdAt: service.active.createdAt,
          expiresAt: service.active.expiresAt,
          graceUntil: previousGraceUntil,
        },
        source: "registry",
        updatedAt: rotatedAt,
      };
      const auditEvent: M2MAuditEvent = {
        eventId: `event_${randomUUID()}`,
        eventType: "SERVICE_KEY_ROTATED",
        commitId: nextCommitId,
        serviceId: input.serviceId,
        generation: nextGeneration,
        previousGeneration: service.generation,
        registryRevision: nextRevision,
        actor: input.context.actor ?? "admin-api-key",
        requestId: input.context.requestId,
        occurredAt: rotatedAt,
        graceUntil: previousGraceUntil,
        expiresAt,
      };
      const nextDocument: M2MRegistryDocument = {
        ...cloneDocument(current),
        revision: nextRevision,
        lastCommitId: nextCommitId,
        services: {
          ...current.services,
          [input.serviceId]: nextService,
        },
        auditEvents: [...current.auditEvents, auditEvent],
      };

      this.commitDocumentUnderLock(current, nextDocument, undefined, "mutation");
      recordM2MRegistryState(nextRevision, metricServicesForDocument(nextDocument));
      recordM2MRotationOutcome(input.serviceId, "success");

      return {
        serviceId: input.serviceId,
        generation: nextGeneration,
        secret: generatedSecret,
        rotatedAt,
        previousGraceUntil,
        expiresAt,
        revision: nextRevision,
      };
    });
  }

  rollback(input: M2MRollbackInput): M2MRollbackResult {
    try {
      return this.rollbackInternal(input);
    } catch (error) {
      if (error instanceof M2MKeyStoreError && error.code === "m2m_registry_unavailable") {
        recordM2MRegistryUnavailable();
      }
      if (isRotatableServiceId(input.serviceId)) {
        recordM2MRollbackOutcome(input.serviceId, mutationOutcomeForError(error));
      }
      throw error;
    }
  }

  private rollbackInternal(input: M2MRollbackInput): M2MRollbackResult {
    if (!isRotatableServiceId(input.serviceId)) {
      throw new M2MKeyStoreError("service_not_found", "Service key service not found");
    }
    validateGeneration(input.expectedGeneration);
    validateGeneration(input.targetGeneration);
    const reason = sanitizeRollbackReason(input.reason);
    const ready = this.ensureReady();
    recordM2MRegistryState(ready.revision, metricServicesForDocument(ready));

    return this.withWriterLock(() => {
      const current = this.loadDocumentForMutationUnderLock();
      const service = current.services[input.serviceId];
      if (!service) {
        throw new M2MKeyStoreError("service_not_found", "Service key service not found");
      }

      if (service.generation !== input.expectedGeneration) {
        throw new M2MKeyStoreError(
          "generation_conflict",
          "Service key generation precondition failed",
          { conflict: buildConflictMetadata(input.serviceId, input.expectedGeneration, current.revision, service) },
        );
      }

      const previous = service.previous;
      if (!previous || previous.generation !== input.targetGeneration) {
        throw new M2MKeyStoreError("rollback_target_conflict", "Rollback target is not the current previous generation");
      }

      const rolledBackAt = isoNow(this.now);
      const effectiveUntil = effectivePreviousDeadline(previous);
      if (!isBeforeNow(effectiveUntil, new Date(rolledBackAt))) {
        throw new M2MKeyStoreError("rollback_window_expired", "Rollback window has expired");
      }

      const nextGeneration = service.generation + 1;
      const nextRevision = current.revision + 1;
      const nextCommitId = this.newCommitId();
      const nextService: M2MServiceRecord = {
        generation: nextGeneration,
        active: {
          keyId: this.newKeyId(),
          hash: previous.hash,
          createdAt: rolledBackAt,
          expiresAt: effectiveUntil,
        },
        previous: null,
        source: "rollback",
        updatedAt: rolledBackAt,
        rollbackOfGeneration: service.generation,
        rollbackTargetGeneration: previous.generation,
      };
      const auditEvent: M2MAuditEvent = {
        eventId: `event_${randomUUID()}`,
        eventType: "SERVICE_KEY_ROLLED_BACK",
        commitId: nextCommitId,
        serviceId: input.serviceId,
        generation: nextGeneration,
        previousGeneration: service.generation,
        registryRevision: nextRevision,
        actor: input.context.actor ?? "admin-api-key",
        requestId: input.context.requestId,
        occurredAt: rolledBackAt,
        expiresAt: effectiveUntil,
        effectiveUntil,
        rollbackOfGeneration: service.generation,
        rollbackTargetGeneration: previous.generation,
        reason,
      };
      const nextDocument: M2MRegistryDocument = {
        ...cloneDocument(current),
        revision: nextRevision,
        lastCommitId: nextCommitId,
        services: {
          ...current.services,
          [input.serviceId]: nextService,
        },
        auditEvents: [...current.auditEvents, auditEvent],
      };

      this.commitDocumentUnderLock(current, nextDocument, undefined, "mutation");
      recordM2MRegistryState(nextRevision, metricServicesForDocument(nextDocument));
      recordM2MRollbackOutcome(input.serviceId, "success");

      return {
        serviceId: input.serviceId,
        generation: nextGeneration,
        revision: nextRevision,
        source: "rollback",
        rollbackOfGeneration: service.generation,
        rollbackTargetGeneration: previous.generation,
        activeExpiresAt: effectiveUntil,
        rolledBackAt,
      };
    });
  }

  private buildInitialDocument(): M2MRegistryDocument {
    const createdAt = isoNow(this.now);
    const commitId = this.newCommitId();
    const requestId = newSystemRequestId();
    const services: Partial<Record<RotatableServiceId, M2MServiceRecord>> = {};
    const auditEvents: M2MAuditEvent[] = [];

    for (const serviceId of ROTATABLE_SERVICE_IDS) {
      const environmentName = SERVICE_KEY_ENV_VARS[serviceId];
      const secret = this.environment[environmentName];
      if (secret === undefined || secret === "") continue;

      services[serviceId] = {
        generation: 1,
        active: {
          keyId: this.newKeyId(),
          hash: hashSecret(secret).formatted,
          createdAt,
          expiresAt: null,
        },
        previous: null,
        source: "bootstrap",
        updatedAt: createdAt,
      };
      auditEvents.push({
        eventId: `event_${randomUUID()}`,
        eventType: "SERVICE_KEY_BOOTSTRAPPED",
        commitId,
        serviceId,
        generation: 1,
        previousGeneration: null,
        registryRevision: 1,
        actor: "system",
        requestId,
        occurredAt: createdAt,
      });
    }

    if (auditEvents.length === 0) {
      auditEvents.push({
        eventId: `event_${randomUUID()}`,
        eventType: "SERVICE_KEY_BOOTSTRAPPED",
        commitId,
        serviceId: null,
        generation: null,
        previousGeneration: null,
        registryRevision: 1,
        actor: "system",
        requestId,
        occurredAt: createdAt,
      });
    }

    return {
      schemaVersion: M2M_REGISTRY_SCHEMA_VERSION,
      revision: 1,
      lastCommitId: commitId,
      services,
      notificationState: {},
      auditEvents,
    };
  }

  private loadDocumentForMutationUnderLock(): M2MRegistryDocument {
    const marker = this.readCommitMarker();
    if (marker) {
      const recovered = this.recoverMarkerUnderLock();
      if (!recovered) {
        throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry recovery is required");
      }
    }

    const current = this.readActiveDocument();
    if (!current) {
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry is unavailable");
    }

    return current;
  }

  private persistExpiryThresholds(
    document: M2MRegistryDocument,
    requestId: string,
  ): M2MRegistryDocument {
    const candidates = this.findExpiryThresholds(document, this.now());
    if (candidates.length === 0) return document;

    return this.withWriterLock(() => {
      const current = this.loadDocumentForMutationUnderLock();
      const currentCandidates = this.findExpiryThresholds(current, this.now()).filter(
        (candidate) => !current.notificationState[candidate.markerKey],
      );
      if (currentCandidates.length === 0) return current;

      const crossedAt = isoNow(this.now);
      const nextRevision = current.revision + 1;
      const nextCommitId = this.newCommitId();
      const nextDocument = cloneDocument(current);
      nextDocument.revision = nextRevision;
      nextDocument.lastCommitId = nextCommitId;

      for (const candidate of currentCandidates) {
        nextDocument.notificationState[candidate.markerKey] = { crossedAt };
        nextDocument.auditEvents.push({
          eventId: `event_${randomUUID()}`,
          eventType: "SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED",
          commitId: nextCommitId,
          serviceId: candidate.serviceId,
          generation: candidate.generation,
          previousGeneration: candidate.keyRole === "previous" ? candidate.generation : null,
          registryRevision: nextRevision,
          actor: "system",
          requestId,
          occurredAt: crossedAt,
          effectiveUntil: candidate.deadline,
          keyRole: candidate.keyRole,
          threshold: candidate.threshold,
        });
      }

      this.commitDocumentUnderLock(current, nextDocument, undefined, "threshold");
      recordM2MRegistryState(nextRevision, metricServicesForDocument(nextDocument));
      for (const candidate of currentCandidates) {
        recordM2MExpiryThresholdCrossed(
          candidate.serviceId,
          candidate.keyRole,
          candidate.threshold,
        );
      }
      return nextDocument;
    });
  }

  private findExpiryThresholds(document: M2MRegistryDocument, now: Date): Array<{
    markerKey: string;
    serviceId: RotatableServiceId;
    generation: number;
    keyRole: "active" | "previous";
    deadline: string;
    threshold: "30d" | "7d" | "24h" | "1h" | "expired";
  }> {
    const candidates: Array<{
      markerKey: string;
      serviceId: RotatableServiceId;
      generation: number;
      keyRole: "active" | "previous";
      deadline: string;
      threshold: "30d" | "7d" | "24h" | "1h" | "expired";
    }> = [];

    for (const serviceId of ROTATABLE_SERVICE_IDS) {
      const service = document.services[serviceId];
      if (!service) continue;

      const deadlines: Array<{
        keyRole: "active" | "previous";
        generation: number;
        deadline: string | null;
      }> = [
        { keyRole: "active", generation: service.generation, deadline: service.active.expiresAt },
        {
          keyRole: "previous",
          generation: service.previous?.generation ?? 0,
          deadline: service.previous ? effectivePreviousDeadline(service.previous) : null,
        },
      ];

      for (const item of deadlines) {
        if (!item.deadline || item.generation <= 0) continue;
        const remainingSeconds = (new Date(item.deadline).getTime() - now.getTime()) / 1000;
        const threshold = remainingSeconds <= 0
          ? "expired" as const
          : EXPIRY_THRESHOLDS.find((candidate) => remainingSeconds <= candidate.seconds)?.name;
        if (!threshold) continue;

        candidates.push({
          markerKey: `${serviceId}:${item.generation}:${item.keyRole}:${threshold}`,
          serviceId,
          generation: item.generation,
          keyRole: item.keyRole,
          deadline: item.deadline,
          threshold,
        });
      }
    }

    return candidates.filter((candidate) => !document.notificationState[candidate.markerKey]);
  }

  private toServiceMetadata(
    serviceId: RotatableServiceId,
    service: M2MServiceRecord,
    now: Date,
  ): M2MServiceMetadata {
    const previous = service.previous;
    return {
      serviceId,
      generation: service.generation,
      source: service.source,
      activeCreatedAt: service.active.createdAt,
      activeExpiresAt: service.active.expiresAt,
      previousGeneration: previous?.generation ?? null,
      previousCreatedAt: previous?.createdAt ?? null,
      previousExpiresAt: previous?.expiresAt ?? null,
      previousGraceUntil: previous?.graceUntil ?? null,
      previousEffectiveUntil: previous ? effectivePreviousDeadline(previous) : null,
      previousState: servicePreviousState(previous, now),
      updatedAt: service.updatedAt,
    };
  }

  private recoverMarkerUnderLock(): M2MRegistryDocument | null {
    const marker = this.readCommitMarker();
    if (!marker) {
      return this.readActiveDocument();
    }

    const expectedCandidateFile = `${this.registryBaseName}.${marker.commitId}.candidate`;
    const expectedJournalFile = `${this.registryBaseName}.${marker.commitId}.journal`;
    if (
      marker.candidateFile !== expectedCandidateFile ||
      marker.journalFile !== expectedJournalFile
    ) {
      return this.failRecovery("invariant");
    }

    let active: M2MRegistryDocument | null;
    try {
      active = this.readActiveDocument();
    } catch {
      return this.failRecovery("malformed");
    }

    const candidatePath = path.join(this.directoryPath, marker.candidateFile);
    const journalPath = path.join(this.directoryPath, marker.journalFile);
    let journal: M2MRegistryDocument | null;
    try {
      journal = this.readArtifactDocument(journalPath);
    } catch {
      return this.failRecovery("malformed");
    }
    if (!journal) return this.failRecovery("read");
    this.validateRecoveryDocument(journal, marker);

    const activeMatchesMarker = Boolean(
      active &&
      active.revision === marker.revision &&
      active.lastCommitId === marker.commitId,
    );

    if (activeMatchesMarker && active) {
      let candidate: M2MRegistryDocument | null;
      try {
        candidate = this.readArtifactDocument(candidatePath);
      } catch {
        return this.failRecovery("malformed");
      }
      if (candidate && (!documentsMatch(candidate, journal) || !documentsMatch(journal, active))) {
        return this.failRecovery("invariant");
      }
      if (!documentsMatch(journal, active)) return this.failRecovery("invariant");

      if (hasRecoveryCommitEvent(active, marker.commitId, marker.revision)) {
        this.cleanupMarkerArtifactsUnderLock(marker);
        this.cleanupOrphanArtifactsUnderLock();
        return active;
      }

      return this.commitRecoveryEventUnderLock(active, marker);
    }

    const predecessorMatches = active
      ? active.revision === marker.predecessorRevision &&
        active.lastCommitId === marker.predecessorLastCommitId
      : marker.predecessorRevision === 0 && marker.predecessorLastCommitId === null;
    if (!predecessorMatches) return this.failRecovery("invariant");

    let candidate: M2MRegistryDocument | null;
    try {
      candidate = this.readArtifactDocument(candidatePath);
    } catch {
      return this.failRecovery("malformed");
    }
    if (!candidate || !documentsMatch(candidate, journal)) return this.failRecovery("read");

    try {
      fs.renameSync(candidatePath, this.registryPath);
      this.fsyncDirectory();
    } catch {
      return this.failRecovery("write");
    }

    let promoted: M2MRegistryDocument | null;
    try {
      promoted = this.readActiveDocument();
    } catch {
      return this.failRecovery("malformed");
    }
    if (!promoted) return this.failRecovery("read");
    this.validateRecoveryDocument(promoted, marker);

    return this.commitRecoveryEventUnderLock(promoted, marker);
  }

  private validateRecoveryDocument(
    document: M2MRegistryDocument,
    marker: M2MRegistryCommitMarker,
  ): void {
    if (
      document.revision !== marker.revision ||
      document.lastCommitId !== marker.commitId
    ) {
      this.failRecovery("invariant");
    }

    if (marker.predecessorRevision === 0) {
      if (marker.predecessorLastCommitId !== null) this.failRecovery("invariant");
    } else {
      const predecessorCommitIds = new Set(
        document.auditEvents
          .filter((event) => event.registryRevision === marker.predecessorRevision)
          .map((event) => event.commitId),
      );
      if (
        predecessorCommitIds.size !== 1 ||
        !predecessorCommitIds.has(marker.predecessorLastCommitId ?? "")
      ) {
        this.failRecovery("invariant");
      }
    }

    if (hasMatchingMutationAuditEvent(document, marker.commitId, marker.revision)) return;

    const recoveryEvidence = document.auditEvents.some(
      (event) =>
        event.eventType === "SERVICE_KEY_REGISTRY_RECOVERED" &&
        event.commitId === marker.commitId &&
        event.registryRevision === marker.revision &&
        event.recoveredCommitId !== undefined &&
        hasMatchingMutationAuditEvent(document, event.recoveredCommitId),
    );
    if (!recoveryEvidence) this.failRecovery("invariant");
  }

  private failRecovery(category: M2MRegistryFailureCategory): never {
    this.recoveryRequired = true;
    recordM2MRegistryUnavailable();
    recordM2MRegistryWriteFailure("recovery", category);
    throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry recovery is required");
  }

  private commitRecoveryEventUnderLock(
    committed: M2MRegistryDocument,
    marker: M2MRegistryCommitMarker,
  ): M2MRegistryDocument {
    const affectedServices = affectedServicesForCommit(committed, marker.commitId);
    const nextRevision = committed.revision + 1;
    const nextCommitId = this.newCommitId();
    const occurredAt = isoNow(this.now);
    const nextDocument = cloneDocument(committed);
    nextDocument.revision = nextRevision;
    nextDocument.lastCommitId = nextCommitId;

    const services = affectedServices.length > 0 ? affectedServices : [null];
    for (const serviceId of services) {
      const currentService = serviceId ? committed.services[serviceId] : undefined;
      nextDocument.auditEvents.push({
        eventId: `event_${randomUUID()}`,
        eventType: "SERVICE_KEY_REGISTRY_RECOVERED",
        commitId: nextCommitId,
        recoveredCommitId: marker.commitId,
        serviceId,
        generation: currentService?.generation ?? null,
        previousGeneration: currentService?.previous?.generation ?? null,
        registryRevision: nextRevision,
        actor: "system",
        requestId: newSystemRequestId(),
        occurredAt,
      });
    }

    const staleArtifacts: ArtifactCleanup = {
      candidateFile: marker.candidateFile,
      journalFile: marker.journalFile,
    };
    this.commitDocumentUnderLock(committed, nextDocument, staleArtifacts, "recovery");
    return nextDocument;
  }

  private commitDocumentUnderLock(
    previous: M2MRegistryDocument | null,
    next: M2MRegistryDocument,
    staleArtifacts?: ArtifactCleanup,
    failureStage: M2MRegistryFailureStage = "mutation",
  ): void {
    if (
      (previous === null && next.revision !== 1) ||
      (previous !== null && next.revision !== previous.revision + 1)
    ) {
      recordM2MRegistryWriteFailure(failureStage, "invariant");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry revision invariant failed");
    }

    const commitId = next.lastCommitId;
    const candidateFile = `${this.registryBaseName}.${commitId}.candidate`;
    const journalFile = `${this.registryBaseName}.${commitId}.journal`;
    const candidatePath = path.join(this.directoryPath, candidateFile);
    const journalPath = path.join(this.directoryPath, journalFile);
    const markerTempPath = path.join(this.directoryPath, `${this.registryBaseName}.${commitId}.marker.tmp`);
    const marker: M2MRegistryCommitMarker = {
      schemaVersion: M2M_REGISTRY_SCHEMA_VERSION,
      commitId,
      revision: next.revision,
      predecessorRevision: previous?.revision ?? 0,
      predecessorLastCommitId: previous?.lastCommitId ?? null,
      candidateFile,
      journalFile,
    };
    const serializedDocument = `${JSON.stringify(next, null, 2)}\n`;
    const serializedMarker = `${JSON.stringify(marker, null, 2)}\n`;
    let markerCommitted = false;

    try {
      this.writeDurableFile(candidatePath, serializedDocument);
      this.writeDurableFile(journalPath, serializedDocument);
      this.fsyncDirectory();
      this.writeDurableFile(markerTempPath, serializedMarker);
      fs.renameSync(markerTempPath, this.markerPath);
      markerCommitted = true;
      this.fsyncDirectory();
      fs.renameSync(candidatePath, this.registryPath);
      this.fsyncDirectory();

      const persisted = this.readActiveDocument();
      if (
        !persisted ||
        persisted.revision !== next.revision ||
        persisted.lastCommitId !== next.lastCommitId
      ) {
        throw new Error("committed registry validation failed");
      }

      this.unlinkIfExists(this.markerPath);
      this.unlinkIfExists(journalPath);
      if (staleArtifacts?.candidateFile) {
        this.unlinkIfExists(path.join(this.directoryPath, staleArtifacts.candidateFile));
      }
      if (staleArtifacts?.journalFile) {
        this.unlinkIfExists(path.join(this.directoryPath, staleArtifacts.journalFile));
      }
      this.fsyncDirectory();
      this.recoveryRequired = false;
    } catch (error) {
      recordM2MRegistryWriteFailure(
        failureStage,
        markerCommitted ? "post_marker" : "pre_marker",
      );
      if (markerCommitted) {
        this.recoveryRequired = true;
        throw new M2MKeyStoreError(
          "m2m_registry_unavailable",
          "M2M registry commit requires marker-qualified recovery",
        );
      }

      this.removeArtifactsBestEffort([candidatePath, journalPath, markerTempPath]);
      if (error instanceof M2MKeyStoreError) throw error;
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry transaction failed");
    }
  }

  private readActiveDocument(): M2MRegistryDocument | null {
    if (this.fileExists(this.registryPath)) this.assertPrivateFile(this.registryPath, true);
    const parsed = this.readJsonFile(this.registryPath);
    if (parsed === null) return null;
    try {
      return validateRegistryDocument(parsed);
    } catch (error) {
      recordM2MRegistryWriteFailure("storage", "malformed");
      throw error;
    }
  }

  private readArtifactDocument(filePath: string): M2MRegistryDocument | null {
    if (this.fileExists(filePath)) this.assertPrivateFile(filePath, false);
    const parsed = this.readJsonFile(filePath);
    if (parsed === null) return null;
    try {
      return validateRegistryDocument(parsed);
    } catch (error) {
      recordM2MRegistryWriteFailure("recovery", "malformed");
      throw error;
    }
  }

  private readCommitMarker(): M2MRegistryCommitMarker | null {
    try {
      if (this.fileExists(this.markerPath)) this.assertPrivateFile(this.markerPath, false);
      const parsed = this.readJsonFile(this.markerPath);
      if (parsed === null) return null;
      return validateCommitMarker(parsed, this.registryBaseName);
    } catch (error) {
      this.recoveryRequired = true;
      recordM2MRegistryUnavailable();
      recordM2MRegistryWriteFailure("recovery", "malformed");
      if (error instanceof M2MKeyStoreError) throw error;
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry commit marker is unavailable");
    }
  }

  private readJsonFile(filePath: string): unknown | null {
    let contents: string;
    try {
      contents = fs.readFileSync(filePath, "utf8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return null;
      recordM2MRegistryWriteFailure("storage", "read");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry cannot be read");
    }

    try {
      return JSON.parse(contents);
    } catch {
      recordM2MRegistryWriteFailure("storage", "malformed");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry JSON is malformed");
    }
  }

  private writeDurableFile(filePath: string, contents: string): void {
    let fd: number | undefined;
    try {
      fd = fs.openSync(filePath, "wx", 0o600);
      fs.writeFileSync(fd, contents, "utf8");
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.chmodSync(filePath, 0o600);
    } catch {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch {
          // Preserve the fail-closed write error.
        }
      }
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry cannot be durably written");
    }
  }

  private withWriterLock<T>(operation: () => T): T {
    this.ensureStorageDirectory();
    const startedAt = Date.now();
    let lockFd: number | undefined;
    let lockCreated = false;
    while (lockFd === undefined) {
      try {
        lockFd = fs.openSync(this.lockPath, "wx", 0o600);
        lockCreated = true;
        fs.writeFileSync(lockFd, `${process.pid}\n`, "utf8");
        fs.fsyncSync(lockFd);
        fs.chmodSync(this.lockPath, 0o600);
      } catch (error) {
        if (lockFd !== undefined) {
          try {
            fs.closeSync(lockFd);
          } catch {
            // Preserve the fail-closed lock error.
          }
          lockFd = undefined;
        }
        if (lockCreated) {
          try {
            fs.unlinkSync(this.lockPath);
          } catch {
            // Preserve the fail-closed lock error.
          }
          lockCreated = false;
        }

        if (isNodeError(error) && error.code === "EEXIST") {
          if (Date.now() - startedAt >= this.lockWaitMs) {
            recordM2MRegistryWriteFailure("lock", "busy");
            throw new M2MKeyStoreError(
              "m2m_registry_busy",
              "M2M registry writer is busy",
              { retryAfterSeconds: 5 },
            );
          }
          this.sleepSync(25);
          continue;
        }

        recordM2MRegistryWriteFailure("lock", "write");
        throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry lock cannot be acquired");
      }
    }

    let operationError: unknown;
    try {
      return operation();
    } catch (error) {
      operationError = error;
      throw error;
    } finally {
      try {
        if (lockFd !== undefined) fs.closeSync(lockFd);
        this.unlinkIfExists(this.lockPath);
      } catch {
        if (!operationError) {
          throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry lock cannot be released");
        }
      }
    }
  }

  private ensureStorageDirectory(): void {
    try {
      fs.mkdirSync(this.directoryPath, { recursive: true, mode: 0o700 });
      fs.chmodSync(this.directoryPath, 0o700);
      const mode = fs.statSync(this.directoryPath).mode & 0o777;
      if ((mode & 0o077) !== 0 || (mode & 0o700) !== 0o700) {
        throw new Error("M2M registry directory mode is not private");
      }
    } catch {
      recordM2MRegistryWriteFailure("storage", "permission");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry storage is unavailable");
    }
  }

  private fsyncDirectory(): void {
    let fd: number | undefined;
    try {
      fd = fs.openSync(this.directoryPath, fs.constants.O_RDONLY);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
    } catch {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch {
          // Preserve the fail-closed directory durability error.
        }
      }
      recordM2MRegistryWriteFailure("storage", "flush");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry directory cannot be flushed");
    }
  }

  private unlinkIfExists(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if (!(isNodeError(error) && error.code === "ENOENT")) {
        recordM2MRegistryWriteFailure("storage", "cleanup");
        throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry cleanup failed");
      }
    }
  }

  private removeArtifactsBestEffort(filePaths: string[]): void {
    for (const filePath of filePaths) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // A pre-marker cleanup failure is surfaced by the original transaction.
      }
    }
  }

  private cleanupMarkerArtifactsUnderLock(marker: M2MRegistryCommitMarker): void {
    try {
      this.unlinkIfExists(this.markerPath);
      this.unlinkIfExists(path.join(this.directoryPath, marker.candidateFile));
      this.unlinkIfExists(path.join(this.directoryPath, marker.journalFile));
      this.fsyncDirectory();
    } catch {
      this.recoveryRequired = true;
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry recovery cleanup failed");
    }
  }

  private cleanupOrphanArtifactsUnderLock(): void {
    let entries: string[];
    try {
      entries = fs.readdirSync(this.directoryPath);
    } catch {
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry storage cannot be inspected");
    }

    const prefix = `${this.registryBaseName}.commit_`;
    for (const entry of entries) {
      if (
        entry.startsWith(prefix) &&
        (entry.endsWith(".candidate") || entry.endsWith(".journal") || entry.endsWith(".marker.tmp"))
      ) {
        this.unlinkIfExists(path.join(this.directoryPath, entry));
      }
    }
    this.fsyncDirectory();
  }

  private hasOrphanArtifacts(): boolean {
    try {
      const entries = fs.readdirSync(this.directoryPath);
      const prefix = `${this.registryBaseName}.commit_`;
      return entries.some(
        (entry) =>
          entry.startsWith(prefix) &&
          (entry.endsWith(".candidate") || entry.endsWith(".journal") || entry.endsWith(".marker.tmp")),
      );
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return false;
      recordM2MRegistryWriteFailure("storage", "read");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry storage cannot be inspected");
    }
  }

  private assertPrivateFile(filePath: string, writable: boolean): void {
    try {
      const mode = fs.statSync(filePath).mode & 0o777;
      if ((mode & 0o077) !== 0 || (writable && (mode & 0o200) === 0)) {
        throw new Error("M2M registry file mode is not private");
      }
    } catch {
      recordM2MRegistryWriteFailure("storage", "permission");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry file permissions are invalid");
    }
  }

  private fileExists(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return false;
      recordM2MRegistryWriteFailure("storage", "read");
      throw new M2MKeyStoreError("m2m_registry_unavailable", "M2M registry state cannot be inspected");
    }
  }

  private newCommitId(): string {
    return `commit_${randomUUID()}`;
  }

  private newKeyId(): string {
    return `key_${randomUUID()}`;
  }

  private sleepSync(milliseconds: number): void {
    const signal = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(signal, 0, 0, milliseconds);
  }
}

const storeInstances = new Map<string, M2MKeyStoreBackend>();

function configuredRegistryPath(environment: NodeJS.ProcessEnv = process.env): string {
  const configured = environment.M2M_SERVICE_KEY_REGISTRY_PATH;
  if (configured) return path.resolve(configured);

  return path.resolve(
    path.join(
      os.tmpdir(),
      "conxius-platform",
      `m2m-${process.pid}`,
      "service-key-registry.json",
    ),
  );
}

export function getM2MKeyStore(): M2MKeyStoreBackend {
  const registryPath = configuredRegistryPath();
  const existing = storeInstances.get(registryPath);
  if (existing) return existing;

  const store = new FileM2MKeyStore();
  storeInstances.set(registryPath, store);
  return store;
}

export function getM2MKeyStoreReadiness(): M2MRegistryReadiness {
  try {
    return getM2MKeyStore().readiness();
  } catch {
    recordM2MRegistryUnavailable();
    return { status: "unavailable", state: "unavailable" };
  }
}

export function resetM2MKeyStoreForTests(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("M2M key-store test reset is not available in production");
  }
  storeInstances.clear();
}

export function parseM2MServiceKeyHeader(
  headerValue: string | null,
  expectedServiceId?: RotatableServiceId,
): { serviceId: RotatableServiceId; secret: string } | null {
  return parseServiceKeyHeader(headerValue, expectedServiceId);
}
