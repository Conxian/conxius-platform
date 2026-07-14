import { z } from "zod";

const AI_ALLOCATION_WEIGHT_SUM_EPSILON = 0.001;
const UBI_IDENTITY_HASH_REGEX = /^ubi:btc:[^\s]+$/;

const aiAllocationSchema = z
  .object({
    status: z.string().min(1, "status must be a non-empty string"),
    allocations: z
      .array(
        z
          .object({
            agent: z.string().min(1, "allocations[].agent must be a non-empty string"),
            weight: z.number().finite().min(0).max(1),
          })
          .passthrough()
      )
      .min(1, "allocations must contain at least one entry"),
    profile: z.string().min(1).optional(),
  })
  .passthrough();

const ubiIdentitySchema = z
  .object({
    identity_hash: z
      .string()
      .regex(UBI_IDENTITY_HASH_REGEX, "identity_hash must match ubi:btc:{id}"),
  })
  .passthrough();

const multidimensionalMetricsSchema = z.object({
  treasury: z.record(z.string(), z.object({
    balance: z.number(),
    pnl_usd: z.number(),
    yield_apy: z.number().optional()
  })),
  agents: z.array(z.object({
    id: z.string(),
    weight: z.number(),
    budget_usd: z.number(),
    consumed_usd: z.number()
  })),
  settlements: z.record(z.string(), z.object({
    count: z.number(),
    volume_sats: z.number(),
    status: z.string()
  }))
}).passthrough();

const envSchema = z.object({
  CONXIAN_GATEWAY_URL: z.string().url().default("http://localhost:8080"),
  CONXIAN_SOCIAL_URL: z.string().url().default("http://localhost:3002"),
  CONXIAN_ADMIN_URL: z.string().url().default("http://localhost:3001"),
});

export type ConxianPluginEnv = z.infer<typeof envSchema>;
export type AiAllocationResponse = z.infer<typeof aiAllocationSchema>;
export type UbiIdentityResponse = z.infer<typeof ubiIdentitySchema>;
export type MultidimensionalMetricsResponse = z.infer<typeof multidimensionalMetricsSchema>;

function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function normalizeAiProfile(profile?: string): string | undefined {
  if (profile === undefined) return undefined;
  const normalized = profile.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Invalid AI allocation request: profile must be a non-empty string");
  }
  return normalized;
}

function validateAiAllocationPayload(payload: unknown): AiAllocationResponse {
  const parsed = aiAllocationSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid AI allocation payload: ${formatValidationError(parsed.error)}`);
  }

  const totalWeight = parsed.data.allocations.reduce((sum, allocation) => sum + allocation.weight, 0);
  if (Math.abs(totalWeight - 1) > AI_ALLOCATION_WEIGHT_SUM_EPSILON) {
    throw new Error(
      `Invalid AI allocation payload: allocations weights must sum to 1±${AI_ALLOCATION_WEIGHT_SUM_EPSILON} (received ${totalWeight.toFixed(6)})`
    );
  }

  return parsed.data;
}

function validateUbiIdentityPayload(payload: unknown): UbiIdentityResponse {
  const parsed = ubiIdentitySchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid UBI identity payload: ${formatValidationError(parsed.error)}`);
  }

  return parsed.data;
}

export function parseConxianEnv(config: Record<string, string | undefined>): ConxianPluginEnv {
  const input = {
    CONXIAN_GATEWAY_URL: config.CONXIAN_GATEWAY_URL || process.env.CONXIAN_GATEWAY_URL,
    CONXIAN_SOCIAL_URL: config.CONXIAN_SOCIAL_URL || process.env.CONXIAN_SOCIAL_URL,
    CONXIAN_ADMIN_URL: config.CONXIAN_ADMIN_URL || process.env.CONXIAN_ADMIN_URL,
  };

  return envSchema.parse(input);
}

/**
 * Build M2M auth headers for service-to-service requests
 */
function getServiceAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  
  // Add admin API key if configured
  const adminKey = process.env.CONXIAN_ADMIN_API_KEY;
  if (adminKey) {
    headers['X-Admin-API-Key'] = adminKey;
  }
  
  // Add service key for internal services (elizaos plugin)
  const serviceKey = process.env.SERVICE_KEY_ELIZAOS;
  if (serviceKey) {
    headers['X-Service-Key'] = `elizaos:${serviceKey}`;
  }
  
  return headers;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  
  // Add M2M auth headers
  const authHeaders = getServiceAuthHeaders();
  authHeaders.forEach((value, key) => {
    if (!headers.has(key)) headers.set(key, value);
  });

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

export async function getAiAllocation(env: ConxianPluginEnv, profile?: string): Promise<AiAllocationResponse> {
  const url = new URL(`${env.CONXIAN_GATEWAY_URL.replace(/\/$/, "")}/api/v1/ai/allocation`);
  const normalizedProfile = normalizeAiProfile(profile);
  if (normalizedProfile) url.searchParams.set("profile", normalizedProfile);

  const payload = await fetchJson(url.toString(), { cache: "no-store" });
  return validateAiAllocationPayload(payload);
}

export async function getUbiIdentity(env: ConxianPluginEnv, address: string): Promise<UbiIdentityResponse> {
  const normalizedAddress = address.trim();
  if (!normalizedAddress) {
    throw new Error("Invalid UBI identity request: address must be a non-empty string");
  }

  const payload = await fetchJson(
    `${env.CONXIAN_GATEWAY_URL.replace(/\/$/, "")}/api/v1/identity/ubi/${encodeURIComponent(normalizedAddress)}`,
    {
      cache: "no-store",
    }
  );

  return validateUbiIdentityPayload(payload);
}

export async function getMultidimensionalMetrics(env: ConxianPluginEnv): Promise<MultidimensionalMetricsResponse> {
  const payload = await fetchJson(`${env.CONXIAN_ADMIN_URL.replace(/\/$/, "")}/api/multidimensional/metrics`, {
    cache: "no-store",
  });

  const parsed = multidimensionalMetricsSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid Multidimensional metrics payload: ${formatValidationError(parsed.error)}`);
  }
  return parsed.data;
}
