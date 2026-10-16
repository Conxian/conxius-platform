import { NextResponse } from "next/server";
import { UsageValidator, UsageEvent } from "../../../../lib/sidl/usageValidation";
import { validateAdminAuth } from "@/lib/support/auth";

export async function POST(req: Request) {
  const authError = await validateAdminAuth(req, "write:admin");
  if (authError) return authError;

  // Usage Validation Instrumentation (CON-1263)
  // Hardened implementation aligned with usage-validation-instrumentation-v1.spec.md
  try {
    const body = await req.json();
    const { event, strength, identity_hash, metadata } = body;

    const usageEvent: UsageEvent = {
      event,
      strength,
      identity_hash,
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    const score = UsageValidator.scoreEvent(usageEvent);
    const triage = UsageValidator.warrantsTriage(score);

    console.log(`[UsageValidation] Received ${event} from ${identity_hash}. Score: ${score}. Triage: ${triage}`);

    // In a real scenario, this would route to Linear if triage is true
    if (triage) {
      console.log(`[UsageValidation] SIGNAL HIGH: Routing to Linear Triage for ${identity_hash}`);
    }

    return NextResponse.json({
      status: "captured",
      score,
      triage,
      timestamp: usageEvent.timestamp
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}


export type CloudSurfaceHealth = {
  surface: 'supabase_bos' | 'neon_postgres' | 'render_deployment';
  status: 'healthy' | 'degraded' | 'offline';
  uptimePercentage: number; // e.g. 99.95
  latencyMs: number;
};

export type YieldSplittingResult = {
  totalYieldEarnedSats: number;
  lpAllocationSats: number;     // 80%
  reservePoolSats: number;      // 10%
  operationsUbiSats: number;    // 10%
  slaCompliant: boolean;
  penaltySlashedSats: number;
};

export function calculateYieldSplitting(
  totalYieldEarnedSats: number,
  surfaces: CloudSurfaceHealth[]
): YieldSplittingResult {
  if (totalYieldEarnedSats < 0) {
    throw new Error('Total yield earned cannot be negative');
  }

  // Evaluate SLA compliance across multi-cloud surfaces
  const isSlaCompliant = surfaces.every(
    (s) => s.status !== 'offline' && s.uptimePercentage >= 99.0 && s.latencyMs <= 500
  );

  let penaltySlashedSats = 0;
  let effectiveYield = totalYieldEarnedSats;

  // Apply SLA breach slashing penalty of 5% to operations/reserve pool if non-compliant
  if (!isSlaCompliant) {
    penaltySlashedSats = Math.round(totalYieldEarnedSats * 0.05);
    effectiveYield = totalYieldEarnedSats - penaltySlashedSats;
  }

  // 80 / 10 / 10 Yield Splitting Ratio
  const lpAllocationSats = Math.round(effectiveYield * 0.80);
  const reservePoolSats = Math.round(effectiveYield * 0.10);
  const operationsUbiSats = effectiveYield - lpAllocationSats - reservePoolSats;

  return {
    totalYieldEarnedSats,
    lpAllocationSats,
    reservePoolSats,
    operationsUbiSats,
    slaCompliant: isSlaCompliant,
    penaltySlashedSats,
  };
}
