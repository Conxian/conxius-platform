import { NextResponse } from "next/server";
import type { VoteChoice } from "@/lib/sidl/types";
import { recordVote } from "@/lib/sidl/voteStore";

export const runtime = "nodejs";

type VoteRequestBody = {
  proposalId: string;
  fid: number;
  choice: VoteChoice;
};

function isVoteChoice(value: unknown): value is VoteChoice {
  return value === "yes" || value === "no";
}

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => null)) as VoteRequestBody | null;

  if (!body || typeof body.proposalId !== "string" || typeof body.fid !== "number" || !isVoteChoice(body.choice)) {
    return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
  }

  const receipt = recordVote({ proposalId: body.proposalId, fid: body.fid, choice: body.choice });
  return NextResponse.json({ ok: true, receipt });
}
