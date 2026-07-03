"use client";

import React, { useState, useEffect } from "react";
import {
  type ContributorLevel,
  type ContributorMetrics,
  type ContributorProfile,
  getContributorLevel,
} from "@/lib/launch";

const LEVELS: { level: ContributorLevel; icon: string; description: string }[] = [
  {
    level: "Newcomer",
    icon: "👁",
    description:
      "New to the Conxius ecosystem. Start contributing and participating in governance to advance.",
  },
  {
    level: "Contributor",
    icon: "🌱",
    description:
      "Made initial contributions. Continue building your presence in the community.",
  },
  {
    level: "Regular",
    icon: "🔨",
    description:
      "Consistent contributor with growing governance participation and voting record.",
  },
  {
    level: "Core",
    icon: "💎",
    description:
      "Core community member with strong contribution history and proposal engagement.",
  },
  {
    level: "Champion",
    icon: "🛡",
    description:
      "Champion-level contributor trusted with significant governance influence and proposal authorship.",
  },
  {
    level: "Steward",
    icon: "⭐",
    description:
      "Governance steward shaping the future of the Conxius ecosystem with the highest trust and authority.",
  },
];

const TIER_COLORS: Record<ContributorLevel, string> = {
  Newcomer: "#6B7280",
  Contributor: "#2563EB",
  Regular: "#7C3AED",
  Core: "#059669",
  Champion: "#D97706",
  Steward: "#D4A017",
};

const TIER_BG: Record<ContributorLevel, string> = {
  Newcomer: "#F9FAFB",
  Contributor: "#EFF6FF",
  Regular: "#F5F3FF",
  Core: "#ECFDF5",
  Champion: "#FFFBEB",
  Steward: "#FEFCE8",
};

interface RequirementRow {
  metric: keyof ContributorMetrics;
  label: string;
  thresholds: Partial<Record<ContributorLevel, number>>;
}

const REQUIREMENTS: RequirementRow[] = [
  {
    metric: "total_contributions",
    label: "Total Contributions",
    thresholds: { Contributor: 5, Regular: 20, Core: 50, Champion: 100, Steward: 200 },
  },
  {
    metric: "votes_cast",
    label: "Votes Cast",
    thresholds: { Core: 10, Champion: 25, Steward: 50 },
  },
  {
    metric: "proposals_passed",
    label: "Proposals Passed",
    thresholds: { Core: 1, Champion: 3, Steward: 5 },
  },
];

