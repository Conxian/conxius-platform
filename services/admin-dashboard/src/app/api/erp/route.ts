import { NextResponse } from "next/server";
import { getErpDashboardData } from "@/lib/sidl/erp";
import { validateAdminAuth } from "@/lib/support/auth";

export async function GET(req: Request) {
  const authError = await validateAdminAuth(req);
  if (authError) return authError;

  const data = await getErpDashboardData();
  return NextResponse.json(data);
}
