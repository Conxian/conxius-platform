import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";
import { loadClaimsState, proposeClaim } from "@/lib/governance/claims";

export async function GET(req: Request) {
  const authError = await validateAdminAuth(req);
  if (authError) return authError;

  const state = loadClaimsState();
  const entries = Object.values(state.entries).sort((a, b) =>
    b.timestamps.proposedAt.localeCompare(a.timestamps.proposedAt)
  );

  return NextResponse.json({
    entries,
    events: state.events,
    activationSnapshotHeight: state.activationSnapshotHeight,
    activationRate: state.activationRate,
    activationPool: state.activationPool,
    activatedAtIso: state.activatedAtIso,
  });
}

export async function POST(req: Request) {
  const authError = await validateAdminAuth(req, "write:governance");
  if (authError) return authError;

  try {
    const body = await req.json();
    const entry = proposeClaim({
      contributorId: body.contributorId,
      artifactRef: body.artifactRef,
      category: body.category,
      impactMultiplierBps: Number(body.impactMultiplierBps) as any,
      qualityMultiplierBps: Number(body.qualityMultiplierBps) as any,
      evidence: body.evidence,
      notes: body.notes,
      proposedBy: body.proposedBy || "admin-system",
    });

    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
