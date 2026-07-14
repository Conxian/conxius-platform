"use client";

import React, { useState, useEffect } from "react";
import type {
  ClaimLedgerEntry,
  ClaimLedgerEvent,
  ContributionCategory,
  ImpactMultiplierBps,
  QualityMultiplierBps,
  ClaimStatus,
  RevocationReason,
  ArtifactRef,
  ClaimEvidence,
  ActivationGates,
} from "@/lib/governance/claims";

const CATEGORY_COLORS: Record<ContributionCategory, string> = {
  CORE_PROTOCOL_CODE: "#2563EB",
  SECURITY_HARDENING: "#DC2626",
  RELIABILITY_OPS: "#059669",
  PRODUCT_DOCS_RESEARCH: "#7C3AED",
  COMMUNITY_ENABLEMENT: "#D97706",
};

const STATUS_COLORS: Record<ClaimStatus, { bg: string; text: string }> = {
  proposed: { bg: "#FEF3C7", text: "#D97706" },
  verified: { bg: "#EFF6FF", text: "#2563EB" },
  approved: { bg: "#EEF2F6", text: "#4B5563" },
  recognized: { bg: "#ECFDF5", text: "#059669" },
  convertible: { bg: "#FEF3C7", text: "#92400E" },
  converted: { bg: "#F5F3FF", text: "#7C3AED" },
  settled: { bg: "#ECFDF5", text: "#047857" },
  disputed: { bg: "#FEE2E2", text: "#B91C1C" },
  revoked: { bg: "#E5E7EB", text: "#374151" },
};

