import { NextResponse } from "next/server";
import { getGatewayAuthHeaders } from "@/lib/sidl/gateway";
import { redactUpstreamError, timeoutSignal, upstreamUrl } from "@/lib/support/upstreams";

export const dynamic = "force-dynamic";

function gatewayBaseUrl(): string | null {
  const raw = process.env.GATEWAY_URL || process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
  return raw ? raw.replace(/\/$/, "") : null;
}

export async function GET() {
  const baseUrl = upstreamUrl("gateway") ?? gatewayBaseUrl();
  const observedAt = new Date().toISOString();

  if (!baseUrl) {
    return NextResponse.json(
      { status: "unavailable", source: "gateway", observedAt, reason: "Gateway endpoint is not configured" },
      { status: 503 },
    );
  }

  try {
    const headers = await getGatewayAuthHeaders();
    const response = await fetch(`${baseUrl}/api/v1/metrics`, {
      cache: "no-store",
      headers: { ...headers, Accept: "application/json" },
      signal: timeoutSignal(),
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "unavailable", source: "gateway", observedAt, reason: `Gateway returned HTTP ${response.status}` },
        { status: 503 },
      );
    }

    const payload: unknown = await response.json();
    return NextResponse.json({ status: "live", source: "gateway", observedAt, data: payload }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return NextResponse.json(
      { status: "unavailable", source: "gateway", observedAt, reason: redactUpstreamError(error) },
      { status: 503 },
    );
  }
}
