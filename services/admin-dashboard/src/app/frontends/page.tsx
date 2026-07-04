"use client";

import React, { useState, useEffect } from "react";
import type { FrontendEntry } from "@/lib/sidl/types";

type FrontendRegistryResponse = {
  frontends: FrontendEntry[];
  updatedAtIso: string;
  summary: {
    total: number;
    canonical: number;
    communityHosted: number;
  };
};

const LABEL_STYLES: Record<string, { badge: string; color: string; bg: string }> = {
  canonical: {
    badge: "🏛 Canonical",
    color: "#2E403B",
    bg: "rgba(46, 64, 59, 0.08)",
  },
  "community-hosted": {
    badge: "🏘 Community-Hosted",
    color: "#D4A017",
    bg: "rgba(212, 160, 23, 0.08)",
  },
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#059669", bg: "rgba(5, 150, 105, 0.1)" },
  inactive: { label: "Inactive", color: "#9CA3AF", bg: "rgba(156, 163, 175, 0.1)" },
  "pending-governance-review": {
    label: "Pending Review",
    color: "#D97706",
    bg: "rgba(217, 119, 6, 0.1)",
  },
};

const TIER_ORDER: Record<string, number> = { community: 0, secondary: 1, primary: 2 };
const TIER_LABELS: Record<string, string> = {
  community: "Community",
  secondary: "Recognized",
  primary: "Canonical",
};
const TIER_COLORS: Record<string, string> = {
  community: "#D4A017",
  secondary: "#6366F1",
  primary: "#2E403B",
};

function TierIndicator({ currentTier }: { currentTier: string }) {
  const tiers = ["community", "secondary", "primary"];
  const currentIdx = TIER_ORDER[currentTier] ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
      {tiers.map((tier, idx) => (
        <React.Fragment key={tier}>
          {idx > 0 && (
            <div
              style={{
                width: "20px",
                height: "2px",
                backgroundColor: idx <= currentIdx ? TIER_COLORS[tier] : "#E5E7EB",
                transition: "background-color 0.3s",
              }}
            />
          )}
          <div
            title={TIER_LABELS[tier]}
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: idx <= currentIdx ? TIER_COLORS[tier] : "#E5E7EB",
              border: `2px solid ${idx <= currentIdx ? TIER_COLORS[tier] : "#D1D5DB"}`,
              transition: "all 0.3s",
            }}
          />
        </React.Fragment>
      ))}
      <span style={{ fontSize: "0.7rem", color: TIER_COLORS[currentTier], fontWeight: 600, marginLeft: "0.5rem" }}>
        {TIER_LABELS[currentTier]} Tier
      </span>
    </div>
  );
}

function FrontendCard({ entry }: { entry: FrontendEntry }) {
  const labelStyle = LABEL_STYLES[entry.label] ?? LABEL_STYLES["community-hosted"];
  const statusStyle = STATUS_STYLES[entry.status] ?? STATUS_STYLES.inactive;

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: `2px solid ${labelStyle.color}`,
        borderRadius: "12px",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        transition: "box-shadow 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Label badge + Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            padding: "0.3rem 0.8rem",
            borderRadius: "20px",
            backgroundColor: labelStyle.bg,
            color: labelStyle.color,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {labelStyle.badge}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            padding: "0.2rem 0.6rem",
            borderRadius: "12px",
            backgroundColor: statusStyle.bg,
            color: statusStyle.color,
            letterSpacing: "0.03em",
          }}
        >
          {statusStyle.label}
        </span>
      </div>

      {/* Name + URL */}
      <div>
        <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#1F2937" }}>
          {entry.name}
        </h3>
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.8rem",
            color: "#2E403B",
            textDecoration: "none",
            wordBreak: "break-all",
          }}
        >
          {entry.url}
        </a>
      </div>

      {/* Description */}
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.6 }}>
        {entry.description}
      </p>

      {/* Tier progression */}
      <div style={{ padding: "0.35rem 0", borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6" }}>
        <TierIndicator currentTier={entry.tier} />
      </div>

      {/* Operator + Recognition provenance */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          fontSize: "0.78rem",
          color: "#6B7280",
          borderTop: "1px solid #F3F4F6",
          paddingTop: "0.75rem",
        }}
      >
        <div>
          <span style={{ fontWeight: 600, color: "#4B5563" }}>Operator:</span>{" "}
          {entry.operatorName}
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "#4B5563" }}>Recognition:</span>{" "}
          {entry.recognizedBy}
        </div>
        <div>
          <span style={{ fontWeight: 600, color: "#4B5563" }}>Recognized:</span>{" "}
          {new Date(entry.recognizedAtIso).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
    </div>
  );
}

