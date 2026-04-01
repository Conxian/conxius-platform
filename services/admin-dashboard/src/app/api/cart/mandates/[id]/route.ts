import { NextResponse } from "next/server";
import { getCartMandate } from "@/lib/sidl/cart";

export async function GET(_req: Request, ctx: { params: { id: string } }): Promise<NextResponse> {
  const { id } = ctx.params;
  const mandate = getCartMandate(id);

  if (!mandate) {
    return NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, mandate });
}
