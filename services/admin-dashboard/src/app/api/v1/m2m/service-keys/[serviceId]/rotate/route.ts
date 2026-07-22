import { NextResponse } from "next/server";

import {
  authorizeM2MAdmin,
  createM2MRequestId,
  m2mErrorResponse,
  m2mJson,
  m2mStoreErrorToHttp,
} from "@/lib/support/m2mKeyHttp";
import { getM2MKeyStore } from "@/lib/support/m2mKeyStore";
import { isRotatableServiceId } from "@/lib/support/m2mKeyTypes";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
): Promise<NextResponse> {
  const requestId = createM2MRequestId();
  const authError = authorizeM2MAdmin(request, requestId);
  if (authError) return authError;

  const { serviceId } = await params;
  if (!isRotatableServiceId(serviceId)) {
    return m2mErrorResponse(
      { status: 404, code: "service_not_found", message: "Service key service not found" },
      requestId,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return m2mErrorResponse(
      { status: 400, code: "invalid_request", message: "Invalid request" },
      requestId,
    );
  }

  if (!isRecord(body) || typeof body.expectedGeneration !== "number") {
    return m2mErrorResponse(
      {
        status: 400,
        code: "invalid_generation_precondition",
        message: "Expected generation must be a positive integer",
      },
      requestId,
    );
  }
  if (
    body.gracePeriodSeconds !== undefined &&
    typeof body.gracePeriodSeconds !== "number"
  ) {
    return m2mErrorResponse(
      {
        status: 400,
        code: "invalid_grace_period",
        message: "Grace period must be an integer between 300 and 604800 seconds",
      },
      requestId,
    );
  }
  if (body.expiresAt !== undefined && typeof body.expiresAt !== "string") {
    return m2mErrorResponse(
      { status: 400, code: "invalid_expiry", message: "Expiry must be a future RFC 3339 timestamp" },
      requestId,
    );
  }

  try {
    const result = getM2MKeyStore().rotate({
      serviceId,
      expectedGeneration: body.expectedGeneration,
      gracePeriodSeconds: body.gracePeriodSeconds,
      expiresAt: body.expiresAt,
      context: { requestId, actor: "admin-api-key" },
    });
    return m2mJson(result, requestId, 201);
  } catch (error) {
    return m2mErrorResponse(m2mStoreErrorToHttp(error), requestId);
  }
}
