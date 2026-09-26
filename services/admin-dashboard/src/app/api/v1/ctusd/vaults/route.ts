import { NextResponse } from "next/server";
import { validateAdminAuth } from "../../../../../lib/support/auth";
import { ctUsdEngine } from "../../../../../lib/support/ctusd";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await validateAdminAuth(request, "read:admin");
  if (authError) return authError;

  const url = new URL(request.url);
  const vaultId = url.searchParams.get("vaultId");

  if (vaultId) {
    const status = ctUsdEngine.getVaultStatus(vaultId);
    if (!status) {
      return NextResponse.json({ error: "Vault not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  }

  const stats = ctUsdEngine.getEngineStats();
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const authError = await validateAdminAuth(request, "write:admin");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { action, vaultId, ownerAddress, collateralSat, mintedCtusd, btcUsdPrice, dlcContractId, attestations, ctusdRepayAmount } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    if (action === "create") {
      const status = ctUsdEngine.createVault({
        vaultId,
        ownerAddress,
        collateralSat: Number(collateralSat),
        mintedCtusd: Number(mintedCtusd),
        btcUsdPrice: Number(btcUsdPrice),
        dlcContractId: dlcContractId || `dlc-${vaultId}`,
      });
      return NextResponse.json(status, { status: 201, headers: { "Cache-Control": "no-store" } });
    }

    if (action === "activate") {
      const status = ctUsdEngine.activateVault(vaultId);
      return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "updatePrice") {
      const status = ctUsdEngine.updatePriceAndEvaluate(vaultId, attestations || []);
      return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "liquidate") {
      const status = ctUsdEngine.executeLiquidation(vaultId);
      return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "close") {
      const status = ctUsdEngine.closeVault(vaultId, Number(ctusdRepayAmount));
      return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400, headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
