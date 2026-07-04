import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import {
  buildTreasuryFundedRoleProfile,
  FUNDED_ROLE_DEFINITIONS,
  type TreasuryFundedRoleProfile,
  type FundedRoleDefinition,
  type StewardProfile,
} from "@/lib/governance/treasury";
import { getContributorLevel } from "@/lib/launch";

interface FundedRolesResponse {
  profile: TreasuryFundedRoleProfile | null;
  definitions: FundedRoleDefinition[];
  error?: string;
}

function buildFixtureSteward(): StewardProfile {
  return {
    id: "steward-alice",
    name: "Alice",
    roles: ["contributor", "delegate", "guardian", "policy-author"],
    joinedAt: new Date("2025-03-15"),
    totalVotingPower: 2500,
    activeDelegations: 3,
  };
}

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  try {
    const steward = buildFixtureSteward();

    const { searchParams } = new URL(req.url);
    const stewardId = searchParams.get("steward_id") ?? steward.id;

    if (stewardId !== steward.id) {
      return NextResponse.json(
        { profile: null, definitions: FUNDED_ROLE_DEFINITIONS, error: "Steward not found" },
        { status: 404 },
      );
    }

    const level = getContributorLevel({
      total_contributions: 47,
      votes_cast: 28,
      proposals_passed: 4,
    });

    const contributorLevelMap: Record<string, number> = {
      Newcomer: 0,
      Contributor: 1,
      Regular: 2,
      Core: 3,
      Champion: 4,
      Steward: 5,
    };
    const cl = contributorLevelMap[level] ?? 0;

    const earnedBadgeIds = [
      "first-vote",
      "consistent-voter",
      "delegate",
      "guardian",
      "policy-author",
      "policy-shaper",
    ];

    const recognizedRoleIds = new Set([
      "protocol-operator",
      "governance-delegate",
      "policy-steward",
    ]);

    const profile = buildTreasuryFundedRoleProfile(
      steward,
      cl,
      28,
      earnedBadgeIds,
      recognizedRoleIds,
    );

    const response: FundedRolesResponse = {
      profile,
      definitions: FUNDED_ROLE_DEFINITIONS,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        profile: null,
        definitions: FUNDED_ROLE_DEFINITIONS,
        error: err instanceof Error ? err.message : "Failed to compute funded roles",
      },
      { status: 500 },
    );
  }
}
