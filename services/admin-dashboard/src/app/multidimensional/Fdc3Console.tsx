"use client";

import { useState } from "react";
import { FDC3Resolver, CJCSJob } from "../../lib/fdc3/resolver";

export default function Fdc3Console() {
  const [jobType, setJobType] = useState("DEX_SWAP");
  const [result, setResult] = useState<any>(null);

  const resolveJob = () => {
    const job: CJCSJob = {
      id: "job-123",
      type: jobType,
      instrument: "BTC/sBTC",
      counterparty: "ubi:btc:counterparty-456"
    };

    const context = FDC3Resolver.mapCJCSToFDC3(job);
    const usiAction = FDC3Resolver.resolveIntentToUSI(jobType === "SETTLEMENT" ? "Trade" : "ViewInstrument", context);

    setResult({
      job,
      fdc3Context: context,
      usiAction
    });
  };

  return (
    <div style={{ padding: "1.5rem", backgroundColor: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.2rem", color: "#2E403B", marginBottom: "1rem" }}>FDC3 Native Resolver Console (CON-1181)</h2>

      <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", color: "#374151", marginBottom: "0.25rem" }}>Job Type</label>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #d1d5db" }}
          >
            <option value="DEX_SWAP">DEX Swap</option>
            <option value="SBTC_WRAP">sBTC Wrap</option>
            <option value="SETTLEMENT">Institutional Settlement</option>
          </select>
        </div>
        <button
          onClick={resolveJob}
          style={{ padding: "0.75rem", backgroundColor: "#D4A017", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
        >
          Resolve FDC3 Bridge
        </button>
      </div>

      {result && (
        <div style={{ backgroundColor: "#f9fafb", padding: "1rem", borderRadius: "4px", fontSize: "0.85rem" }}>
          <p><strong>FDC3 Context:</strong> {JSON.stringify(result.fdc3Context, null, 2)}</p>
          <p><strong>USI Action:</strong> <code style={{ backgroundColor: "#e5e7eb", padding: "0.125rem 0.25rem", borderRadius: "2px" }}>{result.usiAction}</code></p>
        </div>
      )}
    </div>
  );
}
