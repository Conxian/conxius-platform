import { sidlMetricsContentType, sidlMetricsSnapshot } from "@/lib/sidl/observability";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const payload = await sidlMetricsSnapshot();

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": sidlMetricsContentType(),
      "Cache-Control": "no-store",
    },
  });
}
