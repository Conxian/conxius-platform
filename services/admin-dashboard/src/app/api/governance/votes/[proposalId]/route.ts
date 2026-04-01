import { NextResponse } from "next/server";
import { getVoteTally } from "@/lib/sidl/voteStore";

export async function GET(_req: Request, { params }: { params: Promise<{ proposalId: string }> }): Promise<NextResponse> {
  const { proposalId } = await params;
  const tally = getVoteTally(proposalId);
  return NextResponse.json({ ok: true, tally });
}
