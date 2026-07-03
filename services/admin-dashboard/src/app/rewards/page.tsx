"use client";

import React, { useState, useEffect } from "react";

interface RevenueSource {
  name: string;
  amount_sats: number;
  percentage: number;
  description: string;
}

interface RewardAllocation {
  category: string;
  amount_sats: number;
  percentage: number;
  description: string;
  operational_units: string[];
}

interface RewardSourcesData {
  total_revenue_sats: number;
  revenue_sources: RevenueSource[];
  allocation: RewardAllocation[];
  treasury_reserve_sats: number;
  treasury_reserve_pct: number;
  last_updated: string;
  period: string;
  sfo_address: string;
}

const FOREST_GREEN = "#2E403B";
const NAKAMOTO_GOLD = "#D4A017";

const ALLOCATION_COLORS: Record<string, string> = {
  "Community Rewards": "#059669",
  "Governance Rewards": "#7C3AED",
  "Operational Rewards": "#2563EB",
  "Treasury Reserve": NAKAMOTO_GOLD,
};

const SOURCE_COLORS: Record<string, string> = {
  "Protocol Fees": "#059669",
  "Staking Yield": "#7C3AED",
  "Treasury Yield": NAKAMOTO_GOLD,
  "Service Revenue": "#2563EB",
};

function formatSats(sats: number): string {
  const btc = sats / 100_000_000;
  if (btc >= 1) return `${btc.toFixed(2)} BTC (${sats.toLocaleString()} sats)`;
  return `${sats.toLocaleString()} sats`;
}

function StatCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        borderLeft: color ? `4px solid ${color}` : "4px solid #E5E7EB",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          color: "#6B7280",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "0.5rem",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "#0F172A" }}>{value}</div>
      {subtitle && (
        <div style={{ fontSize: "0.8rem", color: "#9CA3AF", marginTop: "0.25rem" }}>{subtitle}</div>
      )}
    </div>
  );
}

