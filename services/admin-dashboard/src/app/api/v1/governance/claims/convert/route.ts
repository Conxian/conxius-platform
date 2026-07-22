import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";
import { performGlobalSnapshotConversion } from "@/lib/governance/claims";

export async function POST(req: Request) {
  const authError = await validateAdminAuth(req, "write:governance");
  if (authError) return authError;

  try {
    const body = await req.json();
    const { poolSize, snapshotHeight, actorId } = body;

    if (!poolSize || !snapshotHeight || !actorId) {
      return NextResponse.json({ success: false, error: "poolSize, snapshotHeight, and actorId are required" }, { status: 400 });
    }

    const conversionResult = performGlobalSnapshotConversion(
      Number(poolSize),
      Number(snapshotHeight),
      actorId
    );

    return NextResponse.json({ success: true, ...conversionResult });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