function TierCard({
  tier,
  currentLevel,
  metrics,
}: {
  tier: (typeof LEVELS)[0];
  currentLevel: ContributorLevel;
  metrics: ContributorMetrics;
}) {
  const levelIdx = LEVELS.findIndex((l) => l.level === tier.level);
  const currentIdx = LEVELS.findIndex((l) => l.level === currentLevel);
  const isCurrent = tier.level === currentLevel;
  const isLocked = levelIdx > currentIdx + 1;
  const isNext = levelIdx === currentIdx + 1;
  const color = TIER_COLORS[tier.level];

  return (
    <div
      style={{
        border: `2px solid ${isCurrent ? color : "#E5E7EB"}`,
        borderRadius: "12px",
        padding: "1.5rem",
        backgroundColor: isCurrent ? TIER_BG[tier.level] : isLocked ? "#FAFAFA" : "#FFFFFF",
        opacity: isLocked ? 0.55 : 1,
        transition: "box-shadow 0.2s, transform 0.2s",
        boxShadow: isCurrent ? "0 4px 24px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
        position: "relative",
      }}
    >
      {isCurrent && (
        <span
          style={{
            position: "absolute",
            top: "-10px",
            right: "16px",
            fontSize: "0.65rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "3px 10px",
            borderRadius: "9999px",
            backgroundColor: "#2E403B",
            color: "#FFFFFF",
          }}
        >
          Current
        </span>
      )}
      {isNext && (
        <span
          style={{
            position: "absolute",
            top: "-10px",
            right: "16px",
            fontSize: "0.65rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "3px 10px",
            borderRadius: "9999px",
            backgroundColor: "#D4A017",
            color: "#FFFFFF",
          }}
        >
          Next
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
        <span style={{ fontSize: "2rem", lineHeight: 1 }}>{tier.icon}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: isLocked ? "#9CA3AF" : color }}>
            {tier.level}
          </h3>
        </div>
      </div>

      <p style={{ fontSize: "0.85rem", color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
        {tier.description}
      </p>

      {!isLocked && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {REQUIREMENTS.map((req) => {
            const threshold = req.thresholds[tier.level];
            if (threshold === undefined && tier.level !== "Newcomer") return null;
            if (tier.level === "Newcomer") {
              return (
                <div key={req.label} style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                  ✓ {req.label}: No minimum required
                </div>
              );
            }
            const value = metrics[req.metric];
            const pct = Math.min(100, Math.round((value / threshold!) * 100));
            const met = value >= threshold!;
            return (
              <div key={req.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#4B5563" }}>{req.label}</span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: met ? "#059669" : "#9CA3AF",
                      fontWeight: met ? 600 : 400,
                    }}
                  >
                    {value}/{threshold}
                  </span>
                </div>
                <div style={{ height: "5px", backgroundColor: "#F1F5F9", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      height: "100%",
                      backgroundColor: met ? "#059669" : color,
                      borderRadius: "3px",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isLocked && (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#9CA3AF", fontSize: "0.85rem" }}>
          🔒 Advance through previous tiers to unlock
        </div>
      )}
    </div>
  );
}

function TierProgressionStrip({ currentLevel }: { currentLevel: ContributorLevel }) {
  const currentIdx = LEVELS.findIndex((l) => l.level === currentLevel);
  const progressPct = Math.round((currentIdx / (LEVELS.length - 1)) * 100);

  return (
    <div
      style={{
        marginBottom: "36px",
        padding: "24px 32px",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
      }}
    >
      <h2
        style={{ margin: "0 0 20px", fontSize: "1.15rem", fontWeight: 700, color: "#2E403B" }}
      >
        Your Progression Path
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        {LEVELS.map((lvl, idx) => {
          const isReached = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div
              key={lvl.level}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                flex: 1,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  fontSize: "1.1rem",
                  backgroundColor: isCurrent
                    ? TIER_COLORS[lvl.level]
                    : isReached
                      ? "#D1D5DB"
                      : "#F3F4F6",
                  border: isCurrent
                    ? `3px solid ${TIER_COLORS[lvl.level]}`
                    : "2px solid #E5E7EB",
                  opacity: isReached ? 1 : 0.4,
                }}
              >
                {lvl.icon}
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? TIER_COLORS[lvl.level] : isReached ? "#6B7280" : "#D1D5DB",
                }}
              >
                {lvl.level}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ height: "6px", backgroundColor: "#F1F5F9", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            width: `${progressPct}%`,
            height: "100%",
            background: "linear-gradient(90deg, #2E403B, #D4A017)",
            borderRadius: "3px",
            transition: "width 0.8s ease",
          }}
        />
      </div>

      <div style={{ marginTop: "8px", textAlign: "center", fontSize: "0.8rem", color: "#6B7280" }}>
        {currentLevel === "Steward"
          ? "🏆 You've reached the highest tier in Conxius governance."
          : `${currentIdx + 1} of ${LEVELS.length} tiers reached`}
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <div
      style={{
        marginTop: "48px",
        padding: "32px",
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
      }}
    >
      <h2
        style={{ margin: "0 0 24px", fontSize: "1.15rem", fontWeight: 700, color: "#2E403B" }}
      >
        How Tier Progression Works
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "24px",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1F2937",
              marginBottom: "6px",
            }}
          >
            🔢 Contributions
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.6 }}>
            Every code commit, documentation update, community support action, and protocol
            improvement counts as a contribution. Quality and consistency compound over time.
          </p>
        </div>
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1F2937",
              marginBottom: "6px",
            }}
          >
            🗳 Governance Voting
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.6 }}>
            Vote on governance proposals to earn voting weight. Your voting power increases
            with tier advancement, giving you more influence over protocol decisions.
          </p>
        </div>
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1F2937",
              marginBottom: "6px",
            }}
          >
            📜 Proposals
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.6 }}>
            Author and champion governance proposals. Passed proposals demonstrate your
            ability to drive consensus and shape the protocol's future.
          </p>
        </div>
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#1F2937",
              marginBottom: "6px",
            }}
          >
            ⬆ Advancing
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.6 }}>
            Tiers are evaluated continuously. Meet all thresholds for a tier and you
            automatically advance. Progress is transparent and verifiable on-chain.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TiersPage() {
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/launch/contributor?address=self");
      if (!res.ok) throw new Error(`Failed to fetch contributor profile: ${res.status}`);
      const d: ContributorProfile = await res.json();
      setProfile(d);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const metrics: ContributorMetrics = profile
    ? {
        total_contributions: profile.total_contributions,
        votes_cast: profile.votes_cast,
        proposals_passed: profile.proposals_passed,
      }
    : { total_contributions: 0, votes_cast: 0, proposals_passed: 0 };

  const currentLevel = profile
    ? getContributorLevel(metrics)
    : ("Newcomer" as ContributorLevel);

  if (loading && !profile) {
    return (
      <div style={{ padding: "4rem", color: "#2E403B", textAlign: "center", fontSize: "1.1rem" }}>
        Loading tier data...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <header
        style={{
          marginBottom: "2.5rem",
          borderLeft: "4px solid #D4A017",
          paddingLeft: "1.5rem",
        }}
      >
        <h1 style={{ color: "#0F172A", margin: 0, fontSize: "2rem", fontWeight: 800 }}>
          Governance Tier Progression
        </h1>
        <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "1.05rem" }}>
          Advance from Newcomer to Steward through contributions, governance participation, and
          proposal authorship.
        </p>
      </header>

      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FEE2E2",
            color: "#991B1B",
            borderRadius: "8px",
            marginBottom: "1.5rem",
          }}
        >
          Error loading profile: {error}
        </div>
      )}

      <TierProgressionStrip currentLevel={currentLevel} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "20px",
        }}
      >
        {LEVELS.map((tier) => (
          <TierCard
            key={tier.level}
            tier={tier}
            currentLevel={currentLevel}
            metrics={metrics}
          />
        ))}
      </div>

      <HowItWorks />
    </div>
  );
}
