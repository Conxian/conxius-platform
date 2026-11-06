import { NextResponse } from "next/server";
import { Bip322Bridge } from "@/lib/support/bip322";
import { validateAdminAuth } from "@/lib/support/auth";

export async function POST(req: Request) {
  const authError = await validateAdminAuth(req, "write:treasury");
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
      // Value signing is not performed here. The signer is the wallet/enclave
      // (conxius-wallet `services/psbt.ts` / the enclave value-operation gate),
      // not this dashboard route. Returning a fabricated signed PSBT and
      // attestation would be fail-open: a client could treat the stub as an
      // authorized treasury signature.
      return NextResponse.json(
        {
          success: false,
          error: "psbt_signing_not_available",
          message:
            "This route does not sign PSBTs. Signing is performed by the wallet/enclave value-operation gate.",
        },
        { status: 501 }
      );
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
