import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Secret provisioning is disabled. Use Vercel project environment variables or the owning integration.",
    },
    { status: 410 },
  );
}
