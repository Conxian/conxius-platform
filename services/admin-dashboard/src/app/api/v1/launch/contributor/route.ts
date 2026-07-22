import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";
import {
  type ContributorProfile,
  type MintedTokenEntry,
  getContributorLevel,
} from "@/lib/launch";

function buildContributorProfile(address: string): ContributorProfile {
  const total_contributions = 47;
  const active_governance_proposals = 3;
  const votes_cast = 28;
  const proposals_created = 5;
  const proposals_passed = 4;
  const last_contribution_date = new Date().toISOString();

  const contributor_level = getContributorLevel({
    total_contributions,
    votes_cast,
    proposals_passed,
  });

  // NOTE: Simulated/Mock Data for Phase 7 Transition
  const minted_token_history: MintedTokenEntry[] = [
    {
      token_id: "CXD-2026-Q1",
      amount: 500,
      minted_at: "2026-03-15T00:00:00Z",
      tx_hash: "0x1a2b3c4d5e6f",
    },
    {
      token_id: "CXD-2026-Q2",
      amount: 350,
      minted_at: "2026-06-01T00:00:00Z",
      tx_hash: "0x7e8d9c0b1a2f",
    },
  ];

  return {
    contributor_level,
    total_contributions,
    active_governance_proposals,
    votes_cast,
    proposals_created,
    proposals_passed,
    last_contribution_date,
    contributor_address: address,
    minted_token_history,
  };
}

function buildEmptyContributorProfile(address: string): ContributorProfile {
  return {
    contributor_level: getContributorLevel({ total_contributions: 0, votes_cast: 0, proposals_passed: 0 }),
    total_contributions: 0,
    active_governance_proposals: 0,
    votes_cast: 0,
    proposals_created: 0,
    proposals_passed: 0,
    last_contribution_date: "",
    contributor_address: address,
    minted_token_history: [],
  };
}

export async function GET(request: Request) {
  const authError = await validateAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Contributor address is required" },
      { status: 400 },
    );
  }

  const profile = address.startsWith("SP")
    ? buildContributorProfile(address)
    : buildEmptyContributorProfile(address);

  return NextResponse.json(profile);
}
