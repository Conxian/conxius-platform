import "server-only";
import type { YieldSnapshot } from "./types";

function gatewayBaseUrl(): string | null {
  const raw = process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Build M2M auth headers for Gateway requests
 * Uses service key authentication for internal service-to-service communication
 */
function getGatewayAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  
  // Add admin API key if configured
  const adminKey = process.env.ADMIN_DASHBOARD_API_KEY;
  if (adminKey) {
    headers['X-Admin-API-Key'] = adminKey;
  }
  
  // Add service key for internal services
  const serviceKey = process.env.SERVICE_KEY_ADMIN_DASHBOARD;
  if (serviceKey) {
    headers['X-Service-Key'] = `admin-dashboard:${serviceKey}`;
  }
  
  // Add JWT token if configured (for Gateway JWT validation)
  const jwtSecret = process.env.GATEWAY_JWT_SECRET;
  // Note: Actual JWT signing would require a library like jose
  // This is a placeholder for when JWT-based M2M auth is implemented
  
  return headers;
}

async function fetchGateway<T>(path: string): Promise<T | null> {
  const baseUrl = gatewayBaseUrl();
  if (!baseUrl) return null;

  try {
    const headers = getGatewayAuthHeaders();
    const r = await fetch(`${baseUrl}${path}`, { 
      cache: "no-store",
      headers: {
        ...headers,
        'Accept': 'application/json',
      },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
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
    const headers = getGatewayAuthHeaders();
    const r = await fetch(`${baseUrl}/api/v1/lorenzo/stats`, { 
      cache: "no-store",
      headers: {
        ...headers,
        'Accept': 'application/json',
      },
    });
    if (!r.ok) return { token: "sBTC", apy: null, updatedAtIso };

    const j = (await r.json().catch(() => null)) as unknown;
    const apyStr = typeof j === "object" && j !== null && "yield_apy" in j ? (j as { yield_apy?: unknown }).yield_apy : undefined;
    const apy = typeof apyStr === "number" ? apyStr : typeof apyStr === "string" ? Number(apyStr) : null;

    return { token: "sBTC", apy: Number.isFinite(apy) ? apy : null, updatedAtIso };
  } catch {
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
