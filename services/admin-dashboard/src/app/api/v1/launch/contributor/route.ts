import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Contributor address is required" }, { status: 400 });
  }

  return NextResponse.json(
    {
      status: "unavailable",
      source: "live contributor ledger",
      reason: "No live contributor ledger adapter is configured; synthetic profile data is disabled.",
      contributor_address: address,
    },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
