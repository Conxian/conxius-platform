import type { X402PaymentRequired } from "./types";

function base64EncodeUtf8(s: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(s, "utf8").toString("base64");

  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64DecodeUtf8(b64: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");

  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeBase64Json(value: unknown): string {
  return base64EncodeUtf8(JSON.stringify(value));
}

export function encodePaymentRequiredHeader(payload: X402PaymentRequired): string {
  const json = JSON.stringify(payload);
  return base64EncodeUtf8(json);
}

export function decodePaymentRequiredHeader(value: string): X402PaymentRequired | null {
  try {
    const json = base64DecodeUtf8(value);
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
