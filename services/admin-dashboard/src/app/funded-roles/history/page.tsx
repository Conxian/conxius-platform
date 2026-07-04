"use client";

import React, { useState, useEffect } from "react";
import type {
  FundedRoleHistory,
  FundedRoleDefinition,
  PayoutRecord,
  ActivityRecord,
} from "@/lib/governance/treasury";

interface FundedRolesHistoryResponse {
  histories: FundedRoleHistory[];
  definitions: FundedRoleDefinition[];
  grandTotalPayoutSats: number;
  totalPayoutCount: number;
  totalActivityCount: number;
  lastUpdatedIso: string;
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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/governance/funded-roles/history");
      if (!res.ok)
        throw new Error(`Failed to fetch history: ${res.status}`);
      const d = await res.json();
      setData(d);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <div
        style={{
          padding: "4rem",
          color: "#2E403B",
          textAlign: "center",
          fontSize: "1.1rem",
        }}
      >
        Loading Payout &amp; Activity History...
      </div>
    );
  }

  const histories = data?.histories ?? [];
  const definitions = data?.definitions ?? [];

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
          marginBottom: "3rem",
          borderLeft: "4px solid #D4A017",
          paddingLeft: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              color: "#0F172A",
              margin: 0,
              fontSize: "2.25rem",
              fontWeight: 800,
            }}
          >
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
              transition: "all 0.2s",
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
              transition: "all 0.2s",
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

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
            <div
              style={{
                fontSize: "0.7rem",
                color: "#94A3B8",
                textTransform: "uppercase",
              }}
            >
              Total Treasury Disbursed (All Funded Roles)
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "#2E403B",
              }}
            >
              {formatSats(data.grandTotalPayoutSats)}
            </div>
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
          return (
            <RoleHistoryCard
              key={history.roleId}
              history={history}
              definition={def}
            />
          );
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
          No funded role history available. Roles must be governance-recognized
          before payouts and activities are tracked.
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
        <div
          style={{
            fontSize: "0.85rem",
            color: "#92400E",
            lineHeight: 1.6,
          }}
        >
          <strong>Transparent by design.</strong> All treasury-funded community
          role payouts and governance activities are recorded and made visible to
          the community. This history is anchored in the Sovereign Financial
          Office (SFO) treasury direction and reflects the community-owned nature
          of funded protocol work. Every payout is linked to a governance
          proposal, and every activity contributes to the steward&apos;s
          reputation and eligibility score.
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
        Conxian Treasury-Funded Roles &middot; Payout &amp; Activity History
        &middot; Governance-Recognized &middot; SFO-Managed &middot;{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}
