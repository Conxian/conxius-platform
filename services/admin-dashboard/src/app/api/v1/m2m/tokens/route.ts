import { NextResponse } from "next/server";
import { getApiTokenStore, type ApiTokenEnvironment } from "@/lib/support/apiTokens";
import { type Scope, validateAdminAuth } from "@/lib/support/m2m";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const authError = await validateAdminAuth(request);
  if (authError) return authError;

  try {
    const store = getApiTokenStore();
    const metadataList = store.listMetadata();
    return NextResponse.json({ tokens: metadataList, count: metadataList.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal Server Error", details: msg }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const authError = await validateAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const label = body.label;
    const environment: ApiTokenEnvironment = body.environment === "test" ? "test" : "live";
    const scopes: Scope[] = Array.isArray(body.scopes) ? body.scopes : ["read:admin"];
    const ttlSeconds = typeof body.ttlSeconds === "number" ? body.ttlSeconds : undefined;

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json({ error: "Validation Error", details: "label is required" }, { status: 400 });
    }

    const store = getApiTokenStore();
    const issued = store.issueToken({
      label: label.trim(),
      ownerId: "admin-dashboard",
      environment,
      scopes,
      ttlSeconds,
    });

    return NextResponse.json(
      {
        message: "CONXIAN_API_TOKEN created successfully. Store the rawToken securely; it will not be displayed again.",
        token: issued.rawToken,
        metadata: issued.metadata,
      },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal Server Error", details: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const authError = await validateAdminAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Validation Error", details: "id parameter is required" }, { status: 400 });
    }

    const store = getApiTokenStore();
    const revoked = store.revokeToken(id);

    if (!revoked) {
      return NextResponse.json({ error: "Not Found", details: "Token ID not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Token revoked successfully", id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal Server Error", details: msg }, { status: 500 });
  }
}
