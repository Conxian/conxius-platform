import { NextResponse } from "next/server";

export async function GET() {
  // UI-BFF: High-throughput telemetry/caching
  // This endpoint serves as the primary data source for the Sovereign Dashboard
  const telemetry = {
    system_load: 0.12,
    active_connections: 42,
    nexus_sync: {
      status: "synced",
      drift: 0,
      last_block: 840000,
      merkle_root: "0x123...abc"
    },
    latency: {
      gateway_p99: "1.2ms",
      indexer_p99: "35ms"
    },
    alerts: [],
    governance: {
      pending_votes: 2,
      active_proposals: 1
    }
  };

  return NextResponse.json(telemetry, {
    headers: {
      'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=5'
    }
  });
}
