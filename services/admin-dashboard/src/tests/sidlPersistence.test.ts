import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("SIDL persistent state", () => {
  let tmpDir: string;
  let statePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "conxian-sidl-state-"));
    statePath = path.join(tmpDir, "state.json");
    process.env.SIDL_STATE_FILE = statePath;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.SIDL_STATE_FILE;
    vi.resetModules();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("seeds default mandates and persists votes across module reloads", async () => {
    fs.writeFileSync(statePath, "", "utf8");

    const { getCartMandate } = await import("@/lib/sidl/cart");
    const { getVoteTally, recordVote } = await import("@/lib/sidl/voteStore");

    const seededMandate = getCartMandate("sbtc-yield-frame");
    expect(seededMandate?.id).toBe("sbtc-yield-frame");

    recordVote({
      proposalId: "conxian-sbtc-yield-policy",
      fid: 42,
      choice: "yes",
    });

    expect(getVoteTally("conxian-sbtc-yield-policy")).toEqual({
      proposalId: "conxian-sbtc-yield-policy",
      yes: 1,
      no: 0,
    });

    const persisted = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
      proposals: Record<string, unknown>;
      voteEvents: unknown[];
      voteTallies: Record<string, { yes: number; no: number }>;
      cartMandates: Record<string, unknown>;
    };

    expect(persisted.proposals["conxian-sbtc-yield-policy"]).toBeTruthy();
    expect(persisted.voteEvents).toHaveLength(1);
    expect(persisted.voteTallies["conxian-sbtc-yield-policy"]).toMatchObject({ yes: 1, no: 0 });
    expect(persisted.cartMandates["sbtc-yield-frame"]).toBeTruthy();

    vi.resetModules();
    const { getVoteTally: getVoteTallyAfterReload } = await import("@/lib/sidl/voteStore");

    expect(getVoteTallyAfterReload("conxian-sbtc-yield-policy")).toEqual({
      proposalId: "conxian-sbtc-yield-policy",
      yes: 1,
      no: 0,
    });
  });

  it("records checkout payment-required and payment-attempt lifecycle audit events", async () => {
    const { GET } = await import("../app/api/cart/mandates/[id]/checkout/route");
    const { getCheckoutAuditTrail } = await import("@/lib/sidl/stateStore");

    const challengeResponse = await GET(new Request("http://localhost/api/cart/mandates/sbtc-yield-frame/checkout"), {
      params: Promise.resolve({ id: "sbtc-yield-frame" }),
    });

    expect(challengeResponse.status).toBe(402);
    const challengeBody = (await challengeResponse.json()) as { error?: string };
    expect(challengeBody.error).toBe("payment-required");

    const successResponse = await GET(
      new Request("http://localhost/api/cart/mandates/sbtc-yield-frame/checkout", {
        headers: {
          "PAYMENT-SIGNATURE": "mock-signature",
        },
      }),
      {
        params: Promise.resolve({ id: "sbtc-yield-frame" }),
      }
    );

    expect(successResponse.status).toBe(200);

    const checkoutAudit = getCheckoutAuditTrail("sbtc-yield-frame");
    expect(checkoutAudit).not.toBeNull();
    expect(checkoutAudit?.state.status).toBe("settled");
    expect(checkoutAudit?.state.challengeCount).toBe(1);
    expect(checkoutAudit?.state.paymentAttemptCount).toBe(1);
    expect(checkoutAudit?.state.settledCount).toBe(1);
    expect(checkoutAudit?.events.map((event) => event.type)).toEqual([
      "payment-required",
      "payment-attempted",
      "payment-settled",
    ]);
    expect(checkoutAudit?.events[0]?.paymentRequired?.resource).toBe("/api/cart/mandates/sbtc-yield-frame/checkout");
    expect(checkoutAudit?.events[1]?.paymentSignatureSha256).toMatch(/^[a-f0-9]{64}$/);

    const persisted = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
      checkoutByMandate: Record<string, { events: unknown[] }>;
    };

    expect(persisted.checkoutByMandate["sbtc-yield-frame"].events).toHaveLength(3);
  });
});
