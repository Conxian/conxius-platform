import { ImageResponse } from "next/og";

export const runtime = "nodejs";

function clampCount(value: string | null): number {
  const n = value ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export async function GET(req: Request): Promise<ImageResponse> {
  const { searchParams } = new URL(req.url);
  const yes = clampCount(searchParams.get("yes"));
  const no = clampCount(searchParams.get("no"));
  const last = searchParams.get("last");

  const lastText = last === "yes" ? "Last vote: YES" : last === "no" ? "Last vote: NO" : "";

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
        <div style={{ fontSize: 38, marginTop: 12 }}>One-click vote (SIDL)</div>

        <div style={{ display: "flex", gap: 48, marginTop: 32 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: "#555555" }}>YES</div>
            <div style={{ fontSize: 92, fontWeight: 800, color: "#2E403B" }}>{yes}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: "#555555" }}>NO</div>
            <div style={{ fontSize: 92, fontWeight: 800, color: "#8A1F1F" }}>{no}</div>
          </div>
        </div>

        {lastText ? (
          <div style={{ fontSize: 26, marginTop: 12, color: "#C25E00" }}>{lastText}</div>
        ) : null}

        <div style={{ fontSize: 22, marginTop: 24, color: "#555555" }}>
          Vote state is persisted locally with an auditable trail.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
