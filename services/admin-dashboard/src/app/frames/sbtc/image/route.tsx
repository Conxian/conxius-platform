import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<ImageResponse> {
  const { searchParams } = new URL(req.url);
  const apy = searchParams.get("apy");

  const apyText = typeof apy === "string" && apy.length > 0 ? `${apy}%` : "unavailable";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          backgroundColor: "#FDFBF7",
          color: "#121212",
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 700, color: "#2E403B" }}>Conxian</div>
        <div style={{ fontSize: 38, marginTop: 12 }}>sBTC Yield Snapshot</div>
        <div style={{ fontSize: 92, marginTop: 24, fontWeight: 800, color: "#C25E00" }}>{apyText}</div>
        <div style={{ fontSize: 24, marginTop: 16, color: "#555555" }}>
          Source: Gateway `/api/v1/lorenzo/stats`
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