function AllocationBar({
  allocations,
  total,
}: {
  allocations: RewardAllocation[];
  total: number;
}) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", height: "32px" }}>
        {allocations.map((a) => (
          <div
            key={a.category}
            style={{
              flex: a.amount_sats,
              backgroundColor: ALLOCATION_COLORS[a.category] || "#6B7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: a.percentage > 8 ? undefined : "0",
            }}
            title={`${a.category}: ${a.percentage}%`}
          >
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "#FFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 4px" }}>
              {a.percentage > 8 ? `${a.percentage}%` : ""}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.75rem" }}>
        {allocations.map((a) => (
          <div key={a.category} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#6B7280" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "3px",
                backgroundColor: ALLOCATION_COLORS[a.category] || "#6B7280",
                display: "inline-block",
              }}
            />
            {a.category} ({a.percentage}%)
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RewardsPage() {
  const [data, setData] = useState<RewardSourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/rewards/sources");
      if (!res.ok) throw new Error(`Failed to fetch reward data: ${res.status}`);
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
      <div style={{ padding: "4rem", color: "#2E403B", textAlign: "center", fontSize: "1.1rem" }}>
        Loading Reward Source Breakdown...
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "1400px",
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
          <h1 style={{ color: "#0F172A", margin: 0, fontSize: "2.25rem", fontWeight: 800 }}>
            Reward Source Breakdown
          </h1>
          <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "1.1rem" }}>
            Protocol Revenue &middot; Allocation &middot; Operational Flows &middot; Treasury Reserve
          </p>
          {data?.sfo_address && (
            <p style={{ color: "#94A3B8", fontSize: "0.8rem", fontFamily: "monospace", marginTop: "0.5rem" }}>
              SFO: {data.sfo_address} &middot; Period: {data?.period}
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: loading ? "#CCC" : FOREST_GREEN,
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

      {/* Total Revenue Summary */}
      <section style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            color: FOREST_GREEN,
            borderBottom: `2px solid ${NAKAMOTO_GOLD}`,
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "1.25rem",
          }}
        >
          📊 Protocol Revenue Overview
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          <StatCard
            title="Total Period Revenue"
            value={data ? formatSats(data.total_revenue_sats) : "—"}
            color={FOREST_GREEN}
          />
          <StatCard
            title="Treasury Reserve"
            value={data ? formatSats(data.treasury_reserve_sats) : "—"}
            subtitle={`${data?.treasury_reserve_pct ?? "—"}% of revenue`}
            color={NAKAMOTO_GOLD}
          />
          <StatCard
            title="Revenue Sources"
            value={data?.revenue_sources?.length ?? "—"}
            subtitle="Protocol Fees, Staking, Treasury, Services"
            color="#2563EB"
          />
          <StatCard
            title="Allocation Categories"
            value={data?.allocation?.length ?? "—"}
            subtitle="Community, Governance, Operations, Reserve"
            color="#7C3AED"
          />
        </div>
      </section>

      {/* Revenue Sources Breakdown */}
      <section style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            color: FOREST_GREEN,
            borderBottom: `2px solid ${NAKAMOTO_GOLD}`,
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "1.25rem",
          }}
        >
          🔗 Revenue Sources
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {data?.revenue_sources.map((source) => (
            <div
              key={source.name}
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                borderTop: `4px solid ${SOURCE_COLORS[source.name] || "#E5E7EB"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.75rem",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0F172A" }}>
                  {source.name}
                </h3>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: SOURCE_COLORS[source.name] || "#6B7280",
                    backgroundColor: `${SOURCE_COLORS[source.name]}10` || "#F3F4F6",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                  }}
                >
                  {source.percentage}%
                </span>
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: FOREST_GREEN,
                  marginBottom: "0.5rem",
                }}
              >
                {formatSats(source.amount_sats)}
              </div>
              <p style={{ fontSize: "0.8rem", color: "#6B7280", lineHeight: "1.5", margin: 0 }}>
                {source.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Reward Allocation Breakdown */}
      <section style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            color: FOREST_GREEN,
            borderBottom: `2px solid ${NAKAMOTO_GOLD}`,
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "1.25rem",
          }}
        >
          💰 Reward Allocation
        </h2>

        {/* Allocation stacked bar */}
        <div
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              color: "#6B7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            Revenue Distribution (from {data ? formatSats(data.total_revenue_sats) : "—"})
          </div>
          {data && (
            <AllocationBar allocations={data.allocation} total={data.total_revenue_sats} />
          )}
        </div>

        {/* Per-category detail cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {data?.allocation.map((alloc) => (
            <div
              key={alloc.category}
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                borderLeft: `4px solid ${ALLOCATION_COLORS[alloc.category] || "#E5E7EB"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "0.75rem",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#0F172A" }}>
                  {alloc.category}
                </h3>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: ALLOCATION_COLORS[alloc.category] || "#6B7280",
                  }}
                >
                  {alloc.percentage}%
                </span>
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: ALLOCATION_COLORS[alloc.category] || FOREST_GREEN,
                  marginBottom: "0.75rem",
                }}
              >
                {formatSats(alloc.amount_sats)}
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#6B7280",
                  lineHeight: "1.5",
                  margin: "0 0 0.75rem 0",
                }}
              >
                {alloc.description}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {alloc.operational_units.map((unit) => (
                  <span
                    key={unit}
                    style={{
                      display: "inline-block",
                      padding: "0.2rem 0.6rem",
                      backgroundColor: `${ALLOCATION_COLORS[alloc.category]}15` || "#F3F4F6",
                      color: ALLOCATION_COLORS[alloc.category] || "#6B7280",
                      borderRadius: "9999px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      border: `1px solid ${ALLOCATION_COLORS[alloc.category]}30` || "1px solid #E5E7EB",
                    }}
                  >
                    {unit}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Protocol-Funded Work Transition */}
      <section style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            color: FOREST_GREEN,
            borderBottom: `2px solid ${NAKAMOTO_GOLD}`,
            paddingBottom: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "1.25rem",
          }}
        >
          🏛️ From Labs-Funded to Protocol-Funded
        </h2>
        <div
          style={{
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "16px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            border: "1px solid #E2E8F0",
          }}
        >
          <p style={{ color: "#475569", lineHeight: "1.7", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            The Conxian protocol is designed to transition operational funding from
            centralized Labs-owned work to sustainable, protocol-funded work. Reward
            allocations are governed by the Sovereign Financial Office (SFO) and
            distributed through the Contributor Claim Ledger.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#F0FDF4",
                borderRadius: "10px",
                borderLeft: `3px solid #059669`,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Community
              </div>
              <p style={{ fontSize: "0.85rem", color: "#166534", lineHeight: "1.6", margin: 0 }}>
                Protocol revenue directly funds contributor rewards, community grants, and
                ecosystem growth — replacing centralized grant programs.
              </p>
            </div>
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#F5F3FF",
                borderRadius: "10px",
                borderLeft: `3px solid #7C3AED`,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#5B21B6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Governance
              </div>
              <p style={{ fontSize: "0.85rem", color: "#5B21B6", lineHeight: "1.6", margin: 0 }}>
                Stewards earn governance rewards proportional to participation, ensuring
                protocol direction remains community-driven.
              </p>
            </div>
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#EFF6FF",
                borderRadius: "10px",
                borderLeft: `3px solid #2563EB`,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#1E40AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Operations
              </div>
              <p style={{ fontSize: "0.85rem", color: "#1E40AF", lineHeight: "1.6", margin: 0 }}>
                Infrastructure, security, and core development are funded through
                operational allocations managed by the SFO.
              </p>
            </div>
            <div
              style={{
                padding: "1.25rem",
                backgroundColor: "#FFFBEB",
                borderRadius: "10px",
                borderLeft: `3px solid ${NAKAMOTO_GOLD}`,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "#92400E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Reserve
              </div>
              <p style={{ fontSize: "0.85rem", color: "#92400E", lineHeight: "1.6", margin: 0 }}>
                A sovereign treasury reserve ensures multi-year runway and protects
                against market volatility — a BTC-standard mandate.
              </p>
            </div>
          </div>
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
        Conxian Reward Sources &middot; SFO: {data?.sfo_address ?? "sfo.cxd"} &middot; Period:{" "}
        {data?.period ?? "—"} &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
