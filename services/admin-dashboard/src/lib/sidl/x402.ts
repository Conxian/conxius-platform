import type { X402PaymentRequired } from "./types";

export function encodePaymentRequiredHeader(payload: X402PaymentRequired): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, "utf8").toString("base64");
}

export function decodePaymentRequiredHeader(value: string): X402PaymentRequired | null {
  try {
    const json = Buffer.from(value, "base64").toString("utf8");
    const parsed = JSON.parse(json) as unknown;

    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (
      typeof o.maxAmountRequired !== "string" ||
      typeof o.resource !== "string" ||
      typeof o.payTo !== "string" ||
      typeof o.asset !== "string" ||
      typeof o.network !== "string"
    ) {
      return null;
    }

    return {
      maxAmountRequired: o.maxAmountRequired,
      resource: o.resource,
      description: typeof o.description === "string" ? o.description : undefined,
      payTo: o.payTo,
      asset: o.asset,
      network: o.network,
    };
  } catch {
    return null;
  }
}
