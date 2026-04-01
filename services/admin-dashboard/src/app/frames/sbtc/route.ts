import { renderFarcasterFrameHtml } from "@/lib/sidl/frameHtml";
import { getSbtcYieldSnapshot } from "@/lib/sidl/gateway";
import type { FarcasterFrameActionPayload } from "@/lib/sidl/types";

function originFromRequest(req: Request): string {
  return new URL(req.url).origin;
}

async function render(req: Request): Promise<Response> {
  const origin = originFromRequest(req);
  const snapshot = await getSbtcYieldSnapshot();

  const apy = snapshot.apy;
  const apyParam = apy === null ? "" : String(apy);
  const imageUrl = `${origin}/frames/sbtc/image?apy=${encodeURIComponent(apyParam)}&t=${Date.now()}`;
  const postUrl = `${origin}/frames/sbtc`;

  const html = renderFarcasterFrameHtml({
    title: "Conxian sBTC yield",
    imageUrl,
    postUrl,
    buttons: [
      { label: "Refresh", action: "post" },
      { label: "Vote", action: "link", target: `${origin}/frames/vote` },
      { label: "Cart", action: "link", target: `${origin}/api/cart/mandates/sbtc-yield-frame` },
    ],
    state: JSON.stringify({ snapshot }),
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request): Promise<Response> {
  return render(req);
}

export async function POST(req: Request): Promise<Response> {
  const payload = (await req.json().catch(() => null)) as FarcasterFrameActionPayload | null;
  const buttonIndex = payload?.untrustedData?.buttonIndex;

  // Button 1 is "Refresh"; for any other value, just re-render.
  if (buttonIndex !== 1) {
    return render(req);
  }

  return render(req);
}
