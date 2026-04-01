import type { YieldSnapshot } from "./types";

function gatewayBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8080").replace(/\/$/, "");
}

export async function getSbtcYieldSnapshot(): Promise<YieldSnapshot> {
  const updatedAtIso = new Date().toISOString();

  try {
    // Gateway currently exposes a yield-oriented shape via lorenzo staking stats.
    const r = await fetch(`${gatewayBaseUrl()}/api/v1/lorenzo/stats`, { cache: "no-store" });
    if (!r.ok) return { token: "sBTC", apy: null, updatedAtIso };

    const j = (await r.json().catch(() => null)) as unknown;
    const apyStr = typeof j === "object" && j !== null && "yield_apy" in j ? (j as { yield_apy?: unknown }).yield_apy : undefined;
    const apy = typeof apyStr === "number" ? apyStr : typeof apyStr === "string" ? Number(apyStr) : null;

    return { token: "sBTC", apy: Number.isFinite(apy) ? apy : null, updatedAtIso };
  } catch {
    return { token: "sBTC", apy: null, updatedAtIso };
  }
}
