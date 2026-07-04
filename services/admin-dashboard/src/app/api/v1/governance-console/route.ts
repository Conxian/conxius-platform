import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";
import {
  TREASURY_FUNDING_PROPOSAL_TEMPLATES,
  FUNDED_ROLE_DEFINITIONS,
} from "@/lib/governance/treasury";

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  const templatesByCategory: Record<string, number> = {};
  for (const t of TREASURY_FUNDING_PROPOSAL_TEMPLATES) {
    templatesByCategory[t.allocationCategory] =
      (templatesByCategory[t.allocationCategory] ?? 0) + 1;
  }

  return NextResponse.json({
    proposals: [
      { id: "prop-1", title: "Enable USI L2 Bridge", status: "active" },
    ],
    treasury_governance: "multisig-required",
    proposal_templates: {
      total: TREASURY_FUNDING_PROPOSAL_TEMPLATES.length,
      by_category: templatesByCategory,
      funded_roles_with_templates: new Set(
        TREASURY_FUNDING_PROPOSAL_TEMPLATES.map((t) => t.roleId),
      ).size,
      browse_url: "/proposal-templates",
    },
    funded_roles_count: FUNDED_ROLE_DEFINITIONS.length,
  });
}
