"use client";

import React, { useState, useEffect } from "react";

type PointsData = {
  total: number;
  earned_this_cycle: number;
  pending: number;
  claimable: number;
  level: string;
  multiplier: number;
  last_updated: string;
  oracle_address: string;
};

type ReputationData = {
  score: number;
  rank: string;
  badges: string[];
  history: { period: string; score: number }[];
  consensus_weight: number;
  delegated_votes: number;
  last_evaluation: string;
};

type StakingData = {
  cxd_staked: number;
  cxd_locked_vesting: number;
  yield_apy: number;
  yield_earned: number;
  unlock_date: string;
  staking_tier: string;
  rewards_pending: number;
  contract_address: string;
};

type ContributionData = {
  contributor_level: string;
  total_contributions: number;
  active_governance_proposals: number;
  votes_cast: number;
  proposals_created: number;
  proposals_passed: number;
  last_contribution_date: string;
};

type StewardDashboard = {
  points: PointsData;
  reputation: ReputationData;
  staking: StakingData;
  contribution: ContributionData;
  steward_address: string;
};

function StatCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color?: string }) {
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
      <div style={{ fontSize: "0.75rem", color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
        {title}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "#0F172A" }}>{value}</div>
      {subtitle && <div style={{ fontSize: "0.8rem", color: "#9CA3AF", marginTop: "0.25rem" }}>{subtitle}</div>}
    </div>
  );
}

function BadgePill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.25rem 0.75rem",
        backgroundColor: "#FEF3C7",
        color: "#92400E",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        marginRight: "0.5rem",
        marginBottom: "0.5rem",
      }}
    >
      {label}
    </span>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ width: "100%", height: "8px", backgroundColor: "#F1F5F9", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: "4px", transition: "width 1s ease-in-out" }} />
    </div>
  );
}

