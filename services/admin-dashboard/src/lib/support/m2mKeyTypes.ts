export const ROTATABLE_SERVICE_IDS = [
  "gateway",
  "elizaos",
  "nexus",
  "orbit",
  "wallet",
  "ui",
  "admin-dashboard",
  "pulse-bos",
] as const;

export type RotatableServiceId = (typeof ROTATABLE_SERVICE_IDS)[number];

export const SERVICE_KEY_ENV_VARS: Record<RotatableServiceId, string> = {
  gateway: "SERVICE_KEY_GATEWAY",
  elizaos: "SERVICE_KEY_ELIZAOS",
  nexus: "SERVICE_KEY_NEXUS",
  orbit: "SERVICE_KEY_ORBIT",
  wallet: "SERVICE_KEY_WALLET",
  ui: "SERVICE_KEY_UI",
  "admin-dashboard": "SERVICE_KEY_ADMIN_DASHBOARD",
  "pulse-bos": "SERVICE_KEY_PULSE_BOS",
};

export const M2M_REGISTRY_SCHEMA_VERSION = 1 as const;
export const DEFAULT_M2M_GRACE_PERIOD_SECONDS = 86_400;
export const MIN_M2M_GRACE_PERIOD_SECONDS = 300;
export const MAX_M2M_GRACE_PERIOD_SECONDS = 604_800;
export const DEFAULT_M2M_LOCK_WAIT_MS = 5_000;
export const M2M_LOCK_RETRY_AFTER_SECONDS = 5;

export type M2MKeySource = "bootstrap" | "registry" | "rollback";

export interface M2MActiveKeyRecord {
  keyId: string;
  hash: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface M2MPreviousKeyRecord extends M2MActiveKeyRecord {
  generation: number;
  graceUntil: string;
}

export interface M2MServiceRecord {
  generation: number;
  active: M2MActiveKeyRecord;
  previous: M2MPreviousKeyRecord | null;
  source: M2MKeySource;
  updatedAt: string;
  rollbackOfGeneration?: number;
  rollbackTargetGeneration?: number;
}

export type M2MAuditEventType =
  | "SERVICE_KEY_BOOTSTRAPPED"
  | "SERVICE_KEY_ROTATED"
  | "SERVICE_KEY_ROLLED_BACK"
  | "SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED"
  | "SERVICE_KEY_REGISTRY_RECOVERED";

export type M2MAuditActor = "admin-api-key" | "system";

export interface M2MAuditEvent {
  eventId: string;
  eventType: M2MAuditEventType;
  commitId: string;
  recoveredCommitId?: string;
  serviceId: RotatableServiceId | null;
  generation: number | null;
  previousGeneration: number | null;
  registryRevision: number;
  actor: M2MAuditActor;
  requestId: string;
  occurredAt: string;
  graceUntil?: string;
  expiresAt?: string | null;
  effectiveUntil?: string;
  keyRole?: "active" | "previous";
  threshold?: "30d" | "7d" | "24h" | "1h" | "expired";
  rollbackOfGeneration?: number;
  rollbackTargetGeneration?: number;
  reason?: string;
}

export interface M2MNotificationMarker {
  crossedAt: string;
}

export interface M2MRegistryDocument {
  schemaVersion: typeof M2M_REGISTRY_SCHEMA_VERSION;
  revision: number;
  lastCommitId: string;
  services: Partial<Record<RotatableServiceId, M2MServiceRecord>>;
  notificationState: Record<string, M2MNotificationMarker>;
  auditEvents: M2MAuditEvent[];
}

export interface M2MRegistryCommitMarker {
  schemaVersion: typeof M2M_REGISTRY_SCHEMA_VERSION;
  commitId: string;
  revision: number;
  predecessorRevision: number;
  predecessorLastCommitId: string | null;
  candidateFile: string;
  journalFile: string;
}

export interface M2MConflictMetadata {
  serviceId: RotatableServiceId;
  expectedGeneration: number;
  currentGeneration: number;
  currentRevision: number;
  previousGeneration: number | null;
  previousGraceUntil: string | null;
  previousEffectiveUntil: string | null;
  activeExpiresAt: string | null;
}

export interface M2MServiceMetadata {
  serviceId: RotatableServiceId;
  generation: number;
  source: M2MKeySource;
  activeCreatedAt: string;
  activeExpiresAt: string | null;
  previousGeneration: number | null;
  previousCreatedAt: string | null;
  previousExpiresAt: string | null;
  previousGraceUntil: string | null;
  previousEffectiveUntil: string | null;
  previousState: "none" | "grace" | "expired";
  updatedAt: string;
}

export interface M2MRegistryMetadataResponse {
  revision: number;
  services: M2MServiceMetadata[];
}

export type M2MRegistryReadinessState =
  | "ready"
  | "valid-empty"
  | "unavailable"
  | "recovery-latched";

export interface M2MRegistryReadiness {
  status: "healthy" | "unavailable";
  state: M2MRegistryReadinessState;
}

export interface M2MRotationResult {
  serviceId: RotatableServiceId;
  generation: number;
  secret: string;
  rotatedAt: string;
  previousGraceUntil: string;
  expiresAt: string | null;
  revision: number;
}

export interface M2MRollbackResult {
  serviceId: RotatableServiceId;
  generation: number;
  revision: number;
  source: "rollback";
  rollbackOfGeneration: number;
  rollbackTargetGeneration: number;
  activeExpiresAt: string;
  rolledBackAt: string;
}

export interface M2MStoreContext {
  requestId: string;
  actor?: M2MAuditActor;
}

export interface M2MKeyStoreOptions {
  registryPath?: string;
  environment?: NodeJS.ProcessEnv;
  now?: () => Date;
  lockWaitMs?: number;
}

export interface M2MServiceValidationResult {
  valid: boolean;
  serviceId: RotatableServiceId;
  generation?: number;
}

export type M2MStoreErrorCode =
  | "m2m_registry_unavailable"
  | "m2m_registry_busy"
  | "service_not_found"
  | "generation_conflict"
  | "rollback_window_expired"
  | "rollback_target_conflict"
  | "invalid_generation_precondition"
  | "invalid_grace_period"
  | "invalid_expiry"
  | "invalid_request";

export class M2MKeyStoreError extends Error {
  readonly code: M2MStoreErrorCode;
  readonly retryAfterSeconds?: number;
  readonly conflict?: M2MConflictMetadata;

  constructor(
    code: M2MStoreErrorCode,
    message: string,
    options?: {
      retryAfterSeconds?: number;
      conflict?: M2MConflictMetadata;
    },
  ) {
    super(message);
    this.name = "M2MKeyStoreError";
    this.code = code;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.conflict = options?.conflict;
  }
}

export function isRotatableServiceId(value: string): value is RotatableServiceId {
  return (ROTATABLE_SERVICE_IDS as readonly string[]).includes(value);
}
