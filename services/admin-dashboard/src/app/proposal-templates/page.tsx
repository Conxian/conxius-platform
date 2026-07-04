"use client";

import React, { useState, useEffect } from "react";
import type {
  TreasuryFundingProposalTemplate,
  FundedRoleDefinition,
  ProposalTemplateSection,
  AllocationCategory,
} from "@/lib/governance/treasury";

interface ProposalTemplatesResponse {
  templates: TreasuryFundingProposalTemplate[];
  roleDefinitions: FundedRoleDefinition[];
  totalTemplates: number;
  categories: AllocationCategory[];
  lastUpdatedIso: string;
  template?: TreasuryFundingProposalTemplate;
  roleDefinition?: FundedRoleDefinition;
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
  "governance-rewards": "#2563EB",
  "operational-rewards": "#059669",
  "treasury-reserve": "#D4A017",
};

const CADENCE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "per-milestone": "Per Milestone",
};

function formatSats(sats: number): string {
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(1)}M sats`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(1)}K sats`;
  return `${sats} sats`;
}

export default function ProposalTemplatesPage() {
  const [data, setData] = useState<ProposalTemplatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [formContent, setFormContent] = useState<Record<string, string>>({});

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      const qs = params.toString();
      const res = await fetch(
        `/api/v1/governance/proposal-templates${qs ? `?${qs}` : ""}`,
      );
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async (id: string) => {
    try {
      const res = await fetch(
        `/api/v1/governance/proposal-templates?template_id=${id}`,
      );
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const d = await res.json();
      setData(d);
      setSelectedId(id);
      setFormContent({});
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter]);

  if (loading && !data) {
    return (
      <div
        style={{
          padding: "4rem",
          textAlign: "center",
          color: "#2E403B",
          fontSize: "1.1rem",
        }}
      >
        Loading Proposal Templates...
      </div>
    );
  }

  const templates = data?.templates ?? [];
  const template = data?.template;
  const roleDef = data?.roleDefinition;

  const handleFormChange = (sectionId: string, value: string) => {
    setFormContent((prev) => ({ ...prev, [sectionId]: value }));
  };

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
      {/* Header */}
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
          <h1
            style={{
              color: "#0F172A",
              margin: 0,
              fontSize: "2.25rem",
              fontWeight: 800,
            }}
          >
            Governance Proposal Templates
          </h1>
          <p
            style={{
              color: "#64748B",
              marginTop: "0.5rem",
              fontSize: "1.1rem",
            }}
          >
            Treasury-funded community roles &middot;{" "}
            {data?.totalTemplates ?? 0} templates &middot;{" "}
            Labs-Funded → Protocol-Funded
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
            ← Funded Roles
          </a>
          <button
            onClick={() => {
              setSelectedId(null);
              setData(null);
              fetchTemplates();
            }}
            style={{
              padding: "0.6rem 1.2rem",
              backgroundColor: "#2E403B",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            All Templates
          </button>
        </div>
      </header>

      {/* Error */}
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

      {/* Category Filter */}
      {!selectedId && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setCategoryFilter("")}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "9999px",
              border: "1px solid #E2E8F0",
              backgroundColor:
                categoryFilter === "" ? "#2E403B" : "#F8FAFC",
              color: categoryFilter === "" ? "white" : "#475569",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            All Categories
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "9999px",
                border: `1px solid ${CATEGORY_COLORS[key] ?? "#E2E8F0"}`,
                backgroundColor:
                  categoryFilter === key
                    ? CATEGORY_COLORS[key] ?? "#E2E8F0"
                    : "#F8FAFC",
                color: categoryFilter === key ? "white" : "#475569",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Template Detail View */}
      {selectedId && template && roleDef ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Template Header Card */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              padding: "1.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "#0F172A",
                    margin: 0,
                  }}
                >
                  {template.title}
                </h2>
                <p
                  style={{
                    color: "#64748B",
                    marginTop: "0.25rem",
                    fontSize: "0.9rem",
                  }}
                >
                  Funding {template.roleName} &middot;{" "}
                  {CADENCE_LABELS[template.fundingCadence] ?? template.fundingCadence}
                </p>
              </div>
              <span
                style={{
                  padding: "0.3rem 0.8rem",
                  backgroundColor:
                    CATEGORY_COLORS[template.allocationCategory] + "18",
                  color: CATEGORY_COLORS[template.allocationCategory],
                  borderRadius: "9999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  border: `1px solid ${CATEGORY_COLORS[template.allocationCategory]}40`,
                }}
              >
                {CATEGORY_LABELS[template.allocationCategory] ??
                  template.allocationCategory}
              </span>
            </div>

            {/* Role funding range */}
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  backgroundColor: "#FEF3C7",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#92400E",
                  fontWeight: 600,
                }}
              >
                Probationary: {formatSats(roleDef.fundingRangeSats.probationary)}
              </div>
              <div
                style={{
                  backgroundColor: "#D1FAE5",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#065F46",
                  fontWeight: 600,
                }}
              >
                Active: {formatSats(roleDef.fundingRangeSats.active)}
              </div>
              <div
                style={{
                  backgroundColor: "#DBEAFE",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  color: "#1E40AF",
                  fontWeight: 600,
                }}
              >
                Senior: {formatSats(roleDef.fundingRangeSats.senior)}
              </div>
            </div>

            {/* Governance requirements */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                fontSize: "0.8rem",
                color: "#475569",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong>Min Votes:</strong> {template.minVotesRequired}
              </div>
              <div>
                <strong>Submitter Badges:</strong>{" "}
                {template.requiredSubmitterBadges.join(", ")}
              </div>
              <div>
                <strong>Ratification:</strong>{" "}
                {template.governanceContext.ratificationBody}
              </div>
            </div>
          </div>

          {/* Governance Context */}
          <div
            style={{
              backgroundColor: "#FFFBEB",
              borderRadius: "12px",
              border: "1px solid #FDE68A",
              padding: "1.25rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#92400E",
                margin: "0 0 0.5rem 0",
              }}
            >
              📋 Governance Context
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#78350F", lineHeight: 1.6, margin: 0 }}>
              {template.governanceContext.rationale}
            </p>
            <div style={{ marginTop: "0.75rem" }}>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#92400E",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Post-Approval Steps:
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: "1.25rem",
                  fontSize: "0.75rem",
                  color: "#78350F",
                }}
              >
                {template.governanceContext.postApprovalSteps.map(
                  (step, i) => (
                    <li key={i} style={{ marginBottom: "0.15rem" }}>
                      {step}
                    </li>
                  ),
                )}
              </ol>
            </div>
          </div>

          {/* Proposal Template Form */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              padding: "1.5rem",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: "#0F172A",
                margin: "0 0 1.25rem 0",
              }}
            >
              📝 Fill Out Proposal
            </h3>
            {template.sections.map((section) => (
              <SectionFormField
                key={section.id}
                section={section}
                value={formContent[section.id] ?? ""}
                onChange={(v) => handleFormChange(section.id, v)}
                template={template}
              />
            ))}
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                backgroundColor: "#F0FDF4",
                borderRadius: "8px",
                border: "1px solid #BBF7D0",
                fontSize: "0.8rem",
                color: "#166534",
              }}
            >
              <strong>✅ Proposal Ready for Governance Submission</strong>
              <br />
              This draft follows the{" "}
              {CATEGORY_LABELS[template.allocationCategory] ??
                template.allocationCategory}{" "}
              template for {template.roleName}. Submit to governance with{" "}
              {template.minVotesRequired} minimum votes required and the following
              submitter badges: {template.requiredSubmitterBadges.join(", ")}.
              The proposal will be ratified by{" "}
              {template.governanceContext.ratificationBody}.
            </div>
          </div>
        </div>
      ) : (
        /* Template Gallery */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {templates.map((tpl) => {
            const def = data?.roleDefinitions.find(
              (d) => d.id === tpl.roleId,
            );
            return (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                roleDef={def}
                onClick={() => fetchTemplate(tpl.id)}
              />
            );
          })}
        </div>
      )}

      {templates.length === 0 && !error && (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "#94A3B8",
            backgroundColor: "white",
            borderRadius: "12px",
          }}
        >
          No proposal templates match the selected category filter.
        </div>
      )}

      {/* Shift Note */}
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
          <strong>From Labs-Funded to Protocol-Funded.</strong> These proposal
          templates enable the community to request treasury funding for
          protocol-critical work previously funded by Conxian-Labs. Each template
          aligns with a defined funded role, allocation category, and governance
          ratification process. Submitting a proposal is the first step toward
          community-owned protocol operations — governed by the SFO treasury
          direction and ratified through the governance council and community
          voting.
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
        Conxian Governance Proposal Templates &middot; Treasury-Funded Community
        Roles &middot; Labs-Funded → Protocol-Funded &middot;{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/* ── Template Card ── */
function TemplateCard({
  template,
  roleDef,
  onClick,
}: {
  template: TreasuryFundingProposalTemplate;
  roleDef?: FundedRoleDefinition;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        padding: "1.25rem",
        cursor: "pointer",
        border: "2px solid transparent",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor =
          CATEGORY_COLORS[template.allocationCategory] ?? "#E2E8F0";
        e.currentTarget.style.boxShadow =
          "0 8px 16px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.boxShadow =
          "0 4px 6px rgba(0,0,0,0.05)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              color: "#0F172A",
              margin: 0,
            }}
          >
            {template.title}
          </h3>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#64748B",
              marginTop: "0.2rem",
            }}
          >
            {template.roleName}
          </p>
        </div>
        <span
          style={{
            padding: "0.2rem 0.6rem",
            backgroundColor:
              CATEGORY_COLORS[template.allocationCategory] + "15",
            color: CATEGORY_COLORS[template.allocationCategory],
            borderRadius: "9999px",
            fontSize: "0.65rem",
            fontWeight: 700,
          }}
        >
          {CATEGORY_LABELS[template.allocationCategory] ??
            template.allocationCategory}
        </span>
      </div>

      {/* Cadence & Votes */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "0.75rem",
          fontSize: "0.7rem",
          color: "#64748B",
        }}
      >
        <span>
          ⏱ {CADENCE_LABELS[template.fundingCadence] ?? template.fundingCadence}
        </span>
        <span>🗳 {template.minVotesRequired} votes</span>
      </div>

      {/* Funding range if def available */}
      {roleDef && (
        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
            marginBottom: "0.75rem",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              backgroundColor: "#FEF3C7",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              color: "#92400E",
            }}
          >
            {formatSats(roleDef.fundingRangeSats.probationary)}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              backgroundColor: "#D1FAE5",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              color: "#065F46",
            }}
          >
            {formatSats(roleDef.fundingRangeSats.active)}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              backgroundColor: "#DBEAFE",
              padding: "0.15rem 0.5rem",
              borderRadius: "4px",
              color: "#1E40AF",
            }}
          >
            {formatSats(roleDef.fundingRangeSats.senior)}
          </span>
        </div>
      )}

      {/* Rationale preview */}
      <p
        style={{
          fontSize: "0.7rem",
          color: "#94A3B8",
          lineHeight: 1.5,
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {template.governanceContext.rationale}
      </p>

      {/* Badges */}
      <div style={{ marginTop: "0.75rem" }}>
        {template.requiredSubmitterBadges.map((b) => (
          <span
            key={b}
            style={{
              display: "inline-block",
              padding: "0.1rem 0.4rem",
              backgroundColor: "#F1F5F9",
              borderRadius: "9999px",
              fontSize: "0.6rem",
              marginRight: "0.25rem",
              color: "#475569",
            }}
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Section Form Field ── */
function SectionFormField({
  section,
  value,
  onChange,
  template,
}: {
  section: ProposalTemplateSection;
  value: string;
  onChange: (v: string) => void;
  template: TreasuryFundingProposalTemplate;
}) {
  const placeholder = section.placeholder
    .replace("{{minVotesRequired}}", String(template.minVotesRequired))
    .replace("{{requiredBadges}}", template.requiredSubmitterBadges.join(", "));

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#0F172A",
          marginBottom: "0.35rem",
        }}
      >
        {section.heading}
        {section.required && (
          <span style={{ color: "#EF4444", fontSize: "0.7rem" }}>*</span>
        )}
      </label>
      <p
        style={{
          fontSize: "0.7rem",
          color: "#94A3B8",
          margin: "0 0 0.4rem 0",
        }}
      >
        {section.description}
      </p>
      {section.expectsAmount ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Amount in sats"
            style={{
              flex: 1,
              padding: "0.5rem",
              border: "1px solid #E2E8F0",
              borderRadius: "6px",
              fontSize: "0.8rem",
              backgroundColor: "#F8FAFC",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: "#94A3B8" }}>sats</span>
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: "1px solid #E2E8F0",
            borderRadius: "6px",
            fontSize: "0.8rem",
            backgroundColor: "#F8FAFC",
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}
