import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import {
  M2MKeyStoreError,
  type M2MConflictMetadata,
} from "./m2mKeyTypes";

export interface M2MHttpError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

export function createM2MRequestId(): string {
  return `req_${randomUUID()}`;
}

export function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  const leftPadded = Buffer.alloc(maxLength);
  const rightPadded = Buffer.alloc(maxLength);

  leftBytes.copy(leftPadded);
  rightBytes.copy(rightPadded);

  return timingSafeEqual(leftPadded, rightPadded) && leftBytes.length === rightBytes.length;
}

export function m2mJson<T>(
  body: T,
  requestId: string,
  status = 200,
  additionalHeaders?: Record<string, string>,
): NextResponse<T> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Content-Type", "application/json");
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Request-ID", requestId);
  for (const [name, value] of Object.entries(additionalHeaders ?? {})) {
    response.headers.set(name, value);
  }
  return response;
}

export function m2mErrorResponse(
  error: M2MHttpError,
  requestId: string,
): NextResponse {
  const body: Record<string, unknown> = {
    error: error.code,
    message: error.message,
    requestId,
    ...(error.details ?? {}),
  };
  const headers = error.retryAfterSeconds
    ? { "Retry-After": String(error.retryAfterSeconds) }
    : undefined;
  return m2mJson(body, requestId, error.status, headers);
}

export function authorizeM2MAdmin(request: Request, requestId: string): NextResponse | null {
  const expectedKey = process.env.ADMIN_DASHBOARD_API_KEY;
  if (!expectedKey) {
    return m2mErrorResponse(
      {
        status: 503,
        code: "admin_auth_unavailable",
        message: "Admin API-key authentication is unavailable",
      },
      requestId,
    );
  }

  const presentedKey = request.headers.get("X-Admin-API-Key");
  if (!presentedKey || !timingSafeStringEqual(presentedKey, expectedKey)) {
    return m2mErrorResponse(
      { status: 401, code: "unauthorized", message: "Unauthorized" },
      requestId,
    );
  }

  return null;
}

function conflictDetails(conflict: M2MConflictMetadata): Record<string, unknown> {
  return {
    serviceId: conflict.serviceId,
    expectedGeneration: conflict.expectedGeneration,
    currentGeneration: conflict.currentGeneration,
    currentRevision: conflict.currentRevision,
    previousGeneration: conflict.previousGeneration,
    previousGraceUntil: conflict.previousGraceUntil,
    previousEffectiveUntil: conflict.previousEffectiveUntil,
    activeExpiresAt: conflict.activeExpiresAt,
  };
}

export function m2mStoreErrorToHttp(error: unknown): M2MHttpError {
  if (!(error instanceof M2MKeyStoreError)) {
    return {
      status: 503,
      code: "m2m_registry_unavailable",
      message: "M2M registry is unavailable",
    };
  }

  switch (error.code) {
    case "generation_conflict":
      return {
        status: 409,
        code: error.code,
        message: "Service key generation precondition failed",
        details: error.conflict ? conflictDetails(error.conflict) : undefined,
      };
    case "service_not_found":
      return { status: 404, code: error.code, message: "Service key service not found" };
    case "rollback_window_expired":
      return { status: 409, code: error.code, message: "Rollback window has expired" };
    case "rollback_target_conflict":
      return { status: 409, code: error.code, message: "Rollback target is not the current previous generation" };
    case "invalid_generation_precondition":
      return { status: 400, code: error.code, message: "Expected generation must be a positive integer" };
    case "invalid_grace_period":
      return { status: 400, code: error.code, message: "Grace period must be an integer between 300 and 604800 seconds" };
    case "invalid_expiry":
      return { status: 400, code: error.code, message: "Expiry must be a future RFC 3339 timestamp" };
    case "invalid_request":
      return { status: 400, code: error.code, message: "Invalid request" };
    case "m2m_registry_busy":
      return {
        status: 503,
        code: error.code,
        message: "M2M registry writer is busy",
        retryAfterSeconds: error.retryAfterSeconds ?? 5,
      };
    case "m2m_registry_unavailable":
    default:
      return { status: 503, code: "m2m_registry_unavailable", message: "M2M registry is unavailable" };
  }
}