export default function StewardDashboardPage() {
  const [data, setData] = useState<StewardDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/steward/dashboard");
      if (!res.ok) throw new Error(`Failed to fetch steward data: ${res.status}`);
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
        Loading Steward Dashboard...
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
            Steward Standing Dashboard
          </h1>
          <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "1.1rem" }}>
            Points &middot; Reputation &middot; Staking &middot; Contribution &middot; Rewards
          </p>
          {data?.steward_address && (
            <p style={{ color: "#94A3B8", fontSize: "0.8rem", fontFamily: "monospace", marginTop: "0.5rem" }}>
              Steward: {data.steward_address}
            </p>
          )}
        </div>
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
          {loading ? "Refreshing..." : "Trigger Pulse"}
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

      {/* Points Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#2E403B", borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontSize: "1.25rem" }}>
          📊 Points (points-oracle)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <StatCard title="Total Points" value={data?.points?.total?.toLocaleString() ?? "—"} color="#2E403B" />
          <StatCard title="Earned This Cycle" value={data?.points?.earned_this_cycle?.toLocaleString() ?? "—"} color="#059669" />
          <StatCard title="Pending" value={data?.points?.pending?.toLocaleString() ?? "—"} color="#D4A017" />
          <StatCard title="Claimable" value={data?.points?.claimable?.toLocaleString() ?? "—"} color="#7C3AED" />
          <StatCard title="Steward Level" value={data?.points?.level ?? "—"} subtitle={`${data?.points?.multiplier}x Multiplier`} color="#2E403B" />
        </div>
        {data?.points?.oracle_address && (
          <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#94A3B8", fontFamily: "monospace" }}>
            Oracle: {data.points.oracle_address}
          </div>
        )}
      </section>

      {/* Reputation Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#2E403B", borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontSize: "1.25rem" }}>
          🏆 Reputation (reputation-engine)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard title="Reputation Score" value={data?.reputation?.score ?? "—"} color="#2E403B" />
          <StatCard title="Rank" value={data?.reputation?.rank ?? "—"} color="#D4A017" />
          <StatCard title="Consensus Weight" value={data?.reputation?.consensus_weight != null ? `${(data.reputation.consensus_weight * 100).toFixed(1)}%` : "—"} color="#059669" />
          <StatCard title="Delegated Votes" value={data?.reputation?.delegated_votes?.toLocaleString() ?? "—"} color="#7C3AED" />
        </div>
        {data?.reputation?.badges && data.reputation.badges.length > 0 && (
          <div style={{ backgroundColor: "white", padding: "1rem 1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Badges</div>
            {data.reputation.badges.map((b) => (
              <BadgePill key={b} label={b} />
            ))}
          </div>
        )}
        {data?.reputation?.history && data.reputation.history.length > 0 && (
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Score History</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2rem", height: "120px" }}>
              {data.reputation.history.map((h) => (
                <div key={h.period} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ fontWeight: 700, color: "#2E403B", fontSize: "0.9rem" }}>{h.score}</span>
                  <div
                    style={{
                      width: "40px",
                      height: `${(h.score / 100) * 100}px`,
                      backgroundColor: "#2E403B",
                      borderRadius: "4px 4px 0 0",
                      minHeight: "20px",
                    }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "#94A3B8" }}>{h.period}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Staking Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#2E403B", borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontSize: "1.25rem" }}>
          🔒 Staking (cxd-staking)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <StatCard title="CXD Staked" value={data?.staking?.cxd_staked?.toLocaleString() ?? "—"} subtitle="CXD" color="#2E403B" />
          <StatCard title="Locked (Vesting)" value={data?.staking?.cxd_locked_vesting?.toLocaleString() ?? "—"} subtitle="CXD" color="#D4A017" />
          <StatCard title="Yield APY" value={data?.staking?.yield_apy != null ? `${data.staking.yield_apy}%` : "—"} color="#059669" />
          <StatCard title="Yield Earned" value={data?.staking?.yield_earned?.toLocaleString() ?? "—"} subtitle="CXD" color="#059669" />
          <StatCard title="Staking Tier" value={data?.staking?.staking_tier ?? "—"} color="#D4A017" />
          <StatCard title="Rewards Pending" value={data?.staking?.rewards_pending?.toLocaleString() ?? "—"} subtitle="CXD" color="#7C3AED" />
        </div>
        {data?.staking?.cxd_staked && data?.staking?.cxd_locked_vesting ? (
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", marginTop: "1rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Staking Composition</div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div style={{ flex: data.staking.cxd_staked, height: "24px", backgroundColor: "#2E403B", borderRadius: "6px 0 0 6px" }} />
              <div style={{ flex: data.staking.cxd_locked_vesting, height: "24px", backgroundColor: "#D4A017", borderRadius: "0 6px 6px 0" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#6B7280" }}>
              <span>Liquid: {data.staking.cxd_staked.toLocaleString()} CXD</span>
              <span>Vesting: {data.staking.cxd_locked_vesting.toLocaleString()} CXD</span>
            </div>
          </div>
        ) : null}
        {data?.staking?.contract_address && (
          <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#94A3B8", fontFamily: "monospace" }}>
            Contract: {data.staking.contract_address}
          </div>
        )}
      </section>

      {/* Contribution Section */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#2E403B", borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontSize: "1.25rem" }}>
          🛠️ Contribution &amp; Governance
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard title="Contributor Level" value={data?.contribution?.contributor_level ?? "—"} color="#2E403B" />
          <StatCard title="Total Contributions" value={data?.contribution?.total_contributions?.toLocaleString() ?? "—"} color="#059669" />
          <StatCard title="Active Proposals" value={data?.contribution?.active_governance_proposals?.toLocaleString() ?? "—"} color="#D4A017" />
          <StatCard title="Votes Cast" value={data?.contribution?.votes_cast?.toLocaleString() ?? "—"} color="#7C3AED" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Proposal Activity</div>
            <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2E403B" }}>{data?.contribution?.proposals_created ?? "—"}</div>
                <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Created</div>
              </div>
              <div>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#059669" }}>{data?.contribution?.proposals_passed ?? "—"}</div>
                <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Passed</div>
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: "0.8rem", color: "#6B7280", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Governance Participation</div>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6B7280", marginBottom: "0.25rem" }}>
                <span>Votes Cast</span>
                <span>{data?.contribution?.votes_cast ?? 0} / {data?.contribution?.active_governance_proposals != null ? data.contribution.active_governance_proposals + (data.contribution.votes_cast ?? 0) : 0}</span>
              </div>
              <ProgressBar value={data?.contribution?.votes_cast ?? 0} max={Math.max((data?.contribution?.votes_cast ?? 0) + (data?.contribution?.active_governance_proposals ?? 0), 1)} color="#7C3AED" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6B7280", marginBottom: "0.25rem" }}>
                <span>Proposal Success Rate</span>
                <span>{data?.contribution?.proposals_created ? `${((data.contribution.proposals_passed / data.contribution.proposals_created) * 100).toFixed(0)}%` : "—"}</span>
              </div>
              <ProgressBar value={data?.contribution?.proposals_passed ?? 0} max={Math.max(data?.contribution?.proposals_created ?? 1, 1)} color="#059669" />
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Standing Summary */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ color: "#2E403B", borderBottom: "2px solid #D4A017", paddingBottom: "0.5rem", marginBottom: "1.5rem", fontSize: "1.25rem" }}>
          💰 Rewards Standing
        </h2>
        <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "2rem" }}>
            <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#F0FDF4", borderRadius: "12px" }}>
              <div style={{ fontSize: "0.8rem", color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Claimable Points</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#166534" }}>{data?.points?.claimable?.toLocaleString() ?? "—"}</div>
              <div style={{ fontSize: "0.75rem", color: "#15803D" }}>Available to claim</div>
            </div>
            <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#FFFBEB", borderRadius: "12px" }}>
              <div style={{ fontSize: "0.8rem", color: "#92400E", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Pending Staking Rewards</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#92400E" }}>{data?.staking?.rewards_pending?.toLocaleString() ?? "—"}</div>
              <div style={{ fontSize: "0.75rem", color: "#A16207" }}>CXD</div>
            </div>
            <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#EFF6FF", borderRadius: "12px" }}>
              <div style={{ fontSize: "0.8rem", color: "#1E40AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Yield Earned</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1E40AF" }}>{data?.staking?.yield_earned?.toLocaleString() ?? "—"}</div>
              <div style={{ fontSize: "0.75rem", color: "#1D4ED8" }}>CXD</div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ marginTop: "4rem", textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>
        Conxian Steward Registry &middot; points-oracle &middot; reputation-engine &middot; cxd-staking &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
