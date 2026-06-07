import { NextResponse } from "next/server";
import { getErpDashboardData } from "@/lib/sidl/erp";

export async function GET() {
  const data = await getErpDashboardData();
  return NextResponse.json(data);
}
