import { NextResponse } from "next/server";
import { UsageValidator, UsageEvent } from "../../../../lib/sidl/usageValidation";
import { validateAdminAuth } from "@/lib/support/auth";

export async function POST(req: Request) {
  const authError = validateAdminAuth(req);
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