export default function FrontendsPage() {
  const [data, setData] = useState<FrontendRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFrontends = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/frontends");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FrontendRegistryResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load frontend registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFrontends();
  }, []);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h2
            style={{
              margin: "0 0 0.5rem",
              fontSize: "1.75rem",
              color: "#2E403B",
              fontWeight: 700,
            }}
          >
            Frontend Registry
          </h2>
          <p style={{ margin: 0, color: "#6B7280", fontSize: "0.95rem" }}>
            Canonical and community-hosted frontend surfaces recognized by governance
          </p>
        </div>
        <button
          onClick={fetchFrontends}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #D4A017",
            borderRadius: "8px",
            backgroundColor: "transparent",
            color: "#D4A017",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      {data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <SummaryCard label="Total Frontends" value={data.summary.total} color="#2E403B" />
          <SummaryCard label="Canonical" value={data.summary.canonical} color="#059669" />
          <SummaryCard label="Community-Hosted" value={data.summary.communityHosted} color="#D4A017" />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9CA3AF" }}>
          Loading frontend registry...
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            borderRadius: "8px",
            color: "#DC2626",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Frontend cards */}
      {data && data.frontends.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9CA3AF" }}>
          No frontends registered yet.
        </div>
      )}

      {data && data.frontends.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          {data.frontends.map((entry) => (
            <FrontendCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Label legend */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          padding: "1rem",
          backgroundColor: "#FFFFFF",
          borderRadius: "8px",
          border: "1px solid #E5E7EB",
          marginBottom: "2rem",
          fontSize: "0.82rem",
          color: "#6B7280",
        }}
      >
        <LegendItem emoji="🏛" label="Canonical" desc="Maintained by Conxian Labs under direct governance authority" />
        <LegendItem emoji="🏘" label="Community-Hosted" desc="Operated by governance-recognized community operators" />
      </div>

      {/* Decentralization Pathway */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", color: "#2E403B", fontWeight: 700 }}>
          Decentralization Pathway
        </h3>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.7 }}>
          Frontend surfaces follow a three-tier progression from community-operated to canonical recognition.
          Each step requires a governance proposal and operator approval.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
          {[
            {
              tier: "community",
              emoji: "🏘",
              title: "Community Tier",
              desc: "Community-proposed frontends awaiting governance ratification. Listed in the registry with pending-review status. Anyone can submit a proposal to host a frontend.",
              steps: ["Submit operator approval proposal", "Pass governance vote", "Receive community-tier recognition"],
            },
            {
              tier: "secondary",
              emoji: "🔷",
              title: "Recognized Tier",
              desc: "Governance-ratified community frontends with active operator status. Gain visibility in the registry and eligibility for official recognition badge.",
              steps: ["Maintain 6+ months active operation", "Pass security & compliance review", "Upgrade proposal ratified by governance"],
            },
            {
              tier: "primary",
              emoji: "🏛",
              title: "Canonical Tier",
              desc: "The highest recognition tier. Currently held by Conxian Labs-maintained surfaces. Designed to be transferable to community governance as the protocol decentralizes.",
              steps: ["Sustain recognized-tier operation", "Council super-majority approval", "Canonical ownership transfer governance"],
            },
          ].map((path) => (
            <div
              key={path.tier}
              style={{
                padding: "1.25rem",
                borderRadius: "10px",
                backgroundColor: path.tier === "primary" ? "rgba(46, 64, 59, 0.04)" : "rgba(249, 250, 251, 0.8)",
                border: `1px solid ${path.tier === "primary" ? "rgba(46, 64, 59, 0.15)" : "#F3F4F6"}`,
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{path.emoji}</div>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.95rem", color: "#1F2937", fontWeight: 700 }}>
                {path.title}
              </h4>
              <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#6B7280", lineHeight: 1.6 }}>
                {path.desc}
              </p>
              <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: "0.75rem" }}>
                {path.steps.map((step, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      marginBottom: "0.4rem",
                      fontSize: "0.78rem",
                      color: "#4B5563",
                    }}
                  >
                    <span style={{ color: TIER_COLORS[path.tier], fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Host a Frontend CTA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 1.5rem",
          backgroundColor: "rgba(46, 64, 59, 0.06)",
          border: "1px solid rgba(46, 64, 59, 0.12)",
          borderRadius: "12px",
          marginBottom: "2rem",
        }}
      >
        <div>
          <strong style={{ color: "#2E403B", fontSize: "0.95rem" }}>
            Want to host a frontend?
          </strong>
          <p style={{ margin: "0.25rem 0 0", color: "#6B7280", fontSize: "0.82rem" }}>
            Submit an operator approval proposal for the <code style={{ backgroundColor: "rgba(46,64,59,0.08)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>frontend-host</code> role to list your surface in the registry.
          </p>
        </div>
        <a
          href="/proposal-templates"
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: "#2E403B",
            color: "#FFFFFF",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          View Templates →
        </a>
      </div>

      {/* Governance disclaimer */}
      <div
        style={{
          padding: "1.25rem",
          backgroundColor: "rgba(212, 160, 23, 0.06)",
          border: "1px solid rgba(212, 160, 23, 0.15)",
          borderRadius: "8px",
          fontSize: "0.82rem",
          color: "#6B7280",
          lineHeight: 1.7,
        }}
      >
        <strong style={{ color: "#D4A017" }}>Governance Note:</strong>{" "}
        Frontend labeling follows the canonical recognition model defined by governance proposal
        templates ({`"`}Operator Approval → Frontend Host{`"`}). Canonical frontends are maintained by
        Conxian Labs. Community-hosted frontends are operated by governance-recognized operators and
        display an official recognition badge. As the protocol decentralizes, the canonical frontend
        registry is designed to transition from Labs-curated to community-governed ownership.
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        padding: "1rem 1.25rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "0.78rem", color: "#6B7280", marginTop: "0.25rem" }}>{label}</div>
    </div>
  );
}

function LegendItem({
  emoji,
  label,
  desc,
}: {
  emoji: string;
  label: string;
  desc: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ fontSize: "1.1rem" }}>{emoji}</span>
      <div>
        <strong style={{ color: "#374151" }}>{label}</strong>
        <span style={{ marginLeft: "0.5rem" }}>{desc}</span>
      </div>
    </div>
  );
}
