import { sidlMetricsContentType, sidlMetricsSnapshot } from "@/lib/sidl/observability";
import { validateAdminAuth } from "@/lib/support/auth";
import { validatePrometheusScrapeAuth } from "@/lib/support/metricsAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  // CON-353: Harden Metrics endpoint. Operators retain admin-key access;
  // Prometheus uses the dedicated file-backed Basic Auth path.
  if (req.headers.get("X-Admin-API-Key")) {
    const adminAuthError = validateAdminAuth(req);
    if (!adminAuthError) return renderMetrics();
  }

  const scrapeAuthError = validatePrometheusScrapeAuth(req);
  if (scrapeAuthError) return scrapeAuthError;

  return renderMetrics();
}

async function renderMetrics(): Promise<Response> {

  const payload = await sidlMetricsSnapshot();

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": sidlMetricsContentType(),
      "Cache-Control": "no-store",
    },
  });
}
