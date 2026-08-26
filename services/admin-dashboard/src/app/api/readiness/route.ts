import { NextResponse } from "next/server";

import { getUpstreamConfiguration, probeUpstream, requiredUpstreamsConfigured } from "@/lib/support/upstreams";

export const dynamic = "force-dynamic";

export async function GET() {
  let probes: Awaited<ReturnType<typeof probeUpstream>>[];
  try {
    probes = await Promise.all(getUpstreamConfiguration().map((item) => probeUpstream(item.id)));
  } catch {
    return NextResponse.json(
      { status: "degraded", observedAt: new Date().toISOString(), reason: "Readiness probe configuration is unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const healthy = requiredUpstreamsConfigured() && probes.every((item) => item.status !== "unreachable" || !item.required);

  return NextResponse.json(
    {
      status: healthy ? "ready" : "degraded",
      observedAt: new Date().toISOString(),
      upstreams: probes,
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
