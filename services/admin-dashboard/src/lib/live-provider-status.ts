import "server-only";

export type LiveState = "reachable" | "degraded" | "unavailable" | "not-configured";

export type LiveProviderStatus = {
  name: string;
  state: LiveState;
  checkedAt: string;
  latencyMs: number | null;
  detail: string;
  source: "live-probe" | "configuration";
};

type ProbeRequest = { url: string; headers?: HeadersInit };
type Provider = {
  name: string;
  env: string[];
  request?: () => ProbeRequest | null;
  configurationOnly?: boolean;
};

function firstEnv(...keys: string[]) {
  return keys.map((key) => process.env[key]?.trim()).find(Boolean);
}

function urlRequest(value: string | undefined, suffix = ""): ProbeRequest | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.pathname = `${url.pathname.replace(/\/$/, "")}${suffix}` || "/";
    return { url: url.toString() };
  } catch {
    return null;
  }
}

function providerRequest(value: string | undefined, suffix = "", headers?: HeadersInit) {
  const request = urlRequest(value, suffix);
  return request ? { ...request, headers } : null;
}

const providers: Provider[] = [
  { name: "Gateway", env: ["GATEWAY_URL"], request: () => providerRequest(process.env.GATEWAY_URL, "/health") },
  { name: "Nexus", env: ["NEXUS_ADMIN_API_TOKEN", "NEXUS_URL"], request: () => providerRequest(process.env.NEXUS_URL, "/health", { Authorization: `Bearer ${process.env.NEXUS_ADMIN_API_TOKEN ?? ""}` }) },
  { name: "Neon", env: ["NEON_DATABASE_URL", "DATABASE_URL"], configurationOnly: true },
  { name: "AWS Aurora PostgreSQL", env: ["AWS_APG_AWS_RESOURCE_ARN", "AWS_APG_PGHOST"], configurationOnly: true },
  { name: "ERP attestation", env: ["ERP_ATTESTATION_TRUSTED_KEYS_JSON"], configurationOnly: true },
  { name: "Nostr relays", env: ["NOSTR_RELAYS"], request: () => providerRequest(firstEnv("NOSTR_RELAYS")?.split(",")[0], "", { Accept: "application/nostr+json" }) },
  { name: "Supabase", env: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"], request: () => providerRequest(firstEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"), "/rest/v1/", { apikey: firstEnv("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? "" }) },
  { name: "Upstash", env: ["UPSTASH_KV_KV_REST_API_URL", "UPSTASH_KV_KV_REST_API_TOKEN"], request: () => providerRequest(process.env.UPSTASH_KV_KV_REST_API_URL, "/ping", { Authorization: `Bearer ${process.env.UPSTASH_KV_KV_REST_API_TOKEN ?? ""}` }) },
  { name: "Stacks", env: ["STACKS_NODE_RPC_URL"], request: () => providerRequest(process.env.STACKS_NODE_RPC_URL, "/v3/health") },
  { name: "Oracle", env: ["ORACLE_ENDPOINT_URL"], request: () => providerRequest(process.env.ORACLE_ENDPOINT_URL, "/health") },
  { name: "Tableland", env: ["TABLELAND_BASE_URL"], request: () => providerRequest(process.env.TABLELAND_BASE_URL, "/api/v1/health") },
  { name: "Kwil", env: ["KWIL_PROVIDER_URL"], request: () => providerRequest(process.env.KWIL_PROVIDER_URL, "/health") },
];

async function probe(provider: Provider): Promise<LiveProviderStatus> {
  const checkedAt = new Date().toISOString();
  const configured = provider.env.some((key) => Boolean(process.env[key]?.trim()));
  if (!configured) return { name: provider.name, state: "not-configured", checkedAt, latencyMs: null, detail: `Missing ${provider.env.join(" or ")}.`, source: "configuration" };
  if (provider.configurationOnly) return { name: provider.name, state: "degraded", checkedAt, latencyMs: null, detail: "Configured, but no verified runtime health contract is available.", source: "configuration" };
  const request = provider.request?.();
  if (!request) return { name: provider.name, state: "degraded", checkedAt, latencyMs: null, detail: "Configured, but the endpoint URL is missing or invalid.", source: "configuration" };
  const started = Date.now();
  try {
    const response = await fetch(request.url, { method: "GET", headers: request.headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
    const latencyMs = Date.now() - started;
    const state: LiveState = response.status >= 500 ? "degraded" : response.status >= 400 ? "unavailable" : "reachable";
    return { name: provider.name, state, checkedAt, latencyMs, detail: `Live probe HTTP ${response.status}; response body withheld.`, source: "live-probe" };
  } catch {
    return { name: provider.name, state: "unavailable", checkedAt, latencyMs: Date.now() - started, detail: "Live probe failed or timed out; credentials and response body withheld.", source: "live-probe" };
  }
}

export async function getLiveProviderStatus(): Promise<LiveProviderStatus[]> {
  return Promise.all(providers.map(probe));
}

export const providerNames = providers.map(({ name }) => name);
export const canonicalProviderEnvironment = providers.map(({ name, env }) => ({ name, env }));

export function redactProviderStatus(status: LiveProviderStatus[]) {
  return status.map(({ name, state, checkedAt, latencyMs, detail, source }) => ({ name, state, checkedAt, latencyMs, detail, source }));
}
