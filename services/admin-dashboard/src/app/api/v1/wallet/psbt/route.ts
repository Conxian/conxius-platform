import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Wallet-BFF PSBT Pipe
  // Coordination interface for multi-sig institutional signing
  const authHeader = req.headers.get("X-Admin-API-Key");
  if (authHeader !== process.env.ADMIN_DASHBOARD_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { psbt, action } = await req.json();

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
