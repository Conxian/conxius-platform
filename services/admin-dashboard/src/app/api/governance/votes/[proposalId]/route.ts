import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import { observeSidlException, observeSidlResponse, startSidlTimer } from "@/lib/sidl/observability";
import { getVoteTally } from "@/lib/sidl/voteStore";

const ENDPOINT = "/api/governance/votes/[proposalId]";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ proposalId: string }> }): Promise<NextResponse> {
  const authError = await validateAdminAuth(_req);
  if (authError) return authError;

  const startedAt = startSidlTimer();

  try {
    const { proposalId } = await params;
    const tally = getVoteTally(proposalId);
    const response = NextResponse.json({ ok: true, tally });
    observeSidlResponse({ endpoint: ENDPOINT, method: "GET", startedAt, status: response.status });
    return response;
  } catch (error) {
    observeSidlException({ endpoint: ENDPOINT, method: "GET", startedAt, error });
    throw error;
  }
}
