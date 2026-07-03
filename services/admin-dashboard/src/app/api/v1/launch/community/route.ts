import { NextResponse } from "next/server";
import type { CommunityStats } from "@/lib/launch";

function buildCommunityStats(): CommunityStats {
  return {
    total_contributors: 128,
    total_contributions: 3417,
    active_proposals: 12,
    proposals_passed: 89,
    total_votes_cast: 45210,
    total_cxd_minted: 187500,
    funding_target_cxd: 1000000,
    funding_raised_cxd: 423800,
    community_members: 3842,
    last_updated: new Date().toISOString(),
  };
}

export async function GET() {
  return NextResponse.json(buildCommunityStats());
}
