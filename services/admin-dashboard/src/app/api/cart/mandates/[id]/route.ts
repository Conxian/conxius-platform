import { NextResponse } from "next/server";
import { getCartMandate } from "@/lib/sidl/cart";
import { observeSidlException, observeSidlResponse, startSidlTimer } from "@/lib/sidl/observability";
import { validateAdminAuth } from "@/lib/support/auth";

const ENDPOINT = "/api/cart/mandates/[id]";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const authError = validateAdminAuth(_req);
  if (authError) return authError;

  const startedAt = startSidlTimer();

  try {
    const { id } = await params;
    const mandate = getCartMandate(id);

    if (!mandate) {
      const response = NextResponse.json({ ok: false, error: "not-found" }, { status: 404 });
      observeSidlResponse({
        endpoint: ENDPOINT,
        method: "GET",
        startedAt,
        status: response.status,
        errorCategory: "not-found",
      });
      return response;
    }

    const response = NextResponse.json({ ok: true, mandate });
    observeSidlResponse({ endpoint: ENDPOINT, method: "GET", startedAt, status: response.status });
    return response;
  } catch (error) {
    observeSidlException({ endpoint: ENDPOINT, method: "GET", startedAt, error });
    throw error;
  }
}
