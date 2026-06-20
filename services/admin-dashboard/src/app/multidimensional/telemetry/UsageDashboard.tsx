"use client";

import { useState } from "react";

export default function UsageDashboard() {
  const [result, setResult] = useState<any>(null);

  const simulateSignal = async (strength: "weak" | "strong", event: string) => {
    try {
      const res = await fetch("/api/v1/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          strength,
          identity_hash: "ubi:btc:sim-user-123",
          metadata: { source: "UsageDashboard", version: "1.0.0" }
        })
      });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      console.error("Failed to simulate usage signal:", err);
    }
  };

  return (
    <div style={{ padding: "1.5rem", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.2rem", color: "#2E403B", marginBottom: "1rem" }}>Usage Validation Simulator (CON-1263)</h2>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button
          onClick={() => simulateSignal("weak", "DOCS_VIEW")}
          style={{ padding: "0.5rem 1rem", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer" }}
        >
          Simulate Weak Signal (Docs View)
        </button>
        <button
          onClick={() => simulateSignal("strong", "FIRST_PROOF")}
          style={{ padding: "0.5rem 1rem", backgroundColor: "#2E403B", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Simulate Strong Signal (First Proof)
        </button>
      </div>

      {result && (
        <div style={{ backgroundColor: result.triage ? "#fee2e2" : "#f3f4f6", padding: "1rem", borderRadius: "4px" }}>
          <p><strong>Score:</strong> {result.score}</p>
          <p><strong>Triage Required:</strong> {result.triage ? "YES (Linear Alert)" : "NO"}</p>
          <p><strong>Timestamp:</strong> {result.timestamp}</p>
        </div>
      )}
    </div>
  );
}
