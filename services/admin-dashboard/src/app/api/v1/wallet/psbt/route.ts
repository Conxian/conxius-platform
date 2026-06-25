import { NextResponse } from "next/server";
import { Bip322Bridge } from "@/lib/support/bip322";

export async function POST(req: Request) {
  // Wallet-BFF PSBT Pipe
  // Coordination interface for multi-sig institutional signing
  const authHeader = req.headers.get("X-Admin-API-Key");
  if (!authHeader || authHeader !== process.env.ADMIN_DASHBOARD_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { psbt, action, intent, signature, address } = await req.json();

    if (action === "verify-intent") {
      if (!intent || !signature || !address) {
        return NextResponse.json({ error: "Missing intent, signature, or address" }, { status: 400 });
      }
      const result = await Bip322Bridge.verify(address, JSON.stringify(intent), signature);
      return NextResponse.json(result);
    }

    if (action === "sign") {
      return NextResponse.json({
        success: true,
        signed_psbt: "base64-signed-psbt-stub",
        attestation: "sig:..."
      });
    }

    return NextResponse.json({
      success: true,
      status: "pending-broadcast",
      psbt_id: "txid:..."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
