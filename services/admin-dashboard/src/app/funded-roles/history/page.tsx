"use client";

import React, { useState, useEffect } from "react";
import type {
  FundedRoleHistory,
  FundedRoleDefinition,
  PayoutRecord,
  ActivityRecord,
} from "@/lib/governance/treasury";
import { SparklineChart, BarChart } from "@/lib/charts/SparklineChart";
import type { SparklineDatum, BarChartDatum } from "@/lib/charts/SparklineChart";

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
  category: string;
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

const CATEGORY_COLORS: Record<string, string> = {
  "community-rewards": "#7C3AED",
  "governance-rewards": "#D4A017",
  "operational-rewards": "#059669",
  "treasury-reserve": "#2E403B",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  "vote-cast": "Vote Cast",
  "proposal-created": "Proposal Created",
  "policy-authored": "Policy Authored",
  "policy-reviewed": "Policy Reviewed",
  "delegation-received": "Delegation Received",
  "badge-earned": "Badge Earned",
  "operator-action": "Operator Action",
};

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  "vote-cast": "🗳️",
  "proposal-created": "📋",
  "policy-authored": "📝",
  "policy-reviewed": "🔍",
  "delegation-received": "🤝",
  "badge-earned": "🏅",
  "operator-action": "⚙️",
};

