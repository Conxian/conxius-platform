import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Usage Validation Instrumentation (CON-1263)
  // Mock endpoint for receiving signed telemetry signals
  try {
    const body = await req.json();
    const { event, identity_hash, metadata } = body;

    console.log(`[Telemetry] Received ${event} from ${identity_hash}`);

    // Logic for routing to Linear or internal DB goes here

    return NextResponse.json({ status: "captured", timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