export default function ClaimsPage() {
  const [entries, setEntries] = useState<ClaimLedgerEntry[]>([]);
  const [events, setEvents] = useState<ClaimLedgerEvent[]>([]);
  const [gates, setGates] = useState<ActivationGates | null>(null);
  const [allGatesPassed, setAllGatesPassed] = useState(false);
  const [adminApiKey, setAdminApiKey] = useState("");
  const [, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Claim Form State
  const [contributorId, setContributorId] = useState("");
  const [category, setCategory] = useState<ContributionCategory>("CORE_PROTOCOL_CODE");
  const [impactMultiplier, setImpactMultiplier] = useState<number>(100);
  const [qualityMultiplier, setQualityMultiplier] = useState<number>(100);
  const [artifactSystem] = useState("GitHub");
  const [artifactId, setArtifactId] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [evidenceType] = useState<any>("pull_request");
  const [evidenceUri, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showProposeModal, setShowProposeModal] = useState(false);

  // Conversion Pool Form State
  const [poolSize, setPoolSize] = useState(5000000); // default 5M sats
  const [snapshotHeight, setSnapshotHeight] = useState(840000);
  const [devOverride, setDevOverride] = useState(false);

  // Conversion Result State
  const [conversionResult, setConversionResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (adminApiKey) {
        headers["X-Admin-API-Key"] = adminApiKey;
      } else {
        // Attempt with empty to see if auth is bypassed (or fetch public read-only)
        headers["X-Admin-API-Key"] = "demokey"; // fallback or prompt
      }

      // Fetch entries
      const res = await fetch("/api/v1/governance/claims", { headers });
      if (res.status === 401) {
        setError("Admin Authorization API Key is required to load the Claims Ledger. Please enter it below.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setEvents(data.events || []);

      // Fetch gates
      const gatesRes = await fetch("/api/v1/governance/claims/activation-status", { headers });
      if (gatesRes.ok) {
        const gatesData = await gatesRes.json();
        setGates(gatesData.gates);
        setAllGatesPassed(gatesData.allGatesPassed);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load claims ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [adminApiKey]);

  const handleProposeClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminApiKey) {
      alert("Please enter the Admin API Key to authorize this request.");
      return;
    }

    try {
      const payload = {
        contributorId,
        artifactRef: {
          system: artifactSystem,
          id: artifactId,
          url: artifactUrl || `https://github.com/Conxian/Conxian/issues/${artifactId}`,
        },
        category,
        impactMultiplierBps: impactMultiplier,
        qualityMultiplierBps: qualityMultiplier,
        evidence: [
          {
            type: evidenceType,
            uri: evidenceUri || `https://github.com/Conxian/Conxian/pull/${artifactId}`,
            capturedAt: new Date().toISOString(),
          },
        ],
        notes,
        proposedBy: "admin-system",
      };

      const res = await fetch("/api/v1/governance/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": adminApiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to propose claim");
      }

      alert("Claim successfully proposed!");
      setShowProposeModal(false);
      setContributorId("");
      setArtifactId("");
      setArtifactUrl("");
      setEvidenceUrl("");
      setNotes("");
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleTransition = async (entryId: string, newStatus: ClaimStatus, options?: { revocationReason?: RevocationReason }) => {
    if (!adminApiKey) {
      alert("Please enter the Admin API Key to authorize this request.");
      return;
    }

    try {
      const res = await fetch("/api/v1/governance/claims/transition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": adminApiKey,
        },
        body: JSON.stringify({
          entryId,
          action: "transition",
          newStatus,
          actorId: "steward-admin",
          ...options,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to transition claim");
      }

      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDispute = async (entryId: string) => {
    const rationale = prompt("Please provide a rationale for this dispute:");
    if (!rationale) return;

    if (!adminApiKey) {
      alert("Please enter the Admin API Key to authorize this request.");
      return;
    }

    try {
      const res = await fetch("/api/v1/governance/claims/transition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": adminApiKey,
        },
        body: JSON.stringify({
          entryId,
          action: "dispute",
          rationale,
          actorId: "steward-challenger",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispute claim");
      }

      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleGlobalConversion = async () => {
    if (!adminApiKey) {
      alert("Please enter the Admin API Key to authorize this request.");
      return;
    }

    try {
      const res = await fetch("/api/v1/governance/claims/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": adminApiKey,
        },
        body: JSON.stringify({
          poolSize,
          snapshotHeight,
          actorId: "steward-council",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to run global snapshot conversion");
      }

      setConversionResult(data);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDevOverride = () => {
    setDevOverride(!devOverride);
    if (!devOverride) {
      // Simulate successful gates locally for demo purposes
      setAllGatesPassed(true);
      if (gates) {
        setGates({
          mainnetStability60Days: true,
          auditedPayoutPathActive: true,
          treasuryRunway6Months: true,
          governanceRatified: true,
        });
      }
    } else {
      fetchData();
    }
  };

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Page Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2 style={{ color: "#2E403B", margin: 0, fontSize: "2rem", fontWeight: 800 }}>Contributor Claim Ledger</h2>
          <p style={{ margin: "0.25rem 0 0", color: "#64748B", fontSize: "1.05rem" }}>
            Pre-activation non-binding Recognition Ledger aligned with OpenSpec CON-483 policy
          </p>
        </div>
        <button
          onClick={() => setShowProposeModal(true)}
          style={{
            padding: "0.6rem 1.2rem",
            backgroundColor: "#2E403B",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          Propose Contribution Claim +
        </button>
      </div>

      {/* Admin Authorization Panel */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div>
          <strong style={{ color: "#0F172A", fontSize: "1rem" }}>🔐 Administrator Credentials</strong>
          <p style={{ margin: "0.25rem 0 0", color: "#64748B", fontSize: "0.85rem" }}>
            Enter your ADMIN_DASHBOARD_API_KEY to load the full ledger and perform state transitions.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="password"
            placeholder="Admin Dashboard API Key"
            value={adminApiKey}
            onChange={(e) => setAdminApiKey(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid #CBD5E1",
              fontSize: "0.85rem",
              width: "260px",
            }}
          />
          <button
            onClick={fetchData}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#2E403B",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Authenticate
          </button>
        </div>
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
            fontWeight: "500",
          }}
        >
          {error}
        </div>
      )}

      {/* Main Grid: Activation Gates + Summary Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", marginBottom: "2rem" }}>

        {/* Fail-Closed Activation Gates */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ color: "#2E403B", margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                🛡️ Activation Gates (Fail-Closed)
              </h3>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  backgroundColor: allGatesPassed ? "#D1FAE5" : "#FEE2E2",
                  color: allGatesPassed ? "#065F46" : "#991B1B",
                }}
              >
                {allGatesPassed ? "UNLOCKED" : "LOCKED"}
              </span>
            </div>

            <p style={{ fontSize: "0.8rem", color: "#64748B", margin: "0 0 1rem", lineHeight: 1.5 }}>
              All 4 security gates must pass to activate post-snapshot monetary conversion. Pre-activation CUs represent non-monetary recognition-only units.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Mainnet Stability (60d)", passed: gates?.mainnetStability60Days },
                { label: "Audited Payout Path (Active)", passed: gates?.auditedPayoutPathActive },
                { label: "Treasury Runway (6mo)", passed: gates?.treasuryRunway6Months },
                { label: "Governance Ratified", passed: gates?.governanceRatified },
              ].map((gate, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "#F8FAFC",
                    borderLeft: `3px solid ${gate.passed ? "#059669" : "#DC2626"}`,
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "#334155", fontWeight: "500" }}>{gate.label}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: gate.passed ? "#059669" : "#DC2626" }}>
                    {gate.passed ? "✓ Passed" : "❌ Blocked"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "1rem", marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748B" }}>Local Developer Mock Override</span>
              <button
                onClick={handleDevOverride}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.75rem",
                  backgroundColor: devOverride ? "#D4A017" : "#64748B",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {devOverride ? "ON (Override)" : "OFF"}
              </button>
            </div>
          </div>
        </div>

        {/* Global Snapshot Conversion & Math Panel */}
        <div
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ color: "#2E403B", margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 700 }}>
            💰 Snapshot Conversion Calculator
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#64748B", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
            Compute global conversion rate: <code style={{ backgroundColor: "#F1F5F9", padding: "0.1rem 0.3rem" }}>Rate = Pool (P) / Total Recognized CU</code>. Allocate funds to contributors with high precision based on snapshot freeze.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Ratified Pool Size (P sats)</label>
              <input
                type="number"
                value={poolSize}
                onChange={(e) => setPoolSize(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.85rem",
                  marginTop: "0.25rem",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Snapshot Height (H_activate)</label>
              <input
                type="number"
                value={snapshotHeight}
                onChange={(e) => setSnapshotHeight(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.85rem",
                  marginTop: "0.25rem",
                }}
              />
            </div>
          </div>

          <button
            onClick={handleGlobalConversion}
            disabled={!allGatesPassed}
            style={{
              width: "100%",
              padding: "0.6rem",
              backgroundColor: allGatesPassed ? "#D4A017" : "#CBD5E1",
              color: allGatesPassed ? "#000" : "#64748B",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: allGatesPassed ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            {allGatesPassed ? "🚀 Execute Global Snapshot Conversion" : "🔒 Satisfy Activation Gates to Convert"}
          </button>

          {conversionResult && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: "#F0FDF4",
                border: "1px solid #DCFCE7",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ color: "#166534", margin: "0 0 0.5rem", fontSize: "0.9rem", fontWeight: "bold" }}>
                ✓ Snapshot Conversion Successful
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", color: "#14532D" }}>
                <div>Total Snapshot CU: <strong>{conversionResult.totalEligibleCu} CU</strong></div>
                <div>Global Conversion Rate: <strong>{conversionResult.conversionRate.toFixed(2)} sats/CU</strong></div>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", borderTop: "1px solid #DCFCE7", paddingTop: "0.5rem" }}>
                <strong>Contributor Allocations:</strong>
                <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.25rem" }}>
                  {Object.entries(conversionResult.contributorAllocations).map(([address, amount]: any) => (
                    <li key={address}>
                      <span style={{ fontFamily: "monospace" }}>{address}</span>: <strong>{amount.toLocaleString()} sats</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ledger Entries List */}
      <section style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "2rem" }}>
        <h3 style={{ color: "#2E403B", margin: "0 0 1.25rem", fontSize: "1.2rem", fontWeight: 700 }}>
          📝 Active Claims Ledger ({entries.length} entries)
        </h3>

        {entries.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94A3B8" }}>
            No claims registered yet. Use the API or form above to propose a claim.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E2E8F0", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem", color: "#475569" }}>Claim / Contributor</th>
                  <th style={{ padding: "0.75rem", color: "#475569" }}>Artifact</th>
                  <th style={{ padding: "0.75rem", color: "#475569" }}>Category</th>
                  <th style={{ padding: "0.75rem", color: "#475569" }}>Scoring (CU)</th>
                  <th style={{ padding: "0.75rem", color: "#475569" }}>Monthly Capping</th>
                  <th style={{ padding: "0.75rem", color: "#475569" }}>Status</th>
                  <th style={{ padding: "0.75rem", color: "#475569" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const statusColors = STATUS_COLORS[entry.status] || { bg: "#EEF2F6", text: "#4B5563" };
                  const awardedCu = entry.awardedCuHundredths / 100;
                  const recognizedCu = entry.recognizedCuHundredths / 100;
                  const deferredCu = entry.deferredCuHundredths / 100;

                  return (
                    <tr key={entry.entryId} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ fontWeight: "bold", color: "#0F172A" }}>{entry.entryId.slice(0, 10)}...</div>
                        <div style={{ fontFamily: "monospace", color: "#64748B", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                          {entry.contributorId}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <a
                          href={entry.artifactRef.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#2E403B", textDecoration: "none", fontWeight: "500" }}
                        >
                          {entry.artifactRef.system}: {entry.artifactRef.id}
                        </a>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: "bold",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            backgroundColor: `${CATEGORY_COLORS[entry.category]}10`,
                            color: CATEGORY_COLORS[entry.category],
                          }}
                        >
                          {entry.category}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <div>Awarded: <strong>{awardedCu.toFixed(2)} CU</strong></div>
                        <div style={{ fontSize: "0.72rem", color: "#64748B", marginTop: "0.25rem" }}>
                          base {entry.baseCu} × {entry.impactMultiplierBps}% × {entry.qualityMultiplierBps}%
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <div>Recognized: <strong style={{ color: "#059669" }}>{recognizedCu.toFixed(2)} CU</strong></div>
                        {deferredCu > 0 && (
                          <div style={{ fontSize: "0.72rem", color: "#DC2626", marginTop: "0.25rem" }}>
                            Deferred: {deferredCu.toFixed(2)} CU (monthly cap exceeded)
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "9999px",
                            backgroundColor: statusColors.bg,
                            color: statusColors.text,
                          }}
                        >
                          {entry.status}
                        </span>
                        {entry.stateReason && (
                          <div style={{ fontSize: "0.7rem", color: "#991B1B", marginTop: "0.25rem" }}>
                            {entry.stateReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {entry.status === "proposed" && (
                            <button
                              onClick={() => handleTransition(entry.entryId, "verified")}
                              style={{
                                padding: "0.2rem 0.4rem",
                                fontSize: "0.7rem",
                                backgroundColor: "#EFF6FF",
                                color: "#2563EB",
                                border: "1px solid #BFDBFE",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Verify
                            </button>
                          )}
                          {entry.status === "verified" && (
                            <button
                              onClick={() => handleTransition(entry.entryId, "approved")}
                              style={{
                                padding: "0.2rem 0.4rem",
                                fontSize: "0.7rem",
                                backgroundColor: "#EEF2F6",
                                color: "#4B5563",
                                border: "1px solid #CBD5E1",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Approve
                            </button>
                          )}
                          {entry.status === "approved" && (
                            <button
                              onClick={() => handleTransition(entry.entryId, "recognized")}
                              style={{
                                padding: "0.2rem 0.4rem",
                                fontSize: "0.7rem",
                                backgroundColor: "#ECFDF5",
                                color: "#059669",
                                border: "1px solid #A7F3D0",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Recognize
                            </button>
                          )}
                          {(entry.status === "approved" || entry.status === "recognized") && (
                            <button
                              onClick={() => handleDispute(entry.entryId)}
                              style={{
                                padding: "0.2rem 0.4rem",
                                fontSize: "0.7rem",
                                backgroundColor: "#FEE2E2",
                                color: "#B91C1C",
                                border: "1px solid #FCA5A5",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Dispute
                            </button>
                          )}
                          {entry.status === "disputed" && (
                            <>
                              <button
                                onClick={() => handleTransition(entry.entryId, "approved")}
                                style={{
                                  padding: "0.2rem 0.4rem",
                                  fontSize: "0.7rem",
                                  backgroundColor: "#EFF6FF",
                                  color: "#2563EB",
                                  border: "1px solid #BFDBFE",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Upheld (Approve)
                              </button>
                              <button
                                onClick={() => handleTransition(entry.entryId, "revoked", { revocationReason: "FRAUD" })}
                                style={{
                                  padding: "0.2rem 0.4rem",
                                  fontSize: "0.7rem",
                                  backgroundColor: "#111",
                                  color: "#FFF",
                                  border: "none",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                }}
                              >
                                Revoke (Fraud)
                              </button>
                            </>
                          )}
                          {entry.status !== "revoked" && entry.status !== "settled" && entry.status !== "converted" && (
                            <button
                              onClick={() => handleTransition(entry.entryId, "revoked")}
                              style={{
                                padding: "0.2rem 0.4rem",
                                fontSize: "0.7rem",
                                backgroundColor: "#E5E7EB",
                                color: "#374151",
                                border: "1px solid #D1D5DB",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Audit Timeline Section */}
      <section style={{ backgroundColor: "white", padding: "1.5rem", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h3 style={{ color: "#2E403B", margin: "0 0 1.25rem", fontSize: "1.2rem", fontWeight: 700 }}>
          Timeline & Event Audits (Append-only logs)
        </h3>
        {events.length === 0 ? (
          <p style={{ color: "#64748B", fontSize: "0.85rem" }}>No audit events logged yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {events.map((ev, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "1rem",
                  fontSize: "0.82rem",
                  padding: "0.75rem",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                  borderLeft: `4px solid #D4A017`,
                }}
              >
                <div style={{ fontWeight: "bold", color: "#1E293B", flexShrink: 0 }}>
                  {new Date(ev.occurredAt).toLocaleTimeString()}
                </div>
                <div>
                  <span style={{ fontWeight: "bold", color: "#2E403B" }}>{ev.eventType}</span>
                  <span style={{ color: "#64748B", marginLeft: "0.5rem" }}>
                    by {ev.actorId} for Entry {ev.entryId.slice(0, 12)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Propose Claim Modal */}
      {showProposeModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: "white", padding: "2rem", borderRadius: "12px", width: "550px", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1.5rem", color: "#2E403B", fontWeight: 700, fontSize: "1.25rem" }}>
              Propose Contribution Claim
            </h3>
            <form onSubmit={handleProposeClaim} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Contributor ID</label>
                <input
                  type="text"
                  placeholder="ubi:btc:address-or-id"
                  required
                  value={contributorId}
                  onChange={(e) => setContributorId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.85rem",
                    marginTop: "0.25rem",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Contribution Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.85rem",
                    marginTop: "0.25rem",
                    backgroundColor: "white",
                  }}
                >
                  <option value="CORE_PROTOCOL_CODE">Core Protocol/Code Delivery (8 base CU)</option>
                  <option value="SECURITY_HARDENING">Security Hardening (12 base CU)</option>
                  <option value="RELIABILITY_OPS">Reliability Ops / Incidents (6 base CU)</option>
                  <option value="PRODUCT_DOCS_RESEARCH">Product Docs / Research (4 base CU)</option>
                  <option value="COMMUNITY_ENABLEMENT">Community Enablement (3 base CU)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Impact Multiplier</label>
                  <select
                    value={impactMultiplier}
                    onChange={(e) => setImpactMultiplier(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="50">Minor (50%)</option>
                    <option value="100">Standard (100%)</option>
                    <option value="150">High (150%)</option>
                    <option value="200">Critical (200%)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Quality Multiplier</label>
                  <select
                    value={qualityMultiplier}
                    onChange={(e) => setQualityMultiplier(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="0">Rejected (0%)</option>
                    <option value="70">Partial Rework (70%)</option>
                    <option value="100">Accepted (100%)</option>
                    <option value="120">Accepted Reused (120%)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Artifact ID</label>
                  <input
                    type="text"
                    placeholder="e.g. pr-1256"
                    required
                    value={artifactId}
                    onChange={(e) => setArtifactId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Verifiable Evidence (URI)</label>
                  <input
                    type="text"
                    placeholder="https://github.com/..."
                    required
                    value={evidenceUri}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.85rem",
                      marginTop: "0.25rem",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#475569" }}>Description / Notes</label>
                <textarea
                  placeholder="Explain the technical or community outcomes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.85rem",
                    marginTop: "0.25rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "white",
                    color: "#334155",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#2E403B",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                  }}
                >
                  Propose Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
