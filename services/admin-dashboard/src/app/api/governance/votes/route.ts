import { NextResponse } from "next/server";
import { observeSidlException, observeSidlResponse, startSidlTimer } from "@/lib/sidl/observability";
import type { VoteChoice } from "@/lib/sidl/types";
import { recordVote } from "@/lib/sidl/voteStore";
import { validateAdminAuth } from "@/lib/support/auth";

export const runtime = "nodejs";

type VoteRequestBody = {
  proposalId: string;
  fid: number;
  choice: VoteChoice;
};

const ENDPOINT = "/api/governance/votes";

function isVoteChoice(value: unknown): value is VoteChoice {
  return value === "yes" || value === "no";
}

export async function POST(req: Request): Promise<NextResponse> {
  const startedAt = startSidlTimer();

  // CON-353: Harden SIDL auth
  const authError = await validateAdminAuth(req, "write:governance");
  if (authError) {
    observeSidlResponse({
      endpoint: ENDPOINT,
      method: "POST",
      startedAt,
      status: authError.status,
      errorCategory: "unauthorized",
    });
    return authError;
  }

  try {
    const body = (await req.json().catch(() => null)) as VoteRequestBody | null;

    if (!body || typeof body.proposalId !== "string" || typeof body.fid !== "number" || !isVoteChoice(body.choice)) {
      const response = NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
      observeSidlResponse({
        endpoint: ENDPOINT,
        method: "POST",
        startedAt,
        status: response.status,
        errorCategory: "invalid-body",
      });
      return response;
    }

    const receipt = recordVote({ proposalId: body.proposalId, fid: body.fid, choice: body.choice });
    const response = NextResponse.json({ ok: true, receipt });
    observeSidlResponse({ endpoint: ENDPOINT, method: "POST", startedAt, status: response.status });
    return response;
  } catch (error) {
    observeSidlException({ endpoint: ENDPOINT, method: "POST", startedAt, error });
    throw error;
  }
}
