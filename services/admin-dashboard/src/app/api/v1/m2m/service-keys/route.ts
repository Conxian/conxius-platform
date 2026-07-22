import { NextResponse } from "next/server";

import {
  authorizeM2MAdmin,
  createM2MRequestId,
  m2mErrorResponse,
  m2mJson,
  m2mStoreErrorToHttp,
} from "@/lib/support/m2mKeyHttp";
import { getM2MKeyStore } from "@/lib/support/m2mKeyStore";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const requestId = createM2MRequestId();
  const authError = authorizeM2MAdmin(request, requestId);
  if (authError) return authError;

  try {
    const metadata = getM2MKeyStore().listMetadata(requestId);
    return m2mJson(metadata, requestId);
  } catch (error) {
    return m2mErrorResponse(m2mStoreErrorToHttp(error), requestId);
  }
}
