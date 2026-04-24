import { renderFarcasterFrameHtml } from "@/lib/sidl/frameHtml";
import { getVoteTally, recordVote } from "@/lib/sidl/voteStore";
import type { FarcasterFrameActionPayload, VoteChoice } from "@/lib/sidl/types";

export const runtime = "nodejs";

const PROPOSAL_ID = "conxian-sbtc-yield-policy";

function originFromRequest(req: Request): string {
  return new URL(req.url).origin;
}

function imageUrl(origin: string, params: { yes: number; no: number; last?: VoteChoice; t?: number }): string {
  const t = params.t ?? Date.now();
  const last = params.last ? `&last=${encodeURIComponent(params.last)}` : "";
  return `${origin}/frames/vote/image?yes=${params.yes}&no=${params.no}${last}&t=${t}`;
}

function render(origin: string, tally: { yes: number; no: number }, last?: VoteChoice): Response {
  const html = renderFarcasterFrameHtml({
    title: "Conxian vote",
    imageUrl: imageUrl(origin, { yes: tally.yes, no: tally.no, last }),
    postUrl: `${origin}/frames/vote`,
    buttons: [
      { label: "Vote YES", action: "post" },
      { label: "Vote NO", action: "post" },
      { label: "Tally", action: "link", target: `${origin}/api/governance/votes/${PROPOSAL_ID}` },
    ],
    state: JSON.stringify({ proposalId: PROPOSAL_ID, tally }),
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  const origin = originFromRequest(req);
  const tally = getVoteTally(PROPOSAL_ID);
  return render(origin, { yes: tally.yes, no: tally.no });
}

export async function POST(req: Request): Promise<Response> {
  const origin = originFromRequest(req);
  const payload = (await req.json().catch(() => null)) as FarcasterFrameActionPayload | null;
  const buttonIndex = payload?.untrustedData?.buttonIndex;
  const fid = payload?.untrustedData?.fid;

  const choice: VoteChoice | null =
    buttonIndex === 1 ? "yes" : buttonIndex === 2 ? "no" : null;

  if (choice && typeof fid === "number") {
    recordVote({ proposalId: PROPOSAL_ID, fid, choice });
  }

  const tally = getVoteTally(PROPOSAL_ID);
  return render(origin, { yes: tally.yes, no: tally.no }, choice ?? undefined);
}
