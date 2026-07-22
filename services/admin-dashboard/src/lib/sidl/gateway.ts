import "server-only";

import type { Scope } from "../support/m2m";
import { getM2MAuthenticator, M2MConfig } from "../support/m2m";
import type { YieldSnapshot } from "./types";

const GATEWAY_JWT_SERVICE_ID = "admin-dashboard" as const;
const GATEWAY_JWT_SCOPES = ["read:admin", "read:treasury", "read:metrics", "m2m:internal"] as const satisfies readonly Scope[];

interface GatewayJwtCacheEntry {
  readonly token: string;
  readonly expiresAt: number;
  readonly issuer: string;
  readonly audience: string;
}

const gatewayJwtCache = new Map<string, GatewayJwtCacheEntry>();

class GatewayAuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayAuthConfigurationError";
  }
}

function isGatewayAuthConfigurationError(error: unknown): error is GatewayAuthConfigurationError {
  return error instanceof GatewayAuthConfigurationError;
}

function gatewayBaseUrl(): string | null {
  const raw = process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function getLegacyGatewayAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  const adminKey = process.env.ADMIN_DASHBOARD_API_KEY;
  if (adminKey) headers["X-Admin-API-Key"] = adminKey;

  const serviceKey = process.env.SERVICE_KEY_ADMIN_DASHBOARD;
  if (serviceKey) headers["X-Service-Key"] = `admin-dashboard:${serviceKey}`;

  return headers;
}

function gatewayJwtCacheKey(audience: string): string {
  return `${audience}|${GATEWAY_JWT_SERVICE_ID}|${[...GATEWAY_JWT_SCOPES].sort().join(" ")}`;
}

async function getCachedGatewayJwt(): Promise<string> {
  const config = M2MConfig.getInstance();
  const jwtConfigResult = config.getJwtConfig();
  if (!jwtConfigResult.valid) {
    throw new GatewayAuthConfigurationError("Gateway JWT configuration unavailable");
  }

  const jwtConfig = jwtConfigResult.config;
  const cacheKey = gatewayJwtCacheKey(jwtConfig.audience);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cached = gatewayJwtCache.get(cacheKey);
  if (
    cached &&
    cached.issuer === jwtConfig.issuer &&
    cached.audience === jwtConfig.audience &&
    cached.expiresAt - nowSeconds > jwtConfig.clockSkewSeconds
  ) {
    return cached.token;
  }

  const issued = await getM2MAuthenticator().issueJwtWithMetadata(GATEWAY_JWT_SERVICE_ID, GATEWAY_JWT_SCOPES, {
    nowSeconds,
  });
  gatewayJwtCache.set(cacheKey, {
    token: issued.token,
    expiresAt: issued.claims.exp,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
  return issued.token;
}

/** Clear the process-local Gateway JWT cache. Primarily useful for tests. */
export function resetGatewayAuthCache(): void {
  gatewayJwtCache.clear();
}

/**
* Build server-only M2M auth headers for Gateway requests.
* `legacy` is the safe default while the Rust Gateway verifier is coordinated.
*/
export async function getGatewayAuthHeaders(): Promise<HeadersInit> {
  const config = M2MConfig.getInstance();
  const mode = config.getGatewayAuthMode();
  if (mode === null) {
    throw new GatewayAuthConfigurationError("Gateway auth mode is invalid");
  }

  const headers: Record<string, string> = mode === "jwt" ? {} : getLegacyGatewayAuthHeaders();
  if (mode === "dual" || mode === "jwt") {
    headers.Authorization = `Bearer ${await getCachedGatewayJwt()}`;
  }

  return headers;
}

async function fetchGateway<T>(path: string): Promise<T | null> {
  const baseUrl = gatewayBaseUrl();
  if (!baseUrl) return null;

  try {
    const headers = await getGatewayAuthHeaders();
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: {
        ...headers,
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error: unknown) {
    if (isGatewayAuthConfigurationError(error)) throw error;
    return null;
  }
}

export async function getSbtcYieldSnapshot(): Promise<YieldSnapshot> {
  const updatedAtIso = new Date().toISOString();
  const baseUrl = gatewayBaseUrl();

  if (!baseUrl) {
    return { token: "sBTC", apy: null, updatedAtIso };
  }

  try {
    const headers = await getGatewayAuthHeaders();
    const response = await fetch(`${baseUrl}/api/v1/lorenzo/stats`, {
      cache: "no-store",
      headers: {
        ...headers,
        Accept: "application/json",
      },
    });
    if (!response.ok) return { token: "sBTC", apy: null, updatedAtIso };

    const json = (await response.json().catch(() => null)) as unknown;
    const apyValue = typeof json === "object" && json !== null && "yield_apy" in json ? (json as { yield_apy?: unknown }).yield_apy : undefined;
    const apy = typeof apyValue === "number" ? apyValue : typeof apyValue === "string" ? Number(apyValue) : null;

    return { token: "sBTC", apy: Number.isFinite(apy) ? apy : null, updatedAtIso };
  } catch (error: unknown) {
    if (isGatewayAuthConfigurationError(error)) throw error;
    return { token: "sBTC", apy: null, updatedAtIso };
  }
}

export interface TreasuryRevenueSnapshot {
  total_revenue_sats: number;
  revenue_sources: {
    name: string;
    amount_sats: number;
    percentage: number;
    description: string;
  }[];
  allocation: {
    category: string;
    amount_sats: number;
    percentage: number;
    description: string;
    operational_units: string[];
  }[];
  treasury_reserve_sats: number;
  treasury_reserve_pct: number;
  last_updated: string;
  period: string;
  sfo_address: string;
}

export async function getTreasuryRevenue(): Promise<TreasuryRevenueSnapshot | null> {
  return fetchGateway<TreasuryRevenueSnapshot>("/api/v1/treasury/revenue");
}
