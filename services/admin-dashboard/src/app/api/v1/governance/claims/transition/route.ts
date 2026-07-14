import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";
import { transitionClaimStatus, disputeClaim } from "@/lib/governance/claims";

export async function POST(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { entryId, action, actorId, newStatus, stateReason, revocationReason, rationale } = body;

    if (!entryId || !actorId) {
      return NextResponse.json({ success: false, error: "entryId and actorId are required" }, { status: 400 });
    }

    let entry;
    if (action === "transition") {
      if (!newStatus) {
        return NextResponse.json({ success: false, error: "newStatus is required for transition" }, { status: 400 });
      }
      entry = transitionClaimStatus(entryId, newStatus, actorId, { stateReason, revocationReason });
    } else if (action === "dispute") {
      if (!rationale) {
        return NextResponse.json({ success: false, error: "rationale is required for dispute" }, { status: 400 });
      }
      entry = disputeClaim(entryId, actorId, rationale);
    } else {
      return NextResponse.json({ success: false, error: "Invalid action. Must be 'transition' or 'dispute'" }, { status: 400 });
    }

    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
