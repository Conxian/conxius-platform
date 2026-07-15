import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";
import { evaluateActivationGates } from "@/lib/governance/claims";

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  const gates = evaluateActivationGates();
  const allGatesPassed = Object.values(gates).every((gate) => gate === true);

  return NextResponse.json({
    gates,
    allGatesPassed,
    requirements: {
      mainnetStability60Days: "Continuous Mainnet operation >= 60 days (controlled by env MAINNET_STABILITY_GTE_60)",
      auditedPayoutPathActive: "Audited payout path + BOUNTY_PAYOUT_ACTIVE=true enabled",
      treasuryRunway6Months: "Post-allocation operating runway >= 6 months (controlled by env TREASURY_RUNWAY_GTE_6MO)",
      governanceRatified: "Governance ratification of activation coordinates received (controlled by env GOVERNANCE_RATIFIED_ACTIVATION)",
    },
  });
}
