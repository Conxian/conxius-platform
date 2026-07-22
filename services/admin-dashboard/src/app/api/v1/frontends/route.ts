import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import { getFrontendRegistry } from "@/lib/sidl/stateStore";

export async function GET(req: Request) {
  const authError = await validateAdminAuth(req);
  if (authError) return authError;

  const registry = getFrontendRegistry();
  const frontends = Object.values(registry.frontends)
    .sort((a, b) => {
      const tierOrder = { primary: 0, secondary: 1, community: 2 };
      const tierDiff = (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3);
      if (tierDiff !== 0) return tierDiff;
      return a.recognizedAtIso.localeCompare(b.recognizedAtIso);
    });

  const canonicalCount = frontends.filter((f) => f.label === "canonical").length;
  const communityCount = frontends.filter((f) => f.label === "community-hosted").length;

  return NextResponse.json({
    frontends,
    updatedAtIso: registry.updatedAtIso,
    summary: {
      total: frontends.length,
      canonical: canonicalCount,
      communityHosted: communityCount,
    },
  });
}
