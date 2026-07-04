"use client";

import React, { useState, useEffect } from "react";
import type { OperatorEntry } from "@/lib/sidl/types";

type OperatorRegistryResponse = {
  operators: OperatorEntry[];
  updatedAtIso: string;
};

const ROLE_LABELS: Record<string, string> = {
  "frontend-host": "Frontend Host",
  delegate: "Delegate",
  maintainer: "Maintainer",
  steward: "Steward",
};

const ROLE_COLORS: Record<string, string> = {
  "frontend-host": "#2E403B",
  delegate: "#7C3AED",
  maintainer: "#059669",
  steward: "#D4A017",
};

function OperatorCard({ entry }: { entry: OperatorEntry }) {
  const roleLabel = ROLE_LABELS[entry.role] ?? entry.role;
  const roleColor = ROLE_COLORS[entry.role] ?? "#6B7280";

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        borderLeft: `4px solid ${roleColor}`,
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0F172A" }}>
            {entry.name}
          </h3>
          <div
            style={{
              fontSize: "0.8rem",
              color: roleColor,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginTop: "0.25rem",
            }}
          >
            {roleLabel}
          </div>
        </div>
        <span
          style={{
            display: "inline-block",
            padding: "0.2rem 0.6rem",
            backgroundColor: entry.status === "active" ? "#F0FDF4" : "#FEF2F2",
            color: entry.status === "active" ? "#166534" : "#991B1B",
            borderRadius: "9999px",
            fontSize: "0.7rem",
            fontWeight: 600,
          }}
        >
          {entry.status}
        </span>
      </div>

      <div>
        <div style={{ fontSize: "0.7rem", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Service
        </div>
        <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#334155" }}>
          {entry.service}
        </div>
      </div>

      <div>
        <div style={{ fontSize: "0.7rem", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Description
        </div>
        <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
          {entry.description}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.75rem", color: "#94A3B8", borderTop: "1px solid #F1F5F9", paddingTop: "0.75rem" }}>
        <div>
          Recognized via{" "}
          <span style={{ fontFamily: "monospace", color: "#64748B" }}>{entry.recognizedBy}</span>
        </div>
        <div>
          {new Date(entry.recognizedAtIso).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
        {entry.contact && (
          <div>
            Contact: <span style={{ color: "#64748B" }}>{entry.contact}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OperatorRegistryPage() {
  const [data, setData] = useState<OperatorRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/operators");
      if (!res.ok) throw new Error(`Failed to fetch operator registry: ${res.status}`);
      const d = await res.json();
      setData(d);
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

  if (loading && !data) {
    return (
      <div style={{ padding: "4rem", color: "#2E403B", textAlign: "center", fontSize: "1.1rem" }}>
        Loading Operator Registry...
      </div>
    );
  }

  const operators = data?.operators ?? [];
  const activeCount = operators.filter((o) => o.status === "active").length;

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
            Operator Registry
          </h1>
          <p style={{ color: "#64748B", marginTop: "0.5rem", fontSize: "1.1rem" }}>
            Community-run services &middot; Governance-recognized roles &middot; {activeCount} active operator{activeCount !== 1 ? "s" : ""}
          </p>
          {data?.updatedAtIso && (
            <p style={{ color: "#94A3B8", fontSize: "0.75rem", marginTop: "0.5rem" }}>
              Last updated: {new Date(data.updatedAtIso).toLocaleString()}
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

      {/* Role legend */}
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#64748B" }}>
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "3px",
                backgroundColor: ROLE_COLORS[role] ?? "#6B7280",
              }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* Operator cards */}
      {operators.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "#94A3B8",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
          }}
        >
          No operators have been recognized yet. Operator recognition is driven through governance proposals.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
          {operators.map((entry) => (
            <OperatorCard key={entry.id} entry={entry} />
          ))}
        </div>
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
          <strong>Governance-driven recognition.</strong>{" "}
          All operator roles are recognized through governance proposals, never through centralized
          assignment. New operators are added when a governance proposal passes and is recorded in the
          operator registry. To propose a new operator role, submit a governance proposal referencing the
          candidate&apos;s qualifications and the service they will provide.
        </div>
      </section>

      {/* Cross-link to frontend registry */}
      <section
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          backgroundColor: "rgba(46, 64, 59, 0.04)",
          borderRadius: "12px",
          border: "1px solid rgba(46, 64, 59, 0.12)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong style={{ color: "#2E403B", fontSize: "0.9rem" }}>Frontend Registry</strong>
          <p style={{ margin: "0.25rem 0 0", color: "#64748B", fontSize: "0.8rem" }}>
            View canonical and community-hosted frontend surfaces with recognition status.
          </p>
        </div>
        <a
          href="/frontends"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#2E403B",
            color: "#FFFFFF",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          View Registry →
        </a>
      </section>

      <footer style={{ marginTop: "4rem", textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>
        Conxian Operator Registry &middot; Governance-Recognized &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
