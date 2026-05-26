export type NexusSyncStatus = "synced" | "syncing" | "unknown";

export type NexusState = {
  merkleRoot: string | null;
  syncStatus: NexusSyncStatus;
  leafCount: number | null;
};

function getNumberField(obj: unknown, key: string): number | null {
  if (typeof obj !== "object" || obj === null) return null;
  if (!(key in (obj as Record<string, unknown>))) return null;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getStringField(obj: unknown, key: string): string | null {
  if (typeof obj !== "object" || obj === null) return null;
  if (!(key in (obj as Record<string, unknown>))) return null;
  const value = (obj as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function normalizeExplicitSyncStatus(syncStatus: string | null): NexusSyncStatus | null {
  if (syncStatus === null) return null;

  const normalized = syncStatus.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "synced" || normalized === "syncing" || normalized === "unknown") {
    return normalized;
  }

  return "unknown";
}

function fallbackSyncStatusFromDrift(statusJson: unknown): NexusSyncStatus {
  const drift = getNumberField(statusJson, "drift");
  if (drift === null) return "unknown";
  return drift === 0 ? "synced" : "syncing";
}

export function normalizeNexusState(nexusJson: unknown, statusJson: unknown): NexusState {
  const explicitSyncStatus = normalizeExplicitSyncStatus(getStringField(nexusJson, "sync_status"));

  return {
    merkleRoot:
      getStringField(nexusJson, "merkle_root") ??
      getStringField(statusJson, "state_root") ??
      getStringField(statusJson, "mmr_root"),
    syncStatus: explicitSyncStatus ?? fallbackSyncStatusFromDrift(statusJson),
    leafCount:
      getNumberField(nexusJson, "leaf_count") ??
      getNumberField(statusJson, "processed_height"),
  };
}
