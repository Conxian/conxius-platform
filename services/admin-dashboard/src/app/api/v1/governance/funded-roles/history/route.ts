import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import {
  buildFundedRolesHistory,
  FUNDED_ROLE_DEFINITIONS,
  type FundedRoleHistory,
  type FundedRoleDefinition,
  type PayoutRecord,
  type ActivityRecord,
  type AllocationCategory,
} from "@/lib/governance/treasury";

interface MonthlyPayoutPoint {
  month: string;
  totalSats: number;
  count: number;
}

interface ActivityTypeBreakdown {
  activityType: string;
  count: number;
}

interface AllocationPivot {
  category: AllocationCategory;
  categoryLabel: string;
  totalSats: number;
  payoutCount: number;
  roleIds: string[];
  percentOfTotal: number;
}

interface TreasuryDataLink {
  monthlyPayoutTrend: MonthlyPayoutPoint[];
  allocationPivot: AllocationPivot[];
  activityTypeBreakdown: ActivityTypeBreakdown[];
  totalPayoutsAllTimeSats: number;
  avgMonthlyPayoutSats: number;
  activeMonths: number;
}

interface FundedRolesHistoryResponse {
  histories: FundedRoleHistory[];
  definitions: FundedRoleDefinition[];
  grandTotalPayoutSats: number;
  totalPayoutCount: number;
  totalActivityCount: number;
  treasuryDataLink: TreasuryDataLink | null;
  lastUpdatedIso: string;
  appliedFilters?: {
    roleId?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    activityType?: string;
  };
  error?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  "community-rewards": "Community Rewards",
  "governance-rewards": "Governance Rewards",
  "operational-rewards": "Operational Rewards",
  "treasury-reserve": "Treasury Reserve",
};

function filterPayouts(payouts: PayoutRecord[], params: URLSearchParams): PayoutRecord[] {
  const roleId = params.get("role_id");
  const category = params.get("category");
  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");

  return payouts.filter((p) => {
    if (roleId && p.roleId !== roleId) return false;
    if (category && p.allocationCategory !== category) return false;
    if (dateFrom && new Date(p.paidAtIso) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.paidAtIso) > new Date(dateTo)) return false;
    return true;
  });
}

function filterActivities(activities: ActivityRecord[], params: URLSearchParams): ActivityRecord[] {
  const roleId = params.get("role_id");
  const activityType = params.get("activity_type");
  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");

  return activities.filter((a) => {
    if (roleId && a.roleId !== roleId) return false;
    if (activityType && a.activityType !== activityType) return false;
    if (dateFrom && new Date(a.occurredAtIso) < new Date(dateFrom)) return false;
    if (dateTo && new Date(a.occurredAtIso) > new Date(dateTo)) return false;
    return true;
  });
}

function buildMonthlyPayoutTrend(payouts: PayoutRecord[]): MonthlyPayoutPoint[] {
  const byMonth = new Map<string, { totalSats: number; count: number }>();
  const sorted = [...payouts].sort(
    (a, b) => new Date(a.paidAtIso).getTime() - new Date(b.paidAtIso).getTime(),
  );

  for (const p of sorted) {
    const d = new Date(p.paidAtIso);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = byMonth.get(month) ?? { totalSats: 0, count: 0 };
    entry.totalSats += p.amountSats;
    entry.count += 1;
    byMonth.set(month, entry);
  }

  return Array.from(byMonth.entries()).map(([month, data]) => ({
    month,
    totalSats: data.totalSats,
    count: data.count,
  }));
}

function buildAllocationPivot(
  payouts: PayoutRecord[],
  grandTotal: number,
): AllocationPivot[] {
  const byCategory = new Map<AllocationCategory, { totalSats: number; payoutCount: number; roleIds: Set<string> }>();

  for (const p of payouts) {
    const entry = byCategory.get(p.allocationCategory) ?? {
      totalSats: 0,
      payoutCount: 0,
      roleIds: new Set<string>(),
    };
    entry.totalSats += p.amountSats;
    entry.payoutCount += 1;
    entry.roleIds.add(p.roleId);
    byCategory.set(p.allocationCategory, entry);
  }

  return Array.from(byCategory.entries()).map(([category, data]) => ({
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? category,
    totalSats: data.totalSats,
    payoutCount: data.payoutCount,
    roleIds: Array.from(data.roleIds),
    percentOfTotal: grandTotal > 0 ? Math.round((data.totalSats / grandTotal) * 100) : 0,
  }));
}

