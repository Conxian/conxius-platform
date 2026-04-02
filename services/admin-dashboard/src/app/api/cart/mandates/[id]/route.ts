import { NextResponse } from "next/server";
import { getCartMandate } from "@/lib/sidl/cart";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const mandate = getCartMandate(id);

  if (!mandate) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, mandate });
}
