import "server-only";

export type LiveState = "reachable" | "degraded" | "unavailable" | "not-configured";

export type LiveProviderStatus = {
  name: string;
  state: LiveState;
  checkedAt: string;
  latencyMs: number | null;
  detail: string;
};

type Provider = { name: string; env: string[]; url?: string };

const providers: Provider[] = [
  { name: "Gateway", env: ["GATEWAY_URL"], url: process.env.GATEWAY_URL },
  { name: "Nexus", env: ["NEXUS_ADMIN_API_TOKEN"], url: process.env.NEXUS_URL },
  { name: "Neon", env: ["NEON_DATABASE_URL", "DATABASE_URL"] },
  { name: "AWS Aurora PostgreSQL", env: ["AWS_APG_AWS_RESOURCE_ARN", "AWS_APG_PGHOST"] },
  { name: "ERP attestation", env: ["ERP_ATTESTATION_TRUSTED_KEYS_JSON"] },
  { name: "Nostr relays", env: ["NOSTR_RELAYS"], url: process.env.NOSTR_RELAYS?.split(",")[0]?.trim() },
  { name: "Supabase", env: ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"], url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL },
  { name: "Upstash", env: ["UPSTASH_KV_KV_REST_API_URL", "UPSTASH_KV_KV_REST_API_TOKEN"], url: process.env.UPSTASH_KV_KV_REST_API_URL },
  { name: "Stacks", env: ["STACKS_NODE_RPC_URL"], url: process.env.STACKS_NODE_RPC_URL },
  { name: "Oracle", env: ["ORACLE_ENDPOINT_URL"], url: process.env.ORACLE_ENDPOINT_URL },
  { name: "Tableland", env: ["TABLELAND_BASE_URL"], url: process.env.TABLELAND_BASE_URL },
  { name: "Kwil", env: ["KWIL_PROVIDER_URL"], url: process.env.KWIL_PROVIDER_URL },
];

async function probe(provider: Provider): Promise<LiveProviderStatus> {
  const checkedAt = new Date().toISOString();
  if (!provider.env.some((key) => Boolean(process.env[key]))) {
    return { name: provider.name, state: "not-configured", checkedAt, latencyMs: null, detail: `Missing ${provider.env.join(" or ")}.` };
  }
  if (!provider.url) {
    return { name: provider.name, state: "degraded", checkedAt, latencyMs: null, detail: "Configured, but no safe HTTP probe URL is declared." };
  }
  const started = Date.now();
  try {
    const response = await fetch(provider.url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(5000) });
    const latencyMs = Date.now() - started;
    const state: LiveState = response.status >= 500 ? "degraded" : "reachable";
    return { name: provider.name, state, checkedAt, latencyMs, detail: `HTTP ${response.status}; response body withheld.` };
  } catch {
    return { name: provider.name, state: "unavailable", checkedAt, latencyMs: Date.now() - started, detail: "Probe failed or timed out; credentials and response body withheld." };
  }
}

export async function getLiveProviderStatus(): Promise<LiveProviderStatus[]> {
  return Promise.all(providers.map(probe));
}
