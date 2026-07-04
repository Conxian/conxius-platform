import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import {
  buildFundedRolesHistory,
  FUNDED_ROLE_DEFINITIONS,
  type FundedRoleHistory,
  type FundedRoleDefinition,
} from "@/lib/governance/treasury";

interface FundedRolesHistoryResponse {
  histories: FundedRoleHistory[];
  definitions: FundedRoleDefinition[];
  grandTotalPayoutSats: number;
  totalPayoutCount: number;
  totalActivityCount: number;
  lastUpdatedIso: string;
  error?: string;
}

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  try {
    const recognizedRoleIds = new Set([
      "protocol-operator",
      "governance-delegate",
      "policy-steward",
    ]);

    const histories = buildFundedRolesHistory(recognizedRoleIds);

    const grandTotalPayoutSats = histories.reduce(
      (sum, h) => sum + h.totalPayoutSats,
      0,
    );
    const totalPayoutCount = histories.reduce(
      (sum, h) => sum + h.payoutCount,
      0,
    );
    const totalActivityCount = histories.reduce(
      (sum, h) => sum + h.activityCount,
      0,
    );

    const response: FundedRolesHistoryResponse = {
      histories,
      definitions: FUNDED_ROLE_DEFINITIONS,
      grandTotalPayoutSats,
      totalPayoutCount,
      totalActivityCount,
      lastUpdatedIso: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        histories: [],
        definitions: FUNDED_ROLE_DEFINITIONS,
        grandTotalPayoutSats: 0,
        totalPayoutCount: 0,
        totalActivityCount: 0,
        lastUpdatedIso: new Date().toISOString(),
        error:
          err instanceof Error
            ? err.message
            : "Failed to compute funded roles history",
      },
      { status: 500 },
    );
  }
}
