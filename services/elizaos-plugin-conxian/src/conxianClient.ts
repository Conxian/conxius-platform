import { z } from "zod";

const envSchema = z.object({
  CONXIAN_GATEWAY_URL: z.string().url().default("http://localhost:8080"),
  CONXIAN_SOCIAL_URL: z.string().url().default("http://localhost:3002"),
});

export type ConxianPluginEnv = z.infer<typeof envSchema>;

export function parseConxianEnv(config: Record<string, string | undefined>): ConxianPluginEnv {
  const input = {
    CONXIAN_GATEWAY_URL: config.CONXIAN_GATEWAY_URL || process.env.CONXIAN_GATEWAY_URL,
    CONXIAN_SOCIAL_URL: config.CONXIAN_SOCIAL_URL || process.env.CONXIAN_SOCIAL_URL,
  };

  return envSchema.parse(input);
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const r = await fetch(url, {
    ...init,
    headers,
  });

  const body = await r.text();
  let data: unknown;
  try {
    data = body.length ? JSON.parse(body) : null;
  } catch {
    data = body;
  }

  if (!r.ok) {
    throw new Error(`HTTP ${r.status} from ${url}`);
  }
  return data;
}

export async function getGatewayStatus(env: ConxianPluginEnv): Promise<unknown> {
  return fetchJson(`${env.CONXIAN_GATEWAY_URL.replace(/\/$/, "")}/api/v1/status`, { cache: "no-store" });
}

export async function getSbtcYield(env: ConxianPluginEnv): Promise<unknown> {
  return fetchJson(`${env.CONXIAN_GATEWAY_URL.replace(/\/$/, "")}/api/v1/lorenzo/stats`, { cache: "no-store" });
}

export async function getCartMandate(env: ConxianPluginEnv, id: string): Promise<unknown> {
  return fetchJson(`${env.CONXIAN_SOCIAL_URL.replace(/\/$/, "")}/api/cart/mandates/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}

export async function submitVote(env: ConxianPluginEnv, input: { proposalId: string; fid: number; choice: "yes" | "no" }): Promise<unknown> {
  return fetchJson(`${env.CONXIAN_SOCIAL_URL.replace(/\/$/, "")}/api/governance/votes`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function checkoutCartX402(env: ConxianPluginEnv, input: { id: string; paymentSignature?: string }): Promise<{
  status: number;
  paymentRequired?: string;
  body: unknown;
}> {
  const url = `${env.CONXIAN_SOCIAL_URL.replace(/\/$/, "")}/api/cart/mandates/${encodeURIComponent(input.id)}/checkout`;

  const r = await fetch(url, {
    cache: "no-store",
    headers: input.paymentSignature ? { "PAYMENT-SIGNATURE": input.paymentSignature } : undefined,
  });

  const text = await r.text();
  let body: unknown = null;
  if (text.length) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  const paymentRequiredHeader = r.headers.get("payment-required");

  return {
    status: r.status,
    paymentRequired: paymentRequiredHeader ?? undefined,
    body,
  };
}

export async function getAiAllocation(env: ConxianPluginEnv): Promise<unknown> {
  return fetchJson(`${env.CONXIAN_GATEWAY_URL.replace(/\/$/, "")}/api/v1/ai/allocation`, { cache: "no-store" });
}

export async function getUbiIdentity(env: ConxianPluginEnv, address: string): Promise<unknown> {
  return fetchJson(`${env.CONXIAN_GATEWAY_URL.replace(/\/$/, "")}/api/v1/identity/ubi/${encodeURIComponent(address)}`, { cache: "no-store" });
}
