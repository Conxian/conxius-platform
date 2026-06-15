import { sidlMetricsContentType, sidlMetricsSnapshot } from "@/lib/sidl/observability";
import { validateAdminAuth } from "@/lib/support/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  // CON-353: Harden Metrics endpoint
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  const payload = await sidlMetricsSnapshot();

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": sidlMetricsContentType(),
      "Cache-Control": "no-store",
    },
  });
}
