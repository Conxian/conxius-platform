import { describe, expect, it } from "vitest";
import { normalizeNexusState } from "@/lib/nexusContract";

describe("normalizeNexusState", () => {
  it("maps minimum nexus fields and prefers explicit sync_status", () => {
    const result = normalizeNexusState(
      {
        merkle_root: "0xmerkle",
        leaf_count: 128,
        sync_status: "syncing",
      },
      {
        drift: 0,
        state_root: "0xstate-root",
        processed_height: 64,
      }
    );

    expect(result).toEqual({
      merkleRoot: "0xmerkle",
      leafCount: 128,
      syncStatus: "syncing",
    });
  });

  it("falls back to /api/v1/status fields when nexus fields are missing", () => {
    const result = normalizeNexusState(
      {},
      {
        state_root: "0xfallback-root",
        processed_height: 42,
        drift: 0,
      }
    );

    expect(result).toEqual({
      merkleRoot: "0xfallback-root",
      leafCount: 42,
      syncStatus: "synced",
    });
  });

  it("falls back to mmr_root and drift-derived syncing status", () => {
    const result = normalizeNexusState(
      null,
      {
        mmr_root: "0xmmr-root",
        processed_height: 99,
        drift: 3,
      }
    );

    expect(result).toEqual({
      merkleRoot: "0xmmr-root",
      leafCount: 99,
      syncStatus: "syncing",
    });
  });

  it("treats unrecognized explicit sync_status as unknown instead of drift fallback", () => {
    const result = normalizeNexusState(
      {
        merkle_root: "0xmerkle",
        leaf_count: 8,
        sync_status: "pending",
      },
      {
        drift: 0,
      }
    );

    expect(result).toEqual({
      merkleRoot: "0xmerkle",
      leafCount: 8,
      syncStatus: "unknown",
    });
  });
});
