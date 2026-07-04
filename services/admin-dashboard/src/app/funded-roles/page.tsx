"use client";

import React, { useState, useEffect } from "react";
import type {
  FundedRoleAssignment,
  FundedRoleDefinition,
  TreasuryFundedRoleProfile,
} from "@/lib/governance/treasury";

interface FundedRolesResponse {
  profile: TreasuryFundedRoleProfile | null;
  definitions: FundedRoleDefinition[];
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

const TIER_COLORS: Record<string, string> = {
  probationary: "#F59E0B",
  active: "#059669",
  senior: "#7C3AED",
};

function formatSats(sats: number): string {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(1)}M sats`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}K sats`;
  return `${sats} sats`;
}

function FundedRoleCard({ assignment, definition }: { assignment: FundedRoleAssignment; definition: FundedRoleDefinition }) {
  const catColor = CATEGORY_COLORS[assignment.allocationCategory] ?? "#6B7280";
  const tierColor = TIER_COLORS[assignment.tier] ?? "#6B7280";
  const isFunded = assignment.monthlyFundingEstimateSats > 0;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        borderLeft: `4px solid ${catColor}`,
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        opacity: isFunded ? 1 : 0.7,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0F172A" }}>
            {assignment.roleName}
          </h3>
          <div style={{ fontSize: "0.8rem", color: "#94A3B8", marginTop: "0.25rem" }}>
            {CATEGORY_LABELS[assignment.allocationCategory] ?? assignment.allocationCategory}
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.2rem 0.6rem",
              backgroundColor: isFunded ? "#F0FDF4" : "#FEF2F2",
              color: isFunded ? "#166534" : "#991B1B",
              borderRadius: "9999px",
              fontSize: "0.7rem",
              fontWeight: 600,
            }}
          >
            {isFunded ? "Funded" : "Not Funded"}
          </span>
          <span
            style={{
              display: "inline-block",
              padding: "0.2rem 0.6rem",
              backgroundColor: `${tierColor}15`,
              color: tierColor,
              borderRadius: "9999px",
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          >
            {assignment.tier}
          </span>
        </div>
      </div>

      <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
        {definition.description}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {assignment.operationalUnits.map((unit) => (
          <span
            key={unit}
            style={{
              padding: "0.15rem 0.5rem",
              backgroundColor: "#F1F5F9",
              color: "#64748B",
              borderRadius: "9999px",
              fontSize: "0.7rem",
              fontWeight: 500,
            }}
          >
            {unit}
          </span>
        ))}
      </div>

      {isFunded && (
        <div
          style={{
            backgroundColor: "#F8FAFC",
            borderRadius: "8px",
            padding: "0.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", color: "#94A3B8", textTransform: "uppercase" }}>
              Monthly Allocation
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0F172A" }}>
              {formatSats(assignment.monthlyFundingEstimateSats)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.7rem", color: "#94A3B8", textTransform: "uppercase" }}>
              Cadence
            </div>
            <div style={{ fontSize: "0.85rem", color: "#475569", textTransform: "capitalize" }}>
              {assignment.fundingCadence}
            </div>
          </div>
        </div>
      )}

      {assignment.recognizedBy && (
        <div style={{ fontSize: "0.75rem", color: "#94A3B8", borderTop: "1px solid #F1F5F9", paddingTop: "0.5rem" }}>
          Recognized via{" "}
          <span style={{ fontFamily: "monospace", color: "#64748B" }}>{assignment.recognizedBy}</span>
        </div>
      )}

      <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>
        Eligibility: <span style={{ fontWeight: 600, color: assignment.eligibilityScore >= 70 ? "#059669" : "#D97706" }}>{assignment.eligibilityScore}%</span>
        {assignment.missingRequirements.length > 0 && (
          <ul style={{ margin: "0.25rem 0 0 0", padding: "0 0 0 1.2rem", color: "#DC2626" }}>
            {assignment.missingRequirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function FundedRolesPage() {
  const [data, setData] = useState<FundedRolesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/governance/funded-roles");
      if (!res.ok) throw new Error(`Failed to fetch funded roles: ${res.status}`);
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
        Loading Funded Roles...
      </div>
    );
  }

  const profile = data?.profile;
  const definitions = data?.definitions ?? [];
  const fundedRoles = profile?.assignedRoles.filter((r) => r.monthlyFundingEstimateSats > 0) ?? [];
  const unfundedRoles = profile?.assignedRoles.filter((r) => r.monthlyFundingEstimateSats === 0) ?? [];

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
          <h1 style={{ color: "#0F172A", margin: 0, fontSize: "2.25rem", fontWeight: 800 }}>
            Treasury-Funded Roles
          </h1>
          <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "1.1rem" }}>
            Governance-recognized, treasury-funded community roles &middot;{" "}
            {fundedRoles.length} funded / {definitions.length} defined
          </p>
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

      {/* Allocation Summary */}
      {profile && profile.totalMonthlyAllocationSats > 0 && (
        <section
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#0F172A" }}>
            Allocation Summary — {profile.stewardName}
          </h2>
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.7rem", color: "#94A3B8", textTransform: "uppercase" }}>
                Total Monthly
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2E403B" }}>
                {formatSats(profile.totalMonthlyAllocationSats)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "300px" }}>
              <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "0.5rem" }}>
                {Object.entries(profile.allocationBreakdown)
                  .filter(([, amount]) => amount > 0)
                  .map(([cat, amount]) => {
                    const pct = profile.totalMonthlyAllocationSats > 0
                      ? (amount / profile.totalMonthlyAllocationSats) * 100
                      : 0;
                    return (
                      <div
                        key={cat}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[cat] ?? "#6B7280",
                          minWidth: "4px",
                        }}
                        title={`${CATEGORY_LABELS[cat] ?? cat}: ${formatSats(amount)}`}
                      />
                    );
                  })}
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "#64748B" }}>
                {Object.entries(profile.allocationBreakdown)
                  .filter(([, amount]) => amount > 0)
                  .map(([cat, amount]) => (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "2px",
                          backgroundColor: CATEGORY_COLORS[cat] ?? "#6B7280",
                        }}
                      />
                      {CATEGORY_LABELS[cat] ?? cat}: {formatSats(amount)}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category legend */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#64748B" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "3px",
                backgroundColor: CATEGORY_COLORS[cat] ?? "#6B7280",
              }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* Funded Roles */}
      {fundedRoles.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0F172A", marginBottom: "1rem" }}>
            Funded Roles
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            {fundedRoles.map((assignment) => {
              const def = definitions.find((d) => d.id === assignment.roleId);
              return def ? (
                <FundedRoleCard key={assignment.roleId} assignment={assignment} definition={def} />
              ) : null;
            })}
          </div>
        </>
      )}

      {/* Unfunded / Ineligible Roles */}
      {unfundedRoles.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#94A3B8", marginBottom: "1rem" }}>
            Not Yet Funded
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
            {unfundedRoles.map((assignment) => {
              const def = definitions.find((d) => d.id === assignment.roleId);
              return def ? (
                <FundedRoleCard key={assignment.roleId} assignment={assignment} definition={def} />
              ) : null;
            })}
          </div>
        </>
      )}

      {/* History Link */}
      {fundedRoles.length > 0 && (
        <section
          style={{
            marginTop: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a
              href="/proposal-templates"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#D4A017",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              📋 Submit Funding Proposal
            </a>
            <a
              href="/funded-roles/history"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#2E403B",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              📊 View Payout &amp; Activity History
            </a>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#94A3B8", marginTop: "0.5rem" }}>
            See how treasury funds have been disbursed and what funded stewards have been working on
          </p>
        </section>
      )}

      {/* Governance note */}
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
          <strong>Governance-controlled funding.</strong>{" "}
          Treasury-funded roles are recognized through governance proposals and their funding is allocated
          from protocol revenue via the Sovereign Financial Office (SFO). Each role maps to a specific
          treasury allocation category and operational unit. New roles are proposed, voted on, and funded
          through the governance process — never through centralized assignment.
        </div>
      </section>

      <footer style={{ marginTop: "4rem", textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>
        Conxian Treasury-Funded Roles &middot; Governance-Recognized &middot; SFO-Managed &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
