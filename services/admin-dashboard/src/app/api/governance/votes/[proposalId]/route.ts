import { NextResponse } from "next/server";
import { getVoteTally } from "@/lib/sidl/voteStore";

export async function GET(_req: Request, ctx: { params: { proposalId: string } }): Promise<NextResponse> {
  const { proposalId } = ctx.params;
  const tally = getVoteTally(proposalId);
  return NextResponse.json({ ok: true, tally });
}
