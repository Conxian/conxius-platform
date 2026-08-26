import "server-only";

export type UpstreamStatus = "configured" | "missing";

export interface UpstreamDefinition {
  readonly id: string;
  readonly label: string;
  readonly env: string;
  readonly kind: "url" | "secret" | "flag";
  readonly required: boolean;
}

export const UPSTREAMS: readonly UpstreamDefinition[] = [
  { id: "gateway", label: "Conxian Gateway", env: "GATEWAY_URL", kind: "url", required: true },
  { id: "stacks", label: "Stacks node", env: "STACKS_NODE_RPC_URL", kind: "url", required: false },
  { id: "oracle", label: "Oracle", env: "ORACLE_ENDPOINT_URL", kind: "url", required: false },
  { id: "tableland", label: "Tableland", env: "TABLELAND_BASE_URL", kind: "url", required: false },
  { id: "kwil", label: "Kwil", env: "KWIL_PROVIDER_URL", kind: "url", required: false },
  { id: "supabase", label: "Supabase", env: "SUPABASE_URL", kind: "url", required: false },
  { id: "nexus-auth", label: "Nexus admin authentication", env: "NEXUS_ADMIN_API_TOKEN", kind: "secret", required: false },
  { id: "upstash", label: "Upstash Redis", env: "UPSTASH_KV_KV_REST_API_URL", kind: "url", required: false },
] as const;

export function getUpstreamConfiguration() {
  return UPSTREAMS.map((definition) => {
    const value = process.env[definition.env];
    return {
      id: definition.id,
      label: definition.label,
      env: definition.env,
      kind: definition.kind,
      required: definition.required,
      status: value ? ("configured" as const) : ("missing" as const),
      origin: definition.kind === "url" && value ? safeOrigin(value) : undefined,
    };
  });
}

function safeOrigin(value: string): string | undefined {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function upstreamUrl(id: string): string | null {
  const definition = UPSTREAMS.find((item) => item.id === id && item.kind === "url");
  if (!definition) return null;
  const value = process.env[definition.env];
  return value ? value.replace(/\/$/, "") : null;
}

export function upstreamTimeoutMs(): number {
  const value = Number(process.env.UPSTREAM_REQUEST_TIMEOUT_MS ?? "5000");
  return Number.isFinite(value) && value >= 500 && value <= 30000 ? value : 5000;
}

export function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(upstreamTimeoutMs());
}

export function requiredUpstreamsConfigured(): boolean {
  return getUpstreamConfiguration().every((item) => !item.required || item.status === "configured");
}

export function redactUpstreamError(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") return "Upstream request timed out";
  return "Upstream request failed";
}

export async function probeUpstream(id: string) {
  const configured = getUpstreamConfiguration().find((item) => item.id === id);
  const url = upstreamUrl(id);
  const observedAt = new Date().toISOString();
  if (!configured || !url) return { ...configured, status: "missing" as const, observedAt };

  const started = performance.now();
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store", signal: timeoutSignal() });
    return { ...configured, status: response.ok ? "reachable" as const : "unreachable" as const, httpStatus: response.status, latencyMs: Math.round(performance.now() - started), observedAt };
  } catch (error) {
    return { ...configured, status: "unreachable" as const, latencyMs: Math.round(performance.now() - started), reason: redactUpstreamError(error), observedAt };
  }
}