function buildActivityTypeBreakdown(activities: ActivityRecord[]): ActivityTypeBreakdown[] {
  const byType = new Map<string, number>();
  for (const a of activities) {
    byType.set(a.activityType, (byType.get(a.activityType) ?? 0) + 1);
  }
  return Array.from(byType.entries())
    .map(([activityType, count]) => ({ activityType, count }))
    .sort((a, b) => b.count - a.count);
}

function buildTreasuryDataLink(
  allPayouts: PayoutRecord[],
  allActivities: ActivityRecord[],
  grandTotal: number,
): TreasuryDataLink {
  const monthlyTrend = buildMonthlyPayoutTrend(allPayouts);
  const allocationPivot = buildAllocationPivot(allPayouts, grandTotal);
  const activityTypeBreakdown = buildActivityTypeBreakdown(allActivities);
  const activeMonths = monthlyTrend.length;

  return {
    monthlyPayoutTrend: monthlyTrend,
    allocationPivot,
    activityTypeBreakdown,
    totalPayoutsAllTimeSats: grandTotal,
    avgMonthlyPayoutSats: activeMonths > 0 ? Math.round(grandTotal / activeMonths) : 0,
    activeMonths,
  };
}

export async function GET(req: Request) {
  const authError = await validateAdminAuth(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const recognizedRoleIds = new Set([
      "protocol-operator",
      "governance-delegate",
      "policy-steward",
    ]);

    const histories = buildFundedRolesHistory(recognizedRoleIds);

    const allPayouts = histories.flatMap((h) => h.payouts);
    const allActivities = histories.flatMap((h) => h.activities);

    const filteredPayouts = filterPayouts(allPayouts, searchParams);
    const filteredActivities = filterActivities(allActivities, searchParams);

    const hasFilters = !!(
      searchParams.get("role_id") ||
      searchParams.get("category") ||
      searchParams.get("date_from") ||
      searchParams.get("date_to") ||
      searchParams.get("activity_type")
    );

    let filteredHistories: FundedRoleHistory[];
    if (hasFilters) {
      const filteredPayoutIds = new Set(filteredPayouts.map((p) => p.id));
      const filteredActivityIds = new Set(filteredActivities.map((a) => a.id));

      filteredHistories = histories
        .map((h) => {
          const hp = h.payouts.filter((p) => filteredPayoutIds.has(p.id));
          const ha = h.activities.filter((a) => filteredActivityIds.has(a.id));
          if (hp.length === 0 && ha.length === 0) return null;
          return {
            ...h,
            payouts: hp,
            activities: ha,
            totalPayoutSats: hp.reduce((s, p) => s + p.amountSats, 0),
            payoutCount: hp.length,
            activityCount: ha.length,
          };
        })
        .filter((h): h is FundedRoleHistory => h !== null);
    } else {
      filteredHistories = histories;
    }

    const grandTotalPayoutSats = filteredHistories.reduce(
      (sum, h) => sum + h.totalPayoutSats,
      0,
    );
    const totalPayoutCount = filteredHistories.reduce(
      (sum, h) => sum + h.payoutCount,
      0,
    );
    const totalActivityCount = filteredHistories.reduce(
      (sum, h) => sum + h.activityCount,
      0,
    );

    const treasuryDataLink = buildTreasuryDataLink(
      allPayouts,
      allActivities,
      histories.reduce((sum, h) => sum + h.totalPayoutSats, 0),
    );

    const response: FundedRolesHistoryResponse = {
      histories: filteredHistories,
      definitions: FUNDED_ROLE_DEFINITIONS,
      grandTotalPayoutSats,
      totalPayoutCount,
      totalActivityCount,
      treasuryDataLink,
      lastUpdatedIso: new Date().toISOString(),
      appliedFilters: hasFilters
        ? {
            roleId: searchParams.get("role_id") ?? undefined,
            category: searchParams.get("category") ?? undefined,
            dateFrom: searchParams.get("date_from") ?? undefined,
            dateTo: searchParams.get("date_to") ?? undefined,
            activityType: searchParams.get("activity_type") ?? undefined,
          }
        : undefined,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      {
        histories: [],
        definitions: FUNDED_ROLE_DEFINITIONS,
        grandTotalPayoutSats: 0,
        totalPayoutCount: 0,
        totalActivityCount: 0,
        treasuryDataLink: null,
        lastUpdatedIso: new Date().toISOString(),
        error:
          err instanceof Error
            ? err.message
            : "Failed to compute funded roles history",
      },
      { status: 500 },
    );
  }
}
