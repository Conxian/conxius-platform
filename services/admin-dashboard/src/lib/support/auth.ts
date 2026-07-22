import { NextResponse } from "next/server";
import { getM2MAuthenticator, type Scope } from "./m2m";
import { timingSafeStringEqual } from "./m2mKeyHttp";

/**
 * Validates the X-Admin-API-Key header against the configured ADMIN_DASHBOARD_API_KEY environment variable.
 * Returns null if authorized, otherwise returns a NextResponse with 401 status.
 */
export async function validateAdminAuth(req: Request, requiredScope: Scope = "read:admin"): Promise<NextResponse | null> {
  if (req.headers.get("Authorization") !== null) {
    const result = await getM2MAuthenticator().authenticate(req);
    if (!result.valid || result.source !== "jwt") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!result.scopes?.includes(requiredScope)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return null;
  }

  const authHeader = req.headers.get("X-Admin-API-Key");
  const expectedKey = process.env.ADMIN_DASHBOARD_API_KEY;

  if (!expectedKey) {
    console.error("ADMIN_DASHBOARD_API_KEY is not configured in the environment.");
    return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
  }

  if (!authHeader || !timingSafeStringEqual(authHeader, expectedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
