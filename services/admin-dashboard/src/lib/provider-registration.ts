export type RegistrationOwner = "gateway" | "nexus";
export type RegistrationEvidence = {
  state: "registered" | "not-configured" | "unavailable";
  adapterCount: number | null;
  qualifiedOperationCount: 0;
  productionQualified: false;
  detail: string;
};

const MAX_BODY_BYTES = 32768;
const repositories = { gateway: "Conxian/conxian-gateway", nexus: "Conxian/conxian-nexus" };
const outerKeys = new Set(["schema_version", "manifest_kind", "repository", "version", "trust_root", "scope", "native_conxian_token", "source", "taxonomy_version", "adapters"]);
const rowKeys = new Set(["adapter_id", "runtime_state", "health", "production_support", "qualified_operations", "operation_classes", "chain", "family", "finality", "evidence", "no_custody"]);
const evidenceKeys = new Set(["api", "implementation", "integration", "independent_review", "production_support", "references"]);
const NOT_EVIDENCED = "not_evidenced";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/** Structural evidence must be entirely unclaimed; any evidence claim is rejected. */
function evidenceUnclaimed(value: unknown): boolean {
  if (!record(value) || Object.keys(value).some((key) => !evidenceKeys.has(key))) return false;
  for (const key of ["api", "implementation", "integration", "independent_review", "production_support"]) {
    if (value[key] !== NOT_EVIDENCED) return false;
  }
  return Array.isArray(value.references) && value.references.every((ref) => typeof ref === "string");
}

/** Structural diagnostic validation; this cannot authenticate hardware or authorize operations. */
export function validateRegistrationManifest(value: unknown, owner: RegistrationOwner): number {
  if (!record(value) || Object.keys(value).some((key) => !outerKeys.has(key)) ||
      value.schema_version !== 1 || value.manifest_kind !== "adapter_registration" ||
      value.repository !== repositories[owner] || value.trust_root !== "bitcoin-l1" ||
      value.scope !== "universal-chain" || value.native_conxian_token !== false ||
      typeof value.taxonomy_version !== "string" || value.taxonomy_version.length === 0 || value.taxonomy_version.length > 64 ||
      !Array.isArray(value.adapters) || value.adapters.length > 256) {
    throw new Error("incompatible registration manifest");
  }
  if (owner === "gateway" && (value.source !== "runtime-adapter-map" ||
      typeof value.version !== "string" || value.version.length === 0 || value.version.length > 128)) {
    throw new Error("missing gateway registration provenance");
  }
  const ids = new Set<string>();
  for (const row of value.adapters) {
    if (!record(row) || Object.keys(row).some((key) => !rowKeys.has(key)) ||
        typeof row.adapter_id !== "string" || !/^[a-z0-9_-]{1,64}$/.test(row.adapter_id) ||
        ids.has(row.adapter_id) || row.runtime_state !== "registered" ||
        row.health !== "not-observed" || row.production_support !== "not-evidenced" ||
        !Array.isArray(row.qualified_operations) || row.qualified_operations.length !== 0 ||
        !Array.isArray(row.operation_classes) || row.operation_classes.some((op) => typeof op !== "string") ||
        !nullableString(row.chain) || !nullableString(row.family) || !nullableString(row.finality) ||
        !evidenceUnclaimed(row.evidence) || row.no_custody !== true) {
      throw new Error("incompatible adapter registration");
    }
    ids.add(row.adapter_id);
  }
  return ids.size;
}

function evidence(state: RegistrationEvidence["state"], detail: string, adapterCount: number | null = null): RegistrationEvidence {
  return { state, detail, adapterCount, qualifiedOperationCount: 0, productionQualified: false };
}

async function boundedJson(response: Response): Promise<unknown> {
  if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" || !response.body) {
    throw new Error("missing JSON body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("registration response exceeds bound");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    reader.releaseLock();
  }
}

export async function readRegistrationEvidence(owner: RegistrationOwner, baseUrl: string | undefined,
  token: string | undefined, fetchImpl: typeof fetch = fetch): Promise<RegistrationEvidence> {
  if (!baseUrl?.trim() || !token?.trim()) return evidence("not-configured", "Registration endpoint and credential are required.");
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("invalid provider URL");
    const path = url.pathname.replace(/\/+$/, "");
    const prefix = owner === "gateway" ? "/api/v1" : "/v1";
    url.pathname = path.endsWith(prefix) ? `${path}/capabilities` : `${path}${prefix}/capabilities`;
    const response = await fetchImpl(url, { method: "GET", headers: { Authorization: `Bearer ${token}` },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return evidence("unavailable", "Registration request was rejected by the provider.");
    const adapterCount = validateRegistrationManifest(await boundedJson(response), owner);
    return evidence("registered", "Diagnostic registrations only; operation and production qualification remain unavailable.", adapterCount);
  } catch {
    return evidence("unavailable", "Registration request or manifest validation failed; private response withheld.");
  }
}
