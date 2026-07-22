import { NextResponse } from "next/server";

import { getM2MKeyStoreReadiness } from "@/lib/support/m2mKeyStore";

export async function GET() {
  const readiness = getM2MKeyStoreReadiness();
  const healthy = readiness.status === "healthy";

  return NextResponse.json({
    status: healthy ? "healthy" : "unhealthy",
  }, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
