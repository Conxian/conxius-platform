import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "../app/api/v1/wallet/psbt/route";
import { Bip322Bridge } from "../lib/support/bip322";

const ADMIN_KEY = "route-admin-key";
const originalKey = process.env.ADMIN_DASHBOARD_API_KEY;

function request(body: unknown): Request {
  return new Request("http://localhost/api/v1/wallet/psbt", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-API-Key": ADMIN_KEY },
    body: JSON.stringify(body),
  });
}

describe("wallet psbt route (fail-closed authorization)", () => {
  beforeEach(() => {
    process.env.ADMIN_DASHBOARD_API_KEY = ADMIN_KEY;
    Bip322Bridge.configureVerifier(null);
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ADMIN_DASHBOARD_API_KEY;
    else process.env.ADMIN_DASHBOARD_API_KEY = originalKey;
    Bip322Bridge.configureVerifier(null);
  });

  it("refuses to sign a PSBT instead of returning a fabricated signature", async () => {
    const res = await POST(request({ action: "sign", psbt: "cHNidP8=" }));
    expect(res.status).toBe(501);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("psbt_signing_not_available");
  });

  it("never returns a signed PSBT or attestation field", async () => {
    const res = await POST(request({ action: "sign" }));
    const json = await res.json();
    expect(json.signed_psbt).toBeUndefined();
    expect(json.attestation).toBeUndefined();
  });

  it("fails closed when verifying an intent without a configured verifier", async () => {
    const res = await POST(
      request({
        action: "verify-intent",
        intent: { type: "usi:settlement" },
        signature: "smp:BASE64_SIGNATURE_HERE",
        address: "bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l",
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.provenance).toBe("unavailable");
  });

  it("requires authentication before doing anything", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/wallet/psbt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign" }),
      })
    );
    expect(res.status).toBe(401);
  });
});
