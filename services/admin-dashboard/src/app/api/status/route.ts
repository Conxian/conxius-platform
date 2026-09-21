import { getLiveProviderStatus } from "../../../lib/live-provider-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await getLiveProviderStatus();
  return Response.json(
    { generatedAt: new Date().toISOString(), providers },
    { headers: { "Cache-Control": "no-store" } },
  );
}
