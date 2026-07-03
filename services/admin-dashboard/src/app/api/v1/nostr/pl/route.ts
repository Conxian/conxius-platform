import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  return NextResponse.json({
    kind: 20626,
    content: "P&L Report: BTC +0.42% | STX +1.2%",
    tags: [
      ["p", "npub1..."],
      ["t", "pl-report"]
    ],
    sovereign_proof: "nostr:event:..."
  });
}
