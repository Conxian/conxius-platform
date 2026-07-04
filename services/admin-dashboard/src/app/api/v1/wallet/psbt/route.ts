import { NextResponse } from "next/server";
import { Bip322Bridge } from "@/lib/support/bip322";
import { validateAdminAuth } from "@/lib/support/auth";

export async function POST(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

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
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
