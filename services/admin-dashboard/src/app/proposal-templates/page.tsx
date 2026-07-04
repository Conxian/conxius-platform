"use client";

import React, { useState, useEffect } from "react";
import type {
  TreasuryFundingProposalTemplate,
  FundedRoleDefinition,
  ProposalTemplateSection,
  AllocationCategory,
} from "@/lib/governance/treasury";
import type {
  OperatorApprovalProposalTemplate,
  OperatorDefinition,
  OperatorType,
  ProposalTemplateSection as OpSection,
} from "@/lib/governance/operators";

type TemplateTab = "treasury" | "operator";

interface TreasuryTemplatesResponse {
  templates: TreasuryFundingProposalTemplate[];
  roleDefinitions: FundedRoleDefinition[];
  totalTemplates: number;
  categories: AllocationCategory[];
  lastUpdatedIso: string;
  template?: TreasuryFundingProposalTemplate;
  roleDefinition?: FundedRoleDefinition;
  error?: string;
}

interface OperatorTemplatesResponse {
  templates: OperatorApprovalProposalTemplate[];
  operatorDefinitions: OperatorDefinition[];
  totalTemplates: number;
  operatorTypes: OperatorType[];
  lastUpdatedIso: string;
  template?: OperatorApprovalProposalTemplate;
  operatorDefinition?: OperatorDefinition;
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
  const [data, setData] = useState<TreasuryTemplatesResponse | null>(null);
  const [opData, setOpData] = useState<OperatorTemplatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [operatorTypeFilter, setOperatorTypeFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TemplateTab>("treasury");
  const [formContent, setFormContent] = useState<Record<string, string>>({});

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "treasury") {
        const params = new URLSearchParams();
        if (categoryFilter) params.set("category", categoryFilter);
        const qs = params.toString();
        const res = await fetch(
          `/api/v1/governance/proposal-templates${qs ? `?${qs}` : ""}`,
        );
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        setData(await res.json());
      } else {
        const params = new URLSearchParams();
        if (operatorTypeFilter) params.set("operator_type", operatorTypeFilter);
        const qs = params.toString();
        const res = await fetch(
          `/api/v1/governance/operator-approval-templates${qs ? `?${qs}` : ""}`,
        );
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        setOpData(await res.json());
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async (id: string) => {
    try {
      if (activeTab === "treasury") {
        const res = await fetch(
          `/api/v1/governance/proposal-templates?template_id=${id}`,
        );
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const d = await res.json();
        setData(d);
        setSelectedId(id);
        setFormContent({});
      } else {
        const res = await fetch(
          `/api/v1/governance/operator-approval-templates?template_id=${id}`,
        );
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const d = await res.json();
        setOpData(d);
        setSelectedId(id);
        setFormContent({});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, operatorTypeFilter, activeTab]);

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

  const templates = activeTab === "treasury"
    ? (data?.templates ?? [])
    : (opData?.templates ?? []);
  const template = activeTab === "treasury" ? data?.template : opData?.template;
  const roleDef = data?.roleDefinition;
  const opDef = opData?.operatorDefinition;

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
            {activeTab === "treasury"
              ? `Treasury-funded community roles · ${data?.totalTemplates ?? 0} templates · Labs-Funded → Protocol-Funded`
              : `Operator approval & recognition · ${opData?.totalTemplates ?? 0} templates · Labs-Controlled → Community-Operated`}
          </p>
        </div>
      </header>

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem" }}>
        <button
          onClick={() => { setActiveTab("treasury"); setSelectedId(null); }}
          style={{
            padding: "0.6rem 1.5rem",
            backgroundColor: activeTab === "treasury" ? "#2E403B" : "#F1F5F9",
            color: activeTab === "treasury" ? "white" : "#475569",
            border: "none",
            borderRadius: "8px 0 0 8px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          💰 Treasury Funding
        </button>
        <button
          onClick={() => { setActiveTab("operator"); setSelectedId(null); }}
          style={{
            padding: "0.6rem 1.5rem",
            backgroundColor: activeTab === "operator" ? "#2E403B" : "#F1F5F9",
            color: activeTab === "operator" ? "white" : "#475569",
            border: "none",
            borderRadius: "0 8px 8px 0",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          🏛️ Operator Approval
        </button>
      </div>

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

      {/* Category / Type Filter */}
      {!selectedId && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {activeTab === "treasury" ? (
            <>
              <button
                onClick={() => setCategoryFilter("")}
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: "9999px",
                  border: "1px solid #E2E8F0",
                  backgroundColor: categoryFilter === "" ? "#2E403B" : "#F8FAFC",
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
            </>
          ) : (
            <>
              <button
                onClick={() => setOperatorTypeFilter("")}
                style={{
                  padding: "0.4rem 1rem",
                  borderRadius: "9999px",
                  border: "1px solid #E2E8F0",
                  backgroundColor: operatorTypeFilter === "" ? "#2E403B" : "#F8FAFC",
                  color: operatorTypeFilter === "" ? "white" : "#475569",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                All Operator Types
              </button>
              {(opData?.operatorTypes ?? []).map((ot) => (
                <button
                  key={ot}
                  onClick={() => setOperatorTypeFilter(ot)}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "9999px",
                    border: "1px solid #E2E8F0",
                    backgroundColor:
                      operatorTypeFilter === ot ? "#D4A017" : "#F8FAFC",
                    color: operatorTypeFilter === ot ? "white" : "#475569",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  {ot.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Template Detail View */}
      {selectedId && template && (roleDef || opDef) ? (
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
                  {activeTab === "treasury"
                    ? `Funding ${(template as TreasuryFundingProposalTemplate).roleName} · ${CADENCE_LABELS[(template as TreasuryFundingProposalTemplate).fundingCadence] ?? (template as TreasuryFundingProposalTemplate).fundingCadence}`
                    : `Operator: ${(template as OperatorApprovalProposalTemplate).operatorTypeName}`}
                </p>
              </div>
              {activeTab === "treasury" && (
              <span
                style={{
                  padding: "0.3rem 0.8rem",
                  backgroundColor:
                    CATEGORY_COLORS[(template as TreasuryFundingProposalTemplate).allocationCategory] + "18",
                  color: CATEGORY_COLORS[(template as TreasuryFundingProposalTemplate).allocationCategory],
                  borderRadius: "9999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  border: `1px solid ${CATEGORY_COLORS[(template as TreasuryFundingProposalTemplate).allocationCategory]}40`,
                }}
              >
                {CATEGORY_LABELS[(template as TreasuryFundingProposalTemplate).allocationCategory] ??
                  (template as TreasuryFundingProposalTemplate).allocationCategory}
              </span>
              )}
            </div>

            {activeTab === "treasury" && roleDef && (
            <>
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
            </>
            )}

            {activeTab === "operator" && opDef && (
            <>
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                marginBottom: "1rem",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                Approval: <strong>{opDef.approvalBody}</strong>
              </span>
              {opDef.requiresRenewal && (
                <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                  Renewal: <strong>Every {opDef.renewalIntervalMonths} months</strong>
                </span>
              )}
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                Min Level: <strong>{opDef.minContributorLevel}</strong>
              </span>
            </div>
            {/* Decentralization impact */}
            <div
              style={{
                backgroundColor: "#F0FDF4",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
                border: "1px solid #DCFCE7",
              }}
            >
              <h4 style={{ fontSize: "0.75rem", color: "#65A30D", textTransform: "uppercase", margin: "0 0 0.5rem 0" }}>
                Decentralization Impact
              </h4>
              <p style={{ fontSize: "0.8rem", color: "#166534", margin: 0, lineHeight: 1.5 }}>
                {(template as OperatorApprovalProposalTemplate).governanceContext.decentralizationImpact}
              </p>
            </div>
            </>
            )}

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
              {activeTab === "treasury" ? (
              <div>
                <strong>Submitter Badges:</strong>{" "}
                {(template as TreasuryFundingProposalTemplate).requiredSubmitterBadges.join(", ")}
              </div>
              ) : (
              <div>
                <strong>Proposer Badges:</strong>{" "}
                {(template as OperatorApprovalProposalTemplate).requiredProposerBadges.join(", ")}
              </div>
              )}
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
                treasuryTemplate={
                  activeTab === "treasury"
                    ? (template as TreasuryFundingProposalTemplate)
                    : undefined
                }
                opTemplate={
                  activeTab === "operator"
                    ? (template as OperatorApprovalProposalTemplate)
                    : undefined
                }
              />
            ))}
            {activeTab === "treasury" && (
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
              {CATEGORY_LABELS[(template as TreasuryFundingProposalTemplate).allocationCategory] ??
                (template as TreasuryFundingProposalTemplate).allocationCategory}{" "}
              template for {(template as TreasuryFundingProposalTemplate).roleName}. Submit to governance with{" "}
              {template.minVotesRequired} minimum votes required and the following
              submitter badges: {(template as TreasuryFundingProposalTemplate).requiredSubmitterBadges.join(", ")}.
              The proposal will be ratified by{" "}
              {template.governanceContext.ratificationBody}.
            </div>
            )}
            {activeTab === "operator" && (
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
              <strong>✅ Operator Proposal Ready for Governance Submission</strong>
              <br />
              This draft follows the{" "}
              {(template as OperatorApprovalProposalTemplate).operatorTypeName}{" "}
              operator approval template. Submit to governance with{" "}
              {template.minVotesRequired} minimum votes required and the following
              proposer badges: {(template as OperatorApprovalProposalTemplate).requiredProposerBadges.join(", ")}.
              The proposal will be ratified by{" "}
              {template.governanceContext.ratificationBody}.
            </div>
            )}
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
            if (activeTab === "treasury") {
              const treasuryTpl = tpl as TreasuryFundingProposalTemplate;
              const def = data?.roleDefinitions?.find(
                (d) => d.id === treasuryTpl.roleId,
              );
              return (
                <TemplateCard
                  key={treasuryTpl.id}
                  template={treasuryTpl}
                  roleDef={def}
                  onClick={() => fetchTemplate(treasuryTpl.id)}
                />
              );
            } else {
              const opTpl = tpl as OperatorApprovalProposalTemplate;
              const def = opData?.operatorDefinitions?.find(
                (d) => d.type === opTpl.operatorType,
              );
              return (
                <OperatorTemplateCard
                  key={opTpl.id}
                  template={opTpl}
                  opDef={def}
                  onClick={() => fetchTemplate(opTpl.id)}
                />
              );
            }
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
          {activeTab === "treasury" ? (
            <>
              <strong>From Labs-Funded to Protocol-Funded.</strong> These proposal
              templates enable the community to request treasury funding for
              protocol-critical work previously funded by Conxian-Labs. Each template
              aligns with a defined funded role, allocation category, and governance
              ratification process. Submitting a proposal is the first step toward
              community-owned protocol operations — governed by the SFO treasury
              direction and ratified through the governance council and community
              voting.
            </>
          ) : (
            <>
              <strong>From Labs-Controlled to Community-Operated.</strong> These operator
              approval templates enable the community to recognize and approve operators
              who run protocol infrastructure. Each template defines the governance
              requirements for recognizing a community member as an official operator —
              shifting operational control from default Conxian-Labs management to
              community-governed infrastructure. Approved operators are listed in the
              canonical operator registry and display governance-recognized status.
            </>
          )}
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
  treasuryTemplate,
  opTemplate,
}: {
  section: ProposalTemplateSection;
  value: string;
  onChange: (v: string) => void;
  treasuryTemplate?: TreasuryFundingProposalTemplate;
  opTemplate?: OperatorApprovalProposalTemplate;
}) {
  const minVotes = treasuryTemplate?.minVotesRequired ?? opTemplate?.minVotesRequired ?? 0;
  const badges = treasuryTemplate?.requiredSubmitterBadges ?? opTemplate?.requiredProposerBadges ?? [];
  const placeholder = section.placeholder
    .replace("{{minVotesRequired}}", String(minVotes))
    .replace("{{requiredBadges}}", badges.join(", "));

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

/* ── Operator Template Card ── */
function OperatorTemplateCard({
  template,
  opDef,
  onClick,
}: {
  template: OperatorApprovalProposalTemplate;
  opDef?: OperatorDefinition;
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
        e.currentTarget.style.borderColor = "#D4A017";
        e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
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
          <p style={{ fontSize: "0.75rem", color: "#64748B", marginTop: "0.2rem" }}>
            {template.operatorTypeName}
          </p>
        </div>
        <span
          style={{
            padding: "0.2rem 0.6rem",
            backgroundColor: "#D4A01715",
            color: "#D4A017",
            borderRadius: "9999px",
            fontSize: "0.65rem",
            fontWeight: 700,
          }}
        >
          🏛️ Operator
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "0.75rem",
          fontSize: "0.7rem",
          color: "#64748B",
        }}
      >
        <span>🗳 {template.minVotesRequired} votes</span>
        <span>📋 {template.governanceContext.ratificationBody}</span>
        {opDef?.requiresRenewal && (
          <span>🔄 {opDef.renewalIntervalMonths}mo renewal</span>
        )}
      </div>

      <p
        style={{
          fontSize: "0.7rem",
          color: "#94A3B8",
          lineHeight: 1.5,
          margin: "0 0 0.75rem 0",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {template.governanceContext.rationale}
      </p>

      {template.governanceContext.decentralizationImpact && (
        <p
          style={{
            fontSize: "0.65rem",
            color: "#65A30D",
            lineHeight: 1.4,
            margin: "0 0 0.5rem 0",
            backgroundColor: "#F0FDF4",
            padding: "0.5rem",
            borderRadius: "6px",
          }}
        >
          {template.governanceContext.decentralizationImpact.slice(0, 120)}
          {template.governanceContext.decentralizationImpact.length > 120 ? "…" : ""}
        </p>
      )}

      <div style={{ marginTop: "0.5rem" }}>
        {template.requiredProposerBadges.map((b) => (
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

