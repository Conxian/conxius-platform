import { NextResponse } from "next/server";

interface MintedTokenEntry {
  token_id: string;
  amount: number;
  minted_at: string;
  tx_hash: string;
}

interface ContributorProfile {
  contributor_level: string;
  total_contributions: number;
  active_governance_proposals: number;
  votes_cast: number;
  proposals_created: number;
  proposals_passed: number;
  last_contribution_date: string;
  contributor_address: string;
  minted_token_history: MintedTokenEntry[];
}

function buildContributorProfile(): ContributorProfile {
  return {
    contributor_level: "Core",
    total_contributions: 47,
    active_governance_proposals: 3,
    votes_cast: 28,
    proposals_created: 5,
    proposals_passed: 4,
    last_contribution_date: new Date().toISOString(),
    contributor_address: "SP2AQGJQXS0KG3RB6MBK8M9NQPF1WE3N6NNPKF0NE",
    minted_token_history: [
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
    ],
  };
}

function buildEmptyContributorProfile(): ContributorProfile {
  return {
    contributor_level: "",
    total_contributions: 0,
    active_governance_proposals: 0,
    votes_cast: 0,
    proposals_created: 0,
    proposals_passed: 0,
    last_contribution_date: "",
    contributor_address: "",
    minted_token_history: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Contributor address is required" },
      { status: 400 },
    );
  }

  const profile = address.startsWith("SP")
    ? buildContributorProfile()
    : buildEmptyContributorProfile();

  return NextResponse.json(profile);
}
