"use client";

import React, { useState, useEffect } from "react";
import type { ContributorProfile, CommunityStats } from "@/lib/launch";

const DEFAULT_CONTRIBUTOR_ADDRESS = "SP2AQGJQXS0KG3RB6MBK8M9NQPF1WE3N6NNPKF0NE";

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
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "#0F172A" }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: "0.8rem", color: "#9CA3AF", marginTop: "0.25rem" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function FundingProgressBar({ raised, target }: { raised: number; target: number }) {
  const pct = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6B7280", marginBottom: "0.5rem" }}>
        <span>{raised.toLocaleString()} CXD</span>
        <span>{pct.toFixed(1)}% of {target.toLocaleString()} CXD</span>
      </div>
      <div style={{ width: "100%", height: "12px", backgroundColor: "#F1F5F9", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#059669", borderRadius: "6px", transition: "width 1s ease-in-out" }} />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div
      style={{
        padding: "3rem 2rem",
        textAlign: "center",
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        border: "1px dashed #D1D5DB",
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🛠️</div>
      <h3 style={{ color: "#2E403B", margin: "0 0 0.5rem 0", fontSize: "1.1rem" }}>
        {message || "No Contribution History Yet"}
      </h3>
      <p style={{ color: "#6B7280", margin: 0, fontSize: "0.9rem", maxWidth: "420px", marginInline: "auto" }}>
        Your contributions will appear here once you start engaging with the
        Conxian platform. Begin by participating in governance, submitting
        proposals, or contributing to protocol development.
      </p>
    </div>
  );
}

export default function LaunchPage() {
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, communityRes] = await Promise.all([
        fetch(`/api/v1/launch/contributor?address=${encodeURIComponent(DEFAULT_CONTRIBUTOR_ADDRESS)}`),
        fetch("/api/v1/launch/community"),
      ]);
      if (!profileRes.ok) throw new Error(`Failed to fetch contributor profile: ${profileRes.status}`);
      if (!communityRes.ok) throw new Error(`Failed to fetch community stats: ${communityRes.status}`);
      const [profileData, communityData] = await Promise.all([profileRes.json(), communityRes.json()]);
      setProfile(profileData);
      setCommunityStats(communityData);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !profile) {
    return (
      <div
        style={{
          padding: "4rem",
          color: "#2E403B",
          textAlign: "center",
          fontSize: "1.1rem",
        }}
      >
        Loading Launch...
      </div>
    );
  }

  const hasContributions = profile && profile.total_contributions > 0;

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
            Launch Contributor Profile
          </h1>
          <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "1.1rem" }}>
            Contributions &middot; Tokens &middot; Governance Standing
          </p>
          {profile?.contributor_address && (
            <p
              style={{
                color: "#94A3B8",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                marginTop: "0.5rem",
              }}
            >
              Contributor: {profile.contributor_address}
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

      {/* Community Overview */}
      {communityStats && (
        <section style={{ marginBottom: "3rem" }}>
          <h2
            style={{
              color: "#2E403B",
              borderBottom: "2px solid #D4A017",
              paddingBottom: "0.5rem",
              marginBottom: "1.5rem",
              fontSize: "1.25rem",
            }}
          >
            🌐 Community Overview
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <StatCard title="Contributors" value={communityStats.total_contributors.toLocaleString()} color="#2E403B" subtitle={`${communityStats.community_members.toLocaleString()} members`} />
            <StatCard title="Total Contributions" value={communityStats.total_contributions.toLocaleString()} color="#059669" />
            <StatCard title="Active Proposals" value={communityStats.active_proposals.toLocaleString()} color="#D4A017" subtitle={`${communityStats.proposals_passed} passed`} />
            <StatCard title="Votes Cast" value={communityStats.total_votes_cast.toLocaleString()} color="#7C3AED" />
          </div>
          <div
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: "0.8rem",
                color: "#6B7280",
                marginBottom: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              💰 Funding Progress
            </div>
            <FundingProgressBar raised={communityStats.funding_raised_cxd} target={communityStats.funding_target_cxd} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.8rem", color: "#6B7280" }}>
              <span>🪙 Total CXD Minted: {communityStats.total_cxd_minted.toLocaleString()}</span>
              <span style={{ color: "#94A3B8", fontSize: "0.75rem" }}>
                Updated: {new Date(communityStats.last_updated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </section>
      )}

      {!hasContributions ? (
        <EmptyState />
      ) : (
        <>
          {/* Contribution Summary */}
          <section style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                color: "#2E403B",
                borderBottom: "2px solid #D4A017",
                paddingBottom: "0.5rem",
                marginBottom: "1.5rem",
                fontSize: "1.25rem",
              }}
            >
              🛠️ Contribution Summary
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              <StatCard
                title="Contributor Level"
                value={profile?.contributor_level ?? "—"}
                color="#2E403B"
              />
              <StatCard
                title="Total Contributions"
                value={profile?.total_contributions?.toLocaleString() ?? "—"}
                color="#059669"
              />
              <StatCard
                title="Active Proposals"
                value={profile?.active_governance_proposals?.toLocaleString() ?? "—"}
                color="#D4A017"
              />
              <StatCard
                title="Votes Cast"
                value={profile?.votes_cast?.toLocaleString() ?? "—"}
                color="#7C3AED"
              />
            </div>
          </section>

          {/* Governance Activity */}
          <section style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                color: "#2E403B",
                borderBottom: "2px solid #D4A017",
                paddingBottom: "0.5rem",
                marginBottom: "1.5rem",
                fontSize: "1.25rem",
              }}
            >
              🏛️ Governance Activity
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#6B7280",
                    marginBottom: "1rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Proposal Activity
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2E403B" }}
                    >
                      {profile?.proposals_created ?? "—"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Created</div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: "1.75rem", fontWeight: 700, color: "#059669" }}
                    >
                      {profile?.proposals_passed ?? "—"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>Passed</div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#6B7280",
                    marginBottom: "1rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Recent Activity
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{ fontSize: "1.75rem", fontWeight: 700, color: "#7C3AED" }}
                  >
                    {profile?.votes_cast ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                    Votes Cast
                  </div>
                </div>
                {profile?.last_contribution_date && (
                  <div
                    style={{
                      marginTop: "1rem",
                      fontSize: "0.75rem",
                      color: "#9CA3AF",
                      textAlign: "center",
                    }}
                  >
                    Last contribution:{" "}
                    {new Date(profile.last_contribution_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Minted Token History */}
          <section style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                color: "#2E403B",
                borderBottom: "2px solid #D4A017",
                paddingBottom: "0.5rem",
                marginBottom: "1.5rem",
                fontSize: "1.25rem",
              }}
            >
              🪙 Minted Token History
            </h2>
            {profile?.minted_token_history &&
            profile.minted_token_history.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {profile.minted_token_history.map((token, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "white",
                      padding: "1.5rem",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                      borderLeft: "4px solid #D4A017",
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
                      {token.token_id}
                    </div>
                    <div
                      style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2E403B" }}
                    >
                      {token.amount.toLocaleString()} CXD
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#9CA3AF",
                        marginTop: "0.5rem",
                      }}
                    >
                      Minted: {new Date(token.minted_at).toLocaleDateString()}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "#94A3B8",
                        fontFamily: "monospace",
                        marginTop: "0.25rem",
                        wordBreak: "break-all",
                      }}
                    >
                      TX: {token.tx_hash}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "white",
                  padding: "2rem",
                  borderRadius: "12px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  textAlign: "center",
                  color: "#6B7280",
                  fontSize: "0.9rem",
                  border: "1px dashed #D1D5DB",
                }}
              >
                No minted tokens yet. Tokens will appear here once contributions
                are recognized and converted.
              </div>
            )}
          </section>
        </>
      )}

      <footer
        style={{
          marginTop: "4rem",
          textAlign: "center",
          color: "#94A3B8",
          fontSize: "0.875rem",
        }}
      >
        Conxian Launch &middot; Self-Launch Coordinator &middot;{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}