function formatSats(sats: number): string {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(1)}M sats`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}K sats`;
  return `${sats} sats`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPeriod(iso: string): string {
  if (iso.startsWith("2026-Q")) return iso;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

function PayoutTimelineEntry({ payout, definition }: { payout: PayoutRecord; definition?: FundedRoleDefinition }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        padding: "1rem 0",
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#F0FDF4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.1rem",
        }}
      >
        💰
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0F172A" }}>
              {formatSats(payout.amountSats)} payout — {payout.roleName}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.15rem" }}>
              Period: {formatPeriod(payout.periodIso)} &middot; Cadence: {payout.fundingCadence}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#94A3B8" }}>
            {formatDate(payout.paidAtIso)}
          </div>
        </div>
        <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "0.1rem 0.5rem",
              backgroundColor: `${CATEGORY_COLORS[payout.allocationCategory] ?? "#6B7280"}15`,
              color: CATEGORY_COLORS[payout.allocationCategory] ?? "#6B7280",
              borderRadius: "9999px",
              fontSize: "0.65rem",
              fontWeight: 600,
            }}
          >
            {CATEGORY_LABELS[payout.allocationCategory] ?? payout.allocationCategory}
          </span>
          {payout.txHash && (
            <span
              style={{
                padding: "0.1rem 0.5rem",
                backgroundColor: "#F1F5F9",
                color: "#64748B",
                borderRadius: "9999px",
                fontSize: "0.65rem",
                fontFamily: "monospace",
              }}
            >
              tx: {payout.txHash.slice(0, 12)}...
            </span>
          )}
          <span
            style={{
              padding: "0.1rem 0.5rem",
              backgroundColor: "#FFFBEB",
              color: "#92400E",
              borderRadius: "9999px",
              fontSize: "0.65rem",
              fontFamily: "monospace",
            }}
          >
            {payout.recognizedBy}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityTimelineEntry({ activity }: { activity: ActivityRecord }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        padding: "1rem 0",
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          backgroundColor: "#EFF6FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.1rem",
        }}
      >
        {ACTIVITY_TYPE_ICONS[activity.activityType] ?? "📌"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0F172A" }}>
              {activity.description}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748B", marginTop: "0.15rem" }}>
              {activity.roleName}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "0.75rem", color: "#94A3B8" }}>
            {formatDate(activity.occurredAtIso)}
          </div>
        </div>
        <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "0.1rem 0.5rem",
              backgroundColor: "#EFF6FF",
              color: "#3B82F6",
              borderRadius: "9999px",
              fontSize: "0.65rem",
              fontWeight: 600,
            }}
          >
            {ACTIVITY_TYPE_LABELS[activity.activityType] ?? activity.activityType}
          </span>
          {activity.metadata &&
            Object.entries(activity.metadata).map(([key, value]) => (
              <span
                key={key}
                style={{
                  padding: "0.1rem 0.5rem",
                  backgroundColor: "#F1F5F9",
                  color: "#64748B",
                  borderRadius: "9999px",
                  fontSize: "0.65rem",
                }}
              >
                {key}: {value}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

function RoleHistoryCard({
  history,
  definition,
}: {
  history: FundedRoleHistory;
  definition?: FundedRoleDefinition;
}) {
  const [activeTab, setActiveTab] = useState<"payouts" | "activities">("payouts");
  const catColor = CATEGORY_COLORS[history.allocationCategory] ?? "#6B7280";

  const sortedPayouts = [...history.payouts].sort(
    (a, b) => new Date(b.paidAtIso).getTime() - new Date(a.paidAtIso).getTime(),
  );
  const sortedActivities = [...history.activities].sort(
    (a, b) => new Date(b.occurredAtIso).getTime() - new Date(a.occurredAtIso).getTime(),
  );

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        borderLeft: `4px solid ${catColor}`,
        overflow: "hidden",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #F1F5F9",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0F172A" }}>
            {history.roleName}
          </h3>
          <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "0.25rem" }}>
            {CATEGORY_LABELS[history.allocationCategory] ?? history.allocationCategory} &middot;{" "}
            Steward: {history.stewardName}
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", textAlign: "center" }}>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#059669" }}>
              {formatSats(history.totalPayoutSats)}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#94A3B8", textTransform: "uppercase" }}>
              Total Paid
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0F172A" }}>
              {history.payoutCount}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#94A3B8", textTransform: "uppercase" }}>
              Payouts
            </div>
          </div>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0F172A" }}>
              {history.activityCount}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#94A3B8", textTransform: "uppercase" }}>
              Activities
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: "flex", borderBottom: "1px solid #F1F5F9" }}>
        <button
          onClick={() => setActiveTab("payouts")}
          style={{
            flex: 1,
            padding: "0.75rem",
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontWeight: activeTab === "payouts" ? 700 : 500,
            color: activeTab === "payouts" ? "#2E403B" : "#94A3B8",
            borderBottom: activeTab === "payouts" ? "2px solid #2E403B" : "2px solid transparent",
            fontSize: "0.85rem",
            transition: "all 0.15s",
          }}
        >
          💰 Payout History ({history.payoutCount})
        </button>
        <button
          onClick={() => setActiveTab("activities")}
          style={{
            flex: 1,
            padding: "0.75rem",
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            fontWeight: activeTab === "activities" ? 700 : 500,
            color: activeTab === "activities" ? "#2E403B" : "#94A3B8",
            borderBottom:
              activeTab === "activities" ? "2px solid #2E403B" : "2px solid transparent",
            fontSize: "0.85rem",
            transition: "all 0.15s",
          }}
        >
          📋 Activity History ({history.activityCount})
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ padding: "0 1.5rem" }}>
        {activeTab === "payouts" && (
          <>
            {sortedPayouts.length === 0 ? (
              <div style={{ padding: "2rem 0", textAlign: "center", color: "#94A3B8" }}>
                No payout history for this role yet.
              </div>
            ) : (
              sortedPayouts.map((p) => (
                <PayoutTimelineEntry key={p.id} payout={p} definition={definition} />
              ))
            )}
          </>
        )}
        {activeTab === "activities" && (
          <>
            {sortedActivities.length === 0 ? (
              <div style={{ padding: "2rem 0", textAlign: "center", color: "#94A3B8" }}>
                No activity history for this role yet.
              </div>
            ) : (
              sortedActivities.map((a) => (
                <ActivityTimelineEntry key={a.id} activity={a} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function FundedRolesHistoryPage() {
  const [data, setData] = useState<FundedRolesHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const buildUrl = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    return `/api/v1/governance/funded-roles/history${qs ? `?${qs}` : ""}`;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
      const d = await res.json();
      setData(d);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const clearFilters = () => setFilters({});

  if (loading && !data) {
    return (
      <div style={{ padding: "4rem", color: "#2E403B", textAlign: "center", fontSize: "1.1rem" }}>
        Loading Payout &amp; Activity History...
      </div>
    );
  }

  const histories = data?.histories ?? [];
  const definitions = data?.definitions ?? [];
  const tdl = data?.treasuryDataLink;
  const hasFilters = !!data?.appliedFilters;

  const sparklineData: SparklineDatum[] =
    tdl?.monthlyPayoutTrend.map((p) => ({
      label: p.month,
      value: p.totalSats,
    })) ?? [];

  const allocationBarData: BarChartDatum[] =
    tdl?.allocationPivot.map((a) => ({
      label: a.categoryLabel,
      value: a.totalSats,
      color: CATEGORY_COLORS[a.category] ?? "#6B7280",
    })) ?? [];

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        fontFamily: "Inter, system-ui, sans-serif",
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          marginBottom: "2rem",
          borderLeft: "4px solid #D4A017",
          paddingLeft: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 style={{ color: "#0F172A", margin: 0, fontSize: "2.25rem", fontWeight: 800 }}>
            Payout &amp; Activity History
          </h1>
          <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "1.1rem" }}>
            Treasury-funded community roles &middot;{" "}
            {data ? `${data.totalPayoutCount} payouts` : "—"} &middot;{" "}
            {data ? `${data.totalActivityCount} activities` : "—"} &middot;{" "}
            {histories.length} funded roles
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a
            href="/funded-roles"
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "#F1F5F9",
              color: "#475569",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "0.85rem",
            }}
          >
            ← Roles Overview
          </a>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: loading ? "#CCC" : "#2E403B",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
          padding: "0.75rem 1rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "#94A3B8", fontWeight: 600, marginRight: "0.25rem" }}>
          Filter:
        </span>
        <select
          value={filters.role_id ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, role_id: e.target.value }))
          }
          style={{
            padding: "0.35rem 0.5rem",
            fontSize: "0.75rem",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            backgroundColor: "#F8FAFC",
            color: "#475569",
          }}
        >
          <option value="">All Roles</option>
          {definitions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={filters.category ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, category: e.target.value }))
          }
          style={{
            padding: "0.35rem 0.5rem",
            fontSize: "0.75rem",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            backgroundColor: "#F8FAFC",
            color: "#475569",
          }}
        >
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filters.activity_type ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, activity_type: e.target.value }))
          }
          style={{
            padding: "0.35rem 0.5rem",
            fontSize: "0.75rem",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            backgroundColor: "#F8FAFC",
            color: "#475569",
          }}
        >
          <option value="">All Activity Types</option>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              border: "1px solid #FEE2E2",
              borderRadius: "6px",
              backgroundColor: "#FEF2F2",
              color: "#991B1B",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FEE2E2",
            color: "#991B1B",
            borderRadius: "8px",
            marginBottom: "2rem",
          }}
        >
          Error: {error}
        </div>
      )}

      {/* Grand Total Summary */}
      {data && data.grandTotalPayoutSats > 0 && (
        <section
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            padding: "1.5rem",
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", color: "#94A3B8", textTransform: "uppercase" }}>
              Total Treasury Disbursed (All Funded Roles)
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#2E403B" }}>
              {formatSats(data.grandTotalPayoutSats)}
            </div>
            {tdl && (
              <div style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.25rem" }}>
                Avg {formatSats(tdl.avgMonthlyPayoutSats)}/mo over {tdl.activeMonths} active months
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "2rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0F172A" }}>
                {data.totalPayoutCount}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#94A3B8", textTransform: "uppercase" }}>
                Total Payouts
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0F172A" }}>
                {data.totalActivityCount}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#94A3B8", textTransform: "uppercase" }}>
                Total Activities
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0F172A" }}>
                {histories.length}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#94A3B8", textTransform: "uppercase" }}>
                Funded Roles
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Treasury Data Link: Charts & Pivots */}
      {tdl && !hasFilters && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          {/* Monthly Payout Trend */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              padding: "1.25rem",
            }}
          >
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", marginBottom: "0.75rem" }}>
              📈 Monthly Payout Trend
            </div>
            <SparklineChart
              data={sparklineData}
              width={340}
              height={80}
              color="#059669"
              showLabels
              formatValue={formatSats}
            />
            <div style={{ fontSize: "0.7rem", color: "#94A3B8", marginTop: "0.25rem", textAlign: "center" }}>
              Total payout volume by month (sats)
            </div>
          </div>

          {/* Allocation Pivot */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              padding: "1.25rem",
            }}
          >
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", marginBottom: "0.75rem" }}>
              🏷️ Allocation by Category
            </div>
            <BarChart
              data={allocationBarData}
              width={340}
              height={120}
              formatValue={formatSats}
            />
          </div>

          {/* Activity Type Breakdown */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              padding: "1.25rem",
            }}
          >
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0F172A", marginBottom: "0.75rem" }}>
              📋 Activities by Type
            </div>
            <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                {tdl.activityTypeBreakdown.map((a) => (
                  <div
                    key={a.activityType}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "#475569", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span>{ACTIVITY_TYPE_ICONS[a.activityType] ?? "📌"}</span>
                      {ACTIVITY_TYPE_LABELS[a.activityType] ?? a.activityType}
                    </span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0F172A" }}>
                      {a.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Allocation Detail Table */}
      {tdl && !hasFilters && (
        <section
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A", margin: "0 0 1rem 0" }}>
            🔗 Treasury Data Link — Allocation Pivot
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E2E8F0", color: "#64748B", textAlign: "left" }}>
                <th style={{ padding: "0.5rem" }}>Category</th>
                <th style={{ padding: "0.5rem" }}>Total Disbursed</th>
                <th style={{ padding: "0.5rem" }}>Payouts</th>
                <th style={{ padding: "0.5rem" }}>% of Total</th>
                <th style={{ padding: "0.5rem" }}>Roles</th>
              </tr>
            </thead>
            <tbody>
              {tdl.allocationPivot.map((row) => (
                <tr key={row.category} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        fontWeight: 600,
                        color: CATEGORY_COLORS[row.category] ?? "#475569",
                      }}
                    >
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "3px",
                          backgroundColor: CATEGORY_COLORS[row.category] ?? "#6B7280",
                          display: "inline-block",
                        }}
                      />
                      {row.categoryLabel}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>
                    {formatSats(row.totalSats)}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", color: "#64748B" }}>{row.payoutCount}</td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          flex: 1,
                          maxWidth: "80px",
                          height: "6px",
                          backgroundColor: "#F1F5F9",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${row.percentOfTotal}%`,
                            height: "100%",
                            backgroundColor: CATEGORY_COLORS[row.category] ?? "#6B7280",
                            borderRadius: "3px",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                        {row.percentOfTotal}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>
                    {row.roleIds.map((rid) => {
                      const def = definitions.find((d) => d.id === rid);
                      return (
                        <span
                          key={rid}
                          style={{
                            display: "inline-block",
                            padding: "0.1rem 0.4rem",
                            backgroundColor: "#F1F5F9",
                            borderRadius: "9999px",
                            fontSize: "0.65rem",
                            marginRight: "0.25rem",
                            color: "#475569",
                          }}
                        >
                          {def?.name ?? rid}
                        </span>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Role History Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {histories.map((history) => {
          const def = definitions.find((d) => d.id === history.roleId);
          return <RoleHistoryCard key={history.roleId} history={history} definition={def} />;
        })}
      </div>

      {histories.length === 0 && !error && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "#94A3B8",
            backgroundColor: "white",
            borderRadius: "12px",
          }}
        >
          No funded role history available. Roles must be governance-recognized before payouts and
          activities are tracked.
        </div>
      )}

      {/* Transparency Note */}
      <section
        style={{
          marginTop: "3rem",
          padding: "1.5rem",
          backgroundColor: "#FFFBEB",
          borderRadius: "12px",
          border: "1px solid #FDE68A",
        }}
      >
        <div style={{ fontSize: "0.85rem", color: "#92400E", lineHeight: 1.6 }}>
          <strong>Transparent by design.</strong> All treasury-funded community role payouts and
          governance activities are recorded and made visible to the community. This history is
          anchored in the Sovereign Financial Office (SFO) treasury direction and reflects the
          community-owned nature of funded protocol work. Every payout is linked to a governance
          proposal, and every activity contributes to the steward&apos;s reputation and eligibility
          score. The Treasury Data Link above cross-references payout history with the
          multidimensional platform metrics (C_R, O_C, V_X, A_S, N_E) to provide a complete picture
          of treasury-funded community operations.
        </div>
      </section>

      <footer
        style={{
          marginTop: "4rem",
          textAlign: "center",
          color: "#94A3B8",
          fontSize: "0.875rem",
        }}
      >
        Conxian Treasury-Funded Roles &middot; Payout &amp; Activity History &middot;
        Governance-Recognized &middot; SFO-Managed &middot; Multidimensional Data Link &middot;{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}
